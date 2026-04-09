---
phase: 02-feature-engineering
plan: "02"
subsystem: feature-engineering
tags: [macro-engine, z-scores, time-series, simple-statistics, point-in-time]

requires:
  - phase: 02-01
    provides: FeatureRow/FeatureMatrixRow types, FactorFeatureMatrix schema, getFredAsOf/getOecdCli/getRevisions query helpers

provides:
  - rollingZScore() point-in-time z-score primitive (lib/macro-engine/features/z-scores.ts)
  - computeGrowthFactor — INDPRO MoM (US) / OECD CLI (non-US)
  - computeInflationFactor — CPIAUCSL YoY % change
  - computeMonetaryFactor — avg of FEDFUNDS and T10Y2Y z-scores
  - computeCreditFactor — BAMLH0A0HYM2 HY OAS spread z-score
  - computeCarryFactor — policy rate differential vs FEDFUNDS
  - computeEarningsFactor — EPS revision momentum (90-day window)

affects:
  - 02-03 (feature matrix builder — calls all 6 compute functions)
  - 02-04 (cross-sectional ranking — receives z-scores from factor compute functions)
  - 02-05 (look-ahead bias test — validates sourceMaxDate <= featureDate invariant)

tech-stack:
  added:
    - simple-statistics (mean, standardDeviation)
  patterns:
    - All factor functions return {value: number|null, sourceMaxDate: Date|null}
    - asOfDate ceiling enforced at every query call — no raw series truncation after fetch
    - Current observation excluded from distribution (lookback = window.slice(0, -1))
    - null returned (never thrown) on insufficient data

key-files:
  created:
    - lib/macro-engine/features/z-scores.ts
    - lib/macro-engine/features/factors/growth.ts
    - lib/macro-engine/features/factors/inflation.ts
    - lib/macro-engine/features/factors/monetary.ts
    - lib/macro-engine/features/factors/credit.ts
    - lib/macro-engine/features/factors/carry.ts
    - lib/macro-engine/features/factors/earnings.ts
  modified:
    - package.json (simple-statistics added)

key-decisions:
  - "rollingZScore excludes current observation from lookback distribution — scored AGAINST the prior distribution, not part of it"
  - "Carry factor returns null for sector ETFs (countryCode=null) — rate differential semantics only apply to country ETFs"
  - "Carry factor returns null for US (differential vs itself is always zero, uninformative)"
  - "EarningsFactor returns raw momentum ratio, not a z-score — no sufficient time-series for z-scoring revision momentum"

patterns-established:
  - "All factor files import only from '../../query' and '../z-scores' — no live API calls, no AV adapter"
  - "sourceMaxDate tracks latest observation date used — structural contract for Plan 05 look-ahead bias test"

requirements-completed:
  - FEAT-01

duration: 15min
completed: 2026-04-08
---

# Phase 2 Plan 02: Feature Engineering — Z-Scores and Factor Compute Functions Summary

**rollingZScore primitive plus 6 macro factor functions (growth, inflation, monetary, credit, carry, earnings) as pure point-in-time functions using asOfDate-ceilinged FRED/OECD query helpers**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-08T00:00:00Z
- **Completed:** 2026-04-08T00:15:00Z
- **Tasks:** 2
- **Files modified:** 9 (7 new feature files + package.json + package-lock.json)

## Accomplishments

- `rollingZScore()` helper enforces point-in-time ceiling, excludes current value from distribution, returns null for < 20 obs or std = 0
- All 6 macro factor functions implemented with uniform `{value, sourceMaxDate}` return type
- `simple-statistics` installed for mean/standardDeviation (no hand-rolled math)
- TypeScript compiles cleanly, all exports verified via `npx tsx`

## Task Commits

1. **Task 1: rollingZScore helper** - `a9e66dd` (feat)
2. **Task 2: 6 macro factor compute functions** - `3a12038` (feat)

## Files Created/Modified

- `lib/macro-engine/features/z-scores.ts` — rollingZScore, DAILY_WINDOW, MONTHLY_WINDOW, MIN_OBSERVATIONS
- `lib/macro-engine/features/factors/growth.ts` — INDPRO MoM (US) / OECD CLI (non-US)
- `lib/macro-engine/features/factors/inflation.ts` — CPIAUCSL YoY % change
- `lib/macro-engine/features/factors/monetary.ts` — avg of FEDFUNDS + T10Y2Y z-scores
- `lib/macro-engine/features/factors/credit.ts` — BAMLH0A0HYM2 HY OAS spread
- `lib/macro-engine/features/factors/carry.ts` — policy rate differential vs FEDFUNDS
- `lib/macro-engine/features/factors/earnings.ts` — EPS revision momentum 90-day window
- `package.json` / `package-lock.json` — simple-statistics dependency added

## Decisions Made

- Carry factor returns null for US (differential with itself is always zero) and null for sectors (not applicable)
- EarningsFactor returns raw momentum (recent avg / older avg - 1) not a z-scored value — revision history is too sparse for a meaningful rolling z-score
- BAMLH0A0HYM2 (credit) fetches monthly observation points via getFredAsOf rather than iterating daily, matching the other monthly-frequency factors

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Project had no Jest/test runner setup — used `npx tsx` inline verification as specified in the plan's `<verify>` blocks.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 03 (feature matrix builder) can import all 6 factor functions with their confirmed signatures
- Plan 05 (look-ahead bias test) can validate `sourceMaxDate <= featureDate` for every factor
- All factor files confirmed to import only from `../../query` and `../z-scores` — no live API exposure

---
*Phase: 02-feature-engineering*
*Completed: 2026-04-08*
