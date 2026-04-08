# Testing Patterns

**Analysis Date:** 2026-04-08

## Test Framework

**Runner:** None

No test framework is installed or configured. No `jest.config.*`, `vitest.config.*`, or any testing library appears in `package.json` dependencies or devDependencies.

**Test Files:** None detected in the codebase.

**Run Commands:**
```bash
# No test commands defined in package.json scripts
npm run lint    # Only quality check available
```

## Test File Organization

**Location:** Not applicable — no test files exist.

**Naming:** No convention established.

## Test Structure

No tests are present in this codebase. There is no `__tests__/` directory, no `*.test.*` files, and no `*.spec.*` files.

## Mocking

**Framework:** Not applicable.

## Fixtures and Factories

**Test Data:** Not applicable.

**Seed scripts** exist at `scripts/seed-team.js` and `scripts/init-settings.js` for database initialization, but these are not test fixtures.

## Coverage

**Requirements:** None enforced.

No coverage tooling or thresholds are configured.

## Test Types

**Unit Tests:** Not present.

**Integration Tests:** Not present.

**E2E Tests:** Not present.

## Manual Testing Infrastructure

The project does have:

- **`app/api/test/route.ts`** — A test API endpoint (likely used for ad-hoc manual verification during development)
- **`scripts/`** directory — Node.js scripts for database seeding and admin creation used to set up test environments manually:
  - `scripts/seed-team.js`
  - `scripts/init-settings.js`
  - `scripts/create-admin.js`
  - `scripts/check-prisma-migrations.js`

## Adding Tests (Recommended Approach)

If tests are introduced, the natural fit given the stack would be:

**Framework:** Vitest (compatible with Next.js/ESM, fast)
- Config file: `vitest.config.ts`
- Install: `npm install -D vitest @vitejs/plugin-react`

**Test placement convention to adopt:**
- Unit tests co-located: `lib/utils.test.ts` alongside `lib/utils.ts`
- Component tests: `components/button.test.tsx` alongside component files
- API route tests: `app/api/articles/route.test.ts`

**Highest-value test targets (no tests exist yet):**
- `lib/utils.ts` — Pure utility functions (`formatCurrency`, `slugify`, `toNum`, `calculateReadingTime`) are straightforward to unit test
- `lib/auth.ts` — Auth guards (`requireAuth`, `requireAdmin`, `canEdit`) have clear boolean logic
- `lib/country-health/` — Complex scoring and classification logic with many edge cases
- `app/api/articles/route.ts` — Standard CRUD with auth checks — good integration test candidate

---

*Testing analysis: 2026-04-08*
