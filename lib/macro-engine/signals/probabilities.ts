/**
 * Probabilistic forecast module for allocation signals.
 *
 * Computes P(ticker outperforms SPY in next 6m / 12m) using empirical calibration
 * from historical OOS data only (pre-HOLDOUT_START).
 *
 * Algorithm:
 * 1. Fetch historical FactorFeatureMatrix rows (featureDate < HOLDOUT_START) — pre-2022 only.
 * 2. Fetch the latest FactorWeightSet to compute conviction scores on historical rows.
 * 3. Fetch forward SPY-relative returns at 126 and 252 calendar days for those observations.
 * 4. Group observations by (regimeLabel, decileBucket) and compute empirical hit rates.
 * 5. Look up each input entry's bucket; fall back to regime-agnostic then to 0.5.
 * 6. Clamp output to [0.05, 0.95].
 */

import { prismaDirectUrl } from '../db';
import { HOLDOUT_START, BACKTEST_FEATURE_DIMS } from '../backtest/types';
import { normalizeConviction } from './conviction';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Calendar days proxying 6 trading months (~126 trading days ≈ 182 calendar days). */
const FWD_CALENDAR_6M = 182;

/** Calendar days proxying 12 trading months (~252 trading days ≈ 365 calendar days). */
const FWD_CALENDAR_12M = 365;

/** Buffer in calendar days when searching for the nearest price date. */
const PRICE_BUFFER_DAYS = 14;

/** Minimum observations in a (regime, decile) bucket before we trust the hit rate. */
const MIN_BUCKET_OBS = 5;

/** Clamp bounds for all returned probabilities. */
const PROB_MIN = 0.05;
const PROB_MAX = 0.95;

// ── Types ─────────────────────────────────────────────────────────────────────

interface HistoricalObs {
  ticker: string;
  featureDate: Date;
  regimeLabel: string;
  convictionScore: number;
  decileBucket: number; // 0–9
}

interface BucketStats {
  count6m: number;
  hits6m: number;
  count12m: number;
  hits12m: number;
}

type BucketKey = string; // `${regimeLabel}:${decileBucket}`

// ── Helper ────────────────────────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.min(PROB_MAX, Math.max(PROB_MIN, v));
}

function bucketKey(regimeLabel: string, decile: number): BucketKey {
  return `${regimeLabel}:${decile}`;
}

function globalKey(decile: number): BucketKey {
  return `__global__:${decile}`;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Computes outperformance probabilities for the provided entries.
 *
 * @param entries   Current ticker universe with conviction scores and regime labels.
 * @param asOfDate  The signal date (used only for logging; calibration is purely historical).
 * @returns Map<ticker, { prob6m, prob12m }>
 */
export async function computeOutperformanceProbabilities(
  entries: Array<{ ticker: string; convictionScore: number; regimeLabel: string }>,
  asOfDate: Date,
): Promise<Map<string, { prob6m: number; prob12m: number }>> {
  console.log(
    `computeOutperformanceProbabilities: asOfDate=${asOfDate.toISOString().slice(0, 10)}, entries=${entries.length}`,
  );

  // ── Step 1: Fetch latest FactorWeightSet (needed to score historical rows) ──
  const latestRun = await prismaDirectUrl.backtestRun.findFirst({
    orderBy: { runAt: 'desc' },
  });

  if (!latestRun) {
    console.warn('computeOutperformanceProbabilities: no BacktestRun found — returning 0.5 for all');
    return buildFallbackMap(entries, 0.5, 0.5);
  }

  // Prefer a global/fallback weight set; the calibration doesn't need regime-specific weights
  // because we're building the calibration distribution — regime stratification happens in step 4.
  const weightSetRow = await prismaDirectUrl.factorWeightSet.findFirst({
    where: { runId: latestRun.id, isFallback: true },
  }) ?? await prismaDirectUrl.factorWeightSet.findFirst({
    where: { runId: latestRun.id },
  });

  if (!weightSetRow) {
    console.warn('computeOutperformanceProbabilities: no FactorWeightSet found — returning 0.5 for all');
    return buildFallbackMap(entries, 0.5, 0.5);
  }

  const weights = [
    weightSetRow.wGrowth,
    weightSetRow.wInflation,
    weightSetRow.wMonetary,
    weightSetRow.wCredit,
    weightSetRow.wCarry,
    weightSetRow.wEarnings,
  ];

  // ── Step 2: Fetch historical FactorFeatureMatrix rows (pre-HOLDOUT_START) ──
  // Join with regime_labels on the nearest available regime date to get regimeLabel per observation.
  // We do a LEFT JOIN so rows without a regime are still included (regime defaults to 'global').
  const historicalFeatureRows = await prismaDirectUrl.$queryRaw<
    Array<{
      ticker: string;
      featureDate: Date;
      regimeLabel: string | null;
      zGrowth: number | null;
      zInflation: number | null;
      zMonetary: number | null;
      zCredit: number | null;
      zCarry: number | null;
      zEarnings: number | null;
    }>
  >`
    SELECT
      f.ticker,
      f."featureDate",
      r."regimeLabel",
      f."zGrowth",
      f."zInflation",
      f."zMonetary",
      f."zCredit",
      f."zCarry",
      f."zEarnings"
    FROM factor_feature_matrix f
    LEFT JOIN regime_labels r
      ON r.date = (
        SELECT date FROM regime_labels
        WHERE date <= f."featureDate"
        ORDER BY date DESC
        LIMIT 1
      )
    WHERE f."featureDate" < ${HOLDOUT_START}
    ORDER BY f."featureDate" ASC
  `;

  if (historicalFeatureRows.length === 0) {
    console.warn(
      'computeOutperformanceProbabilities: no historical FactorFeatureMatrix rows pre-HOLDOUT_START — returning 0.5 for all',
    );
    return buildFallbackMap(entries, 0.5, 0.5);
  }

  console.log(
    `computeOutperformanceProbabilities: loaded ${historicalFeatureRows.length} historical feature rows (pre-${HOLDOUT_START.toISOString().slice(0, 10)})`,
  );

  // ── Step 3: Score historical rows → conviction → decile bucket ───────────
  const rawScores = historicalFeatureRows.map((row) => {
    const zScores = [
      row.zGrowth ?? 0,
      row.zInflation ?? 0,
      row.zMonetary ?? 0,
      row.zCredit ?? 0,
      row.zCarry ?? 0,
      row.zEarnings ?? 0,
    ];
    const score = weights.reduce((acc, w, i) => acc + w * zScores[i], 0);
    return score;
  });

  const normalizedConvictions = normalizeConviction(rawScores);

  const historicalObs: HistoricalObs[] = historicalFeatureRows.map((row, i) => ({
    ticker: row.ticker,
    featureDate: row.featureDate,
    regimeLabel: row.regimeLabel ?? 'global',
    convictionScore: normalizedConvictions[i],
    decileBucket: Math.min(9, Math.floor(normalizedConvictions[i] * 10)),
  }));

  // ── Step 4: Fetch SPY-relative forward returns at 6m and 12m ─────────────
  // We need prices for all unique (ticker, featureDate) pairs up to
  // featureDate + FWD_CALENDAR_12M + PRICE_BUFFER_DAYS.
  // We also need SPY prices over the same windows.
  //
  // Strategy: fetch all ohlcv_daily rows for the relevant tickers + SPY
  // from the earliest featureDate to the latest featureDate + 12m + buffer,
  // restricted to pre-HOLDOUT_START to avoid contamination.

  const uniqueTickers = [...new Set(historicalFeatureRows.map((r) => r.ticker))];
  const allTickers = uniqueTickers.includes('SPY') ? uniqueTickers : [...uniqueTickers, 'SPY'];

  const earliestDate = historicalFeatureRows[0].featureDate;
  // Latest possible forward date: last feature date + 12m + buffer, but capped at HOLDOUT_START
  const lastFeatureDate = historicalFeatureRows[historicalFeatureRows.length - 1].featureDate;
  const maxFwdDateRaw = new Date(lastFeatureDate.getTime() + (FWD_CALENDAR_12M + PRICE_BUFFER_DAYS) * 86400_000);
  const maxFwdDate = maxFwdDateRaw < HOLDOUT_START ? maxFwdDateRaw : HOLDOUT_START;

  console.log(
    `computeOutperformanceProbabilities: fetching OHLCV from ${earliestDate.toISOString().slice(0, 10)} to ${maxFwdDate.toISOString().slice(0, 10)} for ${allTickers.length} tickers`,
  );

  const priceRows = await prismaDirectUrl.$queryRaw<
    Array<{ ticker: string; date: Date; adjClose: number }>
  >`
    SELECT ticker, date, "adjClose"
    FROM ohlcv_daily
    WHERE ticker = ANY(${allTickers})
      AND date >= ${earliestDate}
      AND date <= ${maxFwdDate}
    ORDER BY ticker, date ASC
  `;

  // Build price lookup: ticker → sorted { date, adjClose }[]
  const priceMap = new Map<string, { date: Date; adjClose: number }[]>();
  for (const r of priceRows) {
    if (!priceMap.has(r.ticker)) priceMap.set(r.ticker, []);
    priceMap.get(r.ticker)!.push({ date: new Date(r.date), adjClose: Number(r.adjClose) });
  }

  console.log(`computeOutperformanceProbabilities: loaded ${priceRows.length} price rows`);

  // Find nearest price at or after a target date (within buffer)
  function findNearestPrice(
    prices: { date: Date; adjClose: number }[],
    targetDate: Date,
  ): number | null {
    const bufferMs = PRICE_BUFFER_DAYS * 86400_000;
    const target = targetDate.getTime();
    const end = target + bufferMs;
    const match = prices.find((p) => p.date.getTime() >= target && p.date.getTime() <= end);
    return match ? match.adjClose : null;
  }

  // Find nearest base price on or just before a target date (within buffer)
  function findBasePrice(
    prices: { date: Date; adjClose: number }[],
    baseDate: Date,
  ): number | null {
    const bufferMs = PRICE_BUFFER_DAYS * 86400_000;
    const base = baseDate.getTime();
    // Find price on or after base date (markets closed on that date → use next trading day)
    const match = prices.find((p) => p.date.getTime() >= base && p.date.getTime() <= base + bufferMs);
    return match ? match.adjClose : null;
  }

  // ── Step 5: Build bucket stats ────────────────────────────────────────────
  const bucketStats = new Map<BucketKey, BucketStats>();

  function getBucket(key: BucketKey): BucketStats {
    if (!bucketStats.has(key)) {
      bucketStats.set(key, { count6m: 0, hits6m: 0, count12m: 0, hits12m: 0 });
    }
    return bucketStats.get(key)!;
  }

  const spyPrices = priceMap.get('SPY') ?? [];
  let skipped6m = 0;
  let skipped12m = 0;

  for (const obs of historicalObs) {
    const tickerPrices = priceMap.get(obs.ticker) ?? [];

    const basePrice = findBasePrice(tickerPrices, obs.featureDate);
    const baseSpy = findBasePrice(spyPrices, obs.featureDate);

    if (basePrice === null || baseSpy === null || basePrice <= 0 || baseSpy <= 0) {
      skipped6m++;
      skipped12m++;
      continue;
    }

    // 6-month forward return
    const fwd6Date = new Date(obs.featureDate.getTime() + FWD_CALENDAR_6M * 86400_000);
    const fwdPrice6 = findNearestPrice(tickerPrices, fwd6Date);
    const fwdSpy6 = findNearestPrice(spyPrices, fwd6Date);

    if (fwdPrice6 !== null && fwdSpy6 !== null && fwdPrice6 > 0 && fwdSpy6 > 0) {
      const tickerRet6 = fwdPrice6 / basePrice - 1;
      const spyRet6 = fwdSpy6 / baseSpy - 1;
      const hit6 = tickerRet6 > spyRet6 ? 1 : 0;

      const regKey = bucketKey(obs.regimeLabel, obs.decileBucket);
      const globKey = globalKey(obs.decileBucket);
      getBucket(regKey).count6m++;
      getBucket(regKey).hits6m += hit6;
      getBucket(globKey).count6m++;
      getBucket(globKey).hits6m += hit6;
    } else {
      skipped6m++;
    }

    // 12-month forward return
    const fwd12Date = new Date(obs.featureDate.getTime() + FWD_CALENDAR_12M * 86400_000);
    const fwdPrice12 = findNearestPrice(tickerPrices, fwd12Date);
    const fwdSpy12 = findNearestPrice(spyPrices, fwd12Date);

    if (fwdPrice12 !== null && fwdSpy12 !== null && fwdPrice12 > 0 && fwdSpy12 > 0) {
      const tickerRet12 = fwdPrice12 / basePrice - 1;
      const spyRet12 = fwdSpy12 / baseSpy - 1;
      const hit12 = tickerRet12 > spyRet12 ? 1 : 0;

      const regKey = bucketKey(obs.regimeLabel, obs.decileBucket);
      const globKey = globalKey(obs.decileBucket);
      getBucket(regKey).count12m++;
      getBucket(regKey).hits12m += hit12;
      getBucket(globKey).count12m++;
      getBucket(globKey).hits12m += hit12;
    } else {
      skipped12m++;
    }
  }

  console.log(
    `computeOutperformanceProbabilities: calibration complete — ` +
      `buckets=${bucketStats.size}, skipped6m=${skipped6m}, skipped12m=${skipped12m}`,
  );

  // ── Step 6: Look up each entry's bucket ──────────────────────────────────
  const result = new Map<string, { prob6m: number; prob12m: number }>();

  for (const entry of entries) {
    const decile = Math.min(9, Math.floor(entry.convictionScore * 10));
    const regKey = bucketKey(entry.regimeLabel, decile);
    const globKey = globalKey(decile);

    let prob6m: number;
    let prob12m: number;

    // Prefer regime-specific bucket if it has >= MIN_BUCKET_OBS
    const regStats = bucketStats.get(regKey);
    const globStats = bucketStats.get(globKey);

    if (regStats && regStats.count6m >= MIN_BUCKET_OBS) {
      prob6m = regStats.hits6m / regStats.count6m;
    } else if (globStats && globStats.count6m >= MIN_BUCKET_OBS) {
      prob6m = globStats.hits6m / globStats.count6m;
    } else {
      prob6m = 0.5;
    }

    if (regStats && regStats.count12m >= MIN_BUCKET_OBS) {
      prob12m = regStats.hits12m / regStats.count12m;
    } else if (globStats && globStats.count12m >= MIN_BUCKET_OBS) {
      prob12m = globStats.hits12m / globStats.count12m;
    } else {
      prob12m = 0.5;
    }

    result.set(entry.ticker, {
      prob6m: clamp(prob6m),
      prob12m: clamp(prob12m),
    });
  }

  // Log summary for inspection
  console.log('computeOutperformanceProbabilities: results per ticker:');
  for (const entry of entries) {
    const p = result.get(entry.ticker);
    console.log(`  ${entry.ticker.padEnd(6)} conviction=${entry.convictionScore.toFixed(3)} prob6m=${p?.prob6m.toFixed(3)} prob12m=${p?.prob12m.toFixed(3)}`);
  }

  return result;
}

// ── Utility ───────────────────────────────────────────────────────────────────

function buildFallbackMap(
  entries: Array<{ ticker: string }>,
  prob6m: number,
  prob12m: number,
): Map<string, { prob6m: number; prob12m: number }> {
  const map = new Map<string, { prob6m: number; prob12m: number }>();
  for (const entry of entries) {
    map.set(entry.ticker, { prob6m, prob12m });
  }
  return map;
}
