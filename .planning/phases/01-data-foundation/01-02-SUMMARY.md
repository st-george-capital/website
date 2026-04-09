---
phase: 01-data-foundation
plan: 02
subsystem: data-providers
tags: [alfred, fred, alpha-vantage, fmp, oecd, vintage, ohlcv, earnings]
dependency_graph:
  requires: [01-01]
  provides: [macro-engine-providers]
  affects: [ingest-pipeline]
tech_stack:
  added: []
  patterns:
    - ALFRED output_type=2 for full vintage history (point-in-time safe)
    - Sequential AV fetching with 800ms stagger (no burst parallelism)
    - OECD CLI via FRED mirror (USALOLITONOSTSAM pattern)
key_files:
  created:
    - lib/macro-engine/types.ts
    - lib/macro-engine/providers/alfred.ts
    - lib/macro-engine/providers/alpha-vantage.ts
    - lib/macro-engine/providers/fmp.ts
    - lib/macro-engine/providers/oecd.ts
  modified:
    - .env.example
decisions:
  - OECD CLI uses FRED mirror rather than direct OECD API — same vintage pattern as ALFRED, simpler implementation
  - AV macro adapter is a new module separate from lib/alpha-vantage.ts — preserves existing callers unchanged
metrics:
  duration: ~2 minutes
  completed: 2026-04-09T02:27:14Z
  tasks_completed: 3
  files_created: 5
  files_modified: 1
---

# Phase 1 Plan 2: External Data Provider Adapters Summary

Typed provider adapters for all four external data sources: ALFRED/FRED vintage API (point-in-time safe), Alpha Vantage adjusted daily OHLCV, FMP analyst estimates, and OECD CLI via FRED mirror.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ALFRED/FRED vintage provider adapter | e59544f | lib/macro-engine/providers/alfred.ts, lib/macro-engine/types.ts, .env.example |
| 2 | Alpha Vantage adjusted daily provider adapter | 7275b55 | lib/macro-engine/providers/alpha-vantage.ts |
| 3 | FMP and OECD CLI provider adapters | 2f6830f | lib/macro-engine/providers/fmp.ts, lib/macro-engine/providers/oecd.ts |

## What Was Built

**ALFRED adapter** (`lib/macro-engine/providers/alfred.ts`): `fetchFredAllVintages(seriesId, startDate)` — always sends `output_type=2`, `realtime_start`, `realtime_end`. Filters unreleased values (`value === '.'`). Returns `MacroSeriesVintageRow[]` with `realtimeStart`/`realtimeEnd` on every row for point-in-time as-of queries.

**AV adapter** (`lib/macro-engine/providers/alpha-vantage.ts`): `fetchFullOhlcv(ticker)` uses `TIME_SERIES_DAILY_ADJUSTED` (not `TIME_SERIES_DAILY`). `fetchUniverseOhlcv(tickers, staggerMs)` uses a `for...of` loop with 800ms stagger — no `Promise.all`. Duplicates rate-limit detection from `lib/alpha-vantage.ts` without modifying it.

**FMP adapter** (`lib/macro-engine/providers/fmp.ts`): `fetchAnalystEstimates(symbol)` hits `/api/v3/analyst-estimates/{symbol}?limit=200`. Maps `estimatedRevenueAvg` → `estimatedRevAvg`, `numberAnalystsEstimatedEps` → `numAnalystsEps`.

**OECD adapter** (`lib/macro-engine/providers/oecd.ts`): `fetchOecdCliForCountry(isoCountry, startDate)` — delegates to `fetchFredAllVintages()` using a hardcoded 10-country map (`USALOLITONOSTSAM` pattern). Returns `OecdCliRow[]`. Throws descriptive error for unmapped country codes.

**Types** (`lib/macro-engine/types.ts`): `MacroSeriesVintageRow`, `OhlcvDailyRow`, `EarningsRevisionRow`, `OecdCliRow`.

## Verification Results

- `npx tsc --noEmit`: PASS — no errors
- ALFRED guard: throws `FRED_API_KEY is not set` before any HTTP request when key is missing
- AV guard: throws `ALPHA_VANTAGE_API_KEY is not set` before any HTTP request when key is missing
- OECD guard: delegates to ALFRED which throws `FRED_API_KEY is not set`
- `npm run lint`: Skipped — no ESLint config exists in the project (pre-existing, not introduced by this plan)

## Deviations from Plan

None - plan executed exactly as written.

## Auth Gates

No live API calls were made — all three adapters' env-var guards fired correctly, confirming keys are not in `.env`. Live verification requires adding `FRED_API_KEY`, `ALPHA_VANTAGE_API_KEY`, and `FMP_API_KEY` to `.env` before running ingest.

## Self-Check: PASSED

Files exist:
- lib/macro-engine/types.ts: FOUND
- lib/macro-engine/providers/alfred.ts: FOUND
- lib/macro-engine/providers/alpha-vantage.ts: FOUND
- lib/macro-engine/providers/fmp.ts: FOUND
- lib/macro-engine/providers/oecd.ts: FOUND

Commits exist: e59544f, 7275b55, 2f6830f — all present in git log.
