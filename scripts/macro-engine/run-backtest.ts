#!/usr/bin/env tsx

export {};

const args = new Set(process.argv.slice(2));

function printHelp() {
  console.log(`Usage: npm run backtest:run -- [--dry-run] [--no-regime-overrides] [--help]

Runs the Phase 4 walk-forward backtest and writes results to:
- backtest_runs
- factor_weight_sets
- backtest_metrics

Options:
  --dry-run               Validate imports and print the active config without touching the DB
  --no-regime-overrides   Disable Chunk 11 regime-conditional parameter overrides (for A/B)
  --help                  Show this help text`);
}

async function main() {
  if (process.env.DIRECT_URL && process.env.DATABASE_URL?.startsWith('prisma+postgres://')) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
    console.log('backtest:run using DIRECT_URL for local analytics queries');
  }

  const { prisma } = await import('../../lib/macro-engine/db');
  const { DEFAULT_CONFIG, runBacktest, loadPerRegimeOverrides } = await import('../../lib/macro-engine/backtest');
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

  // Chunk 11: regime-conditional parameters. Load the canonical picks file
  // unless the operator opted out via --no-regime-overrides.
  let perRegimeOverrides: Awaited<ReturnType<typeof loadPerRegimeOverrides>> = undefined;
  if (!args.has('--no-regime-overrides')) {
    perRegimeOverrides = await loadPerRegimeOverrides();
    if (perRegimeOverrides) {
      const count = Object.keys(perRegimeOverrides).length;
      console.log(`regime-conditional overrides: ${count} regime(s) configured`);
    } else {
      console.log('regime-conditional overrides: none loaded (no picks file)');
    }
  } else {
    console.log('regime-conditional overrides: disabled via --no-regime-overrides');
  }

  const result = await runBacktest({ ...DEFAULT_CONFIG, perRegimeOverrides });
  console.log(`\nBacktest complete. runId: ${result.runId ?? '(skipPersist)'}`);
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
