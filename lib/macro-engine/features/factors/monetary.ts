/**
 * lib/macro-engine/features/factors/monetary.ts
 *
 * Compute monetary factor z-score (point-in-time).
 * - Fetches FEDFUNDS and T10Y2Y for last 65 months
 * - rollingZScore each with MONTHLY_WINDOW=60
 * - Returns average of the two z-scores; if one is null returns the other
 * - sourceMaxDate = max of both series' latest dates
 */
import { subMonths } from 'date-fns';
import { getFredAsOf } from '../../query';
import { rollingZScore, MONTHLY_WINDOW } from '../z-scores';

async function fetchSeries(
  seriesId: string,
  asOfDate: Date,
  monthsBack: number
): Promise<{ series: { date: Date; value: number }[]; sourceMaxDate: Date | null }> {
  const result: { date: Date; value: number }[] = [];
  let sourceMaxDate: Date | null = null;

  for (let i = monthsBack; i >= 0; i--) {
    const obsDate = subMonths(asOfDate, i);
    const row = await getFredAsOf(seriesId, obsDate, asOfDate);
    if (row) {
      result.push({ date: row.observationDate, value: row.value });
      if (!sourceMaxDate || row.observationDate > sourceMaxDate) {
        sourceMaxDate = row.observationDate;
      }
    }
  }

  return { series: result, sourceMaxDate };
}

export async function computeMonetaryFactor(
  asOfDate: Date
): Promise<{ value: number | null; sourceMaxDate: Date | null }> {
  const [fedFunds, yieldCurve] = await Promise.all([
    fetchSeries('FEDFUNDS', asOfDate, 65),
    fetchSeries('T10Y2Y', asOfDate, 65),
  ]);

  const zFed = rollingZScore(fedFunds.series, MONTHLY_WINDOW, asOfDate);
  const zYield = rollingZScore(yieldCurve.series, MONTHLY_WINDOW, asOfDate);

  // sourceMaxDate = max of both series
  let sourceMaxDate: Date | null = null;
  if (fedFunds.sourceMaxDate && yieldCurve.sourceMaxDate) {
    sourceMaxDate = fedFunds.sourceMaxDate > yieldCurve.sourceMaxDate
      ? fedFunds.sourceMaxDate
      : yieldCurve.sourceMaxDate;
  } else {
    sourceMaxDate = fedFunds.sourceMaxDate ?? yieldCurve.sourceMaxDate;
  }

  // Average z-scores; fall back to whichever is non-null
  let value: number | null;
  if (zFed !== null && zYield !== null) {
    value = (zFed + zYield) / 2;
  } else {
    value = zFed ?? zYield;
  }

  return { value, sourceMaxDate };
}
