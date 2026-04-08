# Codebase Concerns

**Analysis Date:** 2026-04-08

## Tech Debt

**Massive Monolithic Page Files:**
- Issue: Core pages are enormous single-file components with no decomposition into reusable sub-components or hooks
- Files: `app/dashboard/tools/dcf/page.tsx` (5,660 lines), `app/dashboard/research/[id]/edit/page.tsx` (1,979 lines), `app/dashboard/research/new/page.tsx` (1,868 lines), `app/dashboard/country-health/page.tsx` (1,529 lines), `app/dashboard/tools/interview/page.tsx` (1,515 lines)
- Impact: Extremely difficult to maintain, debug, test, or refactor. Risk of merge conflicts. Long parse time for IDEs. Cognitive load for any developer touching these files.
- Fix approach: Extract logical sections into named components under `components/` and extract data-fetching/computation logic into custom hooks under `lib/hooks/`

**Near-Identical Research New/Edit Pages:**
- Issue: `app/dashboard/research/new/page.tsx` and `app/dashboard/research/[id]/edit/page.tsx` are functionally nearly identical (same imports, same component structure, ~1,900 lines each) but maintained separately. Any change must be applied twice.
- Files: `app/dashboard/research/new/page.tsx`, `app/dashboard/research/[id]/edit/page.tsx`
- Impact: Bug fixes and feature additions are applied inconsistently, leading to behavioral drift between create and edit flows.
- Fix approach: Extract a shared `ResearchReportForm` component that accepts an optional `reportId` prop; both pages become thin wrappers.

**Pervasive `any` Typing:**
- Issue: Widespread use of TypeScript `any` type especially across DCF, research, and dashboard pages, defeating the purpose of static typing
- Files: `app/dashboard/tools/dcf/page.tsx` (20+ occurrences), `app/dashboard/research/new/page.tsx`, `app/dashboard/research/[id]/edit/page.tsx`
- Impact: Type errors silently propagate at runtime; refactoring is unsafe.
- Fix approach: Define proper interfaces for Alpha Vantage API responses in `types/` and use them throughout.

**Stub Calculations with TODO Comments:**
- Issue: Key DCF metrics are hardcoded to `0` with TODO comments indicating missing API integration
- Files: `app/dashboard/tools/dcf/page.tsx` lines 754–767
  - `const epsCAGR3Y = 0; // TODO: Implement with EARNINGS API`
  - `const shareCountChange3Y = 0; // TODO: Implement with SHARES_OUTSTANDING API`
- Impact: DCF tool silently produces incorrect analysis — these zeros flow into financial calculations without any warning to the user.
- Fix approach: Either integrate the Alpha Vantage EARNINGS and SHARES_OUTSTANDING API calls or display a visible "data unavailable" indicator rather than using 0.

**Suppressed useEffect Dependency Warnings:**
- Issue: `eslint-disable-next-line react-hooks/exhaustive-deps` used to silence stale closure bugs rather than fix them
- Files: `app/dashboard/tools/supplementary/page.tsx` line 202, `app/dashboard/tools/marketing/page.tsx` lines 189, 199
- Impact: React hooks may operate on stale state, causing subtle data inconsistencies that are hard to reproduce.
- Fix approach: Audit each suppressed warning and either restructure the effect or use `useCallback`/`useMemo` to stabilize dependencies.

**Leftover Debug Directory:**
- Issue: `dcf_debug/` directory at project root contains a 3,149-line debug page and duplicated API route stubs (`dcf_debug/page.tsx`, `dcf_debug/search/route.ts`, `dcf_debug/overview/[ticker]/route.ts`, `dcf_debug/test_coke.sh`, etc.)
- Files: `dcf_debug/` (entire directory)
- Impact: Deployed to production alongside real code; pollutes the Next.js route tree; confuses contributors about which code is canonical.
- Fix approach: Delete the entire `dcf_debug/` directory.

**Excessive Root-Level Documentation:**
- Issue: 20+ markdown documentation files committed to the project root (`ADDING_ARTICLES_SIMPLE.md`, `ALL_FIXES_COMPLETE.md`, `CHANGES.md`, `COMPLETE_SETUP.md`, `COMPLETE_SUMMARY.md`, `DASHBOARD_GUIDE.md`, `DEPLOYMENT_GUIDE.md`, `EQUITY_RESEARCH_GUIDE.md`, etc.)
- Files: Project root (20+ `.md` files)
- Impact: Clutters the repository; many appear to be session notes rather than persistent documentation.
- Fix approach: Consolidate into a single `README.md` and a `docs/` folder; delete outdated session notes.

## Security Considerations

**Unauthenticated Alpha Vantage Proxy Routes:**
- Risk: All Alpha Vantage proxy routes (`/api/alpha-vantage/*`) are publicly accessible without any authentication check. They proxy requests using the server's `ALPHA_VANTAGE_API_KEY`, meaning any anonymous user on the internet can exhaust the API quota.
- Files: `app/api/alpha-vantage/time-series/[ticker]/route.ts`, `app/api/alpha-vantage/overview/[ticker]/route.ts`, `app/api/alpha-vantage/quote/[ticker]/route.ts`, `app/api/alpha-vantage/search/route.ts`, `app/api/alpha-vantage/balance-sheet/[ticker]/route.ts`, `app/api/alpha-vantage/cash-flow/[ticker]/route.ts`, `app/api/alpha-vantage/earnings/[ticker]/route.ts`, `app/api/alpha-vantage/income-statement/[ticker]/route.ts` (all ~8 routes)
- Current mitigation: None
- Recommendations: Add `getServerSession` check at the top of each route; return 401 if no session. At minimum, add request-origin checks.

**No Rate Limiting on Registration Endpoint:**
- Risk: `/api/register` has no rate limiting — an attacker can enumerate emails, perform credential stuffing, or flood the database with accounts.
- Files: `app/api/register/route.ts`
- Current mitigation: Uses `crypto.timingSafeEqual` for admin code comparison (good), but no IP-based or email-based throttling.
- Recommendations: Add rate limiting middleware (e.g., `next-rate-limit` or Vercel Edge middleware) before the registration handler.

**Wildcard Image Remote Patterns:**
- Risk: `next.config.mjs` allows images from any HTTPS hostname (`hostname: '**'`). This means Next.js will proxy and optimize images from any external domain, which can be abused for SSRF or to serve harmful content through the app's image optimizer.
- Files: `next.config.mjs` line 7
- Current mitigation: None
- Recommendations: Explicitly allowlist known hostnames: Vercel Blob storage domain, any CDN used, company asset hosts.

**Test Route Exposed in Production:**
- Risk: `/api/test` returns environment details including `process.env.NODE_ENV` with no authentication.
- Files: `app/api/test/route.ts`
- Current mitigation: Returns minimal data currently, but the unauthenticated endpoint is unnecessary surface area.
- Recommendations: Delete the route or gate it behind admin session check.

**API Keys Silently Fall Back to Empty String:**
- Risk: All Alpha Vantage routes use `process.env.ALPHA_VANTAGE_API_KEY || ''`. If the env var is misconfigured, requests are sent to Alpha Vantage with an empty API key, returning error responses that may be mishandled or logged in detail.
- Files: All files under `app/api/alpha-vantage/`
- Current mitigation: Downstream error handling catches most cases
- Recommendations: Add an explicit startup guard that throws if critical API keys are missing, preventing silent failures.

## Performance Bottlenecks

**No Rate-Limit Caching for Alpha Vantage Proxy:**
- Problem: Each call to `/api/alpha-vantage/*` routes makes a fresh upstream request. Alpha Vantage free tier is capped at 25 requests/day; with multiple dashboard widgets all calling these routes, the limit is hit in development quickly.
- Files: `app/api/alpha-vantage/time-series/[ticker]/route.ts`, `app/api/alpha-vantage/quote/[ticker]/route.ts` (and others)
- Cause: No response caching layer; the market-data route at `app/api/market-data/[ticker]/route.ts` has a Prisma-backed cache but the individual alpha-vantage proxy routes do not.
- Improvement path: Add `next: { revalidate: 3600 }` to fetch calls, or route all financial data through the existing Prisma-cached `market-data` endpoint.

**5,660-Line Component Re-renders:**
- Problem: The DCF page is a single component with dozens of `useState` calls. Any state update triggers a diff against the entire ~5,600-line component tree.
- Files: `app/dashboard/tools/dcf/page.tsx`
- Cause: No memoization (`React.memo`, `useMemo`, `useCallback`) on sub-sections; all state lives in one scope.
- Improvement path: Split into separate sub-components; memoize expensive chart sections.

## Fragile Areas

**DCF Page Calculation Dependencies:**
- Files: `app/dashboard/tools/dcf/page.tsx`
- Why fragile: Core valuation formulas are inline inside event handlers and render functions with `any`-typed intermediate values. The stub zero values for `epsCAGR` and `shareCountChange` silently affect output. No unit tests cover any calculation logic.
- Safe modification: Any change to calculation logic must be manually verified against multiple ticker inputs; there is no automated test harness.
- Test coverage: None

**Research New/Edit Drift:**
- Files: `app/dashboard/research/new/page.tsx`, `app/dashboard/research/[id]/edit/page.tsx`
- Why fragile: The two files have diverged in small ways over time (e.g., the edit page has `compsData.map((row: any, ...)` at line 1451 that does not exist in the new page). Future fixes applied to one file will not automatically apply to the other.
- Safe modification: Always diff both files before and after any change; treat them as a pair until consolidated.
- Test coverage: None

## Test Coverage Gaps

**No Test Files Found:**
- What's not tested: The entire codebase has no `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files anywhere outside `node_modules`.
- Files: All source files under `app/` and `components/` and `lib/`
- Risk: Any regression introduced by refactoring or bug fixes is undetectable until manual QA. Financial calculation logic (DCF, portfolio math) is especially risky.
- Priority: High

**No Test Runner Configuration:**
- What's not tested: No `jest.config.*`, `vitest.config.*`, or test setup files exist at the project root.
- Files: N/A (absence of files)
- Risk: There is no infrastructure to add tests even if developers want to.
- Priority: High

## Missing Critical Features

**No Structured Logging or Error Monitoring:**
- Problem: All error capture is done via `console.error` (378 occurrences across source files). There is no integration with Sentry, Datadog, or any structured logging service.
- Blocks: Production debugging; there is no way to know when errors occur in production without manually checking server logs.

**No Input Sanitization on Rich Text/Markdown Fields:**
- Problem: Article and research report bodies accept raw markdown/HTML with no sanitization before storage or rendering.
- Files: `app/dashboard/articles/new/page.tsx`, `app/dashboard/research/new/page.tsx`
- Risk: Stored XSS if user-supplied content is rendered as HTML without escaping. Depends on renderer implementation in `app/dashboard/articles/[id]/preview/page.tsx` (`components/research/ResearchExportDocument.tsx`).

---

*Concerns audit: 2026-04-08*
