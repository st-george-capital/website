/**
 * Portfolio-level risk utilities for the macro backtest.
 *
 * The overlay computes the ex-ante annualized volatility of the equal/inv-vol
 * weighted long basket using a trailing (non-overlapping) return matrix, then
 * returns a scale factor `min(1, targetVol / exAnteVol)` applied on top of the
 * regime-confidence sizing in `scoreWindowRows`.
 *
 * This is a DISTINCT lever from per-ticker inverse-vol weighting inside the
 * basket (`volLookbackPeriods > 0`). Inverse-vol tilts weights across tickers;
 * vol-targeting scales the total basket up/down to a target risk budget.
 */

/**
 * Computes the ex-ante annualized portfolio volatility from a trailing return
 * matrix and a per-ticker weight vector.
 *
 * @param returnMatrix  N rows × K columns; row t = returns for each ticker
 *                      at the t-th lookback period. Periods must be
 *                      non-overlapping (spaced `forwardDays` apart) to keep the
 *                      covariance estimate unbiased.
 * @param weights       Length-K vector of portfolio weights (should sum to ~1).
 * @param periodsPerYear  E.g. 252/forwardDays — annualization factor.
 * @returns             Annualized volatility (std-dev) of the weighted basket,
 *                      or null when the matrix is too small / degenerate.
 */
export function portfolioVolFromReturns(
  returnMatrix: number[][],
  weights:      number[],
  periodsPerYear: number,
): number | null {
  const N = returnMatrix.length;
  const K = weights.length;
  if (N < 3 || K === 0) return null;
  if (returnMatrix[0].length !== K) return null;

  // Column means
  const means = new Array(K).fill(0);
  for (let t = 0; t < N; t++) {
    const row = returnMatrix[t];
    if (row.length !== K) return null;
    for (let k = 0; k < K; k++) means[k] += row[k];
  }
  for (let k = 0; k < K; k++) means[k] /= N;

  // Population covariance Σ (K × K)
  const cov: number[][] = Array.from({ length: K }, () => new Array(K).fill(0));
  for (let t = 0; t < N; t++) {
    const row = returnMatrix[t];
    for (let i = 0; i < K; i++) {
      const di = row[i] - means[i];
      for (let j = 0; j < K; j++) {
        cov[i][j] += di * (row[j] - means[j]);
      }
    }
  }
  for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) cov[i][j] /= N;

  // Portfolio variance = wᵀ Σ w
  let varP = 0;
  for (let i = 0; i < K; i++) {
    for (let j = 0; j < K; j++) {
      varP += weights[i] * weights[j] * cov[i][j];
    }
  }
  if (!Number.isFinite(varP) || varP <= 0) return null;

  return Math.sqrt(varP) * Math.sqrt(periodsPerYear);
}

/**
 * Scale factor for the ex-ante vol-target overlay:
 *   - If no target set, returns 1 (no scaling).
 *   - If ex-ante vol is null / zero / non-finite, returns 1 (fail-open: trust
 *     the default sizing rather than risk dividing by a degenerate estimate).
 *   - Otherwise returns min(1, targetVol / exAnteVol). We NEVER scale up above
 *     1.0 — leverage is out of scope for this overlay.
 */
export function volTargetScale(
  exAnteVolAnn: number | null,
  targetVolAnn: number | undefined,
): number {
  if (!targetVolAnn || targetVolAnn <= 0) return 1;
  if (exAnteVolAnn === null || !Number.isFinite(exAnteVolAnn) || exAnteVolAnn <= 0) return 1;
  return Math.min(1, targetVolAnn / exAnteVolAnn);
}
