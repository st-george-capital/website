import { Matrix as MlMatrix, inverse } from 'ml-matrix';
import type { Matrix } from './risk';

/**
 * Dense convex QP solver (OSQP-style ADMM):
 *   minimize ½ xᵀPx + qᵀx   subject to   l ≤ Ax ≤ u
 * Sized for portfolio problems (tens of variables), so the KKT matrix is inverted directly.
 */
export interface QPProblem {
  P: Matrix;
  q: number[];
  A: Matrix;
  l: number[];
  u: number[];
}

export interface QPResult {
  x: number[];
  converged: boolean;
  primalResidual: number;
  iterations: number;
}

const SIGMA = 1e-6;
const ALPHA = 1.6;
const EQ_RHO_SCALE = 1e3;

function normInf(v: number[]): number {
  let m = 0;
  for (const x of v) m = Math.max(m, Math.abs(x));
  return m;
}

function mul(m: Matrix, v: number[]): number[] {
  return m.map((row) => row.reduce((s, a, j) => s + a * v[j], 0));
}

function mulT(m: Matrix, v: number[], n: number): number[] {
  const out = new Array(n).fill(0);
  m.forEach((row, i) => row.forEach((a, j) => (out[j] += a * v[i])));
  return out;
}

function factor(P: Matrix, A: Matrix, rho: number[]): Matrix {
  const n = P.length;
  const K = P.map((row, i) => row.map((v, j) => v + (i === j ? SIGMA : 0)));
  A.forEach((row, k) => {
    for (let i = 0; i < n; i += 1) {
      if (row[i] === 0) continue;
      for (let j = 0; j < n; j += 1) K[i][j] += rho[k] * row[i] * row[j];
    }
  });
  return inverse(new MlMatrix(K)).to2DArray();
}

export function solveQP({ P, q, A, l, u }: QPProblem, maxIter = 20000, epsAbs = 1e-8, epsRel = 1e-7): QPResult {
  const n = q.length;
  const m = A.length;
  const isEq = l.map((lo, i) => Math.abs(u[i] - lo) < 1e-12);
  let rhoBase = 0.1;
  const rhoVec = () => isEq.map((eq) => (eq ? rhoBase * EQ_RHO_SCALE : rhoBase));
  let rho = rhoVec();
  let Kinv = factor(P, A, rho);

  let x = new Array(n).fill(0);
  let z = new Array(m).fill(0).map((_, i) => Math.min(Math.max(0, l[i]), u[i]));
  let y = new Array(m).fill(0);
  let primalResidual = Infinity;

  for (let iter = 1; iter <= maxIter; iter += 1) {
    const rhs = mulT(A, z.map((zi, i) => rho[i] * zi - y[i]), n).map((v, j) => v + SIGMA * x[j] - q[j]);
    const xTilde = mul(Kinv, rhs);
    const zTilde = mul(A, xTilde);
    x = xTilde.map((v, j) => ALPHA * v + (1 - ALPHA) * x[j]);
    const zRelaxed = zTilde.map((v, i) => ALPHA * v + (1 - ALPHA) * z[i]);
    const zNext = zRelaxed.map((v, i) => Math.min(Math.max(v + y[i] / rho[i], l[i]), u[i]));
    y = y.map((yi, i) => yi + rho[i] * (zRelaxed[i] - zNext[i]));
    z = zNext;

    if (iter % 25 === 0 || iter === maxIter) {
      const Ax = mul(A, x);
      const Px = mul(P, x);
      const ATy = mulT(A, y, n);
      primalResidual = normInf(Ax.map((v, i) => v - z[i]));
      const dualResidual = normInf(Px.map((v, j) => v + q[j] + ATy[j]));
      const primalScale = Math.max(normInf(Ax), normInf(z));
      const dualScale = Math.max(normInf(Px), normInf(ATy), normInf(q));
      if (primalResidual <= epsAbs + epsRel * primalScale && dualResidual <= epsAbs + epsRel * dualScale) {
        return { x, converged: true, primalResidual, iterations: iter };
      }
      if (iter % 100 === 0) {
        const ratio = Math.sqrt(
          (primalResidual / (primalScale + 1e-12)) / (dualResidual / (dualScale + 1e-12) + 1e-12)
        );
        const next = Math.min(Math.max(rhoBase * ratio, 1e-6), 1e6);
        if (next > rhoBase * 5 || next < rhoBase / 5) {
          rhoBase = next;
          rho = rhoVec();
          Kinv = factor(P, A, rho);
        }
      }
    }
  }
  return { x, converged: false, primalResidual, iterations: maxIter };
}
