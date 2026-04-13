/**
 * lib/macro-engine/features/factors/monetary.ts
 *
 * Compute monetary factor z-score (point-in-time).
 * - FEDFUNDS: Fed funds rate level (monthly, vintage-available)
 * - DGS10 - DGS2: 10Y-2Y yield curve spread (daily, vintage-available via chunked ingest)
 * - Average of both z-scores; falls back to whichever is available
 */
import { subMonths } from 'date-fns';
import { getFredRangeAsOf } from '../../query';
import { rollingZScore, MONTHLY_WINDOW } from '../z-scores';

export async function computeMonetaryFactor(
  asOfDate: Date
): Promise<{ value: number | null; sourceMaxDate: Date | null }> {
  const obsStart = subMonths(asOfDate, 65);

  // Fetch FEDFUNDS (monthly vintage)
  const fedRows = await getFredRangeAsOf('FEDFUNDS', obsStart, asOfDate, asOfDate);
  const fedSeries = fedRows.map(r => ({ date: r.observationDate, value: r.value }));
  const zFed = rollingZScore(fedSeries, MONTHLY_WINDOW, asOfDate);

  // Fetch DGS10 and DGS2 (daily vintage) — compute spread
  const [dgs10Rows, dgs2Rows] = await Promise.all([
    getFredRangeAsOf('DGS10', obsStart, asOfDate, asOfDate),
    getFredRangeAsOf('DGS2', obsStart, asOfDate, asOfDate),
  ]);

  let zYieldCurve: number | null = null;
  let yieldCurveMaxDate: Date | null = null;

  if (dgs10Rows.length > 0 && dgs2Rows.length > 0) {
    // Align by observationDate
    const dgs2Map = new Map(dgs2Rows.map(r => [r.observationDate.toISOString().slice(0, 10), r.value]));
    const spreadSeries: { date: Date; value: number }[] = [];

    for (const r10 of dgs10Rows) {
      const key = r10.observationDate.toISOString().slice(0, 10);
      const dgs2Val = dgs2Map.get(key);
      if (dgs2Val !== undefined) {
        spreadSeries.push({ date: r10.observationDate, value: r10.value - dgs2Val });
        if (!yieldCurveMaxDate || r10.observationDate > yieldCurveMaxDate) {
          yieldCurveMaxDate = r10.observationDate;
        }
      }
    }

    zYieldCurve = rollingZScore(spreadSeries, MONTHLY_WINDOW, asOfDate);
  }

  const sourceMaxDate = fedRows.length > 0
    ? fedRows[fedRows.length - 1].observationDate
    : yieldCurveMaxDate;

  // Average both z-scores; fall back to whichever is available
  let value: number | null;
  if (zFed !== null && zYieldCurve !== null) {
    value = (zFed + zYieldCurve) / 2;
  } else {
    value = zFed ?? zYieldCurve;
  }

  return { value, sourceMaxDate };
}
