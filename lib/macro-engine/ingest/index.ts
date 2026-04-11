import { checkTimescaleDb } from '../db';
import { getUniverse, getByType, getCountries } from '../universe';
import { ingestPrices } from './prices';
import { ingestMacroSeries, FRED_SERIES_IDS } from './macro-series';
import { ingestRevisions } from './revisions';
import { logIngestRun, getLastSuccessfulRun } from './logging';
import type { IngestResult } from './prices';

export interface RunOptions {
  dryRun: boolean;
  source?: 'prices' | 'macro' | 'revisions';
}

export interface RunSummary {
  results: IngestResult[];
  exitCode: number;
}

/**
 * Main ingest orchestrator.
 *
 * 1. Checks TimescaleDB availability
 * 2. Validates required env vars
 * 3. Loads universe config
 * 4. Runs pipeline stages (or a single stage if --source is set)
 * 5. Logs each result to IngestLog
 * 6. Prints a summary table
 * 7. Returns exitCode 1 if any stage errored
 */
export async function runIngest(opts: RunOptions): Promise<RunSummary> {
  // 1. TimescaleDB check
  if (!opts.dryRun) {
    await checkTimescaleDb();
  } else {
    console.log('[dry-run] Skipping TimescaleDB check');
  }

  // 2. Validate env vars
  const requiredEnv = ['ALPHA_VANTAGE_API_KEY', 'FRED_API_KEY', 'FMP_API_KEY'];
  const missing = requiredEnv.filter((k) => !process.env[k]);
  if (missing.length > 0 && !opts.dryRun) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Populate them in .env before running the full ingest.'
    );
  }
  if (missing.length > 0 && opts.dryRun) {
    console.warn(`[dry-run] WARNING: missing env vars: ${missing.join(', ')} — would fail on live run`);
  }

  // 3. Print "last run" summary from IngestLog
  const sources = ['alpha-vantage', 'fred', 'fmp+oecd'];
  console.log('\n--- Last Successful Run ---');
  for (const src of sources) {
    try {
      const lastRun = await getLastSuccessfulRun(src);
      console.log(`  ${src}: ${lastRun ? lastRun.toISOString().slice(0, 10) : 'never'}`);
    } catch {
      console.log(`  ${src}: (log unavailable)`);
    }
  }
  console.log('');

  // 4. Load universe
  const universe = getUniverse();
  const equityTickers = getByType('equity').map((e) => e.ticker);

  const results: IngestResult[] = [];

  // 5. Run stages
  const runPrices = !opts.source || opts.source === 'prices';
  const runMacro = !opts.source || opts.source === 'macro';
  const runRevisions = !opts.source || opts.source === 'revisions';

  if (runPrices) {
    console.log('=== Stage: prices ===');
    const result = await ingestPrices(universe, opts);
    results.push(result);
    if (!opts.dryRun) {
      await logIngestRun(result);
    }
    printStageResult(result);
  }

  if (runMacro) {
    console.log('=== Stage: macro-series ===');
    const result = await ingestMacroSeries(FRED_SERIES_IDS, opts);
    results.push(result);
    if (!opts.dryRun) {
      await logIngestRun(result);
    }
    printStageResult(result);
  }

  if (runRevisions) {
    console.log('=== Stage: revisions ===');
    const result = await ingestRevisions(universe.map((e) => e.ticker), opts);
    results.push(result);
    if (!opts.dryRun) {
      await logIngestRun(result);
    }
    printStageResult(result);
  }

  // 6. Summary table
  console.log('\n--- Ingest Summary ---');
  console.log('Source          | Rows    | Status   | Errors');
  console.log('----------------|---------|----------|-------');
  for (const r of results) {
    const src = r.source.padEnd(15);
    const rows = String(r.rowsUpserted).padStart(7);
    const status = r.status.padEnd(8);
    const errCount = r.errors.length;
    console.log(`${src} | ${rows} | ${status} | ${errCount}`);
  }
  console.log('');

  const hasError = results.some((r) => r.status === 'error');
  return { results, exitCode: hasError ? 1 : 0 };
}

function printStageResult(result: IngestResult): void {
  const mode = result.rowsUpserted > 0 ? 'wrote' : 'dry run';
  console.log(
    `  Source: ${result.source} | ${mode} ${result.rowsUpserted} rows | status: ${result.status}`
  );
  if (result.errors.length > 0) {
    console.log(`  Errors (${result.errors.length}):`);
    result.errors.slice(0, 3).forEach((e) => console.log(`    - ${e}`));
    if (result.errors.length > 3) {
      console.log(`    ... and ${result.errors.length - 3} more`);
    }
  }
}
