import { Matrix as MlMatrix, inverse, solve } from 'ml-matrix';
import { dot, matVec, portfolioVol, type Matrix } from './risk';
import { solveQP } from './qp';

export class OptimizationError extends Error {}

export interface Constraints {
  longOnly: boolean;
  maxWeight?: number;
  minWeight?: number;
  sectorMap: Record<string, string>;
  sectorCaps: Record<string, number>;
  currentWeights: Record<string, number>;
  maxTurnover?: number;
  targetVol?: number;
}

export function emptyConstraints(overrides: Partial<Constraints> = {}): Constraints {
  return { longOnly: true, sectorMap: {}, sectorCaps: {}, currentWeights: {}, ...overrides };
}

export interface View {
  asset: string;
  expectedReturn: number;
  confidence: number;
  relativeTo?: string;
}

export type Weights = Record<string, number>;

const BIG = 1e9;
const pct = (x: number) => `${(x * 100).toFixed(2)}%`;

export function currentVector(c: Constraints, tickers: string[]): number[] {
  return tickers.map((t) => c.currentWeights[t] ?? 0);
}

function sectorMembers(c: Constraints, tickers: string[], sector: string): number[] {
  const target = sector.toLowerCase();
  return tickers.flatMap((t, i) => ((c.sectorMap[t] ?? '').toLowerCase() === target ? [i] : []));
}

function validate(c: Constraints, tickers: string[]): void {
  const n = tickers.length;
  if (c.maxWeight !== undefined && c.maxWeight * n < 1 - 1e-9) {
    throw new OptimizationError(
      `max_weight=${pct(c.maxWeight)} is infeasible with ${n} assets (need at least ${pct(1 / n)} so weights can sum to 100%).`
    );
  }
  if (c.minWeight !== undefined && c.minWeight * n > 1 + 1e-9) {
    throw new OptimizationError(`min_weight=${pct(c.minWeight)} is infeasible with ${n} assets.`);
  }
  if (c.maxTurnover !== undefined && Object.keys(c.currentWeights).length === 0) {
    throw new OptimizationError('max_turnover requires current_weights.');
  }
  for (const sector of Object.keys(c.sectorCaps)) {
    if (sectorMembers(c, tickers, sector).length === 0) {
      const known = Array.from(new Set(tickers.map((t) => c.sectorMap[t] ?? 'Unknown'))).sort();
      throw new OptimizationError(`No assets in sector '${sector}'. Known sectors: ${known.join(', ')}.`);
    }
  }
}

function clean(w: number[], tickers: string[], longOnly: boolean): Weights {
  let v = w.map((x) => (Math.abs(x) < 1e-6 ? 0 : x));
  if (longOnly) v = v.map((x) => Math.max(x, 0));
  const total = v.reduce((a, b) => a + b, 0);
  return Object.fromEntries(tickers.map((t, i) => [t, v[i] / total]));
}

/** Solves min ½wᵀPw + qᵀw under the portfolio constraints (turnover via auxiliary variables). */
function solveConstrained(P: Matrix, q: number[], tickers: string[], c: Constraints): number[] {
  const n = tickers.length;
  const withTurnover = c.maxTurnover !== undefined;
  const nv = withTurnover ? 2 * n : n;
  const row = (entries: Array<[number, number]>) => {
    const r = new Array(nv).fill(0);
    entries.forEach(([i, v]) => (r[i] = v));
    return r;
  };
  const A: Matrix = [];
  const l: number[] = [];
  const u: number[] = [];
  const add = (r: number[], lo: number, hi: number) => {
    A.push(r);
    l.push(lo);
    u.push(hi);
  };

  add(row(tickers.map((_, i) => [i, 1] as [number, number])), 1, 1);
  for (let i = 0; i < n; i += 1) {
    const lo = c.longOnly ? Math.max(0, c.minWeight ?? 0) : c.minWeight ?? -BIG;
    add(row([[i, 1]]), lo, c.maxWeight ?? (c.longOnly ? 1 : BIG));
  }
  for (const [sector, cap] of Object.entries(c.sectorCaps)) {
    add(row(sectorMembers(c, tickers, sector).map((i) => [i, 1] as [number, number])), -BIG, cap);
  }
  if (withTurnover) {
    const cur = currentVector(c, tickers);
    for (let i = 0; i < n; i += 1) {
      add(row([[i, 1], [n + i, -1]]), -BIG, cur[i]);
      add(row([[i, -1], [n + i, -1]]), -BIG, -cur[i]);
      add(row([[n + i, 1]]), 0, BIG);
    }
    add(row(tickers.map((_, i) => [n + i, 1] as [number, number])), 0, c.maxTurnover!);
  }

  const Pfull = Array.from({ length: nv }, (_, i) =>
    Array.from({ length: nv }, (_, j) => (i < n && j < n ? P[i][j] : 0))
  );
  const qfull = Array.from({ length: nv }, (_, i) => (i < n ? q[i] : 0));
  const res = solveQP({ P: Pfull, q: qfull, A, l, u });
  if (!res.converged && res.primalResidual > 1e-5) {
    throw new OptimizationError(
      'Optimizer could not satisfy the constraints. They are probably too tight to satisfy together ' +
        '(e.g. target_vol too low, turnover too small, or caps that cannot sum to 100%).'
    );
  }
  return res.x.slice(0, n);
}

export function equalWeight(tickers: string[]): Weights {
  return Object.fromEntries(tickers.map((t) => [t, 1 / tickers.length]));
}

export function inverseVol(tickers: string[], cov: Matrix): Weights {
  const iv = cov.map((row, i) => 1 / Math.sqrt(row[i]));
  const total = iv.reduce((a, b) => a + b, 0);
  return Object.fromEntries(tickers.map((t, i) => [t, iv[i] / total]));
}

export function minVariance(tickers: string[], cov: Matrix, c: Constraints): Weights {
  validate(c, tickers);
  const P = cov.map((row) => row.map((v) => 2 * v));
  const w = solveConstrained(P, tickers.map(() => 0), tickers, { ...c, targetVol: undefined });
  if (c.targetVol !== undefined && portfolioVol(w, cov) > c.targetVol + 1e-6) {
    throw new OptimizationError(
      `target_vol=${pct(c.targetVol)} is below the minimum achievable volatility (${pct(portfolioVol(w, cov))}) for this universe and constraints.`
    );
  }
  return clean(w, tickers, c.longOnly);
}

/** Maximize μᵀw − (risk_aversion/2)·wᵀΣw. A target_vol cap is enforced through its Lagrange multiplier. */
export function meanVariance(mu: number[], tickers: string[], cov: Matrix, riskAversion: number, c: Constraints): Weights {
  validate(c, tickers);
  if (mu.some((m) => !Number.isFinite(m))) throw new OptimizationError('Expected returns are missing for some tickers.');
  const q = mu.map((m) => -m);
  const solveAt = (extra: number) =>
    solveConstrained(cov.map((row) => row.map((v) => (riskAversion + extra) * v)), q, tickers, { ...c, targetVol: undefined });

  let w = solveAt(0);
  if (c.targetVol !== undefined && portfolioVol(w, cov) > c.targetVol + 1e-6) {
    let lo = 0;
    let hi = 1;
    let wHi = solveAt(hi);
    while (portfolioVol(wHi, cov) > c.targetVol) {
      hi *= 4;
      if (hi > 1e8) {
        throw new OptimizationError(
          `target_vol=${pct(c.targetVol)} is below the minimum achievable volatility for this universe and constraints.`
        );
      }
      wHi = solveAt(hi);
    }
    for (let k = 0; k < 40; k += 1) {
      const mid = Math.sqrt(Math.max(lo, 1e-9) * hi);
      const wMid = solveAt(mid);
      if (portfolioVol(wMid, cov) > c.targetVol) lo = mid;
      else {
        hi = mid;
        wHi = wMid;
      }
      if (hi - lo < 1e-6 * hi) break;
    }
    w = wHi;
  }
  return clean(w, tickers, c.longOnly);
}

/** Equal risk contribution via Newton's method on ½xᵀΣx − Σ bᵢ log xᵢ. */
export function riskParity(tickers: string[], cov: Matrix): Weights {
  const n = tickers.length;
  const b = new Array(n).fill(1 / n);
  let x = cov.map((row, i) => 1 / Math.sqrt(row[i]));
  const f = (v: number[]) => 0.5 * dot(v, matVec(cov, v)) - v.reduce((s, vi, i) => s + b[i] * Math.log(vi), 0);

  for (let iter = 0; iter < 100; iter += 1) {
    const sx = matVec(cov, x);
    const g = sx.map((v, i) => v - b[i] / x[i]);
    const H = cov.map((row, i) => row.map((v, j) => v + (i === j ? b[i] / (x[i] * x[i]) : 0)));
    const dx = solve(new MlMatrix(H), MlMatrix.columnVector(g)).to1DArray().map((v) => -v);
    const decrement = -dot(g, dx);
    if (decrement / 2 < 1e-14) break;
    let t = 1;
    while (x.some((xi, i) => xi + t * dx[i] <= 0)) t *= 0.5;
    const f0 = f(x);
    while (f(x.map((xi, i) => xi + t * dx[i])) > f0 - 0.25 * t * decrement && t > 1e-12) t *= 0.5;
    x = x.map((xi, i) => xi + t * dx[i]);
  }
  return clean(x, tickers, true);
}

function clusterVar(cov: Matrix, idx: number[]): number {
  const ivp = idx.map((i) => 1 / cov[i][i]);
  const total = ivp.reduce((a, b) => a + b, 0);
  const w = ivp.map((v) => v / total);
  let s = 0;
  idx.forEach((i, a) => idx.forEach((j, b) => (s += w[a] * cov[i][j] * w[b])));
  return s;
}

/** Leaf order of a single-linkage dendrogram (same traversal as scipy's leaves_list). */
function singleLinkageOrder(dist: Matrix): number[] {
  const n = dist.length;
  const clusters = new Map<number, number[]>(Array.from({ length: n }, (_, i) => [i, [i]]));
  let nextId = n;
  while (clusters.size > 1) {
    let best: [number, number, number] = [-1, -1, Infinity];
    const ids = Array.from(clusters.keys());
    for (let a = 0; a < ids.length; a += 1) {
      for (let b = a + 1; b < ids.length; b += 1) {
        let d = Infinity;
        for (const i of clusters.get(ids[a])!) for (const j of clusters.get(ids[b])!) d = Math.min(d, dist[i][j]);
        if (d < best[2]) best = [ids[a], ids[b], d];
      }
    }
    const [a, b] = best[0] < best[1] ? [best[0], best[1]] : [best[1], best[0]];
    clusters.set(nextId, [...clusters.get(a)!, ...clusters.get(b)!]);
    clusters.delete(a);
    clusters.delete(b);
    nextId += 1;
  }
  return Array.from(clusters.values())[0];
}

/** Hierarchical Risk Parity (López de Prado, 2016). */
export function hrp(tickers: string[], cov: Matrix): Weights {
  const n = tickers.length;
  if (n === 1) return { [tickers[0]]: 1 };
  const sd = cov.map((row, i) => Math.sqrt(row[i]));
  const dist = cov.map((row, i) =>
    row.map((v, j) => (i === j ? 0 : Math.sqrt(Math.max(0.5 * (1 - Math.min(Math.max(v / (sd[i] * sd[j]), -1), 1)), 0))))
  );
  const order = singleLinkageOrder(dist);
  const w = new Array(n).fill(1);
  let clusters = [order];
  while (clusters.length) {
    const next: number[][] = [];
    for (const cl of clusters) {
      if (cl.length < 2) continue;
      const left = cl.slice(0, Math.floor(cl.length / 2));
      const right = cl.slice(Math.floor(cl.length / 2));
      const vl = clusterVar(cov, left);
      const vr = clusterVar(cov, right);
      const alpha = 1 - vl / (vl + vr);
      left.forEach((i) => (w[i] *= alpha));
      right.forEach((i) => (w[i] *= 1 - alpha));
      next.push(left, right);
    }
    clusters = next;
  }
  const total = w.reduce((a, b) => a + b, 0);
  return Object.fromEntries(tickers.map((t, i) => [t, w[i] / total]));
}

/** Reverse-optimized returns that make the market weights mean-variance optimal (π = δΣw). */
export function impliedEquilibriumReturns(
  tickers: string[],
  cov: Matrix,
  marketWeights: Weights | undefined,
  riskAversion: number
): number[] {
  const raw = tickers.map((t) => (marketWeights ? marketWeights[t] ?? 0 : 1 / tickers.length));
  const total = raw.reduce((a, b) => a + b, 0);
  if (total <= 0) throw new OptimizationError('market_weights must include at least one ticker in the universe.');
  return matVec(cov, raw.map((v) => v / total)).map((v) => riskAversion * v);
}

/**
 * Returns [prior π, posterior μ_BL]. View uncertainty uses Ω_kk = τ·p_kΣp_kᵀ·(1−c)/c, so
 * confidence c=0.5 weights the view equally with the prior and c→1 forces the posterior onto it.
 */
export function blackLittermanReturns(
  tickers: string[],
  cov: Matrix,
  views: View[],
  marketWeights: Weights | undefined,
  riskAversion: number,
  tau = 0.05
): [number[], number[]] {
  const pi = impliedEquilibriumReturns(tickers, cov, marketWeights, riskAversion);
  if (!views.length) return [pi, [...pi]];
  const pos = new Map(tickers.map((t, i) => [t, i]));
  const n = tickers.length;
  const P: Matrix = [];
  const Q: number[] = [];
  const omega: number[] = [];
  for (const v of views) {
    for (const name of [v.asset, v.relativeTo].filter(Boolean) as string[]) {
      if (!pos.has(name.toUpperCase())) {
        throw new OptimizationError(`View references '${name}', which is not in the universe ${tickers.join(', ')}.`);
      }
    }
    const p = new Array(n).fill(0);
    p[pos.get(v.asset.toUpperCase())!] = 1;
    if (v.relativeTo) p[pos.get(v.relativeTo.toUpperCase())!] = -1;
    const conf = Math.min(Math.max(v.confidence, 0.01), 0.99);
    P.push(p);
    Q.push(v.expectedReturn);
    omega.push(tau * dot(p, matVec(cov, p)) * ((1 - conf) / conf));
  }
  const tSinv = inverse(new MlMatrix(cov.map((row) => row.map((x) => tau * x)))).to2DArray();
  const A = tSinv.map((row, i) =>
    row.map((x, j) => x + P.reduce((s, p, k) => s + (p[i] * p[j]) / omega[k], 0))
  );
  const rhs = matVec(tSinv, pi).map((x, i) => x + P.reduce((s, p, k) => s + (p[i] * Q[k]) / omega[k], 0));
  const mu = solve(new MlMatrix(A), MlMatrix.columnVector(rhs)).to1DArray();
  return [pi, mu];
}

export function checkConstraints(
  tickers: string[],
  w: number[],
  cov: Matrix,
  c: Constraints,
  tol = 1e-4
): { binding: string[]; violated: string[] } {
  const binding: string[] = [];
  const violated: string[] = [];
  const classify = (label: string, value: number, limit: number, upper = true) => {
    const gap = upper ? limit - value : value - limit;
    if (gap < -tol) violated.push(`${label}: ${pct(value)} vs limit ${pct(limit)}`);
    else if (gap <= tol * 10) binding.push(`${label} at limit ${pct(limit)}`);
  };

  if (c.longOnly) {
    tickers.forEach((t, i) => {
      if (w[i] < -tol) violated.push(`${t}: short ${pct(w[i])} under long_only`);
    });
  }
  if (c.maxWeight !== undefined) tickers.forEach((t, i) => classify(`${t} weight`, w[i], c.maxWeight!));
  if (c.minWeight !== undefined) tickers.forEach((t, i) => classify(`${t} weight (min)`, w[i], c.minWeight!, false));
  for (const [sector, cap] of Object.entries(c.sectorCaps)) {
    classify(`${sector} sector`, sectorMembers(c, tickers, sector).reduce((s, i) => s + w[i], 0), cap);
  }
  if (c.maxTurnover !== undefined && Object.keys(c.currentWeights).length) {
    const cur = currentVector(c, tickers);
    classify('turnover', w.reduce((s, x, i) => s + Math.abs(x - cur[i]), 0), c.maxTurnover);
  }
  if (c.targetVol !== undefined) classify('portfolio vol', portfolioVol(w, cov), c.targetVol);
  return { binding, violated };
}
