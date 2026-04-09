// lib/macro-engine/backtest/metrics.ts
// Pure performance metric functions — no DB access, no side effects.
// All three metrics operate on the OOS or holdout excess return series.

import { mean, standardDeviation } from 'simple-statistics';
import { MetricsResult, WindowResult } from './types';

/**
 * Hit rate: fraction of periods where sign(predicted) === sign(actual).
 * Both arrays must have the same length.
 */
export function hitRate(predicted: number[], actual: number[]): number {
  if (predicted.length === 0) return 0;
  let hits = 0;
  for (let i = 0; i < predicted.length; i++) {
    if (Math.sign(predicted[i]) === Math.sign(actual[i])) hits++;
  }
  return hits / predicted.length;
}

/**
 * Annualized Sharpe ratio on excess returns.
 * periodsPerYear: e.g. 252/21 ≈ 12 for 21-day periods, 252 for daily.
 * Returns 0 if standard deviation is 0.
 */
export function annualizedSharpe(excessReturns: number[], periodsPerYear: number): number {
  if (excessReturns.length < 2) return 0;
  const mu    = mean(excessReturns);
  const sigma = standardDeviation(excessReturns);
  if (sigma === 0) return 0;
  return (mu / sigma) * Math.sqrt(periodsPerYear);
}

/**
 * Maximum drawdown on a series of period returns (not cumulative prices).
 * Returns a negative fraction — e.g. -0.35 for a 35% drawdown.
 * Computes on the FULL series (cumulative), not per-window max.
 */
export function maxDrawdown(periodReturns: number[]): number | null {
  if (periodReturns.length === 0) {
    console.warn('maxDrawdown: received empty periodReturns — returning null instead of -1.0');
    return null;
  }
  if (periodReturns.every(r => r === 0)) {
    console.warn('maxDrawdown: all period returns are zero — returning null (no meaningful drawdown)');
    return null;
  }
  let peak       = 1;
  let maxDD      = 0;
  let cumulative = 1;
  for (const r of periodReturns) {
    cumulative *= (1 + r);
    if (cumulative > peak) peak = cumulative;
    const dd = (cumulative - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }
  return maxDD; // negative
}

/**
 * Aggregates across all walk-forward WindowResults to produce one MetricsResult.
 * periodDays: the step size in trading days (e.g. 21 for monthly steps).
 * Excess returns are concatenated in chronological order before computing Sharpe/drawdown.
 */
export function aggregateMetrics(
  windowResults:  WindowResult[],
  periodDays:     number,
  windowType:     'oos' | 'holdout',
  benchmark:      'SPY' | 'ACWI',
): MetricsResult {
  if (windowResults.length === 0) {
    throw new Error('aggregateMetrics: no window results to aggregate');
  }

  // Concatenate in order — drawdown must be computed on full cumulative series
  const allPredicted: number[] = [];
  const allActual:    number[] = [];
  const allExcess:    number[] = [];

  for (const wr of windowResults) {
    allPredicted.push(...wr.predictedSigns);
    allActual.push(...wr.actualReturns);
    allExcess.push(...wr.excessReturns);
  }

  const periodsPerYear = 252 / periodDays;

  return {
    window:      windowType,
    benchmark,
    hitRate:     hitRate(allPredicted, allActual),
    sharpeAnn:   annualizedSharpe(allExcess, periodsPerYear),
    maxDrawdown: maxDrawdown(allExcess),
    startDate:   windowResults[0].window.testStart,
    endDate:     windowResults[windowResults.length - 1].window.testEnd,
    nPeriods:    allExcess.length,
  };
}
