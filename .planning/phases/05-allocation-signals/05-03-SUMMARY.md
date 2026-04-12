---
phase: 05-allocation-signals
plan: "03"
subsystem: signals
tags: [prisma, postgres, equities, screening, oneil, rs-proxy, dma, ohlcv, signals]

# Dependency graph
requires:
  - phase: 05-allocation-signals/05-01
    provides: AllocationSignal rows + runDailySignals() orchestrator
  - phase: 05-allocation-signals/05-02
    provides: prob6m/prob12m populated in AllocationSignal
provides:
  - screenEquities() function returning ScreenedEquity[] for overweight sectors
  - EQUITY_PROXY_MAP covering 6 sector ETFs × 5 proxy equities
  - StockScreenResult rows written after each runDailySignals() call
  - universe.json equity entries for all 30 proxy tickers
  - ohlcv_daily rows for all 30 proxy equities (197,333 rows ingested)
  - verify:signals --check-stocks upgraded to ALLC-04 hard check
affects: [05-04, phase-5-allocation-signals]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - RS Proxy via weighted-ROC formula (NOT IBD RS Rating) — labeled universe-relative in code
    - OHLCV window 420 calendar days (~290 trading days) to ensure ROC(252) is computable
    - Composite score with weight renormalization for null fields (default 0.5 if no data available)
    - screenEquities() returns empty array if no overweight sectors OR no proxy map match — not an error
    - smrProxy null in Plan 03; Plan 04 populates via FMP income statement after rows exist

key-files:
  created:
    - lib/macro-engine/signals/single-stock.ts
  modified:
    - config/macro-engine/universe.json (30 equity entries added, XLI + XLY ETFs added)
    - lib/macro-engine/signals/index.ts (screenEquities wired into runDailySignals)
    - scripts/macro-engine/verify-signals.ts (--check-stocks upgraded to ALLC-04 hard check)

key-decisions:
  - "RS Proxy uses weighted-ROC (0.4×ROC63 + 0.2×ROC126 + 0.2×ROC189 + 0.2×ROC252) labeled universe-relative — not IBD RS Rating"
  - "OHLCV query uses 420-day window (not 300) so ROC(252 trading days) is computable (~290 trading days available)"
  - "earningsRevisionMomentum is null for equity tickers — FactorFeatureMatrix only has ETF rows; Plan 04 can extend if needed"
  - "smrProxy is null in Plan 03 — Plan 04 populates via FMP income statement data"
  - "screenEquities returns empty array (not error) if no overweight sectors or no proxy map entry"
  - "verify --check-stocks passes when no overweight sectors exist; hard-fails when overweight sectors exist but no rows"

patterns-established:
  - "Proxy equity map hard-coded in single-stock.ts — adding tickers requires updating EQUITY_PROXY_MAP + universe.json"
  - "Composite score excludes smrProxy (null) and renormalizes weights to sum to 1.0 excluding null fields"

requirements-completed: [ALLC-04]

# Metrics
duration: ~20min
completed: 2026-04-12
---

# Phase 5 Plan 03: Single-Stock Screener Summary

**O'Neil-style proxy equity screener with RS Proxy (universe-relative), DMA positions, institutional sponsorship trend, and composite scoring; 30 equity entries ingested into ohlcv_daily**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-04-12
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added 30 proxy equity entries to `config/macro-engine/universe.json` (6 sectors × 5 equities) plus XLI and XLY ETF entries that were missing
- Ran `npm run ingest --source=prices`: 197,333 OHLCV rows written; AAPL and MSFT spot-checked at 6,650 rows each
- `lib/macro-engine/signals/single-stock.ts` implements:
  - `EQUITY_PROXY_MAP` covering XLK, XLF, XLE, XLV, XLI, XLY (6 sectors × 5 equities)
  - `screenEquities()` computing RS Proxy (1–99), EPS rank proxy, DMA50/100/200 positions, institutional sponsorship trend, earnings revision momentum, and composite score
  - RS Proxy labeled "RS Proxy (universe-relative)" in code — explicitly not the IBD RS Rating
  - smrProxy = null (Plan 04 responsibility)
- Wired `screenEquities()` into `runDailySignals()` — 10 StockScreenResult rows written on run
- Upgraded `verify:signals --check-stocks` to ALLC-04 hard check (fails if overweight sectors exist but no rows; passes if no overweight sectors)
- `npm run verify:signals -- --check-stocks` exits 0 with 10 rows, rsRating non-null for all

## Task Commits

1. **Task 1: universe.json + OHLCV ingest** — `9f87655` (feat)
2. **Task 2: single-stock screener + index.ts + verify-signals upgrade** — `6dc8ee2` (feat)

## Files Created/Modified

- `config/macro-engine/universe.json` — 30 equity entries added; XLI + XLY ETF entries added
- `lib/macro-engine/signals/single-stock.ts` — EQUITY_PROXY_MAP, ScreenedEquity interface, screenEquities()
- `lib/macro-engine/signals/index.ts` — screenEquities() wired after AllocationSignal upsert
- `scripts/macro-engine/verify-signals.ts` — --check-stocks upgraded to ALLC-04 hard check with per-field null counts and per-ticker compositeScore table

## Decisions Made

- RS Proxy uses weighted-ROC formula (0.4×ROC63 + 0.2×ROC126 + 0.2×ROC189 + 0.2×ROC252), ranked within proxy list only. Explicitly labeled "RS Proxy (universe-relative)" — not the official IBD RS Rating
- OHLCV query uses 420-day window (not 300) so ROC(252 trading days) is computable. ~290 trading days available in the window
- earningsRevisionMomentum is null for all equity tickers — FactorFeatureMatrix only has ETF rows from Phase 2. Plan 04 can extend if needed
- smrProxy is null in Plan 03; Plan 04 populates via FMP income statement data
- screenEquities returns empty array (not error) when no overweight sectors or no proxy map match
- verify --check-stocks: passes when no overweight sectors; hard-fails when overweight sectors exist but no rows; warns on per-field nulls

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] OHLCV window too small for ROC(252)**
- **Found during:** Task 2 — first run showed rsRating null for all 10 rows
- **Issue:** Plan specified 300-day OHLCV window, but ROC(252 trading days) needs ~252 price points; 300 calendar days provides only ~210 trading days
- **Fix:** Changed INTERVAL '300 days' to INTERVAL '420 days' (~290 trading days available)
- **Files modified:** lib/macro-engine/signals/single-stock.ts
- **Commit:** 6dc8ee2 (fixed in same commit)

## Issues Encountered

- XLI and XLY ETFs were missing from universe.json but are in EQUITY_PROXY_MAP — added both as ETF type entries (deviation Rule 2, auto-fixed in Task 1)
- earningsRevisionMomentum null for equity tickers is expected at this stage — FactorFeatureMatrix coverage is ETF-only from Phase 2

## Next Phase Readiness

- StockScreenResult rows exist and compositeScore is populated — Plan 04 can read and update smrProxy
- rsRating, DMA positions, and composite scores are valid — ALLC-04 requirement met
- Plan 04 (analyst.ts) needs to query StockScreenResult and update smrProxy via FMP income statement data

---
*Phase: 05-allocation-signals*
*Completed: 2026-04-12*

## Self-Check: PASSED
