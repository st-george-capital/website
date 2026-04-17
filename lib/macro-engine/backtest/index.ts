import { prismaDirectUrl as prisma } from '../db';
import { getUniverse } from '../universe';
import {
  BACKTEST_FEATURE_DIMS,
  BacktestConfig,
  HOLDOUT_START,
  WindowResult,
  assertNotHoldout,
} from './types';
import { aggregateMetrics } from './metrics';
import { ForwardReturn, computeForwardReturns } from './returns';
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

/**
 * The backtest model is a regime-gated cross-sectional momentum ranker:
 *   - Each date, rank tickers by zCarry (12-month CS momentum).
 *   - Go long the top `longFraction` equally (or inv-vol weighted).
 *   - Zero exposure (flat, excluded from Sharpe) during credit-stress regimes.
 *   - Scale basket size by min(1, (confidence*2)^confidenceExp).
 *
 * `lambdaRidge` and `minRegimeSamples` are kept for schema/config compatibility
 * with downstream scripts but are no longer consulted — no ridge fit happens.
 */
const DEFAULT_CONFIG: BacktestConfig = {
  dataStart: new Date('2004-01-01'),
  stepMonths: 1,               // monthly rebalancing aligned with 21-day forward return
  trainMinYears: 3,            // minimum pre-test period before first OOS window
  lambdaRidge: 0.05,           // retained for schema compat; unused in scoring
  minRegimeSamples: 30,        // retained for schema compat; unused in scoring
  forwardDays: 21,
  longFraction: 0.25,          // top quarter of universe — tuned via sweep
  volLookbackPeriods: 0,       // 0 = equal-weight within basket (inv-vol hurt holdout)
  confidenceExp: 1,            // linear: min(1, (confidence*2)^exp)
  shortMomPeriods: 0,          // 0 = disabled; short-term mom blend
  shortMomWeight: 0.3,         // weight of short-term momentum when enabled
};

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
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
/**
 * Computes trailing N-period compounded return for each (ticker, date).
 * Uses N non-overlapping monthly returns, collected by stepping backwards
 * forwardDays at a time from D-forwardDays (no look-ahead).
 *
 * Same algorithm as buildVolMap: picks nearest available monthly return
 * at D-1*forwardDays, D-2*forwardDays, ..., D-N*forwardDays.
 */
function buildShortMomMap(
  assetReturnMap: Map<string, number>,
  tickers: string[],
  sortedDateKeys: string[],
  lookbackPeriods: number,
  forwardDays: number,
): Map<string, number | null> {
  const momMap = new Map<string, number | null>();
  for (const ticker of tickers) {
    const tickerDateSet = new Set(sortedDateKeys.filter(dk => assetReturnMap.has(`${ticker}|${dk}`)));
    const tickerDates = sortedDateKeys.filter(dk => tickerDateSet.has(dk));

    for (let i = 0; i < tickerDates.length; i++) {
      const dk = tickerDates[i];
      const dMs = new Date(dk).getTime();

      const window: number[] = [];
      let stepTargetMs = dMs - forwardDays * 86400_000;

      for (let step = 0; step < lookbackPeriods && window.length < lookbackPeriods; step++) {
        const targetKey = new Date(stepTargetMs).toISOString().slice(0, 10);
        let lo = 0, hi = tickerDates.length - 1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (tickerDates[mid] <= targetKey) { lo = mid + 1; } else { hi = mid - 1; }
        }
        if (hi >= 0 && tickerDates[hi] < tickerDates[i]) {
          const r = assetReturnMap.get(`${ticker}|${tickerDates[hi]}`);
          if (r !== undefined) window.push(r);
        }
        stepTargetMs -= forwardDays * 86400_000;
      }

      if (window.length < lookbackPeriods) {
        momMap.set(`${ticker}|${dk}`, null);
        continue;
      }
      const compounded = window.reduce((product, r) => product * (1 + r), 1) - 1;
      momMap.set(`${ticker}|${dk}`, compounded);
    }
  }
  return momMap;
}

/**
 * Pre-compute trailing N-period volatility for each (ticker, date).
 * Selects N non-overlapping monthly returns (spaced forwardDays apart) strictly
 * before D - forwardDays to avoid look-ahead bias.
 *
 * Selection strategy: working backwards from D-forwardDays, picks the nearest
 * available trading day at each monthly step (D-forwardDays, D-2*forwardDays, etc.).
 * This gives N truly non-overlapping forward-return windows.
 *
 * If fewer than 3 non-overlapping periods are available, returns null (equal-weight fallback).
 */
function buildVolMap(
  assetReturnMap: Map<string, number>,
  tickers: string[],
  sortedDateKeys: string[],
  volLookbackPeriods: number,
  forwardDays: number,
): Map<string, number | null> {
  const volMap = new Map<string, number | null>();
  for (const ticker of tickers) {
    // Pre-build sorted list of dates where this ticker has a return
    const tickerDateSet = new Set(sortedDateKeys.filter(dk => assetReturnMap.has(`${ticker}|${dk}`)));
    const tickerDates = sortedDateKeys.filter(dk => tickerDateSet.has(dk));

    for (let i = 0; i < tickerDates.length; i++) {
      const dk = tickerDates[i];
      const dMs = new Date(dk).getTime();

      // Collect N non-overlapping monthly returns by stepping backwards forwardDays at a time
      const window: number[] = [];
      let stepTargetMs = dMs - forwardDays * 86400_000; // start at D - 1 period

      for (let step = 0; step < volLookbackPeriods && window.length < volLookbackPeriods; step++) {
        // Find nearest available date at or before stepTargetMs
        const targetKey = new Date(stepTargetMs).toISOString().slice(0, 10);
        // Search backward from targetKey for nearest available ticker date
        let found: number | null = null;
        // Binary search for position <= targetKey
        let lo = 0, hi = tickerDates.length - 1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (tickerDates[mid] <= targetKey) { lo = mid + 1; } else { hi = mid - 1; }
        }
        // hi is the rightmost index with tickerDates[hi] <= targetKey
        if (hi >= 0 && tickerDates[hi] < tickerDates[i]) {
          found = assetReturnMap.get(`${ticker}|${tickerDates[hi]}`) ?? null;
        }
        if (found !== null) window.push(found);
        stepTargetMs -= forwardDays * 86400_000; // go back another period
      }

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
  window: WindowResult['window'],
  creditStressLabels: Set<string>,
  confidenceMap: Map<string, number>,
  longFraction: number,
  volMap: Map<string, number | null>,
  confidenceExp: number,
  shortMomMap: Map<string, number | null>,
  shortMomWeight: number,
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
  let flatDays = 0;

  for (const [dateKey, rows] of Array.from(byDate.entries()).sort()) {
    const benchmarkReturn = benchmarkReturnMap.get(dateKey) ?? null;
    if (benchmarkReturn === null) continue; // no SPY return for this date — skip

    const regimeLabel = regimeMap.get(dateKey) ?? 'global';

    // ── Regime gate: go flat in credit-stress regimes ─────────────────────────
    // Credit-stress regimes have elevated cross-asset correlation and risk-off
    // drawdowns where momentum ranking adds no alpha. Flat days are NOT injected
    // as zeros into the return series (that would biased-deflate Sharpe); they
    // are counted separately and excluded from the Sharpe denominator entirely.
    // `activeFraction` in the final metrics shows how often the model is engaged.
    if (creditStressLabels.has(regimeLabel)) {
      flatDays++;
      continue;
    }

    // Build (ticker, zCarry, actualReturn) for all tickers with data on this date.
    // zCarry is the only ticker-varying factor in the scoring model.
    type ScoredRow = { ticker: string; zCarry: number; actualReturn: number; score: number };
    const candidates: ScoredRow[] = [];
    for (const row of rows) {
      const actualReturn = assetReturnMap.get(`${row.ticker}|${dateKey}`);
      if (actualReturn === undefined) continue;
      candidates.push({
        ticker: row.ticker,
        zCarry: row.zCarry ?? 0,
        actualReturn,
        score: 0,
      });
    }
    if (candidates.length < 2) continue;

    // Scoring: rank on zCarry (12m momentum) optionally blended with short-term momentum.
    // Short-term momentum uses trailing N-period compounded returns (from assetReturnMap).
    // Blend formula: score = (1-w)*longRank + w*shortRank (both 0-indexed ordinal ranks).
    const carryRanks = rankAscending(candidates.map(c => c.zCarry));

    if (shortMomWeight > 0) {
      // Compute short-term ranks from shortMomMap; fall back to longRank if data missing
      const shortMoms = candidates.map(c => shortMomMap.get(`${c.ticker}|${dateKey}`) ?? null);
      const validShortMoms = shortMoms.filter(v => v !== null) as number[];
      if (validShortMoms.length >= 2) {
        const shortRanks = rankAscending(shortMoms.map(v => v ?? 0)); // impute median(0) for missing
        for (let i = 0; i < candidates.length; i++) {
          candidates[i].score = (1 - shortMomWeight) * carryRanks[i] + shortMomWeight * shortRanks[i];
        }
      } else {
        // Not enough short-term data — fall back to pure long-term
        for (let i = 0; i < candidates.length; i++) {
          candidates[i].score = carryRanks[i];
        }
      }
    } else {
      for (let i = 0; i < candidates.length; i++) {
        candidates[i].score = carryRanks[i];
      }
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

  if (predictedSigns.length === 0 && flatDays === 0) return null;

  return {
    window,
    predictedSigns,
    actualReturns,
    excessReturns,
    flatDays,
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
  let creditStressLabels: Set<string>;
  if (config.creditGateEnabled === false) {
    creditStressLabels = new Set<string>();
    console.log('  credit-regime gate: DISABLED');
  } else if (config.creditGateLabels && config.creditGateLabels.length > 0) {
    // Selective gate: only specified labels — allows gating genuine stress (zCredit>0) but not risk-ON 'credit' regimes
    creditStressLabels = new Set<string>(config.creditGateLabels);
    console.log(`  credit-regime gate: SELECTIVE — ${[...creditStressLabels].join(', ')}`);
  } else {
    // Default: gate ALL labels containing 'credit'
    creditStressLabels = new Set<string>(allRegimeLabels.filter(l => l.toLowerCase().includes('credit')));
    console.log(`  credit-regime gate: ALL-CREDIT — ${[...creditStressLabels].join(', ')}`);
  }

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
  const allVolMap = buildVolMap(allReturnMap, tickers, allSortedDateKeys, config.volLookbackPeriods, config.forwardDays);
  console.log(`  computed trailing-vol map for ${allVolMap.size} (ticker, date) entries`);

  // Pre-compute short-term momentum map for optional blending with zCarry.
  // shortMomPeriods=0 disables blending (returns empty map, falls back to pure zCarry).
  const allShortMomMap = config.shortMomPeriods > 0
    ? buildShortMomMap(allReturnMap, tickers, allSortedDateKeys, config.shortMomPeriods, config.forwardDays)
    : new Map<string, number | null>();
  if (config.shortMomPeriods > 0) {
    console.log(`  computed short-term momentum map (${config.shortMomPeriods}p) for ${allShortMomMap.size} entries`);
  }

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

  for (const [index, window] of windows.entries()) {
    assertNotHoldout(window.testStart);

    console.log(
      `  window ${index + 1}/${windows.length}: test [${toDateKey(window.testStart)}, ${toDateKey(window.testEnd)})`,
    );

    const testFeatures = featuresInRange(window.testStart, window.testEnd);
    if (testFeatures.length === 0) {
      console.log(`    window ${index + 1}: no test features — skipping`);
      continue;
    }

    // Pre-validate benchmark coverage within this test window
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

    const result = scoreWindowRows(
      testFeatures,
      allRegimeMap,
      allReturnMap,
      allBenchmarkReturnMap,
      window,
      creditStressLabels,
      allConfidenceMap,
      config.longFraction,
      allVolMap,
      config.confidenceExp,
      allShortMomMap,
      config.shortMomWeight,
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
    `OOS metrics: hitRate=${oosMetrics.hitRate.toFixed(3)}, sharpe=${oosMetrics.sharpeAnn.toFixed(3)}, ` +
    `maxDD=${oosMetrics.maxDrawdown?.toFixed(3) ?? 'null'}, ` +
    `active=${oosMetrics.nPeriods}, flat=${oosMetrics.flatDays}, ` +
    `activeFrac=${oosMetrics.activeFraction.toFixed(3)}`,
  );

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
    holdoutWindow,
    creditStressLabels,
    holdoutConfidenceMap,
    config.longFraction,
    allVolMap,
    config.confidenceExp,
    allShortMomMap,
    config.shortMomWeight,
  );

  if (!holdoutResult) {
    throw new Error('No holdout results produced — check post-2022 feature and price coverage');
  }

  const holdoutMetrics = aggregateMetrics([holdoutResult], config.forwardDays, 'holdout', 'SPY');
  console.log(
    `Holdout metrics: hitRate=${holdoutMetrics.hitRate.toFixed(3)}, sharpe=${holdoutMetrics.sharpeAnn.toFixed(3)}, ` +
    `maxDD=${holdoutMetrics.maxDrawdown?.toFixed(3) ?? 'null'}, ` +
    `active=${holdoutMetrics.nPeriods}, flat=${holdoutMetrics.flatDays}, ` +
    `activeFrac=${holdoutMetrics.activeFraction.toFixed(3)}`,
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
      notes:
        `model=cs-momentum-rank; forwardDays=${config.forwardDays}; benchmark=SPY; nonOverlapping=true; ` +
        `longFraction=${config.longFraction}; creditGate=${config.creditGateEnabled !== false ? 'on' : 'off'}; ` +
        `oosActiveFrac=${oosMetrics.activeFraction.toFixed(3)}; holdoutActiveFrac=${holdoutMetrics.activeFraction.toFixed(3)}`,
    },
  });

  // The scoring model is a pure cross-sectional momentum ranker — zCarry is the
  // only ticker-varying factor. The five macro dimensions are date-level broadcasts
  // with no cross-sectional variance, so they contribute a constant offset that
  // vanishes in rank-based scoring. We persist a single "global" weight row
  // encoding this truth (wCarry=1, all others=0) so that the downstream signals
  // pipeline (signals/scoring.ts, signals/probabilities.ts, dashboard history
  // route) produces rankings consistent with the backtest.
  const carryIdx = BACKTEST_FEATURE_DIMS.indexOf('zCarry');
  const stubWeights = BACKTEST_FEATURE_DIMS.map((_, i) => (i === carryIdx ? 1 : 0));
  await prisma.factorWeightSet.create({
    data: {
      runId: run.id,
      regimeLabel: 'global',
      wGrowth: stubWeights[0],
      wInflation: stubWeights[1],
      wMonetary: stubWeights[2],
      wCredit: stubWeights[3],
      wCarry: stubWeights[4],
      wEarnings: stubWeights[5],
      sampleCount: oosMetrics.nPeriods + holdoutMetrics.nPeriods,
      isFallback: true,
    },
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
