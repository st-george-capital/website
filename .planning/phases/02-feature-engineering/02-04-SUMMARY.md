---
phase: 02-feature-engineering
plan: "04"
subsystem: macro-engine/features
tags: [feature-engineering, orchestrator, cross-section, batch-builder, cli]
dependency_graph:
  requires: [02-02, 02-03]
  provides: [buildFeatureRow, buildFeatureMatrix, computeCrossSection, run-feature-build CLI]
  affects: [02-05-look-ahead-bias-test]
tech_stack:
  added: [date-fns (eachDayOfInterval, isWeekend, subYears)]
  patterns: [cross-sectional-ranking, batch-upsert, factor-orchestration]
key_files:
  created:
    - lib/macro-engine/features/cross-section.ts
    - lib/macro-engine/features/index.ts
    - scripts/macro-engine/run-feature-build.ts
  modified: []
decisions:
  - "getUniverse() used in CLI instead of loadUniverse() — universe.ts exports getUniverse, not loadUniverse"
  - "Import path for crossSectionZScore is ../../country-health/scoring (2 levels up from features/), not 3 levels"
metrics:
  duration: 15m
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_created: 3
---

# Phase 02 Plan 04: Feature Matrix Orchestrator (buildFeatureRow + buildFeatureMatrix) Summary

Complete feature matrix build pipeline: cross-sectional ranking, row-level factor orchestration calling all 8 compute functions, batch DB builder with business-day iteration and upsert, and standalone CLI runner.

## What Was Built

**lib/macro-engine/features/cross-section.ts** — `computeCrossSection(rows)` mutates rank_ fields on all 6 macro factors for a batch of FeatureRows at the same date. Delegates to `crossSectionZScore` from `lib/country-health/scoring` — not rebuilt. Null z-scores propagate as null ranks (not 0).

**lib/macro-engine/features/index.ts** — Two main exports:
- `buildFeatureRow(asOfDate, entry)`: Calls all 8 factor compute functions concurrently (7 via `Promise.all`, country-health sequentially because it's conditional on entry.country). Assembles `sourceDataMaxDates` map for look-ahead bias testing in Plan 05.
- `buildFeatureMatrix(startDate, endDate, universe)`: Iterates business days (weekends filtered), builds all FeatureRows per date, calls `computeCrossSection`, then upserts each row to `factor_feature_matrix` via `prisma.factorFeatureMatrix.upsert` on composite key `featureDate_ticker`. Logs progress every 20 dates. Returns count of rows written.

**scripts/macro-engine/run-feature-build.ts** — CLI runner. Accepts `--start YYYY-MM-DD` and `--end YYYY-MM-DD` args (defaults: last 30 years to today). Calls `getUniverse()` + `buildFeatureMatrix`. Exits 0 on success, 1 on error.

## Verification

- `npx tsc --noEmit` passes cleanly (0 errors) on all 3 new files
- All 8 factor compute functions imported and wired correctly
- `computeCrossSection` imports `crossSectionZScore` from existing scoring module — not rebuilt
- `featureDate_ticker` composite key matches Prisma schema `@@id([featureDate, ticker])`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected relative import path for crossSectionZScore**
- **Found during:** Task 1 (post-initial-write)
- **Issue:** Plan template used `'../../../lib/country-health/scoring'` which traverses 3 levels up from `lib/macro-engine/features/` to project root and back into lib — resolving to a non-existent path.
- **Fix:** Corrected to `'../../country-health/scoring'` (2 levels up: features/ → macro-engine/ → lib/, then into country-health/).
- **Files modified:** lib/macro-engine/features/cross-section.ts
- **Commit:** f7cfded

**2. [Rule 3 - Blocking] Used getUniverse() instead of loadUniverse() in CLI**
- **Found during:** Task 2
- **Issue:** Plan specified `import { loadUniverse } from '../../lib/macro-engine/universe'` but `universe.ts` exports `getUniverse()` (not `loadUniverse()`).
- **Fix:** Used `getUniverse()` in `run-feature-build.ts`.
- **Files modified:** scripts/macro-engine/run-feature-build.ts

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 24d5173 | feat(02-04): cross-sectional ranking module using crossSectionZScore |
| Task 1 fix | f7cfded | fix(02-04): correct relative import path for crossSectionZScore |
| Task 2 | dca06d6 | feat(02-04): buildFeatureRow, buildFeatureMatrix orchestrator and CLI runner |
