import { prisma } from '../db';
import { fetchFredAllVintages } from '../providers/alfred';
import type { IngestResult } from './prices';

/**
 * The six FRED series ingested for Phase 2 factor matrix.
 * GDP, UNRATE, CPIAUCSL, FEDFUNDS, T10Y2Y, INDPRO
 */
export const FRED_SERIES_IDS = ['GDP', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS', 'T10Y2Y', 'INDPRO', 'BAMLH0A0HYM2', 'BAMLC0A0CM'];

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

      if (opts.dryRun) {
        console.log(`[dry-run] macro-series: ${seriesId} — incremental fetch since ${startDate} (skipping live API call)`);
        // Estimate row count from typical FRED vintage density (no actual fetch in dry-run)
        rowsUpserted += 0;
        continue;
      }

      const rows = await fetchFredAllVintages(seriesId, startDate);

      for (let start = 0; start < rows.length; start += 1000) {
        const batch = rows.slice(start, start + 1000);
        try {
          const created = await prisma.macroSeriesVintage.createMany({
            data: batch.map((row) => ({
              seriesId: row.seriesId,
              observationDate: row.observationDate,
              realtimeStart: row.realtimeStart,
              realtimeEnd: row.realtimeEnd,
              value: row.value,
            })),
            skipDuplicates: true,
          });
          rowsUpserted += created.count;
        } catch (err) {
          errors.push(
            `${seriesId} batch ${start / 1000 + 1}: ${err instanceof Error ? err.message : String(err)}`
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
