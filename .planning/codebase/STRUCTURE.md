# Codebase Structure

**Analysis Date:** 2026-04-08

## Directory Layout

```
SGC Website/
├── app/                        # Next.js App Router root
│   ├── (public)/               # Public marketing site (no auth, with Nav+Footer)
│   │   ├── career-panels/      # Career panels page
│   │   ├── charity/            # Charity initiatives page
│   │   ├── contact/            # Contact form page
│   │   ├── culture/            # Club culture page
│   │   ├── equity-macro-research/  # Macro research listing
│   │   ├── equity-research/
│   │   │   └── [ticker]/       # Individual research report by ticker
│   │   ├── fund/               # Fund overview page
│   │   ├── holdings/           # Public portfolio holdings
│   │   ├── investments/
│   │   │   └── [id]/           # Individual investment thesis
│   │   ├── quant-research/     # Quant research listing
│   │   ├── quant-trading/      # Quant trading overview
│   │   ├── research/
│   │   │   ├── [slug]/         # Article by slug
│   │   │   └── [ticker]/       # Research by ticker (alternate route)
│   │   ├── strategy/
│   │   │   └── [id]/           # Individual strategy document
│   │   ├── team/               # Team roster page
│   │   └── layout.tsx          # Adds <Navigation> + <Footer>
│   ├── dashboard/              # Authenticated member/admin interface
│   │   ├── articles/           # Article CMS
│   │   ├── calendar/           # Event calendar
│   │   ├── contact/            # Contact form inbox
│   │   ├── country-health/     # Country health dashboard tool
│   │   ├── flows/              # Capital flows tool
│   │   ├── holdings/           # Portfolio management
│   │   ├── investments/        # Investment thesis management
│   │   ├── newsletter/         # Newsletter management
│   │   ├── pitches/            # Investment pitch management
│   │   ├── postings/           # Job postings management
│   │   ├── research/           # Research report management
│   │   ├── resume-book/        # Resume book management
│   │   ├── settings/           # Site settings (admin)
│   │   ├── strategy/           # Strategy document management
│   │   ├── team/               # Team member management
│   │   ├── tools/              # Internal tools hub
│   │   │   ├── dcf/            # DCF calculator
│   │   │   ├── interview/      # Interview practice tool
│   │   │   ├── marketing/      # Marketing asset generator
│   │   │   ├── sentiment/      # Sentiment analysis tool
│   │   │   └── supplementary/  # Supplementary data tool
│   │   ├── users/              # User management (admin)
│   │   ├── weekly/             # Weekly content management
│   │   ├── layout.tsx          # Sidebar nav + auth guard (Client Component)
│   │   └── page.tsx            # Dashboard home with live market data
│   ├── api/                    # REST API (Next.js Route Handlers)
│   │   ├── alpha-vantage/      # Alpha Vantage proxy endpoints
│   │   │   ├── balance-sheet/[ticker]/
│   │   │   ├── cash-flow/[ticker]/
│   │   │   ├── earnings/[ticker]/
│   │   │   ├── income-statement/[ticker]/
│   │   │   ├── market-data/spx/
│   │   │   ├── overview/[ticker]/
│   │   │   ├── quote/[ticker]/
│   │   │   ├── search/
│   │   │   └── time-series/[ticker]/
│   │   ├── auth/[...nextauth]/ # NextAuth handler
│   │   ├── articles/           # Article CRUD
│   │   │   └── [id]/
│   │   ├── calendar/           # Calendar event CRUD
│   │   ├── contact/            # Contact form submissions
│   │   │   └── [id]/reply/
│   │   ├── dashboard/          # Dashboard-specific aggregation endpoints
│   │   │   ├── country-health/
│   │   │   ├── finance-term/
│   │   │   ├── flows/
│   │   │   ├── market-movers/
│   │   │   ├── marketing/      # Marketing campaign CRUD + generation
│   │   │   │   ├── campaigns/[id]/
│   │   │   │   ├── generate/
│   │   │   │   ├── generate-bulk/
│   │   │   │   ├── regenerate/
│   │   │   │   └── sources/
│   │   │   ├── quote/
│   │   │   ├── sentiment/
│   │   │   └── supplementary/
│   │   ├── dcf-models/         # DCF model CRUD
│   │   ├── fred/               # FRED economic data proxy
│   │   ├── holdings/           # Portfolio holdings CRUD
│   │   ├── investments/        # Investment thesis CRUD
│   │   ├── pitches/            # Investment pitch CRUD
│   │   ├── research-reports/   # Equity research report CRUD
│   │   ├── strategy/           # Strategy document CRUD
│   │   ├── team-members/       # Team member CRUD
│   │   ├── users/              # User management
│   │   ├── upload/             # File upload endpoint
│   │   └── weekly/             # Weekly content CRUD
│   ├── login/                  # Login page
│   ├── register/               # Registration page
│   ├── verify-email/           # Email verification page
│   ├── research-export/[id]/   # Print-optimized research export view
│   ├── privacy-policy/
│   ├── terms-of-use/
│   ├── globals.css
│   ├── layout.tsx              # Root layout — Providers + metadata
│   ├── page.tsx                # Homepage (redirects or landing)
│   └── providers.tsx           # NextAuth SessionProvider wrapper
├── components/                 # Shared React components
│   ├── ui/                     # Primitive UI components
│   │   └── badge.tsx
│   ├── research/               # Research-specific components
│   │   ├── ResearchExportDocument.tsx
│   │   ├── ResearchMarketSnapshotSection.tsx
│   │   └── ResearchSentimentSection.tsx
│   ├── pitches/
│   │   └── AssociatedUsersPicker.tsx
│   ├── portfolio/              # Portfolio display components
│   ├── InstitutionalValuationSection.tsx
│   ├── ValuationVisuals.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── footer.tsx
│   ├── hero.tsx
│   ├── navigation.tsx          # Public site top nav
│   ├── section.tsx
│   ├── team-member-card.tsx
│   ├── team-page-tabs.tsx
│   └── video-hero.tsx
├── lib/                        # Service utilities and business logic
│   ├── auth.ts                 # NextAuth config + requireAuth/requireAdmin helpers
│   ├── prisma.ts               # Prisma singleton client
│   ├── alpha-vantage.ts        # Alpha Vantage API wrapper
│   ├── marketing.ts            # Marketing caption/source logic
│   ├── marketing-types.ts      # Marketing type definitions
│   ├── marketing-renderer.ts   # Puppeteer-based PNG renderer
│   ├── newsletter-email.ts     # Newsletter email utilities
│   ├── sentiment.ts            # Sentiment analysis utilities
│   ├── social-sentiment.ts     # Social sentiment utilities
│   ├── supplementary.ts        # Supplementary data utilities
│   ├── utils.ts                # General utilities
│   ├── cash.ts                 # Cash/portfolio utilities
│   ├── exchange.ts             # Exchange rate utilities
│   ├── country-health/         # Country health data logic
│   ├── interview-tool/         # Interview tool logic + seed data
│   ├── pdf/                    # PDF generation utilities
│   └── research-export/        # Research export utilities
├── prisma/
│   ├── schema.prisma           # 608-line schema, 30+ models, PostgreSQL
│   └── migrations/             # Migration history
├── types/
│   └── next-auth.d.ts          # NextAuth session type augmentation (adds id, role)
├── public/                     # Static assets served at /
│   ├── images/                 # Team photos, logos, research images
│   ├── team/                   # Team member headshots
│   ├── uploads/research/       # Uploaded research PDFs
│   └── videos/
├── scripts/
│   └── marketing_renderer/     # Python scripts for marketing asset rendering
├── images/                     # Source images (NOT served — use public/ for served assets)
├── DCF/                        # Legacy/standalone DCF app directory
├── dcf_debug/                  # Debug route stubs for DCF API testing
├── supabase/                   # Supabase config (storage integration)
├── next.config.mjs             # Next.js config (permissive remote image patterns)
├── tailwind.config.ts          # Tailwind CSS config
├── tsconfig.json               # TypeScript config with @/ alias → root
├── package.json
└── prisma/
```

## Directory Purposes

**`app/(public)/`:**
- Purpose: All publicly accessible marketing pages for visitors
- Contains: Server Components (async), direct Prisma reads, no auth required
- Key files: Each subdirectory has a `page.tsx`; dynamic routes use bracket folders like `[ticker]`, `[id]`, `[slug]`

**`app/dashboard/`:**
- Purpose: Role-gated internal tools for club members and admins
- Contains: Mostly Client Components with `useSession`; data fetched via `fetch('/api/...')`
- Key files: `layout.tsx` (auth guard + sidebar), `page.tsx` (dashboard home)

**`app/api/`:**
- Purpose: REST API consumed by dashboard; proxy layer for external APIs
- Contains: `route.ts` files with exported `GET`, `POST`, `PUT`, `DELETE` handlers
- Pattern: Every handler includes `export const dynamic = 'force-dynamic'` and `export const runtime = 'nodejs'`

**`lib/`:**
- Purpose: Reusable server-side utilities and external service integrations
- Contains: Auth helpers, Prisma client, API wrappers, business logic
- Rule: All code here is server-only (no `'use client'` directive)

**`components/`:**
- Purpose: Shared React UI components used across pages
- Root-level files: Public site layout components (nav, footer, hero)
- Subdirectories: Domain-grouped complex components

**`prisma/`:**
- Purpose: Database schema and migration history
- Key file: `schema.prisma` — single source of truth for all data models

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root HTML shell, global fonts, `<Providers>` wrapper
- `app/(public)/layout.tsx`: Public nav + footer shell
- `app/dashboard/layout.tsx`: Auth guard + sidebar navigation
- `app/api/auth/[...nextauth]/route.ts`: Authentication handler

**Configuration:**
- `tsconfig.json`: `@/` alias maps to project root
- `tailwind.config.ts`: Tailwind configuration
- `next.config.mjs`: Image remote patterns (currently allows all `https://**`)
- `prisma/schema.prisma`: All database models

**Core Logic:**
- `lib/auth.ts`: All auth utilities — use `requireAuth()` / `requireAdmin()` in API routes
- `lib/prisma.ts`: Import prisma client — `import { prisma } from '@/lib/prisma'`
- `lib/marketing.ts`: Marketing campaign caption building
- `lib/alpha-vantage.ts`: Alpha Vantage API wrapper

**Auth Type Augmentation:**
- `types/next-auth.d.ts`: Extends `Session.user` with `id: string` and `role: string`

## Naming Conventions

**Files:**
- React pages: `page.tsx` (required by Next.js App Router)
- Layouts: `layout.tsx`
- API handlers: `route.ts`
- Components: PascalCase — `ResearchMarketSnapshotSection.tsx`, `TeamMemberCard.tsx`
- Utilities: camelCase — `auth.ts`, `marketing-types.ts`, `alpha-vantage.ts`

**Directories:**
- Next.js route segments: lowercase with hyphens — `equity-research/`, `career-panels/`
- Dynamic segments: bracket notation — `[ticker]`, `[id]`, `[slug]`
- Route groups (no URL segment): parentheses — `(public)/`
- Component subdirs: lowercase — `ui/`, `research/`, `pitches/`

**Database models:** PascalCase in schema (`EquityResearchReport`, `HoldingCommitteeDecision`)
**Prisma fields:** camelCase (`publishedAt`, `emailVerified`, `teamMemberId`)

## Where to Add New Code

**New public marketing page:**
- Page file: `app/(public)/[section-name]/page.tsx`
- Reads data directly via `prisma` in Server Component

**New dashboard management page:**
- Page: `app/dashboard/[feature]/page.tsx` (Client Component with `'use client'`)
- Add nav item in `app/dashboard/layout.tsx` navigation array

**New API endpoint:**
- File: `app/api/[resource]/route.ts`
- Start with: `export const dynamic = 'force-dynamic'; export const runtime = 'nodejs';`
- Auth: Call `requireAuth()` or `requireAdmin()` from `lib/auth.ts` at top of handler

**New shared UI component:**
- Simple/primitive: `components/ui/[component-name].tsx`
- Domain-specific: `components/[domain]/[ComponentName].tsx`

**New database model:**
- Add to `prisma/schema.prisma`, then run `prisma migrate dev`

**New service utility:**
- Server-only logic: `lib/[service-name].ts`
- Types: co-locate or add to `lib/[service-name]-types.ts`

## Special Directories

**`DCF/`:**
- Purpose: Appears to be a legacy or standalone DCF sub-application
- Generated: No
- Committed: Yes

**`dcf_debug/`:**
- Purpose: Debug route stubs mirroring Alpha Vantage API routes for local testing
- Generated: No
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No (in .gitignore)

**`public/uploads/`:**
- Purpose: User-uploaded files (research PDFs, etc.) served statically
- Generated: Partially (user uploads at runtime)
- Committed: No (runtime uploads)

**`scripts/marketing_renderer/`:**
- Purpose: Python-based marketing asset rendering scripts
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-04-08*
