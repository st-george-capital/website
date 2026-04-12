---
phase: 05-allocation-signals
plan: "02"
subsystem: signals
tags: [prisma, postgres, calibration, probabilities, signals, empirical]

# Dependency graph
requires:
  - phase: 05-allocation-signals
    plan: "01"
    provides: scoreUniverse() + runDailySignals() + AllocationSignal table
  - phase: 04-backtesting-engine
    provides: BacktestRun + FactorWeightSet rows used for historical scoring
  - phase: 03-regime-classifier
    provides: RegimeLabel rows joined on featureDate for regime-stratified calibration
provides:
  - computeOutperformanceProbabilities() function (lib/macro-engine/signals/probabilities.ts)
  - prob6m and prob12m populated on every AllocationSignal row
  - verify:signals --check-probs exits 0 with >= 80% coverage check
affects: [05-03, phase-5-allocation-signals]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Empirical calibration via (regime, decile) bucket lookup — no model training
    - LEFT JOIN regime_labels on nearest prior date using correlated subquery
    - Raw SQL $queryRaw for ohlcv_daily forward-price lookup at 6m/12m calendar offsets
    - Fallback chain: regime bucket (>= 5 obs) → global bucket (>= 5 obs) → 0.5
    - Clamp output to [0.05, 0.95] to prevent thin-bucket extremes

key-files:
  created:
    - lib/macro-engine/signals/probabilities.ts
  modified:
    - lib/macro-engine/signals/index.ts
    - scripts/macro-engine/verify-signals.ts

key-decisions:
  - "FactorFeatureMatrix has no regimeLabel column — joined with regime_labels on nearest prior date via correlated subquery"
  - "Global fallback weight set (isFallback: true) used for historical scoring — keeps calibration consistent with actual scoring weights"
  - "Calendar days used for forward windows (182d for 6m, 365d for 12m) with 14-day buffer for market close gaps"
  - "SPY prices fetched alongside ticker prices in single raw SQL query — one DB round-trip for calibration"
  - "checkProbs updated from warn-only to enforcing >= 80% coverage with non-zero exit on failure"

# Metrics
duration: 3min
completed: 2026-04-12
---

# Phase 5 Plan 02: Probabilistic Forecasts Summary

**Empirical P(outperforms SPY 6m/12m) calibrated from 40,169 pre-2022 FactorFeatureMatrix rows, stratified by conviction decile and regime label**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-12T21:29:09Z
- **Completed:** 2026-04-12T21:32:11Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `computeOutperformanceProbabilities()` implemented in `probabilities.ts`:
  - Fetches 40,169 historical (ticker, featureDate) rows pre-HOLDOUT_START via raw SQL join with `regime_labels`
  - Scores each observation with global FactorWeightSet (isFallback=true) → conviction → decile 0–9
  - Fetches 49,788 OHLCV price rows for all tickers + SPY in a single raw SQL query
  - Computes SPY-relative hit rates at 182 and 365 calendar days per (regime, decile) bucket
  - Calibrated 39 buckets; 12/12 tickers received non-uniform, non-0.5 probabilities
- `runDailySignals()` updated to call `computeOutperformanceProbabilities()` post-scoring and write `prob6m`/`prob12m` to upsert create + update blocks
- `verify:signals --check-probs` updated from warn-only to strict check: asserts >= 80% coverage + prints per-ticker prob table

## Sample Output (live run)

| ticker | conviction | prob6m | prob12m |
|--------|-----------|--------|---------|
| EWZ    | 1.000     | 0.546  | 0.509   |
| EWA    | 0.876     | 0.594  | 0.522   |
| XLK    | 0.746     | 0.596  | 0.508   |
| EWG    | 0.617     | 0.479  | 0.424   |
| EWJ    | 0.334     | 0.274  | 0.268   |
| SPY    | 0.000     | 0.389  | 0.631   |

All values in [0.05, 0.95], vary across tickers, non-uniform.

## Task Commits

1. **Task 1: Probabilistic forecast module — probabilities.ts** - `5b8f786` (feat)
2. **Task 2: Wire probabilities into runDailySignals() and update verify script** - `662a66c` (feat)

## Files Created/Modified

- `lib/macro-engine/signals/probabilities.ts` - computeOutperformanceProbabilities() with empirical calibration
- `lib/macro-engine/signals/index.ts` - import + call probabilities, populate prob6m/prob12m in upsert
- `scripts/macro-engine/verify-signals.ts` - --check-probs now enforces >= 80% coverage, prints per-ticker table

## Decisions Made

- `FactorFeatureMatrix` has no `regimeLabel` column — joined with `regime_labels` on nearest prior date via correlated subquery (`WHERE date <= f.featureDate ORDER BY date DESC LIMIT 1`)
- Global fallback weight set (`isFallback: true`) used for historical scoring to keep calibration consistent with live scoring weights
- Calendar day windows (182d / 365d) with 14-day buffer chosen to handle market close gaps without imputation
- Single raw SQL query fetches all ticker + SPY prices for the full calibration window — avoids N+1 pattern
- `--check-probs` upgraded from ALLC-02 (warn-only for nulls) to ALLC-03 (hard failure if < 80% coverage)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FactorFeatureMatrix has no regimeLabel column**
- **Found during:** Task 1 (TypeScript compile error)
- **Issue:** Plan assumed `regimeLabel` field exists on `FactorFeatureMatrix` Prisma model, but the schema has no such column; regime is stored separately in `regime_labels` table
- **Fix:** Replaced `prismaDirectUrl.factorFeatureMatrix.findMany` with `prismaDirectUrl.$queryRaw` SQL that LEFT JOINs `regime_labels` on the nearest prior date via correlated subquery
- **Files modified:** `lib/macro-engine/signals/probabilities.ts`
- **Commit:** `5b8f786`

## Issues Encountered

None beyond the auto-fixed deviation above.

## Next Phase Readiness

- prob6m and prob12m populated on all AllocationSignal rows — ALLC-03 satisfied
- Plan 03 (stock screener / analyst consensus) can proceed

---
*Phase: 05-allocation-signals*
*Completed: 2026-04-12*

## Self-Check: PASSED

All 4 files confirmed on disk. Commits 5b8f786 and 662a66c confirmed in git log.
