'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { AlertTriangle, ArrowUp, Bot, CheckCircle2, Loader2, RotateCcw, Square, Wrench, XCircle } from 'lucide-react';
import { LessonContent } from '@/components/learning/lesson-content';
import { runTurn, type ToolTrace } from '@/lib/consigliere/agent';
import type { OllamaMessage } from '@/lib/consigliere/ollama';
import { buildSystemPrompt } from '@/lib/consigliere/prompt';
import { proposalFrom, withoutProposal, type ConsigliereToolGroup, type ConsigliereToolSpec } from '@/lib/consigliere/types';
import { SaveProposalCard } from './save-proposal-card';

interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  tools: ToolTrace[];
  status: 'streaming' | 'done' | 'stopped' | 'error';
  error?: string;
  meta?: string;
}

const SUGGESTIONS: Array<{ text: string; groups: ConsigliereToolGroup[] }> = [
  { text: 'What does the fund hold right now, and how is it doing?', groups: ['sgc_data'] },
  { text: 'Which macro regime are we in, and what does the engine overweight?', groups: ['macro'] },
  { text: 'Run a DCF on AAPL and compare it with MSFT, GOOGL and META on multiples.', groups: ['research'] },
  { text: 'Latest US CPI inflation and 10-year Treasury yield from FRED.', groups: ['macro'] },
  { text: 'Compare risk parity, HRP and min variance for SPY, TLT, GLD and EFA.', groups: ['portfolio'] },
  { text: 'Summarize our most recent research reports.', groups: ['research'] },
  { text: "What's the news sentiment on NVDA, and when are its next earnings?", groups: ['markets'] },
];

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function formatJson(value: unknown, max = 4000) {
  const text = JSON.stringify(value, null, 2) ?? '';
  return text.length > max ? `${text.slice(0, max)}\n…` : text;
}

function ToolTraceList({ tools }: { tools: ToolTrace[] }) {
  if (!tools.length) return null;
  return (
    <div className="mt-3 space-y-1.5">
      {tools.map((t) => (
        <details key={t.id} className="group rounded-lg border border-slate-200 bg-slate-50/70 text-xs">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-slate-700">
            {t.status === 'running' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" aria-label="Running" />
            ) : t.status === 'ok' ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-label="Succeeded" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-red-600" aria-label="Failed" />
            )}
            <span className="font-mono font-medium">{t.name}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-slate-500">{JSON.stringify(t.args)}</span>
            {t.ms != null && <span className="shrink-0 text-slate-400">{(t.ms / 1000).toFixed(1)}s</span>}
          </summary>
          <div className="space-y-2 border-t border-slate-200 px-3 py-2">
            <div>
              <p className="font-semibold text-slate-600">Arguments</p>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-slate-700">{formatJson(t.args)}</pre>
            </div>
            {(t.result !== undefined || t.error) && (
              <div>
                <p className="font-semibold text-slate-600">{t.error ? 'Error' : 'Result'}</p>
                <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-slate-700">
                  {t.error ?? formatJson(withoutProposal(t.result))}
                </pre>
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

export function ChatPanel({
  host,
  model,
  numCtx,
  think,
  groups,
  tools,
  userName,
  ready,
  notReadyReason,
  onConnectionLost,
}: {
  host: string;
  model: string | null;
  numCtx: number;
  think: boolean;
  groups: ConsigliereToolGroup[];
  tools: ConsigliereToolSpec[];
  userName?: string | null;
  ready: boolean;
  notReadyReason: string;
  onConnectionLost: () => void;
}) {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const history = useRef<OllamaMessage[]>([]);
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  useEffect(() => () => abort.current?.abort(), []);

  const activeTools = tools.filter((t) => groups.includes(t.group));
  const suggestions = SUGGESTIONS.filter((s) => s.groups.every((g) => groups.includes(g))).slice(0, 4);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy || !ready || !model) return;
    setInput('');
    const assistantId = newId();
    setEntries((prev) => [
      ...prev,
      { id: newId(), role: 'user', content: text, tools: [], status: 'done' },
      { id: assistantId, role: 'assistant', content: '', tools: [], status: 'streaming' },
    ]);
    const patch = (fn: (entry: ChatEntry) => ChatEntry) =>
      setEntries((prev) => prev.map((entry) => (entry.id === assistantId ? fn(entry) : entry)));

    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    const started = performance.now();
    let partial = '';
    try {
      const messages = await runTurn({
        host,
        model,
        numCtx,
        think,
        tools: activeTools,
        history: [{ role: 'system', content: buildSystemPrompt({ groups, userName }) }, ...history.current, { role: 'user', content: text }],
        signal: controller.signal,
        callbacks: {
          onContent: (delta) => {
            partial += delta;
            patch((e) => ({ ...e, content: e.content + delta }));
          },
          onThinking: (delta) => patch((e) => ({ ...e, thinking: (e.thinking ?? '') + delta })),
          onRound: () => {
            partial = '';
            patch((e) => ({ ...e, content: '', thinking: undefined }));
          },
          onToolStart: (trace) => patch((e) => ({ ...e, tools: [...e.tools, trace] })),
          onToolEnd: (trace) => patch((e) => ({ ...e, tools: e.tools.map((t) => (t.id === trace.id ? trace : t)) })),
        },
      });
      history.current = messages.slice(1);
      const last = messages[messages.length - 1];
      const answer = last?.role === 'assistant' ? last.content.trim() : '';
      patch((e) => ({
        ...e,
        content: answer || 'The model returned an empty answer. Try rephrasing, or pick a larger model.',
        status: 'done',
        meta: `${model} · ${((performance.now() - started) / 1000).toFixed(1)}s`,
      }));
    } catch (err) {
      history.current = [...history.current, { role: 'user', content: text }, { role: 'assistant', content: partial || '(no answer)' }];
      if (controller.signal.aborted) {
        patch((e) => ({ ...e, status: 'stopped', tools: e.tools.map((t) => (t.status === 'running' ? { ...t, status: 'error', error: 'Stopped' } : t)) }));
      } else {
        const message = err instanceof Error ? err.message : 'Something went wrong.';
        const lostOllama = err instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(message);
        patch((e) => ({
          ...e,
          status: 'error',
          error: lostOllama ? 'Lost the connection to Ollama on this laptop. Check that the app is still running.' : message,
        }));
        if (lostOllama) onConnectionLost();
      }
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void ask(input);
    }
  }

  function rememberSave(note: string) {
    history.current = [...history.current, { role: 'system', content: note }];
  }

  function reset() {
    abort.current?.abort();
    history.current = [];
    setEntries([]);
  }

  return (
    <section aria-label="Consigliere chat" className="flex min-h-[560px] flex-col rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Bot className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="truncate font-medium text-slate-900">{model ?? 'No model selected'}</span>
          <span className="hidden text-slate-400 sm:inline">· {activeTools.length} tools</span>
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={!entries.length}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          New chat
        </button>
      </div>

      <div ref={scroller} className="max-h-[65vh] flex-1 overflow-y-auto px-5 py-5" aria-busy={busy}>
        {!entries.length ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b1f3a] text-white">
              <Bot className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-950">Ask about the fund, markets or a portfolio</h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
              Answers come from live SGC data, Alpha Vantage and FRED. Open any tool step to see exactly what was looked up.
            </p>
            {ready && suggestions.length > 0 && (
              <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button
                    key={s.text}
                    type="button"
                    onClick={() => void ask(s.text)}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <ol className="space-y-6">
            {entries.map((entry) =>
              entry.role === 'user' ? (
                <li key={entry.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[#0b1f3a] px-4 py-2.5 text-sm leading-6 text-white">
                    {entry.content}
                  </p>
                </li>
              ) : (
                <li key={entry.id} className="max-w-full">
                  <ToolTraceList tools={entry.tools} />
                  {entry.status === 'streaming' && !entry.content && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-slate-500" aria-live="polite">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      {entry.thinking ? 'Thinking…' : entry.tools.some((t) => t.status === 'running') ? 'Looking things up…' : 'Working…'}
                    </p>
                  )}
                  {entry.content && (
                    <div className="mt-3 text-sm">
                      <LessonContent content={entry.content} />
                    </div>
                  )}
                  {entry.tools.map((t) => {
                    const proposal = t.status === 'ok' ? proposalFrom(t.result) : null;
                    return proposal ? <SaveProposalCard key={`save-${t.id}`} proposal={proposal} onSaved={rememberSave} /> : null;
                  })}
                  {entry.status === 'stopped' && <p className="mt-2 text-xs text-slate-500">Stopped.</p>}
                  {entry.error && (
                    <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {entry.error}
                    </p>
                  )}
                  {entry.status === 'done' && !entry.tools.length && /\d/.test(entry.content) && (
                    <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      No data was looked up for this answer, so any figures come from the model&rsquo;s memory and may be out of date.
                    </p>
                  )}
                  {entry.meta && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Wrench className="h-3 w-3" aria-hidden="true" />
                      {entry.tools.length} lookup{entry.tools.length === 1 ? '' : 's'} · {entry.meta}
                    </p>
                  )}
                </li>
              )
            )}
          </ol>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-slate-100 p-3">
        {!ready && <p className="mb-2 px-1 text-xs text-slate-500">{notReadyReason}</p>}
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-slate-400">
          <label htmlFor="consigliere-input" className="sr-only">
            Ask Consigliere
          </label>
          <textarea
            id="consigliere-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            disabled={!ready}
            placeholder={ready ? 'Ask a question… (Shift+Enter for a new line)' : 'Connect a model to start'}
            className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
          />
          {busy ? (
            <button
              type="button"
              onClick={() => abort.current?.abort()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-700"
              aria-label="Stop answering"
            >
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!ready || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0b1f3a] text-white hover:bg-[#13315c] disabled:opacity-40"
              aria-label="Send question"
            >
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <p className="mt-2 px-1 text-[11px] text-slate-400">Runs on your laptop. Small local models can make mistakes; check the tool steps before relying on a number.</p>
      </form>
    </section>
  );
}
