#!/usr/bin/env tsx

const directUrl = process.env.DIRECT_URL ?? process.env.DATABASE_POSTGRES_URL ?? process.env.POSTGRES_URL;

if (directUrl && process.env.DATABASE_URL?.startsWith('prisma+postgres://')) {
  process.env.DATABASE_URL = directUrl;
  process.env.MACRO_ENGINE_USE_DIRECT_DB = 'true';
  console.log('research:prices using direct Postgres URL');
}

import { prismaDirectUrl as prisma } from '../../lib/macro-engine/db';
import { ingestPrices } from '../../lib/macro-engine/ingest/prices';
import {
  getResearchExpressions,
  toPriceIngestUniverse,
  type ResearchExpression,
} from '../../lib/macro-engine/research/universe';

function argValue(name: string): string | undefined {
  const eq = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function printHelp() {
  console.log(`Usage: npm run research:prices -- [options]

Ingests adjusted daily OHLCV for the separate research-universe expressions.
This uses the existing Alpha Vantage price ingest path, but does not modify the
live macro allocation universe.

Options:
  --dry-run              Print full/compact fetch plan without live API calls
  --tickers AAPL,CMG     Restrict to a comma-separated ticker subset
  --help                 Show this help text`);
}

async function printCoverage(expressions: ResearchExpression[]) {
  const tickers = expressions.map((expr) => expr.ticker);
  let rows: { ticker: string; earliest: Date | null; latest: Date | null; rowCount: bigint }[] = [];
  try {
    rows = await prisma.$queryRaw<{ ticker: string; earliest: Date | null; latest: Date | null; rowCount: bigint }[]>`
      SELECT ticker, MIN(date) AS earliest, MAX(date) AS latest, COUNT(*) AS "rowCount"
      FROM ohlcv_daily
      WHERE ticker = ANY(${tickers}::text[])
      GROUP BY ticker
    `;
  } catch (error) {
    console.warn(
      `\nResearch OHLCV coverage unavailable: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`,
    );
    return;
  }
  const byTicker = new Map(rows.map((row) => [row.ticker, row]));
  const missing = expressions.filter((expr) => !byTicker.has(expr.ticker)).map((expr) => expr.ticker);

  console.log('\nResearch OHLCV coverage');
  console.log(`  present: ${rows.length}/${expressions.length}`);
  if (missing.length > 0) console.log(`  missing: ${missing.join(', ')}`);

  for (const expr of expressions.slice(0, 12)) {
    const row = byTicker.get(expr.ticker);
    const coverage = row
      ? `${row.earliest?.toISOString().slice(0, 10) ?? 'n/a'} to ${row.latest?.toISOString().slice(0, 10) ?? 'n/a'} (${row.rowCount.toString()} rows)`
      : 'MISSING';
    console.log(`  ${expr.ticker.padEnd(6)} ${coverage}`);
  }
  if (expressions.length > 12) console.log(`  ... ${expressions.length - 12} more tickers omitted`);
}

async function main() {
  if (hasFlag('help')) {
    printHelp();
    return;
  }

  const requested = argValue('tickers')?.split(',').map((x) => x.trim()).filter(Boolean);
  const requestedSet = requested ? new Set(requested) : null;
  const expressions = getResearchExpressions().filter((expr) => !requestedSet || requestedSet.has(expr.ticker));

  if (expressions.length === 0) {
    throw new Error(`No research expressions matched ${requested?.join(', ') ?? '(empty)'}`);
  }

  await printCoverage(expressions);

  const result = await ingestPrices(toPriceIngestUniverse(expressions), { dryRun: hasFlag('dry-run') });
  console.log('\nResearch price ingest result');
  console.log(`  source: ${result.source}`);
  console.log(`  rows:   ${result.rowsUpserted}`);
  console.log(`  status: ${result.status}`);
  if (result.errors.length > 0) {
    console.log(`  errors: ${result.errors.slice(0, 8).join('; ')}`);
    if (result.errors.length > 8) console.log(`  ... and ${result.errors.length - 8} more`);
  }
}

main()
  .catch((error) => {
    console.error('research price ingest failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
