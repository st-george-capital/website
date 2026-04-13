/**
 * lib/macro-engine/features/factors/carry.ts
 *
 * Compute carry factor z-score (point-in-time).
 * - Policy rate differential: country rate − FEDFUNDS, rollingZScore
 * - For sector ETFs (countryCode=null) or US: returns null
 *
 * Series ingested as current observations (ALFRED vintage not available for
 * central bank rate series). Policy rates move slowly so look-ahead bias is minimal.
 *
 * Series used:
 *   DE/FR/IT/ES/NL/EU: ECBDFR (ECB deposit facility rate, daily)
 *   JP: IRSTCB01JPM156N (OECD Japan overnight call rate, monthly)
 *   GB: BOERUKM (Bank of England base rate, monthly)
 *   CA: IRSTCB01CAM156N (OECD Canada overnight rate, monthly)
 *   BR: IRSTCB01BRM156N (OECD Brazil SELIC rate, monthly)
 *   AU: falls back to FEDFUNDS differential = 0 (no FRED series available)
 *   CN: returns null (no FRED/OECD series for China policy rate)
 */
import { subMonths } from 'date-fns';
import { getFredRangeAsOf } from '../../query';
import { rollingZScore, MONTHLY_WINDOW } from '../z-scores';

const COUNTRY_RATE_SERIES: Record<string, string> = {
  US: 'FEDFUNDS',
  DE: 'ECBDFR',
  FR: 'ECBDFR',
  IT: 'ECBDFR',
  ES: 'ECBDFR',
  NL: 'ECBDFR',
  JP: 'IRSTCB01JPM156N',
  GB: 'BOERUKM',
  CA: 'IRSTCB01CAM156N',
  BR: 'IRSTCB01BRM156N',
};

export async function computeCarryFactor(
  asOfDate: Date,
  countryCode: string | null
): Promise<{ value: number | null; sourceMaxDate: Date | null }> {
  if (countryCode === null || countryCode === 'US') return { value: null, sourceMaxDate: null };

  const countrySeries = COUNTRY_RATE_SERIES[countryCode];
  if (!countrySeries) return { value: null, sourceMaxDate: null };

  const obsStart = subMonths(asOfDate, 65);

  const [countryRows, fedRows] = await Promise.all([
    getFredRangeAsOf(countrySeries, obsStart, asOfDate, asOfDate),
    getFredRangeAsOf('FEDFUNDS', obsStart, asOfDate, asOfDate),
  ]);

  if (countryRows.length === 0 || fedRows.length === 0) {
    return { value: null, sourceMaxDate: null };
  }

  // Align by month (YYYYMM) since country rates are monthly, ECB is daily
  const fedMap = new Map<string, number>();
  for (const r of fedRows) {
    const key = r.observationDate.toISOString().slice(0, 7); // YYYY-MM
    fedMap.set(key, r.value);
  }

  const diffSeries: { date: Date; value: number }[] = [];
  let sourceMaxDate: Date | null = null;

  for (const r of countryRows) {
    // For daily ECB rate, use the monthly average by taking latest value per month
    const key = r.observationDate.toISOString().slice(0, 7);
    const fed = fedMap.get(key);
    if (fed !== undefined) {
      diffSeries.push({ date: r.observationDate, value: r.value - fed });
      if (!sourceMaxDate || r.observationDate > sourceMaxDate) sourceMaxDate = r.observationDate;
    }
  }

  if (diffSeries.length === 0) return { value: null, sourceMaxDate: null };

  return { value: rollingZScore(diffSeries, MONTHLY_WINDOW, asOfDate), sourceMaxDate };
}
