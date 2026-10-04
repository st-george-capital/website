/**
 * End-to-end check with this laptop's Ollama: the local model answers questions by calling the
 * real consigliere tools (executed in-process instead of through the website API).
 *   npx tsx --env-file=.env scripts/consigliere/agent-smoke.ts [model] ["question"]
 *   npx tsx --env-file=.env scripts/consigliere/agent-smoke.ts [model] --chat "turn 1" "turn 2" ...
 * --chat keeps one conversation across the turns, like the chat panel does.
 */
import { runTurn } from '@/lib/consigliere/agent';
import { DEFAULT_OLLAMA_HOST, type OllamaMessage } from '@/lib/consigliere/ollama';
import { buildSystemPrompt } from '@/lib/consigliere/prompt';
import { consigliereToolSpecs, runConsigliereTool } from '@/lib/consigliere/tools/registry';
import { proposalFrom, type ConsigliereToolGroup } from '@/lib/consigliere/types';
import { smokeContext } from './smoke-context';

const QUESTIONS = [
  'What is the current US unemployment rate according to FRED, and how did it change from the previous month?',
  "What macro regime is SGC's engine in, and what are its top overweights?",
  'Min variance portfolio of SPY, TLT and GLD with max 60% each. One sentence plus a weights table.',
  'How many investment pitches are in the SGC database, and what is the most recent one?',
];

async function main() {
  const args = process.argv.slice(2);
  const chat = args.includes('--chat');
  const positional = args.filter((a) => a !== '--chat');
  const model = positional[0] ?? 'qwen3.5:4b';
  const questions = positional.length > 1 ? positional.slice(1) : QUESTIONS;
  const host = process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST;
  const tools = consigliereToolSpecs();
  const groups = Array.from(new Set(tools.map((t) => t.group))) as ConsigliereToolGroup[];
  const ctx = await smokeContext();
  const system: OllamaMessage = { role: 'system', content: buildSystemPrompt({ groups }) };
  let conversation: OllamaMessage[] = [system];

  for (const question of questions) {
    console.log(`\n=== ${question}`);
    const started = Date.now();
    let text = '';
    const history: OllamaMessage[] = [...(chat ? conversation : [system]), { role: 'user', content: question }];
    const messages = await runTurn({
      host,
      model,
      numCtx: 16384,
      think: false,
      tools,
      history,
      signal: new AbortController().signal,
      executeTool: (name, args) => runConsigliereTool(name, args, ctx),
      callbacks: {
        onContent: (d) => (text += d),
        onThinking: () => {},
        onRound: () => (text = ''),
        onToolStart: (t) => console.log(`  → ${t.name} ${JSON.stringify(t.args)}`),
        onToolEnd: (t) => {
          console.log(`    ${t.status} in ${t.ms}ms${t.error ? `: ${t.error}` : ''}`);
          const proposal = proposalFrom(t.result);
          if (proposal) console.log(`    SAVE PROPOSAL (${proposal.kind}): ${JSON.stringify(proposal.summary)}`);
        },
      },
    });
    conversation = messages;
    const toolCalls = messages.slice(history.length).filter((m) => m.role === 'tool').length;
    console.log(`\n${text.trim()}\n  [${toolCalls} tool call(s), ${((Date.now() - started) / 1000).toFixed(1)}s]`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
