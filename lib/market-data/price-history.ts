// Price-history data pipeline for the CVaR optimizer (and any future consumer of
// multi-year daily OHLC history). Polygon is the primary source; Alpha Vantage is the
// fallback when Polygon fails or is rate-limited, per the confirmed source-preference
// order. Rows are upserted into PriceHistory, tagged with their source for auditability.
//
// This is a *new* data path — it does not touch MarketData (used by the live-quote cache
// in app/api/market-data/[ticker]/route.ts) or BenchmarkData (SPY-only, untouched here).

import { prisma } from '@/lib/prisma';
import { fetchAlphaVantageFullOHLC } from '@/lib/alpha-vantage';
import { sequential } from '@/lib/market-data/rate-limit';

export interface OHLCBar {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export interface BackfillResult {
  ticker: string;
  status: 'ok' | 'error';
  source: 'polygon' | 'alpha_vantage' | null;
  rowsWritten: number;
  error?: string;
}

// 5 years daily retention window (see plan Section 4).
export const RETENTION_YEARS = 5;

function toDateOnlyUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Polygon's range-aggregates endpoint — new in this repo, distinct from the prev-day-only
 * `fetchFromPolygon` in app/api/market-data/[ticker]/route.ts. Mirrors that function's
 * error/fallback style: throws on non-ok responses, maps `data.results[]` bars
 * ({o,h,l,c,v,t}) into OHLCBar rows. `t` is ms-epoch UTC per Polygon's docs.
 */
export async function fetchPolygonDailyRange(
  ticker: string,
  fromDate: Date,
  toDate: Date
): Promise<OHLCBar[]> {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not configured');
  }

  const from = formatYMD(fromDate);
  const to = formatYMD(toDate);
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
    ticker
  )}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Polygon range request failed for ${ticker}: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data.results)) {
    // Polygon returns { resultsCount: 0 } with no `results` key when there's no data —
    // treat as an empty (not erroring) result rather than throwing.
    return [];
  }

  return data.results.map((bar: { o: number; h: number; l: number; c: number; v?: number; t: number }) => ({
    date: toDateOnlyUTC(new Date(bar.t)),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: typeof bar.v === 'number' ? bar.v : null,
  }));
}

/**
 * Alpha Vantage fallback — full OHLC via the additive fetchAlphaVantageFullOHLC helper.
 * `outputsize=full` returns ~20 years; we filter down to the retention window client-side
 * since Alpha Vantage has no from/to range param.
 */
export async function fetchAlphaVantageDailyRange(
  ticker: string,
  fromDate: Date,
  toDate: Date
): Promise<OHLCBar[]> {
  const rows = await fetchAlphaVantageFullOHLC(ticker, 'full');
  const from = formatYMD(fromDate);
  const to = formatYMD(toDate);
  return rows
    .filter((r) => r.date >= from && r.date <= to)
    .map((r) => ({
      date: toDateOnlyUTC(new Date(`${r.date}T00:00:00Z`)),
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: Number.isFinite(r.volume) ? r.volume : null,
    }));
}

/**
 * Tries Polygon first, falls back to Alpha Vantage on failure/rate-limit, upserts into
 * PriceHistory, tags `source`. Returns a per-ticker status summary rather than throwing,
 * so a single bad ticker doesn't abort a multi-ticker backfill batch.
 */
export async function backfillPriceHistory(
  ticker: string,
  { fromDate, toDate }: { fromDate: Date; toDate: Date }
): Promise<BackfillResult> {
  let bars: OHLCBar[] = [];
  let source: 'polygon' | 'alpha_vantage' | null = null;
  let lastError: string | undefined;

  try {
    bars = await fetchPolygonDailyRange(ticker, fromDate, toDate);
    source = 'polygon';
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    console.warn(`Polygon range fetch failed for ${ticker}, falling back to Alpha Vantage:`, lastError);
    try {
      bars = await fetchAlphaVantageDailyRange(ticker, fromDate, toDate);
      source = 'alpha_vantage';
    } catch (fallbackErr) {
      lastError = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      return { ticker, status: 'error', source: null, rowsWritten: 0, error: lastError };
    }
  }

  if (bars.length === 0) {
    return { ticker, status: 'ok', source, rowsWritten: 0 };
  }

  let rowsWritten = 0;
  for (const bar of bars) {
    if (
      !Number.isFinite(bar.open) ||
      !Number.isFinite(bar.high) ||
      !Number.isFinite(bar.low) ||
      !Number.isFinite(bar.close)
    ) {
      continue; // skip malformed bars rather than writing NaN/garbage rows
    }
    await prisma.priceHistory.upsert({
      where: { ticker_date: { ticker, date: bar.date } },
      update: {
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        source: source as string,
      },
      create: {
        ticker,
        date: bar.date,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        source: source as string,
      },
    });
    rowsWritten += 1;
  }

  return { ticker, status: 'ok', source, rowsWritten };
}

/**
 * Checks existing PriceHistory coverage per ticker and only fetches the gap since the
 * most recent stored bar (not a full refetch every run). First-ever backfill for a ticker
 * pulls the full RETENTION_YEARS window.
 */
export async function getOrBackfillPriceHistory(
  tickers: string[],
  opts: { retentionYears?: number; staggerMs?: number } = {}
): Promise<BackfillResult[]> {
  const retentionYears = opts.retentionYears ?? RETENTION_YEARS;
  const now = new Date();
  const fullFromDate = new Date(now);
  fullFromDate.setUTCFullYear(fullFromDate.getUTCFullYear() - retentionYears);

  // NOTE: deliberately NOT forcing uppercase here — callers (run/route.ts, latest/
  // route.ts, factors/route.ts) all key PriceHistory/FactorExposure lookups by
  // `Holding.apiTicker || Holding.ticker` verbatim, so this must match that exact casing
  // rather than silently normalizing it (which could desync from those other lookups for
  // any ticker whose apiTicker isn't already all-uppercase, e.g. some exchange-suffixed
  // apiTickers).
  const uniqueTickers = [...new Set(tickers)];

  // Look up the latest stored date per ticker in one grouped query.
  const latestRows = await prisma.priceHistory.groupBy({
    by: ['ticker'],
    where: { ticker: { in: uniqueTickers } },
    _max: { date: true },
  });
  const latestByTicker = new Map(latestRows.map((r) => [r.ticker, r._max.date]));

  const jobs = uniqueTickers.map((ticker) => async () => {
    const latest = latestByTicker.get(ticker);
    let fromDate = fullFromDate;
    if (latest) {
      // Gap-fill from the day after the latest stored bar. If already current
      // (latest >= yesterday), this still issues a small range fetch — cheap and
      // idempotent (upsert), and keeps the "gap" logic simple/robust to weekends/holidays.
      const gapFrom = new Date(latest);
      gapFrom.setUTCDate(gapFrom.getUTCDate() + 1);
      fromDate = gapFrom > fullFromDate ? gapFrom : fullFromDate;
    }
    if (fromDate > now) {
      return { ticker, status: 'ok', source: null, rowsWritten: 0 } as BackfillResult;
    }
    return backfillPriceHistory(ticker, { fromDate, toDate: now });
  });

  const results = await sequential(jobs, opts.staggerMs ?? 550, 15000);
  return results.map(
    (r, i) => r ?? ({ ticker: uniqueTickers[i], status: 'error', source: null, rowsWritten: 0, error: 'timed out' } as BackfillResult)
  );
}
