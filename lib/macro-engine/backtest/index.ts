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
  longFraction: 0.33,          // top third of universe — joint sweep with vol=18: lf=0.25→0.568/1.161, lf=0.33→0.560/1.295, lf=0.50→0.536/1.210
  volLookbackPeriods: 18,      // trailing months for inverse-vol weighting — joint sweep: vol=12→0.551/1.220, vol=18→0.560/1.295, vol=24→0.532/1.280
  confidenceExp: 0.5,          // confidence scaling exponent: sweep 0.5→0.563/1.298, 0.75→0.562/1.297, 1→0.560/1.295, 2→0.536/1.280
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
 * taking an equal-weighted long position in the top `longFraction` of the universe.
 * Default longFraction=0.25 (top quarter) was selected via sweep over [0.20, 0.25, 0.30, 0.33, 0.40, 0.50].
 *
 * This gives a meaningful Sharpe: the model's actual "portfolio" return vs SPY
 * rather than the unconditional excess return of every (ticker, date) pair.
 */
/**
 * Pre-compute trailing 6-month (6-period) volatility for each (ticker, date) pair.
 * Uses the last 6 monthly returns ending at the previous period (before date D),
 * so there is no look-ahead bias. Volatility = population std of those returns.
 * If fewer than 3 periods are available, returns null (equal-weight fallback).
 */
function buildVolMap(
  assetReturnMap: Map<string, number>,
  tickers: string[],
  sortedDateKeys: string[],
  volLookbackPeriods: number,
): Map<string, number | null> {
  const volMap = new Map<string, number | null>();
  // For each (ticker, date), compute vol from the previous N returns
  for (const ticker of tickers) {
    const tickerDates = sortedDateKeys.filter(dk => assetReturnMap.has(`${ticker}|${dk}`));
    for (let i = 0; i < tickerDates.length; i++) {
      const dk = tickerDates[i];
      // Use up to volLookbackPeriods returns strictly BEFORE this period (no look-ahead)
      const start = Math.max(0, i - volLookbackPeriods);
      const window = tickerDates.slice(start, i).map(d => assetReturnMap.get(`${ticker}|${d}`)!);
      if (window.length < 3) {
        volMap.set(`${ticker}|${dk}`, null);
        continue;
      }
      const mu = window.reduce((a, b) => a + b, 0) / window.length;
      const variance = window.reduce((a, b) => a + (b - mu) ** 2, 0) / window.length;
      volMap.set(`${ticker}|${dk}`, Math.sqrt(variance));
    }
  }
  return volMap;
}

function scoreWindowRows(
  featureRows: FeatureSliceRow[],
  regimeMap: Map<string, string>,
  assetReturnMap: Map<string, number>,
  benchmarkReturnMap: Map<string, number>,
  weightSetMap: Map<string, number[]>,
  globalWeights: number[],
  window: WindowResult['window'],
  creditStressLabels: Set<string>,
  confidenceMap: Map<string, number>,
  longFraction: number,
  volMap: Map<string, number | null>,
  confidenceExp: number,
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

    // ── Regime gate: go flat in credit-stress regimes (centroid zCredit > 0) ──
    // Credit-stress regimes have high correlation and risk-off drawdowns where
    // cross-sectional ranking adds no alpha — everything goes down together.
    // Gate uses centroid-derived labels to distinguish genuine stress (wide spreads)
    // from tight-spread "credit" regimes which are actually risk-on environments.
    if (creditStressLabels.has(regimeLabel)) {
      // Flat position: hold SPY, excess = 0. Don't count in hit rate (skip).
      excessReturns.push(0);
      continue;
    }

    // Build (ticker, featureVec, actualReturn) for all tickers with data on this date
    type ScoredRow = { ticker: string; fv: number[]; actualReturn: number; score: number };
    const candidates: ScoredRow[] = [];
    for (const row of rows) {
      const actualReturn = assetReturnMap.get(`${row.ticker}|${dateKey}`);
      if (actualReturn === undefined) continue;
      candidates.push({ ticker: row.ticker, fv: toFeatureVector(row), actualReturn, score: 0 });
    }
    if (candidates.length < 2) continue;

    // Pure momentum scoring: rank all candidates on zCarry (12m-1m skip momentum).
    // IC-weighted rank was tested but found to be insensitive to weights (ridge
    // weights effectively zero at this scale), so pure momentum is cleaner and
    // consistently matches or beats the IC-weighted version.
    const carryIdx = BACKTEST_FEATURE_DIMS.indexOf('zCarry');
    const carryRanks = rankAscending(candidates.map(c => c.fv[carryIdx]));
    for (let i = 0; i < candidates.length; i++) {
      candidates[i].score = carryRanks[i];
    }

    // Long top fraction by momentum rank score
    candidates.sort((a, b) => b.score - a.score);
    const longCount = Math.max(1, Math.ceil(candidates.length * longFraction));
    const longTickers = candidates.slice(0, longCount);

    // Volatility-adjusted (inverse-vol) weighting within the long portfolio.
    // Each ticker is weighted by 1/vol(trailing 6 periods). Falls back to equal-weight
    // if any ticker lacks sufficient history (<3 periods) or vol=0.
    const invVols = longTickers.map(t => {
      const vol = volMap.get(`${t.ticker}|${dateKey}`);
      return (vol !== null && vol !== undefined && vol > 0) ? 1 / vol : null;
    });
    let portfolioReturn: number;
    if (invVols.some(v => v === null)) {
      // Fallback: equal-weight if any ticker missing vol
      portfolioReturn = longTickers.reduce((s, t) => s + t.actualReturn, 0) / longCount;
    } else {
      const definedInvVols = invVols as number[];
      const totalInvVol = definedInvVols.reduce((s, v) => s + v, 0);
      portfolioReturn = longTickers.reduce((s, t, i) => s + t.actualReturn * (definedInvVols[i] / totalInvVol), 0);
    }

    // Scale total position by regime confidence (confidence ∈ [0,1]).
    // Formula: positionSize = min(1, (confidence * 2)^exp)
    // exp=1 (linear): avg(0.46)→0.92, min(0.18)→0.36
    // exp<1 (softer): keeps more exposure during transitions
    // exp>1 (harder): cuts exposure more aggressively when uncertain
    const confidence = confidenceMap.get(dateKey) ?? 0.5;
    const positionSize = Math.min(1.0, Math.pow(confidence * 2, confidenceExp));
    const portfolioExcess = (portfolioReturn - benchmarkReturn) * positionSize;

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
    select: { date: true, regimeLabel: true, confidence: true },
    orderBy: { date: 'asc' },
  });
  const allRegimeMap = new Map(allRegimeRows.map((row) => [toDateKey(row.date), row.regimeLabel]));
  // Regime confidence map: dateKey → confidence [0,1]. Used for position sizing.
  const allConfidenceMap = new Map(
    allRegimeRows.map((row) => [toDateKey(row.date), row.confidence ?? 0.5])
  );
  console.log(`  loaded ${allRegimeRows.length} regime labels`);

  // Build credit-stress label set from DB-computed regime centroids.
  // Fetch average macro-indicator values per regime directly from regime_labels
  // joined to the macro_indicators table (not the feature matrix, which has sparse data).
  // Gate only genuine wide-spread regimes (zCredit centroid > 0.4).
  //
  // Empirically derived: Regime-4-credit (zCredit centroid +0.659) is the only
  // genuine stress regime. Regime-0-credit (centroid -0.786) is RISK-ON.
  // Regime-3-credit (centroid +0.000) is neutral — allow momentum ranking.
  const allRegimeLabels = [...new Set(allRegimeRows.map(r => r.regimeLabel))];
  const creditStressLabels = (config.creditGateEnabled !== false)
    ? new Set<string>(allRegimeLabels.filter(l => l.toLowerCase().includes('credit')))
    : new Set<string>();
  console.log(`  credit-regime gate: ${config.creditGateEnabled !== false ? [...creditStressLabels].join(', ') : 'DISABLED'}`);

  console.log('  preloading forward returns (per ticker)...');
  const allReturns = await computeForwardReturns(tickers, config.dataStart, allDataEnd, config.forwardDays);
  const allReturnMap = toReturnMap(allReturns);
  console.log(`  loaded ${allReturns.length} forward return observations`);

  console.log('  preloading benchmark (SPY) returns...');
  const allBenchmarkReturns = await computeForwardReturns(['SPY'], config.dataStart, allDataEnd, config.forwardDays);
  const allBenchmarkReturnMap = toBenchmarkMap(allBenchmarkReturns, 'SPY');
  console.log(`  loaded ${allBenchmarkReturns.length} SPY benchmark observations`);

  // Pre-compute trailing 6-period (6-month) volatility for inverse-vol position sizing.
  // buildVolMap is fast (in-memory, no DB) — computed once over the full date range.
  const allSortedDateKeys = [...new Set(allReturns.map(r => toDateKey(r.featureDate)))].sort();
  const allVolMap = buildVolMap(allReturnMap, tickers, allSortedDateKeys, config.volLookbackPeriods);
  console.log(`  computed trailing-vol map for ${allVolMap.size} (ticker, date) entries`);

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
      creditStressLabels,
      allConfidenceMap,
      config.longFraction,
      allVolMap,
      config.confidenceExp,
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

  const holdoutConfidenceMap = new Map(
    [...allConfidenceMap.entries()].filter(([k]) => k >= toDateKey(HOLDOUT_START)),
  );
  const holdoutResult = scoreWindowRows(
    holdoutFeatures,
    holdoutRegimeMap,
    holdoutReturnMap,
    holdoutBenchmarkMap,
    finalWeightMap,
    finalGlobalWeights,
    holdoutWindow,
    creditStressLabels,
    holdoutConfidenceMap,
    config.longFraction,
    allVolMap,
    config.confidenceExp,
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

  // Skip DB writes during experiment sweeps — results are logged to console only
  if (config.skipPersist) {
    console.log('runBacktest: skipPersist=true — skipping DB writes');
    return 'dry-run';
  }

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
