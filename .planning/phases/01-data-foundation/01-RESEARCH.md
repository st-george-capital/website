# Phase 1: Data Foundation - Research

**Researched:** 2026-04-08
**Domain:** Time-series data ingestion — TimescaleDB, ALFRED/FRED vintage API, Alpha Vantage premium OHLCV, FMP earnings revisions, OECD CLI, ETF universe config
**Confidence:** HIGH (FRED/ALFRED API, AV fetch patterns, Prisma migration approach); MEDIUM (TimescaleDB provider compatibility, FMP historical depth specifics, OECD SDMX URL variants)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | 20+ years daily OHLCV in TimescaleDB hypertables with time-based partitioning and compression | TimescaleDB setup, AV `TIME_SERIES_DAILY_ADJUSTED` full outputsize, Prisma raw SQL migration pattern |
| DATA-02 | FRED macro series via ALFRED vintage API — each row reflects only what was published at that date | ALFRED `realtime_start`/`realtime_end` params on `series/observations` endpoint, `output_type=4` for initial-release-only mode |
| DATA-03 | ETF universe in config file — ticker, sector/country, inception date, proxy series | Universe config structure and schema field requirements |
| DATA-04 | Alpha Vantage premium data ingest using existing rate-limit-aware sequential fetch pattern | `fetchAlphaVantage()` internal function pattern, `outputsize=full` requires premium key, sequential stagger is already implemented |
| DATA-05 | FMP earnings revision history (10+ years) for all universe equities and ETFs | FMP `/api/v3/analyst-estimates/{symbol}` endpoint, Starter tier, response fields |
| DATA-06 | OECD leading indicator series for country-level macro context | OECD SDMX REST API, `DSD_STES@DF_CLI` dataflow, no auth required |

</phase_requirements>

---

## Summary

Phase 1 builds the entire data storage and ingestion foundation. No downstream phase can run without it. There are six distinct ingestion concerns: (1) 20+ years of daily ETF OHLCV via Alpha Vantage premium, stored in TimescaleDB hypertables; (2) FRED macro series fetched with point-in-time vintage discipline via the ALFRED parameters; (3) a config-driven ETF universe file that decouples ticker management from code; (4) FMP earnings revision history requiring a new API key and Starter-tier subscription; (5) OECD composite leading indicators via the free SDMX REST API; and (6) the Prisma schema additions and raw-SQL migration needed to create hypertables alongside Prisma-managed models.

The single biggest technical constraint is the Prisma + TimescaleDB integration: Prisma does not natively support `create_hypertable()`, so hypertable creation must be done via a raw SQL migration file in `prisma/migrations/`. The existing `fetchAlphaVantage()` private function in `lib/alpha-vantage.ts` is the correct extension point for the bulk historical ingest — it already handles rate-limit detection, error parsing, and API key injection; the ingest script wraps it with sequential staggered calls, never parallelized. The most common error that invalidates this entire phase is storing FRED data without vintage metadata — if FRED series are fetched as current values and stored without `realtimeStart`/`realtimeEnd`, all future feature engineering will silently use revised (look-ahead-biased) data.

**Primary recommendation:** Wire up TimescaleDB hypertables via a dedicated raw-SQL Prisma migration, implement the universe config file first so all subsequent ingest scripts are config-driven, then build four focused ingest modules (AV OHLCV, FRED vintage, FMP revisions, OECD CLI) that upsert idempotently into those tables.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TimescaleDB | 2.x (PostgreSQL extension) | Hypertable storage with automatic time-based partitioning and columnar compression for OHLCV + macro series | 90%+ compression on historical data, native `time_bucket()`, full SQL compatibility, zero Prisma query changes needed |
| Prisma | 5.22.0 (existing) | ORM for non-hypertable models; `prisma.$queryRaw` / `prisma.$executeRaw` for hypertable writes and reads | Already in project — no new dependency |
| `date-fns` | 4.1.0 (existing) | Date arithmetic for rolling window anchors, business-day gap detection | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 3.23.8 (existing) | Validate universe config file at load time and validate API responses before upsert | Always — prevents silent bad data entering the DB |
| Node.js `fetch` (built-in) | Node 25 (existing runtime) | FMP and OECD API calls — no SDK needed | Direct fetch matches existing AV and FRED patterns exactly |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TimescaleDB hypertable | Plain PostgreSQL with composite index `(ticker, date DESC)` | Acceptable at under 2M rows; loses 90% compression and `time_bucket()`; use as fallback only if provider does not support the extension |
| OECD SDMX REST API directly | Pull OECD CLI series via FRED (`{ISO2}LOLITONOSTSAM` pattern) | FRED mirror: simpler, same AV/FRED pattern, but lags OECD by ~1 month and may not cover all EM countries; direct OECD: canonical, free, no auth, more complex URL |

**Installation:**
```bash
# No new npm installs required for data APIs — all use native fetch
# TimescaleDB is a server-side PostgreSQL extension (no npm package)
# Enable in Postgres: CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
```

---

## Architecture Patterns

### Recommended Project Structure
```
lib/
└── macro-engine/
    └── ingest/
        ├── index.ts            # Orchestrates full ingest run — calls each module in order
        ├── universe.ts         # Loads + validates universe config; exports UniverseEntry[]
        ├── price-history.ts    # AV TIME_SERIES_DAILY_ADJUSTED -> ohlcv_daily hypertable
        ├── fred-vintage.ts     # ALFRED-aware FRED fetch -> macro_series_vintage table
        ├── fmp-revisions.ts    # FMP analyst estimates -> earnings_revisions table
        └── oecd-cli.ts         # OECD SDMX CLI -> oecd_leading_indicators table
scripts/
└── macro-engine/
    └── run-ingest.ts           # Entry point: node scripts/macro-engine/run-ingest.ts
config/
└── macro-engine/
    └── universe.json           # ETF universe config (the data file loaded by universe.ts)
prisma/
└── migrations/
    └── YYYYMMDDHHMMSS_macro_engine_schema/
        └── migration.sql       # Prisma-generated schema DDL + manually appended hypertable SQL
```

### Pattern 1: ALFRED Point-in-Time FRED Fetch

**What:** Use `realtime_start` and `realtime_end` parameters on the FRED `series/observations` endpoint to retrieve the value as it was known on a specific date. Store both the observation value and the `realtime_start` (vintage date) so future queries can reconstruct "what was known as of date T."

**When to use:** Every FRED series fetch stored in the macro engine DB. The existing `app/api/fred/10y-treasury/route.ts` does NOT use vintage params — that is correct for a dashboard display route, but wrong for the ingest pipeline.

**Key ALFRED parameters:**
- `output_type=2`: "Observations by Vintage Date, All Observations" — returns full revision history as matrix; use for initial historical backfill
- `output_type=4`: "Observations, Initial Release Only" — returns only the first-published value for each observation date; simpler storage model
- `realtime_start=YYYY-MM-DD` + `realtime_end=YYYY-MM-DD`: returns only values published in that real-time window

**Example URL:**
```
https://api.stlouisfed.org/fred/series/observations
  ?series_id=GDP
  &realtime_start=2005-01-01
  &realtime_end=2024-12-31
  &output_type=2
  &file_type=json
  &api_key={FRED_API_KEY}
```

**Example TypeScript:**
```typescript
// lib/macro-engine/ingest/fred-vintage.ts
// Source: https://fred.stlouisfed.org/docs/api/fred/series_observations.html

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

export async function fetchFredAllVintages(
  seriesId: string,
  startDate = '2000-01-01'
) {
  const url = new URL(FRED_BASE);
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('output_type', '2');
  url.searchParams.set('realtime_start', startDate);
  url.searchParams.set('realtime_end', new Date().toISOString().slice(0, 10));
  url.searchParams.set('observation_start', startDate);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('api_key', process.env.FRED_API_KEY!);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`FRED API ${res.status} for ${seriesId}`);
  const data = await res.json();

  return (data.observations ?? []) as Array<{
    realtime_start: string;  // vintage date — when this value was first published
    realtime_end:   string;
    date:           string;  // observation period (e.g. "2010-01-01" for Q1 GDP)
    value:          string;  // "." = not yet released
  }>;
}
```

### Pattern 2: Alpha Vantage Full Historical OHLCV Backfill

**What:** Use `TIME_SERIES_DAILY_ADJUSTED` with `outputsize=full` to retrieve 20+ years of OHLCV in a single API call per ticker. This is a premium-only endpoint. After initial backfill, switch to `outputsize=compact` for daily incremental updates.

**Critical:** The existing `fetchAlphaVantageDailyHistory()` in `lib/alpha-vantage.ts` uses `TIME_SERIES_DAILY` (unadjusted). The ingest module must use `TIME_SERIES_DAILY_ADJUSTED` to get split/dividend-adjusted close values needed for correct historical returns.

**Rate limit math:** For ~40 ETFs, each requiring 1 API call with `outputsize=full` = 40 total calls. At 75 req/min premium, completes in under 1 minute. Each response contains ~5,200 rows (20yr x 252 trading days). Total rows: ~208,000 for 40 ETFs.

**Example:**
```typescript
// lib/macro-engine/ingest/price-history.ts
// Extends the private fetchAlphaVantage() pattern from lib/alpha-vantage.ts

async function fetchFullOhlcv(ticker: string) {
  // Call internal fetchAlphaVantage helper (not exported — replicate params)
  const data = await fetchAlphaVantage({
    function: 'TIME_SERIES_DAILY_ADJUSTED',
    symbol: ticker,
    outputsize: 'full',   // premium only — returns 20+ years
  });

  const series = data['Time Series (Daily Adjusted)'];
  if (!series) throw new Error(`No adjusted daily data for ${ticker}`);

  return Object.entries(series).map(([date, v]: [string, any]) => ({
    ticker,
    date:        new Date(date),
    open:        parseFloat(v['1. open']),
    high:        parseFloat(v['2. high']),
    low:         parseFloat(v['3. low']),
    close:       parseFloat(v['4. close']),
    adjClose:    parseFloat(v['5. adjusted close']),
    volume:      parseInt(v['6. volume'], 10),
    dividendAmt: parseFloat(v['7. dividend amount']),
    splitCoeff:  parseFloat(v['8. split coefficient']),
  }));
}
```

**Sequential stagger (do NOT use Promise.all):**
```typescript
const STAGGER_MS = 800; // 75 req/min = ~800ms between calls

for (const entry of universe) {
  const rows = await fetchFullOhlcv(entry.ticker);
  // ... upsert rows filtered to >= inceptionDate ...
  await new Promise(r => setTimeout(r, STAGGER_MS));
}
```

### Pattern 3: TimescaleDB Hypertable via Prisma Raw-SQL Migration

**What:** Prisma does not support `create_hypertable()` natively. The approach: (1) let Prisma generate a normal migration for the table DDL, then (2) manually append the `create_hypertable()` call and compression setup to that migration SQL file before running it.

**Critical constraint:** The `timescaledb` extension must be enabled before `create_hypertable()` is called. Prepend `CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;` at the top of the migration file.

**Known Prisma issue:** After hypertables are created, `prisma migrate dev` may attempt to diff TimescaleDB's internal catalog tables and generate spurious migrations. After initial hypertable setup, use `prisma migrate status` (read-only) instead of `prisma migrate dev` when checking migration state. Use `prisma db push` for schema-only changes to non-hypertable models during development.

**Migration SQL (append after Prisma-generated CREATE TABLE statements):**
```sql
-- Enable TimescaleDB extension (idempotent)
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- OHLCV hypertable: 14-day chunks optimal for daily data
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

-- Macro series vintage hypertable: yearly chunks (lower cardinality)
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
```

### Pattern 4: Universe Config File Structure

**What:** A JSON file at `config/macro-engine/universe.json` drives all ingest operations. The ingest script reads this at startup; adding a ticker here and re-running the script causes it to appear in the DB with no code changes (DATA-03).

**Required fields per entry:**
```typescript
// lib/macro-engine/ingest/universe.ts
export interface UniverseEntry {
  ticker:        string;         // e.g. "EEM"
  name:          string;         // e.g. "iShares MSCI Emerging Markets ETF"
  type:          'etf' | 'equity';
  sector:        string | null;  // e.g. "Technology" — null for country ETFs
  country:       string | null;  // ISO2 e.g. "US", "CN" — null for sector ETFs
  inceptionDate: string;         // ISO date: "2003-04-11"
  proxySeries:   string | null;  // AV ticker or FRED series ID for pre-inception history
  currency:      string;         // "USD" for most ETFs
  exchange:      string;         // "NYSE", "NASDAQ"
}
```

**Example entries:**
```json
{
  "universe": [
    {
      "ticker": "SPY",
      "name": "SPDR S&P 500 ETF Trust",
      "type": "etf",
      "sector": null,
      "country": "US",
      "inceptionDate": "1993-01-22",
      "proxySeries": null,
      "currency": "USD",
      "exchange": "NYSE"
    },
    {
      "ticker": "EWJ",
      "name": "iShares MSCI Japan ETF",
      "type": "etf",
      "sector": null,
      "country": "JP",
      "inceptionDate": "1996-03-12",
      "proxySeries": null,
      "currency": "USD",
      "exchange": "NYSE"
    }
  ]
}
```

### Pattern 5: FMP Analyst Estimates Endpoint

**What:** FMP's `/api/v3/analyst-estimates/{symbol}` returns a time series of analyst consensus EPS/revenue estimates. Each row has a `date` (period being forecasted) plus consensus stats. Use this as the earnings revision history signal.

**Tier requirement:** Free tier = 250 req/day, limited historical depth. Starter tier (~$14/month) = 20GB bandwidth/30 days, 30+ years historical data depth, adequate for initial backfill of 40 tickers.

**Key endpoints:**
```
GET https://financialmodelingprep.com/api/v3/analyst-estimates/{symbol}
  ?limit=200
  &apikey={FMP_API_KEY}
```

**Response fields per row:**
- `symbol` — ticker
- `date` — the period end date for which estimates apply
- `estimatedRevenueLow`, `estimatedRevenueHigh`, `estimatedRevenueAvg`
- `estimatedEbitdaAvg`
- `estimatedEpsAvg`, `estimatedEpsLow`, `estimatedEpsHigh`
- `numberAnalystEstimatedRevenue`, `numberAnalystsEstimatedEps`

**New env var required:** `FMP_API_KEY`

### Pattern 6: OECD SDMX REST API for CLI Data

**What:** Free, no-auth REST API using SDMX standard. The composite leading indicator dataflow is `DSD_STES@DF_CLI` under `OECD.SDD.STES`. Country-specific series can be fetched in bulk.

**Canonical URL pattern:**
```
https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI/
  USA+GBR+DEU+JPN+CHN+KOR+CAN+AUS+FRA+ITA.M.LI...AA...H
  ?startPeriod=2000-01
  &dimensionAtObservation=AllDimensions
  &format=jsondata
```

**URL dimension breakdown:**
- Country codes: `+`-separated ISO2 codes before `.M`
- `.M` = Monthly frequency
- `.LI` = Leading Indicator measure
- `...AA...H` = Amplitude Adjusted, seasonally adjusted

**Alternative — FRED mirror (simpler, recommended for initial implementation):**
Many OECD CLI series are available on FRED and can be fetched with the existing FRED pattern. Confirmed FRED series IDs:
- USA: `USALOLITONOSTSAM` (normalized), `USALOLITOAASTSAM` (amplitude-adjusted)
- G7 aggregate: `G7LOLITOAASTSAM`
- Country pattern: `{ISO2}LOLITONOSTSAM` (e.g., `GBRLOLITONOSTSAM`, `DEULOLITONOSTSAM`, `JPNLOLITONOSTSAM`)

**Recommendation:** Implement FRED mirror first for G7 countries. Add direct OECD SDMX fetch for countries not on FRED (EM countries like India, Brazil) as a second step.

### Anti-Patterns to Avoid

- **FRED fetches without vintage params:** `series/observations` with no `realtime_start`/`realtime_end` returns today's revised values. This is correct for the dashboard display routes but wrong for macro ingest — silently corrupts all future backtests.
- **Parallelizing Alpha Vantage calls:** `Promise.all([fetchOhlcv('SPY'), fetchOhlcv('EEM'), ...])` hits the rate limit on the first burst. The existing `lib/alpha-vantage.ts` pattern is sequential — replicate it exactly.
- **Letting Prisma manage hypertable columns via migrate dev after initial setup:** After `create_hypertable()` runs, use `prisma migrate status` not `prisma migrate dev` to avoid spurious catalog diffs.
- **Inserting OHLCV rows for dates before the ETF's inceptionDate:** The universe config's `inceptionDate` must be enforced in the ingest script before any DB write.
- **Using `TIME_SERIES_DAILY` instead of `TIME_SERIES_DAILY_ADJUSTED`:** The unadjusted endpoint produces split-distorted historical prices that corrupt momentum factor calculations.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate-limit-aware AV fetch with error detection | Custom retry/backoff wrapper | Existing `fetchAlphaVantage()` private fn in `lib/alpha-vantage.ts` | Already handles `Note` (rate-limit), `Error Message`, and `Information` (premium-required) |
| Time-series partitioning and compression | Custom date-range sharding logic in PostgreSQL | TimescaleDB `create_hypertable()` | Handles partitioning, compression, and `time_bucket()` natively |
| Universe config validation | Manual type-checking | `zod.parse()` against `UniverseEntrySchema` at load time | Catches missing fields, wrong types, and invalid dates before any API call |
| CSV parsing for AV endpoints that return CSV | Custom parser | Existing `parseCsv()` / `parseCsvLine()` in `lib/alpha-vantage.ts` | Already implemented and handles quoted fields |

**Key insight:** `lib/alpha-vantage.ts` is more capable than its public exports suggest. The private `fetchAlphaVantage()` and `fetchAlphaVantageCsv()` functions are the correct extension points for all new AV ingest needs.

---

## Common Pitfalls

### Pitfall 1: FRED Vintage Contamination (Most Critical for This Phase)
**What goes wrong:** FRED series are stored using today's revised values (default API behavior). When feature engineering builds rolling z-scores using these values, every historical data point reflects hindsight revisions — the same error as look-ahead bias. A GDP revision made in 2024 for Q3-2008 data contaminates all feature vectors for 2008.

**Why it happens:** The existing `app/api/fred/10y-treasury/route.ts` fetches FRED without vintage params — this is intentional for dashboard display but wrong as a template for macro ingest.

**How to avoid:** Every FRED fetch in the ingest pipeline must include `output_type=2` or `output_type=4` and store `realtime_start` as a column. For queries "what was GDP on 2010-03-01?", filter `WHERE observation_date = '2010-03-01' AND realtime_start <= '2010-03-01' AND realtime_end >= '2010-03-01'`.

**Warning signs:** Any FRED fetch in the ingest module that does not include `output_type`, `realtime_start`, or `realtime_end` parameters.

### Pitfall 2: TimescaleDB Extension Unavailable on Hosting Provider
**What goes wrong:** `CREATE EXTENSION IF NOT EXISTS timescaledb` fails or is silently skipped. The migration appears to succeed. All inserts go into plain PostgreSQL tables with no partitioning or compression. Query degradation is not apparent until data volume grows.

**How to avoid:** Verify extension availability before building any schema: `SELECT * FROM pg_available_extensions WHERE name = 'timescaledb';` on the actual production DB. If unavailable, fall back to `CREATE INDEX ON ohlcv_daily (ticker, date DESC)` and document this explicitly.

**Warning signs:** `prisma migrate deploy` succeeds but `SELECT * FROM timescaledb_information.hypertables;` returns empty.

### Pitfall 3: Unadjusted vs Adjusted Close
**What goes wrong:** Using `TIME_SERIES_DAILY` (unadjusted) for historical price ingest. A stock with a 2:1 split in 2015 shows an apparent 50% drop on the split date, corrupting all momentum factor calculations for that instrument across the backtest window.

**How to avoid:** The `price-history.ts` ingest module must use `function: 'TIME_SERIES_DAILY_ADJUSTED'` and store both `close` (raw) and `adjClose` (adjusted). Feature engineering uses `adjClose` for all return calculations.

### Pitfall 4: Missing inceptionDate Enforcement
**What goes wrong:** An ETF with a 2008 inception date is included in 2004 backtest windows. AV returns data starting from inception (correct), but if the ingest script does not enforce the universe config's `inceptionDate`, null/gap rows appear in the cross-sectional ranking for periods before inception.

**How to avoid:** The ingest script must filter out rows where `date < entry.inceptionDate` before any DB write. The backtest engine (Phase 4) must also check `inceptionDate` before including an instrument in a historical window.

---

## Code Examples

### Prisma Schema Additions

```prisma
// prisma/schema.prisma — add these models
// Prisma manages DDL; raw SQL migration appends create_hypertable()

model OhlcvDaily {
  ticker      String
  date        DateTime
  open        Float
  high        Float
  low         Float
  close       Float
  adjClose    Float
  volume      BigInt
  dividendAmt Float    @default(0)
  splitCoeff  Float    @default(1)

  @@id([ticker, date])
  @@map("ohlcv_daily")
}

model MacroSeriesVintage {
  id              String   @id @default(cuid())
  seriesId        String   // FRED series ID, e.g. "GDP", "UNRATE"
  observationDate DateTime // the period this data point describes
  realtimeStart   DateTime // vintage date: when this value was first published
  realtimeEnd     DateTime // when superseded ("9999-12-31" = still current)
  value           Float?   // null = "." in FRED (not yet released)

  @@unique([seriesId, observationDate, realtimeStart])
  @@map("macro_series_vintage")
}

model EarningsRevision {
  id               String   @id @default(cuid())
  symbol           String
  date             DateTime // period end date the estimate applies to
  estimatedEpsLow  Float?
  estimatedEpsHigh Float?
  estimatedEpsAvg  Float?
  estimatedRevAvg  Float?
  numAnalystsEps   Int?
  fetchedAt        DateTime @default(now())

  @@unique([symbol, date])
  @@map("earnings_revisions")
}

model OecdLeadingIndicator {
  id        String   @id @default(cuid())
  country   String   // ISO2 country code, e.g. "US", "DE"
  period    DateTime // monthly: first day of the month
  cliValue  Float    // amplitude-adjusted CLI value
  seriesId  String   // e.g. "USALOLITOAASTSAM"
  fetchedAt DateTime @default(now())

  @@unique([country, period])
  @@map("oecd_leading_indicators")
}

model IngestLog {
  id           String   @id @default(cuid())
  source       String   // "alpha-vantage", "fred", "fmp", "oecd"
  ticker       String?
  seriesId     String?
  startDate    DateTime
  endDate      DateTime
  rowsUpserted Int
  status       String   // "success", "error", "partial"
  errorMsg     String?
  runAt        DateTime @default(now())

  @@map("ingest_log")
}
```

### Verification Queries After Ingest

```sql
-- Check OHLCV coverage for a ticker
SELECT ticker, MIN(date) as earliest, MAX(date) as latest, COUNT(*) as rows
FROM ohlcv_daily
WHERE ticker = 'SPY'
GROUP BY ticker;
-- Expect: earliest ~1993-01-29, latest = yesterday, rows ~8200+

-- Check FRED vintage integrity (no rows without realtimeStart)
SELECT series_id, COUNT(*) FILTER (WHERE realtime_start IS NULL) as missing_vintage
FROM macro_series_vintage
GROUP BY series_id;
-- Expect: all 0

-- Check hypertables exist
SELECT hypertable_name, num_chunks, compression_enabled
FROM timescaledb_information.hypertables;
-- Expect: ohlcv_daily, macro_series_vintage, earnings_revisions, oecd_leading_indicators
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `TIME_SERIES_DAILY` for all price history | `TIME_SERIES_DAILY_ADJUSTED` for backtest use | AV has offered this for years | Correct split/dividend-adjusted historical returns |
| FRED current-value fetches | ALFRED vintage API (`output_type=2` or `4`) for point-in-time data | ALFRED available since 2013; standard in quant workflows | Eliminates revision-bias in macro feature construction |
| Plain PostgreSQL for time-series | TimescaleDB hypertables | TimescaleDB 2.x stable since 2021 | 90%+ storage compression, automatic partitioning, `time_bucket()` |
| `OECD.Stat` legacy API (`stats.oecd.org/sdmx-json/`) | New OECD Data Explorer SDMX API (`sdmx.oecd.org/public/rest/`) | OECD migrated in 2024 | Old endpoint deprecated — do not use `stats.oecd.org` |

**Deprecated/outdated:**
- `stats.oecd.org/sdmx-json/` OECD API: Deprecated in 2024 in favor of `sdmx.oecd.org/public/rest/`. Do not use the old URL.
- Alpha Vantage free tier for backfill: `outputsize=full` is locked behind premium. Free key returns only the most recent 100 rows regardless of parameter — do not test the ingest script with a free key.

---

## Open Questions

1. **TimescaleDB on production Postgres host**
   - What we know: Vercel Postgres does not support it. Neon and Supabase require explicit enablement. Railway supports it.
   - What's unclear: Which provider is in use — `DATABASE_URL` is set but the host is not identified in the codebase.
   - Recommendation: Run `SELECT * FROM pg_available_extensions WHERE name = 'timescaledb';` against production before any schema work. If unavailable, fall back to plain PostgreSQL with composite index and document the tradeoff.

2. **FMP historical depth for analyst estimates**
   - What we know: FMP claims 30+ years for most endpoints. Starter tier unlocks full historical depth.
   - What's unclear: Analyst estimates pre-2010 coverage may be sparse for smaller ETFs regardless of tier — analysts need to have covered the name.
   - Recommendation: Fetch a sample of 3-4 universe equities and inspect actual row count before building the full ingest loop.

3. **OECD SDMX URL exact dimension ordering**
   - What we know: The base URL pattern and dataflow ID are confirmed from OECD Data Explorer dev tools.
   - What's unclear: Exact dimension ordering for countries not confirmed by a live test request.
   - Recommendation: Make a single test request for USA CLI data before building the bulk country fetch.

4. **Alpha Vantage premium tier rate limit**
   - What we know: Premium removes the free-tier 25/day cap. `outputsize=full` requires premium.
   - What's unclear: Exact req/min for the specific plan in use ($49 vs $249/month tiers differ).
   - Recommendation: Test `TIME_SERIES_DAILY_ADJUSTED` with `outputsize=full` on one ticker first. Confirm no `Information` (premium-gate) error appears before building the loop.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — Wave 0 must establish test infrastructure |
| Config file | None — see Wave 0 gaps |
| Quick run command | `npx jest --testPathPattern=macro-engine --passWithNoTests` |
| Full suite command | `npx jest --testPathPattern=macro-engine` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | OHLCV rows for SPY span 1993 to present with no unexpected gaps; row count > 7000 | integration | `npx jest tests/macro-engine/ohlcv-coverage.test.ts -x` | ❌ Wave 0 |
| DATA-02 | FRED vintage row for GDP at as-of 2010-03-01 returns March 2010 release, not current revised value | unit | `npx jest tests/macro-engine/fred-vintage.test.ts -x` | ❌ Wave 0 |
| DATA-03 | Adding a ticker to universe.json and re-running ingest causes it to appear in ohlcv_daily without code changes | integration | `npx jest tests/macro-engine/universe-driven.test.ts -x` | ❌ Wave 0 |
| DATA-04 | AV ingest script calls tickers sequentially (not in parallel); rate-limit error triggers pause not crash | unit | `npx jest tests/macro-engine/av-sequential.test.ts -x` | ❌ Wave 0 |
| DATA-05 | FMP earnings revisions queryable by symbol + date range; returns rows with estimatedEpsAvg | integration | `npx jest tests/macro-engine/fmp-revisions.test.ts -x` | ❌ Wave 0 |
| DATA-06 | OECD CLI rows present in DB for all configured countries covering at least 2000 to present | integration | `npx jest tests/macro-engine/oecd-cli.test.ts -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest tests/macro-engine/ --passWithNoTests`
- **Per wave merge:** `npx jest tests/macro-engine/`
- **Phase gate:** Full test suite green + manual spot-check SQL queries (see verification queries above) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/macro-engine/ohlcv-coverage.test.ts` — covers DATA-01
- [ ] `tests/macro-engine/fred-vintage.test.ts` — covers DATA-02
- [ ] `tests/macro-engine/universe-driven.test.ts` — covers DATA-03
- [ ] `tests/macro-engine/av-sequential.test.ts` — covers DATA-04
- [ ] `tests/macro-engine/fmp-revisions.test.ts` — covers DATA-05
- [ ] `tests/macro-engine/oecd-cli.test.ts` — covers DATA-06
- [ ] `jest.config.ts` + `package.json` test script — framework install: `npm install --save-dev jest @types/jest ts-jest`

---

## Sources

### Primary (HIGH confidence)
- [FRED API `series/observations` official docs](https://fred.stlouisfed.org/docs/api/fred/series_observations.html) — `output_type`, `realtime_start`, `realtime_end` parameter semantics
- [FRED Real-Time Periods documentation](https://fred.stlouisfed.org/docs/api/fred/realtime_period.html) — vintage date semantics explained
- [FRED `series/vintagedates` endpoint](https://fred.stlouisfed.org/docs/api/fred/series_vintagedates.html) — listing available vintage dates per series
- [TimescaleDB `create_hypertable()` API docs](https://docs.timescale.com/api/latest/hypertable/create_hypertable/) — parameters, `chunk_time_interval`, `if_not_exists`
- `lib/alpha-vantage.ts` (project codebase, read directly) — `fetchAlphaVantage()` pattern, rate-limit detection, CSV parsing utilities
- `app/api/fred/10y-treasury/route.ts` (project codebase, read directly) — existing FRED fetch baseline (no vintage params — confirms what to extend)
- [FMP Analyst Estimates dataset page](https://site.financialmodelingprep.com/datasets/analyst-estimates-targets) — endpoint listing and tier requirements
- [FRED OECD CLI mirror — USALOLITONOSTSAM](https://fred.stlouisfed.org/series/USALOLITONOSTSAM) — confirms FRED carries OECD CLI series

### Secondary (MEDIUM confidence)
- [OECD CLI Data Explorer](https://data-explorer.oecd.org/vis?df%5Bds%5D=DisseminateFinalDMZ&df%5Bid%5D=DSD_STES@DF_CLI&df%5Bag%5D=OECD.SDD.STES) — confirmed CLI dataflow ID `DSD_STES@DF_CLI`
- [OECD Data API explainer](https://www.oecd.org/en/data/insights/data-explainers/2024/09/api.html) — no auth required, SDMX format, new endpoint URL
- [Prisma + TimescaleDB guide — Medium/Geek Culture](https://medium.com/geekculture/set-up-a-timescaledb-hypertable-with-prisma-9550652cfe97) — raw SQL migration approach confirmed
- [Prisma GitHub issue #3228 — TimescaleDB support](https://github.com/prisma/prisma/issues/3228) — confirms official lack of native support and workaround pattern
- [Alpha Vantage Complete Guide 2026](https://alphalog.ai/blog/alphavantage-api-complete-guide) — confirmed `outputsize=full` is premium-only

### Tertiary (LOW confidence — verify before relying on)
- FMP `/api/v3/analyst-estimates/{symbol}` exact response field names — endpoint existence confirmed, exact JSON field names should be verified with a test request before finalizing schema column names

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — TimescaleDB, Prisma, AV, FRED all verified against official docs and codebase
- Architecture: HIGH — universe config and ingest module structure follow existing `lib/country-health/ingest.ts` convention
- ALFRED/FRED vintage: HIGH — official FRED API docs confirm `output_type` and `realtime_start`/`realtime_end` parameter behavior
- FMP endpoint: MEDIUM — docs confirm endpoint exists and tier; exact response field names need a live test before schema finalization
- OECD SDMX URL: MEDIUM — URL pattern confirmed from OECD Data Explorer dev view; dimension ordering needs a live test
- TimescaleDB provider: MEDIUM — confirmed it works with PostgreSQL but specific hosting provider for this project is unknown

**Research date:** 2026-04-08
**Valid until:** 2026-07-08 (90 days — APIs stable; FMP pricing may change faster)
