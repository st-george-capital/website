// lib/macro-engine/backtest/weights.ts
// Ridge regression weight fitting for regime-conditioned factor optimization.
// Uses ml-matrix for exact 6x6 matrix inversion — no gradient descent needed.

import { Matrix, solve } from 'ml-matrix';
import { TrainRow, WeightSet } from './types';

const WEIGHT_DIMS = 6; // [zGrowth, zInflation, zMonetary, zCredit, zCarry, zEarnings]

/**
 * Fits ridge regression weights: w = (X^T X + λI)^{-1} X^T y
 * features: [n x 6] design matrix rows
 * returns: [n] forward excess return targets
 * lambda: L2 regularization strength (default 0.05)
 */
export function fitWeightsRidge(
  features: number[][],
  returns:  number[],
  lambda:   number = 0.05,
): number[] {
  if (features.length === 0) return new Array(WEIGHT_DIMS).fill(0);

  const X      = new Matrix(features);                  // n×6
  const y      = Matrix.columnVector(returns);           // n×1
  const XtX    = X.transpose().mmul(X);                 // 6×6
  const reg    = Matrix.eye(WEIGHT_DIMS).mul(lambda);    // λI
  const XtXreg = XtX.add(reg);                          // 6×6 regularized
  const Xty    = X.transpose().mmul(y);                 // 6×1
  const w      = solve(XtXreg, Xty);                    // 6×1
  return w.getColumn(0);
}

/**
 * Given all training rows for one walk-forward step, produces per-regime WeightSets
 * with global fallback for regimes below the minimum sample threshold.
 */
export function fitWeightSetsForWindow(
  trainRows:        TrainRow[],
  lambda:           number,
  minRegimeSamples: number,
): WeightSet[] {
  // Global weights — fitted on all training data regardless of regime
  const globalWeights = fitWeightsRidge(
    trainRows.map(r => r.features),
    trainRows.map(r => r.fwdReturn),
    lambda,
  );

  // Group by regime label
  const groups = new Map<string, TrainRow[]>();
  for (const row of trainRows) {
    if (!groups.has(row.regimeLabel)) groups.set(row.regimeLabel, []);
    groups.get(row.regimeLabel)!.push(row);
  }

  const weightSets: WeightSet[] = [];

  for (const [regimeLabel, rows] of groups) {
    if (regimeLabel === 'global') {
      continue;
    }

    if (rows.length >= minRegimeSamples) {
      weightSets.push({
        regimeLabel,
        weights:     fitWeightsRidge(rows.map(r => r.features), rows.map(r => r.fwdReturn), lambda),
        sampleCount: rows.length,
        isFallback:  false,
      });
    } else {
      console.log(`Regime "${regimeLabel}" has ${rows.length} samples (< ${minRegimeSamples}) — using global fallback`);
      weightSets.push({
        regimeLabel,
        weights:     globalWeights,
        sampleCount: rows.length,
        isFallback:  true,
      });
    }
  }

  // Always include a "global" entry for dates with no regime label
  weightSets.push({
    regimeLabel: 'global',
    weights:     globalWeights,
    sampleCount: trainRows.length,
    isFallback:  false,
  });

  return weightSets;
}
