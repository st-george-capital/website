/**
 * Conviction normalization and factor attribution utilities.
 * Used by scoring.ts to produce per-ETF conviction scores and attribution breakdowns.
 */

/**
 * Min-max normalizes an array of scores to [0, 1].
 * If all scores are equal (zero range), returns 0.5 for every element.
 */
export function normalizeConviction(scores: number[]): number[] {
  if (scores.length === 0) return [];

  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min;

  if (range === 0) {
    return scores.map(() => 0.5);
  }

  return scores.map((s) => (s - min) / range);
}

/**
 * Attributes factor contribution for a single ticker.
 * Returns { dimName: w_i * z_i } for each dimension.
 *
 * @param weights  - Factor weights array (same length as dims), e.g. [wGrowth, wInflation, ...]
 * @param zScores  - Z-score values for the ticker (same order as dims)
 * @param dims     - Dimension names (readonly string tuple, e.g. BACKTEST_FEATURE_DIMS)
 */
export function attributeFactors(
  weights: number[],
  zScores: number[],
  dims: readonly string[],
): Record<string, number> {
  const attribution: Record<string, number> = {};
  for (let i = 0; i < dims.length; i++) {
    const w = weights[i] ?? 0;
    const z = zScores[i] ?? 0;
    attribution[dims[i]] = w * z;
  }
  return attribution;
}
