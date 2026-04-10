# Phase 5: Allocation Signals - Research

**Researched:** 2026-04-10
**Domain:** Quantitative signal generation, single-stock screening, analyst consensus data, probabilistic forecasting, Vercel cron jobs
**Confidence:** HIGH (core signal pipeline), MEDIUM (analyst consensus API), MEDIUM (probabilistic calibration)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ALLC-01 | Daily scoring cron applies current regime's factor weights to latest features — produces ranked overweight/underweight signals for all countries and sectors | Vercel cron route pattern documented; scoring logic reuses backtest's `scoreWindowRows` pattern; FactorWeightSet + RegimeLabel + FactorFeatureMatrix all queryable |
| ALLC-02 | Each signal includes conviction score, primary factor drivers (factor attribution), current regime context, and recommended entry ETF ticker | Conviction = normalized weighted score; attribution = per-factor contribution (w_i * z_i); regime from RegimeLabel table; ETF ticker from universe.ts |
| ALLC-03 | Probabilistic forecasts: P(outperforms benchmark in next 6/12 months) per country/sector based on current factor + regime state | Historical backtest hit-rate by score quantile + regime provides base rates for logistic calibration; no external library needed |
| ALLC-04 | Single-stock filter screens equities in favored sectors using O'Neil criteria: EPS rank, SMR rating, RS rating, DMA position, institutional sponsorship trend, earnings revision momentum | RS rating: proxy formula (weighted ROC) computable from OHLCV in DB; DMA from OHLCV; earnings revisions already in DB; institutional sponsorship proxied via volume trend; EPS/SMR require FMP fundamental data |
| ALLC-05 | Top analyst buy/sell recommendations for favored equities alongside model signals | FMP v3 `/analyst-stock-recommendations/{symbol}` and Grades Summary API; already have FMP_API_KEY in env |
</phase_requirements>

---

## Summary

Phase 5 wires together everything built in Phases 1-4 to produce the live daily output the dashboard will consume. The core scoring pipeline is essentially the backtest's `scoreWindowRows` function executed on today's features using the latest `FactorWeightSet` — no new algorithm is required, only operational orchestration. The genuinely new problems in this phase are: (1) defining conviction score and factor attribution as derived quantities, (2) computing calibrated outperformance probabilities from historical hit-rate distributions, (3) building the O'Neil single-stock screener as a standalone function against data already in the DB, and (4) calling the FMP analyst recommendations API that is already partially integrated via `fmp.ts`.

The biggest risk is ALLC-04 (single-stock screening). EPS rank, SMR rating, and institutional sponsorship trend have no direct public API endpoint — they must be approximated from fundamental data already available via FMP and AV. RS rating is computable from OHLCV data already in the DB using the published weighted-ROC formula. DMA position (50/100/200-day) is a trivial OHLCV query. The approach is to approximate each O'Neil criterion as honestly as possible with available data and document the proxy method clearly.

The cron infrastructure is straightforward: a Vercel route at `app/api/cron/signals/route.ts` secured by `CRON_SECRET`, configured in `vercel.json`. The cron writes output to a new `AllocationSignal` Prisma table that the dashboard queries. All heavy computation must complete within Vercel's 60s function timeout — the daily scoring loop over ~12 tickers is well within that budget.

**Primary recommendation:** Build the scoring orchestrator first (ALLC-01 + ALLC-02), add probabilistic calibration second (ALLC-03), then single-stock screening (ALLC-04), then analyst overlay (ALLC-05). Each is independently testable.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma (`@prisma/client`) | ^5.22.0 (already installed) | DB access for FactorWeightSet, RegimeLabel, FactorFeatureMatrix, new AllocationSignal table | Already used throughout engine |
| `date-fns` | ^4.1.0 (already installed) | Date arithmetic for DMA window queries | Already used throughout engine |
| `simple-statistics` | ^7.8.9 (already installed) | Mean/stddev for conviction normalization | Already used in backtest metrics |
| `ml-matrix` | ^6.12.1 (already installed) | No new use needed; scoring is a dot product | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Next.js Route Handler | 14.2.18 (installed) | Vercel cron endpoint at `app/api/cron/signals/route.ts` | Cron infrastructure |
| `vercel.json` crons | N/A | Schedule the daily scoring run | Production scheduling |
| FMP REST API | v3 | Analyst recommendations, grades summary | ALLC-05 only |
| Alpha Vantage REST API | v1 | EPS/fundamentals for single-stock screener | ALLC-04 EPS rank proxy |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel cron | GitHub Actions scheduled workflow | GitHub Actions is more flexible (not limited to daily on Hobby) but adds external dependency; Vercel cron is zero-config for this deployment |
| Vercel cron | External cron service (EasyCron, cron-job.org) | Same trade-off — simpler to keep inside Vercel |
| FMP Grades Summary | Alpha Vantage (no analyst rec endpoint) | AV does NOT offer analyst buy/sell/hold endpoints — FMP is the only provider already integrated |

**Installation:** No new packages required. All dependencies already installed.

---

## Architecture Patterns

### Recommended File Structure for Phase 5

```
lib/macro-engine/
├── signals/
│   ├── index.ts          # runDailySignals() — main orchestrator
│   ├── scoring.ts        # scoreUniverse() — apply weights to today's features
│   ├── conviction.ts     # computeConviction(), attributeFactors()
│   ├── probabilities.ts  # computeOutperformanceProbability()
│   ├── single-stock.ts   # screenEquities() — O'Neil criteria
│   └── analyst.ts        # fetchAnalystConsensus() — FMP grades/recs
app/api/cron/signals/
│   └── route.ts          # Vercel cron handler (GET, CRON_SECRET auth)
scripts/macro-engine/
│   └── run-signals.ts    # CLI equivalent of the cron (for local testing)
```

### Pattern 1: Daily Scoring Orchestrator (ALLC-01, ALLC-02)

**What:** Query today's FactorFeatureMatrix rows, look up the latest FactorWeightSet per regime, score each (ticker, today) pair, rank by score, assign overweight/underweight.

**When to use:** The cron fires and triggers `runDailySignals()`.

**Example:**
```typescript
// lib/macro-engine/signals/scoring.ts
import { prismaDirectUrl as prisma } from '../db';
import { getUniverse } from '../universe';
import { BACKTEST_FEATURE_DIMS } from '../backtest/types';

export interface ScoredEntry {
  ticker: string;
  score: number;               // raw dot product w · z
  convictionScore: number;     // normalized 0-1 within today's cross-section
  direction: 'overweight' | 'underweight' | 'neutral';
  factorAttribution: Record<string, number>; // { zGrowth: w_i * z_i, ... }
  regimeLabel: string;
  etfTicker: string;           // from universe config
}

export async function scoreUniverse(asOfDate: Date): Promise<ScoredEntry[]> {
  // 1. Get latest RegimeLabel
  const regime = await prisma.regimeLabel.findFirst({
    where: { date: { lte: asOfDate } },
    orderBy: { date: 'desc' },
  });
  const regimeLabel = regime?.regimeLabel ?? 'global';

  // 2. Get latest FactorWeightSet for this regime (from most recent BacktestRun)
  const latestRun = await prisma.backtestRun.findFirst({
    orderBy: { runAt: 'desc' },
  });
  const weightSet = await prisma.factorWeightSet.findFirst({
    where: {
      runId: latestRun!.id,
      regimeLabel: { in: [regimeLabel, 'global'] },
    },
    orderBy: { isFallback: 'asc' }, // prefer regime-specific over fallback
  });
  const weights = weightSet
    ? [weightSet.wGrowth, weightSet.wInflation, weightSet.wMonetary,
       weightSet.wCredit, weightSet.wCarry, weightSet.wEarnings]
    : new Array(6).fill(0);

  // 3. Get latest feature row per ticker
  const features = await prisma.factorFeatureMatrix.findMany({
    where: {
      featureDate: asOfDate,
      ticker: { in: getUniverse().map(e => e.ticker) },
    },
  });

  // 4. Score and rank
  const scored = features.map(f => {
    const z = [f.zGrowth ?? 0, f.zInflation ?? 0, f.zMonetary ?? 0,
                f.zCredit ?? 0, f.zCarry ?? 0, f.zEarnings ?? 0];
    const score = z.reduce((s, v, i) => s + v * weights[i], 0);
    const attribution: Record<string, number> = {};
    BACKTEST_FEATURE_DIMS.forEach((dim, i) => {
      attribution[dim] = z[i] * weights[i];
    });
    return { ticker: f.ticker, score, attribution };
  });

  // 5. Normalize conviction to [0, 1] within cross-section
  const scores = scored.map(s => s.score);
  const minS = Math.min(...scores), maxS = Math.max(...scores);
  const range = maxS - minS || 1;

  return scored.map(s => ({
    ...s,
    convictionScore: (s.score - minS) / range,
    direction: s.convictionScore > 0.6 ? 'overweight'
              : s.convictionScore < 0.4 ? 'underweight'
              : 'neutral',
    factorAttribution: s.attribution,
    regimeLabel,
    etfTicker: s.ticker, // ETFs ARE the recommended entry
  }));
}
```

### Pattern 2: Probabilistic Forecasts (ALLC-03)

**What:** For each ticker, compute P(outperforms SPY in next 6/12 months) by looking up historical backtest observations grouped by conviction score quantile and current regime, computing empirical hit rates.

**When to use:** After scoring, as a post-processing step that enriches each signal row.

**Approach (HIGH confidence — no new library needed):**
```typescript
// lib/macro-engine/signals/probabilities.ts
// 
// Method: Empirical calibration from historical backtest data.
// 
// For a given (regime, score_quantile), compute:
//   hit_rate_6m = count(actual_6m_return > SPY_6m_return) / total_observations
//   hit_rate_12m = same for 12-month horizon
//
// Steps:
// 1. Query historical (featureDate, ticker, score_at_date, actual_fwd_return, regime)
//    by joining FactorFeatureMatrix + RegimeLabel + OhlcvDaily forward returns
// 2. Score each historical row using final FactorWeightSet
// 3. Assign quantile buckets (e.g. deciles 1-10)
// 4. For current ticker/regime/score_quantile → look up bucket hit rate
// 5. Return as probability estimate
//
// NOTE: 6m and 12m horizons require separate forward return lookups
// at forwardDays=126 and forwardDays=252 respectively (vs 21 used in backtest).
// These are READ-ONLY historical queries — no new training needed.
```

### Pattern 3: RS Rating Proxy (ALLC-04)

**What:** Approximate the O'Neil IBD RS rating using the published weighted-ROC formula, ranking against universe ETFs (not IBD's full stock universe — clearly documented limitation).

**Formula (MEDIUM confidence — multiple public sources confirm):**
```
RSScore = 0.4 * ROC(63d) + 0.2 * ROC(126d) + 0.2 * ROC(189d) + 0.2 * ROC(252d)
RSRating = percentile_rank(RSScore, universe) * 99  // 1-99 scale
```

**Implementation approach:**
```typescript
// lib/macro-engine/signals/single-stock.ts
// All OHLCV data required is already in ohlcv_daily table.
// RS rating computed from adjClose at 63/126/189/252 days ago.
// DMA position: (close / MA_50 - 1), (close / MA_100 - 1), (close / MA_200 - 1)
// Institutional sponsorship proxy: 30-day avg volume delta YoY (rising = improving)
// EPS rank proxy: percentile of 3-year EPS growth rate among universe equities
// SMR proxy: revenue growth rate (from FMP income statement) + margin trend
// Earnings revision momentum: already computed as zEarnings factor in FactorFeatureMatrix
```

### Pattern 4: Analyst Consensus Overlay (ALLC-05)

**What:** For equities in favored sectors, fetch analyst buy/sell/hold recommendation counts + grades from FMP. Surface as separate metadata alongside model signal.

**FMP endpoints (MEDIUM confidence — documented but FMP docs behind 403; confirmed from multiple sources):**
- `GET /analyst-stock-recommendations/{symbol}?apikey=KEY` — returns per-period buy/sell/hold/strongBuy/strongSell counts (legacy v3 endpoint, still active)
- `GET /v4/grades/{symbol}?apikey=KEY` — per-analyst upgrade/downgrade events
- `GET /v4/grades-consensus/{symbol}?apikey=KEY` — summary consensus (strongBuy, buy, hold, sell, strongSell totals)

**NOTE:** The exact field names and tier requirement for FMP analyst endpoints could NOT be directly verified from the docs (403 on all FMP docs pages). Based on cross-referencing multiple secondary sources (GitHub MCP server, community forums), the endpoints exist and are available on the Starter tier (~$14/month) that is already required for FMP earnings revisions. This is MEDIUM confidence — the plan should include a verification step that tests the actual endpoint response before building the full adapter.

### Cron Infrastructure (ALLC-01)

**What:** Vercel production cron that fires the scoring pipeline once daily.

**vercel.json configuration:**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/signals",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**Route handler:**
```typescript
// app/api/cron/signals/route.ts
import { type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  // Call runDailySignals() and write to AllocationSignal table
  // ...
  return Response.json({ ok: true, runAt: new Date().toISOString() });
}
```

**Important constraints:**
- Vercel Hobby tier: cron limited to once-daily (0 6 * * *)
- Vercel function timeout: 60s (Pro: 300s). Daily scoring of 12 ETFs should complete in ~5s.
- Production only: Vercel does NOT invoke crons on preview deployments.
- CRON_SECRET must be added to Vercel env vars — same value in `.env.local` for manual testing.

### Prisma Schema: New Tables Required

```prisma
model AllocationSignal {
  id                String   @id @default(cuid())
  runDate           DateTime // the date this signal was produced
  ticker            String
  score             Float    // raw weighted factor score
  convictionScore   Float    // 0-1 normalized within cross-section
  direction         String   // "overweight" | "underweight" | "neutral"
  regimeLabel       String
  factorAttribution Json     // { zGrowth: float, zInflation: float, ... }
  rank              Int      // 1 = highest conviction overweight
  etfTicker         String   // recommended entry vehicle (= ticker for ETFs)
  prob6m            Float?   // P(outperforms SPY in 6m)
  prob12m           Float?   // P(outperforms SPY in 12m)
  createdAt         DateTime @default(now())

  @@unique([runDate, ticker])
  @@map("allocation_signals")
}

model StockScreenResult {
  id                      String   @id @default(cuid())
  runDate                 DateTime
  ticker                  String   // underlying equity, not ETF
  sectorEtf               String   // parent sector (e.g. XLK)
  rsRating                Float?   // 1-99 proxy
  epsRankProxy             Float?   // 0-99 percentile EPS growth rank
  smrProxy                 String?  // "A"–"E" proxy from revenue+margin
  dma50Position            Float?   // (close/MA50 - 1)
  dma100Position           Float?   // (close/MA100 - 1)
  dma200Position           Float?   // (close/MA200 - 1)
  institutionalSponsorshipTrend Float? // volume delta proxy
  earningsRevisionMomentum Float?  // = zEarnings from FactorFeatureMatrix
  compositeScore           Float    // weighted sum of above
  analystConsensus         Json?    // { strongBuy, buy, hold, sell, strongSell }
  createdAt                DateTime @default(now())

  @@unique([runDate, ticker])
  @@map("stock_screen_results")
}
```

### Anti-Patterns to Avoid

- **Calling live APIs inside the scoring loop:** All macro factors are pre-computed in FactorFeatureMatrix — the scoring cron should only read from the DB, not call FRED/AV/FMP for the main signal. API calls are isolated to single-stock screening (ALLC-04/05) which operates on a short favored-sector list (~10 equities max).
- **Retraining weights in the cron:** The cron uses the latest persisted FactorWeightSet, never re-derives weights. Re-training happens only via `npm run backtest:run`.
- **Using HOLDOUT data during signal computation:** The scoring loop does NOT need holdout-era checks — it is scoring today's features, not historical ones. But any historical hit-rate calibration query must be restricted to OOS period (pre-holdout-start) to avoid contaminating interpretation.
- **Hardcoding "favored sector" threshold:** The threshold for what constitutes a "favored sector" (e.g., convictionScore > 0.6 or top-N by rank) should be a configurable constant, not embedded in conditional logic.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Forward return computation | Custom price-lookup logic | Reuse `computeForwardReturns()` from `lib/macro-engine/backtest/returns.ts` | Already battle-tested, handles holiday gaps, uses adjClose |
| DMA calculation | Custom rolling average | Direct SQL: `AVG(adjClose) OVER (ORDER BY date ROWS BETWEEN 49 PRECEDING AND CURRENT ROW)` | TimescaleDB window functions are exact and fast |
| Analyst data fetch | Custom scraper | FMP `/analyst-stock-recommendations` endpoint via existing `FMP_BASE` pattern in `fmp.ts` | FMP_API_KEY already in env; existing HTTP pattern to reuse |
| Score normalization | Custom normalization | `simple-statistics` min-max or percentile rank — already installed | Consistent with metrics.ts approach |
| Feature computation for today | Re-implement factor logic | Call existing `buildFeatureRow()` + `buildFeatureMatrix()` from `lib/macro-engine/features/index.ts` | All factor compute logic is there; only build incremental |

**Key insight:** Almost all primitives exist. Phase 5 is orchestration, not new algorithm construction.

---

## Common Pitfalls

### Pitfall 1: Using Stale Features for Today's Signal

**What goes wrong:** The cron runs at 6am UTC but today's FactorFeatureMatrix row for today doesn't exist yet — features are only built after the feature-build cron runs. The signal cron ends up silently scoring yesterday's features labeled as today's.

**Why it happens:** The cron fires before `npm run build:features` has populated today's row.

**How to avoid:** Either (a) run the feature build as part of the same cron invocation before scoring, or (b) query the most recent available feature date (`ORDER BY featureDate DESC LIMIT 1`) and record which date was actually used in `AllocationSignal.runDate`. Option (b) is simpler and avoids chaining long-running operations.

**Warning signs:** `AllocationSignal.runDate` consistently lags by 1 business day vs. cron `createdAt`.

### Pitfall 2: Weight Set Lookup Race Condition

**What goes wrong:** The cron picks up a partial or empty `FactorWeightSet` if the backtest hasn't been run yet, defaulting silently to zero weights and producing flat scores.

**Why it happens:** `FactorWeightSet` only exists after `backtest:run` has completed at least once.

**How to avoid:** Throw with a clear error message if no `BacktestRun` is found. This is a pre-flight check at cron start, not a silent fallback.

**Warning signs:** All `convictionScore` values cluster near 0.5 (flat score distribution).

### Pitfall 3: RS Rating Granularity Illusion

**What goes wrong:** RS rating is ranked against only 12 universe ETFs. The resulting 1-99 scale is misleading — an RS of 80 means "better than 80% of 12 ETFs," not the IBD meaning of "better than 80% of all stocks."

**Why it happens:** The DB only has universe ETFs, not the full IBD 7,500+ stock universe.

**How to avoid:** Label this metric explicitly as "RS Proxy (universe-relative)" in all schema comments and API responses. Do NOT present it as the IBD RS rating. If ALLC-04 is applied to individual equities within a sector, rank equities against each other (not against ETFs).

**Warning signs:** Dashboard displays "RS Rating: 95" which implies top-5% of all stocks when it only means top-1 of 12.

### Pitfall 4: FMP Rate Limits in Single-Stock Screener

**What goes wrong:** Screening all equities in multiple favored sectors triggers FMP API rate limits mid-run.

**Why it happens:** FMP Starter tier = 300 requests/minute. With 5-10 equities per sector and 3-4 favored sectors, that's 15-40 requests — well within limit per run. But if the analyst overlay also calls per-equity endpoints, total requests per cron run can spike.

**How to avoid:** Apply the same sequential stagger pattern as `fetchUniverseOhlcv()` (800ms between calls). Cache results in the `StockScreenResult` table — don't re-fetch within the same day.

**Warning signs:** HTTP 429 errors in cron logs.

### Pitfall 5: Vercel Timeout on Feature Build + Scoring in One Function

**What goes wrong:** Combining the incremental feature build AND scoring in a single cron invocation may exceed Vercel's 60s timeout (Hobby) or even 300s (Pro) for large date catch-up windows.

**Why it happens:** `buildFeatureMatrix()` is slow — it calls FRED/AV per date. Running it inside a Vercel function is only safe for 1-2 days incremental.

**How to avoid:** Keep feature build as a separate CLI/cron (`build:features`) and scoring as its own cron. The scoring cron reads from already-populated features — it never calls FRED/AV.

---

## Code Examples

Verified patterns from existing codebase:

### Weight Set Lookup (from backtest/index.ts pattern)
```typescript
// Source: lib/macro-engine/backtest/index.ts
const latestRun = await prisma.backtestRun.findFirst({ orderBy: { runAt: 'desc' } });
const weightSets = await prisma.factorWeightSet.findMany({ where: { runId: latestRun!.id } });
const weightSetMap = new Map(weightSets.map(ws => [ws.regimeLabel, ws.weights]));
// For signals: weights = [ws.wGrowth, ws.wInflation, ws.wMonetary, ws.wCredit, ws.wCarry, ws.wEarnings]
```

### Latest Regime Label Lookup
```typescript
// Source: lib/macro-engine/regime/index.ts pattern + RegimeLabel schema
const regime = await prisma.regimeLabel.findFirst({
  orderBy: { date: 'desc' },
  select: { date: true, regimeLabel: true, confidence: true },
});
```

### DMA Position via Window Function
```sql
-- TimescaleDB/PostgreSQL window function for 50-day MA
SELECT
  ticker,
  date,
  "adjClose",
  AVG("adjClose") OVER (
    PARTITION BY ticker
    ORDER BY date
    ROWS BETWEEN 49 PRECEDING AND CURRENT ROW
  ) AS ma50
FROM ohlcv_daily
WHERE ticker = $1
  AND date >= (CURRENT_DATE - INTERVAL '300 days')
ORDER BY date DESC
LIMIT 1;
```

### RS Proxy Score Computation
```typescript
// Source: Published IBD formula — confirmed via multiple community sources
// (chartink.com, GitHub skyte/relative-strength, OneilGlobalAdvisors PDF)
function computeRSScore(prices: { date: Date; adjClose: number }[], asOf: Date): number | null {
  const getROC = (days: number): number | null => {
    const targetDate = subDays(asOf, days);
    const past = prices.find(p => Math.abs(p.date.getTime() - targetDate.getTime()) < 7 * 86400000);
    const current = prices.find(p => Math.abs(p.date.getTime() - asOf.getTime()) < 3 * 86400000);
    if (!past || !current || past.adjClose === 0) return null;
    return (current.adjClose / past.adjClose) - 1;
  };
  const roc63 = getROC(63), roc126 = getROC(126), roc189 = getROC(189), roc252 = getROC(252);
  if ([roc63, roc126, roc189, roc252].some(r => r === null)) return null;
  return 0.4 * roc63! + 0.2 * roc126! + 0.2 * roc189! + 0.2 * roc252!;
}
```

### Vercel Cron Route Handler (secured)
```typescript
// Source: Vercel official docs + codingcat.dev verified example
// app/api/cron/signals/route.ts
import { type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const { runDailySignals } = await import('../../../../lib/macro-engine/signals');
    const result = await runDailySignals();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error('signals cron failed:', err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static analyst ratings (manual research) | Live FMP API consensus updated daily | Ongoing | Consensus overlay is always fresh |
| IBD proprietary RS rating (~$40/month) | Proxy weighted-ROC formula (free) | IBD remains proprietary | Free approximation; clearly different from official IBD score |
| Hardcoded conviction thresholds | Cross-section percentile ranking, thresholds configurable | Best practice since 2020s | More robust to regime shifts in score distribution |

**Deprecated/outdated:**
- Using `close` instead of `adjClose` for any return/DMA calculation: always use `adjClose` — same pattern as everywhere in this codebase.

---

## Open Questions

1. **FMP Analyst Endpoint Tier Requirement**
   - What we know: FMP offers `/analyst-stock-recommendations/{symbol}` and `/v4/grades-consensus/{symbol}`; FMP docs blocked 403 from research environment
   - What's unclear: Whether the Starter tier ($14/month, already required) covers analyst endpoints or if a higher tier is needed
   - Recommendation: Add a verification step in Wave 1 of the plan — call the endpoint with the real key and check the response before building the full adapter. If tier upgrade is needed, flag for user decision.

2. **Single-Stock Universe for ALLC-04**
   - What we know: The universe.json only contains ETFs. ALLC-04 requires screening individual equities within favored sectors.
   - What's unclear: Which equities to screen (there's no equity list in universe.json) and whether their OHLCV data exists in `ohlcv_daily`.
   - Recommendation: Hard-code a short list of top-5 holdings per sector ETF (same proxy approach as ETF_EARNINGS_PROXY in av-earnings.ts). For XLK: AAPL, MSFT, NVDA, AVGO, META. For XLF: JPM, BAC, WFC, MS, GS. For XLE: XOM, CVX, COP, SLB, PSX. For XLV: LLY, UNH, JNJ, ABBV, MRK. These tickers need OHLCV data ingested — the plan must include an ingest step if data is missing.

3. **6m/12m Forward Return Horizon for ALLC-03**
   - What we know: The backtest engine uses 21-day forward returns. ALLC-03 requires 126-day (6m) and 252-day (12m) horizons.
   - What's unclear: Whether the historical hit-rate distribution is meaningful at these longer horizons given the 3-year holdout window (~252 trading days of holdout = only ~1 year of 252-day pairs).
   - Recommendation: Use the OOS period (pre-holdout, 2007-2021) for calibration — that provides ~15 years × 12 ETFs of 6m pairs. The holdout is NOT used for calibration. Document clearly that probabilities are OOS-calibrated estimates.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | tsx + custom verify scripts (consistent with Phases 1-4) |
| Config file | none (no jest/vitest config exists) |
| Quick run command | `npx tsx scripts/macro-engine/verify-signals.ts` |
| Full suite command | `npm run verify:signals` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ALLC-01 | Daily scoring cron produces AllocationSignal rows for all tickers | integration | `npx tsx scripts/macro-engine/verify-signals.ts --check-rows` | No — Wave 0 |
| ALLC-02 | Each signal row has conviction score, attribution JSON, regime, ETF ticker, rank | unit | `npx tsx scripts/macro-engine/verify-signals.ts --check-fields` | No — Wave 0 |
| ALLC-03 | P(6m) and P(12m) are non-null floats in [0,1] for at least 80% of rows | unit | `npx tsx scripts/macro-engine/verify-signals.ts --check-probs` | No — Wave 0 |
| ALLC-04 | StockScreenResult rows exist for all equities in favored sectors, all O'Neil fields populated or null | integration | `npx tsx scripts/macro-engine/verify-signals.ts --check-stocks` | No — Wave 0 |
| ALLC-05 | analystConsensus JSON is present and has at least one non-zero count for favored equities | integration (requires live FMP key) | `npx tsx scripts/macro-engine/verify-signals.ts --check-analyst` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx tsx scripts/macro-engine/verify-signals.ts` (dry-run mode, no DB required)
- **Per wave merge:** Full suite against real DB
- **Phase gate:** All verify-signals checks green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/macro-engine/verify-signals.ts` — covers ALLC-01 through ALLC-05
- [ ] `scripts/macro-engine/run-signals.ts` — CLI equivalent of the cron for local testing
- [ ] Prisma schema additions: `AllocationSignal` and `StockScreenResult` models + migration
- [ ] Equity OHLCV ingest for single-stock universe (AAPL, MSFT, NVDA, etc.) — if not already in DB

---

## Sources

### Primary (HIGH confidence)
- Existing codebase (`lib/macro-engine/backtest/`, `lib/macro-engine/features/`, `prisma/schema.prisma`) — scoring logic, weight storage, feature matrix patterns
- Vercel official docs (https://vercel.com/docs/cron-jobs) — cron configuration, CRON_SECRET auth, production-only constraint
- codingcat.dev verified Vercel cron example — secured route handler pattern for Next.js 14 app router

### Secondary (MEDIUM confidence)
- O'Neil Global Advisors RS Rating PDF (https://www.oneilglobaladvisors.com/documents/FG/oneil/research/605570_OCM_Relative_Strength_Rating-OGA.pdf) — RS rating definition
- Multiple community implementations confirming RS formula: chartink.com screener, GitHub skyte/relative-strength, TradingView scripts (NNenov, Skyte) — weighted ROC formula
- FMP datasets page (https://site.financialmodelingprep.com/datasets/analyst-estimates-targets) — confirms analyst grades and price target endpoints exist; Grades Summary API described

### Tertiary (LOW confidence — needs validation)
- FMP analyst endpoint tier requirements — FMP docs returned 403 from research environment; endpoint existence confirmed via secondary sources but tier requirement unverified
- IBD SMR rating exact methodology — confirmed four components (sales growth, pretax margin, after-tax margin, ROE) from Quizlet flashcard source + William O'Neil website; exact weighting proprietary

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; no new dependencies
- Architecture: HIGH — scoring pattern directly mirrors existing backtest code
- Analyst API: MEDIUM — FMP endpoints confirmed to exist, but docs blocked; tier requirement unverified
- RS / O'Neil proxies: MEDIUM — formula confirmed from multiple independent community sources; proxy nature well-documented
- Probabilistic forecasts: MEDIUM — approach is empirical from existing backtest data; calibration methodology straightforward

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable domain; FMP API endpoint details could change if tier requirements updated)
