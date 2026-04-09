/**
 * lib/macro-engine/features/z-scores.ts
 *
 * Point-in-time rolling z-score primitive.
 * CRITICAL: never compute z-scores across the full series — always filter to asOfDate first.
 */
import { mean, standardDeviation } from 'simple-statistics';

export const DAILY_WINDOW = 252;   // 1 trading year
export const MONTHLY_WINDOW = 60;  // 5 years
export const MIN_OBSERVATIONS = 20;

/**
 * Computes a rolling z-score for a time series, enforcing a point-in-time ceiling.
 *
 * @param series     - Array of {date, value} observations (any order)
 * @param windowSize - Maximum number of observations to include in the lookback window
 * @param asOfDate   - Point-in-time ceiling: observations after this date are excluded
 * @returns z-score of the most recent value against the prior distribution, or null if:
 *          - fewer than MIN_OBSERVATIONS are available up to asOfDate
 *          - the lookback distribution has zero standard deviation
 */
export function rollingZScore(
  series: { date: Date; value: number }[],
  windowSize: number,
  asOfDate: Date
): number | null {
  // Filter to point-in-time ceiling and sort ascending
  const available = series
    .filter(r => r.date <= asOfDate)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (available.length < MIN_OBSERVATIONS) return null;

  // Take the most recent `windowSize` observations
  const window = available.slice(-windowSize);

  // Distribution: all but the last observation (current is scored AGAINST the distribution)
  const lookback = window.slice(0, -1);
  const current = window[window.length - 1].value;

  // Need at least 5 observations to compute meaningful statistics
  if (lookback.length < 5) return null;

  const values = lookback.map(r => r.value);
  const mu = mean(values);
  const sigma = standardDeviation(values);

  return sigma === 0 ? null : (current - mu) / sigma;
}
