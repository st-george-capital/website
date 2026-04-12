---
phase: 05-allocation-signals
plan: "01"
subsystem: database
tags: [prisma, postgres, scoring, signals, cron, vercel, tsx]

# Dependency graph
requires:
  - phase: 04-backtesting-engine
    provides: BacktestRun + FactorWeightSet rows used for regime-conditioned weights
  - phase: 03-regime-classifier
    provides: RegimeLabel rows used to select matching weight set
  - phase: 02-feature-engineering
    provides: FactorFeatureMatrix rows used for z-score inputs to scoring
provides:
  - AllocationSignal and StockScreenResult Prisma models (schema + DB tables)
  - scoreUniverse() function with conviction normalization and factor attribution
  - runDailySignals() orchestrator that ranks and upserts AllocationSignal rows
  - CRON_SECRET-gated GET /api/cron/signals route
  - vercel.json cron schedule at 0 6 * * *
  - npm run signals:run CLI and npm run signals:dry dry-run
  - npm run verify:signals flag-based ALLC check script
affects: [05-02, 05-03, phase-5-allocation-signals]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DIRECT_URL override at script top for Prisma Accelerate bypass
    - Dynamic import pattern for cron routes to avoid cold-start bundle size
    - scoreUniverse uses prismaDirectUrl; runDailySignals uses prisma (API route pattern)
    - Regime fallback chain: regimeLabel match → isFallback row → throw
    - Feature staleness warning logged when featureDate is >5 days before asOfDate

key-files:
  created:
    - prisma/schema.prisma (AllocationSignal + StockScreenResult models appended)
    - lib/macro-engine/signals/conviction.ts
    - lib/macro-engine/signals/scoring.ts
    - lib/macro-engine/signals/index.ts
    - app/api/cron/signals/route.ts
    - vercel.json
    - scripts/macro-engine/run-signals.ts
    - scripts/macro-engine/verify-signals.ts
  modified:
    - package.json (signals:run, signals:dry, verify:signals scripts)

key-decisions:
  - "scoreUniverse uses prismaDirectUrl (bypasses Accelerate); runDailySignals uses prisma for API route compatibility"
  - "etfTicker = ticker for ETFs — ETFs are their own entry vehicle; equities will override in Plan 02"
  - "prob6m and prob12m written as null at this stage — populated by Plan 02 probability layer"
  - "Staleness warning threshold: featureDate >5 days before asOfDate emits console.warn but does not throw"
  - "Regime weight set fallback chain: exact regimeLabel match → isFallback:true row from same runId → throw"

patterns-established:
  - "All signals CLI scripts follow run-backtest.ts pattern: shebang + export {} + DIRECT_URL override + --dry-run/--help"
  - "verify:signals uses flag-based checks consistent with verify-backtest.ts; warn-only for not-yet-populated fields"

requirements-completed: [ALLC-01, ALLC-02]

# Metrics
duration: 4min
completed: 2026-04-12
---

# Phase 5 Plan 01: Allocation Signals Foundation Summary

**Prisma AllocationSignal + StockScreenResult schema, regime-conditioned ETF scorer with conviction normalization, daily signals cron route, and CLI/verify scripts**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-12T21:23:41Z
- **Completed:** 2026-04-12T21:26:49Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- AllocationSignal and StockScreenResult tables pushed to DB via `prisma db push`
- scoreUniverse() fetches latest BacktestRun weights + RegimeLabel, queries most recent FactorFeatureMatrix snapshot, logs feature date staleness, and returns conviction-normalized ScoredEntry list
- runDailySignals() ranks entries by descending score and upserts into AllocationSignal; prob6m/prob12m left null for Plan 02
- CRON_SECRET-gated cron route at /api/cron/signals with dynamic import to avoid bundle bloat
- vercel.json created with 0 6 * * * schedule
- `npm run signals:dry` exits 0 and prints 12 universe ETFs + 6 feature dims without touching DB

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema — AllocationSignal + StockScreenResult models** - `cfc9fb8` (feat)
2. **Task 2: Scoring orchestrator, cron route, CLI + verify scripts** - `75992d9` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `prisma/schema.prisma` - AllocationSignal + StockScreenResult models appended after BacktestMetric
- `lib/macro-engine/signals/conviction.ts` - normalizeConviction() + attributeFactors()
- `lib/macro-engine/signals/scoring.ts` - scoreUniverse() with regime weight lookup, feature query, staleness warning
- `lib/macro-engine/signals/index.ts` - runDailySignals() orchestrator with rank assignment and upsert
- `app/api/cron/signals/route.ts` - CRON_SECRET-gated GET handler
- `vercel.json` - Cron schedule at 0 6 * * * for /api/cron/signals
- `scripts/macro-engine/run-signals.ts` - CLI with --dry-run and --help
- `scripts/macro-engine/verify-signals.ts` - ALLC check flags: --check-rows, --check-fields, --check-probs, --check-stocks, --check-analyst
- `package.json` - signals:run, signals:dry, verify:signals npm scripts

## Decisions Made
- scoreUniverse() uses `prismaDirectUrl` (bypasses Prisma Accelerate for scripts); runDailySignals() uses `prisma` (for API route use via cron)
- `etfTicker = ticker` for ETFs — they are their own entry vehicle; equities will map to their sector ETF in Plan 02
- `prob6m` and `prob12m` written as `null` at this stage — the probability layer is Plan 02's responsibility
- Staleness warning at >5 days: emits `console.warn` but does not throw — allows weekend/holiday gaps without breaking the pipeline
- Regime weight set fallback chain: exact `regimeLabel` match → `isFallback: true` row from same `runId` → throw with actionable message

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. `CRON_SECRET` environment variable must be set in Vercel dashboard for the cron route authorization header check to work.

## Next Phase Readiness
- AllocationSignal table and scoring pipeline ready for Plan 02 (probability layer: prob6m/prob12m)
- StockScreenResult table ready for Plan 02/03 stock screener implementation
- Cron route deployed on next Vercel push; verify CRON_SECRET is set in Vercel environment

---
*Phase: 05-allocation-signals*
*Completed: 2026-04-12*
