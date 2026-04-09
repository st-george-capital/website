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
    throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error_message) {
    throw new Error(`FRED API error: ${data.error_message}`);
  }

  const observations: unknown[] = Array.isArray(data.observations) ? data.observations : [];

  const rows: MacroSeriesVintageRow[] = [];

  for (const obs of observations) {
    const o = obs as Record<string, string>;

    // Filter out unreleased values (FRED represents missing as '.')
    if (o.value === '.') continue;

    const value = parseFloat(o.value);
    if (!isFinite(value)) continue;

    rows.push({
      seriesId,
      observationDate: new Date(o.date),
      realtimeStart: new Date(o.realtime_start),
      realtimeEnd: new Date(o.realtime_end),
      value,
    });
  }

  return rows;
}
