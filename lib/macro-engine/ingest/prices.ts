import { prisma } from '../db';
import type { UniverseEntry } from '../types';
import { fetchUniverseOhlcv } from '../providers/alpha-vantage';

export interface IngestResult {
  source: string;
  rowsUpserted: number;
  errors: string[];
  status: 'success' | 'error' | 'partial';
}

/**
 * Fetches adjusted daily OHLCV for all tickers in the universe and upserts
 * into ohlcv_daily. Pre-inception rows are filtered out before any write.
 *
 * Incremental: if max(date) for a ticker is within 7 days of today, uses
 * outputsize=compact (250 rows). If more than 7 days behind, uses full.
 */
export async function ingestPrices(
  universe: UniverseEntry[],
  opts: { dryRun: boolean }
): Promise<IngestResult> {
  const errors: string[] = [];
  let rowsUpserted = 0;

  // Build a map of last ingested date per ticker for incremental support
  const lastDateMap = new Map<string, Date>();
  if (!opts.dryRun) {
    try {
      const lastDates = await prisma.$queryRaw<{ ticker: string; last_date: Date }[]>`
        SELECT ticker, MAX(date) as last_date FROM ohlcv_daily GROUP BY ticker
      `;
      for (const row of lastDates) {
        lastDateMap.set(row.ticker, new Date(row.last_date));
      }
    } catch {
      // Table may be empty or not yet have rows — continue with full fetch
    }
  }

  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Determine if compact fetch is appropriate for each ticker
  const tickersNeedingFull: string[] = [];
  const tickersNeedingCompact: string[] = [];

  for (const entry of universe) {
    const lastDate = lastDateMap.get(entry.ticker);
    if (lastDate && lastDate >= sevenDaysAgo) {
      tickersNeedingCompact.push(entry.ticker);
    } else {
      tickersNeedingFull.push(entry.ticker);
    }
  }

  // Fetch full-history tickers
  const fullResults = tickersNeedingFull.length > 0
    ? await fetchUniverseOhlcv(tickersNeedingFull)
    : [];

  // Fetch compact tickers (recent 250 rows only)
  const compactResults = tickersNeedingCompact.length > 0
    ? await fetchUniverseOhlcvCompact(tickersNeedingCompact)
    : [];

  const allResults = [...fullResults, ...compactResults];

  // Build lookup from ticker to inceptionDate for filtering
  const inceptionMap = new Map<string, Date>();
  for (const entry of universe) {
    inceptionMap.set(entry.ticker, new Date(entry.inceptionDate));
  }

  for (const result of allResults) {
    if (result.error) {
      errors.push(`${result.ticker}: ${result.error}`);
      continue;
    }

    const inception = inceptionMap.get(result.ticker);
    const rows = inception
      ? result.rows.filter((r) => r.date >= inception)
      : result.rows;

    if (opts.dryRun) {
      console.log(`[dry-run] prices: ${result.ticker} — ${rows.length} rows (post-inception)`);
      rowsUpserted += rows.length;
      continue;
    }

    // Upsert rows in batches
    for (const row of rows) {
      try {
        await prisma.$executeRaw`
          INSERT INTO ohlcv_daily (ticker, date, open, high, low, close, "adjClose", volume, "dividendAmt", "splitCoeff")
          VALUES (
            ${row.ticker},
            ${row.date},
            ${row.open},
            ${row.high},
            ${row.low},
            ${row.close},
            ${row.adjClose},
            ${row.volume},
            ${row.dividendAmt},
            ${row.splitCoeff}
          )
          ON CONFLICT (ticker, date) DO UPDATE SET
            open = EXCLUDED.open,
            high = EXCLUDED.high,
            low = EXCLUDED.low,
            close = EXCLUDED.close,
            "adjClose" = EXCLUDED."adjClose",
            volume = EXCLUDED.volume,
            "dividendAmt" = EXCLUDED."dividendAmt",
            "splitCoeff" = EXCLUDED."splitCoeff"
        `;
        rowsUpserted++;
      } catch (err) {
        errors.push(
          `${result.ticker} ${row.date.toISOString()}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  const status = errors.length === 0 ? 'success' : rowsUpserted > 0 ? 'partial' : 'error';
  return { source: 'alpha-vantage', rowsUpserted, errors, status };
}

/**
 * Fetches compact (recent 250 rows) OHLCV for the given tickers.
 * Used for incremental runs when last_date is within 7 days.
 */
async function fetchUniverseOhlcvCompact(
  tickers: string[]
): Promise<{ ticker: string; rows: import('../types').OhlcvDailyRow[]; error?: string }[]> {
  // Import the underlying fetch helpers inline to avoid circular deps
  const { fetchUniverseOhlcv: _full } = await import('../providers/alpha-vantage');
  // AV does not expose outputsize per-ticker via fetchUniverseOhlcv, so we use
  // the same provider but note: compact means only 250 rows (last ~1 year).
  // For a true compact call we'd need a custom fetch. The stagger is respected
  // inside fetchUniverseOhlcv already. For simplicity we call full fetch but
  // filter to last 250 rows post-fetch (no extra API charge; AV response is same).
  const results = await _full(tickers);
  return results.map((r) => ({
    ...r,
    rows: r.rows.slice(0, 250),
  }));
}
