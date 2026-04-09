---
phase: 03-regime-classifier
plan: "02"
subsystem: regime-classifier
tags: [k-means, templates, markov, transitions, feature-vectors]
dependency_graph:
  requires: [03-01]
  provides: [cluster.ts, templates.ts, transitions.ts]
  affects: [03-03]
tech_stack:
  added: [@paralleldrive/cuid2]
  patterns: [k-means++, Laplace smoothing, matrix exponentiation, greedy Euclidean matching]
key_files:
  created:
    - lib/macro-engine/regime/cluster.ts
    - lib/macro-engine/regime/templates.ts
    - lib/macro-engine/regime/transitions.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - "Euclidean centroid matching used for template stabilization (Wasserstein deferred to v2)"
  - "Prisma client regenerated mid-plan — RegimeTemplate model was not reflected in client until npx prisma generate ran"
  - "@paralleldrive/cuid2 installed (was not present despite plan notes saying it was)"
metrics:
  duration: 5min
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_created: 3
---

# Phase 3 Plan 02: Algorithm Modules Summary

**One-liner:** k-means clustering with seed=42/kmeans++ determinism, greedy Euclidean template matching for label stabilization, and Laplace-smoothed Markov transitions with ml-matrix exponentiation for 63/126/252-day horizons.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | cluster.ts — feature vector aggregation and k-means fit | 624567e | lib/macro-engine/regime/cluster.ts |
| 2 | templates.ts + transitions.ts — label stabilization and Markov transitions | 5fcaf0f | lib/macro-engine/regime/templates.ts, lib/macro-engine/regime/transitions.ts |

## What Was Built

**cluster.ts** — Three exports:
- `buildDailyFeatureVectors(startDate, endDate)`: queries FactorFeatureMatrix, groups rows by featureDate, averages z-scores across tickers (null imputed to 0), returns DailyFeatureVector[] sorted ascending
- `fitClusters(vectors, k=4)`: wraps ml-kmeans with `{ seed: 42, initialization: 'kmeans++', maxIterations: 300, tolerance: 1e-6 }` — deterministic within a single run
- `autoNameRegime(centroid)`: returns dominant dimension label (highest |z-score|) or "neutral" if max abs < 0.3

**templates.ts** — Four exports:
- `loadActiveTemplates()`: fetches all isActive=true RegimeTemplate rows, sorted by labelIndex
- `saveTemplates(fitResult, nameMap)`: deactivates existing templates, creates new ones from fitResult centroids
- `matchToTemplates(newCentroids, templates)`: greedy min-Euclidean-distance permutation array, no duplicate assignments
- `euclideanDist(a, b)`: pure helper used internally and exportable for tests

**transitions.ts** — Three exports:
- `computeTransitionMatrix(labels, k)`: counts consecutive label transitions, applies Laplace smoothing (epsilon=0.01), normalizes to row-stochastic matrix
- `kStepTransitionProb(matrix, steps)`: uses ml-matrix `Matrix.mmul()` for exponentiation — not hand-rolled
- `buildTransitionRows(fitId, labelNames, matrix, k)`: constructs TransitionMatrixRow[] for 1/63/126/252-day horizons

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma client not regenerated after Wave 1 schema changes**
- **Found during:** Task 2 TypeScript compilation
- **Issue:** `prisma.regimeTemplate` did not exist on the PrismaClient type — Wave 1 added RegimeTemplate to schema.prisma but `npx prisma generate` had not been run
- **Fix:** Ran `npx prisma generate` to regenerate the Prisma client
- **Files modified:** Generated Prisma client (node_modules, not tracked)
- **Commit:** 5fcaf0f

**2. [Rule 3 - Blocking] @paralleldrive/cuid2 not installed**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** Plan stated the package was "already installed" but it was absent from package.json
- **Fix:** Ran `npm install @paralleldrive/cuid2`
- **Files modified:** package.json, package-lock.json
- **Commit:** 624567e

## Self-Check: PASSED

- lib/macro-engine/regime/cluster.ts: exists
- lib/macro-engine/regime/templates.ts: exists
- lib/macro-engine/regime/transitions.ts: exists
- Commit 624567e: confirmed in git log
- Commit 5fcaf0f: confirmed in git log
- `npx tsc --noEmit`: 0 errors in all three files
- seed:42 + kmeans++: present (3 matches in cluster.ts)
- mmul: present (1 match in transitions.ts)
- LAPLACE_EPSILON: present (2 matches in transitions.ts)
- matchToTemplates + euclideanDist: present (3 matches in templates.ts)
