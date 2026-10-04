export const TRADING_DAYS = 252;

export const COV_METHODS = ['sample', 'ledoit_wolf', 'ewma'] as const;
export type CovMethod = (typeof COV_METHODS)[number];

export type Matrix = number[][];

export function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i += 1) s += a[i] * b[i];
  return s;
}

export function matVec(m: Matrix, v: number[]): number[] {
  return m.map((row) => dot(row, v));
}

export function quadForm(w: number[], m: Matrix): number {
  return dot(w, matVec(m, w));
}

function columnMeans(x: Matrix): number[] {
  const n = x[0].length;
  const means = new Array(n).fill(0);
  for (const row of x) for (let j = 0; j < n; j += 1) means[j] += row[j];
  return means.map((m) => m / x.length);
}

function crossProduct(x: Matrix, means: number[], rowWeights?: number[]): Matrix {
  const n = means.length;
  const out: Matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  x.forEach((row, t) => {
    const wt = rowWeights ? rowWeights[t] : 1;
    for (let i = 0; i < n; i += 1) {
      const di = (row[i] - means[i]) * wt;
      for (let j = i; j < n; j += 1) out[i][j] += di * (row[j] - means[j]);
    }
  });
  for (let i = 0; i < n; i += 1) for (let j = 0; j < i; j += 1) out[i][j] = out[j][i];
  return out;
}

/** Ledoit-Wolf shrinkage toward a scaled identity, matching sklearn.covariance.LedoitWolf. */
function ledoitWolf(x: Matrix): Matrix {
  const nSamples = x.length;
  const nFeatures = x[0].length;
  const means = columnMeans(x);
  const xc = x.map((row) => row.map((v, j) => v - means[j]));
  const empCov = crossProduct(xc, new Array(nFeatures).fill(0)).map((row) => row.map((v) => v / nSamples));

  const empTrace = empCov.reduce((s, row, i) => s + row[i], 0);
  const mu = empTrace / nFeatures;

  let betaRaw = 0;
  let deltaRaw = 0;
  for (let i = 0; i < nFeatures; i += 1) {
    for (let j = 0; j < nFeatures; j += 1) {
      let x2x2 = 0;
      let xx = 0;
      for (let t = 0; t < nSamples; t += 1) {
        const a = xc[t][i];
        const b = xc[t][j];
        x2x2 += a * a * b * b;
        xx += a * b;
      }
      betaRaw += x2x2;
      deltaRaw += xx * xx;
    }
  }
  deltaRaw /= nSamples * nSamples;
  let beta = (betaRaw / nSamples - deltaRaw) / (nFeatures * nSamples);
  const delta = (deltaRaw - 2 * mu * empTrace + nFeatures * mu * mu) / nFeatures;
  beta = Math.min(beta, delta);
  const shrinkage = beta === 0 ? 0 : beta / delta;

  return empCov.map((row, i) => row.map((v, j) => (1 - shrinkage) * v + (i === j ? shrinkage * mu : 0)));
}

/** Annualized covariance matrix from daily returns (rows = days, columns = assets). */
export function estimateCovariance(returns: Matrix, method: CovMethod = 'ledoit_wolf', halflife = 63): Matrix {
  if (returns.length < 2) throw new Error('Need at least two days of returns to estimate covariance.');
  let cov: Matrix;
  if (method === 'sample') {
    cov = crossProduct(returns, columnMeans(returns)).map((row) => row.map((v) => v / (returns.length - 1)));
  } else if (method === 'ledoit_wolf') {
    cov = ledoitWolf(returns);
  } else if (method === 'ewma') {
    const T = returns.length;
    const raw = returns.map((_, t) => 0.5 ** ((T - 1 - t) / halflife));
    const total = raw.reduce((a, b) => a + b, 0);
    const weights = raw.map((w) => w / total);
    const n = returns[0].length;
    const means = new Array(n).fill(0);
    returns.forEach((row, t) => row.forEach((v, j) => (means[j] += weights[t] * v)));
    cov = crossProduct(returns, means, weights);
  } else {
    throw new Error(`Unknown covariance method '${method}'. Use sample, ledoit_wolf or ewma.`);
  }
  return cov.map((row, i) => row.map((v, j) => ((v + cov[j][i]) / 2) * TRADING_DAYS));
}

export function portfolioVol(w: number[], cov: Matrix): number {
  return Math.sqrt(Math.max(quadForm(w, cov), 0));
}

/** Fraction of total portfolio variance attributable to each position (sums to 1). */
export function riskContributions(w: number[], cov: Matrix): number[] {
  const sw = matVec(cov, w);
  const variance = dot(w, sw);
  if (variance <= 0) return w.map(() => 0);
  return w.map((x, i) => (x * sw[i]) / variance);
}

/** Inverse Herfindahl index: "how many equal positions this is like". */
export function effectiveN(w: number[]): number {
  const s = w.reduce((acc, x) => acc + x * x, 0);
  return s > 0 ? 1 / s : 0;
}

export function diversificationRatio(w: number[], cov: Matrix): number {
  const vol = portfolioVol(w, cov);
  if (vol <= 0) return 0;
  return w.reduce((acc, x, i) => acc + x * Math.sqrt(cov[i][i]), 0) / vol;
}

function std(values: number[]): number {
  if (values.length < 2) return NaN;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1));
}

/** Linear-interpolated quantile, matching pandas' default. */
function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function maxDrawdown(dailyReturns: number[]): number {
  let wealth = 1;
  let peak = 1;
  let worst = 0;
  for (const r of dailyReturns) {
    wealth *= 1 + r;
    peak = Math.max(peak, wealth);
    worst = Math.min(worst, wealth / peak - 1);
  }
  return worst;
}

export interface PerformanceStats {
  annual_return: number;
  annual_volatility: number;
  sharpe_rf0: number;
  sortino_rf0: number;
  max_drawdown: number;
  cvar_95_daily: number;
}

export function performanceStats(dailyReturns: number[]): PerformanceStats {
  const r = dailyReturns.filter((x) => Number.isFinite(x));
  if (r.length < 2) throw new Error('Need at least two daily returns to compute performance statistics.');
  const years = r.length / TRADING_DAYS;
  const growth = r.reduce((acc, x) => acc * (1 + x), 1);
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const sd = std(r);
  const downside = std(r.filter((x) => x < 0)) * Math.sqrt(TRADING_DAYS);
  const q05 = quantile(r, 0.05);
  const tail = r.filter((x) => x <= q05);
  return {
    annual_return: growth ** (1 / years) - 1,
    annual_volatility: sd * Math.sqrt(TRADING_DAYS),
    sharpe_rf0: sd > 0 ? (mean / sd) * Math.sqrt(TRADING_DAYS) : 0,
    sortino_rf0: downside > 0 ? (mean * TRADING_DAYS) / downside : 0,
    max_drawdown: maxDrawdown(r),
    cvar_95_daily: tail.reduce((a, b) => a + b, 0) / tail.length,
  };
}
