/**
 * Browser client for the member's own Ollama server. Requests go straight from the page to
 * localhost; Chrome gates that behind its Local Network Access permission prompt, and Ollama
 * only answers origins listed in OLLAMA_ORIGINS (localhost origins are allowed by default).
 */
export const DEFAULT_OLLAMA_HOST = 'http://127.0.0.1:11434';

type LocalRequestInit = RequestInit & { targetAddressSpace?: 'loopback' | 'local' };

function localFetch(host: string, path: string, init: RequestInit = {}) {
  const url = new URL(path, host);
  const isLoopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  // targetAddressSpace makes Chrome show its permission prompt instead of blocking as mixed content.
  return fetch(url, { ...init, targetAddressSpace: isLoopback ? 'loopback' : 'local' } as LocalRequestInit);
}

export type PermissionStatus = 'granted' | 'prompt' | 'denied' | 'unsupported';

export async function localNetworkPermission(): Promise<PermissionStatus> {
  if (typeof navigator === 'undefined' || !navigator.permissions) return 'unsupported';
  for (const name of ['loopback-network', 'local-network-access', 'local-network']) {
    try {
      const status = await navigator.permissions.query({ name } as unknown as PermissionDescriptor);
      return status.state as PermissionStatus;
    } catch {
      // Name not recognised by this browser; try the next one.
    }
  }
  return 'unsupported';
}

export type ConnectionResult =
  | { status: 'connected'; version: string }
  | { status: 'origin-blocked' }
  | { status: 'permission-denied' }
  | { status: 'unreachable' };

export async function probeOllama(host: string): Promise<ConnectionResult> {
  try {
    const res = await localFetch(host, '/api/version', { cache: 'no-store' });
    if (res.ok) return { status: 'connected', version: (await res.json()).version ?? 'unknown' };
    if (res.status === 403) return { status: 'origin-blocked' };
  } catch {
    // Fall through to diagnose why.
  }
  if ((await localNetworkPermission()) === 'denied') return { status: 'permission-denied' };
  try {
    // An opaque no-cors response proves the server is up but rejected this site's origin.
    await localFetch(host, '/api/version', { mode: 'no-cors', cache: 'no-store' });
    return { status: 'origin-blocked' };
  } catch {
    return { status: 'unreachable' };
  }
}

export interface LocalModel {
  name: string;
  sizeGB: number;
  parameterSize?: string;
  family?: string;
  capabilities: string[];
  remote: boolean;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Ollama returned HTTP ${res.status}`);
  }
  return res.json();
}

export async function listLocalModels(host: string): Promise<LocalModel[]> {
  const tags = await json<{ models?: Array<Record<string, any>> }>(await localFetch(host, '/api/tags', { cache: 'no-store' }));
  const models = await Promise.all(
    (tags.models ?? []).map(async (m) => {
      let capabilities: string[] = [];
      let remote = Boolean(m.remote_host || m.remote_model);
      try {
        const info = await json<Record<string, any>>(
          await localFetch(host, '/api/show', { method: 'POST', body: JSON.stringify({ model: m.name }) })
        );
        capabilities = Array.isArray(info.capabilities) ? info.capabilities : [];
        remote = remote || Boolean(info.remote_host || info.remote_model);
      } catch {
        // Older servers without /api/show capabilities: leave empty so the model is flagged.
      }
      return {
        name: m.name as string,
        sizeGB: Number(((m.size ?? 0) / 1e9).toFixed(1)),
        parameterSize: m.details?.parameter_size,
        family: m.details?.family,
        capabilities,
        remote: remote || /(:|-)cloud\b/.test(m.name),
      } satisfies LocalModel;
    })
  );
  return models.sort((a, b) => a.sizeGB - b.sizeGB);
}

export async function pullModel(
  host: string,
  name: string,
  onProgress: (fraction: number | null, status: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await localFetch(host, '/api/pull', { method: 'POST', body: JSON.stringify({ model: name, stream: true }), signal });
  if (!res.ok || !res.body) throw new Error(`Download failed (HTTP ${res.status}).`);
  for await (const event of readNdjson(res.body)) {
    if (event.error) throw new Error(event.error);
    onProgress(event.total ? event.completed / event.total : null, event.status ?? '');
  }
}

async function* readNdjson(body: ReadableStream<Uint8Array>): AsyncGenerator<Record<string, any>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf('\n');
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield JSON.parse(line);
      newline = buffer.indexOf('\n');
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer);
}

export interface OllamaToolCall {
  function: { name: string; arguments: Record<string, unknown> };
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  thinking?: string;
  tool_calls?: OllamaToolCall[];
  tool_name?: string;
}

export interface ChatRequest {
  model: string;
  messages: OllamaMessage[];
  tools: object[];
  think: boolean;
  numCtx: number;
}

export interface ChatStreamHandlers {
  onContent?: (delta: string) => void;
  onThinking?: (delta: string) => void;
}

/** Streams one assistant turn and returns the complete message (content + any tool calls). */
export async function chat(host: string, req: ChatRequest, handlers: ChatStreamHandlers, signal?: AbortSignal): Promise<OllamaMessage> {
  const res = await localFetch(host, '/api/chat', {
    method: 'POST',
    signal,
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
      tools: req.tools,
      think: req.think,
      stream: true,
      // Ollama's small default context silently truncates the system prompt and tool schemas.
      options: { temperature: 0.2, num_ctx: req.numCtx },
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Ollama returned HTTP ${res.status}`);
  }
  const message: OllamaMessage = { role: 'assistant', content: '' };
  for await (const chunk of readNdjson(res.body)) {
    if (chunk.error) throw new Error(chunk.error);
    const m = chunk.message ?? {};
    if (m.thinking) {
      message.thinking = (message.thinking ?? '') + m.thinking;
      handlers.onThinking?.(m.thinking);
    }
    if (m.content) {
      message.content += m.content;
      handlers.onContent?.(m.content);
    }
    if (Array.isArray(m.tool_calls) && m.tool_calls.length) {
      message.tool_calls = [...(message.tool_calls ?? []), ...m.tool_calls];
    }
  }
  return message;
}
