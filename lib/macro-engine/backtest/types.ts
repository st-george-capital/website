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
  skipPersist?:          boolean; // if true, skip DB writes (for experiment sweeps — results logged only)
}

// ─── Training Data ────────────────────────────────────────────────────────────

/**
 * One (ticker, featureDate) observation in a training window.
 * features follows FEATURE_DIMENSIONS order: [zGrowth, zInflation, zMonetary, zCredit, zCarry, zEarnings]
 */
export interface TrainRow {
  ticker:      string;
  featureDate: Date;
  regimeLabel: string;
  features:    number[]; // length 6, nulls imputed to 0 (addressed in Phase 4.1)
  fwdReturn:   number;   // (adjClose[featureDate+forwardDays] / adjClose[featureDate]) - 1, excess over SPY
}

// ─── Weight Sets ──────────────────────────────────────────────────────────────

/** Factor weights for one regime (or global fallback). Mirrors FactorWeightSet Prisma model. */
export interface WeightSet {
  regimeLabel: string;   // regime label string, or "global" for fallback
  weights:     number[]; // length 6 — [wGrowth, wInflation, wMonetary, wCredit, wCarry, wEarnings]
  sampleCount: number;
  isFallback:  boolean;
}

// ─── Window Result ────────────────────────────────────────────────────────────

/** Aggregated result for one walk-forward test step (OOS, not holdout). */
export interface WindowResult {
  window:          BacktestWindow;
  predictedSigns:  number[];  // sign(score) for each (ticker, date) in test window
  actualReturns:   number[];  // actual forward returns for same observations
  excessReturns:   number[];  // portfolio return - SPY return for each test period
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

/** Performance metrics for one evaluation window (OOS aggregate or holdout). */
export interface MetricsResult {
  window:      'oos' | 'holdout';
  benchmark:   'SPY' | 'ACWI';
  hitRate:     number; // 0-1
  sharpeAnn:   number; // annualized Sharpe on excess returns
  maxDrawdown: number | null; // negative fraction, e.g. -0.35; null when no excess return data
  startDate:   Date;
  endDate:     Date;
  nPeriods:    number;
}

// ─── Feature Dimension Order ──────────────────────────────────────────────────

/** Must match FactorFeatureMatrix column order and TrainRow.features index. */
export const BACKTEST_FEATURE_DIMS = ['zGrowth', 'zInflation', 'zMonetary', 'zCredit', 'zCarry', 'zEarnings'] as const;
export type BacktestFeatureDim = typeof BACKTEST_FEATURE_DIMS[number];
