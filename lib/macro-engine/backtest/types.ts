// lib/macro-engine/backtest/types.ts
// TypeScript contracts for Phase 4 — Backtesting Engine.
// These shapes mirror the Prisma models exactly to avoid impedance mismatch.

// ─── Holdout Boundary ─────────────────────────────────────────────────────────

/**
 * Hard-coded holdout start date. MUST NOT be computed at runtime.
 * Gives ~3 years of holdout coverage from early-2025 run date.
 * Changing this value invalidates all prior backtest results — document the change.
 */
export const HOLDOUT_START = new Date('2022-01-01');

/**
 * Throws if date is inside the holdout window (date >= HOLDOUT_START).
 * Call at every point where training or test data is sliced.
 */
export function assertNotHoldout(date: Date): void {
  if (date >= HOLDOUT_START) {
    throw new Error(
      `Holdout boundary violation: date ${date.toISOString()} >= holdout start ${HOLDOUT_START.toISOString()}`
    );
  }
}

// ─── Walk-Forward Window ──────────────────────────────────────────────────────

/** One walk-forward step: training window [trainStart, trainEnd) + test window [testStart, testEnd). */
export interface BacktestWindow {
  trainStart: Date;
  trainEnd:   Date; // exclusive upper bound — same as testStart
  testStart:  Date;
  testEnd:    Date; // exclusive upper bound — same as next window's trainEnd step
}

// ─── Backtesting Configuration ────────────────────────────────────────────────

export interface BacktestConfig {
  dataStart:        Date;   // earliest date in FactorFeatureMatrix to use
  stepMonths:       number; // test window length, e.g. 3
  trainMinYears:    number; // minimum training years before first test, e.g. 3
  lambdaRidge:      number; // ridge regularization parameter, e.g. 0.05
  minRegimeSamples: number; // minimum (ticker, date) observations for regime-specific fit, e.g. 30
  forwardDays:      number; // trading days for forward return computation, e.g. 21
  longFraction:          number;  // fraction of universe to go long, e.g. 0.5 (top half) or 0.33 (top third)
  volLookbackPeriods:    number;  // trailing periods for inverse-vol position sizing, 0 = equal-weight
  confidenceExp:         number;  // exponent for confidence scaling: 1=linear min(1,c*2), <1=softer, >1=harder
  shortMomPeriods:       number;  // periods for short-term momentum blend (0 = disabled); blended with zCarry
  shortMomWeight:        number;  // weight of short-term momentum in blended score [0,1]; 0 = long-term only
  creditGateEnabled?:    boolean; // if false, skip the credit-stress flat regime gate (default: true)
  creditGateLabels?:     string[]; // if set, gate ONLY these specific regime labels (instead of all 'credit' labels)
  skipPersist?:          boolean; // if true, skip DB writes (for experiment sweeps — results logged only)

  // ── Portfolio vol-targeting overlay (Chunk 2) ──────────────────────────────
  /** Annualized ex-ante volatility target for the basket, e.g. 0.10. 0 / undefined = disabled. */
  portfolioVolTarget?:         number;
  /** Non-overlapping period count used to estimate the long-basket covariance matrix. */
  portfolioVolLookbackPeriods?: number;

  // ── Correlation-aware selection (Chunk 3) ──────────────────────────────────
  /** Penalty λ on Σ|corr(i,j)| over selected pairs. 0 / undefined = pure zCarry top-k. */
  corrPenaltyLambda?:    number;
  /** Non-overlapping period count used to estimate the oversample pool correlation. */
  corrLookbackPeriods?:  number;
  /** Multiplier on k to form the oversample pool, e.g. 2 → consider top 2k candidates. */
  corrOversampleMult?:   number;

  // ── Transaction costs (Chunk 5) ────────────────────────────────────────────
  /**
   * One-way transaction cost in basis points applied per unit of traded
   * notional. 5 bps (= 0.05%) is the default — reasonable for the 17-ETF
   * universe on a major US broker. Each rebalance applies
   *   cost = (Σ_i |w_t(i) - w_{t-1}(i)|) · tcBps / 10_000
   * which correctly double-counts buys + sells (L1 weight change already
   * includes both sides). 0 / undefined disables cost accounting (gross
   * numbers only). Positions carry across credit-gated flat days — we
   * only charge costs on the dates the model actually rebalances.
   */
  transactionCostBps?: number;
}

// ─── Window Result ────────────────────────────────────────────────────────────

/**
 * Aggregated result for one walk-forward test step (OOS, not holdout).
 *
 * `excessReturns` contains only ACTIVE periods — credit-gated (flat) periods are
 * counted in `flatDays` and excluded from the series. Sharpe and maxDD are
 * computed only on active periods; including gated zeros would biased-deflate
 * both the mean and the stdev.
 *
 * `excessReturns` is the NET (post-transaction-cost) series — the honest
 * headline number. `grossReturns` holds the pre-cost counterpart, and
 * `turnovers`/`costs` record the per-active-period L1 trade size and its
 * dollar-cost, aligned index-wise with `excessReturns`.
 */
export interface WindowResult {
  window:          BacktestWindow;
  predictedSigns:  number[];  // sign(score) for each ACTIVE (ticker, date) in test window
  actualReturns:   number[];  // actual portfolio-excess returns for same observations (NET)
  excessReturns:   number[];  // NET portfolio-excess per ACTIVE period (after transaction costs)
  grossReturns:    number[];  // same active periods, BEFORE costs — gross counterpart
  turnovers:       number[];  // L1 weight change per active period (0..~2)
  costs:           number[];  // per-period cost in decimal (already subtracted from excessReturns)
  flatDays:        number;    // count of dates gated flat by the credit-regime filter
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

/**
 * Performance metrics for one evaluation window (OOS aggregate or holdout).
 *
 * `nPeriods` is the number of ACTIVE periods used to compute Sharpe/maxDD.
 * `flatDays` is the number of gated (zero-exposure) dates over the same span.
 * `activeFraction = nPeriods / (nPeriods + flatDays)` — useful for interpreting
 * Sharpe (a high Sharpe with activeFraction=0.3 means the model is only
 * "on" 30% of the time but performs well when it is).
 */
export interface MetricsResult {
  window:         'oos' | 'holdout';
  benchmark:      'SPY' | 'ACWI';
  hitRate:        number; // 0-1, computed on active periods only
  sharpeAnn:      number; // NET annualized Sharpe (headline; after transaction costs)
  sharpeAnnGross: number; // pre-cost counterpart of `sharpeAnn`
  maxDrawdown:    number | null;      // NET max drawdown (negative fraction)
  maxDrawdownGross: number | null;    // pre-cost counterpart
  avgTurnover:    number; // mean L1 weight-change per active rebalance (0..~2)
  annualizedCostBps: number; // annualized cost drag in basis points of NAV
  startDate:      Date;
  endDate:        Date;
  nPeriods:       number;  // active periods
  flatDays:       number;  // gated (flat) periods, excluded from Sharpe/maxDD
  activeFraction: number;  // nPeriods / (nPeriods + flatDays); 1 if never gated
}

// ─── Feature Dimension Order ──────────────────────────────────────────────────

/**
 * Must match FactorFeatureMatrix column order and FactorWeightSet column order.
 * In the current scoring model only `zCarry` has cross-sectional variance per date;
 * the other five are date-level macro broadcasts kept for regime classification
 * and for downstream attribution display.
 */
export const BACKTEST_FEATURE_DIMS = ['zGrowth', 'zInflation', 'zMonetary', 'zCredit', 'zCarry', 'zEarnings'] as const;
export type BacktestFeatureDim = typeof BACKTEST_FEATURE_DIMS[number];
