/**
 * lib/macro-engine/features/factors/inflation.ts
 *
 * Compute inflation factor z-score (point-in-time).
 * - Fetches CPIAUCSL for last 73 months
 * - Computes YoY % change: (t / t-12 - 1) * 100
 * - rollingZScore on YoY series with MONTHLY_WINDOW=60
 */
import { subMonths } from 'date-fns';
import { getFredAsOf } from '../../query';
import { rollingZScore, MONTHLY_WINDOW } from '../z-scores';

export async function computeInflationFactor(
  asOfDate: Date
): Promise<{ value: number | null; sourceMaxDate: Date | null }> {
  // Fetch 73 months to have enough for 12-month lag + 60-month window
  const rawSeries: { date: Date; value: number }[] = [];
  let sourceMaxDate: Date | null = null;

  for (let i = 73; i >= 0; i--) {
    const obsDate = subMonths(asOfDate, i);
    const row = await getFredAsOf('CPIAUCSL', obsDate, asOfDate);
    if (row) {
      rawSeries.push({ date: row.observationDate, value: row.value });
      if (!sourceMaxDate || row.observationDate > sourceMaxDate) {
        sourceMaxDate = row.observationDate;
      }
    }
  }

  if (rawSeries.length < 13) return { value: null, sourceMaxDate };

  // Compute YoY % change series (need at least 13 months to start)
  const yoySeries: { date: Date; value: number }[] = [];
  for (let i = 12; i < rawSeries.length; i++) {
    const current = rawSeries[i].value;
    const prior = rawSeries[i - 12].value;
    if (prior !== 0) {
      yoySeries.push({
        date: rawSeries[i].date,
        value: (current / prior - 1) * 100,
      });
    }
  }

  return { value: rollingZScore(yoySeries, MONTHLY_WINDOW, asOfDate), sourceMaxDate };
}
