import { prisma } from '../db';
import { fetchFredAllVintages } from '../providers/alfred';
import type { IngestResult } from './prices';

/**
 * The six FRED series ingested for Phase 2 factor matrix.
 * GDP, UNRATE, CPIAUCSL, FEDFUNDS, T10Y2Y, INDPRO
 */
export const FRED_SERIES_IDS = ['GDP', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS', 'T10Y2Y', 'INDPRO'];

/**
 * Fetches all vintages for each FRED series and upserts into macro_series_vintage.
 * Uses ALFRED output_type=2 so every row includes realtimeStart + realtimeEnd.
 *
 * Incremental: queries max(realtime_start) per series and uses it as the start date
 * for subsequent fetches.
 */
export async function ingestMacroSeries(
  seriesIds: string[],
  opts: { dryRun: boolean }
): Promise<IngestResult> {
  const errors: string[] = [];
  let rowsUpserted = 0;

  // Build last realtime_start per series for incremental fetches
  const lastRtMap = new Map<string, string>();
  if (!opts.dryRun) {
    try {
      const lastRts = await prisma.$queryRaw<{ series_id: string; max_rt: Date }[]>`
        SELECT "seriesId" AS series_id, MAX("realtimeStart") AS max_rt
        FROM macro_series_vintage
        GROUP BY "seriesId"
      `;
      for (const row of lastRts) {
        lastRtMap.set(row.series_id, new Date(row.max_rt).toISOString().slice(0, 10));
      }
    } catch {
      // Table may be empty — continue with full fetch from 2000-01-01
    }
  }

  for (const seriesId of seriesIds) {
    try {
      const startDate = lastRtMap.get(seriesId) ?? '2000-01-01';
      const rows = await fetchFredAllVintages(seriesId, startDate);

      if (opts.dryRun) {
        console.log(`[dry-run] macro-series: ${seriesId} — ${rows.length} vintage rows (since ${startDate})`);
        rowsUpserted += rows.length;
        continue;
      }

      for (const row of rows) {
        try {
          await prisma.$executeRaw`
            INSERT INTO macro_series_vintage ("seriesId", "observationDate", "realtimeStart", "realtimeEnd", value)
            VALUES (
              ${row.seriesId},
              ${row.observationDate},
              ${row.realtimeStart},
              ${row.realtimeEnd},
              ${row.value}
            )
            ON CONFLICT ("seriesId", "observationDate", "realtimeStart") DO UPDATE SET
              "realtimeEnd" = EXCLUDED."realtimeEnd",
              value = EXCLUDED.value
          `;
          rowsUpserted++;
        } catch (err) {
          errors.push(
            `${seriesId} ${row.observationDate.toISOString()}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    } catch (err) {
      errors.push(`${seriesId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const status = errors.length === 0 ? 'success' : rowsUpserted > 0 ? 'partial' : 'error';
  return { source: 'fred', rowsUpserted, errors, status };
}
