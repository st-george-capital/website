/**
 * End-to-end check with this laptop's Ollama: the local model answers questions by calling the
 * real consigliere tools (executed in-process instead of through the website API).
 *   npx tsx --env-file=.env scripts/consigliere/agent-smoke.ts [model] ["question"]
 */
import { runTurn } from '@/lib/consigliere/agent';
import { DEFAULT_OLLAMA_HOST } from '@/lib/consigliere/ollama';
import { buildSystemPrompt } from '@/lib/consigliere/prompt';
import { consigliereToolSpecs, runConsigliereTool } from '@/lib/consigliere/tools/registry';
import type { ConsigliereToolGroup } from '@/lib/consigliere/types';

const QUESTIONS = [
  'What is the current US unemployment rate according to FRED, and how did it change from the previous month?',
  "What macro regime is SGC's engine in, and what are its top overweights?",
  'Min variance portfolio of SPY, TLT and GLD with max 60% each. One sentence plus a weights table.',
  'How many investment pitches are in the SGC database, and what is the most recent one?',
];

async function main() {
  const model = process.argv[2] ?? 'qwen3.5:4b';
  const questions = process.argv[3] ? [process.argv[3]] : QUESTIONS;
  const host = process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST;
  const tools = consigliereToolSpecs();
  const groups = Array.from(new Set(tools.map((t) => t.group))) as ConsigliereToolGroup[];

  for (const question of questions) {
    console.log(`\n=== ${question}`);
    const started = Date.now();
    let text = '';
    const messages = await runTurn({
      host,
      model,
      numCtx: 16384,
      think: false,
      tools,
      history: [
        { role: 'system', content: buildSystemPrompt({ groups }) },
        { role: 'user', content: question },
      ],
      signal: new AbortController().signal,
      executeTool: (name, args) => runConsigliereTool(name, args),
      callbacks: {
        onContent: (d) => (text += d),
        onThinking: () => {},
        onRound: () => (text = ''),
        onToolStart: (t) => console.log(`  → ${t.name} ${JSON.stringify(t.args)}`),
        onToolEnd: (t) => console.log(`    ${t.status} in ${t.ms}ms${t.error ? `: ${t.error}` : ''}`),
      },
    });
    const toolCalls = messages.filter((m) => m.role === 'tool').length;
    console.log(`\n${text.trim()}\n  [${toolCalls} tool call(s), ${((Date.now() - started) / 1000).toFixed(1)}s]`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
