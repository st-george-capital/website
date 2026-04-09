import type { MacroSeriesVintageRow } from '../types';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

/**
 * Fetches all vintages for a FRED series using output_type=2 (Observations by
 * Vintage Date, All Observations). This returns the full revision history matrix,
 * enabling point-in-time as-of queries that avoid look-ahead bias from retroactive
 * revisions.
 *
 * REQUIRED: FRED_API_KEY env var must be set.
 * REQUIRED params (always sent): output_type=2, realtime_start, realtime_end.
 * A FRED fetch without these vintage params is a hard error by design.
 */
export async function fetchFredAllVintages(
  seriesId: string,
  startDate = '2000-01-01'
): Promise<MacroSeriesVintageRow[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    throw new Error(
      'FRED_API_KEY is not set. Set it in .env before calling fetchFredAllVintages.'
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const url = new URL(FRED_BASE);
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('output_type', '2'); // Observations by Vintage Date, All Observations
  url.searchParams.set('realtime_start', startDate);
  url.searchParams.set('realtime_end', today);
  url.searchParams.set('observation_start', startDate);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('api_key', apiKey);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(
      `FRED vintage fetch for ${seriesId} failed with HTTP ${response.status} — ` +
      'no fallback to current observations (look-ahead bias prevention). ' +
      'Check FRED_API_KEY validity and series availability for output_type=2.'
    );
  }

  const data = await response.json();

  if (data.error_message) {
    throw new Error(`FRED API error: ${data.error_message}`);
  }

  const observations: unknown[] = Array.isArray(data.observations) ? data.observations : [];

  if (observations.length === 0) {
    return [];
  }

  /**
   * output_type=2 returns a WIDE/PIVOT format — each row is:
   *   { "date": "2020-01-01", "GDP_20240101": "21706.51", "GDP_20240228": "21706.51", ... }
   *
   * Keys (other than "date") are `${SERIES_ID}_${YYYYMMDD}` where YYYYMMDD is the vintage date.
   * We expand each row into one MacroSeriesVintageRow per vintage column, giving us the full
   * revision history: for each (observationDate, vintageDate) pair, the value known at that time.
   */
  const rows: MacroSeriesVintageRow[] = [];
  const prefix = `${seriesId}_`;

  for (const obs of observations) {
    const o = obs as Record<string, string>;
    const observationDate = new Date(o.date);

    // Collect all vintage columns for this observation date
    // Sort by vintage date so we can compute realtimeEnd as next vintage - 1 day
    const vintageEntries: Array<{ vintageDate: Date; value: number }> = [];

    for (const [key, val] of Object.entries(o)) {
      if (!key.startsWith(prefix)) continue;
      if (val === '.' || val === '') continue;
      const value = parseFloat(val);
      if (!isFinite(value)) continue;

      const datePart = key.slice(prefix.length); // e.g. "20240101"
      const vintageDate = new Date(
        `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`
      );
      if (isNaN(vintageDate.getTime())) continue;

      vintageEntries.push({ vintageDate, value });
    }

    // Sort ascending by vintage date
    vintageEntries.sort((a, b) => a.vintageDate.getTime() - b.vintageDate.getTime());

    for (let i = 0; i < vintageEntries.length; i++) {
      const { vintageDate, value } = vintageEntries[i];
      // realtimeEnd = day before next vintage, or far-future for the last known vintage
      const nextVintage = vintageEntries[i + 1]?.vintageDate;
      const realtimeEnd = nextVintage
        ? new Date(nextVintage.getTime() - 86400000) // one day before next revision
        : new Date('9999-12-31');

      rows.push({
        seriesId,
        observationDate,
        realtimeStart: vintageDate,
        realtimeEnd,
        value,
      });
    }
  }

  if (rows.length === 0) {
    throw new Error(
      `FRED vintage response for ${seriesId} returned ${observations.length} observation rows ` +
      `but no vintage columns could be parsed. Expected keys like "${prefix}YYYYMMDD". ` +
      'No fallback to current observations (look-ahead bias prevention).'
    );
  }

  return rows;
}

async function fetchFredCurrentObservations(
  seriesId: string,
  startDate: string,
): Promise<MacroSeriesVintageRow[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    throw new Error('FRED_API_KEY is not set.');
  }

  const url = new URL(FRED_BASE);
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('observation_start', startDate);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('limit', '10000');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.error_message) {
    throw new Error(`FRED API error: ${data.error_message}`);
  }

  const observations: unknown[] = Array.isArray(data.observations) ? data.observations : [];
  const realtimeEnd = new Date('9999-12-31');

  return observations.flatMap((obs) => {
    const o = obs as Record<string, string>;
    if (o.value === '.') return [];

    const value = parseFloat(o.value);
    if (!Number.isFinite(value)) return [];

    const observationDate = new Date(o.date);
    return [{
      seriesId,
      observationDate,
      realtimeStart: observationDate,
      realtimeEnd,
      value,
    }];
  });
}
