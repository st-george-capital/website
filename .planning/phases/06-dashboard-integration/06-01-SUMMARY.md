---
phase: 06-dashboard-integration
plan: 01
subsystem: api
tags: [prisma, nextjs, typescript, macro-engine, dashboard]

# Dependency graph
requires:
  - phase: 05-allocation-signals
    provides: AllocationSignal rows with runDate, direction, etfTicker, rank, factorAttribution
  - phase: 04-backtesting-engine
    provides: BacktestRun and BacktestMetric rows for OOS accuracy metrics
  - phase: 03-regime-classifier
    provides: RegimeLabel rows for current macro regime
provides:
  - GET /api/dashboard/macro-engine — aggregated endpoint returning MacroEnginePayload
  - MacroEnginePayload type exported from route.ts for dashboard page imports
  - Macro Allocation Engine card on /dashboard/tools page
affects: [06-02-dashboard-page, any consumer of MacroEnginePayload type]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Two-step runDate filter on AllocationSignal (findFirst for latest date, then findMany where runDate = latest)
    - Regime start date computed by walking recent label history (500-row fetch, walk until label changes)
    - Avg regime duration from contiguous run-length analysis on in-memory label history
    - BacktestMetric aggregation by benchmark with mean hitRate/sharpeAnn and worst maxDrawdown

key-files:
  created:
    - app/api/dashboard/macro-engine/route.ts
  modified:
    - app/dashboard/tools/page.tsx

key-decisions:
  - "MacroEnginePayload exported from route.ts — dashboard page imports type directly from the API module"
  - "Two-step AllocationSignal query prevents full-table scan on potentially large historical table"
  - "Avg regime duration computed from in-memory 500-row label history — no extra DB query needed"
  - "Stocks filtered to overweight sectorEtf set only — no unnecessary full StockScreenResult scan"

patterns-established:
  - "MacroEnginePayload: all four dashboard panels fetched in a single aggregated GET"
  - "Empty-state safe: latestRunDate null check returns structured empty arrays, never throws"

requirements-completed: [DASH-01, DASH-02, DASH-03, DASH-04, DASH-05]

# Metrics
duration: 8min
completed: 2026-04-13
---

# Phase 6 Plan 1: Macro Engine API Route + Tools Card Summary

**Aggregated GET /api/dashboard/macro-engine returning MacroEnginePayload with regime, signals, backtested metrics, and filtered stock picks; Macro Allocation Engine card added to tools page**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-13T13:35:44Z
- **Completed:** 2026-04-13T13:43:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `app/api/dashboard/macro-engine/route.ts` with authenticated GET handler returning all four dashboard panel datasets in one response
- Exported `MacroEnginePayload` type from route.ts enabling direct import by the dashboard page
- Implemented two-step runDate filter on AllocationSignal (findFirst for latest date, findMany filtered to that date) — prevents accumulation of historical rows
- Computed regime start date and average duration from in-memory 500-row RegimeLabel history — no extra DB round trip
- Added Macro Allocation Engine entry to tools array in `app/dashboard/tools/page.tsx` with TrendingUp icon and href to /dashboard/tools/macro-engine (DASH-05)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create aggregated API route with MacroEnginePayload type** - `689aba1` (feat)
2. **Task 2: Add Macro Allocation Engine card to tools page** - `1af24b5` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `app/api/dashboard/macro-engine/route.ts` - Authenticated aggregated GET endpoint, exports MacroEnginePayload type
- `app/dashboard/tools/page.tsx` - Added macro-engine card with TrendingUp icon; TrendingUp imported from lucide-react

## Decisions Made
- MacroEnginePayload exported from route.ts (not a separate types file) — dashboard page can import directly from the API module with co-location
- Two-step AllocationSignal query pattern established to avoid full-table scans as signal history grows
- Avg regime duration from in-memory run-length analysis on already-fetched 500-row label history — no additional DB query
- Stocks query scoped to overweight sectorEtf set only, ordered by compositeScore desc

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `MacroEnginePayload` type is exported and ready for import by the dashboard page (Plan 06-02)
- GET /api/dashboard/macro-engine returns structured JSON with all four panel datasets
- Empty-state safe for fresh deploys with no data
- Tools page card navigates to /dashboard/tools/macro-engine

---
*Phase: 06-dashboard-integration*
*Completed: 2026-04-13*
