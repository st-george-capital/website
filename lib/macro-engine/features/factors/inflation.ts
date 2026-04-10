/**
 * lib/macro-engine/features/factors/inflation.ts
 *
 * Compute inflation factor z-score (point-in-time).
 * - Fetches CPIAUCSL for last 73 months (batch)
 * - Computes YoY % change: (t / t-12 - 1) * 100
 * - rollingZScore on YoY series with MONTHLY_WINDOW=60
 */
import { subMonths } from 'date-fns';
import { getFredRangeAsOf } from '../../query';
import { rollingZScore, MONTHLY_WINDOW } from '../z-scores';

export async function computeInflationFactor(
  asOfDate: Date
): Promise<{ value: number | null; sourceMaxDate: Date | null }> {
  const obsStart = subMonths(asOfDate, 73);
  const vintageRows = await getFredRangeAsOf('CPIAUCSL', obsStart, asOfDate, asOfDate);

  if (vintageRows.length < 13) return { value: null, sourceMaxDate: null };

  const rawSeries = vintageRows.map(r => ({ date: r.observationDate, value: r.value }));
  const sourceMaxDate = rawSeries[rawSeries.length - 1].date;

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
