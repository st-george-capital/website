#!/usr/bin/env tsx

export {};

const args = new Set(process.argv.slice(2));

function printHelp() {
  console.log(`Usage: npm run signals:run -- [--dry-run] [--help]

Runs the Phase 5 daily allocation signals pipeline and writes results to:
- allocation_signals

Options:
  --dry-run   Validate imports and print the active config without touching the DB
  --help      Show this help text`);
}

async function main() {
  if (process.env.DIRECT_URL && process.env.DATABASE_URL?.startsWith('prisma+postgres://')) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
    console.log('signals:run using DIRECT_URL for local analytics queries');
  }

  if (args.has('--help')) {
    printHelp();
    return;
  }

  if (args.has('--dry-run')) {
    // Resolve imports without touching the DB
    const { scoreUniverse } = await import('../../lib/macro-engine/signals/scoring');
    const { runDailySignals } = await import('../../lib/macro-engine/signals/index');
    const { BACKTEST_FEATURE_DIMS } = await import('../../lib/macro-engine/backtest/types');
    const { getByType } = await import('../../lib/macro-engine/universe');

    const etfs = getByType('etf');

    console.log('signals:run dry-run');
    console.log(`  asOfDate=${new Date().toISOString().slice(0, 10)}`);
    console.log(`  featureDims=${BACKTEST_FEATURE_DIMS.join(', ')}`);
    console.log(`  universeEtfs=${etfs.length} ETFs`);
    console.log('  imports resolved successfully; skipping DB-backed execution');

    // Suppress unused import warnings
    void scoreUniverse;
    void runDailySignals;
    return;
  }

  const { runDailySignals } = await import('../../lib/macro-engine/signals/index');
  const result = await runDailySignals();

  console.log(`\nSignals run complete.`);
  console.log(`  runDate:      ${result.runDate}`);
  console.log(`  signalCount:  ${result.signalCount}`);
  console.log(`  regimeLabel:  ${result.regimeLabel}`);
  console.log('\nRun `npm run verify:signals` to validate persisted signals.');
}

main()
  .then(async () => {
    const { prisma } = await import('../../lib/macro-engine/db');
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('run-signals failed:', error);
    const { prisma } = await import('../../lib/macro-engine/db');
    await prisma.$disconnect();
    process.exit(1);
  });
