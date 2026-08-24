// CVaR (Conditional Value-at-Risk) portfolio optimizer core.
//
// Implements the Rockafellar & Uryasev (2000) "Optimization of Conditional Value-at-Risk"
// linearization of CVaR minimization via historical simulation, solved as a linear program
// by javascript-lp-solver (pure JS, no native bindings — safe for Vercel serverless).
//
// Formulation (minimize CVaR at confidence level alpha over S historical scenarios):
//
//   minimize:   zeta + (1 / (S * (1 - alpha))) * sum_s(u_s)
//   subject to: u_s >= -(w . r_s) - zeta,   u_s >= 0        (per scenario s)
//               sum_i(w_i) = 1,             w_i >= 0         (long-only, fully invested)
//               w_i <= maxSinglePositionWeight
//               sum_{i in sector k}(w_i) in [min_k, max_k]   (per sector)
//               sum_{i in region k}(w_i) in [min_k, max_k]   (per region — encodes the
//                                                              ~57.5% US target)
//               sum_i(w_i * factorExposure_i,f) >= factorTarget_f   (per factor floor)
//               [optional] sum_i(|w_i - currentWeight_i|) <= 2 * turnoverLimit
//
// zeta is the Value-at-Risk (VaR) at the target confidence level; u_s is the (linearized)
// shortfall beyond VaR in scenario s. This is the textbook RU linear-programming
// reformulation of CVaR minimization — CVaR is NOT computed by first computing VaR and
// then averaging the tail by hand; zeta emerges as the optimal threshold from the LP
// itself, and expected CVaR = the LP's optimal objective value.
//
// BENCHMARK (URTH) ROLE: reporting/comparison only. benchmarkCVaR is computed over the
// same scenario set for context, but URTH is NOT a hard tracking-error constraint — a
// tracking-error constraint would be in tension with deliberately expressing a conviction
// tilt (the whole point of this tool), and true per-constituent benchmark weights aren't
// available from Polygon/Alpha Vantage anyway. This scoping choice is stated explicitly
// in the research report.

import solver from 'javascript-lp-solver';
import type { LPModel, LPSolution } from 'javascript-lp-solver';

export const BENCHMARK_TICKER = 'URTH'; // iShares MSCI World ETF — MSCI World tracking proxy

export interface PriceHistoryPoint {
  ticker: string;
  date: Date;
  close: number;
}

export interface ScenarioMatrix {
  /** Trading dates used as scenario endpoints (aligned across all tickers). */
  dates: Date[];
  /** ticker -> array of horizon-period returns, one per scenario, aligned to `dates`. */
  returnsByTicker: Record<string, number[]>;
  /** Number of overlapping scenarios. */
  scenarioCount: number;
  horizonDays: number;
}

export interface ConstraintBand {
  min: number;
  max: number;
}

export interface ConstraintSetInput {
  sectorLimits: Record<string, ConstraintBand>;
  regionLimits: Record<string, ConstraintBand>;
  factorTilts: Record<string, { target: number }>;
  maxSinglePositionWeight: number;
  turnoverLimit?: number | null;
  cvarConfidence: number;
  cvarHorizonDays: number;
}

export interface HoldingUniverseEntry {
  ticker: string;
  sector: string | null;
  region: string | null;
  currentWeight: number;
}

export interface FactorExposureMap {
  // ticker -> factor name -> z-score
  [ticker: string]: Record<string, number | null>;
}

/**
 * Builds rolling `horizonDays`-day overlapping return windows from daily close prices,
 * with dates aligned across all tickers via an inner join on trading dates (only dates
 * present for every ticker are used) — this preserves real historical co-movement, which
 * is essential for CVaR (a portfolio-level, not single-asset, risk measure).
 *
 * Overlapping windows means consecutive scenarios share most of their underlying daily
 * returns — this is a known limitation (scenarios are not independent, understating true
 * tail uncertainty), stated explicitly in the report's limitations section.
 */
export function buildScenarioMatrix(
  priceHistoryByTicker: Record<string, PriceHistoryPoint[]>,
  horizonDays: number = 20
): ScenarioMatrix {
  const tickers = Object.keys(priceHistoryByTicker);
  if (tickers.length === 0) {
    return { dates: [], returnsByTicker: {}, scenarioCount: 0, horizonDays };
  }

  // Build ticker -> Map(dateString -> close) for fast lookups.
  const closesByTicker: Record<string, Map<string, number>> = {};
  const dateSetsByTicker: Record<string, Set<string>> = {};
  for (const ticker of tickers) {
    const map = new Map<string, number>();
    const rows = [...priceHistoryByTicker[ticker]].sort((a, b) => a.date.getTime() - b.date.getTime());
    for (const row of rows) {
      map.set(row.date.toISOString().slice(0, 10), row.close);
    }
    closesByTicker[ticker] = map;
    dateSetsByTicker[ticker] = new Set(map.keys());
  }

  // Inner join: dates present for every ticker.
  let commonDates = [...dateSetsByTicker[tickers[0]]];
  for (const ticker of tickers.slice(1)) {
    const set = dateSetsByTicker[ticker];
    commonDates = commonDates.filter((d) => set.has(d));
  }
  commonDates.sort();

  if (commonDates.length < horizonDays + 2) {
    return { dates: [], returnsByTicker: {}, scenarioCount: 0, horizonDays };
  }

  const scenarioDates: Date[] = [];
  const returnsByTicker: Record<string, number[]> = {};
  for (const ticker of tickers) returnsByTicker[ticker] = [];

  for (let i = horizonDays; i < commonDates.length; i++) {
    const endDate = commonDates[i];
    const startDate = commonDates[i - horizonDays];
    let valid = true;
    const rowReturns: Record<string, number> = {};

    for (const ticker of tickers) {
      const closeMap = closesByTicker[ticker];
      const startClose = closeMap.get(startDate);
      const endClose = closeMap.get(endDate);
      if (startClose === undefined || endClose === undefined || startClose <= 0) {
        valid = false;
        break;
      }
      rowReturns[ticker] = (endClose - startClose) / startClose;
    }

    if (!valid) continue;

    scenarioDates.push(new Date(`${endDate}T00:00:00Z`));
    for (const ticker of tickers) {
      returnsByTicker[ticker].push(rowReturns[ticker]);
    }
  }

  return {
    dates: scenarioDates,
    returnsByTicker,
    scenarioCount: scenarioDates.length,
    horizonDays,
  };
}

export interface LPBuildResult {
  model: LPModel;
  tickers: string[];
  scenarioCount: number;
}

/**
 * Assembles the javascript-lp-solver model for the RU CVaR-minimization LP described at
 * the top of this file. Variables: w_i (weight per ticker), zeta (VaR threshold), u_s
 * (per-scenario shortfall slack).
 */
export function buildLPModel(
  scenarios: ScenarioMatrix,
  factorExposures: FactorExposureMap,
  universe: HoldingUniverseEntry[],
  constraintSet: ConstraintSetInput
): LPBuildResult {
  const tickers = universe.map((u) => u.ticker);
  const S = scenarios.scenarioCount;
  const alpha = constraintSet.cvarConfidence;
  const cvarScale = 1 / (S * (1 - alpha));

  const variables: LPModel['variables'] = {};
  const constraints: LPModel['constraints'] = {};

  // Weight variables w_i.
  for (const entry of universe) {
    const v: Record<string, number> = {
      objective: 0, // weights don't enter the CVaR objective directly
      sum_to_one: 1,
    };
    v[`max_pos_${entry.ticker}`] = 1;

    // Sector membership.
    if (entry.sector && constraintSet.sectorLimits[entry.sector]) {
      v[`sector_min_${entry.sector}`] = 1;
      v[`sector_max_${entry.sector}`] = 1;
    }
    // Region membership.
    if (entry.region && constraintSet.regionLimits[entry.region]) {
      v[`region_min_${entry.region}`] = 1;
      v[`region_max_${entry.region}`] = 1;
    }
    // Factor floors: coefficient is the ticker's exposure to that factor.
    for (const factorName of Object.keys(constraintSet.factorTilts)) {
      const exposure = factorExposures[entry.ticker]?.[factorName];
      if (exposure !== undefined && exposure !== null) {
        v[`factor_${factorName}`] = exposure;
      }
    }
    // Turnover (linearized via a separate pair of slack constraints below, using an
    // auxiliary variable's coefficients here).
    variables[`w_${entry.ticker}`] = v;
  }

  // Per-scenario u_s variables and shortfall constraints:
  //   u_s >= -(w . r_s) - zeta   <=>   u_s + zeta + sum_i(r_s,i * w_i) >= 0
  //   u_s >= 0
  for (let s = 0; s < S; s++) {
    const constraintName = `shortfall_${s}`;
    constraints[constraintName] = { min: 0 };

    // u_s coefficient = 1, zeta coefficient = 1, w_i coefficient = r_s,i — all attached to
    // the *variable* definitions (javascript-lp-solver's model shape is variable-centric).
    variables[`u_${s}`] = {
      ...(variables[`u_${s}`] || {}),
      objective: cvarScale,
      [constraintName]: 1,
    };
  }
  variables['zeta'] = { objective: 1 };
  for (let s = 0; s < S; s++) {
    variables['zeta'][`shortfall_${s}`] = 1;
  }
  for (const entry of universe) {
    const wVar = variables[`w_${entry.ticker}`];
    for (let s = 0; s < S; s++) {
      const r = scenarios.returnsByTicker[entry.ticker]?.[s] ?? 0;
      wVar[`shortfall_${s}`] = r;
    }
  }

  // Sum-to-one (fully invested, long-only via variable lower bound 0 default in the solver).
  constraints['sum_to_one'] = { equal: 1 };

  // Max single position weight.
  for (const entry of universe) {
    constraints[`max_pos_${entry.ticker}`] = { max: constraintSet.maxSinglePositionWeight };
  }

  // Sector bands.
  for (const [sector, band] of Object.entries(constraintSet.sectorLimits)) {
    constraints[`sector_min_${sector}`] = { min: band.min };
    constraints[`sector_max_${sector}`] = { max: band.max };
  }

  // Region bands.
  for (const [region, band] of Object.entries(constraintSet.regionLimits)) {
    constraints[`region_min_${region}`] = { min: band.min };
    constraints[`region_max_${region}`] = { max: band.max };
  }

  // Factor floors: sum_i(w_i * exposure_i,f) >= target_f.
  for (const [factorName, tilt] of Object.entries(constraintSet.factorTilts)) {
    constraints[`factor_${factorName}`] = { min: tilt.target };
  }

  // Optional turnover constraint: sum|w_i - currentWeight_i| <= 2*turnoverLimit.
  // Linearized per-ticker as d_i >= w_i - currentWeight_i AND d_i >= currentWeight_i - w_i
  // (i.e. d_i >= |w_i - currentWeight_i| at the optimum, since the solver minimizes cost
  // and d_i only appears with a positive coefficient in the aggregate turnover_total
  // constraint below — it will never be pushed above the true absolute difference), then
  // sum_i(d_i) <= 2*turnoverLimit.
  //   turnover_pos_i:  d_i - w_i >= -currentWeight_i   (<=>  d_i >= w_i - currentWeight_i)
  //   turnover_neg_i:  d_i + w_i >= currentWeight_i    (<=>  d_i >= currentWeight_i - w_i)
  if (constraintSet.turnoverLimit !== null && constraintSet.turnoverLimit !== undefined) {
    constraints['turnover_total'] = { max: 2 * constraintSet.turnoverLimit };
    for (const entry of universe) {
      const dVarName = `dturn_${entry.ticker}`;
      constraints[`turnover_pos_${entry.ticker}`] = { min: -entry.currentWeight };
      constraints[`turnover_neg_${entry.ticker}`] = { min: entry.currentWeight };
      variables[`w_${entry.ticker}`][`turnover_pos_${entry.ticker}`] = -1;
      variables[`w_${entry.ticker}`][`turnover_neg_${entry.ticker}`] = 1;
      variables[dVarName] = {
        [`turnover_pos_${entry.ticker}`]: 1,
        [`turnover_neg_${entry.ticker}`]: 1,
        turnover_total: 1,
      };
    }
  }

  const model: LPModel = {
    optimize: 'objective',
    opType: 'min',
    constraints,
    variables,
    // zeta (the VaR threshold) must be free (unrestricted in sign) — javascript-lp-solver
    // defaults every variable to a lower bound of 0, which would be wrong here: a
    // sufficiently defensive portfolio's worst scenario over the horizon can still be a
    // small gain, i.e. a negative "loss" threshold. w_i and u_s correctly keep the
    // solver's default >= 0 bound (long-only weights; non-negative shortfall slack).
    unrestricted: { zeta: 1 },
    options: { tolerance: 1e-7 },
  };

  return { model, tickers, scenarioCount: S };
}

export interface OptimizationResult {
  status: 'optimal' | 'infeasible' | 'error';
  weights: Record<string, number>;
  cvar: number | null;
  varThreshold: number | null;
  diagnostics: {
    solverFeasible: boolean;
    scenarioCount: number;
    universeSize: number;
    warnings: string[];
    message?: string;
  };
}

/**
 * Solves the assembled LP model. Infeasibility (a realistic risk with sector + region +
 * factor constraints stacked over ~20-30 names) surfaces clearly via `status` and
 * `diagnostics`, never silently — javascript-lp-solver reports `feasible: false` rather
 * than throwing, so we translate that explicitly rather than trusting weights that may
 * not exist.
 */
export function solveOptimization(build: LPBuildResult): OptimizationResult {
  const warnings: string[] = [];

  let solution: LPSolution;
  try {
    solution = solver.Solve(build.model);
  } catch (err) {
    return {
      status: 'error',
      weights: {},
      cvar: null,
      varThreshold: null,
      diagnostics: {
        solverFeasible: false,
        scenarioCount: build.scenarioCount,
        universeSize: build.tickers.length,
        warnings,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }

  if (!solution || solution.feasible === false) {
    return {
      status: 'infeasible',
      weights: {},
      cvar: null,
      varThreshold: null,
      diagnostics: {
        solverFeasible: false,
        scenarioCount: build.scenarioCount,
        universeSize: build.tickers.length,
        warnings,
        message:
          'The solver could not find a feasible solution under the current constraint set. ' +
          'This typically means the sector, region, and factor-tilt constraints are jointly ' +
          'too tight for this universe (e.g. requiring both a low US region weight and high ' +
          'exposure to factors concentrated in US holdings). Loosen one or more bounds and re-run.',
      },
    };
  }

  const weights: Record<string, number> = {};
  let weightSum = 0;
  for (const ticker of build.tickers) {
    const raw = solution[`w_${ticker}`];
    const w = typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, raw) : 0;
    weights[ticker] = w;
    weightSum += w;
  }

  // Renormalize defensively — the LP's sum_to_one constraint should already guarantee
  // this, but floating-point solver output can drift by small epsilons.
  if (weightSum > 0 && Math.abs(weightSum - 1) > 1e-6) {
    warnings.push(`Raw solver weights summed to ${weightSum.toFixed(6)}, renormalized to 1.0.`);
    for (const ticker of build.tickers) weights[ticker] = weights[ticker] / weightSum;
  }

  const varThreshold = typeof solution['zeta'] === 'number' ? solution['zeta'] : null;
  const cvar = typeof solution.result === 'number' ? solution.result : null;

  return {
    status: 'optimal',
    weights,
    cvar,
    varThreshold,
    diagnostics: {
      solverFeasible: true,
      scenarioCount: build.scenarioCount,
      universeSize: build.tickers.length,
      warnings,
    },
  };
}

/**
 * Computes CVaR of a *given* fixed weight vector over a scenario matrix — used for
 * benchmarkCVaR (URTH, weight = 1.0 on a single ticker) and for stress-test/backtest
 * evaluation, without re-solving an LP. Implements the same RU definition directly:
 * CVaR_alpha = mean of the worst (1-alpha) fraction of scenario losses.
 */
export function computeCVaRForWeights(
  weights: Record<string, number>,
  scenarios: ScenarioMatrix,
  confidence: number
): number | null {
  const S = scenarios.scenarioCount;
  if (S === 0) return null;

  const tickers = Object.keys(weights).filter((t) => (scenarios.returnsByTicker[t]?.length ?? 0) === S);
  if (tickers.length === 0) return null;

  const portfolioLosses: number[] = [];
  for (let s = 0; s < S; s++) {
    let portfolioReturn = 0;
    for (const ticker of tickers) {
      portfolioReturn += (weights[ticker] ?? 0) * (scenarios.returnsByTicker[ticker]?.[s] ?? 0);
    }
    portfolioLosses.push(-portfolioReturn); // loss = negative return
  }

  portfolioLosses.sort((a, b) => a - b);
  const tailCount = Math.max(1, Math.ceil(S * (1 - confidence)));
  const tailLosses = portfolioLosses.slice(S - tailCount);
  return tailLosses.reduce((a, b) => a + b, 0) / tailLosses.length;
}

export interface SuggestedTrade {
  ticker: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  currentShares: number;
  targetShares: number;
  deltaShares: number;
  deltaDollars: number;
  currentWeight: number;
  targetWeight: number;
  rationale: string;
}

export interface CurrentHoldingInfo {
  ticker: string;
  quantity: number;
  sector: string | null;
  region: string | null;
}

/**
 * Delta math translating target weights into suggested share trades. Recommendation-only
 * — this function has no side effects on Holding/Transaction, it only computes numbers
 * for display (see plan Section 10: "Re-weight based on model" is read-only, admin
 * manually enters trades via the existing TradeModal).
 */
export function computeSuggestedTrades(
  targetWeights: Record<string, number>,
  currentHoldings: CurrentHoldingInfo[],
  portfolioValue: number,
  latestPrices: Record<string, number>
): SuggestedTrade[] {
  const allTickers = new Set<string>([
    ...currentHoldings.map((h) => h.ticker),
    ...Object.keys(targetWeights),
  ]);

  const trades: SuggestedTrade[] = [];

  for (const ticker of allTickers) {
    const holding = currentHoldings.find((h) => h.ticker === ticker);
    const price = latestPrices[ticker];
    const currentShares = holding?.quantity ?? 0;
    const currentValue = price ? currentShares * price : 0;
    const currentWeight = portfolioValue > 0 ? currentValue / portfolioValue : 0;
    const targetWeight = targetWeights[ticker] ?? 0;
    const targetValue = targetWeight * portfolioValue;
    const targetShares = price && price > 0 ? targetValue / price : 0;
    const deltaShares = targetShares - currentShares;
    const deltaDollars = targetValue - currentValue;

    if (!price || Math.abs(deltaShares) < 1e-6) {
      if (currentShares > 0 || targetWeight > 0) {
        trades.push({
          ticker,
          action: 'HOLD',
          currentShares,
          targetShares,
          deltaShares: 0,
          deltaDollars: 0,
          currentWeight,
          targetWeight,
          rationale: price
            ? 'Target weight approximately matches current weight — no material trade needed.'
            : 'No current price available — cannot compute a share-level trade.',
        });
      }
      continue;
    }

    const action: SuggestedTrade['action'] = deltaShares > 0 ? 'BUY' : 'SELL';
    const weightDeltaPts = ((targetWeight - currentWeight) * 100).toFixed(1);
    const rationale =
      action === 'BUY'
        ? `Model target weight (${(targetWeight * 100).toFixed(1)}%) exceeds current weight (${(currentWeight * 100).toFixed(1)}%) by ${weightDeltaPts}pts under the active constraint set.`
        : `Model target weight (${(targetWeight * 100).toFixed(1)}%) is below current weight (${(currentWeight * 100).toFixed(1)}%) by ${weightDeltaPts}pts under the active constraint set.`;

    trades.push({
      ticker,
      action,
      currentShares,
      targetShares,
      deltaShares,
      deltaDollars,
      currentWeight,
      targetWeight,
      rationale,
    });
  }

  return trades.sort((a, b) => Math.abs(b.deltaDollars) - Math.abs(a.deltaDollars));
}
