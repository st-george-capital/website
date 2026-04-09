-- CreateTable: macro-engine raw storage schema
-- Phase 1 - Data Foundation (Plan 01-01)

-- Enable TimescaleDB extension (idempotent)
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- OHLCV daily price data
CREATE TABLE "ohlcv_daily" (
    "ticker" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "adjClose" DOUBLE PRECISION NOT NULL,
    "volume" BIGINT NOT NULL,
    "dividendAmt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "splitCoeff" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "ohlcv_daily_pkey" PRIMARY KEY ("ticker","date")
);

-- Macro series vintage data (ALFRED point-in-time)
CREATE TABLE "macro_series_vintage" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "observationDate" TIMESTAMP(3) NOT NULL,
    "realtimeStart" TIMESTAMP(3) NOT NULL,
    "realtimeEnd" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION,

    CONSTRAINT "macro_series_vintage_pkey" PRIMARY KEY ("id")
);

-- Earnings revisions (analyst consensus)
CREATE TABLE "earnings_revisions" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "estimatedEpsLow" DOUBLE PRECISION,
    "estimatedEpsHigh" DOUBLE PRECISION,
    "estimatedEpsAvg" DOUBLE PRECISION,
    "estimatedRevAvg" DOUBLE PRECISION,
    "numAnalystsEps" INTEGER,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "earnings_revisions_pkey" PRIMARY KEY ("id")
);

-- OECD composite leading indicators
CREATE TABLE "oecd_leading_indicators" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "cliValue" DOUBLE PRECISION NOT NULL,
    "seriesId" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oecd_leading_indicators_pkey" PRIMARY KEY ("id")
);

-- Ingest run audit log
CREATE TABLE "ingest_log" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "ticker" TEXT,
    "seriesId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rowsUpserted" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "errorMsg" TEXT,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingest_log_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "macro_series_vintage_seriesId_observationDate_realtimeStart_key"
    ON "macro_series_vintage"("seriesId", "observationDate", "realtimeStart");

CREATE UNIQUE INDEX "earnings_revisions_symbol_date_key"
    ON "earnings_revisions"("symbol", "date");

CREATE UNIQUE INDEX "oecd_leading_indicators_country_period_key"
    ON "oecd_leading_indicators"("country", "period");

-- ──────────────────────────────────────────────────────────────────────────────
-- TimescaleDB hypertable configuration
-- These statements are appended manually after Prisma-generated DDL.
-- Run ONLY when TimescaleDB is confirmed available (checkTimescaleDb() passes).
-- ──────────────────────────────────────────────────────────────────────────────

-- OHLCV hypertable: 14-day chunks for fast range scans per ticker
SELECT create_hypertable('ohlcv_daily', 'date',
  chunk_time_interval => INTERVAL '14 days',
  if_not_exists => TRUE
);
ALTER TABLE ohlcv_daily SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'ticker',
  timescaledb.compress_orderby = 'date DESC'
);
SELECT add_compression_policy('ohlcv_daily', INTERVAL '30 days');

-- Macro series vintage hypertable
SELECT create_hypertable('macro_series_vintage', 'observation_date',
  chunk_time_interval => INTERVAL '1 year',
  if_not_exists => TRUE
);

-- Earnings revisions hypertable
SELECT create_hypertable('earnings_revisions', 'date',
  chunk_time_interval => INTERVAL '1 year',
  if_not_exists => TRUE
);

-- OECD CLI hypertable
SELECT create_hypertable('oecd_leading_indicators', 'period',
  chunk_time_interval => INTERVAL '1 year',
  if_not_exists => TRUE
);
