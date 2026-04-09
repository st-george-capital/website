---
phase: 04-backtesting-engine
plan: 02
subsystem: backtest-computation
tags: [backtest, ridge-regression, metrics, walk-forward, returns]
dependency_graph:
  requires: [04-01]
  provides: [04-03]
  affects: []
tech_stack:
  added: []
  patterns: [ridge-regression, walk-forward-windows, pure-functions]
key_files:
  created:
    - lib/macro-engine/backtest/windows.ts
    - lib/macro-engine/backtest/returns.ts
    - lib/macro-engine/backtest/weights.ts
    - lib/macro-engine/backtest/metrics.ts
  modified: []
decisions:
  - "ml-matrix solve() used as standalone function (not Matrix method) — auto-fixed during Task 2"
  - "Regime fallback: isFallback=true + globalWeights when sampleCount < minRegimeSamples"
  - "aggregateMetrics() concatenates full series before drawdown — not per-window max"
metrics:
  duration: 10min
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_created: 4
---

# Phase 4 Plan 02: Pure Computation Modules Summary

Four pure computation modules for walk-forward backtesting: window generation, forward return computation, ridge regression weight fitting, and performance metrics.

## What Was Built

### Task 1: windows.ts + returns.ts

**windows.ts** — `generateWindows(config: BacktestConfig): BacktestWindow[]`
- Expanding training windows (trainStart always = config.dataStart)
- testStart advances by stepMonths each iteration
- `assertNotHoldout(testStart)` called on every window — throws on holdout boundary violation
- Any window with testStart >= HOLDOUT_START is dropped; testEnd is capped at HOLDOUT_START

**returns.ts** — `computeForwardReturns(tickers, startDate, endDate): Promise<ForwardReturn[]>`
- Queries `ohlcv_daily` using `adjClose` (never `close`) for split/dividend accuracy
- Fetches endDate + 31 days of buffer to find forward prices
- Skips observations where forward price is missing — never zero-fills
- Logs skip count when observations are dropped

### Task 2: weights.ts + metrics.ts

**weights.ts** — `fitWeightsRidge()` + `fitWeightSetsForWindow()`
- `fitWeightsRidge(features, returns, lambda)`: exact solution via `solve(XtXreg, Xty)` from ml-matrix — no gradient descent
- `fitWeightSetsForWindow()`: groups TrainRows by regimeLabel; regimes with sampleCount < minRegimeSamples get isFallback=true with globalWeights; always appends a "global" entry

**metrics.ts** — `hitRate()`, `annualizedSharpe()`, `maxDrawdown()`, `aggregateMetrics()`
- All three metric functions are pure (no DB, no side effects)
- `hitRate`: fraction where sign(predicted) === sign(actual)
- `annualizedSharpe`: (mean/stddev) * sqrt(periodsPerYear), returns 0 if sigma=0
- `maxDrawdown`: cumulative product series, returns negative fraction
- `aggregateMetrics`: concatenates full return series across all windows before computing metrics

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ml-matrix solve() is standalone function, not Matrix method**
- **Found during:** Task 2 TypeScript compile
- **Issue:** Plan code used `XtXreg.solve(Xty)` but ml-matrix exports `solve` as a module-level function, not a Matrix instance method
- **Fix:** Changed `import { Matrix }` to `import { Matrix, solve }` and `XtXreg.solve(Xty)` to `solve(XtXreg, Xty)`
- **Files modified:** lib/macro-engine/backtest/weights.ts
- **Commit:** 6ff9814

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 1ea097e | feat(04-02): implement windows.ts and returns.ts |
| 2 | 6ff9814 | feat(04-02): implement weights.ts and metrics.ts |

## Self-Check: PASSED

All 4 files exist. Both commits verified. TypeScript compiles with 0 errors.
