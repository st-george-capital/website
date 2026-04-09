---
phase: 03-regime-classifier
plan: "01"
subsystem: database
tags: [prisma, postgresql, typescript, ml-kmeans, ml-matrix, regime-classifier]

# Dependency graph
requires:
  - phase: 02-feature-engineering
    provides: FactorFeatureMatrix model and FeatureRow types used as input to regime classifier
provides:
  - ml-kmeans and ml-matrix npm packages installed with bundled TypeScript types
  - RegimeTemplate, RegimeLabel, RegimeTransition Prisma models in schema.prisma
  - lib/macro-engine/regime/types.ts TypeScript contracts for all Phase 3 modules
affects: [03-02, 03-03, 03-04, 03-05]

# Tech tracking
tech-stack:
  added: [ml-kmeans@7.x, ml-matrix@6.x]
  patterns: [Type shapes mirror Prisma model fields exactly — no impedance mismatch, FEATURE_DIMENSIONS const array enforces consistent vector dimension ordering]

key-files:
  created:
    - lib/macro-engine/regime/types.ts
  modified:
    - prisma/schema.prisma
    - package.json
    - package-lock.json

key-decisions:
  - "RegimeLabel uses date as @id (no surrogate key) — natural PK matches query pattern (look up label by date)"
  - "RegimeTransition uses @@unique([fitId, fromLabel, toLabel]) for upsert-safe writes"
  - "FEATURE_DIMENSIONS const array established as canonical dimension ordering — all downstream code must reference this"

patterns-established:
  - "FEATURE_DIMENSIONS as const: dimension ordering locked to [zGrowth, zInflation, zMonetary, zCredit, zCarry, zEarnings]"
  - "fitId as shared key: single string links RegimeTemplate rows → RegimeLabel rows → RegimeTransition rows for a given fit run"

requirements-completed: [REGM-01, REGM-02, REGM-03, REGM-04]

# Metrics
duration: 8min
completed: 2026-04-09
---

# Phase 3 Plan 01: Regime Classifier Foundation Summary

**ml-kmeans + ml-matrix installed, three Prisma regime models added to schema, and TypeScript contracts defined in lib/macro-engine/regime/types.ts**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-09T03:33:00Z
- **Completed:** 2026-04-09T03:41:14Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Installed ml-kmeans (7.x) and ml-matrix (6.x) — both importable without type errors
- Appended RegimeTemplate, RegimeLabel, RegimeTransition to prisma/schema.prisma
- Created lib/macro-engine/regime/types.ts exporting DailyFeatureVector, RegimeFitResult, RegimeLabelRow, TransitionMatrixRow, RegimeTemplateRow, FEATURE_DIMENSIONS
- TypeScript compilation: 0 errors after all changes

## Task Commits

1. **Task 1: Install ml-kmeans and ml-matrix** - `4bc54ba` (chore)
2. **Task 2: Prisma models + TypeScript contracts** - `cde87ed` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - Added RegimeTemplate, RegimeLabel, RegimeTransition models at end of file
- `lib/macro-engine/regime/types.ts` - All Phase 3 TypeScript contracts (types + constants only, no functions)
- `package.json` / `package-lock.json` - ml-kmeans and ml-matrix added as dependencies

## Decisions Made

- RegimeLabel uses `date DateTime @id` (natural primary key) — date is the primary query dimension for this table; no surrogate key needed
- RegimeTransition @@unique([fitId, fromLabel, toLabel]) — enables upsert-safe writes without id collision on re-runs
- FEATURE_DIMENSIONS const array locks dimension ordering as canonical contract — all downstream code (Plans 02–05) must index into vectors using this ordering

## Deviations from Plan

### Environment Gate

**`prisma db push` could not run — DATABASE_URL in .env is set to `file:./dev.db` (SQLite placeholder), not a valid PostgreSQL URL.**

- **Found during:** Task 2 (after appending models to schema.prisma)
- **Issue:** `.env` contains `DATABASE_URL="file:./dev.db"` which fails Prisma schema validation (provider is `postgresql`, requires `postgresql://` protocol)
- **Status:** Schema changes are committed to source control. The three models will be pushed to the database once the correct DATABASE_URL is set.
- **Required action:** Set `DATABASE_URL` to the production/staging PostgreSQL connection string and run `npx prisma db push` once.
- **Verification command:** `npx prisma db push && npx prisma studio` (confirm regime_templates, regime_labels, regime_transitions tables appear)

All other plan tasks completed and verified. The TypeScript contracts and schema definitions are complete and correct — only the DB push step requires the environment credential.

---

**Total deviations:** 0 auto-fixes. 1 environment gate (DATABASE_URL missing/incorrect).
**Impact:** Schema and types are production-ready. DB push is a one-command step once DATABASE_URL is configured.

## Issues Encountered

- DATABASE_URL in .env is a SQLite placeholder (`file:./dev.db`). Prisma schema uses `postgresql` provider. The three regime models are in schema.prisma and ready to push — user must set DATABASE_URL to a valid PostgreSQL URL and run `npx prisma db push`.

## User Setup Required

To complete the DB migration:
1. Set `DATABASE_URL` in `.env` to a valid PostgreSQL connection string (e.g., `postgresql://user:password@host:5432/dbname`)
2. Run: `npx prisma db push`
3. Verify: `grep -c "regime_templates\|regime_labels\|regime_transitions" <(npx prisma db pull --print 2>/dev/null)` should return 3

## Next Phase Readiness

- ml-kmeans and ml-matrix are importable — Plan 02 (k-means fitter) can proceed immediately
- TypeScript contracts in types.ts are complete — all downstream plans can import without exploration
- Prisma schema changes are committed — once DATABASE_URL is set, `db push` is a single command
- **Blocker for Plans 03–05:** DB write operations require the three tables to exist; `npx prisma db push` must be run before any write-path code is tested end-to-end

---
*Phase: 03-regime-classifier*
*Completed: 2026-04-09*
