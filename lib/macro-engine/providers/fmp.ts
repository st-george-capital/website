import type { EarningsRevisionRow } from '../types';

const FMP_BASE = 'https://financialmodelingprep.com/api/v3';

/**
 * Fetches analyst estimates (EPS revisions) for a given symbol from
 * Financial Modeling Prep.
 *
 * REQUIRED: FMP_API_KEY env var must be set (Starter tier for 10+ years of history).
 */
export async function fetchAnalystEstimates(symbol: string): Promise<EarningsRevisionRow[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    throw new Error(
      'FMP_API_KEY is not set. Set it in .env before calling fetchAnalystEstimates. ' +
      'A Starter tier subscription (~$14/month at financialmodelingprep.com) is required for 10+ years of history.'
    );
  }

  const url = `${FMP_BASE}/analyst-estimates/${encodeURIComponent(symbol)}?limit=200&apikey=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error(`FMP API returned unexpected response for ${symbol}: ${JSON.stringify(data)}`);
  }

  return data.map((item: Record<string, unknown>) => ({
    symbol: String(item.symbol ?? symbol),
    date: new Date(String(item.date ?? '')),
    estimatedEpsLow: item.estimatedEpsLow != null ? Number(item.estimatedEpsLow) : null,
    estimatedEpsHigh: item.estimatedEpsHigh != null ? Number(item.estimatedEpsHigh) : null,
    estimatedEpsAvg: item.estimatedEpsAvg != null ? Number(item.estimatedEpsAvg) : null,
    estimatedRevAvg:
      item.estimatedRevenueAvg != null ? Number(item.estimatedRevenueAvg) : null,
    numAnalystsEps:
      item.numberAnalystsEstimatedEps != null
        ? Number(item.numberAnalystsEstimatedEps)
        : null,
  }));
}
