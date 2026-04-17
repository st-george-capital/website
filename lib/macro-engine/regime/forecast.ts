// lib/macro-engine/regime/forecast.ts
// Regime forecast helper: reads the 1-day transition matrix from DB and computes
// n-step-ahead transition probabilities for any horizon via matrix exponentiation.
//
// Used by /api/dashboard/macro-engine/forecast to power the Regime Outlook card.
// Does NOT contain new statistical logic — composes `kStepTransitionProb` from
// transitions.ts so we stay consistent with the ingestion-time 63/126/252-day rows.

import { prisma } from '@/lib/prisma';
import { kStepTransitionProb } from './transitions';

export interface RegimeForecastHorizon {
  /** trading days ahead (e.g. 21 = one monthly rebalance, 63 = ~3 months) */
  days: number;
  /** canonical regime-name ordered probability vector for the current regime */
  probs: Array<{ regime: string; prob: number }>;
  /** probability of staying in current regime through this horizon */
  stayProb: number;
  /** most-likely next regime (excluding current), with prob */
  mostLikelyExit: { regime: string; prob: number } | null;
}

export interface RegimeForecastPayload {
  fitId: string;
  asOfDate: string;                    // ISO — latest RegimeLabel date
  currentRegime: string;               // canonical name
  currentConfidence: number | null;    // inverse-distance confidence [0..1]
  regimes: string[];                   // all canonical regime names (row order)
  /** Full 1-day transition matrix regimes × regimes */
  oneDayMatrix: number[][];
  horizons: RegimeForecastHorizon[];
}

/**
 * Load the active 1-day transition matrix from regime_transitions table and
 * return it as a square number[][] alongside the ordered regime name list.
 * The ordering is determined by RegimeTemplate.labelIndex (0..k-1).
 */
export async function loadActiveTransitionMatrix(): Promise<{
  fitId: string;
  regimes: string[];
  matrix: number[][];
} | null> {
  const latestLabel = await prisma.regimeLabel.findFirst({
    orderBy: { date: 'desc' },
    select: { fitId: true },
  });
  if (!latestLabel) return null;

  const rows = await prisma.regimeTransition.findMany({
    where: { fitId: latestLabel.fitId },
  });
  if (rows.length === 0) return null;

  const labelSet = new Set<string>();
  for (const r of rows) {
    labelSet.add(r.fromLabel);
    labelSet.add(r.toLabel);
  }
  const regimes = [...labelSet].sort();
  const idx = new Map(regimes.map((r, i) => [r, i]));

  const k = regimes.length;
  const matrix: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  for (const r of rows) {
    const fi = idx.get(r.fromLabel);
    const ti = idx.get(r.toLabel);
    if (fi == null || ti == null) continue;
    matrix[fi][ti] = r.prob1Day;
  }

  // Row-normalize defensively (should already sum to 1 given Laplace smoothing
  // at fit time but float roundoff and any missing rows would break the math).
  for (let i = 0; i < k; i++) {
    const s = matrix[i].reduce((acc, v) => acc + v, 0);
    if (s > 0) {
      for (let j = 0; j < k; j++) matrix[i][j] /= s;
    }
  }

  return { fitId: latestLabel.fitId, regimes, matrix };
}

const DEFAULT_HORIZONS = [21, 63, 126, 252] as const;

/**
 * Build a complete RegimeForecastPayload for the current regime state.
 * Returns null if no regime data exists.
 */
export async function buildRegimeForecast(
  horizonsDays: readonly number[] = DEFAULT_HORIZONS
): Promise<RegimeForecastPayload | null> {
  const active = await loadActiveTransitionMatrix();
  if (!active) return null;

  const latest = await prisma.regimeLabel.findFirst({
    orderBy: { date: 'desc' },
  });
  if (!latest) return null;

  const fromIdx = active.regimes.indexOf(latest.regimeLabel);
  if (fromIdx < 0) return null;

  const horizons: RegimeForecastHorizon[] = horizonsDays.map(days => {
    const stepped = kStepTransitionProb(active.matrix, Math.max(1, days));
    const row = stepped[fromIdx];

    const probs = row.map((prob, j) => ({ regime: active.regimes[j], prob }));
    const sorted = [...probs].sort((a, b) => b.prob - a.prob);
    const stayProb = row[fromIdx];
    const mostLikelyExit = sorted.find(p => p.regime !== latest.regimeLabel) ?? null;

    return { days, probs, stayProb, mostLikelyExit };
  });

  return {
    fitId: active.fitId,
    asOfDate: latest.date.toISOString(),
    currentRegime: latest.regimeLabel,
    currentConfidence: latest.confidence,
    regimes: active.regimes,
    oneDayMatrix: active.matrix,
    horizons,
  };
}
