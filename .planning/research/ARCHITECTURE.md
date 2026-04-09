# Architecture Research

**Domain:** Macro Allocation Engine — quantitative finance, factor modeling, regime classification
**Researched:** 2026-04-08
**Confidence:** HIGH (component boundaries and data flow); MEDIUM (specific implementation details within Next.js constraints)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        OFFLINE PIPELINE (batch, scheduled)           │
│                                                                      │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               │
│  │  Data       │   │  Feature    │   │  Regime     │               │
│  │  Ingestion  │──▶│  Engineering│──▶│  Classifier │               │
│  │             │   │             │   │             │               │
│  │ AV + FRED   │   │ z-scores,   │   │ k-means /   │               │
│  │ daily cron  │   │ rolling     │   │ HMM on macro│               │
│  │             │   │ windows,    │   │ feature     │               │
│  │             │   │ cross-sect. │   │ vectors     │               │
│  └─────────────┘   └─────────────┘   └──────┬──────┘               │
│                                             │                       │
│  ┌──────────────────────────────────────────▼──────────────────┐    │
│  │                    Backtester                                │    │
│  │  Walk-forward: regime labels × factor scores → allocations  │    │
│  │  Outputs: optimized factor weights, hit rates, simulated P&L│    │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                       │
│  ┌──────────────────────────▼───────────────────────────────────┐    │
│  │                    Factor Scorer                             │    │
│  │  Applies backtested weights to current macro snapshots       │    │
│  │  Produces: country scores, sector scores, conviction levels  │    │
│  └──────────────────────────┬───────────────────────────────────┘   │
└────────────────────────────┼────────────────────────────────────────┘
                             │ writes pre-computed results to DB
┌────────────────────────────▼────────────────────────────────────────┐
│                        SIGNAL STORE (PostgreSQL)                    │
│                                                                      │
│  macro_snapshots  │  regime_labels  │  factor_scores               │
│  price_history    │  backtest_runs  │  allocation_signals           │
│  ingest_log       │  model_weights  │  probabilistic_forecasts      │
└────────────────────────────┬────────────────────────────────────────┘
                             │ reads only
┌────────────────────────────▼────────────────────────────────────────┐
│                        ONLINE SERVING (Next.js)                     │
│                                                                      │
│  ┌──────────────────────┐   ┌────────────────────────────────────┐  │
│  │  Signal Server       │   │  Dashboard UI                      │  │
│  │  app/api/dashboard/  │──▶│  app/dashboard/tools/macro-engine/ │  │
│  │  macro-engine/       │   │                                    │  │
│  │  Fast DB reads only  │   │  Current regime, allocation table, │  │
│  │  No live computation │   │  conviction scores, backtest stats │  │
│  └──────────────────────┘   └────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Location |
|-----------|---------------|----------|
| Data Ingestion | Pull raw macro + price data from AV/FRED, deduplicate, normalize, store in time-series tables | `lib/macro-engine/ingest/` + cron script |
| Feature Engineering | Compute derived features: z-scores, rolling windows, yield curve spreads, cross-sectional ranks | `lib/macro-engine/features/` |
| Regime Classifier | Cluster macro feature vectors into regime labels; label historical record | `lib/macro-engine/regime/` |
| Backtester | Walk-forward simulation: for each historical window, run factor scorer, compare to realized returns, output optimized weights | `lib/macro-engine/backtest/` |
| Factor Scorer | Apply model-derived weights to latest macro snapshot, rank countries/sectors, compute conviction | `lib/macro-engine/scoring/` |
| Signal Store | PostgreSQL tables holding all pre-computed results; sole interface between offline and online | `prisma/schema.prisma` additions |
| Signal Server | Next.js Route Handlers reading pre-computed signals from DB — no live computation | `app/api/dashboard/macro-engine/` |
| Dashboard UI | Client Component displaying current regime, allocation table, backtest stats | `app/dashboard/tools/macro-engine/` |

## Recommended Project Structure

```
lib/
└── macro-engine/
    ├── ingest/
    │   ├── index.ts          # Orchestrates full ingest run
    │   ├── price-history.ts  # AV daily OHLCV fetch + upsert
    │   ├── macro-series.ts   # FRED series fetch + upsert
    │   └── universe.ts       # ETF/equity universe config
    ├── features/
    │   ├── index.ts          # Feature matrix builder
    │   ├── z-scores.ts       # Rolling z-score computation
    │   ├── cross-section.ts  # Cross-sectional normalization
    │   └── derived.ts        # Yield spreads, carry, momentum
    ├── regime/
    │   ├── index.ts          # Classifier entry point
    │   ├── cluster.ts        # k-means or GMM implementation
    │   └── label-history.ts  # Apply labels to historical record
    ├── backtest/
    │   ├── index.ts          # Walk-forward orchestrator
    │   ├── simulate.ts       # Single window simulation
    │   ├── optimize.ts       # Factor weight optimization
    │   └── metrics.ts        # Hit rate, Sharpe, drawdown
    ├── scoring/
    │   ├── index.ts          # Current allocation signal producer
    │   ├── factor-score.ts   # Apply weights to snapshot
    │   └── conviction.ts     # Probability/conviction calculation
    └── types.ts              # Shared types across engine
app/
├── api/dashboard/macro-engine/
│   ├── signals/route.ts      # Current allocation signals
│   ├── regime/route.ts       # Current + historical regime
│   ├── backtest/route.ts     # Backtest results summary
│   └── universe/route.ts     # ETF/equity universe read
└── dashboard/tools/macro-engine/
    └── page.tsx              # Dashboard UI client component
scripts/
└── macro-engine/
    ├── run-ingest.ts         # One-off or cron: ingest raw data
    ├── run-backtest.ts       # One-off: full backtest + weight optimization
    └── run-scoring.ts        # Cron: compute current signals from latest data
```

### Structure Rationale

- **`lib/macro-engine/`:** All computation logic is server-only, co-located under one namespace. Mirrors the existing `lib/country-health/` pattern the project already uses.
- **`scripts/macro-engine/`:** Offline heavy operations (ingest, backtest, scoring) run as Node scripts invoked via cron or manually — not as HTTP request handlers. This keeps Next.js serverless functions thin.
- **`app/api/dashboard/macro-engine/`:** Online path is read-only DB queries only. Follows existing `app/api/dashboard/flows/` pattern.

## Architectural Patterns

### Pattern 1: Offline/Online Separation (Critical)

**What:** Compute-heavy operations (backtesting, regime fitting, weight optimization) run offline as scripts that write results to the database. The online serving path reads only pre-computed results — it never runs a backtest or regime classifier on a live request.

**When to use:** Always, for this engine. Backtesting 20 years of daily data cannot fit in a serverless function timeout (typically 10-30s on Vercel). Even regime classification over a large feature matrix can take seconds.

**Trade-offs:** Results are as fresh as the last script run (daily is sufficient for macro signals). No risk of a live request timing out or being rate-limited mid-computation.

**Example:**
```typescript
// scripts/macro-engine/run-scoring.ts — runs as a cron, NOT an HTTP handler
async function main() {
  const features = await buildCurrentFeatureSnapshot();
  const regime = await classifyCurrentRegime(features);
  const scores = await scoreFactors(features, regime);
  await prisma.allocationSignal.upsert({ where: { date: today }, data: scores });
}
main();

// app/api/dashboard/macro-engine/signals/route.ts — fast DB read only
export async function GET() {
  const signal = await prisma.allocationSignal.findFirst({ orderBy: { date: 'desc' } });
  return NextResponse.json(signal);
}
```

### Pattern 2: Point-in-Time Feature Construction (Data Integrity)

**What:** When building the historical feature matrix for backtesting, each row must use only data available at that historical date — no lookahead. Features are computed with a rolling window anchored to the past.

**When to use:** Whenever constructing features used in walk-forward backtesting.

**Trade-offs:** More complex to implement than a simple vectorized batch computation. Prevents the critical error of leaking future information into factor weights.

**Example:**
```typescript
// For each date T in historical range:
// - Use macro data from [T - window, T]
// - Use price returns through T (not T+1)
// - Label regimes using only data ≤ T
function buildPointInTimeFeatures(date: Date, macroData: MacroRow[]) {
  const windowData = macroData.filter(r => r.date <= date);
  return computeZScores(windowData.slice(-ROLLING_WINDOW));
}
```

### Pattern 3: Regime-Filtered Factor Scoring (Citadel/Bridgewater Hybrid)

**What:** Factor weights are not static across all market conditions. The engine maintains separate weight sets per regime. Current regime label selects which weight set to apply.

**When to use:** Core scoring pattern for this engine — explicitly called out in PROJECT.md as the design choice.

**Trade-offs:** Requires sufficient historical samples per regime for valid weight estimation. Sparse regimes need fallback (use global weights if regime has < N samples).

**Example:**
```typescript
function scoreAllocation(snapshot: FeatureSnapshot, regimeLabel: string, weights: ModelWeights) {
  const regimeWeights = weights[regimeLabel] ?? weights['global'];
  return snapshot.factors.map(f => f.value * regimeWeights[f.name]);
}
```

### Pattern 4: Reuse Existing Scores as Factor Inputs

**What:** `lib/country-health/` already computes country health scores across 5 pillars. `app/api/dashboard/flows/` produces regime composite and ETF flow signals. These are valid factor inputs — fetch them from the DB rather than recomputing.

**When to use:** When building the factor matrix for country scoring. Avoids rebuilding validated pipelines.

**Trade-offs:** Creates a dependency: country-health and flows data must be current before scoring runs. Handle via ingest ordering in the cron sequence.

## Data Flow

### Offline Pipeline Flow (runs as scripts, daily or on-demand)

```
External APIs (AV + FRED)
    ↓
Data Ingestion (lib/macro-engine/ingest/)
    → Upsert: macro_snapshots, price_history tables
    ↓
Feature Engineering (lib/macro-engine/features/)
    → Read: macro_snapshots, country_health_scores (existing), flow_signals (existing)
    → Write: feature_matrix table (or compute in-memory for backtest)
    ↓
Regime Classifier (lib/macro-engine/regime/)
    → Read: feature_matrix (historical)
    → Fit: cluster model (k-means or GMM)
    → Write: regime_labels table (date → label mapping)
    ↓
Backtester (lib/macro-engine/backtest/)  [heavy, run infrequently — monthly or on-demand]
    → Read: feature_matrix, regime_labels, price_history
    → Optimize: factor weights per regime via walk-forward simulation
    → Write: backtest_runs, model_weights tables
    ↓
Factor Scorer (lib/macro-engine/scoring/)  [lightweight, run daily]
    → Read: today's feature_matrix, current regime_labels, latest model_weights
    → Compute: country/sector scores + conviction
    → Write: allocation_signals, probabilistic_forecasts tables
```

### Online Serving Flow (Next.js request path)

```
Dashboard User
    ↓
Client Component (app/dashboard/tools/macro-engine/page.tsx)
    → fetch('/api/dashboard/macro-engine/signals')
    ↓
Signal Server Route Handler (app/api/dashboard/macro-engine/signals/route.ts)
    → requireAuth()
    → prisma.allocationSignal.findFirst()   ← no computation
    → NextResponse.json(signal)
    ↓
Client renders allocation table, regime badge, conviction bars
```

### Key Data Flows

1. **Raw → Stored:** Ingest scripts pull from AV/FRED sequentially (rate-limit aware, existing pattern), upsert into typed PostgreSQL tables. Idempotent — re-runs are safe.
2. **Stored → Features:** Feature engineering reads time-series tables, applies rolling windowed transformations, produces a feature matrix (one row per date per country/sector).
3. **Features → Regime:** Classifier fits on full historical feature matrix, assigns labels. Labels are stored — regime assignment does not re-run on every request.
4. **Features + Regime → Weights:** Backtester runs walk-forward simulation, outputs optimized per-regime factor weights stored in `model_weights` table. This is the most compute-intensive step.
5. **Weights + Today's Features → Signal:** Daily scoring script applies current weights to today's feature snapshot, writes allocation signals to DB.
6. **Signal → Dashboard:** API route reads latest signal row, returns JSON. No computation on the request path.

## Build Order

The dependency chain is strict — each layer requires the previous:

1. **Data Ingestion + Schema** — Nothing works without historical data. Define tables and build ingest scripts first. Validate 20 years of macro/price data is accessible and stored correctly.

2. **Feature Engineering** — Build the feature matrix on top of stored data. Validate z-scores, rolling windows, and cross-sectional normalization look correct on known historical periods.

3. **Regime Classifier** — Cluster on historical features. Validate regime labels are economically sensible (e.g., a 2008-crisis regime should cluster with other high-stress periods).

4. **Backtester** — Walk-forward simulation using features + regime labels. Produces factor weights. This is the validation gate — weights must show positive hit rates before being used for forward signals.

5. **Factor Scorer + Allocation Signals** — Apply backtested weights to today's data. Write signals to DB.

6. **Signal Server + Dashboard UI** — Build the serving layer only after pre-computed signals exist in the DB to display.

**Constraint:** Steps 4 (backtest) and 5 (scoring) cannot be built concurrently with steps 1–3 because they depend on validated historical data and feature quality. If features are wrong, backtested weights are meaningless.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Alpha Vantage (premium) | Sequential fetch with stagger delay — existing `lib/alpha-vantage.ts` pattern | Rate limits: 75 req/min on premium. 20yr daily data for 50 ETFs ≈ 1M rows; do incremental daily updates after initial load |
| FRED | REST fetch with `FRED_API_KEY` — existing pattern in country-health ingest | Free tier: 120 req/min. Macro series update daily/monthly — fetch only series with new revisions |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Offline scripts ↔ Online serving | PostgreSQL tables (Signal Store) — no direct function calls | The only coupling is the DB schema. Offline can be rewritten without touching the API layer |
| Macro Engine ↔ Country Health | DB read: `lib/macro-engine/features/` reads from existing country health score tables | Country health ingest must run before macro engine feature build in cron ordering |
| Macro Engine ↔ Flows | DB read: flows regime composite and ETF z-scores used as factor inputs | Same cron ordering dependency |
| API routes ↔ lib/ | Function import — same as all other tools in this app | No new patterns needed |

## Scaling Considerations

| Concern | Current Scale (internal tool) | If scaled to external users |
|---------|-------------------------------|------------------------------|
| Backtest runtime | Run offline on-demand. 20yr × 50 instruments × 6 factors: expect 30–120s in Node.js. Acceptable for a script. | Would need a background job queue (e.g., BullMQ) if users trigger backtests on demand |
| Data volume | ~1–2M rows for 20yr daily data across 50 instruments. PostgreSQL handles this comfortably at this scale. | Consider TimescaleDB extension if queries slow down beyond 10M rows |
| Signal freshness | Daily cron is sufficient for macro signals (not intraday) | No change needed — macro signals don't require sub-daily updates |
| API response time | Pre-computed signals = single indexed DB read. Sub-10ms. | No bottleneck at any realistic user count for an internal tool |

## Anti-Patterns

### Anti-Pattern 1: Running Computation on the Request Path

**What people do:** Trigger feature engineering or scoring when the dashboard page loads.

**Why it's wrong:** A 20-year backtest or even a moderate feature matrix build will exceed Vercel's serverless function timeout (10s default, 60s max on Pro). Even if it doesn't time out, it makes the dashboard slow and fragile.

**Do this instead:** Always write to DB offline. The request path reads a DB row that was computed ahead of time.

### Anti-Pattern 2: Hardcoded Factor Weights

**What people do:** Set factor weights like `growth: 0.3, inflation: 0.2` based on judgment.

**Why it's wrong:** Explicitly excluded in PROJECT.md — weights must be model-derived from backtesting to have justifiable evidence. Hardcoded weights cannot be validated or improved.

**Do this instead:** Backtester outputs weights as data, stored in `model_weights` table. Scorer reads them from DB. Weights can be retrained when new data accumulates.

### Anti-Pattern 3: Look-Ahead Bias in Feature Construction

**What people do:** Compute features (e.g., z-scores) using the full historical dataset before splitting into train/test periods.

**Why it's wrong:** Future data contaminates historical signals. Backtested performance will be artificially inflated and factor weights will not generalize to live data.

**Do this instead:** Use point-in-time feature construction — for any historical date T, use only data available up to T when computing features for that row. Walk-forward cross-validation enforces this structurally.

### Anti-Pattern 4: Monolithic Ingest + Compute Script

**What people do:** Build one script that ingests data, builds features, runs backtest, and computes signals all in one pass.

**Why it's wrong:** Backtest optimization should run infrequently (monthly or on model updates). Daily ingest + scoring runs should be lightweight. Coupling them forces a full backtest to run every night, wasting compute and risking partial failures corrupting the pipeline.

**Do this instead:** Three separate scripts with independent cron schedules: `run-ingest.ts` (daily), `run-scoring.ts` (daily, after ingest), `run-backtest.ts` (monthly or on-demand).

## Sources

- [Data Pipeline Design in an Algorithmic Trading System (Medium)](https://medium.com/@edwinsalguero/data-pipeline-design-in-an-algorithmic-trading-system-ac0d8109c4b9)
- [Supercharging PostgreSQL with TimescaleDB for Time Series Data](https://aamersadiq.github.io/2025/Supercharging-PostgreSQL-with-TimescaleDB-for-Time-Series-Data/)
- [Time-Series Database Patterns: InfluxDB and TimescaleDB (Medium, Mar 2026)](https://medium.com/@artemkhrenov/time-series-database-patterns-influxdb-and-timescaledb-for-analytics-32daf132297f)
- [A New Approach to Regime Detection and Factor Timing (Alpha Architect)](https://alphaarchitect.com/regime-detection/)
- [RegimeFolio: A Regime Aware ML System for Sectoral Portfolio Optimization (arXiv)](https://arxiv.org/html/2510.14986v1)
- [Systematic Stock Selection with Macro Factors (Macrosynergy)](https://macrosynergy.com/research/systematic-stock-selection-with-macro-factors/)
- [Quant Trading Systems: Architecture & Infrastructure (Brenndoerfer)](https://mbrenndoerfer.com/writing/quant-trading-system-architecture-infrastructure)
- [GenAI in Factor Modeling Data Pipelines: A Hedge Fund Workflow on AWS](https://aws.amazon.com/blogs/industries/genai-in-factor-modeling-data-pipelines-a-hedge-fund-workflow-on-aws/)

---
*Architecture research for: Macro Allocation Engine (SGC Hedge Fund Backend)*
*Researched: 2026-04-08*
