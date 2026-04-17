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
 * Pairwise Pearson correlation matrix from an N×K return matrix.
 * Returns a symmetric K×K matrix with 1 on the diagonal; degenerate columns
 * (zero stdev) are masked to 0 to keep downstream penalty terms finite.
 */
export function pairwiseCorrelation(returnMatrix: number[][]): number[][] {
  const N = returnMatrix.length;
  if (N === 0) return [];
  const K = returnMatrix[0].length;
  if (K === 0) return [];

  const means = new Array(K).fill(0);
  for (let t = 0; t < N; t++) {
    const row = returnMatrix[t];
    for (let k = 0; k < K; k++) means[k] += row[k];
  }
  for (let k = 0; k < K; k++) means[k] /= N;

  const stds = new Array(K).fill(0);
  for (let t = 0; t < N; t++) {
    const row = returnMatrix[t];
    for (let k = 0; k < K; k++) {
      const d = row[k] - means[k];
      stds[k] += d * d;
    }
  }
  for (let k = 0; k < K; k++) stds[k] = Math.sqrt(stds[k] / N);

  const corr: number[][] = Array.from({ length: K }, () => new Array(K).fill(0));
  for (let i = 0; i < K; i++) {
    corr[i][i] = 1;
    for (let j = i + 1; j < K; j++) {
      if (stds[i] === 0 || stds[j] === 0) {
        corr[i][j] = 0;
        corr[j][i] = 0;
        continue;
      }
      let cov = 0;
      for (let t = 0; t < N; t++) {
        cov += (returnMatrix[t][i] - means[i]) * (returnMatrix[t][j] - means[j]);
      }
      cov /= N;
      const c = Math.max(-1, Math.min(1, cov / (stds[i] * stds[j])));
      corr[i][j] = c;
      corr[j][i] = c;
    }
  }
  return corr;
}

/**
 * Greedy correlation-aware selection over a larger candidate pool.
 *
 * Objective for a selection S ⊂ {0..n-1}, |S|=k:
 *     J(S) = Σ_{i∈S} scores[i] − λ · Σ_{i<j, i,j∈S} |corr[i][j]|
 *
 * Strategy: start from the top-k by score, then repeatedly evaluate every
 * (in, out) swap and apply the single best improving swap per pass. Terminate
 * when no swap improves J by more than 1e-12. Iteration order is fixed, so the
 * routine is deterministic. Hard-capped at n·k iterations to guarantee
 * termination under any pathological edge case.
 *
 * Returns the indices of the selected members, sorted ascending.
 */
export function greedyCorrSelect(
  scores:   number[],
  corr:     number[][],
  k:        number,
  lambda:   number,
): number[] {
  const n = scores.length;
  if (k >= n) return scores.map((_, i) => i);
  if (k <= 0) return [];

  const ranked = scores
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s - a.s || a.i - b.i);
  const sel = new Set<number>(ranked.slice(0, k).map((r) => r.i));

  const objective = (selIdx: Set<number>): number => {
    let scoreSum = 0;
    for (const i of selIdx) scoreSum += scores[i];
    let corrSum = 0;
    const arr = [...selIdx];
    for (let a = 0; a < arr.length; a++) {
      for (let b = a + 1; b < arr.length; b++) {
        corrSum += Math.abs(corr[arr[a]][arr[b]]);
      }
    }
    return scoreSum - lambda * corrSum;
  };

  let currentObj = objective(sel);
  const maxIters = Math.max(1, n * k);
  for (let iter = 0; iter < maxIters; iter++) {
    const inList: number[] = [...sel].sort((a, b) => a - b);
    const outList: number[] = [];
    for (let i = 0; i < n; i++) if (!sel.has(i)) outList.push(i);

    let bestSwap: { out: number; inn: number; obj: number } | null = null;
    for (const out of inList) {
      for (const inn of outList) {
        sel.delete(out);
        sel.add(inn);
        const obj = objective(sel);
        if (obj > currentObj + 1e-12 && (!bestSwap || obj > bestSwap.obj)) {
          bestSwap = { out, inn, obj };
        }
        sel.delete(inn);
        sel.add(out);
      }
    }

    if (!bestSwap) break;
    sel.delete(bestSwap.out);
    sel.add(bestSwap.inn);
    currentObj = bestSwap.obj;
  }

  return [...sel].sort((a, b) => a - b);
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
