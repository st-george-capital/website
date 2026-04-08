# Technology Stack

**Analysis Date:** 2026-04-08

## Languages

**Primary:**
- TypeScript 5.7 - All application code (`app/`, `lib/`, `components/`, `types/`)

**Secondary:**
- JavaScript - Utility scripts (`scripts/`)
- CSS - Global styles via `app/globals.css`

## Runtime

**Environment:**
- Node.js v25.x (system runtime; no `.nvmrc` pinning)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 14.2.18 - Full-stack React framework (App Router)
- React 18.3.1 - UI rendering

**Styling:**
- Tailwind CSS 3.4.17 - Utility-first CSS
- `tailwind-merge` 2.5.5 - Class merging utility
- `tailwindcss-animate` 1.0.7 - Animation utilities
- `class-variance-authority` 0.7.1 - Variant-based class composition

**Forms:**
- `react-hook-form` 7.53.2 - Form state management
- `@hookform/resolvers` 3.9.1 - Zod schema integration

**Data Fetching:**
- `swr` 2.2.5 - Client-side data fetching/caching

**Animation:**
- `framer-motion` 11.11.17 - UI animations

**Charts:**
- `recharts` 2.15.4 - Financial charts (portfolio, benchmarks)

**Markdown/Content:**
- `react-markdown` 9.0.1 - Render markdown content
- `gray-matter` 4.0.3 - Frontmatter parsing
- `remark-gfm` 4.0.1 - GitHub-flavored markdown
- `rehype-raw` 7.0.0 - Raw HTML in markdown

**Testing:**
- None detected

**Build/Dev:**
- PostCSS 8.4.49 - CSS processing
- ESLint 8.57.1 with `eslint-config-next` - Linting
- TypeScript compiler - Type checking

## Key Dependencies

**Critical:**
- `@prisma/client` 5.22.0 - Database ORM client
- `prisma` 5.22.0 - Database schema/migration tooling
- `next-auth` 4.24.10 - Session authentication
- `bcryptjs` 2.4.3 - Password hashing

**Infrastructure:**
- `@vercel/blob` 2.0.0 - File/image storage (Vercel Blob)
- `@sparticuz/chromium` 143.0.4 - Serverless Chromium binary for PDF generation
- `puppeteer-core` 24.40.0 - Headless browser for PDF/screenshot rendering
- `resend` 6.7.0 - Transactional email delivery

**Data Processing:**
- `exceljs` 4.4.0 - Excel file generation (portfolio exports)
- `xlsx` 0.18.5 - Excel parsing
- `jszip` 3.10.1 - ZIP archive creation (bulk asset downloads)
- `date-fns` 4.1.0 - Date utilities
- `zod` 3.23.8 - Schema validation

**UI:**
- `lucide-react` 0.462.0 - Icon library
- `react-syntax-highlighter` 15.6.1 - Code block highlighting

## Configuration

**Environment:**
- Configured via `.env` file (`.env.example` available as template)
- Key required vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_CODE`
- Optional external API keys: `POLYGON_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `X_BEARER_TOKEN`, `RESEND_API_KEY`, `FRED_API_KEY`

**Build:**
- `next.config.mjs` - Next.js config (remote image patterns allow all HTTPS hosts)
- `tsconfig.json` - TypeScript with path alias `@/*` → project root
- `postcss.config.mjs` - PostCSS config
- `tailwind.config.ts` - Tailwind config
- `prisma/schema.prisma` - Database schema

**Build Scripts:**
- `npm run build` runs: Prisma migration check → `prisma generate` → safe DB push → `next build`
- `scripts/check-prisma-migrations.js` - Guards against unsafe schema changes

## Platform Requirements

**Development:**
- Node.js (v25.x in use)
- PostgreSQL database (local or remote)
- Chromium or Google Chrome (for local PDF generation)

**Production:**
- Vercel (inferred from `@vercel/blob` dependency and `@sparticuz/chromium` serverless binary)
- PostgreSQL (e.g. Neon, Supabase, or Railway via `DATABASE_URL`)
- Vercel Blob storage for uploaded files

---

*Stack analysis: 2026-04-08*
