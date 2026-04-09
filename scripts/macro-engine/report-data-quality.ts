/**
 * scripts/macro-engine/report-data-quality.ts
 *
 * Data quality report: per-factor null % by year for FactorFeatureMatrix,
 * and OHLCV price coverage for all universe tickers.
 * Never exits non-zero — display only.
 *
 * Run: npm run report:data-quality
 */

import { prisma } from '../../lib/macro-engine/db';
import { getUniverse } from '../../lib/macro-engine/universe';
import { Prisma } from '@prisma/client';

function padEnd(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

function padStart(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : ' '.repeat(n - s.length) + s;
}

function separator(cols: number[]): string {
  return '+' + cols.map((c) => '-'.repeat(c + 2)).join('+') + '+';
}

function row(cells: string[], cols: number[]): string {
  return '| ' + cells.map((c, i) => padEnd(c, cols[i])).join(' | ') + ' |';
}

function nullPct(total: bigint | number, count: bigint | number): string {
  const t = Number(total);
  const c = Number(count);
  if (t === 0) return ' N/A';
  const pct = ((t - c) / t) * 100;
  return padStart(pct.toFixed(1) + '%', 6);
}

interface FactorYearRow {
  year: number;
  total: bigint;
  z_growth_count: bigint;
  z_inflation_count: bigint;
  z_monetary_count: bigint;
  z_credit_count: bigint;
  z_carry_count: bigint;
  z_earnings_count: bigint;
}

async function printFactorNullTable(): Promise<void> {
  // Columns are camelCase in Postgres (no @map on this model)
  const results = await prisma.$queryRaw<FactorYearRow[]>(Prisma.sql`
    SELECT
      EXTRACT(YEAR FROM "featureDate")::int AS year,
      COUNT(*) AS total,
      COUNT("zGrowth")    AS z_growth_count,
      COUNT("zInflation") AS z_inflation_count,
      COUNT("zMonetary")  AS z_monetary_count,
      COUNT("zCredit")    AS z_credit_count,
      COUNT("zCarry")     AS z_carry_count,
      COUNT("zEarnings")  AS z_earnings_count
    FROM factor_feature_matrix
    GROUP BY 1
    ORDER BY 1
  `);

  const cols = [6, 8, 11, 13, 12, 10, 9, 13, 9];
  const headers = [
    'year', 'total',
    'zGrowth%', 'zInflation%', 'zMonetary%',
    'zCredit%', 'zCarry%', 'zEarnings%',
    'status',
  ];

  console.log('\nFactorFeatureMatrix — Null % by Year\n');

  if (results.length === 0) {
    console.log('  No data found in factor_feature_matrix.');
    return;
  }

  console.log(separator(cols));
  console.log(row(headers, cols));
  console.log(separator(cols));

  let warnCount = 0;

  for (const r of results) {
    const factors = [
      r.z_growth_count,
      r.z_inflation_count,
      r.z_monetary_count,
      r.z_credit_count,
      r.z_carry_count,
      r.z_earnings_count,
    ];
    const total = Number(r.total);
    const hasWarning = factors.some((c) => total > 0 && ((total - Number(c)) / total) * 100 > 20);
    if (hasWarning) warnCount++;

    console.log(row([
      String(r.year),
      padStart(String(total), 7),
      nullPct(r.total, r.z_growth_count),
      nullPct(r.total, r.z_inflation_count),
      nullPct(r.total, r.z_monetary_count),
      nullPct(r.total, r.z_credit_count),
      nullPct(r.total, r.z_carry_count),
      nullPct(r.total, r.z_earnings_count),
      hasWarning ? 'WARNING' : 'ok',
    ], cols));
  }

  console.log(separator(cols));
  console.log(`\nSummary: ${warnCount} of ${results.length} years have at least one factor with >20% null data.`);
}

async function printOhlcvCoverageTable(): Promise<void> {
  const universe = getUniverse();
  const present = await prisma.ohlcvDaily.findMany({
    distinct: ['ticker'],
    select: { ticker: true },
  });

  const presentSet = new Set(present.map((r) => r.ticker));

  const cols = [8, 9];
  const headers = ['ticker', 'status'];

  console.log('\nOHLCV Daily — Universe Ticker Coverage\n');
  console.log(separator(cols));
  console.log(row(headers, cols));
  console.log(separator(cols));

  let presentCount = 0;

  for (const entry of universe) {
    const found = presentSet.has(entry.ticker);
    if (found) presentCount++;
    console.log(row([entry.ticker, found ? 'present' : 'MISSING'], cols));
  }

  console.log(separator(cols));
  console.log(`\nSummary: ${presentCount} of ${universe.length} universe tickers have OHLCV data.`);
}

async function main(): Promise<void> {
  console.log('=== Data Quality Report ===');

  await printFactorNullTable();
  await printOhlcvCoverageTable();

  console.log('\nreport:data-quality complete');
}

main().catch((err) => {
  console.error('Report script error:', err);
  process.exit(0);
});
