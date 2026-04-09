/**
 * lib/macro-engine/features/factors/carry.ts
 *
 * Compute carry factor z-score (point-in-time).
 * - For country ETFs: policy rate differential vs FEDFUNDS, rollingZScore
 * - For sector ETFs (countryCode=null): returns null (carry not applicable)
 */
import { subMonths } from 'date-fns';
import { getFredAsOf } from '../../query';
import { rollingZScore, MONTHLY_WINDOW } from '../z-scores';

/**
 * Maps ISO2 country codes to their central bank policy rate FRED series IDs.
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

async function fetchRateSeries(
  seriesId: string,
  asOfDate: Date,
  monthsBack: number
): Promise<{ date: Date; value: number }[]> {
  const result: { date: Date; value: number }[] = [];
  for (let i = monthsBack; i >= 0; i--) {
    const obsDate = subMonths(asOfDate, i);
    const row = await getFredAsOf(seriesId, obsDate, asOfDate);
    if (row) {
      result.push({ date: row.observationDate, value: row.value });
    }
  }
  return result;
}

export async function computeCarryFactor(
  asOfDate: Date,
  countryCode: string | null
): Promise<{ value: number | null; sourceMaxDate: Date | null }> {
  // Carry is not meaningful for sector ETFs
  if (countryCode === null) return { value: null, sourceMaxDate: null };

  const countrySeries = COUNTRY_RATE_SERIES[countryCode];
  if (!countrySeries) return { value: null, sourceMaxDate: null };

  // US carry differential is always zero — not informative
  if (countryCode === 'US') return { value: null, sourceMaxDate: null };

  const [countryRates, usFedFunds] = await Promise.all([
    fetchRateSeries(countrySeries, asOfDate, 65),
    fetchRateSeries('FEDFUNDS', asOfDate, 65),
  ]);

  if (countryRates.length === 0 || usFedFunds.length === 0) {
    return { value: null, sourceMaxDate: null };
  }

  // Build a map of FEDFUNDS by month key for alignment
  const fedMap = new Map<string, number>();
  for (const r of usFedFunds) {
    const key = `${r.date.getFullYear()}-${r.date.getMonth()}`;
    fedMap.set(key, r.value);
  }

  // Compute rate differential series
  const diffSeries: { date: Date; value: number }[] = [];
  let sourceMaxDate: Date | null = null;

  for (const r of countryRates) {
    const key = `${r.date.getFullYear()}-${r.date.getMonth()}`;
    const fed = fedMap.get(key);
    if (fed !== undefined) {
      diffSeries.push({ date: r.date, value: r.value - fed });
      if (!sourceMaxDate || r.date > sourceMaxDate) sourceMaxDate = r.date;
    }
  }

  return { value: rollingZScore(diffSeries, MONTHLY_WINDOW, asOfDate), sourceMaxDate };
}
