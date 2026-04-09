---
phase: 02-feature-engineering
plan: "03"
subsystem: macro-engine/features/factors
tags: [feature-engineering, country-health, flows-regime, ohlcv, factor-adapters]
dependency_graph:
  requires: [02-01]
  provides: [computeCountryHealthScore, computeFlowsRegimeScore]
  affects: [02-04-buildFeatureRow]
tech_stack:
  added: []
  patterns: [module-level-cache, stored-ohlcv-reuse, scoring-reuse]
key_files:
  created:
    - lib/country-health/world-bank.ts
    - lib/macro-engine/features/factors/country-health.ts
    - lib/macro-engine/features/factors/flows-regime.ts
  modified: []
decisions:
  - "world-bank.ts extraction: World Bank fetch logic extracted from route.ts into a standalone lib module to avoid duplication across factor adapter and route handler"
  - "populateCache flag: Single boolean guard replaces Map.has check to avoid redundant population checks during batch builds"
  - "VXX proxy: Pre-2011 dates use VXX ticker for volatility signal; partial score returned rather than null when VXX data is available"
metrics:
  duration: 15m
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_created: 3
---

# Phase 02 Plan 03: FEAT-05 Factor Adapters (Country Health + Flows Regime) Summary

Two FEAT-05 factor adapters implemented: country-health pillar scores (static WB annual data) and flows regime signal (recomputed from stored OHLCV).

## What Was Built

**lib/country-health/world-bank.ts** — New standalone module extracting `fetchWorldBankRows()` and `fetchPopulations()` from the existing route handler. Required because the plan's `computeCountryHealthScore` needed to reuse the WB fetch logic without duplicating it. The route.ts fetch functions were previously private to the route handler.

**lib/macro-engine/features/factors/country-health.ts** — Implements `computeCountryHealthScore(countryCode)`. Calls `fetchWorldBankRows()` + `fetchPopulations()`, then passes to `scoreCountries()` from the existing scoring engine. Returns `coreScore / 100` (normalized to [0,1]). Module-level cache (keyed by country code) prevents re-fetching on batch builds.

**lib/macro-engine/features/factors/flows-regime.ts** — Implements `computeFlowsRegimeScore(asOfDate)`. Replicates the 5-signal scoring logic from `app/api/dashboard/flows/route.ts` using `getOhlcv()` only. Signals: VIXY/VXX (inverted), semis-software spread, cyclicals-defensives spread, HYG credit, SPY momentum. Pre-2011 dates use VXX as VIXY proxy. Returns null if fewer than 3 signals have data.

## Verification

- `npx tsc --noEmit` passes cleanly (0 errors)
- No Alpha Vantage imports in `lib/macro-engine/features/factors/`
- `scoreCountries` imported from existing `lib/country-health/scoring` — no logic duplication
- `getOhlcv` is the only DB import in flows-regime.ts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created world-bank.ts extraction**
- **Found during:** Task 1
- **Issue:** Plan assumed `fetchWorldBankRows` and `fetchPopulations` exports existed in `lib/country-health/world-bank.ts` but no such file existed. World Bank fetch logic was private to `app/api/dashboard/country-health/route.ts`.
- **Fix:** Created `lib/country-health/world-bank.ts` by extracting and exporting the fetch helpers from the route. The country-health factor adapter imports from there.
- **Files modified:** lib/country-health/world-bank.ts (new)
- **Commit:** 054757d

**2. [Rule 1 - Bug] populateCache guard uses boolean flag**
- **Found during:** Task 1
- **Issue:** Plan used `scoreCache.has(countryCode)` as a per-country guard, which would re-fetch on every new country code if the first country called happened not to be in WB data. Batch build would trigger O(n) fetches.
- **Fix:** Added module-level `cachePopulated` boolean that ensures population runs at most once per process lifetime.
- **Files modified:** lib/macro-engine/features/factors/country-health.ts

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 054757d | feat(02-03): country-health factor adapter using static WB pillar scores |
| Task 2 | 0ac74d4 | feat(02-03): flows regime factor from stored OHLCV |
