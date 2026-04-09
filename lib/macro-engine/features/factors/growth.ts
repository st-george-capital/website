/**
 * lib/macro-engine/features/factors/growth.ts
 *
 * Compute growth factor z-score (point-in-time).
 * - US: INDPRO industrial production MoM % change, rollingZScore with MONTHLY_WINDOW
 * - Non-US: OECD CLI series, rollingZScore with MONTHLY_WINDOW
 */
import { subMonths } from 'date-fns';
import { getFredAsOf, getOecdCli } from '../../query';
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

  // US: INDPRO industrial production MoM % change
  const rawSeries: { date: Date; value: number }[] = [];
  let sourceMaxDate: Date | null = null;

  for (let i = 65; i >= 0; i--) {
    const obsDate = subMonths(asOfDate, i);
    const row = await getFredAsOf('INDPRO', obsDate, asOfDate);
    if (row) {
      rawSeries.push({ date: row.observationDate, value: row.value });
      if (!sourceMaxDate || row.observationDate > sourceMaxDate) {
        sourceMaxDate = row.observationDate;
      }
    }
  }

  // Compute MoM % change series
  const momSeries: { date: Date; value: number }[] = [];
  for (let i = 1; i < rawSeries.length; i++) {
    const prev = rawSeries[i - 1].value;
    if (prev !== 0) {
      momSeries.push({
        date: rawSeries[i].date,
        value: (rawSeries[i].value / prev - 1) * 100,
      });
    }
  }

  return { value: rollingZScore(momSeries, MONTHLY_WINDOW, asOfDate), sourceMaxDate };
}
