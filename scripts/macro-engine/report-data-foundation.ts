/**
 * scripts/macro-engine/report-data-foundation.ts
 *
 * Human-readable coverage report for all Phase 1 data tables.
 * Never exits non-zero — display only.
 *
 * Run: npm run report:data
 */

import { getOhlcvCoverage, getFredVintageIntegrity, getOecdCli } from '../../lib/macro-engine/query';
import { getUniverse, getCountries } from '../../lib/macro-engine/universe';

function padEnd(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

function padStart(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : ' '.repeat(n - s.length) + s;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return 'N/A';
  return new Date(d).toISOString().slice(0, 10);
}

function separator(cols: number[]): string {
  return '+' + cols.map((c) => '-'.repeat(c + 2)).join('+') + '+';
}

function row(cells: string[], cols: number[]): string {
  return '| ' + cells.map((c, i) => padEnd(c, cols[i])).join(' | ') + ' |';
}

async function printOhlcvTable(): Promise<void> {
  const universe = getUniverse();
  const coverage = await getOhlcvCoverage();
  const coverageMap = new Map(coverage.map((r) => [r.ticker, r]));

  const cols = [8, 12, 12, 10, 10];
  const headers = ['ticker', 'earliest', 'latest', 'row_count', 'status'];

  console.log('\nOHLCV Daily Coverage\n');
  console.log(separator(cols));
  console.log(row(headers, cols));
  console.log(separator(cols));

  for (const entry of universe) {
    const r = coverageMap.get(entry.ticker);
    const inception = new Date(entry.inceptionDate);
    const inceptionPlus30 = new Date(inception.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (!r) {
      console.log(row([entry.ticker, 'N/A', 'N/A', '0', 'MISSING'], cols));
      continue;
    }

    const rowCount = Number(r.rowCount);
    const ok = rowCount >= 4000 && r.earliest <= inceptionPlus30;
    const status = ok ? 'OK' : 'WARN';

    console.log(row([
      entry.ticker,
      formatDate(r.earliest),
      formatDate(r.latest),
      padStart(String(rowCount), 9),
      status,
    ], cols));
  }

  console.log(separator(cols));
}

async function printFredIntegrityTable(): Promise<void> {
  const integrity = await getFredVintageIntegrity();

  const cols = [20, 16];
  const headers = ['series_id', 'missing_vintage'];

  console.log('\nFRED Vintage Integrity (missing realtimeStart)\n');

  if (integrity.length === 0) {
    console.log('  No issues found — all rows have realtimeStart.');
    return;
  }

  console.log(separator(cols));
  console.log(row(headers, cols));
  console.log(separator(cols));

  for (const r of integrity) {
    console.log(row([r.seriesId, String(r.missingVintage)], cols));
  }

  console.log(separator(cols));
}

async function printOecdTable(): Promise<void> {
  const countries = getCountries();

  const cols = [8, 10, 10, 10, 8];
  const headers = ['country', 'earliest', 'latest', 'row_count', 'status'];

  console.log('\nOECD Leading Indicators Coverage\n');
  console.log(separator(cols));
  console.log(row(headers, cols));
  console.log(separator(cols));

  for (const country of countries) {
    const rows = await getOecdCli(country, new Date('1990-01-01'), new Date());
    const ok = rows.length >= 12;
    const earliest = rows.length > 0 ? formatDate(rows[0].period) : 'N/A';
    const latest = rows.length > 0 ? formatDate(rows[rows.length - 1].period) : 'N/A';
    const status = ok ? 'OK' : 'WARN';

    console.log(row([
      country,
      earliest,
      latest,
      padStart(String(rows.length), 9),
      status,
    ], cols));
  }

  console.log(separator(cols));
}

async function main(): Promise<void> {
  console.log('=== Phase 1 Data Foundation Coverage Report ===');

  await printOhlcvTable();
  await printFredIntegrityTable();
  await printOecdTable();

  console.log('\nReport complete.');
}

main().catch((err) => {
  console.error('Report script error:', err);
  // Never exit non-zero for report
  process.exit(0);
});
