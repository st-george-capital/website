# Architecture

**Analysis Date:** 2026-04-08

## Pattern Overview

**Overall:** Next.js 14 App Router — monolith with co-located API routes, two distinct user-facing surfaces (public marketing site and authenticated dashboard), backed by Prisma ORM over PostgreSQL.

**Key Characteristics:**
- Route-group-based separation: `app/(public)/` for the marketing site, `app/dashboard/` for admin/member tools
- API layer lives entirely in `app/api/` as Next.js Route Handlers (no separate backend process)
- Server Components used for public read-only pages; Client Components used for dashboard interactivity
- Auth is enforced at the API layer via `lib/auth.ts` helpers (`requireAuth`, `requireAdmin`), not via middleware

## Layers

**Public Site Layer:**
- Purpose: Marketing pages for visitors — team, research, fund, holdings, culture, etc.
- Location: `app/(public)/`
- Contains: Next.js Server Components (async page.tsx files), read-only Prisma queries
- Depends on: `lib/prisma.ts`, shared UI components in `components/`
- Used by: Unauthenticated visitors

**Dashboard Layer:**
- Purpose: Authenticated interface for members and admins to manage content and use internal tools
- Location: `app/dashboard/`
- Contains: Client Components with `useSession`, data-fetching via internal REST calls to `app/api/`
- Depends on: NextAuth session, `app/api/` routes
- Used by: Logged-in users with `visitor`, `user`, or `admin` roles

**API Layer:**
- Purpose: REST endpoints consumed by dashboard client components and some server components
- Location: `app/api/`
- Contains: Route Handlers (`route.ts`) using `NextRequest`/`NextResponse`
- Depends on: `lib/prisma.ts`, `lib/auth.ts`, service utilities in `lib/`
- Used by: Dashboard pages (client-side fetch), external webhooks, marketing renderer

**Service/Utility Layer:**
- Purpose: Shared business logic, external API wrappers, and type definitions
- Location: `lib/`
- Contains: `auth.ts` (NextAuth config + helpers), `prisma.ts` (singleton client), `marketing.ts`, `marketing-types.ts`, `alpha-vantage.ts`, `sentiment.ts`, `supplementary.ts`, `utils.ts`, `pdf/`, `research-export/`, `interview-tool/`, `country-health/`
- Depends on: Prisma, external APIs (Alpha Vantage, FRED, OpenAI)
- Used by: API route handlers

**Data Layer:**
- Purpose: Database schema and migrations
- Location: `prisma/`
- Contains: `schema.prisma` (608 lines, 30+ models), `migrations/`
- Depends on: PostgreSQL via `DATABASE_URL`

## Data Flow

**Public Page Request:**
1. Browser requests `/equity-research/AAPL`
2. Next.js App Router renders `app/(public)/equity-research/[ticker]/page.tsx` as a Server Component
3. Page calls Prisma directly: `prisma.equityResearchReport.findFirst()`
4. HTML returned to browser — no client JS required for data

**Dashboard Data Mutation:**
1. User submits form in a Client Component
2. Client fetches `POST /api/articles` with JSON body
3. Route Handler verifies session via `requireAdmin()` from `lib/auth.ts`
4. Handler calls `prisma.article.create()`
5. Returns `NextResponse.json()` — client updates UI

**Marketing Asset Generation:**
1. Admin triggers generation in `app/dashboard/tools/marketing/`
2. Client calls `POST /api/dashboard/marketing/generate`
3. Route Handler calls `buildCaptionPack()` from `lib/marketing.ts` (builds caption data from DB)
4. Calls `renderAndStoreMarketingPack()` from `lib/marketing-renderer.ts` (Puppeteer-based PNG render)
5. Assets stored and campaign saved to DB via Prisma

**State Management:**
- Server state: Prisma / PostgreSQL as source of truth
- Client state: React `useState`/`useEffect` with direct fetch calls — no global state library (no Redux/Zustand)
- Auth state: NextAuth `SessionProvider` via `app/providers.tsx`, accessed via `useSession()` on client

## Key Abstractions

**Auth Helpers:**
- Purpose: Centralize session verification for API routes
- Location: `lib/auth.ts`
- Pattern: `requireAuth()` redirects to `/login`, `requireAdmin()` throws if not admin, `canEdit()` checks admin|editor

**Prisma Singleton:**
- Purpose: Prevent connection exhaustion in dev hot-reload
- Location: `lib/prisma.ts`
- Pattern: `globalThis` singleton; imported as `import { prisma } from '@/lib/prisma'`

**Role System:**
- Purpose: Three-tier access control
- Values: `visitor` (read-only dashboard), `user` (member), `admin` (full access)
- Enforcement: API routes check via `requireAdmin()` or `hasMarketingAccess()`; dashboard nav filters items by `adminOnly` / `userMinRole`

## Entry Points

**Root Layout:**
- Location: `app/layout.tsx`
- Responsibilities: Wraps all pages in `<Providers>` (NextAuth `SessionProvider`), sets global metadata, loads Inter font

**Public Layout:**
- Location: `app/(public)/layout.tsx`
- Triggers: Any route under `app/(public)/`
- Responsibilities: Wraps content with `<Navigation>` and `<Footer>`

**Dashboard Layout:**
- Location: `app/dashboard/layout.tsx`
- Triggers: Any route under `app/dashboard/`
- Responsibilities: Client Component; checks session via `useSession()`, redirects to `/login` if unauthenticated, renders sidebar nav with role-filtered items

**NextAuth Handler:**
- Location: `app/api/auth/[...nextauth]/route.ts`
- Responsibilities: Handles `/api/auth/*` — sign-in, sign-out, session; uses credentials provider with bcrypt + email-verified check

## Error Handling

**Strategy:** Ad-hoc try/catch in Route Handlers; no global error boundary pattern.

**Patterns:**
- API routes: `try/catch` returning `NextResponse.json({ error: '...' }, { status: 500 })`
- Public pages: `notFound()` from Next.js when Prisma returns null
- Auth failures: `redirect('/login')` (server) or client-side router push

## Cross-Cutting Concerns

**Logging:** `console.error()` in API route catch blocks — no structured logging library.
**Validation:** Inline in Route Handlers (manual field checks) — no Zod or Yup schema validation.
**Authentication:** NextAuth v4 with JWT strategy; `NEXTAUTH_SECRET` from env; session includes `id` and `role` on `session.user`.

---

*Architecture analysis: 2026-04-08*
