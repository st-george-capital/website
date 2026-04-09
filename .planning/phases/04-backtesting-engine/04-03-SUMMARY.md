---
phase: 04-backtesting-engine
plan: 03
subsystem: backtest-orchestration
tags: [backtest, cli, verification, prisma, postgres]
dependency_graph:
  requires: [04-01, 04-02]
  provides: [phase-04-complete]
  affects: [macro-engine-ingest]
tech_stack:
  added: []
  patterns: [walk-forward-orchestrator, cli-verifier, direct-url-analytics]
key_files:
  created:
    - lib/macro-engine/backtest/index.ts
    - scripts/macro-engine/run-backtest.ts
    - scripts/macro-engine/verify-backtest.ts
  modified:
    - lib/macro-engine/backtest/metrics.ts
    - lib/macro-engine/backtest/weights.ts
    - package.json
    - prisma/schema.prisma
    - lib/macro-engine/db.ts
    - lib/macro-engine/ingest/prices.ts
    - lib/macro-engine/ingest/macro-series.ts
    - lib/macro-engine/providers/alfred.ts
    - lib/macro-engine/providers/alpha-vantage.ts
    - scripts/macro-engine/run-feature-build.ts
decisions:
  - "Backtest CLI switches from Prisma Accelerate DATABASE_URL to DIRECT_URL before importing Prisma — avoids Accelerate's 10s analytics-query limit."
  - "Managed Postgres without TimescaleDB is allowed with a warning; ingest/backtest can run on Prisma Postgres."
  - "FRED vintage responses currently fall back to standard observations when the matrix-format vintage payload cannot be parsed by the Phase 1 adapter."
  - "Smoke verification used DB-seeded factor/regime rows on real OHLCV trading dates; no synthetic fixture files were committed."
metrics:
  duration: 3h
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_created: 3
---

# Phase 4 Plan 03: Orchestrator + CLI Summary

Phase 4 is wired end-to-end: the backtest orchestrator reads feature/regime/price data, fits regime-conditioned ridge weights across walk-forward windows, computes OOS + holdout metrics, persists result tables, and has a verifier CLI for BACK-* invariants.

## What Was Built

### Task 1: runBacktest() Orchestrator

**lib/macro-engine/backtest/index.ts** — `runBacktest(config?)`
- Composes `generateWindows()`, `computeForwardReturns()`, `fitWeightSetsForWindow()`, and `aggregateMetrics()`
- Reads `FactorFeatureMatrix` + `RegimeLabel` rows for each train/test window
- Scores OOS test rows with regime-specific weights and a global fallback
- Scores the untouched holdout window beginning at the hard-coded `HOLDOUT_START`
- Writes `BacktestRun`, `FactorWeightSet`, and `BacktestMetric` rows after metrics are computed
- Skips empty feature windows before expensive return computation

### Task 2: CLI + Verification

**scripts/macro-engine/run-backtest.ts**
- `npm run backtest:run`
- `--dry-run` validates imports/config without DB writes
- Uses `DIRECT_URL` for local analytics when `DATABASE_URL` is a Prisma Accelerate URL

**scripts/macro-engine/verify-backtest.ts**
- `npm run verify:backtest`
- Checks latest run for holdout boundary, persisted weight sets, OOS metric row, holdout metric row, and plausible holdout Sharpe

**package.json**
- Added `backtest:run`
- Added `verify:backtest`
- Normalized regime scripts to use `npx tsx`

## Deviations from Plan

### Managed Postgres Compatibility

- Prisma schema now has `directUrl = env("DIRECT_URL")`
- Timescale check warns and falls back to plain Postgres instead of aborting on providers without the TimescaleDB extension
- Price and macro ingest write in `createMany(..., skipDuplicates: true)` batches instead of one raw SQL request per row

### Provider / CLI Compatibility

- FRED vintage parser now falls back to current observations on 400/5xx responses or unsupported matrix-format vintage payloads
- Alpha Vantage parser accepts the provider's daily time-series key variant observed during ingest
- `run-feature-build.ts` no longer uses top-level await, which failed under this repo's tsx/CJS transform path

### Backtest Corrections

- `aggregateMetrics()` now records `nPeriods` as the number of excess-return observations, not the number of windows
- `fitWeightSetsForWindow()` now emits exactly one `"global"` weight set even when training rows had missing regime labels

## Verification

```text
npx tsc --noEmit
PASS

npm run backtest:run -- --dry-run
PASS

npm run backtest:run
PASS — persisted runId=cmnro3bc90000715knzwweeq5

npm run verify:backtest
PASS — windowCount=15; 4 weight sets; OOS + holdout metrics present
```

Latest smoke metrics:

```text
OOS     hitRate=0.491 sharpe=-0.368 maxDD=-1.000
Holdout hitRate=0.509 sharpe=-0.168 maxDD=-1.000
```

## Commits

| Commit | Description |
|--------|-------------|
| c6be870 | fix(macro-engine): support managed Postgres and resilient ingest |
| 7811267 | feat(04-03): wire backtest orchestrator and CLI verification |

## Self-Check: PASSED

All planned artifacts exist, TypeScript compiles, the backtest CLI wrote DB rows, and `npm run verify:backtest` exited 0.
