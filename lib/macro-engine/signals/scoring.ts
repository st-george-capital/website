/**
 * Scoring orchestrator for daily allocation signals.
 * Reads the latest BacktestRun weight set, looks up current factor feature matrix,
 * and produces a ranked list of scored ETF entries.
 */

import { prismaDirectUrl } from '../db';
import { BACKTEST_FEATURE_DIMS } from '../backtest/types';
import { getByType } from '../universe';
import { normalizeConviction, attributeFactors } from './conviction';

export interface ScoredEntry {
  ticker: string;
  score: number;
  convictionScore: number;
  direction: 'overweight' | 'underweight' | 'neutral';
  factorAttribution: Record<string, number>;
  regimeLabel: string;
  etfTicker: string;
}

/**
 * Scores all universe ETFs as of the given date.
 *
 * Steps:
 * 1. Load latest BacktestRun + matching FactorWeightSet for current regime.
 * 2. Determine current regime from latest RegimeLabel.
 * 3. Fetch the most recent FactorFeatureMatrix snapshot at or before asOfDate.
 * 4. Compute weighted factor score per ETF.
 * 5. Normalize to conviction [0, 1] and set direction.
 */
export async function scoreUniverse(asOfDate: Date): Promise<ScoredEntry[]> {
  // ── 1. Latest BacktestRun ──────────────────────────────────────────────────
  const latestRun = await prismaDirectUrl.backtestRun.findFirst({
    orderBy: { runAt: 'desc' },
  });

  if (!latestRun) {
    throw new Error('No BacktestRun found. Run npm run backtest:run first.');
  }

  // ── 2. Current regime ─────────────────────────────────────────────────────
  const latestRegime = await prismaDirectUrl.regimeLabel.findFirst({
    orderBy: { date: 'desc' },
  });

  const currentRegimeLabel = latestRegime?.regimeLabel ?? 'global';

  // ── 3. Weight set: prefer regime match, fall back to isFallback row ────────
  let weightSet = await prismaDirectUrl.factorWeightSet.findFirst({
    where: { runId: latestRun.id, regimeLabel: currentRegimeLabel },
  });

  if (!weightSet) {
    weightSet = await prismaDirectUrl.factorWeightSet.findFirst({
      where: { runId: latestRun.id, isFallback: true },
    });
  }

  if (!weightSet) {
    throw new Error(
      `No FactorWeightSet found for runId=${latestRun.id} (regime=${currentRegimeLabel}). ` +
        'Run npm run backtest:run first.',
    );
  }

  const weights = [
    weightSet.wGrowth,
    weightSet.wInflation,
    weightSet.wMonetary,
    weightSet.wCredit,
    weightSet.wCarry,
    weightSet.wEarnings,
  ];

  // ── 4. Latest feature date at or before asOfDate ───────────────────────────
  // Find the most recent feature date to detect staleness (Pitfall 1).
  const latestFeatureDateRow = await prismaDirectUrl.factorFeatureMatrix.findFirst({
    where: { featureDate: { lte: asOfDate } },
    orderBy: { featureDate: 'desc' },
    select: { featureDate: true },
  });

  if (!latestFeatureDateRow) {
    throw new Error(
      `No FactorFeatureMatrix rows found at or before ${asOfDate.toISOString()}. ` +
        'Run npm run build:features first.',
    );
  }

  const featureDate = latestFeatureDateRow.featureDate;
  const daysSinceFeature = Math.round(
    (asOfDate.getTime() - featureDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  console.log(
    `scoreUniverse: using featureDate=${featureDate.toISOString().slice(0, 10)} ` +
      `(${daysSinceFeature} days before asOfDate=${asOfDate.toISOString().slice(0, 10)})`,
  );
  if (daysSinceFeature > 5) {
    console.warn(
      `  WARNING: featureDate is ${daysSinceFeature} days stale — ` +
        'factor scores may not reflect current conditions.',
    );
  }

  // ── 5. Fetch all ETF tickers for this feature date ─────────────────────────
  const etfTickers = getByType('etf').map((e) => e.ticker);

  const featureRows = await prismaDirectUrl.factorFeatureMatrix.findMany({
    where: {
      featureDate,
      ticker: { in: etfTickers },
    },
  });

  if (featureRows.length === 0) {
    throw new Error(
      `No FactorFeatureMatrix rows for featureDate=${featureDate.toISOString().slice(0, 10)}. ` +
        'Run npm run build:features first.',
    );
  }

  // ── 6. Score each ETF ──────────────────────────────────────────────────────
  const rawScores: Array<{ ticker: string; score: number; zScores: number[] }> = [];

  for (const row of featureRows) {
    const zScores = [
      row.zGrowth ?? 0,
      row.zInflation ?? 0,
      row.zMonetary ?? 0,
      row.zCredit ?? 0,
      row.zCarry ?? 0,
      row.zEarnings ?? 0,
    ];

    const score = weights.reduce((acc, w, i) => acc + w * zScores[i], 0);
    rawScores.push({ ticker: row.ticker, score, zScores });
  }

  // ── 7. Normalize conviction ────────────────────────────────────────────────
  const normalizedConvictions = normalizeConviction(rawScores.map((r) => r.score));

  // ── 8. Build ScoredEntry list ──────────────────────────────────────────────
  const entries: ScoredEntry[] = rawScores.map((r, i) => {
    const convictionScore = normalizedConvictions[i];
    const direction: 'overweight' | 'underweight' | 'neutral' =
      convictionScore > 0.6 ? 'overweight' : convictionScore < 0.4 ? 'underweight' : 'neutral';

    const factorAttribution = attributeFactors(weights, r.zScores, BACKTEST_FEATURE_DIMS);

    return {
      ticker: r.ticker,
      score: r.score,
      convictionScore,
      direction,
      factorAttribution,
      regimeLabel: currentRegimeLabel,
      etfTicker: r.ticker, // ETFs are their own entry vehicle
    };
  });

  return entries;
}
