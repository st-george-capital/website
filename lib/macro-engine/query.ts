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

import { prisma } from './db';
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
