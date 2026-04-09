---
phase: 01-data-foundation
plan: "03"
subsystem: macro-engine/ingest
tags: [ingest, pipeline, alpha-vantage, fred, fmp, oecd, timescaledb]
dependency_graph:
  requires:
    - 01-01 (schema: OhlcvDaily, MacroSeriesVintage, EarningsRevision, OecdLeadingIndicator, IngestLog)
    - 01-02 (providers: alpha-vantage.ts, alfred.ts, fmp.ts, oecd.ts)
  provides:
    - Full ingest pipeline with dry-run support
    - IngestLog audit rows per stage per run
    - Incremental fetch logic (compact vs full, realtime_start checkpoints)
  affects:
    - scripts/macro-engine/run-ingest.ts (new CLI entrypoint)
    - package.json (new ingest and ingest:dry scripts)
tech_stack:
  added: []
  patterns:
    - Sequential stagger for AV rate limiting (800ms between calls)
    - ALFRED output_type=2 for point-in-time vintage rows
    - Inception-date filter before any ohlcv_daily write
    - Dry-run mode skips all live API calls and DB writes
key_files:
  created:
    - lib/macro-engine/ingest/prices.ts
    - lib/macro-engine/ingest/macro-series.ts
    - lib/macro-engine/ingest/revisions.ts
    - lib/macro-engine/ingest/logging.ts
    - lib/macro-engine/ingest/index.ts
    - scripts/macro-engine/run-ingest.ts
  modified:
    - package.json
decisions:
  - Dry-run mode skips live API calls entirely (prints planned ops) so it works without real API keys
  - Logging uses raw SQL ($executeRaw) to avoid Prisma client regeneration requirement
  - dotenv import in run-ingest.ts is optional (try/catch) — not a required dep
  - fetchUniverseOhlcvCompact slices full response to 250 rows (AV doesn't expose outputsize per-ticker)
metrics:
  duration: "~15 minutes"
  completed_date: "2026-04-09"
  tasks_completed: 3
  files_changed: 7
---

# Phase 1 Plan 03: Ingest Pipeline Summary

End-to-end ingest pipeline with dry-run CLI, incremental checkpoints, and per-stage IngestLog audit rows across AV OHLCV, ALFRED vintages, FMP analyst estimates, and OECD CLI data.

## What Was Built

### Task 1: Source-specific persistence pipelines

**prices.ts** — `ingestPrices(universe, opts)`:
- Queries `max(date)` per ticker before fetching; uses compact (250 rows) if within 7 days, full otherwise
- Filters pre-inception rows (`date < entry.inceptionDate`) before any upsert
- Upserts via `INSERT ... ON CONFLICT (ticker, date) DO UPDATE`
- Returns `{ source: 'alpha-vantage', rowsUpserted, errors, status }`

**macro-series.ts** — `ingestMacroSeries(seriesIds, opts)`:
- Constant `FRED_SERIES_IDS = ['GDP', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS', 'T10Y2Y', 'INDPRO']`
- Queries `max(realtime_start)` per series for incremental fetches
- Every row includes `realtimeStart` + `realtimeEnd` (ALFRED output_type=2 via alfred.ts)
- Upserts via `INSERT ... ON CONFLICT (seriesId, observationDate, realtimeStart) DO UPDATE`

**revisions.ts** — `ingestRevisions(tickers, opts)`:
- Equity tickers: FMP analyst estimates → EarningsRevision upserts
- Countries from universe: OECD CLI via FRED mirror → OecdLeadingIndicator upserts
- Both upsert with ON CONFLICT

### Task 2: Orchestrator and CLI

**logging.ts**:
- `logIngestRun(result)` — writes one IngestLog row per stage result (raw SQL)
- `getLastSuccessfulRun(source)` — reads last successful run date from IngestLog

**index.ts** (`runIngest(opts)`):
1. Checks TimescaleDB (skipped in dry-run)
2. Validates ALPHA_VANTAGE_API_KEY, FRED_API_KEY, FMP_API_KEY (warns in dry-run)
3. Prints "last successful run" per source at startup
4. Runs stages: prices → macro-series → revisions (or single stage via `--source`)
5. Logs each result via `logIngestRun()`
6. Prints summary table
7. Returns exitCode 1 if any stage has status 'error'

**run-ingest.ts**: Parses `--dry-run` and `--source=prices|macro|revisions` flags

**package.json**: Added `"ingest"` and `"ingest:dry"` scripts

### Task 3: Incremental checkpoints

- prices.ts: queries DB for `max(date)` per ticker — compact if ≤7 days ago, full otherwise
- macro-series.ts: queries DB for `max(realtime_start)` per series, passes as `startDate` to ALFRED
- Dry-run prints incremental strategy per-ticker/series without making API calls
- `getLastSuccessfulRun()` supports resumability by reading IngestLog history

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] dotenv import was blocking tsx execution**
- **Found during:** Task 2 verification
- **Issue:** `import 'dotenv/config'` threw MODULE_NOT_FOUND since dotenv is not installed
- **Fix:** Wrapped require('dotenv').config() in try/catch — optional dev dep
- **Files modified:** scripts/macro-engine/run-ingest.ts
- **Commit:** b7e73f8

**2. [Rule 1 - Bug] Prisma typed accessor unavailable for IngestLog**
- **Found during:** Task 2 type check
- **Issue:** `prisma.ingestLog` not available without regenerating Prisma client
- **Fix:** Replaced with raw SQL `$executeRaw` / `$queryRaw` in logging.ts
- **Files modified:** lib/macro-engine/ingest/logging.ts
- **Commit:** ec37a08

**3. [Rule 2 - Correctness] Dry-run made live API calls (would fail without real keys)**
- **Found during:** Task 3 verification
- **Issue:** prices.ts and revisions.ts called AV/FMP/OECD APIs even in dry-run mode
- **Fix:** All modules skip live API calls in dry-run and print planned operations instead
- **Files modified:** prices.ts, macro-series.ts, revisions.ts
- **Commit:** b7e73f8

## Self-Check: PASSED

All 6 created files verified on disk. All 3 task commits verified in git (91a146d, ec37a08, b7e73f8).
