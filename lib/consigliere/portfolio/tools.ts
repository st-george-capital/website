import {
  TRADING_DAYS,
  diversificationRatio,
  effectiveN,
  estimateCovariance,
  performanceStats,
  portfolioVol,
  riskContributions,
  type CovMethod,
  type Matrix,
} from './risk';
import {
  OptimizationError,
  blackLittermanReturns,
  checkConstraints,
  currentVector,
  emptyConstraints,
  equalWeight,
  hrp,
  inverseVol,
  meanVariance,
  minVariance,
  riskParity,
  type Constraints,
  type View,
  type Weights,
} from './optimize';
import { walkForward, type RebalanceFreq } from './backtest';
import { loadReturns, loadSectors, normalizeTickers, type ReturnsFrame } from './data';

export const METHODS = [
  'equal_weight',
  'inverse_vol',
  'min_variance',
  'mean_variance',
  'risk_parity',
  'hrp',
  'black_litterman',
] as const;
export type Method = (typeof METHODS)[number];
const CONSTRAINED_METHODS = new Set<Method>(['min_variance', 'mean_variance', 'black_litterman']);

const r = (x: number, nd = 4) => Number(x.toFixed(nd));

function sortedDict(entries: Array<[string, number]>, nd = 4, dropZero = false): Record<string, number> {
  return Object.fromEntries(
    entries
      .filter(([, v]) => !(dropZero && Math.abs(v) < 1e-4))
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => [k, r(v, nd)])
  );
}

function upperKeys<T>(d: Record<string, T> | undefined): Record<string, T> {
  return Object.fromEntries(Object.entries(d ?? {}).map(([k, v]) => [k.trim().toUpperCase(), v]));
}

function concentration(w: number[], rc: number[]) {
  // Equal weights always give effective_positions_by_weight == N; the risk-based figure reveals concentration.
  return {
    effective_positions_by_weight: r(effectiveN(w), 2),
    effective_positions_by_risk: r(effectiveN(rc.map((x) => Math.max(x, 0))), 2),
  };
}

async function trailingReturns(tickers: string[], lookbackYears: number) {
  // Year-aligned start date keeps the price cache key stable for a whole year.
  const start = `${new Date().getUTCFullYear() - Math.ceil(lookbackYears) - 1}-01-01`;
  const frame = await loadReturns(tickers, start);
  const n = Math.floor(lookbackYears * TRADING_DAYS);
  if (frame.values.length < Math.min(n, 60)) {
    throw new Error(`Only ${frame.values.length} days of overlapping history for ${tickers.join(', ')}; need at least 60.`);
  }
  return { ...frame, dates: frame.dates.slice(-n), values: frame.values.slice(-n) };
}

const windowLabel = (f: ReturnsFrame) => `${f.dates[0]} to ${f.dates[f.dates.length - 1]} (${f.dates.length} trading days)`;

async function buildConstraints(
  tickers: string[],
  args: {
    max_weight?: number;
    min_weight?: number;
    sector_caps?: Record<string, number>;
    sector_map?: Record<string, string>;
    current_weights?: Record<string, number>;
    max_turnover?: number;
    target_vol?: number;
  }
): Promise<Constraints> {
  let sectorMap = upperKeys(args.sector_map);
  if (args.sector_caps && Object.keys(args.sector_caps).length && !Object.keys(sectorMap).length) {
    sectorMap = await loadSectors(tickers);
  }
  return emptyConstraints({
    maxWeight: args.max_weight,
    minWeight: args.min_weight,
    sectorMap,
    sectorCaps: { ...(args.sector_caps ?? {}) },
    currentWeights: upperKeys(args.current_weights),
    maxTurnover: args.max_turnover,
    targetVol: args.target_vol,
  });
}

interface WeightsResult {
  weights: Weights;
  cov: Matrix;
  mu: number[] | null;
  extras: Record<string, unknown>;
}

function weightsFor(
  method: Method,
  frame: ReturnsFrame,
  covarianceMethod: CovMethod,
  c: Constraints,
  riskAversion = 2.5,
  expectedReturns?: Record<string, number>,
  views: View[] = [],
  marketWeights?: Record<string, number>
): WeightsResult {
  const { tickers } = frame;
  const cov = estimateCovariance(frame.values, covarianceMethod);
  const extras: Record<string, unknown> = {};
  let mu: number[] | null = null;
  let weights: Weights;

  if (method === 'equal_weight') weights = equalWeight(tickers);
  else if (method === 'inverse_vol') weights = inverseVol(tickers, cov);
  else if (method === 'risk_parity') weights = riskParity(tickers, cov);
  else if (method === 'hrp') weights = hrp(tickers, cov);
  else if (method === 'min_variance') weights = minVariance(tickers, cov, c);
  else if (method === 'mean_variance') {
    if (expectedReturns && Object.keys(expectedReturns).length) {
      const er = upperKeys(expectedReturns);
      const missing = tickers.filter((t) => er[t] === undefined);
      if (missing.length) throw new Error(`expected_returns is missing: ${missing.join(', ')}`);
      mu = tickers.map((t) => er[t]);
      extras.expected_returns_source = 'user-supplied';
    } else {
      mu = tickers.map((_, j) => (frame.values.reduce((s, row) => s + row[j], 0) / frame.values.length) * TRADING_DAYS);
      extras.expected_returns_source = 'trailing historical mean (very noisy; weights will be unstable)';
    }
    weights = meanVariance(mu, tickers, cov, riskAversion, c);
  } else if (method === 'black_litterman') {
    const mkt = marketWeights ? upperKeys(marketWeights) : undefined;
    const [prior, posterior] = blackLittermanReturns(tickers, cov, views, mkt, riskAversion);
    mu = posterior;
    weights = meanVariance(posterior, tickers, cov, riskAversion, c);
    extras.prior_returns = sortedDict(tickers.map((t, i) => [t, prior[i]]));
    extras.posterior_returns = sortedDict(tickers.map((t, i) => [t, posterior[i]]));
    extras.prior_weights = marketWeights ? 'market_weights' : 'equal weight (no market caps given)';
  } else {
    throw new Error(`Unknown method '${method}'. Choose from ${METHODS.join(', ')}.`);
  }
  return { weights, cov, mu, extras };
}

export interface AnalyzeArgs {
  weights: Record<string, number>;
  lookback_years?: number;
  covariance_method?: CovMethod;
  include_sectors?: boolean;
}

export async function analyzePortfolio(args: AnalyzeArgs) {
  const wd = upperKeys(args.weights);
  const tickers = normalizeTickers(Object.keys(wd));
  const raw = tickers.map((t) => Number(wd[t]));
  const total = raw.reduce((a, b) => a + b, 0);
  if (!(total > 0)) throw new Error('Weights must sum to a positive number.');
  const w = raw.map((x) => x / total);
  const covarianceMethod = args.covariance_method ?? 'ledoit_wolf';

  const frame = await trailingReturns(tickers, args.lookback_years ?? 3);
  const cov = estimateCovariance(frame.values, covarianceMethod);
  const rc = riskContributions(w, cov);

  const positions = tickers
    .map((t, i) => ({ ticker: t, weight: r(w[i]), asset_vol: r(Math.sqrt(cov[i][i])), risk_contribution: r(rc[i]) }))
    .sort((a, b) => b.risk_contribution - a.risk_contribution);

  const sampleCov = estimateCovariance(frame.values, 'sample');
  const sd = sampleCov.map((row, i) => Math.sqrt(row[i]));
  const pairs: Array<[string, number]> = [];
  for (let i = 0; i < tickers.length; i += 1) {
    for (let j = i + 1; j < tickers.length; j += 1) pairs.push([`${tickers[i]}/${tickers[j]}`, sampleCov[i][j] / (sd[i] * sd[j])]);
  }
  pairs.sort((a, b) => b[1] - a[1]);

  const portReturns = frame.values.map((row) => row.reduce((s, x, j) => s + x * w[j], 0));
  const report: Record<string, unknown> = {
    window: windowLabel(frame),
    covariance_method: covarianceMethod,
    data_sources: frame.sources,
    annual_volatility: r(portfolioVol(w, cov)),
    ...concentration(w, rc),
    diversification_ratio: r(diversificationRatio(w, cov), 3),
    positions,
    historical_fixed_weight: Object.fromEntries(Object.entries(performanceStats(portReturns)).map(([k, v]) => [k, r(v)])),
    most_correlated_pairs: pairs.slice(0, 5).map(([pair, c]) => ({ pair, corr: r(c, 3) })),
  };
  if (args.include_sectors) {
    const smap = await loadSectors(tickers);
    const sectors: Record<string, { weight: number; risk_contribution: number }> = {};
    tickers.forEach((t, i) => {
      const s = (sectors[smap[t]] ??= { weight: 0, risk_contribution: 0 });
      s.weight += w[i];
      s.risk_contribution += rc[i];
    });
    report.sectors = Object.fromEntries(
      Object.entries(sectors)
        .sort((a, b) => b[1].weight - a[1].weight)
        .map(([k, v]) => [k, { weight: r(v.weight), risk_contribution: r(v.risk_contribution) }])
    );
  }
  return report;
}

export interface OptimizeArgs {
  tickers: string[];
  method?: Method;
  covariance_method?: CovMethod;
  lookback_years?: number;
  max_weight?: number;
  min_weight?: number;
  sector_caps?: Record<string, number>;
  sector_map?: Record<string, string>;
  current_weights?: Record<string, number>;
  max_turnover?: number;
  target_vol?: number;
  risk_aversion?: number;
  expected_returns?: Record<string, number>;
  views?: Array<{ asset: string; expected_return: number; confidence?: number; relative_to?: string }>;
  market_weights?: Record<string, number>;
}

export async function optimizePortfolio(args: OptimizeArgs) {
  const tickers = normalizeTickers(args.tickers);
  const method = args.method ?? 'min_variance';
  const covarianceMethod = args.covariance_method ?? 'ledoit_wolf';
  const frame = await trailingReturns(tickers, args.lookback_years ?? 3);
  const c = await buildConstraints(tickers, args);
  const views: View[] = (args.views ?? []).map((v) => ({
    asset: v.asset,
    expectedReturn: Number(v.expected_return),
    confidence: Number(v.confidence ?? 0.5),
    relativeTo: v.relative_to || undefined,
  }));

  const { weights, cov, mu, extras } = weightsFor(
    method,
    frame,
    covarianceMethod,
    c,
    args.risk_aversion ?? 2.5,
    args.expected_returns,
    views,
    args.market_weights
  );
  const w = tickers.map((t) => weights[t]);
  const rc = riskContributions(w, cov);
  const notes: string[] = [];
  if (!CONSTRAINED_METHODS.has(method) && [args.max_weight, args.min_weight, args.sector_caps, args.max_turnover, args.target_vol].some((x) => x !== undefined)) {
    notes.push(`'${method}' is a heuristic and does not enforce constraints; see constraints.violated.`);
  }
  if (method === 'black_litterman' && !views.length) {
    notes.push('No views given, so Black-Litterman returns the prior (equilibrium) portfolio.');
  }

  const result: Record<string, unknown> = {
    method,
    covariance_method: covarianceMethod,
    window: windowLabel(frame),
    data_sources: frame.sources,
    weights: sortedDict(tickers.map((t, i) => [t, w[i]]), 4, true),
    annual_volatility: r(portfolioVol(w, cov)),
    ...concentration(w, rc),
    diversification_ratio: r(diversificationRatio(w, cov), 3),
    risk_contributions: sortedDict(tickers.map((t, i) => [t, rc[i]]), 4, true),
    constraints: checkConstraints(tickers, w, cov, c),
  };
  if (mu) result.expected_annual_return = r(mu.reduce((s, m, i) => s + m * w[i], 0));
  if (Object.keys(c.currentWeights).length) {
    const cur = currentVector(c, tickers);
    const trades = tickers.map((t, i) => [t, w[i] - cur[i]] as [string, number]).filter(([, d]) => Math.abs(d) > 1e-4);
    result.trades = sortedDict(trades);
    result.turnover = r(tickers.reduce((s, _, i) => s + Math.abs(w[i] - cur[i]), 0));
    const outside = Object.keys(c.currentWeights).filter((t) => !tickers.includes(t));
    if (outside.length) notes.push(`current_weights includes tickers outside the universe (ignored): ${outside.join(', ')}.`);
  }
  Object.assign(result, extras);
  if (notes.length) result.notes = notes;
  return result;
}

export interface CompareArgs {
  tickers: string[];
  methods?: Method[];
  start?: string;
  lookback_days?: number;
  rebalance?: RebalanceFreq;
  cost_bps?: number;
  covariance_method?: CovMethod;
  max_weight?: number;
}

export async function compareMethods(args: CompareArgs) {
  const tickers = normalizeTickers(args.tickers);
  const methods = args.methods?.length ? args.methods : (['equal_weight', 'inverse_vol', 'min_variance', 'risk_parity', 'hrp', 'mean_variance'] as Method[]);
  const lookback = args.lookback_days ?? 252;
  const freq = args.rebalance ?? 'M';
  const costBps = args.cost_bps ?? 10;
  const covarianceMethod = args.covariance_method ?? 'ledoit_wolf';
  const frame = await loadReturns(tickers, args.start ?? '2015-01-01');
  const c = emptyConstraints({ maxWeight: args.max_weight });

  const rows: Array<Record<string, number | string>> = [];
  const errors: Record<string, string> = {};
  for (const m of methods) {
    try {
      const summary = walkForward(
        frame,
        (window) => {
          const { weights } = weightsFor(m, window, covarianceMethod, c);
          return tickers.map((t) => weights[t] ?? 0);
        },
        lookback,
        freq,
        costBps
      );
      rows.push({ method: m, ...Object.fromEntries(Object.entries(summary).map(([k, v]) => [k, r(v)])) });
    } catch (err) {
      // One failing method shouldn't sink the comparison.
      errors[m] = err instanceof Error ? err.message : String(err);
    }
  }
  rows.sort((a, b) => Number(b.sharpe_rf0) - Number(a.sharpe_rf0));

  const out: Record<string, unknown> = {
    universe: tickers,
    data_sources: frame.sources,
    test_period: frame.dates.length > lookback ? `${frame.dates[lookback]} to ${frame.dates[frame.dates.length - 1]}` : 'insufficient history',
    setup: `${lookback}-day trailing estimation, rebalance=${freq}, costs=${costBps}bps, cov=${covarianceMethod}`,
    results: rows,
    caveat: 'Single historical path; differences in Sharpe below ~0.3 are usually not statistically meaningful.',
  };
  if (Object.keys(errors).length) out.errors = errors;
  return out;
}

export async function getSectors(args: { tickers: string[] }) {
  return loadSectors(normalizeTickers(args.tickers));
}

export { OptimizationError };
