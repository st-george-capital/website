/**
 * lib/macro-engine/features/factors/credit.ts
 *
 * Compute credit factor z-score (point-in-time).
 * - Primary: BAMLH0A0HYM2 (ICE BofA HY OAS spread) — stored as current obs
 * - Secondary: UNRATE (unemployment, inverted credit risk proxy) — vintage-available
 * - Uses HY OAS if available; blends both when both present; falls back to UNRATE
 */
import { subMonths } from 'date-fns';
import { getFredRangeAsOf } from '../../query';
import { rollingZScore, MONTHLY_WINDOW } from '../z-scores';

export async function computeCreditFactor(
  asOfDate: Date
): Promise<{ value: number | null; sourceMaxDate: Date | null }> {
  const obsStart = subMonths(asOfDate, 65);

  const [hyRows, unrateRows] = await Promise.all([
    getFredRangeAsOf('BAMLH0A0HYM2', obsStart, asOfDate, asOfDate),
    getFredRangeAsOf('UNRATE', obsStart, asOfDate, asOfDate),
  ]);

  const hySeries = hyRows.map(r => ({ date: r.observationDate, value: r.value }));
  const unrateSeries = unrateRows.map(r => ({ date: r.observationDate, value: r.value }));

  const zHY = rollingZScore(hySeries, MONTHLY_WINDOW, asOfDate);
  const zUnrate = rollingZScore(unrateSeries, MONTHLY_WINDOW, asOfDate);

  const sourceMaxDate = hyRows.length > 0
    ? hyRows[hyRows.length - 1].observationDate
    : unrateRows.length > 0
    ? unrateRows[unrateRows.length - 1].observationDate
    : null;

  // HY OAS is the true credit signal; UNRATE is a proxy — weight 60/40
  let value: number | null;
  if (zHY !== null && zUnrate !== null) {
    value = 0.6 * zHY + 0.4 * zUnrate;
  } else {
    value = zHY ?? zUnrate;
  }

  return { value, sourceMaxDate };
}
