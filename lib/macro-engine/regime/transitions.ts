// lib/macro-engine/regime/transitions.ts
import { Matrix } from 'ml-matrix';
import type { TransitionMatrixRow } from './types';

const LAPLACE_EPSILON = 0.01; // Prevents zero rows in transition matrix

/**
 * Build row-stochastic Markov transition matrix from ordered label sequence.
 * Applies Laplace smoothing so every transition has non-zero probability.
 * Returns number[][] where result[i][j] = P(next regime = j | current regime = i).
 */
export function computeTransitionMatrix(
  labels: number[],
  k: number
): number[][] {
  // Initialize counts with Laplace smoothing
  const counts = Array.from({ length: k }, () => new Array(k).fill(LAPLACE_EPSILON));
  for (let i = 0; i < labels.length - 1; i++) {
    const from = labels[i];
    const to = labels[i + 1];
    if (from >= 0 && from < k && to >= 0 && to < k) {
      counts[from][to]++;
    }
  }
  // Normalize each row to sum to 1.0
  return counts.map(row => {
    const total = row.reduce((s, v) => s + v, 0);
    return row.map(v => v / total);
  });
}

/**
 * Compute k-step transition matrix via matrix exponentiation.
 * steps = trading days ahead (63=~3mo, 126=~6mo, 252=~12mo).
 * Returns number[][] — P(regime i transitions to regime j in `steps` days).
 */
export function kStepTransitionProb(
  transMatrix: number[][],
  steps: number
): number[][] {
  let m = new Matrix(transMatrix);
  const base = new Matrix(transMatrix);
  for (let i = 1; i < steps; i++) {
    m = m.mmul(base);
  }
  return m.to2DArray();
}

/**
 * Build TransitionMatrixRow[] for DB upsert from a transition matrix.
 * Computes 1-day, 63-day, 126-day, and 252-day ahead probabilities.
 * labelNames: { [labelIndex]: canonicalName }
 */
export function buildTransitionRows(
  fitId: string,
  labelNames: Record<number, string>,
  transMatrix: number[][],
  k: number
): TransitionMatrixRow[] {
  const m63  = kStepTransitionProb(transMatrix, 63);
  const m126 = kStepTransitionProb(transMatrix, 126);
  const m252 = kStepTransitionProb(transMatrix, 252);

  const rows: TransitionMatrixRow[] = [];
  for (let from = 0; from < k; from++) {
    for (let to = 0; to < k; to++) {
      rows.push({
        fitId,
        fromLabel: labelNames[from] ?? `regime-${from}`,
        toLabel: labelNames[to] ?? `regime-${to}`,
        prob1Day:   transMatrix[from][to],
        prob63Day:  m63[from][to],
        prob126Day: m126[from][to],
        prob252Day: m252[from][to],
      });
    }
  }
  return rows;
}
