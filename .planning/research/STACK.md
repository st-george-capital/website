# Stack Research

**Domain:** Macro Allocation Engine — quantitative finance, regime detection, factor modeling, backtesting
**Researched:** 2026-04-08
**Confidence:** HIGH (data storage, data APIs); MEDIUM (statistical modeling approach, backtesting library selection)

---

## Scope

This document covers only NEW stack additions. The existing stack (Next.js 14, Prisma 5, PostgreSQL, TypeScript 5.7, Alpha Vantage, FRED) is validated and unchanged.

---

## Recommended Stack

### 1. Time-Series Storage: TimescaleDB (PostgreSQL Extension)

**Verdict: Use it. Do not store 20 years of daily OHLCV in vanilla PostgreSQL.**

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TimescaleDB | 2.x (extension) | Hypertable storage, compression, chunk partitioning for daily OHLCV + macro series | Automatic time-based partitioning, 90%+ columnar compression on historical data, full SQL compatibility — Prisma and existing PostgreSQL patterns work unchanged |

**Why TimescaleDB over plain PostgreSQL:**
Plain PostgreSQL tables with 20 years of daily data across 50 instruments (~1M+ rows) become slow on full-table scans (e.g., feature matrix builds, regime fitting). TimescaleDB's hypertables automatically partition by time, compress old chunks (columnar, 90% size reduction), and support `time_bucket()` aggregates natively. Since it's a PostgreSQL extension, the `DATABASE_URL` is unchanged, Prisma queries continue to work, and raw SQL functions are available via `prisma.$queryRaw`.

**Configuration for daily OHLCV:**
- `chunk_time_interval = '14 days'` — optimal for daily data; keeps uncompressed chunk in memory, maintains good compression batch size (TimescaleDB compresses in batches of 1000 rows)
- `compress_segmentby = 'ticker'` — columnar layout per ticker for fast per-instrument reads
- `compress_orderby = 'date DESC'` — aligns with time-descending query patterns
- Apply compression after 30 days: `add_compression_policy(interval '30 days')`

**Caveat:** TimescaleDB is a server-side extension — requires installation on the PostgreSQL host. On Neon/Supabase this may require enabling the extension. On Railway it's installable. On Vercel Postgres it is NOT supported. Verify with your PostgreSQL provider before committing. If extension is unavailable, use standard PostgreSQL with a composite index `(ticker, date DESC)` and accept the performance tradeoff — at 1–2M rows it is still manageable.

**Confidence:** HIGH for the approach; MEDIUM for specific provider compatibility (verify against your Postgres host).

---

### 2. Statistical Modeling: Native TypeScript (mljs) + Python Bridge for HMM/GMM

**Verdict: Use mljs for k-means (sufficient for regime detection). Bridge to Python only if HMM is required.**

#### 2a. k-Means Regime Clustering (Recommended starting point)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `ml-kmeans` | 7.0.0 | K-means clustering on macro feature vectors for regime labeling | Pure TypeScript, maintained (published 2 months ago), no Python dependency, fits the offline script architecture |
| `ml-matrix` | 6.12.1 | Matrix operations — feature matrix construction, covariance, PCA pre-processing | 215 dependents in npm ecosystem, solid numerical stability |
| `simple-statistics` | latest | Rolling statistics: mean, std, percentile, correlation — used in feature engineering z-scores | Lightweight, well-tested, TypeScript types available |

**Why k-means first, not HMM:**
K-means on a 6-8 dimensional macro feature vector (growth, inflation, yield curve, spreads, momentum, volatility) is sufficient for 3–5 regime clusters. HMM adds temporal continuity (regime persistence) which is valuable but complex. For a first implementation, k-means produces interpretable, backtestable regime labels. Add HMM in a later phase if regime switching is too noisy.

#### 2b. Python Bridge (Only if HMM/GMM is required)

| Tool | Purpose | Why |
|------|---------|-----|
| `pythonia` (npm) | Call Python's `hmmlearn` or `sklearn` GMM from Node.js scripts | Async-compatible, operates on Python objects as if native; most practical bridge for offline scripts |
| Python + `hmmlearn` 0.3.x | Hidden Markov Models with Gaussian emissions for regime detection | The definitive HMM library; no equivalent in pure JS/TS |
| Python + `scikit-learn` | GMM (`GaussianMixture`), `StandardScaler`, PCA preprocessing | Industry standard; paired with hmmlearn for feature preprocessing |

**Bridge architecture:** Python runs as a subprocess called from `scripts/macro-engine/run-backtest.ts`. The bridge is used exclusively in the offline pipeline, never on the Next.js request path. Results (regime labels, model parameters) are written to PostgreSQL. The online serving path never touches Python.

**Do not use `python-bridge` npm package** — last published 7 years ago, unmaintained. Use `pythonia` (active, async-compatible) or `child_process.execFile` with a standalone Python script (simplest, zero dependency on bridge libraries).

**Confidence:** HIGH for k-means via mljs; MEDIUM for pythonia bridge (limited production evidence in financial apps; child_process fallback is safer if bridge proves fragile).

---

### 3. Backtesting Engine: Custom Walk-Forward in TypeScript

**Verdict: Build a custom walk-forward engine. Do not adopt Grademark or backtestjs.**

**Why not existing libraries:**

| Library | Problem |
|---------|---------|
| `grademark` 0.3.0 | Last published 1+ year ago. Designed for single-instrument, bar-by-bar strategy simulation (entry/exit signals). Cannot handle multi-factor, multi-instrument, regime-filtered allocation backtests natively. Would require heavy adaptation. |
| `backtestjs` | Requires Binance for data fetching — not compatible with AV/FRED pipeline. Crypto-centric design. |
| `@fugle/backtest` | Built on Danfo.js (heavy dependency, inconsistent TS support). Overkill and wrong abstraction level. |

**What to build instead:**
The backtest engine required here is a walk-forward weight optimizer, not a bar-by-bar signal simulator. The loop is:

```
for each (train_window, test_window) pair:
  1. Build feature matrix for train_window using point-in-time data
  2. Fit regime classifier on train_window features
  3. Optimize factor weights per regime: maximize(hit_rate | Sharpe) using realized returns in train_window
  4. Apply weights to test_window features → allocation signals
  5. Compare signals to realized returns in test_window → record hit rate, P&L
```

This is ~300–500 lines of TypeScript and is specific enough to the domain that a generic library would need more adaptation than writing it directly. The key algorithmic pieces (matrix ops, k-means) come from mljs.

**Factor weight optimization** within each walk-forward window: use grid search over weight combinations (simple, interpretable, no solver needed for 6–8 factors). If convex optimization is needed later, `quadprog` npm (port of Goldfarb-Idnani QP algorithm) handles mean-variance weight optimization. Do NOT pull in a full scipy/cvxpy dependency for this.

| Library | Version | Purpose |
|---------|---------|---------|
| `quadprog` | latest (verify on npm) | Quadratic programming for mean-variance weight optimization if grid search proves insufficient | 

**Confidence:** HIGH for custom approach rationale; MEDIUM for quadprog (verify active maintenance before adopting).

---

### 4. Additional Data APIs

#### Credit Spreads

| Source | Coverage | Cost | Integration |
|--------|----------|------|-------------|
| **FRED** (primary) | ICE BofA US High Yield OAS (`BAMLH0A0HYM2`), IG spread (`BAMLC0A0CM`), EM sovereign spreads, US 10Y-2Y spread (already used) | Free | Already integrated — extend existing FRED fetch pattern |
| **FRED** | Country-specific sovereign spreads via IMF/BIS series available on FRED | Free | Same pattern |

**No new API needed for credit spreads.** FRED has the relevant series. Research which specific FRED series IDs are needed (e.g., `BAMLH0A0HYM2` for HY OAS, `BAMLC0A0CM` for IG OAS) and add to the ingest pipeline.

#### Commodity Prices

| Source | Coverage | Cost | Integration |
|--------|----------|------|-------------|
| **Alpha Vantage** (existing) | WTI crude, Brent, natural gas, copper, gold, silver, corn, wheat — via `COMMODITIES` function | Included in existing premium plan | Extend `lib/alpha-vantage.ts` wrapper with commodity function calls |
| **FRED** (secondary) | Global commodity price indices (World Bank), oil (DCOILWTICO), copper, gold | Free | Same FRED pattern |

**No new API needed for commodities.** Alpha Vantage premium already covers major commodities. FRED covers the rest.

#### Earnings Revisions

| Source | Coverage | Cost | Integration |
|--------|----------|------|-------------|
| **Financial Modeling Prep (FMP)** | Analyst EPS estimates, earnings revisions, earnings surprises, earnings calendar — per ticker | Free tier: 250 req/day (limited); Starter plan ~$14/month for adequate historical depth | New API key: `FMP_API_KEY`. Direct `fetch` to `https://financialmodelingprep.com/api/v3/`. No SDK needed. |
| **Alpha Vantage** (existing) | Earnings surprise history (`EARNINGS` function) | Included in premium | Use for historical EPS surprise signal; limited for revision momentum |

**Recommendation:** Add FMP at the Starter tier (~$14/month) for earnings revision data. Alpha Vantage covers earnings surprises but not analyst estimate revision history. FMP's Financial Estimates API gives projected EPS with analyst consensus, enabling an earnings revision momentum factor.

**Key FMP endpoints:**
- `GET /api/v3/analyst-estimates/{symbol}` — analyst EPS/revenue estimates (revision trend via time series)
- `GET /api/v3/earnings-surprises/{symbol}` — historical earnings surprise
- `GET /api/v3/earnings-calendar` — upcoming earnings dates

#### OECD Data (Country Macro)

| Source | Coverage | Cost | Integration |
|--------|----------|------|-------------|
| **OECD Data Explorer API** | GDP, inflation, current account, PMI, employment — OECD member countries | **Free, no API key required** | Direct `fetch` to `https://data-explorer.oecd.org/`, JSON format |

Add OECD for country-level macro series not available on FRED (e.g., composite leading indicators per country, country-specific CPI/GDP). No auth required.

---

## Installation

```bash
# Statistical modeling (TypeScript-native)
npm install ml-kmeans ml-matrix simple-statistics

# Backtesting / QP (if needed beyond grid search)
npm install quadprog

# Python bridge (only if HMM required — install after evaluating k-means results)
npm install pythonia
```

```bash
# Python environment (for HMM/GMM — only if bridge path is taken)
pip install hmmlearn scikit-learn numpy pandas
```

**No new npm installs needed for data APIs** — all new APIs (FMP, OECD) use the existing `fetch` pattern, same as AV and FRED.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| TimescaleDB extension | Plain PostgreSQL | At 1–2M rows, full-table scans for feature matrix construction degrade without partitioning. Compression reduces storage 90%. Cost of adding extension is low. |
| TimescaleDB extension | InfluxDB | InfluxDB is a separate database — no Prisma ORM, no SQL joins with application tables (User, holdings, etc.). TimescaleDB stays in existing PostgreSQL. |
| ml-kmeans (TypeScript) | Python sklearn KMeans | Python-only approach requires either a sidecar service or subprocess bridge for every scoring run. mljs k-means is sufficient for 3–5 clusters on a ~6D feature vector. |
| Custom walk-forward engine | Grademark | Grademark is bar-by-bar signal simulation, not regime-filtered factor weight optimization. Wrong abstraction. Would need to be rebuilt inside the library. |
| FMP for earnings revisions | Bloomberg / Refinitiv | Enterprise-only, $20K+/year contracts. Out of scope per PROJECT.md (public APIs only). |
| FRED for credit spreads | Bloomberg credit data | Same as above. FRED has ICE BofA spread indices which are the standard public reference. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `python-bridge` npm | Last published 7 years ago, unmaintained | `pythonia` or bare `child_process.execFile` |
| `backtestjs` | Crypto-centric, requires Binance data, wrong abstraction | Custom walk-forward engine |
| `@fugle/backtest` | Heavy Danfo.js dependency, TS support inconsistent, bar-by-bar abstraction | Custom walk-forward engine |
| `Danfo.js` | Large bundle, inconsistent TypeScript support, overkill for server-side computation | `ml-matrix` + native TypeScript arrays |
| InfluxDB | Separate database — breaks Prisma ORM, SQL join patterns, and existing PostgreSQL hosting | TimescaleDB (PostgreSQL extension) |
| Gurobi / MOSEK | Commercial solvers, enterprise licensing, overkill for 6–8 factor weight optimization | `quadprog` npm or grid search |
| Quandl (Nasdaq Data Link) | Most financial datasets now require paid subscription; coverage spotty | FRED + FMP + OECD (all free/low-cost) |

---

## Python Bridge Decision Tree

```
Is k-means regime output economically sensible? (e.g., 2008 crisis clusters with other stress periods)
├── YES → Use k-means. Ship. No Python bridge needed.
└── NO → Regime labels too unstable or noisy?
    ├── Try increasing feature dimensions or adjusting cluster count first
    └── Still poor → Implement HMM via pythonia bridge
        → Python runs in offline scripts only
        → Results written to DB
        → Online path unchanged
```

---

## Version Compatibility

| Package | Version | Compatibility Notes |
|---------|---------|---------------------|
| `ml-kmeans` | 7.0.0 | Works with Node.js 16+. TypeScript types included. |
| `ml-matrix` | 6.12.1 | ESM + CJS. Works with Next.js 14 module resolution. |
| `simple-statistics` | latest (2.x) | CJS, no peer deps. Compatible with any Node version. |
| `pythonia` | latest | Requires Python 3.8+ on the system. Only needed in offline scripts — never in Next.js runtime. |
| TimescaleDB | 2.x | PostgreSQL 14+ required. Verify support with your Postgres host before enabling. |

---

## Sources

- [TimescaleDB Review 2026 — Modern DataTools](https://www.modern-datatools.com/tools/timescaledb) — MEDIUM confidence
- [TimescaleDB financial tick data tutorial](https://docs.timescale.com/timescaledb/latest/tutorials/financial-tick-data/financial-tick-query/) — HIGH confidence (official docs)
- [TimescaleDB chunk_time_interval best practices](https://forum.tigerdata.com/forum/t/choosing-the-right-chunk-time-interval-value-for-timescaledb-hypertables/116) — MEDIUM confidence
- [TimescaleDB compression 90% reduction real production](https://dev.to/polliog/timescaledb-compression-from-150gb-to-15gb-90-reduction-real-production-data-bnj) — MEDIUM confidence
- [ml-kmeans npm (v7.0.0)](https://www.npmjs.com/package/ml-kmeans) — HIGH confidence (official npm)
- [ml-matrix npm (v6.12.1)](https://www.npmjs.com/package/ml-matrix) — HIGH confidence (official npm)
- [Grademark GitHub](https://github.com/Grademark/grademark) — HIGH confidence for capability assessment
- [JSPyBridge / pythonia GitHub](https://github.com/extremeheat/JSPyBridge) — MEDIUM confidence
- [hmmlearn documentation](https://hmmlearn.readthedocs.io/en/latest/tutorial.html) — HIGH confidence (official docs)
- [Market regime detection using HMM/GMM — LSEG Developers](https://developers.lseg.com/en/article-catalog/article/market-regime-detection) — MEDIUM confidence
- [FRED ICE BofA HY OAS series BAMLH0A0HYM2](https://fred.stlouisfed.org/series/BAMLH0A0HYM2) — HIGH confidence (official FRED)
- [FMP Financial Estimates API](https://site.financialmodelingprep.com/developer/docs/stable/financial-estimates) — HIGH confidence (official docs)
- [FMP Pricing](https://site.financialmodelingprep.com/pricing-plans) — HIGH confidence (official docs)
- [OECD Data API (free, no key)](https://www.oecd.org/en/data/insights/data-explainers/2024/09/api.html) — HIGH confidence (official OECD)
- [Alpha Vantage commodities](https://www.alphavantage.co/) — HIGH confidence (existing integration validated)

---

*Stack research for: Macro Allocation Engine — SGC Hedge Fund Backend*
*Researched: 2026-04-08*
