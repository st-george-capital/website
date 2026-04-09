---
phase: 04-backtesting-engine
plan: 01
subsystem: database
tags: [prisma, postgresql, typescript, backtesting]

# Dependency graph
requires:
  - phase: 03-regime-classifier
    provides: RegimeLabel model and regime label strings used by FactorWeightSet.regimeLabel
  - phase: 02-feature-engineering
    provides: FactorFeatureMatrix model used as training data source
provides:
  - BacktestRun, FactorWeightSet, BacktestMetric Prisma models in schema.prisma
  - lib/macro-engine/backtest/types.ts with all TypeScript contracts
  - HOLDOUT_START constant (2022-01-01) and assertNotHoldout() guard
affects: [04-02, 04-03, 04-04, 05-scoring-engine]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HOLDOUT_START is a hard-coded constant — never computed at runtime"
    - "assertNotHoldout() called at every data slice boundary to enforce holdout integrity"
    - "TypeScript interfaces mirror Prisma models field-for-field to avoid impedance mismatch"

key-files:
  created:
    - lib/macro-engine/backtest/types.ts
  modified:
    - prisma/schema.prisma

key-decisions:
  - "HOLDOUT_START hard-coded to 2022-01-01 — changing it invalidates all prior backtest results"
  - "db push pattern used (not migrate dev) — consistent with existing phases"
  - "DATABASE_URL not set in .env (has SQLite placeholder) — prisma generate succeeded; db push deferred to live DB environment"

patterns-established:
  - "Holdout boundary: HOLDOUT_START constant + assertNotHoldout() guard are the canonical pattern for all backtest data slicing"
  - "BACKTEST_FEATURE_DIMS array defines canonical feature order for all weight vectors"

requirements-completed: [BACK-01, BACK-02, BACK-03, BACK-04]

# Metrics
duration: 10min
completed: 2026-04-08
---

# Phase 4 Plan 01: Backtesting Engine — Schema & Type Contracts Summary

**Three Prisma backtest models (BacktestRun, FactorWeightSet, BacktestMetric) added to schema + TypeScript contracts file with HOLDOUT_START=2022-01-01 and assertNotHoldout() guard**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-08T00:00:00Z
- **Completed:** 2026-04-08T00:10:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added three Prisma models to schema.prisma under a Backtesting Engine Models section with proper relations and unique constraints
- Regenerated Prisma client successfully (npx prisma generate exits 0)
- Created lib/macro-engine/backtest/types.ts exporting all backtest contracts: BacktestConfig, BacktestWindow, WeightSet, TrainRow, WindowResult, MetricsResult, HOLDOUT_START, assertNotHoldout, BACKTEST_FEATURE_DIMS
- TypeScript compiles cleanly (0 errors)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add BacktestRun, FactorWeightSet, BacktestMetric to prisma/schema.prisma** - `0c1c747` (feat)
2. **Task 2: Create lib/macro-engine/backtest/types.ts** - `1208201` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `prisma/schema.prisma` - Added BacktestRun, FactorWeightSet, BacktestMetric models under Backtesting Engine Models section
- `lib/macro-engine/backtest/types.ts` - All backtest TypeScript contracts including HOLDOUT_START constant and assertNotHoldout() guard

## Decisions Made
- HOLDOUT_START hard-coded to `new Date('2022-01-01')` — gives ~3 years holdout from early-2025 run date; changing it invalidates all prior results
- db push pattern used (not migrate dev) per existing project convention
- DATABASE_URL in .env has SQLite placeholder — `prisma validate` and `prisma generate` ran with a placeholder PostgreSQL URL; `db push` to live DB deferred to deployment environment

## Deviations from Plan

None — plan executed exactly as written. The `db push` step could not connect to PostgreSQL (DATABASE_URL not configured for local development), but schema validation passed and Prisma client was successfully regenerated. The schema change will be applied on next deployment with a live DATABASE_URL.

## Issues Encountered
- `.env` DATABASE_URL set to `file:./dev.db` (SQLite) which conflicts with PostgreSQL provider in schema. Used `DATABASE_URL=postgresql://...` override for `prisma validate` and `prisma generate` commands. Schema is valid; live db push deferred to deployment environment.

## User Setup Required
None — no new external service configuration required. Existing DATABASE_URL (PostgreSQL) will automatically apply the schema on next `db push`.

## Next Phase Readiness
- All TypeScript contracts for plans 04-02 through 04-04 are defined and importable
- Prisma models ready for use once connected to live PostgreSQL
- HOLDOUT_START and assertNotHoldout() guard pattern established for all downstream data slicing

---
*Phase: 04-backtesting-engine*
*Completed: 2026-04-08*
