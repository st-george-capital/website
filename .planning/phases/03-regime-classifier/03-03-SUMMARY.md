---
phase: 03-regime-classifier
plan: "03"
subsystem: macro-engine/regime
tags: [regime-classifier, orchestrator, cli, validation, stability]
dependency_graph:
  requires:
    - 03-01 (types.ts, Prisma models: RegimeTemplate, RegimeLabel, RegimeTransition)
    - 03-02 (cluster.ts, templates.ts, transitions.ts algorithm modules)
  provides:
    - classifyRegimes() — entry point for full pipeline
    - run-regime-fit CLI — npm run fit:regimes
    - verify-regime-stability CLI — npm run verify:regime-stability
  affects:
    - Phase 4 (queries prisma.regimeLabel for current/historical regime)
tech_stack:
  added: []
  patterns:
    - Orchestrator pattern: index.ts delegates to algorithm modules, never contains algorithm logic
    - Template stabilization: first-run saves canonical centroids, re-fits match via greedy Euclidean permutation
    - Confidence score: 1 / (1 + euclideanDist) — higher = point closer to centroid = more confident
key_files:
  created:
    - lib/macro-engine/regime/index.ts
    - scripts/macro-engine/run-regime-fit.ts
    - scripts/macro-engine/verify-regime-stability.ts
  modified:
    - package.json
decisions:
  - classifyRegimes() centralizes the 8-step pipeline — callers never import cluster/templates/transitions directly
  - Historical validation uses NBER/Fed canonical windows (2008-09-01, 2020-02-15, 2022-03-01) — do not change
  - verify-regime-stability reads DB labels after each run (not in-memory) — tests the full upsert round-trip
  - modalLabel() queries DB post-fit — validates written data, not in-flight computation
metrics:
  duration: 8min
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 3 Plan 03: Regime Orchestrator + CLI Summary

**One-liner:** classifyRegimes() 8-step orchestrator wiring k-means clustering, template stabilization, and DB upsert — with historical validation against 2008 GFC / 2020 COVID / 2022 rate-shock windows and label stability verification.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | classifyRegimes() orchestrator | 54e6244 | lib/macro-engine/regime/index.ts |
| 2 | run-regime-fit.ts + verify-regime-stability.ts + npm scripts | cec98c0 | scripts/macro-engine/run-regime-fit.ts, scripts/macro-engine/verify-regime-stability.ts, package.json |

## What Was Built

### lib/macro-engine/regime/index.ts
Full 8-step pipeline orchestrator:
1. `buildDailyFeatureVectors(startDate, endDate)` — aggregate feature matrix by date
2. `fitClusters(vectors, k)` — k-means with seed=42 + kmeans++ init
3. `loadActiveTemplates()` — detect first-run vs re-fit
4. Template stabilization — first-run: `saveTemplates(autoNameRegime)`; re-fit: `matchToTemplates` + remap assignments
5. Build nameMap from templates or autoName
6. Upsert `RegimeLabel` rows (one per date) — confidence = `1 / (1 + euclideanDist)`
7. `computeTransitionMatrix` on full label sequence
8. Upsert `RegimeTransition` rows via `buildTransitionRows`

Returns `ClassifyResult { fitId, labelCount, regimeNames, converged }`.

### scripts/macro-engine/run-regime-fit.ts
- Reads `START_DATE`/`END_DATE`/`REGIME_K` env vars (defaults: 2003-01-01, today, k=4)
- Calls `classifyRegimes()`, then runs historical validation
- `modalLabel()` queries DB for each of three canonical shock windows
- Asserts all three are distinct — `process.exit(1)` if any two share a label
- `process.exit(0)` on success

### scripts/macro-engine/verify-regime-stability.ts
- Fixed window: 2003-01-01 to 2023-12-31
- Calls `classifyRegimes()` twice, reads DB labels after each run
- Compares date-by-date — asserts 100% agreement
- `process.exit(1)` if any disagreements, `process.exit(0)` if fully stable

### package.json additions
- `"fit:regimes": "tsx scripts/macro-engine/run-regime-fit.ts"`
- `"verify:regime-stability": "tsx scripts/macro-engine/verify-regime-stability.ts"`

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. `npx tsc --noEmit` — 0 errors
2. `grep "fit:regimes\|verify:regime-stability" package.json` — both scripts present
3. All three canonical dates present in run-regime-fit.ts
4. `process.exit(1)` present for validation failure
5. `seed: 42` confirmed in cluster.ts

## Self-Check: PASSED

- `lib/macro-engine/regime/index.ts` — FOUND
- `scripts/macro-engine/run-regime-fit.ts` — FOUND
- `scripts/macro-engine/verify-regime-stability.ts` — FOUND
- Commit 54e6244 — FOUND
- Commit cec98c0 — FOUND
