# Phase 2: Feature Engineering - Research

**Researched:** 2026-04-08
**Domain:** Point-in-time macro factor engineering — rolling z-scores, cross-sectional ranking, look-ahead bias testing, feature matrix schema
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FEAT-01 | Point-in-time rolling z-scores for all 6 macro factors using only past data | Rolling window anchored to date T, never global normalization; `simple-statistics` for rolling mean/std |
| FEAT-02 | Cross-sectional factor rankings across all countries and sectors at each historical date | Rank within universe snapshot per date; percentile rank preferred over raw z-score for cross-asset comparisons |
| FEAT-03 | Complete factor feature matrix (6 factors × all assets × daily frequency) stored in DB | New `factor_feature_matrix` hypertable; one row per (date, ticker/country) with 6+ factor columns |
| FEAT-04 | Automated look-ahead test fails pipeline if any feature row uses future data | Structural test: for each row, assert no source data dated after feature_date was used; non-zero exit on violation |
| FEAT-05 | Country-health pillar scores and flows regime signal read from existing pipelines as factor inputs | Country-health: `lib/country-health/scoring.ts` + existing DB; flows regime: recompute from stored OHLCV at date T, not live AV call |

</phase_requirements>

---

## Summary

Phase 2 builds the factor feature matrix on top of Phase 1's raw data tables. The core challenge is not the math — it is the discipline of point-in-time construction: for every historical date T, every statistic must use only data available on or before T. This is enforced structurally rather than by convention, through a strict query interface that takes an `asOfDate` parameter and passes it to all underlying data reads.

The 6 macro factors map to specific FRED series already ingested: growth (INDPRO — Industrial Production), inflation (CPIAUCSL), monetary conditions (FEDFUNDS + T10Y2Y spread), and OECD CLI for country-level leading indicator. Earnings revision momentum is derived from the `earnings_revisions` table. Credit spreads require new FRED series (`BAMLH0A0HYM2` for HY OAS) not yet ingested — this is a Phase 2 Wave 0 gap. Cross-sectional carry (interest rate differentials between countries) is derived from existing FRED series and OHLCV.

The flows regime signal presents a specific challenge: the existing `app/api/dashboard/flows/route.ts` computes the regime live from Alpha Vantage on each request — it is NOT stored in the database. For use as a historical factor input, the regime computation logic must be replicated using stored OHLCV data from `ohlcv_daily`. The country-health pipeline similarly uses live World Bank fetches; pillar scores are also not stored historically. Phase 2 must either (a) store snapshot results from these pipelines going forward or (b) recompute them from stored data for historical dates. Option (b) is preferable since it preserves point-in-time integrity without adding a separate backfill dependency.

**Primary recommendation:** Build the feature matrix builder as a pure function `buildFeatureRow(date, universe)` that reads only from Phase 1 tables via `getFredAsOf`, `getOhlcv`, `getOecdCli`, and `getRevisions` — all of which already enforce date ceilings. Store results in a new `factor_feature_matrix` hypertable. The look-ahead test is a structural assertion, not a sampling check.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `simple-statistics` | latest (2.x) | Rolling mean, std, percentile, correlation for z-score computation | Lightweight, well-tested, no deps; already recommended in STACK.md |
| `ml-matrix` | 6.12.1 | Matrix operations for cross-sectional normalization across asset universe | Already planned in STACK.md; compatible with Next.js 14 module resolution |
| `date-fns` | 4.1.0 (existing) | Date arithmetic: business day counts, rolling window start dates | Already in project |
| Prisma `$queryRaw` | 5.22.0 (existing) | All DB reads and writes — follows Phase 1 established pattern | No new dependency; parameterized queries prevent SQL injection |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 3.23.8 (existing) | Validate feature row shape before DB insert | Always — prevent silent bad data entering feature matrix |

### No New External APIs Needed
All 6 factor inputs derive from data already ingested in Phase 1 EXCEPT credit spreads (HY OAS). One new FRED series must be added to the ingest config.

**Installation:**
```bash
npm install simple-statistics ml-matrix
# (date-fns, zod, prisma already installed)
```

---

## Architecture Patterns

### Recommended Project Structure
```
lib/
└── macro-engine/
    ├── features/
    │   ├── index.ts            # buildFeatureMatrix(startDate, endDate, universe) → FeatureRow[]
    │   ├── z-scores.ts         # rollingZScore(seriesData, windowDays, asOfDate) → number | null
    │   ├── cross-section.ts    # crossSectionalRank(rows: FeatureRow[], date) → RankedRow[]
    │   ├── factors/
    │   │   ├── growth.ts       # Industrial production MoM z-score (INDPRO via getFredAsOf)
    │   │   ├── inflation.ts    # CPI YoY z-score (CPIAUCSL via getFredAsOf)
    │   │   ├── monetary.ts     # Fed funds level + T10Y2Y spread z-score
    │   │   ├── credit.ts       # HY OAS z-score (BAMLH0A0HYM2 via getFredAsOf)
    │   │   ├── carry.ts        # Relative interest rate differential (FRED series per country)
    │   │   ├── earnings.ts     # Earnings revision momentum (getRevisions → estimate trend)
    │   │   ├── country-health.ts  # Read country-health pillar scores (from stored snapshot or recomputed)
    │   │   └── flows-regime.ts    # Recompute flows regime signal from stored OHLCV
    │   └── lookahead-test.ts   # Structural look-ahead bias assertion
    └── types.ts                # FeatureRow, FactorVector, FeatureMatrixRow (extend existing)
scripts/
└── macro-engine/
    ├── run-feature-build.ts    # Builds full historical feature matrix
    └── verify-feature-matrix.ts  # Look-ahead bias test + coverage check (npm run verify:features)
```

### Pattern 1: Point-in-Time Feature Construction (The Core Discipline)

**What:** Every feature row is computed by calling `buildFeatureRow(asOfDate, ticker)`. All data reads pass `asOfDate` as a ceiling — no read ever returns data dated after `asOfDate`. This is structural, not disciplinary: the query helpers from Phase 1 already enforce this via `WHERE date <= ${asOfDate}`.

**When to use:** The only permitted way to construct any feature row.

**Example:**
```typescript
// lib/macro-engine/features/index.ts

import { getFredAsOf, getOhlcv, getOecdCli, getRevisions } from '../query';

export async function buildFeatureRow(
  asOfDate: Date,
  ticker: string,
  countryCode: string | null
): Promise<FeatureRow | null> {
  // All reads use asOfDate as ceiling — no future data can leak in
  const growth    = await computeGrowthFactor(asOfDate);          // INDPRO via getFredAsOf
  const inflation = await computeInflationFactor(asOfDate);       // CPIAUCSL via getFredAsOf
  const monetary  = await computeMonetaryFactor(asOfDate);        // FEDFUNDS + T10Y2Y
  const credit    = await computeCreditFactor(asOfDate);          // BAMLH0A0HYM2 via getFredAsOf
  const carry     = await computeCarryFactor(asOfDate, countryCode); // rate differential
  const earnings  = await computeEarningsFactor(asOfDate, ticker); // revision momentum

  return { asOfDate, ticker, growth, inflation, monetary, credit, carry, earnings };
}
```

### Pattern 2: Rolling Z-Score (Point-in-Time)

**What:** For any time series up to `asOfDate`, compute the z-score of the most recent observation against the rolling window of past N observations. The window NEVER includes the current observation in the mean/std calculation (expanding or fixed rolling window, always backward-looking).

**Critical:** Do NOT compute z-score across the full dataset first and then slice. Correct approach: filter to `date <= asOfDate`, take the trailing N rows, compute mean and std from `[0..N-2]`, score `[N-1]`.

**Window size recommendation:** 252 trading days (1 year) for daily price-derived factors; 60 months (5 years) for monthly FRED series. Handle missing data with a minimum observation threshold (min 20 observations before producing a z-score).

**Example:**
```typescript
// lib/macro-engine/features/z-scores.ts

export function rollingZScore(
  series: { date: Date; value: number }[],
  windowSize: number,
  asOfDate: Date
): number | null {
  // Filter to only data available at or before asOfDate
  const available = series
    .filter(r => r.date <= asOfDate)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (available.length < Math.min(windowSize, 20)) return null;  // insufficient history

  const window = available.slice(-windowSize);
  const lookback = window.slice(0, -1);  // exclude current observation from distribution
  const current = window[window.length - 1].value;

  if (lookback.length < 5) return null;

  const values = lookback.map(r => r.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);

  return std === 0 ? null : (current - mean) / std;
}
```

### Pattern 3: Cross-Sectional Ranking

**What:** For each date, rank all assets in the universe by each factor value. Use percentile rank (0–1) rather than raw z-score rank. This normalizes for different factor scales and produces comparable signals across countries and sectors.

**Algorithm:** For N assets with factor values, rank each asset by its factor value, divide rank by N to get percentile. Ties use average rank (standard competition ranking). Assets with null factor values receive null rank (not ranked, not scored).

**Frequency:** Compute at the same frequency as the factor that updates least often. If the slowest factor is monthly (FRED), compute monthly with interpolation to daily for backtest alignment. For daily factors (price-derived), daily ranking is correct.

**Example:**
```typescript
// lib/macro-engine/features/cross-section.ts

export function crossSectionalPercentileRank(
  values: { ticker: string; value: number | null }[]
): { ticker: string; rank: number | null }[] {
  const valid = values.filter(v => v.value !== null) as { ticker: string; value: number }[];
  const sorted = [...valid].sort((a, b) => a.value - b.value);

  return values.map(v => {
    if (v.value === null) return { ticker: v.ticker, rank: null };
    const rank = sorted.findIndex(s => s.ticker === v.ticker) + 1;
    return { ticker: v.ticker, rank: rank / sorted.length };
  });
}
```

### Pattern 4: Flows Regime Signal from Stored Data

**What:** The existing `app/api/dashboard/flows/route.ts` computes the regime signal live from Alpha Vantage. For historical feature engineering, replicate the core regime scoring logic using stored `ohlcv_daily` data via `getOhlcv()`. The 5-day return signals (VIXY, semis/software spread, cyclicals/defensives spread, HYG credit) map directly to stored price data.

**Key tickers needed from `ohlcv_daily`:** VIXY, SOXX, IGV, XLY, XLP, HYG, SPY.

**Limitation:** Historical VIXY data only goes back to VIXY's inception (2011). For pre-2011 dates, use VXX (launched 2009) as a proxy, or use FRED VIX index (`VIXCLS` series) as a substitute. This must be documented in the feature matrix schema.

**Example:**
```typescript
// lib/macro-engine/features/factors/flows-regime.ts

export async function computeFlowsRegimeScore(asOfDate: Date): Promise<number | null> {
  // Replicate the 5-signal scoring from flows/route.ts but using stored OHLCV
  const tickers = ['VIXY', 'SOXX', 'IGV', 'XLY', 'XLP', 'HYG'];
  const windowStart = subDays(asOfDate, 30);

  const seriesMap: Record<string, OhlcvDailyRow[]> = {};
  for (const t of tickers) {
    seriesMap[t] = await getOhlcv(t, windowStart, asOfDate);
  }

  // 5-day return for each ticker, compute composite score (0–15)
  // Same scoring logic as buildRegime() in flows/route.ts
  // Return normalized 0–1 score (score / 15)
  return normalizedRegimeScore(seriesMap, asOfDate);
}
```

### Pattern 5: Country-Health Factor from Recomputed Scores

**What:** Country-health pillar scores are computed in `lib/country-health/scoring.ts` using World Bank data. The pillar scores are NOT stored historically in the DB. For Phase 2, use the most recently available World Bank data as-of each date (World Bank data is annual — a 2010 observation date uses 2009 or 2010 data depending on availability). Read the `RawVariableRow` data from the World Bank API for each historical year, compute pillar scores using the existing `scoreCountries()` function.

**Alternative (simpler for MVP):** Treat country-health pillar scores as static (use current scores for all historical dates). This introduces a mild look-ahead bias for the country-health component only. Flag this in the feature matrix schema with a `country_health_vintage` column that records which year's data was used.

**Recommendation for Phase 2:** Use the simpler static approach first. Add true historical country-health vintages as a Phase 2 extension or Phase 3 prerequisite if regime validation shows the static approach is distorting 2008/2020 regime labels.

### Anti-Patterns to Avoid

- **Global z-score normalization:** Never compute `(x - fullSeriesMean) / fullSeriesStd` across all time — this uses future data. Always anchor to `asOfDate`.
- **Vectorized batch compute without date ceiling:** Never do `df.groupby('ticker').transform('zscore')` across the full history. Compute row-by-row or use expanding window transforms with explicit date filtering.
- **Re-computing flows regime via live AV calls:** The flows route calls AV at request time. Feature engineering must use stored `ohlcv_daily` data — never call live AV APIs from the historical pipeline.
- **Storing null ranks as 0:** Cross-sectional rank of 0 is a valid rank (0th percentile). Null means "no data, not ranked." Use a separate `rank_valid` boolean column or enforce non-null constraint.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rolling mean / std | Custom accumulator loop | `simple-statistics` `mean()`, `standardDeviation()` | Edge cases: empty arrays, single-element arrays, NaN propagation |
| Date arithmetic (30 trading days ago) | Custom business-day counter | `date-fns` `subDays()` + filter on `ohlcv_daily` presence | Holiday calendars, weekends, exchange closures all handled by querying actual trading data |
| Percentile ranking with ties | Custom sort+rank | Standard competition ranking algorithm (one function) | Tie-breaking is subtle; wrong ties produce biased cross-sectional scores |
| Cross-sectional normalization | Custom z-score across asset universe | `crossSectionZScore()` from existing `lib/country-health/scoring.ts` | Already handles < 5 valid observations, std=0 edge case, [-3, 3] clamping |

**Key insight:** The country-health scoring module already contains a production-quality `crossSectionZScore()` function (line 117 of `lib/country-health/scoring.ts`). Import and reuse it for cross-sectional factor normalization rather than rebuilding.

---

## The 6 Macro Factors: Definitions and Data Sources

This is the most critical section for planning. Each factor maps to specific already-ingested series or requires a new ingest addition.

### Factor 1: Growth
- **Definition:** Industrial production month-over-month change, z-scored against trailing 5-year window
- **Primary series:** `INDPRO` (US Industrial Production Index — already in `FRED_SERIES_IDS`)
- **Country-level:** OECD CLI (`oecd_leading_indicators` table) serves as the growth leading indicator per country
- **Computation:** `(INDPRO_t / INDPRO_{t-1} - 1)`, then rolling z-score over 60 months
- **Frequency:** Monthly (FRED release lag: ~2 weeks after month end)
- **ALFRED vintage:** Already handled by `getFredAsOf`

### Factor 2: Inflation
- **Definition:** CPI year-over-year change, z-scored against trailing 5-year window
- **Primary series:** `CPIAUCSL` (already in `FRED_SERIES_IDS`)
- **Computation:** `(CPIAUCSL_t / CPIAUCSL_{t-12} - 1) * 100`, then rolling z-score over 60 months
- **Frequency:** Monthly
- **Country-level:** For non-US countries, use country-specific CPI series from FRED if available (e.g., `CPALTT01JPM659N` for Japan). For MVP: use global CPI proxy or skip per-country inflation factor, rely on OECD CLI as a composite.

### Factor 3: Monetary Conditions / Yield Curve
- **Definition:** Composite of Fed Funds rate level z-score + T10Y2Y spread z-score
- **Series:** `FEDFUNDS` (already ingested) + `T10Y2Y` (already ingested — 10-2 year treasury spread)
- **Computation:** Average of z-score(FEDFUNDS, 60m window) and z-score(T10Y2Y, 60m window)
- **Frequency:** Daily (FEDFUNDS updates daily; T10Y2Y updates daily)
- **Note:** T10Y2Y is already stored — this is the cleanest daily macro signal available

### Factor 4: Credit Spreads
- **Definition:** ICE BofA US High Yield OAS (option-adjusted spread), z-scored against trailing 5-year window
- **Primary series:** `BAMLH0A0HYM2` — **NOT YET INGESTED** — this is a Wave 0 gap
- **Secondary series (IG):** `BAMLC0A0CM` (Investment Grade OAS) — add alongside HY
- **Computation:** raw OAS level z-score (higher spread = tighter financial conditions = bearish)
- **Frequency:** Daily
- **Action:** Add `BAMLH0A0HYM2` and `BAMLC0A0CM` to `FRED_SERIES_IDS` in `macro-series.ts` and re-run ingest

### Factor 5: Carry (Interest Rate Differential)
- **Definition:** For country ETFs: relative short-rate differential between that country and US, z-scored cross-sectionally
- **Data:** Policy rates per country from FRED:
  - US: `FEDFUNDS` (already ingested)
  - Japan: `IRSTCB01JPM156N` (Bank of Japan rate, via FRED)
  - Germany/Euro: `ECBDFR` (ECB deposit facility rate)
  - UK: `IUDSOIA` or `BOERUKM` (Bank of England rate)
  - For others: use OECD short-term interest rate series via FRED (`{ISO2}IRLT{N/A}`)
- **Computation:** `country_rate - US_rate`, then cross-sectional rank at each date
- **Frequency:** Monthly (policy rates change infrequently; interpolate to daily for matrix alignment)
- **For sector ETFs:** Carry factor is not applicable — use null or assign global carry signal

### Factor 6: Earnings Revision Momentum
- **Definition:** Trend in analyst EPS estimate revisions over trailing 3 months, z-scored cross-sectionally
- **Data:** `earnings_revisions` table (FMP data, already ingested)
- **Computation:** For each ticker, compute `(estimatedEpsAvg_t / estimatedEpsAvg_{t-3months} - 1)`. Positive = upward revisions. Cross-sectional z-score across universe at each date.
- **Frequency:** Monthly (FMP updates roughly monthly)
- **Limitation:** Most universe entries are country ETFs, not equities. FMP earnings estimates exist for sector ETFs (XLK, XLF, etc.) but may be sparse for country ETFs. For country ETFs with no direct earnings data: use the country's OECD CLI momentum as a proxy for this factor, or assign null and exclude from that asset's factor vector.

---

## Schema Additions Required

### New Table: `factor_feature_matrix`

```sql
-- New hypertable for Phase 2 output
CREATE TABLE factor_feature_matrix (
  feature_date     TIMESTAMPTZ NOT NULL,
  ticker           TEXT NOT NULL,
  country_code     TEXT,            -- ISO2, null for sector ETFs
  -- Factor z-scores (point-in-time, rolling window)
  z_growth         FLOAT,           -- INDPRO/OECD CLI z-score
  z_inflation      FLOAT,           -- CPI YoY z-score
  z_monetary       FLOAT,           -- Avg(FEDFUNDS z-score, T10Y2Y z-score)
  z_credit         FLOAT,           -- HY OAS z-score
  z_carry          FLOAT,           -- Rate differential z-score (null for sectors)
  z_earnings       FLOAT,           -- EPS revision momentum z-score
  -- Cross-sectional ranks (0–1 percentile within universe)
  rank_growth      FLOAT,
  rank_inflation   FLOAT,
  rank_monetary    FLOAT,
  rank_credit      FLOAT,
  rank_carry       FLOAT,
  rank_earnings    FLOAT,
  -- Factor inputs from existing pipelines (FEAT-05)
  country_health_score  FLOAT,      -- composite pillar score (0–1), null for sectors
  flows_regime_score    FLOAT,      -- normalized flows regime signal (0–1)
  country_health_vintage TEXT,      -- which World Bank year was used
  -- Metadata
  data_as_of       TIMESTAMPTZ NOT NULL,  -- when the source data was current
  built_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (feature_date, ticker)
);

SELECT create_hypertable('factor_feature_matrix', 'feature_date');
```

**Prisma model:**
```prisma
model FactorFeatureMatrix {
  featureDate          DateTime
  ticker               String
  countryCode          String?
  zGrowth              Float?
  zInflation           Float?
  zMonetary            Float?
  zCredit              Float?
  zCarry               Float?
  zEarnings            Float?
  rankGrowth           Float?
  rankInflation        Float?
  rankMonetary         Float?
  rankCredit           Float?
  rankCarry            Float?
  rankEarnings         Float?
  countryHealthScore   Float?
  flowsRegimeScore     Float?
  countryHealthVintage String?
  dataAsOf             DateTime
  builtAt              DateTime @default(now())

  @@id([featureDate, ticker])
  @@map("factor_feature_matrix")
}
```

---

## Common Pitfalls

### Pitfall 1: Look-Ahead in Rolling Z-Score Computation (Most Critical)

**What goes wrong:** Computing `(x_t - mean(full_series)) / std(full_series)` — the mean and std use future observations. Code looks correct, numbers come out, backtest inflates artificially.

**Why it happens:** Vectorized operations make it easy. `series.map(v => (v - mean) / std)` silently uses future data.

**How to avoid:** The `rollingZScore(series, windowSize, asOfDate)` function must filter to `date <= asOfDate` before computing any statistic. Never pass the full series to a z-score function — always filter first.

**Warning signs:** Adding a 5-trading-day publication lag to FRED data materially degrades backtest performance. If it doesn't degrade, look-ahead bias is likely present.

### Pitfall 2: FRED Release Lag Not Accounted For

**What goes wrong:** FRED publishes monthly data with a 2-6 week lag. Using `CPIAUCSL` for March 2010 as if it were available on March 31, 2010 — in reality it was published around April 14, 2010. This is a subtle look-ahead form.

**Why it happens:** The ALFRED vintage system stores the publication date as `realtimeStart`. If you query `getFredAsOf(seriesId, observationDate, asOfDate)` correctly, the `realtimeStart <= asOfDate` condition naturally handles this. The pitfall is if you query by `observationDate` alone without the `asOfDate` ceiling.

**How to avoid:** Always use `getFredAsOf(seriesId, observationDate, asOfDate)` — never `WHERE observationDate = X` without the realtime brackets. This is already correctly implemented in Phase 1's `getFredAsOf()`.

### Pitfall 3: Flows Regime Computed from Live AV (Not Stored Data)

**What goes wrong:** The feature build script calls the flows API route, which calls Alpha Vantage live. Historical dates return current data (AV compact only has ~100 days). Historical feature matrix gets the current regime for all historical dates.

**How to avoid:** Never call `fetch('/api/dashboard/flows')` from the feature engineering pipeline. Always compute regime signals from stored `ohlcv_daily` using `getOhlcv()`.

### Pitfall 4: Cross-Sectional Rank With Null Pollution

**What goes wrong:** Null factor values are treated as the lowest rank (0) instead of being excluded. This inflates the apparent ranking of assets with missing data relative to their true missing status.

**How to avoid:** Filter nulls out before ranking. Return null rank for assets with null factor values. The feature matrix consumer (regime classifier) must handle null ranks correctly — either impute with median or exclude the asset from that period's cross-section.

### Pitfall 5: VIXY Inception Date (2011) Creates Gaps

**What goes wrong:** VIXY was launched 2011-01-03. For historical feature matrix dates before 2011, the flows regime computation returns null for the VIXY component. Depending on implementation, this might produce null for the entire flows_regime_score rather than a degraded partial score.

**How to avoid:** For pre-2011 dates, fall back to `VIXCLS` FRED series (VIX index — already queryable via ALFRED) as the volatility component. Document the proxy substitution in the `country_health_vintage` equivalent metadata column.

---

## Look-Ahead Bias Test Architecture (FEAT-04)

The automated test must be structural, not sampling-based. It verifies the construction mechanism, not spot-checks outputs.

### Test Design

```typescript
// scripts/macro-engine/verify-feature-matrix.ts

async function testLookAhead() {
  // Pick a test date in the middle of the history
  const testDate = new Date('2015-06-15');
  const futureDate = new Date('2015-07-01');

  // Build a feature row for testDate
  const row = await buildFeatureRow(testDate, 'SPY', 'US');

  // Verify: no source data used dated after testDate
  // Implementation: buildFeatureRow internally collects all source timestamps;
  // return them alongside the feature values for test inspection
  const sourceTimestamps = row.sourceDataMaxDates;  // { growth: Date, inflation: Date, ... }

  for (const [factor, maxDate] of Object.entries(sourceTimestamps)) {
    if (maxDate > testDate) {
      console.error(`LOOK-AHEAD DETECTED: ${factor} used data from ${maxDate} (feature date: ${testDate})`);
      process.exit(1);
    }
  }

  // Additional check: compare feature row computed at testDate vs (testDate + 1 day using same data)
  // If they differ, the feature row was NOT purely based on data available at testDate
  console.log('[PASS] No look-ahead bias detected');
}
```

**Implementation requirement for `buildFeatureRow`:** The function must return a `sourceDataMaxDates` field alongside the feature values, recording the maximum `date` of any source data used for each factor. The look-ahead test asserts all `sourceDataMaxDates` are `<= featureDate`.

**Non-zero exit:** `process.exit(1)` if any look-ahead detected. `process.exit(0)` on clean.

**npm script:** `"verify:features": "npx tsx scripts/macro-engine/verify-feature-matrix.ts"` — runs as CI gate before Phase 3 begins.

---

## Code Examples

### Rolling Z-Score with Source Timestamp Tracking
```typescript
// lib/macro-engine/features/z-scores.ts

export interface ZScoreResult {
  value: number | null;
  sourceDataMaxDate: Date | null;  // for look-ahead test
  observationsUsed: number;
}

export function rollingZScore(
  series: { date: Date; value: number }[],
  windowSize: number,
  asOfDate: Date
): ZScoreResult {
  const available = series
    .filter(r => r.date <= asOfDate)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const sourceDataMaxDate = available.length > 0
    ? available[available.length - 1].date
    : null;

  if (available.length < 20) {
    return { value: null, sourceDataMaxDate, observationsUsed: available.length };
  }

  const window = available.slice(-windowSize);
  const lookback = window.slice(0, -1);
  const current = window[window.length - 1].value;
  const values = lookback.map(r => r.value);

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);

  return {
    value: std === 0 ? null : (current - mean) / std,
    sourceDataMaxDate,
    observationsUsed: window.length,
  };
}
```

### Feature Matrix Build Script Entry Point
```typescript
// scripts/macro-engine/run-feature-build.ts

async function main() {
  const universe = await loadUniverse();
  const startDate = new Date('2005-01-01');
  const endDate = new Date();

  let date = startDate;
  while (date <= endDate) {
    if (isWeekend(date)) { date = addDays(date, 1); continue; }

    for (const entry of universe) {
      const row = await buildFeatureRow(date, entry.ticker, entry.country);
      if (row) await upsertFeatureRow(row);
    }

    date = addDays(date, 1);
  }
  console.log('Feature matrix build complete');
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Compute z-scores on full history, then slice into windows | Point-in-time rolling window, anchored to each date | Eliminates look-ahead bias from normalization |
| Use revised FRED data for backtest | ALFRED vintage API (`output_type=2`) — values as published | Eliminates revision look-ahead (already done in Phase 1) |
| Single static factor weights | Regime-conditioned weights (Phase 4) | Better performance in regime transitions |
| Cross-sectional raw values | Percentile rank normalization | Comparable signals across assets with different scales |

---

## Open Questions

1. **Country-health historical vintages**
   - What we know: `lib/country-health/scoring.ts` computes scores from World Bank data; no historical score table exists
   - What's unclear: World Bank annual data only goes back as far as the series permits; computing scores for every backtest date is expensive
   - Recommendation: Use static current scores for Phase 2 MVP; document the limitation; revisit for Phase 3 if regime validation shows 2008/2020 bias

2. **Per-country carry rates: which FRED series IDs?**
   - What we know: ECB, BoJ, BoE rates exist on FRED; coverage for Brazil (EWZ), Australia (EWA) is less certain
   - What's unclear: Exact FRED series IDs for all 8 universe countries
   - Recommendation: Wave 0 task to enumerate and verify all carry-rate FRED series IDs; use null carry for countries without coverage

3. **BAMLH0A0HYM2 vintage history depth**
   - What we know: FRED hosts this series going back to 1996; ALFRED should provide vintage history
   - What's unclear: Whether ALFRED provides full vintage history or only recent revisions for bond spread series
   - Recommendation: Verify during Wave 0 ingest; if vintage history is shallow, treat the HY OAS as "not revised" and store as single value per date

4. **Matrix computation performance**
   - What we know: 12 tickers × 20 years × 252 days/year ≈ 60,480 feature rows; each row requires multiple DB queries
   - What's unclear: Whether this is fast enough for a one-time historical build (target: < 30 minutes)
   - Recommendation: Batch the FRED series reads per factor rather than per row; load the full series once, then process all dates in memory

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None currently — verify:features follows Phase 1 pattern of custom verification scripts |
| Config file | none — scripts use `npx tsx` directly (same as Phase 1) |
| Quick run command | `npx tsx scripts/macro-engine/verify-feature-matrix.ts --spot-check` |
| Full suite command | `npx tsx scripts/macro-engine/verify-feature-matrix.ts` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FEAT-01 | Rolling z-scores use only past data | structural unit | `npx tsx scripts/macro-engine/verify-feature-matrix.ts` | ❌ Wave 0 |
| FEAT-02 | Cross-sectional rankings present for all assets | integration | `npx tsx scripts/macro-engine/verify-feature-matrix.ts --check-ranks` | ❌ Wave 0 |
| FEAT-03 | Feature matrix rows exist for all tickers in backtest window | integration | `npx tsx scripts/macro-engine/verify-feature-matrix.ts --check-coverage` | ❌ Wave 0 |
| FEAT-04 | Look-ahead test exits non-zero on violation | structural | `npx tsx scripts/macro-engine/verify-feature-matrix.ts --lookahead` | ❌ Wave 0 |
| FEAT-05 | country_health_score and flows_regime_score columns non-null | integration | `npx tsx scripts/macro-engine/verify-feature-matrix.ts --check-pipeline-inputs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx tsx scripts/macro-engine/verify-feature-matrix.ts --spot-check` (spot-checks 3 historical dates, exits quickly)
- **Per wave merge:** `npx tsx scripts/macro-engine/verify-feature-matrix.ts` (full coverage check)
- **Phase gate:** Full suite green before Phase 3 begins

### Wave 0 Gaps
- [ ] `scripts/macro-engine/verify-feature-matrix.ts` — look-ahead test + coverage checks for FEAT-01 through FEAT-05
- [ ] `lib/macro-engine/features/index.ts` — buildFeatureRow and buildFeatureMatrix entry points
- [ ] Add `BAMLH0A0HYM2` and `BAMLC0A0CM` to `FRED_SERIES_IDS` in `lib/macro-engine/ingest/macro-series.ts` and re-run ingest
- [ ] Add carry-rate FRED series IDs for all 8 universe countries (enumerate and verify)
- [ ] Prisma schema addition: `FactorFeatureMatrix` model + hypertable migration

---

## Sources

### Primary (HIGH confidence)
- `lib/macro-engine/query.ts` — Phase 1 query helpers (point-in-time patterns)
- `lib/macro-engine/ingest/macro-series.ts` — established `FRED_SERIES_IDS` list
- `prisma/schema.prisma` (lines 594–664) — Phase 1 DB models
- `lib/country-health/scoring.ts` — `crossSectionZScore()` reusable function
- `app/api/dashboard/flows/route.ts` — regime signal computation logic to replicate
- `config/macro-engine/universe.json` — 12-entry universe (8 country ETFs, 4 sector ETFs)
- `.planning/research/PITFALLS.md` — look-ahead bias patterns (project research)
- `.planning/research/STACK.md` — `simple-statistics`, `ml-matrix` library recommendations

### Secondary (MEDIUM confidence)
- [FRED BAMLH0A0HYM2 series](https://fred.stlouisfed.org/series/BAMLH0A0HYM2) — ICE BofA HY OAS, available via ALFRED
- [FRED BAMLC0A0CM series](https://fred.stlouisfed.org/series/BAMLC0A0CM) — IG OAS
- [FRED ECBDFR](https://fred.stlouisfed.org/series/ECBDFR) — ECB deposit facility rate for EUR carry
- [simple-statistics npm](https://www.npmjs.com/package/simple-statistics) — rolling statistics library

### Tertiary (LOW confidence)
- Carry rate FRED series IDs for Brazil (EWZ), Australia (EWA), Canada (EWC) — requires verification during Wave 0

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are existing project dependencies or already-recommended in STACK.md
- Architecture: HIGH — patterns follow Phase 1 conventions exactly; feature module structure mirrors ingest module structure
- Factor definitions: HIGH for INDPRO/CPI/FEDFUNDS/T10Y2Y (already ingested); MEDIUM for carry rate series IDs per country; LOW for country-health historical vintage approach
- Pitfalls: HIGH — all pitfalls verified against existing PITFALLS.md and Phase 1 code inspection

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable domain; FRED series IDs are permanent)
