import { prismaDirectUrl as prisma } from '../db';
import { getUniverse } from '../universe';
import {
  BACKTEST_FEATURE_DIMS,
  BacktestConfig,
  HOLDOUT_START,
  TrainRow,
  WindowResult,
  assertNotHoldout,
} from './types';
import { aggregateMetrics } from './metrics';
import { ForwardReturn, computeForwardReturns } from './returns';
import { fitWeightSetsForWindow } from './weights';
import { generateWindows } from './windows';

type FeatureSliceRow = {
  featureDate: Date;
  ticker: string;
  zGrowth: number | null;
  zInflation: number | null;
  zMonetary: number | null;
  zCredit: number | null;
  zCarry: number | null;
  zEarnings: number | null;
};

const DEFAULT_CONFIG: BacktestConfig = {
  dataStart: new Date('2004-01-01'),
  stepMonths: 1,  // Monthly rebalancing aligned with 21-day forward return period
  trainMinYears: 3,
  lambdaRidge: 0.05,
  minRegimeSamples: 30,
  forwardDays: 21,
};

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function countNullDimensions(row: FeatureSliceRow): number {
  return BACKTEST_FEATURE_DIMS.filter((dim) => row[dim] === null).length;
}

function toFeatureVector(row: FeatureSliceRow): number[] {
  return BACKTEST_FEATURE_DIMS.map((dim) => row[dim] ?? 0);
}

function toReturnMap(rows: ForwardReturn[]): Map<string, number> {
  return new Map(rows.map((row) => [`${row.ticker}|${toDateKey(row.featureDate)}`, row.fwdReturn]));
}

function toBenchmarkMap(rows: ForwardReturn[], benchmarkTicker: string): Map<string, number> {
  return new Map(
    rows
      .filter((row) => row.ticker === benchmarkTicker)
      .map((row) => [toDateKey(row.featureDate), row.fwdReturn]),
  );
}

/**
 * Returns ordinal ranks for an array of values (0-indexed, ascending).
 * Equal values get averaged rank (fractional). Higher value = higher rank index.
 * Example: [3, 1, 2] → [2, 0, 1]
 */
function rankAscending(values: number[]): number[] {
  const n = values.length;
  const indexed = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(n).fill(0);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n - 1 && indexed[j + 1].v === indexed[j].v) j++;
    const avgRank = (i + j) / 2;
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = avgRank;
    i = j + 1;
  }
  return ranks;
}

/**
 * Builds per-date portfolio returns by ranking tickers on each date and
 * taking an equal-weighted long position in the top half of the universe.
 *
 * This gives a meaningful Sharpe: the model's actual "portfolio" return vs SPY
 * rather than the unconditional excess return of every (ticker, date) pair.
 */
function scoreWindowRows(
  featureRows: FeatureSliceRow[],
  regimeMap: Map<string, string>,
  assetReturnMap: Map<string, number>,
  benchmarkReturnMap: Map<string, number>,
  weightSetMap: Map<string, number[]>,
  globalWeights: number[],
  window: WindowResult['window'],
): WindowResult | null {
  // Group feature rows by date — score all tickers on each date, then build portfolio
  const byDate = new Map<string, FeatureSliceRow[]>();
  for (const row of featureRows) {
    const dk = toDateKey(row.featureDate);
    if (!byDate.has(dk)) byDate.set(dk, []);
    byDate.get(dk)!.push(row);
  }

  const predictedSigns: number[] = [];
  const actualReturns: number[] = [];
  const excessReturns: number[] = [];

  for (const [dateKey, rows] of Array.from(byDate.entries()).sort()) {
    const benchmarkReturn = benchmarkReturnMap.get(dateKey) ?? null;
    if (benchmarkReturn === null) continue; // no SPY return for this date — skip

    const regimeLabel = regimeMap.get(dateKey) ?? 'global';

    // ── Regime gate: go flat in acute credit-stress regimes ────────────────
    // Credit-stress regimes have high correlation and risk-off drawdowns where
    // cross-sectional ranking adds no alpha — everything goes down together.
    // In these regimes we hold SPY (excess = 0) rather than a ranked long book.
    const isCreditStress = regimeLabel.toLowerCase().includes('credit');
    if (isCreditStress) {
      // Flat position: hold SPY, excess = 0. Don't count in hit rate (skip).
      excessReturns.push(0);
      continue;
    }

    const weights = weightSetMap.get(regimeLabel) ?? globalWeights;

    // Build (ticker, featureVec, actualReturn) for all tickers with data on this date
    type ScoredRow = { ticker: string; fv: number[]; actualReturn: number; score: number };
    const candidates: ScoredRow[] = [];
    for (const row of rows) {
      const actualReturn = assetReturnMap.get(`${row.ticker}|${dateKey}`);
      if (actualReturn === undefined) continue;
      candidates.push({ ticker: row.ticker, fv: toFeatureVector(row), actualReturn, score: 0 });
    }
    if (candidates.length < 2) continue;

    // IC-weighted rank scoring:
    // Cross-sectionally rank each ticker on momentum (zCarry) and earnings (zEarnings)
    // — the only two features with meaningful CS variance (std≈1 across tickers).
    // Combine ranks weighted by the magnitude of the ridge weight for each feature
    // (larger weight = stronger historical IC for that feature in this regime).
    // Using ranks instead of raw z-scores: robust to outliers, scale-invariant,
    // no matrix inversion, no look-ahead in the combining step.
    const carryIdx    = BACKTEST_FEATURE_DIMS.indexOf('zCarry');
    const earningsIdx = BACKTEST_FEATURE_DIMS.indexOf('zEarnings');
    const wCarry    = Math.abs(weights[carryIdx]);
    const wEarnings = Math.abs(weights[earningsIdx]);
    const wTotal    = wCarry + wEarnings || 1;

    const carryRanks    = rankAscending(candidates.map(c => c.fv[carryIdx]));
    const earningsRanks = rankAscending(candidates.map(c => c.fv[earningsIdx]));

    for (let i = 0; i < candidates.length; i++) {
      candidates[i].score = (wCarry / wTotal) * carryRanks[i] + (wEarnings / wTotal) * earningsRanks[i];
    }

    // Long top half by combined rank score
    candidates.sort((a, b) => b.score - a.score);
    const longCount = Math.ceil(candidates.length / 2);
    const longTickers = candidates.slice(0, longCount);

    // Equal-weighted long portfolio return
    const portfolioReturn = longTickers.reduce((s, t) => s + t.actualReturn, 0) / longCount;
    const portfolioExcess = portfolioReturn - benchmarkReturn;

    predictedSigns.push(1);
    actualReturns.push(portfolioExcess);
    excessReturns.push(portfolioExcess);
  }

  if (predictedSigns.length === 0) return null;

  return {
    window,
    predictedSigns,
    actualReturns,
    excessReturns,
  };
}

export async function runBacktest(config: BacktestConfig = DEFAULT_CONFIG): Promise<string> {
  console.log('runBacktest: starting walk-forward backtest');
  console.log(`  holdoutStart=${toDateKey(HOLDOUT_START)}`);

  // Auto-detect dataStart from earliest feature row in DB
  const earliestFeature = await prisma.factorFeatureMatrix.findFirst({
    orderBy: { featureDate: 'asc' },
    select: { featureDate: true },
  });
  if (earliestFeature && earliestFeature.featureDate < config.dataStart) {
    console.log(`  dataStart extended: DB has data from ${toDateKey(earliestFeature.featureDate)}, config had ${toDateKey(config.dataStart)}`);
    config = { ...config, dataStart: earliestFeature.featureDate };
  } else if (earliestFeature && earliestFeature.featureDate > config.dataStart) {
    console.log(`  dataStart auto-corrected: DB earliest feature is ${toDateKey(earliestFeature.featureDate)} (config assumed ${toDateKey(config.dataStart)} — no data that early)`);
    config = { ...config, dataStart: earliestFeature.featureDate };
  }

  console.log(`  dataStart=${toDateKey(config.dataStart)}`);
  console.log(`  stepMonths=${config.stepMonths}, trainMinYears=${config.trainMinYears}`);

  const windows = generateWindows(config);
  if (windows.length === 0) {
    throw new Error('No walk-forward windows generated — check dataStart and trainMinYears');
  }
  console.log(`  generated ${windows.length} walk-forward windows`);

  const universe = getUniverse();
  const tickers = [...new Set(universe.map((entry) => entry.ticker))];
  if (tickers.length === 0) {
    throw new Error('Universe is empty — cannot run backtest');
  }
  console.log(`  universe: ${tickers.length} tickers`);

  // ── Preload all data into memory (avoids Accelerate 5MB limit per query) ──
  // Fetch everything from dataStart to latest holdout date once, then filter in JS.
  const latestFeature = await prisma.factorFeatureMatrix.findFirst({
    orderBy: { featureDate: 'desc' },
    select: { featureDate: true },
  });
  const allDataEnd = latestFeature?.featureDate ?? new Date();

  console.log('  preloading feature matrix...');
  // Paginate features by ticker (one at a time) to stay under Accelerate's 5MB response limit
  const allFeatures: FeatureSliceRow[] = [];
  for (const ticker of tickers) {
    const rows = await prisma.$queryRaw<FeatureSliceRow[]>`
      SELECT "featureDate", ticker, "zGrowth", "zInflation", "zMonetary", "zCredit", "zCarry", "zEarnings"
      FROM factor_feature_matrix
      WHERE ticker = ${ticker}
        AND "featureDate" >= ${config.dataStart}
        AND "featureDate" <= ${allDataEnd}
      ORDER BY "featureDate" ASC
    `;
    allFeatures.push(...rows);
  }
  console.log(`  loaded ${allFeatures.length} feature rows`);

  console.log('  preloading regime labels...');
  const allRegimeRows = await prisma.regimeLabel.findMany({
    where: { date: { gte: config.dataStart, lte: allDataEnd } },
    select: { date: true, regimeLabel: true },
    orderBy: { date: 'asc' },
  });
  const allRegimeMap = new Map(allRegimeRows.map((row) => [toDateKey(row.date), row.regimeLabel]));
  console.log(`  loaded ${allRegimeRows.length} regime labels`);

  console.log('  preloading forward returns (per ticker)...');
  const allReturns = await computeForwardReturns(tickers, config.dataStart, allDataEnd, config.forwardDays);
  const allReturnMap = toReturnMap(allReturns);
  console.log(`  loaded ${allReturns.length} forward return observations`);

  console.log('  preloading benchmark (SPY) returns...');
  const allBenchmarkReturns = await computeForwardReturns(['SPY'], config.dataStart, allDataEnd, config.forwardDays);
  const allBenchmarkReturnMap = toBenchmarkMap(allBenchmarkReturns, 'SPY');
  console.log(`  loaded ${allBenchmarkReturns.length} SPY benchmark observations`);

  // Build in-memory lookup: "TICKER|YYYY-MM-DD" → feature row
  const featureByDateTicker = new Map<string, FeatureSliceRow>();
  for (const row of allFeatures) {
    featureByDateTicker.set(`${row.ticker}|${toDateKey(row.featureDate)}`, row);
  }

  // Helper: get all feature rows within a date range
  function featuresInRange(start: Date, end: Date): FeatureSliceRow[] {
    const startKey = toDateKey(start);
    const endKey = toDateKey(end);
    return allFeatures.filter((row) => {
      const k = toDateKey(row.featureDate);
      return k >= startKey && k < endKey;
    });
  }

  const windowResults: WindowResult[] = [];
  let finalWeightSets: ReturnType<typeof fitWeightSetsForWindow> = [];

  for (const [index, window] of windows.entries()) {
    assertNotHoldout(window.testStart);

    console.log(
      `  window ${index + 1}/${windows.length}: train [${toDateKey(window.trainStart)}, ${toDateKey(
        window.trainEnd,
      )}) test [${toDateKey(window.testStart)}, ${toDateKey(window.testEnd)})`,
    );

    const trainingFeatures = featuresInRange(window.trainStart, window.testStart);
    if (trainingFeatures.length === 0) {
      console.log(`    window ${index + 1}: no train features — skipping`);
      continue;
    }

    const trainRows: TrainRow[] = [];
    let excludedTrainRows = 0;
    for (const row of trainingFeatures) {
      const dateKey = toDateKey(row.featureDate);
      const forwardReturn = allReturnMap.get(`${row.ticker}|${dateKey}`);
      if (forwardReturn === undefined) continue;

      // Train on EXCESS return (ETF − SPY): the model should learn alpha, not beta.
      // Raw returns just teach the model to prefer high-beta ETFs in bull markets,
      // which adds no value over buying SPY. Excess returns teach regime-conditional alpha.
      const benchmarkReturn = allBenchmarkReturnMap.get(dateKey);
      if (benchmarkReturn === undefined) continue;
      const excessReturn = forwardReturn - benchmarkReturn;

      if (countNullDimensions(row) > 3) {
        excludedTrainRows++;
        continue;
      }

      trainRows.push({
        ticker: row.ticker,
        featureDate: row.featureDate,
        regimeLabel: allRegimeMap.get(dateKey) ?? 'global',
        features: toFeatureVector(row),
        fwdReturn: excessReturn,
      });
    }
    if (excludedTrainRows > 0) {
      console.warn(`    window ${index + 1}: excluded ${excludedTrainRows} train rows with >3 null dimensions`);
    }

    if (trainRows.length === 0) {
      console.log(`    window ${index + 1}: no train rows — skipping`);
      continue;
    }

    const weightSets = fitWeightSetsForWindow(
      trainRows,
      config.lambdaRidge,
      config.minRegimeSamples,
    );
    finalWeightSets = weightSets;

    const testFeatures = featuresInRange(window.testStart, window.testEnd);
    if (testFeatures.length === 0) {
      console.log(`    window ${index + 1}: no test features — skipping`);
      continue;
    }

    // Pre-validate benchmark coverage
    const testStartKey = toDateKey(window.testStart);
    const testEndKey = toDateKey(window.testEnd);
    const datesWithTestReturns = new Set(
      [...allReturnMap.keys()]
        .filter(k => { const d = k.split('|')[1]; return d >= testStartKey && d < testEndKey; })
        .map(k => k.split('|')[1])
    );
    const missingBenchmarkDates = [...datesWithTestReturns].filter(dk => !allBenchmarkReturnMap.has(dk));
    if (missingBenchmarkDates.length > 0) {
      const sample = missingBenchmarkDates.slice(0, 3).join(', ');
      throw new Error(
        `Benchmark price gap detected in window ${index + 1}: SPY prices missing for ` +
        `${missingBenchmarkDates.length} date(s) that have asset returns (e.g. ${sample}). ` +
        'Ingest SPY prices before running backtest.'
      );
    }

    const weightSetMap = new Map(weightSets.map((weightSet) => [weightSet.regimeLabel, weightSet.weights]));
    const globalWeights = weightSetMap.get('global') ?? weightSets[0]?.weights;

    if (!globalWeights) {
      throw new Error('No weight sets fitted for test scoring');
    }

    const result = scoreWindowRows(
      testFeatures,
      allRegimeMap,
      allReturnMap,
      allBenchmarkReturnMap,
      weightSetMap,
      globalWeights,
      window,
    );

    if (result) {
      windowResults.push(result);
    }
  }

  if (windowResults.length === 0) {
    throw new Error('No window results produced — check feature, price, and regime coverage');
  }

  const oosMetrics = aggregateMetrics(windowResults, config.forwardDays, 'oos', 'SPY');
  console.log(
    `OOS metrics: hitRate=${oosMetrics.hitRate.toFixed(3)}, sharpe=${oosMetrics.sharpeAnn.toFixed(
      3,
    )}, maxDD=${oosMetrics.maxDrawdown?.toFixed(3) ?? 'null'}`,
  );

  if (finalWeightSets.length === 0) {
    throw new Error('No final weight sets available for holdout scoring');
  }

  const holdoutEnd = allDataEnd;
  const holdoutFeatures = featuresInRange(HOLDOUT_START, holdoutEnd);
  const holdoutRegimeMap = new Map(
    [...allRegimeMap.entries()].filter(([k]) => k >= toDateKey(HOLDOUT_START)),
  );
  const holdoutReturnMap = new Map(
    [...allReturnMap.entries()].filter(([k]) => k.split('|')[1] >= toDateKey(HOLDOUT_START)),
  );
  const holdoutBenchmarkMap = new Map(
    [...allBenchmarkReturnMap.entries()].filter(([k]) => k >= toDateKey(HOLDOUT_START)),
  );

  const finalWeightMap = new Map(
    finalWeightSets.map((weightSet) => [weightSet.regimeLabel, weightSet.weights]),
  );
  const finalGlobalWeights =
    finalWeightMap.get('global') ?? finalWeightSets[0]?.weights ?? new Array(6).fill(0);

  const holdoutWindow = {
    trainStart: HOLDOUT_START,
    trainEnd: holdoutEnd,
    testStart: HOLDOUT_START,
    testEnd: holdoutEnd,
  };

  const holdoutResult = scoreWindowRows(
    holdoutFeatures,
    holdoutRegimeMap,
    holdoutReturnMap,
    holdoutBenchmarkMap,
    finalWeightMap,
    finalGlobalWeights,
    holdoutWindow,
  );

  if (!holdoutResult) {
    throw new Error('No holdout results produced — check post-2022 feature and price coverage');
  }

  const holdoutMetrics = aggregateMetrics([holdoutResult], config.forwardDays, 'holdout', 'SPY');
  console.log(
    `Holdout metrics: hitRate=${holdoutMetrics.hitRate.toFixed(
      3,
    )}, sharpe=${holdoutMetrics.sharpeAnn.toFixed(3)}, maxDD=${holdoutMetrics.maxDrawdown?.toFixed(3) ?? 'null'}`,
  );

  const run = await prisma.backtestRun.create({
    data: {
      dataStart: toDateKey(config.dataStart),
      holdoutStart: toDateKey(HOLDOUT_START),
      windowCount: windowResults.length,
      stepMonths: config.stepMonths,
      lambdaRidge: config.lambdaRidge,
      minRegimeSamples: config.minRegimeSamples,
      notes: `forwardDays=${config.forwardDays}; benchmark=SPY; nonOverlapping=true`,
    },
  });

  await prisma.factorWeightSet.createMany({
    data: finalWeightSets.map((weightSet) => ({
      runId: run.id,
      regimeLabel: weightSet.regimeLabel,
      // BACKTEST_FEATURE_DIMS = ['zCarry', 'zEarnings'] — only CS-varying features.
      // DB schema stores all 6 columns; zero out the unused macro dimensions.
      wGrowth: weightSet.weights[0] ?? 0,
      wInflation: weightSet.weights[1] ?? 0,
      wMonetary: weightSet.weights[2] ?? 0,
      wCredit: weightSet.weights[3] ?? 0,
      wCarry: weightSet.weights[4] ?? 0,
      wEarnings: weightSet.weights[5] ?? 0,
      sampleCount: weightSet.sampleCount,
      isFallback: weightSet.isFallback,
    })),
  });

  const toMetricRow = (metric: typeof oosMetrics) => ({
    runId: run.id,
    window: metric.window,
    benchmark: metric.benchmark,
    hitRate: metric.hitRate,
    sharpeAnn: metric.sharpeAnn,
    maxDrawdown: metric.maxDrawdown ?? 0,
    startDate: toDateKey(metric.startDate),
    endDate: toDateKey(metric.endDate),
    nPeriods: metric.nPeriods,
  });

  await prisma.backtestMetric.createMany({
    data: [toMetricRow(oosMetrics), toMetricRow(holdoutMetrics)],
  });

  console.log(`runBacktest: complete — runId=${run.id}`);
  return run.id;
}

export { DEFAULT_CONFIG };
