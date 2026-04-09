import { prisma } from '../db';
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
  stepMonths: 3,
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

function scoreWindowRows(
  featureRows: FeatureSliceRow[],
  regimeMap: Map<string, string>,
  assetReturnMap: Map<string, number>,
  benchmarkReturnMap: Map<string, number>,
  weightSetMap: Map<string, number[]>,
  globalWeights: number[],
  window: WindowResult['window'],
): WindowResult | null {
  const predictedSigns: number[] = [];
  const actualReturns: number[] = [];
  const excessReturns: number[] = [];

  for (const row of featureRows) {
    const dateKey = toDateKey(row.featureDate);
    const actualReturn = assetReturnMap.get(`${row.ticker}|${dateKey}`);
    if (actualReturn === undefined) continue;

    const benchmarkReturn = benchmarkReturnMap.get(dateKey) ?? 0;
    const regimeLabel = regimeMap.get(dateKey) ?? 'global';
    const weights = weightSetMap.get(regimeLabel) ?? globalWeights;
    const score = toFeatureVector(row).reduce((sum, value, index) => sum + value * weights[index], 0);

    predictedSigns.push(score);
    actualReturns.push(actualReturn);
    excessReturns.push(actualReturn - benchmarkReturn);
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

  const windowResults: WindowResult[] = [];
  let finalWeightSets: ReturnType<typeof fitWeightSetsForWindow> = [];

  for (const [index, window] of windows.entries()) {
    assertNotHoldout(window.testStart);

    console.log(
      `  window ${index + 1}/${windows.length}: train [${toDateKey(window.trainStart)}, ${toDateKey(
        window.trainEnd,
      )}) test [${toDateKey(window.testStart)}, ${toDateKey(window.testEnd)})`,
    );

    const trainingFeatures = await prisma.factorFeatureMatrix.findMany({
      where: {
        featureDate: { gte: window.trainStart, lt: window.testStart },
        ticker: { in: tickers },
      },
      select: {
        featureDate: true,
        ticker: true,
        zGrowth: true,
        zInflation: true,
        zMonetary: true,
        zCredit: true,
        zCarry: true,
        zEarnings: true,
      },
    });
    if (trainingFeatures.length === 0) {
      console.log(`    window ${index + 1}: no train features — skipping`);
      continue;
    }

    const trainingRegimes = await prisma.regimeLabel.findMany({
      where: { date: { gte: window.trainStart, lt: window.testStart } },
      select: { date: true, regimeLabel: true },
    });
    const trainingRegimeMap = new Map(
      trainingRegimes.map((row) => [toDateKey(row.date), row.regimeLabel]),
    );

    const trainingReturns = await computeForwardReturns(tickers, window.trainStart, window.trainEnd);
    const trainingReturnMap = toReturnMap(trainingReturns);

    const trainRows: TrainRow[] = [];
    let excludedTrainRows = 0;
    for (const row of trainingFeatures) {
      const dateKey = toDateKey(row.featureDate);
      const forwardReturn = trainingReturnMap.get(`${row.ticker}|${dateKey}`);
      if (forwardReturn === undefined) continue;

      // Exclude rows where >3 of 6 dimensions are null (would fabricate too much signal)
      if (countNullDimensions(row) > 3) {
        excludedTrainRows++;
        continue;
      }

      trainRows.push({
        ticker: row.ticker,
        featureDate: row.featureDate,
        regimeLabel: trainingRegimeMap.get(dateKey) ?? 'global',
        features: toFeatureVector(row),
        fwdReturn: forwardReturn,
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

    const testFeatures = await prisma.factorFeatureMatrix.findMany({
      where: {
        featureDate: { gte: window.testStart, lt: window.testEnd },
        ticker: { in: tickers },
      },
      select: {
        featureDate: true,
        ticker: true,
        zGrowth: true,
        zInflation: true,
        zMonetary: true,
        zCredit: true,
        zCarry: true,
        zEarnings: true,
      },
    });
    if (testFeatures.length === 0) {
      console.log(`    window ${index + 1}: no test features — skipping`);
      continue;
    }

    const testRegimes = await prisma.regimeLabel.findMany({
      where: { date: { gte: window.testStart, lt: window.testEnd } },
      select: { date: true, regimeLabel: true },
    });
    const testRegimeMap = new Map(testRegimes.map((row) => [toDateKey(row.date), row.regimeLabel]));

    const testReturns = await computeForwardReturns(tickers, window.testStart, window.testEnd);
    const testReturnMap = toReturnMap(testReturns);

    const benchmarkReturns = await computeForwardReturns(['SPY'], window.testStart, window.testEnd);
    const benchmarkReturnMap = toBenchmarkMap(benchmarkReturns, 'SPY');

    // Pre-validate benchmark coverage: every test date that has asset features must have a benchmark price
    const testDateKeys = new Set(testFeatures.map(r => toDateKey(r.featureDate)));
    const missingBenchmarkDates = [...testDateKeys].filter(dk => !benchmarkReturnMap.has(dk));
    if (missingBenchmarkDates.length > 0) {
      const sample = missingBenchmarkDates.slice(0, 3).join(', ');
      throw new Error(
        `Benchmark price gap detected in window ${index + 1}: SPY prices missing for ` +
        `${missingBenchmarkDates.length} date(s) (e.g. ${sample}). ` +
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
      testRegimeMap,
      testReturnMap,
      benchmarkReturnMap,
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

  const latestFeature = await prisma.factorFeatureMatrix.findFirst({
    orderBy: { featureDate: 'desc' },
    select: { featureDate: true },
  });
  const holdoutEnd = latestFeature?.featureDate ?? new Date();

  const holdoutFeatures = await prisma.factorFeatureMatrix.findMany({
    where: {
      featureDate: { gte: HOLDOUT_START, lt: holdoutEnd },
      ticker: { in: tickers },
    },
    select: {
      featureDate: true,
      ticker: true,
      zGrowth: true,
      zInflation: true,
      zMonetary: true,
      zCredit: true,
      zCarry: true,
      zEarnings: true,
    },
  });
  const holdoutRegimes = await prisma.regimeLabel.findMany({
    where: { date: { gte: HOLDOUT_START, lt: holdoutEnd } },
    select: { date: true, regimeLabel: true },
  });
  const holdoutRegimeMap = new Map(
    holdoutRegimes.map((row) => [toDateKey(row.date), row.regimeLabel]),
  );

  const holdoutReturns = await computeForwardReturns(tickers, HOLDOUT_START, holdoutEnd);
  const holdoutReturnMap = toReturnMap(holdoutReturns);
  const holdoutBenchmarkReturns = await computeForwardReturns(['SPY'], HOLDOUT_START, holdoutEnd);
  const holdoutBenchmarkMap = toBenchmarkMap(holdoutBenchmarkReturns, 'SPY');

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
      notes: `forwardDays=${config.forwardDays}; benchmark=SPY`,
    },
  });

  await prisma.factorWeightSet.createMany({
    data: finalWeightSets.map((weightSet) => ({
      runId: run.id,
      regimeLabel: weightSet.regimeLabel,
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
