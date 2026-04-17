import { prismaDirectUrl as prisma } from '../db';
import { getUniverse } from '../universe';
import {
  BACKTEST_FEATURE_DIMS,
  BacktestConfig,
  HOLDOUT_START,
  MetricsResult,
  WindowResult,
  assertNotHoldout,
} from './types';
import { aggregateMetrics } from './metrics';
import { ForwardReturn, computeForwardReturns } from './returns';
import {
  greedyCorrSelect,
  pairwiseCorrelation,
  portfolioVolFromReturns,
  volTargetScale,
} from './risk';
import { generateWindows } from './windows';

export type FeatureSliceRow = {
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
 * Per-date scoring record emitted by `scoreWindowRows` when an optional
 * `perDateRecords` sink array is passed. Populated for BOTH active and
 * credit-gated (flat) dates so the full daily history can be reconstructed
 * for the live-equity replay / Today's Trades UI (Chunk 6).
 */
export interface ScoredDayRecord {
  date:               string;              // YYYY-MM-DD
  regime:             string;
  regimeConfidence:   number;
  gated:              boolean;              // true when credit-stress gate triggered
  basket:             Array<{ ticker: string; weight: number; score: number; actualReturn: number }>;
  benchmarkReturn:    number | null;        // SPY fwd return; null when gated
  portfolioReturn:    number | null;        // weighted basket fwd return; null when gated
  grossExcess:        number | null;        // (portfolio - SPY) * finalSize; null when gated
  netExcess:          number | null;        // gross - cost
  finalSize:          number | null;        // regime confidence × vol-target scale
  turnover:           number | null;        // L1 weight change vs prior active day; null when gated
  cost:               number | null;        // turnover * tcBps / 10_000; null when gated
}

/**
 * Everything the backtest needs after DB reads complete. Produced once by
 * `preloadBacktestData` and reusable across a sweep of configs — the only
 * per-config derivations (volMap / shortMomMap / returnMatrixMap) live inside
 * `runBacktest` because they depend on lookback parameters that may vary.
 */
export interface PreloadedBacktestData {
  /** Config that produced this preload, with `dataStart` auto-corrected to DB coverage. */
  config: BacktestConfig;
  tickers: string[];
  allFeatures: FeatureSliceRow[];
  allRegimeMap: Map<string, string>;
  allConfidenceMap: Map<string, number>;
  allRegimeLabels: string[];
  allReturnMap: Map<string, number>;
  allBenchmarkReturnMap: Map<string, number>;
  allSortedDateKeys: string[];
  allDataEnd: Date;
}

/** Returned by `runBacktest`. `runId` is null when `config.skipPersist` is true. */
export interface BacktestRunResult {
  runId: string | null;
  oos: MetricsResult;
  holdout: MetricsResult;
  windowCount: number;
}

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
  portfolioVolTarget: 0,       // 0 = disabled; tuned via Chunk 2 sweep
  portfolioVolLookbackPeriods: 12,
  corrPenaltyLambda: 0,        // 0 = disabled; tuned via Chunk 3 sweep
  corrLookbackPeriods: 12,
  corrOversampleMult: 2,
  transactionCostBps: 5,       // one-way 5 bps per unit of traded notional (Chunk 5)
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

/**
 * Pre-compute the trailing N-period return vector for each (ticker, date),
 * sampled on a SHARED calendar grid so that vectors are aligned across tickers
 * for a proper pairwise covariance.
 *
 * For each scoring date D:
 *   grid[k] = nearest date in `sortedDateKeys` at or before D - k·forwardDays
 *             (for k = 1..N), with strict `< D` to prevent look-ahead.
 *   vec[k]  = assetReturnMap.get(ticker|grid[k])
 *
 * Returns null for a given (ticker, date) if any grid slot is missing or the
 * ticker lacks a return at that slot. This lets the scoring loop fail-open to
 * scale=1 when vol can't be estimated.
 */
function buildReturnMatrixMap(
  assetReturnMap: Map<string, number>,
  tickers: string[],
  sortedDateKeys: string[],
  lookbackPeriods: number,
  forwardDays: number,
): Map<string, number[] | null> {
  const out = new Map<string, number[] | null>();
  if (lookbackPeriods <= 0) return out;

  for (let i = 0; i < sortedDateKeys.length; i++) {
    const dk = sortedDateKeys[i];
    const dMs = new Date(dk).getTime();

    // Resolve the N shared lookback date keys once per scoring date
    const lookbackKeys: (string | null)[] = [];
    let stepTargetMs = dMs - forwardDays * 86400_000;
    for (let step = 0; step < lookbackPeriods; step++) {
      const targetKey = new Date(stepTargetMs).toISOString().slice(0, 10);
      let lo = 0, hi = sortedDateKeys.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (sortedDateKeys[mid] <= targetKey) { lo = mid + 1; } else { hi = mid - 1; }
      }
      lookbackKeys.push(hi >= 0 && sortedDateKeys[hi] < dk ? sortedDateKeys[hi] : null);
      stepTargetMs -= forwardDays * 86400_000;
    }

    for (const ticker of tickers) {
      let vec: number[] | null = [];
      for (const k of lookbackKeys) {
        if (!k) { vec = null; break; }
        const r = assetReturnMap.get(`${ticker}|${k}`);
        if (r === undefined) { vec = null; break; }
        vec.push(r);
      }
      out.set(`${ticker}|${dk}`, vec);
    }
  }
  return out;
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
  returnMatrixMap: Map<string, number[] | null>,
  portfolioVolTarget: number,
  periodsPerYear: number,
  corrPenaltyLambda: number,
  corrLookbackPeriods: number,
  corrOversampleMult: number,
  transactionCostBps: number,
  perDateRecords?: ScoredDayRecord[],
  // Chunk 11: per-regime override lookup. undefined ⇒ disabled, behaves
  // identically to the pre-Chunk-11 engine.
  perRegimeOverrides?: Record<string, { longFraction?: number; confidenceExp?: number }>,
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
  const grossReturns:  number[] = [];
  const turnovers:     number[] = [];
  const costs:         number[] = [];
  let flatDays = 0;

  // ── Transaction cost accounting (Chunk 5) ────────────────────────────────
  // Track the previous active-day's per-ticker position (size * weight), in
  // NAV units. L1 change between consecutive active days captures the total
  // rebalance trade — buys and sells both count. Positions persist across
  // credit-gated flat days: the model is assumed to hold its basket through
  // gaps (no trading implied by transitioning in/out of flat), which is the
  // cheapest and cleanest accounting model and avoids double-charging
  // phantom exit/re-enter cycles on gated streaks.
  const tcDecimal = Math.max(0, transactionCostBps) / 10_000;
  let prevPositions: Map<string, number> = new Map();

  for (const [dateKey, rows] of Array.from(byDate.entries()).sort()) {
    const benchmarkReturn = benchmarkReturnMap.get(dateKey) ?? null;
    if (benchmarkReturn === null) continue; // no SPY return for this date — skip

    const regimeLabel = regimeMap.get(dateKey) ?? 'global';

    // ── Chunk 11: regime-conditional overrides ─────────────────────────────
    // Swap `longFraction` and `confidenceExp` for their per-regime pick when
    // the current regime has one configured. Falls through to the base-config
    // value otherwise — so a missing override behaves exactly like the
    // pre-Chunk-11 engine, preserving backwards compatibility.
    const regimeOverride = perRegimeOverrides?.[regimeLabel];
    const effLongFraction  = regimeOverride?.longFraction  ?? longFraction;
    const effConfidenceExp = regimeOverride?.confidenceExp ?? confidenceExp;

    // ── Regime gate: go flat in credit-stress regimes ─────────────────────────
    // Credit-stress regimes have elevated cross-asset correlation and risk-off
    // drawdowns where momentum ranking adds no alpha. Flat days are NOT injected
    // as zeros into the return series (that would biased-deflate Sharpe); they
    // are counted separately and excluded from the Sharpe denominator entirely.
    // `activeFraction` in the final metrics shows how often the model is engaged.
    if (creditStressLabels.has(regimeLabel)) {
      flatDays++;
      if (perDateRecords) {
        perDateRecords.push({
          date:             dateKey,
          regime:           regimeLabel,
          regimeConfidence: confidenceMap.get(dateKey) ?? 0.5,
          gated:            true,
          basket:           [],
          benchmarkReturn:  benchmarkReturn,
          portfolioReturn:  null,
          grossExcess:      null,
          netExcess:        null,
          finalSize:        null,
          turnover:         null,
          cost:             null,
        });
      }
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
    const longCount = Math.max(1, Math.ceil(candidates.length * effLongFraction));
    let longTickers = candidates.slice(0, longCount);

    // ── Correlation-aware selection (Chunk 3) ─────────────────────────────────
    // When enabled, replace the naive top-k with a greedy selection that trades
    // rank loss for diversification. Look-ahead-safe: correlations are computed
    // from the same non-overlapping trailing return matrix used by vol-targeting.
    if (corrPenaltyLambda > 0 && longCount >= 2) {
      const poolSize = Math.min(
        candidates.length,
        Math.max(longCount, Math.ceil(longCount * corrOversampleMult)),
      );
      if (poolSize > longCount) {
        const pool = candidates.slice(0, poolSize);
        const lookback = corrLookbackPeriods;
        const returnVecs: (number[] | null)[] = pool.map((t) => {
          const full = returnMatrixMap.get(`${t.ticker}|${dateKey}`);
          if (!full || full.length < lookback) return null;
          return full.slice(0, lookback);
        });
        if (returnVecs.every((v) => v !== null)) {
          // Build N×K matrix (rows = lookback periods, cols = pool tickers)
          const matrix: number[][] = [];
          const K = pool.length;
          for (let t = 0; t < lookback; t++) {
            const row = new Array(K);
            for (let k = 0; k < K; k++) row[k] = (returnVecs[k] as number[])[t];
            matrix.push(row);
          }
          const corr = pairwiseCorrelation(matrix);
          const poolScores = pool.map((c) => c.score);
          const selected = greedyCorrSelect(poolScores, corr, longCount, corrPenaltyLambda);
          longTickers = selected.map((i) => pool[i]);
        }
        // else: fall back to naive top-k (longTickers already set)
      }
    }

    // Volatility-adjusted (inverse-vol) weighting within the long portfolio.
    // Each ticker is weighted by 1/vol(trailing 6 periods). Falls back to equal-weight
    // if any ticker lacks sufficient history (<3 periods) or vol=0.
    const invVols = longTickers.map(t => {
      const vol = volMap.get(`${t.ticker}|${dateKey}`);
      return (vol !== null && vol !== undefined && vol > 0) ? 1 / vol : null;
    });
    let portfolioReturn: number;
    let basketWeights: number[];
    if (invVols.some(v => v === null)) {
      // Fallback: equal-weight if any ticker missing vol
      portfolioReturn = longTickers.reduce((s, t) => s + t.actualReturn, 0) / longCount;
      basketWeights = new Array(longCount).fill(1 / longCount);
    } else {
      const definedInvVols = invVols as number[];
      const totalInvVol = definedInvVols.reduce((s, v) => s + v, 0);
      basketWeights = definedInvVols.map(v => v / totalInvVol);
      portfolioReturn = longTickers.reduce((s, t, i) => s + t.actualReturn * basketWeights[i], 0);
    }

    // Scale total position by regime confidence (confidence ∈ [0,1]).
    // Formula: positionSize = min(1, (confidence * 2)^exp)
    // exp=1 (linear): avg(0.46)→0.92, min(0.18)→0.36
    // exp<1 (softer): keeps more exposure during transitions
    // exp>1 (harder): cuts exposure more aggressively when uncertain
    const confidence = confidenceMap.get(dateKey) ?? 0.5;
    const positionSize = Math.min(1.0, Math.pow(confidence * 2, effConfidenceExp));

    // ── Portfolio vol-targeting overlay (Chunk 2) ─────────────────────────────
    // Estimate ex-ante annualized vol of the long basket from aligned trailing
    // returns + the actual basketWeights, then scale by min(1, target/exAnte).
    // If insufficient data OR target disabled, fall open to scale=1.
    let volScale = 1;
    if (portfolioVolTarget > 0) {
      const matrix: number[][] = [];
      let ok = true;
      // returnMatrixMap stores per-ticker trailing vectors aligned on a shared grid.
      // We need row t = [r_1(t), r_2(t), ..., r_K(t)] where t indexes lookback steps.
      const perTickerVecs: number[][] = [];
      let N = -1;
      for (const t of longTickers) {
        const vec = returnMatrixMap.get(`${t.ticker}|${dateKey}`);
        if (!vec) { ok = false; break; }
        if (N === -1) N = vec.length;
        if (vec.length !== N) { ok = false; break; }
        perTickerVecs.push(vec);
      }
      if (ok && N > 0) {
        for (let t = 0; t < N; t++) {
          const row = new Array(longCount);
          for (let k = 0; k < longCount; k++) row[k] = perTickerVecs[k][t];
          matrix.push(row);
        }
        const exAnteVol = portfolioVolFromReturns(matrix, basketWeights, periodsPerYear);
        volScale = volTargetScale(exAnteVol, portfolioVolTarget);
      }
    }

    const finalSize = positionSize * volScale;
    const grossExcess = (portfolioReturn - benchmarkReturn) * finalSize;

    // ── Turnover + cost ───────────────────────────────────────────────────
    // newPositions maps ticker → finalSize * basketWeight (NAV-scaled).
    // L1 = Σ |newPos - prevPos| over the union of tickers.
    const newPositions = new Map<string, number>();
    for (let i = 0; i < longTickers.length; i++) {
      newPositions.set(longTickers[i].ticker, finalSize * basketWeights[i]);
    }
    let l1 = 0;
    const union = new Set<string>([...prevPositions.keys(), ...newPositions.keys()]);
    for (const ticker of union) {
      const prev = prevPositions.get(ticker) ?? 0;
      const curr = newPositions.get(ticker) ?? 0;
      l1 += Math.abs(curr - prev);
    }
    const periodCost = l1 * tcDecimal;
    const netExcess  = grossExcess - periodCost;
    prevPositions = newPositions;

    predictedSigns.push(1);
    actualReturns.push(netExcess);
    excessReturns.push(netExcess);
    grossReturns.push(grossExcess);
    turnovers.push(l1);
    costs.push(periodCost);

    if (perDateRecords) {
      perDateRecords.push({
        date:             dateKey,
        regime:           regimeLabel,
        regimeConfidence: confidence,
        gated:            false,
        basket:           longTickers.map((t, i) => ({
          ticker:       t.ticker,
          weight:       basketWeights[i],
          score:        t.score,
          actualReturn: t.actualReturn,
        })),
        benchmarkReturn: benchmarkReturn,
        portfolioReturn,
        grossExcess,
        netExcess,
        finalSize,
        turnover: l1,
        cost:     periodCost,
      });
    }
  }

  if (predictedSigns.length === 0 && flatDays === 0) return null;

  return {
    window,
    predictedSigns,
    actualReturns,
    excessReturns,
    grossReturns,
    turnovers,
    costs,
    flatDays,
  };
}

/**
 * Preloads everything the backtest needs from Postgres: feature matrix, regime
 * labels + confidence, per-ticker forward returns, and SPY benchmark returns.
 * Produces a reusable bundle so a parameter sweep (`runSweep`) can hit the DB
 * exactly once. Auto-extends / auto-corrects `dataStart` to match DB coverage.
 */
export async function preloadBacktestData(
  inputConfig: BacktestConfig = DEFAULT_CONFIG,
): Promise<PreloadedBacktestData> {
  let config = { ...inputConfig };
  console.log('preloadBacktestData: loading DB-backed datasets');
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

  const universe = getUniverse();
  const tickers = [...new Set(universe.map((entry) => entry.ticker))];
  if (tickers.length === 0) {
    throw new Error('Universe is empty — cannot run backtest');
  }
  console.log(`  universe: ${tickers.length} tickers`);

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
  const allConfidenceMap = new Map(
    allRegimeRows.map((row) => [toDateKey(row.date), row.confidence ?? 0.5])
  );
  const allRegimeLabels = [...new Set(allRegimeRows.map(r => r.regimeLabel))];
  console.log(`  loaded ${allRegimeRows.length} regime labels`);

  console.log('  preloading forward returns (per ticker)...');
  const allReturns = await computeForwardReturns(tickers, config.dataStart, allDataEnd, config.forwardDays);
  const allReturnMap = toReturnMap(allReturns);
  console.log(`  loaded ${allReturns.length} forward return observations`);

  console.log('  preloading benchmark (SPY) returns...');
  const allBenchmarkReturns = await computeForwardReturns(['SPY'], config.dataStart, allDataEnd, config.forwardDays);
  const allBenchmarkReturnMap = toBenchmarkMap(allBenchmarkReturns, 'SPY');
  console.log(`  loaded ${allBenchmarkReturns.length} SPY benchmark observations`);

  const allSortedDateKeys = [...new Set(allReturns.map(r => toDateKey(r.featureDate)))].sort();

  return {
    config,
    tickers,
    allFeatures,
    allRegimeMap,
    allConfidenceMap,
    allRegimeLabels,
    allReturnMap,
    allBenchmarkReturnMap,
    allSortedDateKeys,
    allDataEnd,
  };
}

function logMetricsLine(label: string, m: ReturnType<typeof aggregateMetrics>): void {
  console.log(
    `${label} metrics: hitRate=${m.hitRate.toFixed(3)}, ` +
    `sharpeNet=${m.sharpeAnn.toFixed(3)}, sharpeGross=${m.sharpeAnnGross.toFixed(3)}, ` +
    `maxDD=${m.maxDrawdown?.toFixed(3) ?? 'null'}, ` +
    `avgTurnover=${m.avgTurnover.toFixed(3)}, ` +
    `costDrag=${m.annualizedCostBps.toFixed(1)}bps/yr, ` +
    `active=${m.nPeriods}, flat=${m.flatDays}, activeFrac=${m.activeFraction.toFixed(3)}`,
  );
}

/**
 * Resolve the credit-stress label set from the preloaded regime labels and the
 * config's gate toggles. Pulled out so sweeps that vary the credit gate don't
 * have to re-derive the set inline.
 */
function resolveCreditGate(
  config: BacktestConfig,
  regimeLabels: string[],
): Set<string> {
  if (config.creditGateEnabled === false) {
    console.log('  credit-regime gate: DISABLED');
    return new Set<string>();
  }
  if (config.creditGateLabels && config.creditGateLabels.length > 0) {
    const labels = new Set<string>(config.creditGateLabels);
    console.log(`  credit-regime gate: SELECTIVE — ${[...labels].join(', ')}`);
    return labels;
  }
  const labels = new Set<string>(regimeLabels.filter(l => l.toLowerCase().includes('credit')));
  console.log(`  credit-regime gate: ALL-CREDIT — ${[...labels].join(', ')}`);
  return labels;
}

export async function runBacktest(
  config: BacktestConfig = DEFAULT_CONFIG,
  opts: { preloaded?: PreloadedBacktestData } = {},
): Promise<BacktestRunResult> {
  console.log('runBacktest: starting walk-forward backtest');

  // ── Preload (or reuse shared preload from a sweep) ───────────────────────
  const preloaded: PreloadedBacktestData = opts.preloaded ?? (await preloadBacktestData(config));
  // If the caller passed a preload, its auto-corrected dataStart supersedes theirs.
  const effectiveConfig: BacktestConfig = opts.preloaded
    ? { ...config, dataStart: preloaded.config.dataStart }
    : preloaded.config;
  config = effectiveConfig;

  const {
    tickers,
    allFeatures,
    allRegimeMap,
    allConfidenceMap,
    allRegimeLabels,
    allReturnMap,
    allBenchmarkReturnMap,
    allSortedDateKeys,
    allDataEnd,
  } = preloaded;

  console.log(`  dataStart=${toDateKey(config.dataStart)}`);
  console.log(`  stepMonths=${config.stepMonths}, trainMinYears=${config.trainMinYears}`);

  const windows = generateWindows(config);
  if (windows.length === 0) {
    throw new Error('No walk-forward windows generated — check dataStart and trainMinYears');
  }
  console.log(`  generated ${windows.length} walk-forward windows`);
  console.log(`  universe: ${tickers.length} tickers (from preload)`);

  const creditStressLabels = resolveCreditGate(config, allRegimeLabels);
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

  // Pre-compute aligned trailing-return matrix. Shared by vol-targeting (Chunk 2)
  // and correlation-aware selection (Chunk 3). Built once with the larger of the
  // two lookback requirements; consumers slice what they need. Skipped entirely
  // when both overlays are disabled, keeping baseline runs as fast as before.
  const portfolioVolTarget     = config.portfolioVolTarget ?? 0;
  const portfolioVolLookback   = config.portfolioVolLookbackPeriods ?? 12;
  const corrPenaltyLambda      = config.corrPenaltyLambda ?? 0;
  const corrLookbackPeriods    = config.corrLookbackPeriods ?? 12;
  const corrOversampleMult     = config.corrOversampleMult ?? 2;
  const transactionCostBps     = config.transactionCostBps ?? 0;
  const retMatrixEnabled       = portfolioVolTarget > 0 || corrPenaltyLambda > 0;
  const retMatrixLookback      = Math.max(
    portfolioVolTarget > 0 ? portfolioVolLookback : 0,
    corrPenaltyLambda > 0 ? corrLookbackPeriods : 0,
  );
  const allReturnMatrixMap = retMatrixEnabled
    ? buildReturnMatrixMap(allReturnMap, tickers, allSortedDateKeys, retMatrixLookback, config.forwardDays)
    : new Map<string, number[] | null>();
  if (retMatrixEnabled) {
    console.log(
      `  computed return-matrix map (${retMatrixLookback}p) for ${allReturnMatrixMap.size} entries ` +
        `[volTarget=${portfolioVolTarget.toFixed(2)}, corrLambda=${corrPenaltyLambda.toFixed(2)}, ` +
        `corrOversample=${corrOversampleMult}]`,
    );
  }
  if (transactionCostBps > 0) {
    console.log(`  transaction costs: ${transactionCostBps} bps one-way per L1 unit`);
  }
  const periodsPerYear = 252 / config.forwardDays;

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
      allReturnMatrixMap,
      portfolioVolTarget,
      periodsPerYear,
      corrPenaltyLambda,
      corrLookbackPeriods,
      corrOversampleMult,
      transactionCostBps,
      undefined,
      config.perRegimeOverrides,
    );

    if (result) {
      windowResults.push(result);
    }
  }

  if (windowResults.length === 0) {
    throw new Error('No window results produced — check feature, price, and regime coverage');
  }

  const oosMetrics = aggregateMetrics(windowResults, config.forwardDays, 'oos', 'SPY');
  logMetricsLine('OOS', oosMetrics);

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
    allReturnMatrixMap,
    portfolioVolTarget,
    periodsPerYear,
    corrPenaltyLambda,
    corrLookbackPeriods,
    corrOversampleMult,
    transactionCostBps,
    undefined,
    config.perRegimeOverrides,
  );

  if (!holdoutResult) {
    throw new Error('No holdout results produced — check post-2022 feature and price coverage');
  }

  const holdoutMetrics = aggregateMetrics([holdoutResult], config.forwardDays, 'holdout', 'SPY');
  logMetricsLine('Holdout', holdoutMetrics);

  // Skip DB writes during experiment sweeps — results are logged to console only
  if (config.skipPersist) {
    console.log('runBacktest: skipPersist=true — skipping DB writes');
    return {
      runId: null,
      oos: oosMetrics,
      holdout: holdoutMetrics,
      windowCount: windowResults.length,
    };
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
        `oosActiveFrac=${oosMetrics.activeFraction.toFixed(3)}; holdoutActiveFrac=${holdoutMetrics.activeFraction.toFixed(3)}; ` +
        `tcBps=${transactionCostBps}; ` +
        `oosSharpeGross=${oosMetrics.sharpeAnnGross.toFixed(3)}; oosSharpeNet=${oosMetrics.sharpeAnn.toFixed(3)}; ` +
        `oosAvgTurnover=${oosMetrics.avgTurnover.toFixed(3)}; oosCostDragBps=${oosMetrics.annualizedCostBps.toFixed(1)}; ` +
        `holdoutSharpeGross=${holdoutMetrics.sharpeAnnGross.toFixed(3)}; holdoutSharpeNet=${holdoutMetrics.sharpeAnn.toFixed(3)}; ` +
        `holdoutAvgTurnover=${holdoutMetrics.avgTurnover.toFixed(3)}; holdoutCostDragBps=${holdoutMetrics.annualizedCostBps.toFixed(1)}`,
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
  return {
    runId: run.id,
    oos: oosMetrics,
    holdout: holdoutMetrics,
    windowCount: windowResults.length,
  };
}

// ─── Live-equity holdout replay (Chunk 6) ───────────────────────────────────

export interface ReplayHoldoutResult {
  points:     ScoredDayRecord[];
  metrics:    MetricsResult;
  config: {
    longFraction:       number;
    transactionCostBps: number;
    creditGate:         'on' | 'off' | 'selective';
    forwardDays:        number;
  };
  dataStart:   string;
  holdoutStart: string;
  asOfDate:    string;  // latest date present in the replay (last point)
}

/**
 * Scores the holdout window day-by-day using the live backtest config and
 * returns per-date records (basket, weights, returns, cost) alongside the
 * honest holdout metrics. Drives the dashboard's live-equity chart and the
 * "Today's Trades" card. Accepts an optional shared preload so the
 * dashboard API can cache the expensive DB reads across requests.
 */
export async function replayHoldout(
  config:   BacktestConfig = DEFAULT_CONFIG,
  opts:     { preloaded?: PreloadedBacktestData } = {},
): Promise<ReplayHoldoutResult> {
  const preloaded = opts.preloaded ?? (await preloadBacktestData(config));
  const effective: BacktestConfig = opts.preloaded
    ? { ...config, dataStart: preloaded.config.dataStart }
    : preloaded.config;

  const {
    tickers,
    allRegimeMap,
    allConfidenceMap,
    allRegimeLabels,
    allReturnMap,
    allBenchmarkReturnMap,
    allSortedDateKeys,
    allDataEnd,
  } = preloaded;

  const creditStressLabels = resolveCreditGate(effective, allRegimeLabels);

  // Derived lookback maps (same as runBacktest but scoped to full data set —
  // the holdout slice needs trailing lookbacks to extend before 2022-01-01).
  const allVolMap = buildVolMap(allReturnMap, tickers, allSortedDateKeys, effective.volLookbackPeriods, effective.forwardDays);
  const allShortMomMap = effective.shortMomPeriods > 0
    ? buildShortMomMap(allReturnMap, tickers, allSortedDateKeys, effective.shortMomPeriods, effective.forwardDays)
    : new Map<string, number | null>();

  const portfolioVolTarget     = effective.portfolioVolTarget ?? 0;
  const portfolioVolLookback   = effective.portfolioVolLookbackPeriods ?? 12;
  const corrPenaltyLambda      = effective.corrPenaltyLambda ?? 0;
  const corrLookbackPeriods    = effective.corrLookbackPeriods ?? 12;
  const corrOversampleMult     = effective.corrOversampleMult ?? 2;
  const transactionCostBps     = effective.transactionCostBps ?? 0;
  const retMatrixEnabled       = portfolioVolTarget > 0 || corrPenaltyLambda > 0;
  const retMatrixLookback      = Math.max(
    portfolioVolTarget > 0 ? portfolioVolLookback : 0,
    corrPenaltyLambda > 0 ? corrLookbackPeriods : 0,
  );
  const allReturnMatrixMap = retMatrixEnabled
    ? buildReturnMatrixMap(allReturnMap, tickers, allSortedDateKeys, retMatrixLookback, effective.forwardDays)
    : new Map<string, number[] | null>();
  const periodsPerYear = 252 / effective.forwardDays;

  const holdoutEnd = allDataEnd;
  const holdoutKey = toDateKey(HOLDOUT_START);
  const holdoutFeatures = preloaded.allFeatures.filter((row) => {
    const k = toDateKey(row.featureDate);
    return k >= holdoutKey && k < toDateKey(holdoutEnd);
  });
  const holdoutRegimeMap   = new Map([...allRegimeMap.entries()].filter(([k]) => k >= holdoutKey));
  const holdoutReturnMap   = new Map([...allReturnMap.entries()].filter(([k]) => k.split('|')[1] >= holdoutKey));
  const holdoutBenchMap    = new Map([...allBenchmarkReturnMap.entries()].filter(([k]) => k >= holdoutKey));
  const holdoutConfMap     = new Map([...allConfidenceMap.entries()].filter(([k]) => k >= holdoutKey));

  const holdoutWindow = {
    trainStart: HOLDOUT_START,
    trainEnd:   holdoutEnd,
    testStart:  HOLDOUT_START,
    testEnd:    holdoutEnd,
  };

  const perDateRecords: ScoredDayRecord[] = [];
  const holdoutResult = scoreWindowRows(
    holdoutFeatures,
    holdoutRegimeMap,
    holdoutReturnMap,
    holdoutBenchMap,
    holdoutWindow,
    creditStressLabels,
    holdoutConfMap,
    effective.longFraction,
    allVolMap,
    effective.confidenceExp,
    allShortMomMap,
    effective.shortMomWeight,
    allReturnMatrixMap,
    portfolioVolTarget,
    periodsPerYear,
    corrPenaltyLambda,
    corrLookbackPeriods,
    corrOversampleMult,
    transactionCostBps,
    perDateRecords,
    effective.perRegimeOverrides,
  );

  if (!holdoutResult) {
    throw new Error('replayHoldout: no holdout points produced — check post-2022 coverage');
  }

  const metrics = aggregateMetrics([holdoutResult], effective.forwardDays, 'holdout', 'SPY');

  const lastDate = perDateRecords.length > 0
    ? perDateRecords[perDateRecords.length - 1].date
    : toDateKey(HOLDOUT_START);

  const creditGateMode: 'on' | 'off' | 'selective' =
    effective.creditGateEnabled === false
      ? 'off'
      : (effective.creditGateLabels && effective.creditGateLabels.length > 0 ? 'selective' : 'on');

  return {
    points:  perDateRecords,
    metrics,
    config: {
      longFraction:       effective.longFraction,
      transactionCostBps: transactionCostBps,
      creditGate:         creditGateMode,
      forwardDays:        effective.forwardDays,
    },
    dataStart:    toDateKey(effective.dataStart),
    holdoutStart: holdoutKey,
    asOfDate:     lastDate,
  };
}

// ─── Sweep harness ──────────────────────────────────────────────────────────

/**
 * A labeled configuration override to run through the backtest engine.
 * The `overrides` are merged on top of the base config; `skipPersist` is
 * always forced true for sweep runs (no DB writes, logs + returned metrics
 * are the source of truth).
 */
export interface SweepVariant {
  label:     string;
  overrides: Partial<BacktestConfig>;
}

export interface SweepVariantResult {
  label:   string;
  oos:     MetricsResult;
  holdout: MetricsResult;
}

/**
 * Runs a list of labeled config variants against a single shared DB preload
 * and prints a compact summary table at the end. Cuts sweep runtime roughly
 * N× for N variants versus calling `runBacktest` in a loop, since the DB
 * reads (feature matrix + regimes + per-ticker returns) happen once.
 *
 * Derived tables that depend on per-config lookbacks — `volMap`, `shortMomMap`,
 * `returnMatrixMap` — are STILL recomputed inside each `runBacktest` call.
 * That's intentional: it keeps sweeps over `volLookbackPeriods`,
 * `shortMomPeriods`, `portfolioVolLookbackPeriods`, `corrLookbackPeriods`, or
 * `forwardDays` correct by construction. Those in-memory recomputes are fast
 * relative to the DB cost.
 */
export async function runSweep(
  variants: SweepVariant[],
  baseConfig: BacktestConfig = DEFAULT_CONFIG,
): Promise<SweepVariantResult[]> {
  if (variants.length === 0) {
    console.log('runSweep: no variants provided — nothing to run');
    return [];
  }

  console.log(`\nrunSweep: ${variants.length} variant(s), shared preload`);
  const preloaded = await preloadBacktestData(baseConfig);

  const results: SweepVariantResult[] = [];
  for (const variant of variants) {
    console.log(`\n--- ${variant.label} ---`);
    try {
      const merged: BacktestConfig = { ...baseConfig, ...variant.overrides, skipPersist: true };
      const res = await runBacktest(merged, { preloaded });
      results.push({ label: variant.label, oos: res.oos, holdout: res.holdout });
    } catch (e) {
      console.error(`FAILED (${variant.label}): ${e instanceof Error ? e.message : e}`);
    }
  }

  printSweepTable(results);
  return results;
}

function printSweepTable(results: SweepVariantResult[]): void {
  if (results.length === 0) return;
  const labelWidth = Math.max(5, ...results.map(r => r.label.length));
  const fmt    = (n: number) => n.toFixed(3);
  const fmt1   = (n: number) => n.toFixed(1);
  const fmtNull = (n: number | null) => (n === null ? '   —  ' : n.toFixed(3));

  const hdr =
    `${'label'.padEnd(labelWidth)} | ` +
    'OOS Net  OOS Gr   OOS HR  OOS MDD  OOS TO  OOS $bps | ' +
    'Hold Net Hold Gr  Hold HR Hold MDD Hold TO Hold $bps';
  const sep = '-'.repeat(hdr.length);
  console.log(`\n=== sweep summary ===`);
  console.log(hdr);
  console.log(sep);
  for (const r of results) {
    console.log(
      `${r.label.padEnd(labelWidth)} | ` +
        `${fmt(r.oos.sharpeAnn)}    ${fmt(r.oos.sharpeAnnGross)}    ${fmt(r.oos.hitRate)}   ${fmtNull(r.oos.maxDrawdown)}   ${fmt(r.oos.avgTurnover)}   ${fmt1(r.oos.annualizedCostBps).padStart(6)} | ` +
        `${fmt(r.holdout.sharpeAnn)}    ${fmt(r.holdout.sharpeAnnGross)}    ${fmt(r.holdout.hitRate)}   ${fmtNull(r.holdout.maxDrawdown)}   ${fmt(r.holdout.avgTurnover)}   ${fmt1(r.holdout.annualizedCostBps).padStart(6)}`,
    );
  }
  console.log(sep);
}

// ─── Per-regime override loader (Chunk 11) ──────────────────────────────────

/**
 * Loads the canonical per-regime override map emitted by
 * `scripts/macro-engine/sweep-per-regime.ts` into the shape expected by
 * `BacktestConfig.perRegimeOverrides`. Returns `undefined` (i.e. "no
 * overrides") if the file is missing — the engine then behaves identically
 * to the pre-Chunk-11 path.
 *
 * `path` defaults to the canonical repo location. Pass an absolute path
 * (or a different relative-to-cwd path) to use an alternative picks file
 * for experimentation or A/B testing.
 */
export async function loadPerRegimeOverrides(
  filePath = 'config/macro-engine/per-regime-overrides.json',
): Promise<BacktestConfig['perRegimeOverrides'] | undefined> {
  const fs   = await import('node:fs/promises');
  const path = await import('node:path');
  const abs  = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  try {
    const raw = await fs.readFile(abs, 'utf8');
    const parsed = JSON.parse(raw) as {
      perRegime?: Record<string, { overrides?: { longFraction?: number; confidenceExp?: number } }>;
    };
    if (!parsed.perRegime) return undefined;
    const out: NonNullable<BacktestConfig['perRegimeOverrides']> = {};
    for (const [regime, entry] of Object.entries(parsed.perRegime)) {
      const o = entry.overrides ?? {};
      const pick: { longFraction?: number; confidenceExp?: number } = {};
      if (typeof o.longFraction  === 'number') pick.longFraction  = o.longFraction;
      if (typeof o.confidenceExp === 'number') pick.confidenceExp = o.confidenceExp;
      if (Object.keys(pick).length > 0) out[regime] = pick;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    return undefined;
  }
}

// ─── Per-regime sweep harness ───────────────────────────────────────────────

/**
 * Per-regime performance of one variant on the holdout window. Values are
 * conditional on being in `regime` on an ACTIVE day (gated days excluded
 * from returns stats).
 *
 * `sharpeNet` is null when `nActive < 4` — avoids reporting noisy Sharpes
 * on thin-sample regimes (consistent with `buildRegimeAttribution` in the
 * /history API).
 */
export interface PerRegimeMetric {
  regime:         string;
  nActive:        number;
  nGated:         number;
  meanExcessNet:  number;
  sharpeNet:      number | null;
  hitRate:        number | null;
  cumReturnNet:   number;      // equity multiple over run (1 = flat)
  avgTurnover:    number;
}

/** One variant's result in a per-regime sweep. */
export interface PerRegimeVariantResult {
  label:       string;
  overrides:   Partial<BacktestConfig>;
  byRegime:    PerRegimeMetric[];
  overall:     { sharpeNet: number; nActive: number; hitRate: number };
}

/**
 * Runs a set of config variants against a shared DB preload and, for each
 * variant, computes per-regime Sharpe / hit rate / cum return on the holdout
 * window. Complements `runSweep`, which reports only OOS/Holdout aggregates.
 *
 * Intended for Chunk 10's "what params work IN each regime?" question. The
 * output is consumed by `scripts/macro-engine/sweep-per-regime.ts`, which
 * pivots the table to emit a per-regime recommendation:
 *     { "Regime-5-inflation": { longFraction: 0.25, confidenceExp: 1.5, ... } }
 * Those recommendations feed Chunk 11 (regime-conditional execution).
 */
export async function runPerRegimeSweep(
  variants:   SweepVariant[],
  baseConfig: BacktestConfig = DEFAULT_CONFIG,
): Promise<PerRegimeVariantResult[]> {
  if (variants.length === 0) {
    console.log('runPerRegimeSweep: no variants provided');
    return [];
  }

  console.log(`\nrunPerRegimeSweep: ${variants.length} variant(s), shared preload`);
  const preloaded = await preloadBacktestData(baseConfig);

  const PPY = 252 / baseConfig.forwardDays;

  const results: PerRegimeVariantResult[] = [];
  for (const variant of variants) {
    try {
      const merged: BacktestConfig = { ...baseConfig, ...variant.overrides };
      const replay = await replayHoldout(merged, { preloaded });

      const byRegimeMap = new Map<string, ScoredDayRecord[]>();
      for (const p of replay.points) {
        const arr = byRegimeMap.get(p.regime);
        if (arr) arr.push(p); else byRegimeMap.set(p.regime, [p]);
      }

      const byRegime: PerRegimeMetric[] = [];
      const allActiveNets: number[] = [];
      for (const [regime, recs] of byRegimeMap) {
        const active = recs.filter(r => !r.gated);
        const gated  = recs.length - active.length;
        const nets   = active.map(r => r.netExcess ?? 0);
        allActiveNets.push(...nets);

        const mean = nets.length ? nets.reduce((a, b) => a + b, 0) / nets.length : 0;
        const sd =
          nets.length >= 2
            ? Math.sqrt(nets.reduce((a, b) => a + (b - mean) ** 2, 0) / nets.length)
            : 0;
        const sharpe = nets.length >= 4 && sd > 0 ? (mean / sd) * Math.sqrt(PPY) : null;
        const hit    = nets.length > 0 ? nets.filter(x => x > 0).length / nets.length : null;

        let cum = 1;
        let turnoverSum = 0;
        for (const r of active) {
          const spy = r.benchmarkReturn ?? 0;
          const net = r.netExcess       ?? 0;
          cum *= 1 + spy + net;
          turnoverSum += r.turnover ?? 0;
        }

        byRegime.push({
          regime,
          nActive:       active.length,
          nGated:        gated,
          meanExcessNet: mean,
          sharpeNet:     sharpe,
          hitRate:       hit,
          cumReturnNet:  cum,
          avgTurnover:   active.length > 0 ? turnoverSum / active.length : 0,
        });
      }

      const overallMean = allActiveNets.length
        ? allActiveNets.reduce((a, b) => a + b, 0) / allActiveNets.length
        : 0;
      const overallSd =
        allActiveNets.length >= 2
          ? Math.sqrt(
              allActiveNets.reduce((a, b) => a + (b - overallMean) ** 2, 0) / allActiveNets.length,
            )
          : 0;

      results.push({
        label:     variant.label,
        overrides: variant.overrides,
        byRegime:  byRegime.sort((a, b) => a.regime.localeCompare(b.regime)),
        overall: {
          sharpeNet: allActiveNets.length >= 4 && overallSd > 0
            ? (overallMean / overallSd) * Math.sqrt(PPY)
            : 0,
          nActive:  allActiveNets.length,
          hitRate:  allActiveNets.length > 0
            ? allActiveNets.filter(x => x > 0).length / allActiveNets.length
            : 0,
        },
      });
      console.log(
        `  [${variant.label.padEnd(28)}] overall Sharpe=${results[results.length - 1].overall.sharpeNet.toFixed(2)}` +
        ` · ${byRegime.length} regimes scored`,
      );
    } catch (e) {
      console.error(`FAILED (${variant.label}): ${e instanceof Error ? e.message : e}`);
    }
  }

  return results;
}

export { DEFAULT_CONFIG };
