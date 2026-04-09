---
phase: 02-feature-engineering
plan: 05
subsystem: testing
tags: [look-ahead-bias, feature-matrix, structural-test, cli, macro-engine]

# Dependency graph
requires:
  - phase: 02-feature-engineering
    provides: "FeatureRow.sourceDataMaxDates (in-memory contract from buildFeatureRow)"
  - phase: 02-feature-engineering
    provides: "buildFeatureRow and buildFeatureMatrix orchestrator (plan 04)"
provides:
  - "assertNoLookAhead(rows: FeatureRow[]) — structural look-ahead bias test, throws on any violation"
  - "LookAheadViolation interface describing ticker, factor, featureDate, sourceDataDate, daysAhead"
  - "verify-feature-matrix.ts CLI — samples DB rows, rebuilds in-memory, runs look-ahead test + coverage check"
  - "verify:features npm script entry"
affects: [phase 03-regime-scoring, phase 04-backtest, ci-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Structural look-ahead test: reads sourceDataMaxDates populated in-memory by buildFeatureRow, never re-queries DB"
    - "Collect-all-violations pattern: iteration completes before throw, so all violations are reported at once"
    - "CLI scripts use parseArgs + process.exit for scriptable non-zero exits on pipeline failures"

key-files:
  created:
    - lib/macro-engine/features/lookahead-test.ts
    - scripts/macro-engine/verify-feature-matrix.ts
  modified:
    - package.json

key-decisions:
  - "Look-ahead test is structural (reads sourceDataMaxDates from buildFeatureRow output) — does not re-query DB, no false positives from DB latency"
  - "Equal dates (sourceDate === featureDate) are valid — only strictly future source dates are violations"
  - "Coverage warnings (< 50% rows with 3+ z-scores) emit to stderr but do not cause non-zero exit — only look-ahead violations fail the pipeline"
  - "verify-feature-matrix uses getUniverse() (not loadUniverse — which does not exist) matching actual universe.ts export"

patterns-established:
  - "Collect-all-violations before throwing: gives operators a full picture rather than stopping at first violation"
  - "CLI: exits 0 with informational message when DB empty — safe to run in fresh environments"

requirements-completed: [FEAT-04]

# Metrics
duration: 2min
completed: 2026-04-09
---

# Phase 2 Plan 05: Look-Ahead Bias Test Summary

**Structural look-ahead bias gate using sourceDataMaxDates — assertNoLookAhead throws with full violation list, verify-feature-matrix.ts CLI exits 1 on any violation**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-09T03:16:16Z
- **Completed:** 2026-04-09T03:17:36Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Implemented `assertNoLookAhead(rows: FeatureRow[])` which collects all violations before throwing, listing ticker, factor, featureDate, sourceDate, and days ahead for each
- Created `verify-feature-matrix.ts` CLI that samples rows from the DB, rebuilds them in-memory via `buildFeatureRow`, runs the look-ahead test, and reports z-score coverage
- Added `verify:features` npm script for convenient pipeline integration

## Task Commits

1. **Task 1: Look-ahead bias assertion function** - `6bee427` (feat)
2. **Task 2: verify-feature-matrix.ts CLI script** - `5fc471a` (feat)

## Files Created/Modified
- `lib/macro-engine/features/lookahead-test.ts` - assertNoLookAhead and LookAheadViolation export
- `scripts/macro-engine/verify-feature-matrix.ts` - Standalone CLI verifier with coverage check
- `package.json` - Added `verify:features` npm script

## Decisions Made
- Equal dates (sourceDate === featureDate) are valid — the look-ahead check uses strict `>` not `>=`
- Coverage warnings do not cause non-zero exit — only look-ahead violations fail the pipeline
- Used `getUniverse()` instead of `loadUniverse()` to match actual universe.ts export (STATE.md already noted this)

## Deviations from Plan

**1. [Rule 1 - Bug] Used getUniverse() instead of loadUniverse() in verify script**
- **Found during:** Task 2 (verify-feature-matrix.ts implementation)
- **Issue:** Plan template referenced `loadUniverse` from universe.ts, but the actual export is `getUniverse` (synchronous, no async needed)
- **Fix:** Used `getUniverse()` in the script — matches actual module API
- **Files modified:** scripts/macro-engine/verify-feature-matrix.ts
- **Verification:** TypeScript compiles cleanly with no errors
- **Committed in:** 5fc471a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — wrong function name from plan template)
**Impact on plan:** Correctness fix only. No scope change.

## Issues Encountered
None beyond the getUniverse/loadUniverse naming deviation above.

## User Setup Required
None - no external service configuration required. Run `npm run verify:features` once feature matrix is populated.

## Next Phase Readiness
- Look-ahead bias gate is complete and ready to be integrated into Phase 3 regime-scoring pipeline
- Script can be run standalone at any time: `npx tsx scripts/macro-engine/verify-feature-matrix.ts --sample 50`
- CI can use `npm run verify:features` and check exit code for pipeline enforcement

---
*Phase: 02-feature-engineering*
*Completed: 2026-04-09*
