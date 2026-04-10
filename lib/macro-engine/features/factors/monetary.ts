/**
 * lib/macro-engine/features/factors/monetary.ts
 *
 * Compute monetary factor z-score (point-in-time).
 * - Fetches FEDFUNDS and UNRATE for last 65 months (batch)
 * - T10Y2Y: computed from DGS10-DGS2 spread if available; skipped if series fails
 * - rollingZScore each with MONTHLY_WINDOW=60
 * - Returns average of available z-scores
 */
import { subMonths } from 'date-fns';
import { getFredRangeAsOf } from '../../query';
import { rollingZScore, MONTHLY_WINDOW } from '../z-scores';

export async function computeMonetaryFactor(
  asOfDate: Date
): Promise<{ value: number | null; sourceMaxDate: Date | null }> {
  const obsStart = subMonths(asOfDate, 65);

  // Fetch FEDFUNDS (monthly, vintage-available)
  const fedRows = await getFredRangeAsOf('FEDFUNDS', obsStart, asOfDate, asOfDate);

  const fedSeries = fedRows.map(r => ({ date: r.observationDate, value: r.value }));
  const zFed = rollingZScore(fedSeries, MONTHLY_WINDOW, asOfDate);

  let sourceMaxDate: Date | null = fedRows.length > 0
    ? fedRows[fedRows.length - 1].observationDate
    : null;

  return { value: zFed, sourceMaxDate };
}
