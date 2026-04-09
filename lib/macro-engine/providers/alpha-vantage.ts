import type { OhlcvDailyRow } from '../types';

const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';

function getApiKey(): string {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ALPHA_VANTAGE_API_KEY is not set. Set it in .env before calling AV provider functions.'
    );
  }
  return apiKey;
}

async function fetchAv(params: Record<string, string>): Promise<unknown> {
  const url = new URL(ALPHA_VANTAGE_BASE);
  const apiKey = getApiKey();

  Object.entries({ ...params, apikey: apiKey }).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Rate limit detection — same patterns as lib/alpha-vantage.ts
  if (data.Note) {
    throw new Error('Alpha Vantage rate limit reached');
  }
  if (data['Error Message']) {
    throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
  }
  if (data.Information) {
    throw new Error(`Alpha Vantage info: ${data.Information}`);
  }

  return data;
}

function parseRows(ticker: string, data: unknown): OhlcvDailyRow[] {
  const d = data as Record<string, unknown>;
  const timeSeries = (
    d['Time Series (Daily Adjusted)'] ?? d['Time Series (Daily)']
  ) as Record<string, Record<string, string>> | undefined;

  if (!timeSeries) {
    throw new Error(
      `No daily adjusted time series in response for ${ticker}. ` +
      'Ensure TIME_SERIES_DAILY_ADJUSTED endpoint was used, not TIME_SERIES_DAILY.'
    );
  }

  return Object.entries(timeSeries).map(([dateStr, values]) => ({
    ticker,
    date: new Date(dateStr),
    open: parseFloat(values['1. open']),
    high: parseFloat(values['2. high']),
    low: parseFloat(values['3. low']),
    close: parseFloat(values['4. close']),
    adjClose: parseFloat(values['5. adjusted close']),
    volume: BigInt(values['6. volume'] ?? '0'),
    dividendAmt: parseFloat(values['7. dividend amount'] ?? '0'),
    splitCoeff: parseFloat(values['8. split coefficient'] ?? '1'),
  }));
}

/**
 * Fetches the full adjusted daily OHLCV history for a ticker.
 *
 * Uses TIME_SERIES_DAILY_ADJUSTED (NOT TIME_SERIES_DAILY). The adjusted endpoint
 * corrects for splits and dividends. Using the unadjusted endpoint produces
 * split-distorted prices and corrupts momentum factors — this is a hard error.
 */
export async function fetchFullOhlcv(ticker: string): Promise<OhlcvDailyRow[]> {
  const data = await fetchAv({
    function: 'TIME_SERIES_DAILY_ADJUSTED',
    symbol: ticker,
    outputsize: 'full',
  });

  return parseRows(ticker, data);
}

/**
 * Filters full OHLCV history to rows on or after `since`.
 */
export async function fetchOhlcvSince(ticker: string, since: Date): Promise<OhlcvDailyRow[]> {
  const rows = await fetchFullOhlcv(ticker);
  return rows.filter((row) => row.date >= since);
}

/**
 * Fetches adjusted OHLCV for a universe of tickers using a sequential for...of
 * loop with a configurable stagger between calls.
 *
 * NEVER uses Promise.all or Promise.allSettled — Alpha Vantage rate limits are
 * 75 req/min on premium, and burst parallelism triggers the 'Note' rate-limit
 * response. Sequential stagger is mandatory.
 */
export async function fetchUniverseOhlcv(
  tickers: string[],
  staggerMs = 800
): Promise<{ ticker: string; rows: OhlcvDailyRow[]; error?: string }[]> {
  const results: { ticker: string; rows: OhlcvDailyRow[]; error?: string }[] = [];

  for (const ticker of tickers) {
    try {
      const rows = await fetchFullOhlcv(ticker);
      results.push({ ticker, rows });
    } catch (err) {
      results.push({
        ticker,
        rows: [],
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Stagger between calls — skip delay after last ticker
    if (ticker !== tickers[tickers.length - 1]) {
      await new Promise((resolve) => setTimeout(resolve, staggerMs));
    }
  }

  return results;
}
