#!/usr/bin/env tsx

export {};

const args = new Set(process.argv.slice(2));

let failed = false;

function pass(message: string) {
  console.log(`  PASS  ${message}`);
}

function fail(message: string) {
  console.error(`  FAIL  ${message}`);
  failed = true;
}

function warn(message: string) {
  console.warn(`  WARN  ${message}`);
}

function header(message: string) {
  console.log(`\n-- ${message} --`);
}

function printHelp() {
  console.log(`Usage: npm run verify:backtest -- [--help]

Checks the latest backtest run for:
- holdout boundary integrity
- presence of per-regime and global weight sets
- OOS and holdout metric rows
- plausible Sharpe ranges`);
}

async function main() {
  if (process.env.DIRECT_URL && process.env.DATABASE_URL?.startsWith('prisma+postgres://')) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
    console.log('verify:backtest using DIRECT_URL for local verification queries');
  }

  const { prisma } = await import('../../lib/macro-engine/db');
  const { HOLDOUT_START } = await import('../../lib/macro-engine/backtest/types');

  if (args.has('--help')) {
    printHelp();
    return;
  }

  console.log('verify-backtest: checking BACK-* invariants');

  const run = await prisma.backtestRun.findFirst({
    orderBy: { runAt: 'desc' },
  });

  if (!run) {
    fail('No BacktestRun found — run `npm run backtest:run` first');
    process.exit(1);
  }

  console.log(`  using runId=${run.id}`);
  console.log(`  runAt=${run.runAt.toISOString()}`);

  header('BACK-03 Holdout boundary');
  const expectedHoldout = HOLDOUT_START.toISOString().slice(0, 10);
  if (run.holdoutStart === expectedHoldout) {
    pass(`holdoutStart=${run.holdoutStart} matches HOLDOUT_START`);
  } else {
    fail(`holdoutStart=${run.holdoutStart} does not match expected ${expectedHoldout}`);
  }

  header('BACK-01 Walk-forward execution');
  if (run.windowCount > 0) {
    pass(`windowCount=${run.windowCount}`);
  } else {
    fail('windowCount=0 — no walk-forward windows were persisted');
  }

  header('BACK-02 Regime-conditioned weights');
  const weightSets = await prisma.factorWeightSet.findMany({
    where: { runId: run.id },
    orderBy: { regimeLabel: 'asc' },
  });

  if (weightSets.length === 0) {
    fail('No FactorWeightSet rows found for latest run');
  } else {
    pass(`${weightSets.length} weight sets persisted`);
    const globalWeightSet = weightSets.find((row) => row.regimeLabel === 'global');
    if (globalWeightSet) {
      pass('"global" fallback weight set present');
    } else {
      fail('"global" fallback weight set missing');
    }

    const regimeSpecific = weightSets.filter(
      (row) => row.regimeLabel !== 'global' && row.isFallback === false,
    );
    pass(`${regimeSpecific.length} regime-specific weight sets`);

    const fallbacks = weightSets.filter((row) => row.isFallback);
    if (fallbacks.length > 0) {
      warn(`${fallbacks.length} regime weight sets are using global fallback`);
    }
  }

  header('BACK-04 OOS and holdout metrics');
  const metrics = await prisma.backtestMetric.findMany({
    where: { runId: run.id },
    orderBy: [{ window: 'asc' }, { benchmark: 'asc' }],
  });

  const oosMetric = metrics.find((row) => row.window === 'oos');
  const holdoutMetric = metrics.find((row) => row.window === 'holdout');

  if (!oosMetric) {
    fail('No BacktestMetric row with window="oos"');
  } else {
    pass(
      `OOS hitRate=${oosMetric.hitRate.toFixed(3)} sharpe=${oosMetric.sharpeAnn.toFixed(
        3,
      )} maxDD=${oosMetric.maxDrawdown.toFixed(3)}`,
    );
  }

  if (!holdoutMetric) {
    fail('No BacktestMetric row with window="holdout"');
  } else {
    pass(
      `Holdout hitRate=${holdoutMetric.hitRate.toFixed(3)} sharpe=${holdoutMetric.sharpeAnn.toFixed(
        3,
      )} maxDD=${holdoutMetric.maxDrawdown.toFixed(3)}`,
    );
    if (holdoutMetric.sharpeAnn > 3) warn('Holdout Sharpe > 3 — unexpectedly high; inspect leakage');
    if (holdoutMetric.sharpeAnn < -2) warn('Holdout Sharpe < -2 — model likely not generalizing');
  }

  if (failed) {
    console.error('\nverify-backtest: FAILED');
    process.exit(1);
  }

  console.log('\nverify-backtest: all checks PASSED');
}

main()
  .then(async () => {
    const { prisma } = await import('../../lib/macro-engine/db');
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('verify-backtest failed:', error);
    const { prisma } = await import('../../lib/macro-engine/db');
    await prisma.$disconnect();
    process.exit(1);
  });
