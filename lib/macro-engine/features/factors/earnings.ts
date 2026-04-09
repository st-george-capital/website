/**
 * lib/macro-engine/features/factors/earnings.ts
 *
 * Compute earnings factor z-score (point-in-time).
 * - Fetches EPS revision history via getRevisions(ticker, asOfDate)
 * - Computes EPS revision momentum: (estimatedEpsAvg at t) / (estimatedEpsAvg at t-90days) - 1
 * - Returns null if insufficient data (< 2 points per window, or no estimatedEpsAvg)
 * - Note: for country ETFs with sparse FMP data, null is expected and correct
 */
import { subDays } from 'date-fns';
import { getRevisions } from '../../query';

export async function computeEarningsFactor(
  asOfDate: Date,
  ticker: string
): Promise<{ value: number | null; sourceMaxDate: Date | null }> {
  const rows = await getRevisions(ticker, asOfDate);

  if (rows.length === 0) return { value: null, sourceMaxDate: null };

  const cutoff90 = subDays(asOfDate, 90);
  const cutoff180 = subDays(asOfDate, 180);

  // Recent window: last 90 days
  const recent = rows.filter(
    r => r.date >= cutoff90 && r.estimatedEpsAvg !== null
  );

  // Older window: 90–180 days ago
  const older = rows.filter(
    r => r.date >= cutoff180 && r.date < cutoff90 && r.estimatedEpsAvg !== null
  );

  if (recent.length === 0 || older.length === 0) {
    return { value: null, sourceMaxDate: null };
  }

  // Average estimatedEpsAvg within each window
  const avgRecent =
    recent.reduce((sum, r) => sum + (r.estimatedEpsAvg as number), 0) / recent.length;
  const avgOlder =
    older.reduce((sum, r) => sum + (r.estimatedEpsAvg as number), 0) / older.length;

  if (avgOlder === 0) return { value: null, sourceMaxDate: null };

  const momentum = avgRecent / avgOlder - 1;

  // sourceMaxDate = most recent date in the rows used
  const allUsed = [...recent, ...older];
  const sourceMaxDate = allUsed.reduce<Date | null>((max, r) => {
    return max === null || r.date > max ? r.date : max;
  }, null);

  return { value: momentum, sourceMaxDate };
}
