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
 *
 * In dry-run mode: skips live API calls, prints incremental strategy per ticker.
 */
export async function ingestPrices(
  universe: UniverseEntry[],
  opts: { dryRun: boolean }
): Promise<IngestResult> {
  const errors: string[] = [];
  let rowsUpserted = 0;

  // Build a map of last ingested date per ticker for incremental support
  const lastDateMap = new Map<string, Date>();
  try {
    const lastDates = await prisma.$queryRaw<{ ticker: string; last_date: Date }[]>`
      SELECT ticker, MAX(date) as last_date FROM ohlcv_daily GROUP BY ticker
    `;
    for (const row of lastDates) {
      lastDateMap.set(row.ticker, new Date(row.last_date));
    }
  } catch {
    // Table may be empty or DB unavailable in dry-run — continue with full fetch plan
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

  if (opts.dryRun) {
    // In dry-run: print incremental strategy without making API calls
    for (const ticker of tickersNeedingFull) {
      const entry = universe.find((e) => e.ticker === ticker)!;
      const lastDate = lastDateMap.get(ticker);
      console.log(
        `[dry-run] prices: ${ticker} — full fetch (last_date: ${lastDate ? lastDate.toISOString().slice(0, 10) : 'never'}, inception: ${entry.inceptionDate})`
      );
    }
    for (const ticker of tickersNeedingCompact) {
      const lastDate = lastDateMap.get(ticker)!;
      console.log(
        `[dry-run] prices: ${ticker} — incremental compact fetch since ${lastDate.toISOString().slice(0, 10)}`
      );
    }
    console.log(
      `[dry-run] prices summary: ${tickersNeedingFull.length} full, ${tickersNeedingCompact.length} incremental`
    );
    return { source: 'alpha-vantage', rowsUpserted: 0, errors: [], status: 'success' };
  }

  // Live run: fetch and upsert

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

    // Insert in batches. Prisma Postgres / Accelerate is much faster with
    // createMany than thousands of one-row raw SQL upserts.
    for (let start = 0; start < rows.length; start += 1000) {
      const batch = rows.slice(start, start + 1000);
      try {
        const created = await prisma.ohlcvDaily.createMany({
          data: batch.map((row) => ({
            ticker: row.ticker,
            date: row.date,
            open: row.open,
            high: row.high,
            low: row.low,
            close: row.close,
            adjClose: row.adjClose,
            volume: row.volume,
            dividendAmt: row.dividendAmt,
            splitCoeff: row.splitCoeff,
          })),
          skipDuplicates: true,
        });
        rowsUpserted += created.count;
      } catch (err) {
        errors.push(
          `${result.ticker} batch ${start / 1000 + 1}: ${err instanceof Error ? err.message : String(err)}`
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
  // AV does not expose outputsize per-ticker via fetchUniverseOhlcv's public API.
  // We call the full provider and slice to 250 rows — same data, no extra charge.
  const results = await fetchUniverseOhlcv(tickers);
  return results.map((r) => ({
    ...r,
    rows: r.rows.slice(0, 250),
  }));
}
