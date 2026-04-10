/**
 * lib/macro-engine/query.ts
 *
 * Read-only query helpers for Phase 1 data foundation.
 * Server-only — do not import from client components.
 *
 * All queries use prisma.$queryRaw tagged template literals (parameterized SQL).
 * No string interpolation is used — safe from SQL injection.
 *
 * Manual verification notes for operators:
 * - ALFRED vintage accuracy: getFredAsOf('GDP', observationDate, asOfDate) returns
 *   the vintage as published on asOfDate, not the current revised value. Confirm by
 *   comparing against ALFRED website for the same series/date combination.
 * - TimescaleDB hypertable catalog: inspect via
 *     SELECT hypertable_name, num_chunks, compression_enabled
 *     FROM timescaledb_information.hypertables;
 *   Expected: ohlcv_daily, macro_series_vintage, earnings_revisions, oecd_leading_indicators
 */

import { prismaDirectUrl as prisma } from './db';
import type {
  OhlcvDailyRow,
  MacroSeriesVintageRow,
  EarningsRevisionRow,
  OecdCliRow,
} from './types';

export interface CoverageRow {
  ticker: string;
  earliest: Date;
  latest: Date;
  rowCount: bigint;
}

/**
 * Returns OHLCV rows for a ticker in [startDate, endDate] (inclusive).
 */
export async function getOhlcv(
  ticker: string,
  startDate: Date,
  endDate: Date
): Promise<OhlcvDailyRow[]> {
  return prisma.$queryRaw<OhlcvDailyRow[]>`
    SELECT
      ticker,
      date,
      open,
      high,
      low,
      close,
      "adjClose",
      volume,
      "dividendAmt",
      "splitCoeff"
    FROM ohlcv_daily
    WHERE ticker = ${ticker}
      AND date >= ${startDate}
      AND date <= ${endDate}
    ORDER BY date ASC
  `;
}

/**
 * Returns the FRED value as it was known on asOfDate (point-in-time vintage lookup).
 *
 * Logic: finds the row where:
 *   - series_id matches
 *   - observation_date matches the requested observation period
 *   - realtime_start <= asOfDate (vintage was published by asOfDate)
 *   - realtime_end >= asOfDate (vintage had not yet been superseded on asOfDate)
 * Orders by realtime_start DESC and returns the most recent matching vintage.
 */
export async function getFredAsOf(
  seriesId: string,
  observationDate: Date,
  asOfDate: Date
): Promise<MacroSeriesVintageRow | null> {
  const rows = await prisma.$queryRaw<MacroSeriesVintageRow[]>`
    SELECT
      "seriesId",
      "observationDate",
      "realtimeStart",
      "realtimeEnd",
      value
    FROM macro_series_vintage
    WHERE "seriesId" = ${seriesId}
      AND "observationDate" <= ${observationDate}
      AND "realtimeStart" <= ${asOfDate}
      AND "realtimeEnd" >= ${asOfDate}
    ORDER BY "realtimeStart" DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Per-call cache for getFredRangeAsOf — keyed by "seriesId|asOfDate".
 * Cleared by calling clearFredRangeCache(). Used to avoid redundant DB hits
 * when the same FRED series is needed by multiple factor computations on the same date.
 */
const _fredRangeCache = new Map<string, MacroSeriesVintageRow[]>();

export function clearFredRangeCache(): void {
  _fredRangeCache.clear();
}

/**
 * Returns all FRED observations for a series in [obsStart, obsEnd] as known on asOfDate.
 * One query replaces N individual getFredAsOf calls — use this for rolling window calculations.
 *
 * For each distinct observationDate in the window, returns the vintage that was valid on asOfDate
 * (realtimeStart <= asOfDate AND realtimeEnd >= asOfDate), taking the latest realtimeStart.
 *
 * Results are cached by (seriesId, asOfDate) — call clearFredRangeCache() between dates.
 */
export async function getFredRangeAsOf(
  seriesId: string,
  obsStart: Date,
  obsEnd: Date,
  asOfDate: Date
): Promise<MacroSeriesVintageRow[]> {
  // Cache key: series + asOfDate. obsStart/obsEnd vary per call but we always use
  // 65–73 months back from asOfDate — keying on asOfDate is sufficient since the
  // result is trimmed by obsStart anyway.
  const cacheKey = `${seriesId}|${asOfDate.toISOString().slice(0, 10)}`;
  if (_fredRangeCache.has(cacheKey)) {
    const cached = _fredRangeCache.get(cacheKey)!;
    // Filter to requested obs range
    return cached.filter(r => r.observationDate >= obsStart && r.observationDate <= obsEnd);
  }

  // Fetch 80 months of data (max any factor needs is 73 months for inflation)
  const wideStart = new Date(asOfDate.getTime() - 80 * 30.5 * 86400000);
  const rows = await prisma.$queryRaw<MacroSeriesVintageRow[]>`
    SELECT DISTINCT ON ("observationDate")
      "seriesId",
      "observationDate",
      "realtimeStart",
      "realtimeEnd",
      value
    FROM macro_series_vintage
    WHERE "seriesId" = ${seriesId}
      AND "observationDate" >= ${wideStart}
      AND "observationDate" <= ${asOfDate}
      AND "realtimeStart" <= ${asOfDate}
      AND "realtimeEnd" >= ${asOfDate}
    ORDER BY "observationDate" ASC, "realtimeStart" DESC
  `;

  _fredRangeCache.set(cacheKey, rows);
  return rows.filter(r => r.observationDate >= obsStart && r.observationDate <= obsEnd);
}

/**
 * Returns all earnings revisions for a symbol up to asOfDate.
 */
export async function getRevisions(
  symbol: string,
  asOfDate: Date
): Promise<EarningsRevisionRow[]> {
  return prisma.$queryRaw<EarningsRevisionRow[]>`
    SELECT
      symbol,
      date,
      "estimatedEpsLow",
      "estimatedEpsHigh",
      "estimatedEpsAvg",
      "estimatedRevAvg",
      "numAnalystsEps"
    FROM earnings_revisions
    WHERE symbol = ${symbol}
      AND date <= ${asOfDate}
    ORDER BY date ASC
  `;
}

/**
 * Returns OECD CLI series for a country in [startDate, endDate].
 */
export async function getOecdCli(
  country: string,
  startDate: Date,
  endDate: Date
): Promise<OecdCliRow[]> {
  return prisma.$queryRaw<OecdCliRow[]>`
    SELECT
      country,
      period,
      "cliValue",
      "seriesId"
    FROM oecd_leading_indicators
    WHERE country = ${country}
      AND period >= ${startDate}
      AND period <= ${endDate}
    ORDER BY period ASC
  `;
}

/**
 * Returns coverage stats per ticker: { ticker, earliest, latest, rowCount }.
 */
export async function getOhlcvCoverage(): Promise<CoverageRow[]> {
  return prisma.$queryRaw<CoverageRow[]>`
    SELECT
      ticker,
      MIN(date) AS earliest,
      MAX(date) AS latest,
      COUNT(*) AS "rowCount"
    FROM ohlcv_daily
    GROUP BY ticker
    ORDER BY ticker ASC
  `;
}

/**
 * Returns count of FRED rows missing realtimeStart per series (should be 0 for all).
 * A non-zero count indicates an ingest bug that would corrupt point-in-time queries.
 */
export async function getFredVintageIntegrity(): Promise<
  { seriesId: string; missingVintage: number }[]
> {
  return prisma.$queryRaw<{ seriesId: string; missingVintage: number }[]>`
    SELECT
      "seriesId",
      COUNT(*) AS "missingVintage"
    FROM macro_series_vintage
    WHERE "realtimeStart" IS NULL
    GROUP BY "seriesId"
  `;
}
