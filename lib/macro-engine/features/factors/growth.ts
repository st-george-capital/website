/**
 * lib/macro-engine/features/factors/growth.ts
 *
 * Compute growth factor z-score (point-in-time).
 * - US: GDP QoQ % change (INDPRO unavailable via ALFRED vintage; GDP is quarterly but available)
 * - Non-US: OECD CLI series, rollingZScore with MONTHLY_WINDOW
 */
import { subMonths } from 'date-fns';
import { getFredRangeAsOf, getOecdCli } from '../../query';
import { rollingZScore, MONTHLY_WINDOW } from '../z-scores';

export async function computeGrowthFactor(
  asOfDate: Date,
  countryCode: string | null
): Promise<{ value: number | null; sourceMaxDate: Date | null }> {
  if (countryCode !== null && countryCode !== 'US') {
    // Country-level: use OECD CLI as growth leading indicator
    const startDate = subMonths(asOfDate, 65);
    const rows = await getOecdCli(countryCode, startDate, asOfDate);
    if (rows.length === 0) return { value: null, sourceMaxDate: null };
    const series = rows.map(r => ({ date: r.period, value: r.cliValue }));
    const sourceMaxDate = rows[rows.length - 1].period;
    return { value: rollingZScore(series, MONTHLY_WINDOW, asOfDate), sourceMaxDate };
  }

  // US: GDP QoQ % change — batch fetch 70 months worth of quarterly observations
  const obsStart = subMonths(asOfDate, 70);
  const vintageRows = await getFredRangeAsOf('GDP', obsStart, asOfDate, asOfDate);

  if (vintageRows.length < 2) return { value: null, sourceMaxDate: null };

  const rawSeries = vintageRows.map(r => ({ date: r.observationDate, value: r.value }));
  const sourceMaxDate = rawSeries[rawSeries.length - 1].date;

  // Compute QoQ % change series
  const qoqSeries: { date: Date; value: number }[] = [];
  for (let i = 1; i < rawSeries.length; i++) {
    const prev = rawSeries[i - 1].value;
    if (prev !== 0) {
      qoqSeries.push({
        date: rawSeries[i].date,
        value: (rawSeries[i].value / prev - 1) * 100,
      });
    }
  }

  return { value: rollingZScore(qoqSeries, MONTHLY_WINDOW, asOfDate), sourceMaxDate };
}
