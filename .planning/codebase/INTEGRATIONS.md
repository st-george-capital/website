# External Integrations

**Analysis Date:** 2026-04-08

## APIs & External Services

**Market Data:**
- Polygon.io - Previous-day OHLCV quotes for US equities
  - SDK/Client: Direct `fetch` to `https://api.polygon.io/v2/aggs/ticker/{ticker}/prev`
  - Auth: `POLYGON_API_KEY` env var
  - Usage: `app/api/market-data/[ticker]/route.ts`

- Alpha Vantage - Real-time global equity quotes (fallback/secondary)
  - SDK/Client: Direct `fetch` to `https://www.alphavantage.co/query`
  - Auth: `ALPHA_VANTAGE_API_KEY` env var
  - Usage: `lib/alpha-vantage.ts`, `app/api/alpha-vantage/`

- FRED (St. Louis Fed) - 10-Year Treasury yield (DGS10 series)
  - SDK/Client: Direct `fetch` to `https://api.stlouisfed.org/fred/series/observations`
  - Auth: `FRED_API_KEY` env var (optional; has hardcoded fallback of 4.2%)
  - Usage: `app/api/fred/10y-treasury/route.ts`

**Social Sentiment:**
- Reddit - Search API for stock sentiment analysis
  - SDK/Client: Direct `fetch` to `https://www.reddit.com/search.json`
  - Auth: None (public endpoint)
  - Usage: `lib/social-sentiment.ts`

- X (Twitter) - Recent tweet search for sentiment
  - SDK/Client: Direct `fetch` to `https://api.x.com/2/tweets/search/recent`
  - Auth: `X_BEARER_TOKEN` env var (Bearer token)
  - Usage: `lib/social-sentiment.ts`

**Email:**
- Resend - Transactional email delivery
  - SDK/Client: `resend` npm package
  - Auth: `RESEND_API_KEY` env var
  - Usage: `app/api/register/route.ts` (email verification), `app/api/send-email/route.ts` (contact form), `app/api/newsletter/editions/[id]/send/route.ts` (newsletter sends)

**PDF Generation:**
- Puppeteer + Sparticuz Chromium - Serverless headless browser for PDF export
  - SDK/Client: `puppeteer-core` + `@sparticuz/chromium`
  - Auth: None
  - Remote pack URL: `https://github.com/Sparticuz/chromium/releases/download/v143.0.0/chromium-v143.0.0-pack.{arch}.tar`
  - Local dev: Uses system Chrome at `/Applications/Google Chrome.app/...` or `CHROME_EXECUTABLE_PATH` env var
  - Usage: `lib/pdf/browser.ts`, `lib/marketing-renderer.ts`, `app/api/research-reports/[id]/pdf/route.ts`

## Data Storage

**Databases:**
- PostgreSQL - Primary application database
  - Connection: `DATABASE_URL` env var
  - ORM: Prisma 5.22.0 (`lib/prisma.ts`)
  - Schema: `prisma/schema.prisma` (27+ models: User, Article, TeamMember, Holding, Transaction, PortfolioSnapshot, EquityResearchReport, MarketingCampaign, etc.)

**File Storage:**
- Vercel Blob - All file uploads (images, PDFs, resumes, documents)
  - SDK/Client: `@vercel/blob` npm package (`put()` function)
  - Auth: `BLOB_READ_WRITE_TOKEN` env var
  - Usage: `app/api/upload/route.ts`, `app/api/upload-image/route.ts`, `lib/marketing-renderer.ts`

**Caching:**
- Prisma-level query caching via `MarketData` model (15-minute TTL for market quotes)
- Next.js route-level `revalidate` controls for some API routes

## Authentication & Identity

**Auth Provider:**
- NextAuth.js 4.24.10 - Session management
  - Implementation: Credentials provider with email/password
  - Password hashing: `bcryptjs`
  - Session strategy: JWT (role and ID embedded in token)
  - Config: `lib/auth.ts`
  - Email verification: Custom token flow via `emailToken` / `emailTokenExpiry` on User model, sent via Resend
  - Roles: `visitor`, `user`, `admin` (stored on User model, enforced in API routes and middleware)

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- `console.error` / `console.log` throughout API routes (no structured logging framework)

## CI/CD & Deployment

**Hosting:**
- Vercel (inferred from `@vercel/blob`, `@sparticuz/chromium` serverless binary, and `next build` pipeline)

**CI Pipeline:**
- None detected (no GitHub Actions or similar config found)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Application base URL
- `NEXTAUTH_SECRET` - JWT signing secret
- `ADMIN_CODE` - Admin registration code gate

**Optional env vars (enable external integrations):**
- `POLYGON_API_KEY` - Polygon.io market data
- `ALPHA_VANTAGE_API_KEY` - Alpha Vantage market data
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob file storage
- `X_BEARER_TOKEN` - X/Twitter sentiment API
- `RESEND_API_KEY` - Resend email delivery
- `FRED_API_KEY` - FRED treasury yield data
- `CHROME_EXECUTABLE_PATH` - Override Chrome path for PDF generation

**Secrets location:**
- `.env` file (gitignored); `.env.example` committed as reference

## Webhooks & Callbacks

**Incoming:**
- None detected (no `/api/webhooks/` routes)

**Outgoing:**
- None detected

---

*Integration audit: 2026-04-08*
