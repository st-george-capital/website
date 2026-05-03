#!/usr/bin/env tsx

const directUrl = process.env.DIRECT_URL ?? process.env.DATABASE_POSTGRES_URL ?? process.env.POSTGRES_URL;

if (directUrl) {
  if (process.env.DATABASE_URL?.startsWith('prisma+postgres://')) process.env.DATABASE_URL = directUrl;
  process.env.MACRO_ENGINE_USE_DIRECT_DB = 'true';
  console.log('research:backtest using direct Postgres URL');
}

import { prismaDirectUrl as prisma } from '../../lib/macro-engine/db';
import { backtestPairSignals, formatPct } from '../../lib/macro-engine/research/pairBacktest';
import { getResearchPairs } from '../../lib/macro-engine/research/universe';

function argValue(name: string): string | undefined {
  const eq = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseDateArg(name: string, fallback: string): Date {
  const raw = argValue(name) ?? fallback;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid --${name} date: ${raw}`);
  return date;
}

function parseHorizonArg(): number[] {
  const raw = argValue('horizons');
  if (!raw) return [20, 60, 120, 252];
  const horizons = raw.split(',').map((x) => Number(x.trim())).filter((x) => Number.isFinite(x) && x > 0);
  if (horizons.length === 0) throw new Error(`Invalid --horizons value: ${raw}`);
  return horizons;
}

function printHelp() {
  console.log(`Usage: npm run research:backtest -- [options]

Evaluates research-universe pair signals against stored ohlcv_daily prices.

Options:
  --start YYYY-MM-DD       Start date, default 2004-01-01
  --end YYYY-MM-DD         End date, default today
  --pairs id1,id2          Pair IDs to test, default all configured pairs
  --horizons 20,60,120     Forward calendar-day horizons, default 20,60,120,252
  --json                   Print JSON instead of tables
  --help                   Show this help text`);
}

function pctForTable(value: number | null): string {
  return formatPct(value).padStart(8);
}

function ratio(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '   n/a';
  return `${(value * 100).toFixed(0)}%`.padStart(6);
}

async function main() {
  if (hasFlag('help')) {
    printHelp();
    return;
  }

  const startDate = parseDateArg('start', '2004-01-01');
  const endDate = parseDateArg('end', new Date().toISOString().slice(0, 10));
  const horizons = parseHorizonArg();
  const pairFilter = argValue('pairs')?.split(',').map((x) => x.trim()).filter(Boolean);

  const allPairs = getResearchPairs();
  const pairs = pairFilter
    ? allPairs.filter((pair) => pairFilter.includes(pair.id))
    : allPairs;

  if (pairs.length === 0) {
    throw new Error(`No research pairs matched ${pairFilter?.join(', ') ?? '(empty)'}`);
  }

  console.log(`Research pair backtest: ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`);
  console.log(`Pairs: ${pairs.map((pair) => pair.id).join(', ')}`);
  console.log(`Horizons: ${horizons.join(', ')} calendar days\n`);

  const results = await backtestPairSignals({ pairs, startDate, endDate, horizons });

  if (hasFlag('json')) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  for (const result of results) {
    const cov = result.coverage;
    const coverageText = cov.startDate && cov.endDate
      ? `${cov.startDate} to ${cov.endDate}`
      : 'missing aligned prices';

    console.log(`\n${result.pair.label} (${result.pair.numerator}/${result.pair.denominator})`);
    console.log(`  mode=${result.pair.mode}, lookback=${result.pair.lookbackDays}d, entryZ=${result.pair.entryZ}, events=${result.events.length}`);
    console.log(`  coverage=${coverageText}; rows ${result.pair.numerator}=${cov.numeratorRows}, ${result.pair.denominator}=${cov.denominatorRows}`);
    console.log('  horizon  n   hit    avg      median   worst    adverse');
    console.log('  ------- --- ------ -------- -------- -------- --------');

    for (const h of result.horizons) {
      console.log(
        `  ${String(h.horizonDays).padStart(5)}d ` +
        `${String(h.sampleSize).padStart(3)} ` +
        `${ratio(h.hitRate)} ` +
        `${pctForTable(h.avgSignedReturn)} ` +
        `${pctForTable(h.medianSignedReturn)} ` +
        `${pctForTable(h.worstSignedReturn)} ` +
        `${pctForTable(h.worstAdverseMove)}`,
      );
    }

    const recent = result.events.slice(-5);
    if (recent.length > 0) {
      console.log(`  last events: ${recent.map((e) => `${e.date} z=${e.zScore.toFixed(2)} ${e.side}`).join('; ')}`);
    }
  }
}

main()
  .catch((error) => {
    console.error('research backtest failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
