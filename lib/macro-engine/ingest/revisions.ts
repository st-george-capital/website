import { prisma } from '../db';
import { fetchAnalystEstimates } from '../providers/fmp';
import { fetchOecdCliForCountry } from '../providers/oecd';
import { getByType, getCountries } from '../universe';
import type { IngestResult } from './prices';

/**
 * Ingests earnings revisions (EarningsRevision) for equity tickers via FMP
 * and OECD CLI data (OecdLeadingIndicator) for all countries in the universe.
 *
 * In dry-run mode: skips live API calls and prints planned operations.
 */
export async function ingestRevisions(
  tickers: string[],
  opts: { dryRun: boolean }
): Promise<IngestResult> {
  const errors: string[] = [];
  let rowsUpserted = 0;

  const equities = getByType('equity').filter((e) => tickers.includes(e.ticker));
  const countries = getCountries();

  if (opts.dryRun) {
    for (const entry of equities) {
      console.log(`[dry-run] revisions/fmp: ${entry.ticker} — would fetch analyst estimates`);
    }
    for (const country of countries) {
      console.log(`[dry-run] revisions/oecd: ${country} — would fetch CLI data via FRED mirror`);
    }
    console.log(
      `[dry-run] revisions summary: ${equities.length} equity tickers, ${countries.length} OECD countries`
    );
    return { source: 'fmp+oecd', rowsUpserted: 0, errors: [], status: 'success' };
  }

  // ── Earnings Revisions (FMP) ──────────────────────────────────────────────
  for (const entry of equities) {
    try {
      const rows = await fetchAnalystEstimates(entry.ticker);

      for (const row of rows) {
        try {
          await prisma.$executeRaw`
            INSERT INTO earnings_revisions
              (id, symbol, date, "estimatedEpsLow", "estimatedEpsHigh", "estimatedEpsAvg", "estimatedRevAvg", "numAnalystsEps", "fetchedAt")
            VALUES (
              gen_random_uuid()::text,
              ${row.symbol},
              ${row.date},
              ${row.estimatedEpsLow},
              ${row.estimatedEpsHigh},
              ${row.estimatedEpsAvg},
              ${row.estimatedRevAvg},
              ${row.numAnalystsEps},
              NOW()
            )
            ON CONFLICT (symbol, date) DO UPDATE SET
              "estimatedEpsLow"  = EXCLUDED."estimatedEpsLow",
              "estimatedEpsHigh" = EXCLUDED."estimatedEpsHigh",
              "estimatedEpsAvg"  = EXCLUDED."estimatedEpsAvg",
              "estimatedRevAvg"  = EXCLUDED."estimatedRevAvg",
              "numAnalystsEps"   = EXCLUDED."numAnalystsEps",
              "fetchedAt"        = NOW()
          `;
          rowsUpserted++;
        } catch (err) {
          errors.push(
            `EarningsRevision ${row.symbol} ${row.date.toISOString()}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    } catch (err) {
      errors.push(`FMP ${entry.ticker}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── OECD CLI (via FRED mirror) ────────────────────────────────────────────
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
          errors.push(
            `OecdCLI ${row.country} ${row.period.toISOString()}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    } catch (err) {
      errors.push(`OECD ${country}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const status = errors.length === 0 ? 'success' : rowsUpserted > 0 ? 'partial' : 'error';
  return { source: 'fmp+oecd', rowsUpserted, errors, status };
}
