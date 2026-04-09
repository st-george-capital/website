import type { OecdCliRow } from '../types';
import { fetchFredAllVintages } from './alfred';

/**
 * Country-to-FRED-series map for OECD Composite Leading Indicators (CLI).
 * OECD CLI series are mirrored on FRED (USALOLITONOSTSAM pattern).
 * Using the FRED mirror simplifies fetching and provides vintage history
 * via the same ALFRED output_type=2 pattern.
 */
const COUNTRY_SERIES_MAP: Record<string, string> = {
  US: 'USALOLITONOSTSAM',
  GB: 'GBRLOLITONOSTSAM',
  DE: 'DEULOLITONOSTSAM',
  JP: 'JPNLOLITONOSTSAM',
  CN: 'CHNLOLITONOSTSAM',
  KR: 'KORLOLITONOSTSAM',
  BR: 'BRALOLITONOSTSAM',
  CA: 'CANLOLITONOSTSAM',
  AU: 'AUSLOLITONOSTSAM',
  FR: 'FRALOLITONOSTSAM',
  IT: 'ITALOLITONOSTSAM',
};

/**
 * Fetches OECD Composite Leading Indicator (CLI) data for a country by using
 * the FRED mirror of the OECD CLI series via ALFRED vintage fetching.
 *
 * @param isoCountry - ISO 2-letter country code (e.g. 'US', 'DE', 'JP')
 * @param startDate  - ISO date string for the start of the observation window
 */
export async function fetchOecdCliForCountry(
  isoCountry: string,
  startDate = '2000-01-01'
): Promise<OecdCliRow[]> {
  const seriesId = COUNTRY_SERIES_MAP[isoCountry.toUpperCase()];

  if (!seriesId) {
    const supported = Object.keys(COUNTRY_SERIES_MAP).join(', ');
    throw new Error(
      `No OECD CLI FRED series mapped for country code "${isoCountry}". ` +
      `Supported codes: ${supported}`
    );
  }

  const vintageRows = await fetchFredAllVintages(seriesId, startDate);

  return vintageRows.map((row) => ({
    country: isoCountry.toUpperCase(),
    period: row.observationDate,
    cliValue: row.value,
    seriesId,
  }));
}
