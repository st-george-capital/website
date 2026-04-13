# Phase 6: Dashboard & Integration - Research

**Researched:** 2026-04-10
**Domain:** Next.js 14 App Router, React data-fetching, Tailwind UI, Prisma read queries
**Confidence:** HIGH

---

## Summary

Phase 6 is a pure frontend + API-route integration phase. All underlying data is already populated by Phase 5: `AllocationSignal`, `StockScreenResult`, `RegimeLabel`, `BacktestMetric`, and `FactorWeightSet` rows exist in Postgres. The work is: (1) create read-only API routes that query those tables, (2) build the macro-engine dashboard page at `/dashboard/tools/macro-engine`, and (3) register a new card on the tools page at `/dashboard/tools`.

The existing dashboard pattern is well-established. Every tool detail page is a `'use client'` React component that calls `fetch('/api/dashboard/...')` on mount (or on user action). API routes live at `app/api/dashboard/` and export `dynamic = 'force-dynamic'` to prevent static caching. Auth is enforced via `getServerSession(authOptions)` in the API route. The UI is assembled entirely from the project's own `Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription`, `Button`, and `Badge` components — no shadcn installs needed.

Charts (Recharts) are already installed (`recharts@^2.15.4`). Lucide-react icons are already installed. No new npm packages are required for this phase.

**Primary recommendation:** One API route (`/api/dashboard/macro-engine`) returns all four data sections in a single response. The dashboard page renders four panels from that payload. The tools-page card is a static addition to the `tools` array in `app/dashboard/tools/page.tsx`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Dashboard displays current regime badge with factor breakdown, regime start date, historical average duration | `RegimeLabel` table has `regimeLabel`, `labelIndex`, `confidence`, `fitId`; `RegimeTransition` table has `prob63Day`/`prob126Day`/`prob252Day` for duration context; regime start date = first date of current contiguous run of the same `regimeLabel` |
| DASH-02 | Allocation table ranked by signal strength with conviction scores, factor attribution, and ETF entry ticker | `AllocationSignal` table has `rank`, `convictionScore`, `factorAttribution` (Json), `direction`, `etfTicker`, `prob6m`, `prob12m` — query latest `runDate` |
| DASH-03 | Backtest stats panel shows OOS hit rate, Sharpe, max drawdown vs benchmark | `BacktestMetric` table joined to latest `BacktestRun` has `hitRate`, `sharpeAnn`, `maxDrawdown`, `benchmark`, `startDate`, `endDate` |
| DASH-04 | Single-stock panel: top picks per favored sector, O'Neil score components, technical setup, analyst consensus | `StockScreenResult` table has `rsRating`, `epsRankProxy`, `smrProxy`, `dma50/100/200Position`, `institutionalSponsorshipTrend`, `compositeScore`, `analystConsensus` (Json), `sectorEtf` — filter to overweight sectors from AllocationSignal |
| DASH-05 | Macro Allocation Engine card on `/dashboard/tools`, navigates to `/dashboard/tools/macro-engine` | Static addition to `tools` array in `app/dashboard/tools/page.tsx` |
</phase_requirements>

---

## Standard Stack

### Core (all already installed — zero new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 14.2.18 | Page + API route framework | Project standard |
| React | 18.3.1 | UI rendering | Project standard |
| Prisma Client | 5.22.0 | DB queries for Phase 5 tables | Already used everywhere |
| Tailwind CSS | 3.4.17 | Utility styling | Project standard |
| lucide-react | 0.462.0 | Icons (consistent with all other pages) | Project standard |
| recharts | 2.15.4 | Charts — already installed for DCF/supplementary pages | Existing dep |
| next-auth | 4.24.10 | Session auth in API routes | Project standard |

### Component Library (project-local, not shadcn)

All UI is assembled from `/components/`:
- `Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription` — from `@/components/card`
- `Button` — from `@/components/button`
- `Badge` — from `@/components/ui/badge` (cva-based, supports `default`, `secondary`, `destructive`, `outline` variants)

### No New Packages

No npm installs required for this phase. All charting, UI primitives, and data libraries are present.

---

## Architecture Patterns

### Recommended File Structure

```
app/
├── dashboard/
│   └── tools/
│       ├── page.tsx                    # ADD macro-engine card to tools array (DASH-05)
│       └── macro-engine/
│           └── page.tsx                # New dashboard page (DASH-01..04)
app/
└── api/
    └── dashboard/
        └── macro-engine/
            └── route.ts               # Single read-only API route returning all panels
```

### Pattern 1: Single Aggregated API Route

All four panels (regime, allocation, backtest, stocks) are returned from one API call. This matches the project's established pattern — `sentiment/route.ts` returns the full `SentimentResponsePayload` in one shot, `supplementary/route.ts` returns `SupplementaryResponsePayload`.

**Why single route:** The dashboard loads once on mount. Splitting into four separate routes adds four round-trips with no benefit. Each panel's data is cheap to query (small result sets from indexed tables).

```typescript
// app/api/dashboard/macro-engine/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Latest regime
  const latestRegime = await prisma.regimeLabel.findFirst({ orderBy: { date: 'desc' } });

  // 2. Regime start date (first date of current contiguous run)
  // 3. Historical avg duration via RegimeTransition table
  // 4. Latest AllocationSignal run
  const latestSignalDate = await prisma.allocationSignal.findFirst({
    orderBy: { runDate: 'desc' },
    select: { runDate: true },
  });
  const signals = await prisma.allocationSignal.findMany({
    where: { runDate: latestSignalDate?.runDate },
    orderBy: { rank: 'asc' },
  });

  // 5. Latest backtest metrics
  const latestRun = await prisma.backtestRun.findFirst({ orderBy: { runAt: 'desc' } });
  const metrics = await prisma.backtestMetric.findMany({ where: { runId: latestRun?.id } });

  // 6. Latest stock screen results (only overweight sector equities)
  const overweightEtfs = signals
    .filter(s => s.direction === 'overweight')
    .map(s => s.etfTicker);
  const stocks = await prisma.stockScreenResult.findMany({
    where: {
      runDate: latestSignalDate?.runDate,
      sectorEtf: { in: overweightEtfs },
    },
    orderBy: { compositeScore: 'desc' },
  });

  return NextResponse.json({ regime: latestRegime, signals, metrics, latestRun, stocks });
}
```

### Pattern 2: Client Component with Mount Fetch

Every tool detail page in the project is `'use client'` and calls `fetch` on mount. This is the established pattern — do not use Server Components or React Server Actions for this page.

```typescript
// app/dashboard/tools/macro-engine/page.tsx (skeleton)
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Button } from '@/components/button';
import { Badge } from '@/components/ui/badge';

export default function MacroEnginePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<MacroEnginePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/dashboard/macro-engine')
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [status]);
  // ...
}
```

### Pattern 3: Tools Page Card Addition

The `tools` array in `app/dashboard/tools/page.tsx` is a plain TypeScript array of objects. Adding a new tool is a static code change — add one entry with `id`, `name`, `description`, `href`, `icon`, and `features`.

```typescript
// Add to tools array in app/dashboard/tools/page.tsx
{
  id: 'macro-engine',
  name: 'Macro Allocation Engine',
  description: 'Current macro regime, ranked country/sector allocation signals, backtest credibility stats, and single-stock picks',
  href: '/dashboard/tools/macro-engine',
  icon: TrendingUp,  // or Activity, Globe2, BarChart3 — pick from lucide-react
  features: [
    'Current regime badge with factor breakdown',
    'Ranked overweight/underweight allocation signals',
    'OOS backtest hit rate, Sharpe, and max drawdown',
    'Top single-stock picks per favored sector',
    'Analyst consensus overlay',
  ],
},
```

### Pattern 4: Regime Start Date Query

`RegimeLabel` has one row per date. The regime start date for the current regime is the earliest consecutive date with the same `regimeLabel` ending at today. Query pattern:

```typescript
// Find regime start date (contiguous run from latest backwards)
// Approach: fetch recent regime labels ordered by date desc, walk back until label changes
const recentLabels = await prisma.regimeLabel.findMany({
  orderBy: { date: 'desc' },
  take: 500,  // enough to cover longest regime (historical max ~18 months = ~390 days)
});
const currentLabel = recentLabels[0]?.regimeLabel;
let regimeStartDate = recentLabels[0]?.date;
for (const row of recentLabels) {
  if (row.regimeLabel !== currentLabel) break;
  regimeStartDate = row.date;
}
```

### Pattern 5: Factor Attribution Display

`factorAttribution` is stored as `Json` in `AllocationSignal`. The scoring module (`conviction.ts`) produces a `Record<string, number>` with keys from `BACKTEST_FEATURE_DIMS`: `zGrowth`, `zInflation`, `zMonetary`, `zCredit`, `zCarry`, `zEarnings`. Display as a mini bar chart or inline percentages per factor. The 6 keys are fixed and known.

### Pattern 6: Visitor Role Guard

Every tool detail page guards against `session.user.role === 'visitor'` and renders a "Visitor accounts cannot access..." message instead. See the sentiment tool's visitor guard pattern — replicate exactly.

### Pattern 7: Back-to-Tools Navigation

Every tool detail page has an `<ArrowLeft>` back link to `/dashboard/tools` at the top. Matches across sentiment, supplementary, and interview pages:

```typescript
<Link href="/dashboard/tools" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
  <ArrowLeft className="h-4 w-4" />
  Back to tools
</Link>
```

### Anti-Patterns to Avoid

- **Server Components for this page:** The pattern in this codebase is `'use client'` + mount fetch. Do not use async Server Components or `generateStaticParams` — all tool pages are client-rendered.
- **Separate API routes per panel:** Adds round-trip overhead with no benefit. One aggregated route matches project conventions.
- **Using `prismaDirectUrl` in API routes:** `prismaDirectUrl` is for server-side scripts (CLI/scripts dir) that need to bypass Prisma Accelerate. API routes use `prisma` from `@/lib/prisma`. See `lib/macro-engine/db.ts` comment: "Only available in server-side scripts (Node.js) — not for API routes."
- **Installing new chart libraries:** Recharts is already installed. Do not add `nivo`, `visx`, or `chart.js`.
- **Modifying `lib/macro-engine/signals/index.ts`:** Phase 6 is read-only consumption. Never call `runDailySignals()` from a dashboard API route.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Conviction bar / percentage display | Custom progress bar component | Tailwind `w-[{pct}%]` inline style or a simple `<div>` | Sufficient for numeric conviction [0,1] |
| Direction color logic | Custom color resolver | Inline ternary: `direction === 'overweight' ? 'text-emerald-700' : 'text-red-700'` | Already pattern in sentiment tool |
| Factor attribution chart | Custom SVG chart | Recharts `BarChart` with `ResponsiveContainer` | Already installed |
| Auth check in API route | Custom middleware | `getServerSession(authOptions)` at top of route handler | Already used in every existing API route |
| Number formatting | Custom formatters | `lib/utils.ts` exports `formatPercent`, `formatNumber`, `formatCurrency` | Already exist |

---

## Common Pitfalls

### Pitfall 1: Using `prismaDirectUrl` in API routes
**What goes wrong:** Import of `prismaDirectUrl` from `lib/macro-engine/db.ts` in an API route throws or silently ignores `DIRECT_URL` in Vercel production (Accelerate bypass is CLI-only).
**Why it happens:** Phase 5 scoring code uses `prismaDirectUrl` for bulk reads — easy to copy-paste into route handlers.
**How to avoid:** API routes import `prisma` from `@/lib/prisma` only. Confirmed correct in the existing `cron/signals/route.ts` which uses the standard `prisma` (not `prismaDirectUrl`) for upserts.
**Warning signs:** Import path `../../../lib/macro-engine/db` in a route file.

### Pitfall 2: Querying all historical AllocationSignal rows
**What goes wrong:** `prisma.allocationSignal.findMany()` without a `where: { runDate: latestDate }` filter returns all historical runs — potentially tens of thousands of rows.
**Why it happens:** Forgetting the `runDate` filter because the table has no "isLatest" flag.
**How to avoid:** Always two-step: first `findFirst({ orderBy: { runDate: 'desc' }, select: { runDate: true } })`, then `findMany({ where: { runDate } })`.

### Pitfall 3: factorAttribution JSON parse
**What goes wrong:** Prisma returns `factorAttribution` as a JavaScript object (Prisma auto-parses JSON columns), but TypeScript infers it as `Prisma.JsonValue`. Must cast or validate before accessing keys.
**How to avoid:** Cast as `Record<string, number>` after receiving from API. In the API route, pass it through — don't stringify and re-parse.

### Pitfall 4: Recharts on server-side render
**What goes wrong:** Recharts components throw `window is not defined` if rendered in a Server Component or during SSR.
**How to avoid:** The page is `'use client'` — Recharts renders only client-side. This is already the pattern for the DCF and supplementary pages.

### Pitfall 5: Missing "no data yet" state
**What goes wrong:** If no signals run has happened (fresh deploy), `latestSignalDate` is null and the page throws or renders broken.
**How to avoid:** API route returns `{ regime: null, signals: [], metrics: [], stocks: [] }` when tables are empty. Page renders an empty state card with "No signals available yet. Run `npm run signals:run` to populate data."

### Pitfall 6: Forgetting the "Coming Soon" placeholder replacement
**What goes wrong:** The tools page already has a "Coming Soon" dashed placeholder card. It may look odd to have two placeholders if a second tool is being planned.
**How to avoid:** When adding the macro-engine card, leave the "Coming Soon" card in place — it is not the slot for this tool. The macro-engine card goes into the `tools` array, which renders before the placeholder.

---

## Code Examples

### Regime Badge with Description

```typescript
// Source: pattern from sentiment tool ArticleTonePill + Badge component
function RegimeBadge({ label }: { label: string }) {
  const colorMap: Record<string, string> = {
    'risk-off': 'bg-red-100 text-red-800 border border-red-200',
    'growth': 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    'inflation': 'bg-amber-100 text-amber-800 border border-amber-200',
    'global': 'bg-slate-100 text-slate-700 border border-slate-200',
  };
  const classes = colorMap[label] ?? 'bg-slate-100 text-slate-700 border border-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${classes}`}>
      {label}
    </span>
  );
}
```

### StatCard mini-panel (matches supplementary tool pattern)

```typescript
// Source: supplementary/page.tsx StatCard pattern
function StatCard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-slate-950">{value}</div>
      {subtext && <div className="mt-1 text-xs text-slate-500">{subtext}</div>}
    </div>
  );
}
```

### Direction pill for allocation table

```typescript
// Source: pattern from sentiment tool tone pills
function DirectionPill({ direction }: { direction: 'overweight' | 'underweight' | 'neutral' }) {
  const map = {
    overweight: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    underweight: 'bg-red-100 text-red-800 border border-red-200',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${map[direction]}`}>
      {direction}
    </span>
  );
}
```

### Allocation table row

```typescript
// Source: project table pattern from research/postings pages
<tr key={signal.ticker} className="border-b border-slate-100 hover:bg-slate-50">
  <td className="py-3 pr-4 font-semibold text-slate-900">{signal.rank}</td>
  <td className="py-3 pr-4 font-mono text-sm text-slate-900">{signal.ticker}</td>
  <td className="py-3 pr-4"><DirectionPill direction={signal.direction} /></td>
  <td className="py-3 pr-4 text-sm text-slate-700">{(signal.convictionScore * 100).toFixed(0)}%</td>
  <td className="py-3 pr-4 font-mono text-sm text-slate-500">{signal.etfTicker}</td>
  <td className="py-3 pr-4 text-sm text-slate-700">{signal.prob6m != null ? `${(signal.prob6m * 100).toFixed(0)}%` : '—'}</td>
</tr>
```

---

## Data Available from Phase 5

### RegimeLabel (DASH-01)
- `date: DateTime` — primary key
- `regimeLabel: String` — e.g. "risk-off", "growth"
- `labelIndex: Int` — cluster integer 0..k-1
- `confidence: Float?`
- `fitId: String`

**For "regime start date":** Walk back through `RegimeLabel` rows ordered by `date desc` until `regimeLabel` changes. The last matching row is the start date.

**For "historical average duration":** Use `RegimeTransition` table — `prob63Day`/`prob126Day`/`prob252Day` from current regime's transitions give expected persistence context. Alternatively, compute average run length directly from `RegimeLabel` history grouped by contiguous runs (more accurate, slightly more complex SQL).

### AllocationSignal (DASH-02)
- `runDate: DateTime` — query latest run
- `ticker: String`
- `rank: Int` — 1 = highest conviction
- `direction: String` — "overweight" | "underweight" | "neutral"
- `convictionScore: Float` — normalized [0,1]
- `factorAttribution: Json` — `{ zGrowth: n, zInflation: n, zMonetary: n, zCredit: n, zCarry: n, zEarnings: n }`
- `etfTicker: String`
- `prob6m: Float?` — P(outperforms 6m)
- `prob12m: Float?`
- `regimeLabel: String`

### BacktestMetric (DASH-03)
- `runId: String` — FK to BacktestRun
- `window: String` — walk-forward window identifier
- `benchmark: String` — "SPY" or "ACWI"
- `hitRate: Float` — OOS directional hit rate
- `sharpeAnn: Float` — annualized Sharpe
- `maxDrawdown: Float` — OOS max drawdown
- `startDate: String`, `endDate: String`

**Display:** Aggregate across windows for overall OOS stats (mean hit rate, mean Sharpe, worst drawdown). Show both SPY and ACWI rows if available.

### StockScreenResult (DASH-04)
- `runDate: DateTime`
- `ticker: String`
- `sectorEtf: String` — which sector this equity belongs to
- `rsRating: Float?` — RS proxy score
- `epsRankProxy: Float?`
- `smrProxy: String?` — letter grade A–E
- `dma50Position: Float?`, `dma100Position: Float?`, `dma200Position: Float?`
- `institutionalSponsorshipTrend: Float?`
- `compositeScore: Float` — O'Neil composite
- `analystConsensus: Json?` — `{ strongBuy, buy, hold, sell, strongSell, source }`

**Filter logic:** Show only stocks where `sectorEtf` is in the overweight set from `AllocationSignal`. Sort by `compositeScore desc`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — project has no test config file (jest.config, vitest.config, pytest.ini absent) |
| Config file | None — see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | `/api/dashboard/macro-engine` returns `regime` object with `regimeLabel`, `startDate` | manual-only | `curl /api/dashboard/macro-engine` | N/A — no test infra |
| DASH-02 | Allocation signals returned sorted by rank, all fields present | manual-only | Visual inspection of table render | N/A |
| DASH-03 | Backtest metrics panel shows OOS stats from latest BacktestRun | manual-only | Visual inspection | N/A |
| DASH-04 | Stock panel filters to overweight sector equities only | manual-only | Visual inspection + DB query | N/A |
| DASH-05 | Tools page card navigates to `/dashboard/tools/macro-engine` | manual-only | Browser click | N/A |

**Note:** This project has no test framework installed. All validation is by manual browser inspection and `curl` against running server.

### Wave 0 Gaps
- No test infrastructure exists. No automated tests are expected for this phase — consistent with all prior phases.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma v3/v4 legacy endpoints | Prisma 5 stable API | Phase 5 decision | No impact on dashboard reads |
| FMP legacy API endpoints | FMP `/stable/` endpoints | Phase 5 decision | No dashboard-facing impact |
| `prismaDirectUrl` for bulk reads | `prisma` (lib/prisma) for API routes | Phase 5 decision | Dashboard API routes use standard `prisma` |

**Deprecated/outdated:**
- FMP `/v3/analyst-stock-recommendations` and `/v4/grades-consensus`: both discontinued post-Aug 2025. Not used in dashboard reads — data is already in DB.

---

## Open Questions

1. **Recharts vs. plain table for factor attribution**
   - What we know: Recharts is installed; `BarChart` works well for 6-factor breakdown; supplementary page uses Recharts `LineChart`
   - What's unclear: Planner preference for inline mini-bar vs. full `BarChart` panel
   - Recommendation: Use a mini horizontal bar within the allocation table row for factor attribution (avoid full-page charts for dense tabular data); use `BarChart` for backtest metrics panel only

2. **Regime start date computation: application vs. SQL**
   - What we know: `RegimeLabel` has one row per date; contiguous-run logic is straightforward in application code; can also be done with a Postgres window function
   - What's unclear: Whether the regime history is dense (every calendar day) or sparse (only trading days)
   - Recommendation: Application-side walk-back in the API route (take 500 rows, loop) — simpler, no raw SQL needed, result fits in memory

3. **BacktestMetric aggregation strategy**
   - What we know: Multiple rows per `BacktestRun` (one per `window × benchmark`); latest `BacktestRun` likely has 15–30 window rows
   - What's unclear: Whether to show per-window stats (verbose) or aggregate summary
   - Recommendation: Show aggregate summary only (mean hit rate, mean Sharpe, worst drawdown across windows for each benchmark) — matches the DASH-03 requirement's "visible model credibility" framing

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `app/dashboard/tools/page.tsx` — exact tools card pattern
- Direct codebase read: `app/dashboard/tools/sentiment/page.tsx` — tool detail page pattern
- Direct codebase read: `app/dashboard/tools/supplementary/page.tsx` — StatCard, tab, fetch-on-mount patterns
- Direct codebase read: `prisma/schema.prisma` lines 673–838 — exact model fields
- Direct codebase read: `lib/macro-engine/signals/index.ts`, `scoring.ts`, `conviction.ts` — data shape output
- Direct codebase read: `app/api/dashboard/sentiment/route.ts`, `flows/route.ts` — API route patterns
- Direct codebase read: `components/card.tsx`, `components/button.tsx`, `components/ui/badge.tsx` — component APIs
- Direct codebase read: `app/dashboard/layout.tsx` — sidebar nav, auth pattern
- Direct codebase read: `lib/macro-engine/db.ts` — `prismaDirectUrl` is CLI-only, not for API routes
- Direct codebase read: `package.json` — recharts 2.15.4, lucide-react 0.462.0 confirmed installed

### Secondary (MEDIUM confidence)
- Phase 5 VERIFICATION.md — confirmed all five AllocationSignal/StockScreenResult fields populated
- STATE.md decisions log — confirmed `prismaDirectUrl` decision scope

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified as installed from package.json
- Architecture: HIGH — all patterns verified from direct codebase inspection of 3+ existing tool pages
- Data shapes: HIGH — verified from schema.prisma and Phase 5 VERIFICATION.md
- Pitfalls: HIGH — prismaDirectUrl scope verified from lib/macro-engine/db.ts source comment

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable project; no fast-moving dependencies)
