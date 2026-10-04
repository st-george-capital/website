import { chat, type OllamaMessage } from './ollama';
import type { ConsigliereToolSpec } from './types';

const MAX_TOOL_ROUNDS = 8;
const OLD_TOOL_RESULT_CHARS = 600;
const UNSOURCED_NUDGE =
  'Check before answering: your draft contains figures but you called no tool. Figures must come from tool results, because your own knowledge is out of date. If the question needs any current or SGC data, call the right tool now. Otherwise answer again without unsupported figures.';

export interface ToolTrace {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'running' | 'ok' | 'error';
  result?: unknown;
  error?: string;
  ms?: number;
}

export interface TurnCallbacks {
  onContent: (delta: string) => void;
  onThinking: (delta: string) => void;
  onToolStart: (trace: ToolTrace) => void;
  onToolEnd: (trace: ToolTrace) => void;
  /** A new model round starts after tool results come back; visible text restarts. */
  onRound: () => void;
}

export interface TurnOptions {
  host: string;
  model: string;
  numCtx: number;
  think: boolean;
  tools: ConsigliereToolSpec[];
  history: OllamaMessage[];
  signal: AbortSignal;
  callbacks: TurnCallbacks;
  executeTool?: ToolExecutor;
}

type ToolExecutor = (name: string, args: Record<string, unknown>, signal: AbortSignal) => Promise<{ ok: boolean; result?: unknown; error?: string }>;

async function callServerTool(name: string, args: Record<string, unknown>, signal: AbortSignal) {
  const res = await fetch('/api/consigliere/tools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, arguments: args }),
    signal,
  });
  const body = await res.json().catch(() => ({ ok: false, error: `Tool server returned HTTP ${res.status}` }));
  if (res.status === 401 || res.status === 403) throw new Error(body.error ?? "Not authorized to use Consigliere's tools.");
  return body as { ok: boolean; result?: unknown; error?: string };
}

/**
 * Shrinks tool results from earlier questions so long chats stay inside the local model's
 * context window. The current question's tool results are kept in full.
 */
export function compactHistory(history: OllamaMessage[]): OllamaMessage[] {
  const lastUser = history.map((m) => m.role).lastIndexOf('user');
  return history.map((m, i) =>
    m.role === 'tool' && i < lastUser && m.content.length > OLD_TOOL_RESULT_CHARS
      ? { ...m, content: `${m.content.slice(0, OLD_TOOL_RESULT_CHARS)}…[earlier result shortened]` }
      : m
  );
}

/** Runs one user turn: model → tool calls → model … until the model answers without tools. */
export async function runTurn(opts: TurnOptions): Promise<OllamaMessage[]> {
  const messages = [...opts.history];
  const toolDefs = opts.tools.map(({ type, function: fn }) => ({ type, function: fn }));
  // Small models often repeat an identical call; reuse the result instead of re-hitting rate-limited APIs.
  const seen = new Map<string, { ok: boolean; result?: unknown; error?: string }>();

  let checkedUnsourced = false;
  let nudge: OllamaMessage | null = null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    if (round > 0) opts.callbacks.onRound();
    const reply = await chat(
      opts.host,
      {
        model: opts.model,
        messages: compactHistory(nudge ? [...messages, nudge] : messages),
        tools: toolDefs,
        think: opts.think,
        numCtx: opts.numCtx,
      },
      { onContent: opts.callbacks.onContent, onThinking: opts.callbacks.onThinking },
      opts.signal
    );
    nudge = null;
    if (!reply.tool_calls?.length) {
      // Small models sometimes answer data questions from stale memory. Give them one chance to look it up.
      const usedTools = messages.slice(opts.history.length).some((m) => m.role === 'tool');
      if (!checkedUnsourced && !usedTools && toolDefs.length && /\d/.test(reply.content)) {
        checkedUnsourced = true;
        nudge = { role: 'user', content: UNSOURCED_NUDGE };
        continue;
      }
      messages.push(reply);
      return messages;
    }
    messages.push(reply);

    for (const call of reply.tool_calls) {
      const trace: ToolTrace = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: call.function.name,
        args: call.function.arguments ?? {},
        status: 'running',
      };
      opts.callbacks.onToolStart(trace);
      const started = performance.now();
      const key = `${trace.name}:${JSON.stringify(trace.args)}`;
      const cached = seen.get(key);
      const outcome = cached?.ok ? cached : await (opts.executeTool ?? callServerTool)(trace.name, trace.args, opts.signal);
      seen.set(key, outcome);
      const done: ToolTrace = {
        ...trace,
        status: outcome.ok ? 'ok' : 'error',
        result: outcome.result,
        error: outcome.error,
        ms: Math.round(performance.now() - started),
      };
      opts.callbacks.onToolEnd(done);
      messages.push({
        role: 'tool',
        tool_name: trace.name,
        content: JSON.stringify(outcome.ok ? outcome.result : { error: outcome.error }),
      });
    }
  }
  messages.push({ role: 'assistant', content: 'I stopped after too many tool calls. Try a more specific question.' });
  return messages;
}
