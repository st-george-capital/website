/**
 * CLI entrypoint for the macro-engine ingest pipeline.
 *
 * Usage:
 *   npm run ingest              — full ingest (requires API keys + DB)
 *   npm run ingest:dry          — dry run (prints counts, no DB writes)
 *   npm run ingest -- --source=prices      — prices stage only
 *   npm run ingest -- --source=macro       — macro-series stage only
 *   npm run ingest -- --source=revisions   — revisions stage only
 *   npm run ingest:dry -- --source=prices  — dry run for prices only
 */

// Load .env if dotenv is available (optional dev dependency)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  // dotenv not installed — env vars must be set externally
}

import { runIngest } from '../../lib/macro-engine/ingest/index';

const args = process.argv.slice(2);

const dryRun = args.includes('--dry-run');

const sourceArg = args.find((a) => a.startsWith('--source='));
const source = sourceArg
  ? (sourceArg.split('=')[1] as 'prices' | 'macro' | 'revisions')
  : undefined;

if (source && !['prices', 'macro', 'revisions'].includes(source)) {
  console.error(`Invalid --source value "${source}". Must be one of: prices, macro, revisions`);
  process.exit(1);
}

runIngest({ dryRun, source })
  .then(({ exitCode }) => {
    process.exit(exitCode);
  })
  .catch((err) => {
    console.error('Ingest failed with unexpected error:');
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
