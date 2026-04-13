import type { OecdCliRow } from '../types';
import { fetchFredAllVintages, fetchFredCurrentObservations } from './alfred';

/**
 * OECD CLI series on FRED.
 *
 * Tier 1 — ALFRED vintage supported (output_type=2 works):
 *   US, GB, DE, JP
 *
 * Tier 2 — current observations only (no ALFRED vintage for these):
 *   CA, AU, BR, CN, FR, IT, KR
 *   Stored with realtimeStart = observationDate — point-in-time bias is minimal
 *   because CLI is published with ~1 month lag and revisions are small.
 */
const VINTAGE_SERIES: Record<string, string> = {
  US: 'USALOLITONOSTSAM',
  GB: 'GBRLOLITONOSTSAM',
  DE: 'DEULOLITONOSTSAM',
  JP: 'JPNLOLITONOSTSAM',
};

const CURRENT_OBS_SERIES: Record<string, string> = {
  CA: 'CANLOLITONOSTSAM',
  AU: 'AUSLOLITOAASTSAM',
  BR: 'BRALOLITONOSTSAM',
  CN: 'CHNLOLITONOSTSAM',
  FR: 'FRALOLITONOSTSAM',
  IT: 'ITALOLITONOSTSAM',
  KR: 'KORLOLITONOSTSAM',
};

const ALL_SERIES = { ...VINTAGE_SERIES, ...CURRENT_OBS_SERIES };

export async function fetchOecdCliForCountry(
  isoCountry: string,
  startDate = '2000-01-01'
): Promise<OecdCliRow[]> {
  const code = isoCountry.toUpperCase();
  const seriesId = ALL_SERIES[code];

  if (!seriesId) {
    const supported = Object.keys(ALL_SERIES).join(', ');
    throw new Error(
      `No OECD CLI FRED series for country "${isoCountry}". Supported: ${supported}`
    );
  }

  let vintageRows;
  if (VINTAGE_SERIES[code]) {
    vintageRows = await fetchFredAllVintages(seriesId, startDate);
  } else {
    // Current obs — realtimeStart = observationDate (no vintage history in ALFRED)
    vintageRows = await fetchFredCurrentObservations(seriesId, startDate);
  }

  return vintageRows.map((row) => ({
    country: code,
    period: row.observationDate,
    cliValue: row.value,
    seriesId,
  }));
}
