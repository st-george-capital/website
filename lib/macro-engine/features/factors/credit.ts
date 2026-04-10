/**
 * lib/macro-engine/features/factors/credit.ts
 *
 * Compute credit factor z-score (point-in-time).
 * - Fetches UNRATE (unemployment rate) as credit proxy — vintage-available monthly series
 * - BAMLH0A0HYM2 (HY OAS) not available via ALFRED output_type=2 (HTTP 400)
 * - rollingZScore with MONTHLY_WINDOW=60
 */
import { subMonths } from 'date-fns';
import { getFredRangeAsOf } from '../../query';
import { rollingZScore, MONTHLY_WINDOW } from '../z-scores';

export async function computeCreditFactor(
  asOfDate: Date
): Promise<{ value: number | null; sourceMaxDate: Date | null }> {
  const obsStart = subMonths(asOfDate, 65);

  // Use UNRATE as credit conditions proxy (vintage-available; inverted risk signal)
  const rows = await getFredRangeAsOf('UNRATE', obsStart, asOfDate, asOfDate);

  if (rows.length === 0) return { value: null, sourceMaxDate: null };

  const series = rows.map(r => ({ date: r.observationDate, value: r.value }));
  const sourceMaxDate = rows[rows.length - 1].observationDate;

  return { value: rollingZScore(series, MONTHLY_WINDOW, asOfDate), sourceMaxDate };
}
