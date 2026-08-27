const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

export interface FredObservation {
  date: string;
  value: number;
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchFredSeriesHistory(
  seriesId: string,
  limit = 120
): Promise<FredObservation[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    throw new Error('FRED_API_KEY is not configured');
  }

  const url = new URL(FRED_BASE);
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!response.ok) {
    throw new Error(`FRED HTTP ${response.status} for ${seriesId}`);
  }

  const data = await response.json();
  if (data?.error_message) {
    throw new Error(`FRED error for ${seriesId}: ${data.error_message}`);
  }

  const observations: Array<{ date: string; value: string }> = data?.observations ?? [];

  return observations
    .filter((row) => row.value && row.value !== '.')
    .map((row) => ({
      date: row.date,
      value: Number.parseFloat(row.value),
    }))
    .filter((row) => Number.isFinite(row.value))
    .sort((left, right) => left.date.localeCompare(right.date));
}

export async function fetchFredSeriesBatch(
  seriesIds: string[],
  staggerMs = 120
): Promise<Map<string, FredObservation[]>> {
  const results = new Map<string, FredObservation[]>();

  for (let index = 0; index < seriesIds.length; index += 1) {
    const seriesId = seriesIds[index];
    try {
      results.set(seriesId, await fetchFredSeriesHistory(seriesId));
    } catch (error) {
      console.error(`fetchFredSeriesBatch(${seriesId}):`, error);
      results.set(seriesId, []);
    }

    if (staggerMs > 0 && index < seriesIds.length - 1) {
      await delay(staggerMs);
    }
  }

  return results;
}
