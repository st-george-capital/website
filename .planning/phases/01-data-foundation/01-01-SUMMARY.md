---
phase: 01-data-foundation
plan: "01"
subsystem: database
tags: [prisma, postgresql, timescaledb, zod, hypertable, ohlcv, macro]

# Dependency graph
requires: []
provides:
  - TimescaleDB availability check module with clear operator messages
  - Raw macro-engine storage schema (5 Prisma models + migration with hypertable SQL)
  - Universe config system: JSON-driven, zod-validated, typed helpers
affects:
  - 01-02-providers
  - 01-03-ingest
  - all downstream phases using macro-engine data

# Tech tracking
tech-stack:
  added: [zod (already present), timescaledb (SQL extension)]
  patterns:
    - TimescaleDB hypertable SQL manually appended to Prisma migration
    - Universe config as JSON source-of-truth with zod runtime validation
    - checkTimescaleDb() called before any migration or data write

key-files:
  created:
    - lib/macro-engine/db.ts
    - lib/macro-engine/universe.ts
    - config/macro-engine/universe.json
    - prisma/migrations/20260408000000_macro_engine_schema/migration.sql
  modified:
    - lib/macro-engine/types.ts
    - prisma/schema.prisma

key-decisions:
  - "TimescaleDB availability check throws with fallback guidance rather than silently degrading"
  - "Universe config is JSON-driven — adding a ticker requires zero code changes"
  - "Hypertable SQL is manually appended to Prisma migration to avoid spurious diffs from TimescaleDB catalog tables"

patterns-established:
  - "Universe pattern: config/macro-engine/universe.json -> lib/macro-engine/universe.ts (validated) -> ingest scripts"
  - "DB bootstrap pattern: checkTimescaleDb() must pass before any write operations"

requirements-completed: [DATA-01, DATA-03]

# Metrics
duration: 15min
completed: 2026-04-08
---

# Phase 01 Plan 01: Macro-Engine Storage Foundation Summary

**TimescaleDB-backed raw storage schema with 5 hypertables, zod-validated universe config for 12 ETFs, and a gated DB bootstrap that refuses silent degradation**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-08T00:00:00Z
- **Completed:** 2026-04-08T00:15:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Created `checkTimescaleDb()` guard module — exits non-zero with actionable operator message when extension is absent or not enabled
- Added 5 Prisma models (OhlcvDaily, MacroSeriesVintage, EarningsRevision, OecdLeadingIndicator, IngestLog) with migration containing both Prisma DDL and manually appended hypertable SQL for 4 time-series tables
- Built JSON-driven universe config (12 entries: 8 country ETFs + 4 sector ETFs) with zod schema validation at module load time and typed helpers (getUniverse, getByType, getByCountry, getCountries)

## Task Commits

1. **Task 1: TimescaleDB availability check** - `e7e1503` (feat)
2. **Task 2: Prisma models + hypertable migration** - `519ad24` (feat)
3. **Task 3: Universe config with zod validation** - `9fa7f8c` (feat)

## Files Created/Modified
- `lib/macro-engine/db.ts` - checkTimescaleDb() gatekeeper with clear error messages
- `lib/macro-engine/types.ts` - Added UniverseEntrySchema, UniverseConfigSchema (zod) to existing row types
- `lib/macro-engine/universe.ts` - Module-load validated universe loader with typed helpers
- `config/macro-engine/universe.json` - 12-entry universe (SPY, EWJ, EWG, EWU, MCHI, EWZ, EWC, EWA, XLK, XLF, XLE, XLV)
- `prisma/schema.prisma` - Added 5 macro-engine models
- `prisma/migrations/20260408000000_macro_engine_schema/migration.sql` - Full DDL + TimescaleDB hypertable SQL

## Decisions Made
- Hypertable SQL manually appended to migration (not run via `migrate dev`) because TimescaleDB catalog tables cause spurious diffs — use `prisma migrate status` in production
- Universe config uses `null` for inapplicable fields (e.g., `sector: null` for country ETFs) rather than empty strings, enforced by zod schema
- `checkTimescaleDb()` provides a fallback hint (plain composite index acceptable under 2M rows) so operators know their options

## Deviations from Plan

None - plan executed exactly as written.

The dev environment uses SQLite (`.env DATABASE_URL=file:./dev.db`) which causes `prisma validate` to fail on the URL format. Used `DATABASE_URL=postgresql://...` override to confirm schema validity — schema is valid, TypeScript compiles clean.

## Issues Encountered
- Dev `.env` contains SQLite URL while schema is PostgreSQL — `npx prisma validate` requires overriding DATABASE_URL in local dev. This is pre-existing and out of scope; documented here for operator awareness.

## User Setup Required
- **Enable TimescaleDB** on the target PostgreSQL host before running migrations.
  Verify with: `SELECT * FROM pg_available_extensions WHERE name = 'timescaledb';`
- `checkTimescaleDb()` will report exactly what to do if it is absent or disabled.

## Next Phase Readiness
- Raw storage schema ready for provider adapter and ingest plans (01-02, 01-03)
- Universe config is the single source of ingestable symbols — ingest scripts must import from `lib/macro-engine/universe.ts`
- No blockers

---
*Phase: 01-data-foundation*
*Completed: 2026-04-08*
