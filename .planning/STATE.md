---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 06-01-PLAN.md (aggregated macro-engine API route + tools page card)
last_updated: "2026-04-13T17:52:52.571Z"
last_activity: 2026-04-09 — Completed Phase 4 / 04-03 (backtest orchestrator + CLI)
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 24
  completed_plans: 24
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-08)

**Core value:** Given the current global macro regime, tell me which countries and sectors will outperform and underperform — with probabilities, backtested accuracy, and specific investable recommendations (ETFs + equities).
**Current focus:** Phase 5 — Allocation Signals

## Current Position

Phase: 5 of 6 (Allocation Signals)
Plan: TBD
Status: Phase 4 complete; next phase not planned
Last activity: 2026-04-09 — Completed Phase 4 / 04-03 (backtest orchestrator + CLI)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01-data-foundation P03 | 15m | 3 tasks | 7 files |
| Phase 01-data-foundation P04 | 20m | 3 tasks | 4 files |
| Phase 02-feature-engineering P02 | 15m | 2 tasks | 9 files |
| Phase 02-feature-engineering P04 | 15m | 2 tasks | 3 files |
| Phase 02-feature-engineering P05 | 2min | 2 tasks | 3 files |
| Phase 03-regime-classifier P01 | 8min | 2 tasks | 4 files |
| Phase 03-regime-classifier P02 | 5min | 2 tasks | 3 files |
| Phase 03-regime-classifier P03 | 15min | 2 tasks | 4 files |
| Phase 04-backtesting-engine P01 | 10 | 2 tasks | 2 files |
| Phase 04-backtesting-engine P02 | 10min | 2 tasks | 4 files |
| Phase 04-backtesting-engine P03 | 3h | 2 tasks | 3 files |
| Phase 04.1-data-integrity P02 | 8 | 2 tasks | 3 files |
| Phase 04.1-data-integrity P03 | 8 | 2 tasks | 2 files |
| Phase 05-allocation-signals P01 | 4min | 2 tasks | 9 files |
| Phase 05-allocation-signals P02 | 3min | 2 tasks | 3 files |
| Phase 05-allocation-signals P03 | 20min | 2 tasks | 4 files |
| Phase 05-allocation-signals P04 | 25min | 2 tasks | 3 files |
| Phase 06-dashboard-integration P01 | 8 | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Architecture: Regime-filtered factor scoring (Citadel/Bridgewater hybrid) — macro regime sets context, factors rank within it
- Data: ALFRED vintage API for FRED (point-in-time, no look-ahead from retroactive revisions)
- Integration: Reuse existing country-health and flows pipelines as factor inputs — do not rebuild
- 01-02: OECD CLI uses FRED mirror (USALOLITONOSTSAM pattern) rather than direct OECD API — same vintage pattern, simpler
- 01-02: AV macro adapter is a separate module from lib/alpha-vantage.ts — preserves existing callers
- [Phase 01-data-foundation]: 01-01: TimescaleDB check throws with fallback guidance rather than silently degrading
- [Phase 01-data-foundation]: 01-01: Universe config is JSON-driven — adding a ticker requires zero code changes
- [Phase 01-data-foundation]: Dry-run mode skips all live API calls — works without real API keys
- [Phase 01-data-foundation]: Ingest logging uses raw SQL to avoid Prisma client regeneration requirement
- [Phase 01-data-foundation]: Query helpers use parameterized prisma.$queryRaw — no string interpolation to prevent SQL injection
- [Phase 01-data-foundation]: verify:data exits non-zero on any failure; report:data always exits 0 — display scripts must not block CI
- [Phase 02-feature-engineering]: FactorFeatureMatrix uses composite PK (featureDate, ticker) for direct upsert by natural key
- [Phase 02-feature-engineering]: sourceDataMaxDates is in-memory only (not a DB column) — structural contract for Plan 05 look-ahead bias test
- [Phase 02-feature-engineering]: world-bank.ts extraction: World Bank fetch logic extracted from route.ts into standalone lib module for reuse by factor adapter
- [Phase 02-feature-engineering]: VXX proxy for pre-VIXY dates: flows-regime uses VXX ticker for dates before 2011-01-03 (VIXY inception), returning partial score rather than null
- [Phase 02-feature-engineering]: rollingZScore excludes current observation from lookback distribution — scored AGAINST the prior distribution, not part of it
- [Phase 02-feature-engineering]: Carry factor returns null for sector ETFs and US — rate differential only meaningful for non-US country ETFs
- [Phase 02-feature-engineering]: getUniverse() used in CLI — universe.ts exports getUniverse, not loadUniverse
- [Phase 02-feature-engineering]: Look-ahead test reads sourceDataMaxDates structurally (in-memory from buildFeatureRow), never re-queries DB — avoids false positives
- [Phase 02-feature-engineering]: Coverage warnings (<50% rows with 3+ z-scores) do not cause non-zero exit — only look-ahead violations fail the pipeline
- [Phase 04-backtesting-engine]: HOLDOUT_START hard-coded to 2022-01-01 — changing it invalidates all prior backtest results
- [Phase 04-backtesting-engine]: TypeScript interfaces mirror Prisma models field-for-field to avoid impedance mismatch
- [Phase 04-backtesting-engine]: ml-matrix solve() is standalone function — import { solve } from ml-matrix, not Matrix method
- [Phase 04-backtesting-engine]: Backtest CLI uses DIRECT_URL for local analytics when DATABASE_URL is Prisma Accelerate
- [Phase 04-backtesting-engine]: Managed Postgres without TimescaleDB is acceptable for dev; checkTimescaleDb warns and falls back
- [Phase 04.1-data-integrity]: FRED vintage 400/5xx throws — no fallback to current observations (look-ahead bias prevention)
- [Phase 04.1-data-integrity]: maxDrawdown returns null for empty/all-zero series — sentinel -1.0 eliminated; DB write uses ?? 0 for non-nullable Float
- [Phase 04.1-data-integrity]: Regime clustering: dates with >50% null z-score dimensions excluded entirely rather than imputed to zero
- [Phase 04.1-data-integrity]: Backtest training: rows with >3 of 6 null feature dimensions excluded — threshold chosen to drop genuinely data-sparse rows while keeping partially observed ones
- [Phase 04.1-data-integrity]: Benchmark pre-validation: SPY price gaps throw before scoring loop starts — avoids silent inflated excess returns
- [Phase 04.1-data-integrity]: report:data-quality exits 0 always — visibility tool, not a gate (consistent with report:data)
- [Phase 05-allocation-signals]: scoreUniverse uses prismaDirectUrl; runDailySignals uses prisma for API route compatibility
- [Phase 05-allocation-signals]: etfTicker = ticker for ETFs — equities will map to sector ETF in Plan 02
- [Phase 05-allocation-signals]: prob6m/prob12m written as null at this stage — populated by Plan 02
- [Phase 05-allocation-signals]: Staleness warning at >5 days: emits warn but does not throw
- [Phase 05-allocation-signals]: FactorFeatureMatrix has no regimeLabel — joined regime_labels on nearest prior date via correlated subquery for historical calibration
- [Phase 05-allocation-signals]: checkProbs upgraded from warn-only to ALLC-03 hard failure with >= 80% coverage enforcement
- [Phase 05-allocation-signals]: RS Proxy uses weighted-ROC formula (labeled universe-relative within proxy list) — not IBD RS Rating; 420-day OHLCV window for ROC(252) computability
- [Phase 05-allocation-signals]: smrProxy null in Plan 03; Plan 04 populates via FMP income statement data; earningsRevisionMomentum null for equities (FactorFeatureMatrix is ETF-only)
- [Phase 05-allocation-signals]: FMP legacy v3/v4 endpoints discontinued post-Aug 2025 — adapted to /stable/grades and /stable/income-statement
- [Phase 05-allocation-signals]: Analyst consensus aggregated from per-analyst grade rows (90-day window) — no pre-aggregated endpoint on current FMP tier
- [Phase 05-allocation-signals]: SMR computation uses 5 quarterly rows (Starter tier limit=5); >= 4 required — condition met; net income/revenue used as ROE proxy
- [Phase 06-dashboard-integration]: MacroEnginePayload exported from route.ts — dashboard page imports type directly from the API module
- [Phase 06-dashboard-integration]: Two-step AllocationSignal query: findFirst for latest runDate, then findMany filtered to that date — prevents accumulation of historical rows

### Pending Todos

None yet.

### Blockers/Concerns

- RS rating and institutional sponsorship count (IBD-style) have no direct public API — proxy computation from price + volume data will be needed; approach TBD in Phase 5 planning

## Session Continuity

Last session: 2026-04-13T13:38:03.921Z
Stopped at: Completed 06-01-PLAN.md (aggregated macro-engine API route + tools page card)
Resume file: None
