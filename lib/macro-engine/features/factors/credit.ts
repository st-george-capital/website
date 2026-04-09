/**
 * lib/macro-engine/features/factors/credit.ts
 *
 * Compute credit factor z-score (point-in-time).
 * - Fetches BAMLH0A0HYM2 (HY OAS spread) for last 65 months (daily series)
 * - rollingZScore with DAILY_WINDOW=252
 */
import { subMonths } from 'date-fns';
import { getFredAsOf } from '../../query';
import { rollingZScore, DAILY_WINDOW } from '../z-scores';

export async function computeCreditFactor(
  asOfDate: Date
): Promise<{ value: number | null; sourceMaxDate: Date | null }> {
  const series: { date: Date; value: number }[] = [];
  let sourceMaxDate: Date | null = null;

  // BAMLH0A0HYM2 is a daily series — fetch monthly observation points as proxies
  // (getFredAsOf returns the vintage as-of asOfDate for the given observation period)
  for (let i = 65; i >= 0; i--) {
    const obsDate = subMonths(asOfDate, i);
    const row = await getFredAsOf('BAMLH0A0HYM2', obsDate, asOfDate);
    if (row) {
      series.push({ date: row.observationDate, value: row.value });
      if (!sourceMaxDate || row.observationDate > sourceMaxDate) {
        sourceMaxDate = row.observationDate;
      }
    }
  }

  return { value: rollingZScore(series, DAILY_WINDOW, asOfDate), sourceMaxDate };
}
