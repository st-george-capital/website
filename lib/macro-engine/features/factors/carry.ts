/**
 * lib/macro-engine/features/factors/carry.ts
 *
 * Compute carry factor z-score (point-in-time).
 * - For country ETFs: policy rate differential vs FEDFUNDS, rollingZScore
 * - For sector ETFs (countryCode=null): returns null (carry not applicable)
 */
import { subMonths } from 'date-fns';
import { getFredRangeAsOf } from '../../query';
import { rollingZScore, MONTHLY_WINDOW } from '../z-scores';

/**
 * Maps ISO2 country codes to their central bank policy rate FRED series IDs.
 * Only FEDFUNDS is guaranteed available via ALFRED output_type=2.
 * Other central bank series may be missing — carry returns null in that case.
 */
const COUNTRY_RATE_SERIES: Record<string, string> = {
  US: 'FEDFUNDS',
  DE: 'ECBDFR',
  FR: 'ECBDFR',
  IT: 'ECBDFR',
  ES: 'ECBDFR',
  NL: 'ECBDFR',
  JP: 'IRSTCB01JPM156N',
  GB: 'BOERUKM',
  AU: 'IRSTCB01AUM156N',
  CA: 'IRSTCB01CAM156N',
};

export async function computeCarryFactor(
  asOfDate: Date,
  countryCode: string | null
): Promise<{ value: number | null; sourceMaxDate: Date | null }> {
  // Carry is not meaningful for sector ETFs or US
  if (countryCode === null || countryCode === 'US') return { value: null, sourceMaxDate: null };

  const countrySeries = COUNTRY_RATE_SERIES[countryCode];
  if (!countrySeries) return { value: null, sourceMaxDate: null };

  const obsStart = subMonths(asOfDate, 65);

  // Batch fetch both series
  const [countryRows, fedRows] = await Promise.all([
    getFredRangeAsOf(countrySeries, obsStart, asOfDate, asOfDate),
    getFredRangeAsOf('FEDFUNDS', obsStart, asOfDate, asOfDate),
  ]);

  if (countryRows.length === 0 || fedRows.length === 0) {
    return { value: null, sourceMaxDate: null };
  }

  // Build FEDFUNDS lookup by month key
  const fedMap = new Map<string, number>();
  for (const r of fedRows) {
    const key = `${r.observationDate.getFullYear()}-${r.observationDate.getMonth()}`;
    fedMap.set(key, r.value);
  }

  // Compute rate differential series
  const diffSeries: { date: Date; value: number }[] = [];
  let sourceMaxDate: Date | null = null;

  for (const r of countryRows) {
    const key = `${r.observationDate.getFullYear()}-${r.observationDate.getMonth()}`;
    const fed = fedMap.get(key);
    if (fed !== undefined) {
      diffSeries.push({ date: r.observationDate, value: r.value - fed });
      if (!sourceMaxDate || r.observationDate > sourceMaxDate) sourceMaxDate = r.observationDate;
    }
  }

  return { value: rollingZScore(diffSeries, MONTHLY_WINDOW, asOfDate), sourceMaxDate };
}
