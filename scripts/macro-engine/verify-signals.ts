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
  console.log(`Usage: npm run verify:signals -- [--check-rows] [--check-fields] [--check-probs] [--check-stocks] [--check-analyst] [--help]

Checks the latest AllocationSignal run for:
  --check-rows     Assert rows exist for today (or most recent runDate), count = universe ETF size
  --check-fields   Assert each row has non-null convictionScore, factorAttribution, regimeLabel, etfTicker, rank, direction
  --check-probs    Assert prob6m/prob12m are null or float in [0,1]
  --check-stocks   Assert StockScreenResult rows exist (warning only at this stage)
  --check-analyst  Assert analystConsensus is present (warning only at this stage)

Default (no flag): runs --check-rows and --check-fields`);
}

async function checkRows(prisma: import('@prisma/client').PrismaClient) {
  header('ALLC-01 Signal rows');

  const { getByType } = await import('../../lib/macro-engine/universe');
  const etfs = getByType('etf');
  const universeSize = etfs.length;

  // Find most recent runDate
  const latest = await prisma.allocationSignal.findFirst({
    orderBy: { runDate: 'desc' },
    select: { runDate: true },
  });

  if (!latest) {
    fail('No AllocationSignal rows found — run `npm run signals:run` first');
    return;
  }

  const runDate = latest.runDate;
  const rows = await prisma.allocationSignal.findMany({
    where: { runDate },
  });

  console.log(`  runDate=${runDate.toISOString().slice(0, 10)}, rows=${rows.length}, universeEtfs=${universeSize}`);

  if (rows.length === universeSize) {
    pass(`${rows.length} rows match universe size (${universeSize})`);
  } else if (rows.length > 0) {
    warn(
      `${rows.length} rows found but universe has ${universeSize} ETFs — some ETFs may lack feature data`,
    );
  } else {
    fail(`No AllocationSignal rows for runDate=${runDate.toISOString().slice(0, 10)}`);
  }
}

async function checkFields(prisma: import('@prisma/client').PrismaClient) {
  header('ALLC-02 Required fields');

  const latest = await prisma.allocationSignal.findFirst({
    orderBy: { runDate: 'desc' },
    select: { runDate: true },
  });

  if (!latest) {
    fail('No AllocationSignal rows found — run `npm run signals:run` first');
    return;
  }

  const rows = await prisma.allocationSignal.findMany({
    where: { runDate: latest.runDate },
  });

  let fieldFailures = 0;

  for (const row of rows) {
    if (row.convictionScore === null || row.convictionScore === undefined) {
      fail(`${row.ticker}: convictionScore is null`);
      fieldFailures++;
      continue;
    }
    if (row.convictionScore < 0 || row.convictionScore > 1) {
      fail(`${row.ticker}: convictionScore=${row.convictionScore} out of [0,1]`);
      fieldFailures++;
    }
    if (!row.factorAttribution || typeof row.factorAttribution !== 'object') {
      fail(`${row.ticker}: factorAttribution is not a JSON object`);
      fieldFailures++;
    } else {
      const keys = Object.keys(row.factorAttribution as Record<string, unknown>);
      if (keys.length !== 6) {
        fail(`${row.ticker}: factorAttribution has ${keys.length} keys, expected 6`);
        fieldFailures++;
      }
    }
    if (!row.regimeLabel) {
      fail(`${row.ticker}: regimeLabel is null/empty`);
      fieldFailures++;
    }
    if (!row.etfTicker) {
      fail(`${row.ticker}: etfTicker is null/empty`);
      fieldFailures++;
    }
    if (row.rank === null || row.rank === undefined || row.rank < 1) {
      fail(`${row.ticker}: rank=${row.rank} is invalid`);
      fieldFailures++;
    }
    if (!['overweight', 'underweight', 'neutral'].includes(row.direction)) {
      fail(`${row.ticker}: direction="${row.direction}" is not overweight|underweight|neutral`);
      fieldFailures++;
    }
  }

  if (fieldFailures === 0) {
    pass(`All ${rows.length} rows have valid required fields`);
  }
}

async function checkProbs(prisma: import('@prisma/client').PrismaClient) {
  header('ALLC-02 Probability fields (prob6m / prob12m)');

  const latest = await prisma.allocationSignal.findFirst({
    orderBy: { runDate: 'desc' },
    select: { runDate: true },
  });

  if (!latest) {
    fail('No AllocationSignal rows found — run `npm run signals:run` first');
    return;
  }

  const rows = await prisma.allocationSignal.findMany({
    where: { runDate: latest.runDate },
    select: { ticker: true, prob6m: true, prob12m: true },
  });

  let probFailures = 0;

  for (const row of rows) {
    if (row.prob6m !== null && row.prob6m !== undefined) {
      if (row.prob6m < 0 || row.prob6m > 1) {
        fail(`${row.ticker}: prob6m=${row.prob6m} out of [0,1]`);
        probFailures++;
      }
    }
    if (row.prob12m !== null && row.prob12m !== undefined) {
      if (row.prob12m < 0 || row.prob12m > 1) {
        fail(`${row.ticker}: prob12m=${row.prob12m} out of [0,1]`);
        probFailures++;
      }
    }
  }

  const nullCount = rows.filter((r) => r.prob6m === null && r.prob12m === null).length;
  if (nullCount === rows.length) {
    pass(`prob6m/prob12m are null for all ${rows.length} rows (expected at this stage)`);
  } else if (probFailures === 0) {
    pass(`prob6m/prob12m in valid range [0,1] for all populated rows`);
  }
}

async function checkStocks(prisma: import('@prisma/client').PrismaClient) {
  header('StockScreenResult rows');

  const latest = await prisma.stockScreenResult.findFirst({
    orderBy: { runDate: 'desc' },
    select: { runDate: true },
  });

  if (!latest) {
    warn('No StockScreenResult rows found — stock screener not yet populated (expected at this stage)');
    return;
  }

  const count = await prisma.stockScreenResult.count({
    where: { runDate: latest.runDate },
  });

  if (count > 0) {
    pass(`${count} StockScreenResult rows found for runDate=${latest.runDate.toISOString().slice(0, 10)}`);
  } else {
    warn('StockScreenResult table exists but has no rows — expected at this stage');
  }
}

async function checkAnalyst(prisma: import('@prisma/client').PrismaClient) {
  header('analystConsensus field');

  const latest = await prisma.allocationSignal.findFirst({
    orderBy: { runDate: 'desc' },
    select: { runDate: true },
  });

  if (!latest) {
    warn('No AllocationSignal rows found');
    return;
  }

  // analystConsensus is on StockScreenResult, not AllocationSignal — check there
  const stockRows = await prisma.stockScreenResult.findMany({
    select: { ticker: true, analystConsensus: true },
    take: 10,
  });

  if (stockRows.length === 0) {
    warn('analystConsensus: no StockScreenResult rows yet — not yet populated (expected at this stage)');
    return;
  }

  const populatedCount = stockRows.filter((r) => r.analystConsensus !== null).length;
  if (populatedCount === 0) {
    warn(`analystConsensus: all ${stockRows.length} sampled rows are null — not yet populated (expected at this stage)`);
  } else {
    pass(`analystConsensus populated in ${populatedCount}/${stockRows.length} sampled rows`);
  }
}

async function main() {
  if (process.env.DIRECT_URL && process.env.DATABASE_URL?.startsWith('prisma+postgres://')) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
    console.log('verify:signals using DIRECT_URL for local verification queries');
  }

  const { prismaDirectUrl: prisma } = await import('../../lib/macro-engine/db');

  if (args.has('--help')) {
    printHelp();
    return;
  }

  console.log('verify-signals: checking ALLC-* invariants');

  const runAllDefault = !args.has('--check-rows') && !args.has('--check-fields') &&
    !args.has('--check-probs') && !args.has('--check-stocks') && !args.has('--check-analyst');

  if (runAllDefault || args.has('--check-rows')) {
    await checkRows(prisma);
  }
  if (runAllDefault || args.has('--check-fields')) {
    await checkFields(prisma);
  }
  if (args.has('--check-probs')) {
    await checkProbs(prisma);
  }
  if (args.has('--check-stocks')) {
    await checkStocks(prisma);
  }
  if (args.has('--check-analyst')) {
    await checkAnalyst(prisma);
  }

  if (failed) {
    console.error('\nverify-signals: FAILED');
    process.exit(1);
  }

  console.log('\nverify-signals: all checks PASSED');
}

main()
  .then(async () => {
    const { prismaDirectUrl: prisma } = await import('../../lib/macro-engine/db');
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('verify-signals failed:', error);
    const { prismaDirectUrl: prisma } = await import('../../lib/macro-engine/db');
    await prisma.$disconnect();
    process.exit(1);
  });
