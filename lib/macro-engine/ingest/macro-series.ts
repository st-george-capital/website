import { prismaDirectUrl as prisma } from '../db';
import { fetchFredAllVintages, fetchFredAllVintagesChunked, fetchFredCurrentObservations } from '../providers/alfred';
import type { IngestResult } from './prices';

/**
 * Series fetched via ALFRED output_type=2 vintage (full point-in-time history).
 * These support the wide/pivot format from ALFRED and have long vintage histories.
 */
const FRED_VINTAGE_SERIES = ['GDP', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS'];

/**
 * Daily series fetched via ALFRED output_type=2 in yearly chunks.
 * These are high-frequency series where the full response would exceed FRED's limits.
 * DGS10 and DGS2 are used to compute the 10Y-2Y yield curve spread.
 */
const FRED_VINTAGE_CHUNKED_SERIES = ['DGS10', 'DGS2'];

/**
 * Series fetched as current observations (no vintage in ALFRED).
 * These are stored with realtimeStart = observationDate — point-in-time accuracy
 * is limited, but policy rates move slowly so look-ahead bias is minimal.
 *
 * - BAMLH0A0HYM2: ICE BofA HY OAS spread (daily, credit signal)
 * - ECBDFR: ECB deposit facility rate (daily)
 * - IRSTCB01JPM156N: Japan policy rate (monthly)
 * - BOERUKM: Bank of England base rate (monthly)
 * - IRSTCB01CAM156N: Canada overnight rate (monthly)
 * - IRSTCB01BRM156N: Brazil SELIC rate (monthly)
 */
const FRED_CURRENT_OBS_SERIES = [
  'BAMLH0A0HYM2',
  'ECBDFR',
  'IRSTCB01JPM156N',
  'BOERUKM',
  'IRSTCB01CAM156N',
  'IRSTCB01BRM156N',
];

export const FRED_SERIES_IDS = [
  ...FRED_VINTAGE_SERIES,
  ...FRED_VINTAGE_CHUNKED_SERIES,
  ...FRED_CURRENT_OBS_SERIES,
];

async function upsertRows(
  rows: Array<{
    seriesId: string;
    observationDate: Date;
    realtimeStart: Date;
    realtimeEnd: Date;
    value: number;
  }>
): Promise<number> {
  let upserted = 0;
  for (let start = 0; start < rows.length; start += 500) {
    const batch = rows.slice(start, start + 500);
    for (const row of batch) {
      await prisma.$executeRaw`
        INSERT INTO macro_series_vintage ("seriesId", "observationDate", "realtimeStart", "realtimeEnd", value)
        VALUES (${row.seriesId}, ${row.observationDate}, ${row.realtimeStart}, ${row.realtimeEnd}, ${row.value})
        ON CONFLICT ("seriesId", "observationDate", "realtimeStart") DO NOTHING
      `;
      upserted++;
    }
  }
  return upserted;
}

export async function ingestMacroSeries(
  seriesIds: string[],
  opts: { dryRun: boolean }
): Promise<IngestResult> {
  const errors: string[] = [];
  let rowsUpserted = 0;

  // Build last realtimeStart per series for incremental fetches
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

  const toFetch = seriesIds.filter(id => FRED_SERIES_IDS.includes(id));

  for (const seriesId of toFetch) {
    try {
      const startDate = lastRtMap.get(seriesId) ?? '2000-01-01';

      if (opts.dryRun) {
        const mode = FRED_VINTAGE_CHUNKED_SERIES.includes(seriesId) ? 'chunked-vintage'
          : FRED_CURRENT_OBS_SERIES.includes(seriesId) ? 'current-obs'
          : 'vintage';
        console.log(`[dry-run] macro-series: ${seriesId} — ${mode} fetch since ${startDate}`);
        continue;
      }

      let rows;
      if (FRED_VINTAGE_CHUNKED_SERIES.includes(seriesId)) {
        rows = await fetchFredAllVintagesChunked(seriesId, startDate);
      } else if (FRED_CURRENT_OBS_SERIES.includes(seriesId)) {
        rows = await fetchFredCurrentObservations(seriesId, startDate);
      } else {
        rows = await fetchFredAllVintages(seriesId, startDate);
      }

      const count = await upsertRows(rows);
      rowsUpserted += count;
    } catch (err) {
      errors.push(`${seriesId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const status = errors.length === 0 ? 'success' : rowsUpserted > 0 ? 'partial' : 'error';
  return { source: 'fred', rowsUpserted, errors, status };
}
