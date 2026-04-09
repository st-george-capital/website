# Roadmap: Macro Allocation Engine

## Overview

Six phases build the engine from the ground up: raw data ingestion and storage, point-in-time feature engineering, data-derived regime classification, walk-forward backtesting with regime-conditioned weight optimization, live allocation signal generation with single-stock screening, and finally the dashboard view that surfaces all signals to the user. Each phase must be sound before the next begins — regime labels depend on clean features, backtested weights depend on validated regimes, and forward signals depend on backtested weights.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Foundation** - Ingest and store 20+ years of ETF, FRED, AV, FMP, and OECD data with a configurable universe file (completed 2026-04-09)
- [x] **Phase 2: Feature Engineering** - Compute point-in-time rolling z-scores, cross-sectional rankings, and the full factor feature matrix with look-ahead bias tests (completed 2026-04-09)
- [ ] **Phase 3: Regime Classifier** - Fit data-derived regime clusters, stabilize labels across re-fits, validate against known historical shocks, and compute transition probabilities
- [ ] **Phase 4: Backtesting Engine** - Walk-forward train/test with regime-conditioned weight optimization, holdout OOS validation, and Sharpe/hit-rate reporting
- [ ] **Phase 5: Allocation Signals** - Daily scoring cron, conviction scores with factor attribution, probabilistic forecasts, O'Neil single-stock screening, and analyst consensus overlay
- [ ] **Phase 6: Dashboard & Integration** - Regime badge, allocation table, backtest stats panel, single-stock picks panel, and tools-page card

## Phase Details

### Phase 1: Data Foundation
**Goal**: All historical price, macro, and fundamental data is stored point-in-time and query-ready for feature engineering
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06
**Success Criteria** (what must be TRUE):
  1. A query against any ETF in the universe returns 20+ years of daily OHLCV rows with no gaps beyond known exchange holidays
  2. FRED series rows reflect only the vintage published at that date — a query for GDP as-of 2010-03-01 returns the March 2010 release, not the revised figure
  3. The universe config file drives which tickers are ingested; adding a ticker to that file causes it to appear in the DB on next ingest without any code change
  4. FMP earnings revision history is queryable by equity and date, returning analyst estimate changes up to that date only
  5. OECD leading indicator series are present in the DB for all configured countries
**Plans**: 4 planned (3 waves)

### Phase 2: Feature Engineering
**Goal**: A complete, look-ahead-free factor feature matrix is built and stored, ready for regime classification and backtesting
**Depends on**: Phase 1
**Requirements**: FEAT-01, FEAT-02, FEAT-03, FEAT-04, FEAT-05
**Success Criteria** (what must be TRUE):
  1. Rolling z-scores for all 6 macro factors can be queried at any historical date using only data available up to that date
  2. Cross-sectional factor rankings across all countries and sectors are stored for every date in the backtest window
  3. The automated look-ahead bias test fails the pipeline (non-zero exit) if any feature row references a data point dated after the feature date
  4. Country-health pillar scores and flows regime signal are read from existing pipelines and appear as columns in the feature matrix without being recomputed
**Plans**: 5 plans (4 waves)

Plans:
- [ ] 02-01-PLAN.md — Credit spread ingest gap + FactorFeatureMatrix schema + FeatureRow type contracts
- [ ] 02-02-PLAN.md — rollingZScore helper + 6 macro factor compute functions (FEAT-01)
- [ ] 02-03-PLAN.md — Country-health and flows regime factor adapters (FEAT-05)
- [ ] 02-04-PLAN.md — Cross-section ranking + buildFeatureRow orchestrator + batch builder + CLI (FEAT-02, FEAT-03)
- [ ] 02-05-PLAN.md — Look-ahead bias assertion + verify-feature-matrix script (FEAT-04)

### Phase 3: Regime Classifier
**Goal**: A validated, data-derived regime classifier labels every historical date with a stable regime and produces transition probabilities
**Depends on**: Phase 2
**Requirements**: REGM-01, REGM-02, REGM-03, REGM-04
**Success Criteria** (what must be TRUE):
  1. Regime labels on historical dates emerge from clustering (k-means or GMM) — no hardcoded definitions exist in the codebase
  2. Re-running the classifier on the same data produces the same label assignments (label stability across re-fits via template matching)
  3. The 2008 GFC window, 2020 COVID shock window, and 2022 rate shock window each map consistently to distinct regime labels that match intuitive descriptions of those environments
  4. For any date, the system returns P(regime changes in 3/6/12 months) derived from historical regime duration and transition frequency
**Plans**: TBD

### Phase 4: Backtesting Engine
**Goal**: Regime-conditioned factor weights are derived from walk-forward backtesting and validated on an untouched holdout set, with OOS performance metrics visible
**Depends on**: Phase 3
**Requirements**: BACK-01, BACK-02, BACK-03, BACK-04
**Success Criteria** (what must be TRUE):
  1. Each training window uses only data preceding that window — no information from the test period leaks into weight optimization
  2. Each regime label has its own factor weight set; a regime with fewer than the minimum sample threshold falls back to global weights
  3. The holdout set (most recent 3 years) is never touched during optimization; OOS metrics are computed on it exactly once after all tuning is complete
  4. Backtest output displays OOS hit rate, annualized Sharpe, and max drawdown vs SPY/ACWI — in-sample stats are not shown
**Plans**: TBD

### Phase 5: Allocation Signals
**Goal**: The system produces daily ranked allocation signals with conviction scores, probabilistic forecasts, single-stock picks, and analyst consensus validation — all ready for the dashboard to consume
**Depends on**: Phase 4
**Requirements**: ALLC-01, ALLC-02, ALLC-03, ALLC-04, ALLC-05
**Success Criteria** (what must be TRUE):
  1. A daily cron run produces a ranked overweight/underweight list for all countries and sectors using the current regime's factor weights
  2. Each signal row includes conviction score, the top factor drivers (factor attribution), current regime label, and a recommended ETF ticker
  3. For each country and sector, the system computes P(outperforms benchmark in 6 months) and P(outperforms in 12 months) based on current factor and regime state
  4. For any favored sector, the single-stock filter returns equities ranked by EPS rank, SMR rating, computed RS rating, DMA position, institutional sponsorship trend, and earnings revision momentum
  5. The top analyst buy/sell recommendations for favored equities appear alongside model signals, showing alignment or divergence between model and consensus
**Plans**: TBD

### Phase 6: Dashboard & Integration
**Goal**: Users can view current macro regime, ranked allocation signals, backtest credibility stats, and single-stock recommendations in one dashboard, accessible from the tools page
**Depends on**: Phase 5
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05
**Success Criteria** (what must be TRUE):
  1. The dashboard shows the current regime badge with factor breakdown, regime start date, and historical average duration
  2. The allocation table displays all countries and sectors ranked by signal strength with conviction scores, factor attribution, and ETF entry ticker
  3. A backtest stats panel shows OOS hit rate, Sharpe, and max drawdown vs benchmark — visible without navigating away
  4. A single-stock panel shows top picks per favored sector with O'Neil score components, technical setup summary, and external analyst consensus
  5. The Macro Allocation Engine appears as a card on `/dashboard/tools` consistent in style with existing tool cards, and clicking it navigates to `/dashboard/tools/macro-engine`
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation | 4/4 | Complete    | 2026-04-09 |
| 2. Feature Engineering | 5/5 | Complete    | 2026-04-09 |
| 3. Regime Classifier | 0/TBD | Not started | - |
| 4. Backtesting Engine | 0/TBD | Not started | - |
| 5. Allocation Signals | 0/TBD | Not started | - |
| 6. Dashboard & Integration | 0/TBD | Not started | - |
