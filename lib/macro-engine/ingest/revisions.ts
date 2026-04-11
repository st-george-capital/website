import { prismaDirectUrl as prisma } from '../db';
import { fetchAvEarnings, ETF_EARNINGS_PROXY } from '../providers/av-earnings';
import { fetchOecdCliForCountry } from '../providers/oecd';
import { getUniverse, getCountries } from '../universe';
import type { IngestResult } from './prices';

/**
 * Ingests:
 * 1. Earnings revisions via Alpha Vantage EARNINGS endpoint (proxy stocks for ETFs)
 * 2. OECD CLI data for all universe countries via FRED mirror
 *
 * Alpha Vantage free tier: 25 requests/day, 5/min.
 * We have 12 unique proxy stocks → stays within free tier.
 */
export async function ingestRevisions(
  tickers: string[],
  opts: { dryRun: boolean }
): Promise<IngestResult> {
  const errors: string[] = [];
  let rowsUpserted = 0;

  const universe = getUniverse().filter(e => tickers.includes(e.ticker));
  const countries = [...new Set(
    getCountries().concat(['CA', 'AU', 'BR', 'CN', 'FR', 'IT'])
  )];

  if (opts.dryRun) {
    const proxySet = new Set(universe.map(e => ETF_EARNINGS_PROXY[e.ticker]).filter(Boolean));
    for (const proxy of proxySet) {
      console.log(`[dry-run] revisions/av-earnings: proxy=${proxy} — would fetch quarterly EPS history`);
    }
    for (const country of countries) {
      console.log(`[dry-run] revisions/oecd: ${country} — would fetch CLI data`);
    }
    return { source: 'fmp+oecd', rowsUpserted: 0, errors: [], status: 'success' };
  }

  // ── Earnings via Alpha Vantage (proxy stocks) ─────────────────────────────
  // De-duplicate proxies so we don't fetch AAPL twice (SPY and XLK both map to AAPL)
  const proxyToEtfs = new Map<string, string[]>();
  for (const entry of universe) {
    const proxy = ETF_EARNINGS_PROXY[entry.ticker];
    if (!proxy) continue;
    if (!proxyToEtfs.has(proxy)) proxyToEtfs.set(proxy, []);
    proxyToEtfs.get(proxy)!.push(entry.ticker);
  }

  // Fetch all AV data first (sleeping between API calls to respect rate limits),
  // then write to DB in one pass — avoids DB connection drops during long sleeps.
  const avData: Array<{ proxyTicker: string; etfTickers: string[]; rows: Awaited<ReturnType<typeof fetchAvEarnings>> }> = [];

  for (const [proxyTicker, etfTickers] of proxyToEtfs) {
    try {
      // Throttle: AV free tier = 5 req/min (sleep BEFORE fetch, not before DB writes)
      await new Promise(r => setTimeout(r, 12500));
      const rows = await fetchAvEarnings(proxyTicker);
      avData.push({ proxyTicker, etfTickers, rows });
    } catch (err) {
      errors.push(`AV-earnings ${proxyTicker}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Write all fetched AV data to DB in one contiguous pass
  for (const { proxyTicker, etfTickers, rows } of avData) {
    for (const etfTicker of etfTickers) {
      for (const row of rows) {
        // Use the reportedDate as the "as of" date — this is when the market knew the EPS
        // Fall back to fiscalDateEnding + 45 days if no reportedDate
        const knownDate = row.reportedDate ?? new Date(row.fiscalDateEnding.getTime() + 45 * 86400000);

        try {
          await prisma.$executeRaw`
            INSERT INTO earnings_revisions
              (id, symbol, date, "estimatedEpsLow", "estimatedEpsHigh", "estimatedEpsAvg",
               "estimatedRevAvg", "numAnalystsEps", "fetchedAt")
            VALUES (
              gen_random_uuid()::text,
              ${etfTicker},
              ${knownDate},
              ${row.estimatedEPS},
              ${row.estimatedEPS},
              ${row.estimatedEPS},
              ${null},
              ${1},
              NOW()
            )
            ON CONFLICT (symbol, date) DO UPDATE SET
              "estimatedEpsAvg" = EXCLUDED."estimatedEpsAvg",
              "fetchedAt"       = NOW()
          `;
          rowsUpserted++;
        } catch (err) {
          errors.push(`EarningsRevision ${etfTicker}/${proxyTicker} ${knownDate.toISOString().slice(0,10)}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  // ── OECD CLI ────────────────────────────────────────────────────────────────
  for (const country of countries) {
    try {
      const rows = await fetchOecdCliForCountry(country);

      for (const row of rows) {
        try {
          await prisma.$executeRaw`
            INSERT INTO oecd_leading_indicators
              (id, country, period, "cliValue", "seriesId", "fetchedAt")
            VALUES (
              gen_random_uuid()::text,
              ${row.country},
              ${row.period},
              ${row.cliValue},
              ${row.seriesId},
              NOW()
            )
            ON CONFLICT (country, period) DO UPDATE SET
              "cliValue"  = EXCLUDED."cliValue",
              "seriesId"  = EXCLUDED."seriesId",
              "fetchedAt" = NOW()
          `;
          rowsUpserted++;
        } catch (err) {
          errors.push(`OecdCLI ${row.country} ${row.period.toISOString().slice(0,10)}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (err) {
      errors.push(`OECD ${country}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const status = errors.length === 0 ? 'success' : rowsUpserted > 0 ? 'partial' : 'error';
  return { source: 'fmp+oecd', rowsUpserted, errors, status };
}
