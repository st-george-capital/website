#!/usr/bin/env tsx

export {};

const args = new Set(process.argv.slice(2));

function printHelp() {
  console.log(`Usage: npm run backtest:run -- [--dry-run] [--help]

Runs the Phase 4 walk-forward backtest and writes results to:
- backtest_runs
- factor_weight_sets
- backtest_metrics

Options:
  --dry-run   Validate imports and print the active config without touching the DB
  --help      Show this help text`);
}

async function main() {
  if (process.env.DIRECT_URL && process.env.DATABASE_URL?.startsWith('prisma+postgres://')) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
    console.log('backtest:run using DIRECT_URL for local analytics queries');
  }

  const { prisma } = await import('../../lib/macro-engine/db');
  const { DEFAULT_CONFIG, runBacktest } = await import('../../lib/macro-engine/backtest');
  const { HOLDOUT_START } = await import('../../lib/macro-engine/backtest/types');

  if (args.has('--help')) {
    printHelp();
    return;
  }

  if (args.has('--dry-run')) {
    console.log('backtest:run dry-run');
    console.log(`  holdoutStart=${HOLDOUT_START.toISOString().slice(0, 10)}`);
    console.log(`  dataStart=${DEFAULT_CONFIG.dataStart.toISOString().slice(0, 10)}`);
    console.log(`  stepMonths=${DEFAULT_CONFIG.stepMonths}`);
    console.log(`  trainMinYears=${DEFAULT_CONFIG.trainMinYears}`);
    console.log(`  lambdaRidge=${DEFAULT_CONFIG.lambdaRidge}`);
    console.log(`  minRegimeSamples=${DEFAULT_CONFIG.minRegimeSamples}`);
    console.log('  imports resolved successfully; skipping DB-backed execution');
    return;
  }

  const runId = await runBacktest();
  console.log(`\nBacktest complete. runId: ${runId}`);
  console.log('Run `npm run verify:backtest` to validate persisted metrics.');
}

main()
  .then(async () => {
    const { prisma } = await import('../../lib/macro-engine/db');
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('run-backtest failed:', error);
    const { prisma } = await import('../../lib/macro-engine/db');
    await prisma.$disconnect();
    process.exit(1);
  });
