# Requirements: Macro Allocation Engine

**Defined:** 2026-04-08
**Core Value:** Given the current global macro regime, tell me which countries and sectors will outperform and underperform — with probabilities, backtested accuracy, and specific investable recommendations (ETFs + equities).

## v1 Requirements

### Data Foundation

- [x] **DATA-01**: System stores 20+ years of daily OHLCV data for all universe ETFs in TimescaleDB hypertables with time-based partitioning and compression
- [x] **DATA-02**: System ingests FRED macro series using ALFRED vintage API, ensuring each historical data point reflects only what was published at that date (no retroactive revisions)
- [x] **DATA-03**: ETF universe is defined in a configurable file (not hardcoded), with each entry including ticker, sector/country mapping, inception date, and proxy-series for pre-inception history
- [x] **DATA-04**: System ingests Alpha Vantage premium data (price history, earnings, economic indicators) using existing rate-limit-aware sequential fetch pattern
- [x] **DATA-05**: System ingests Financial Modeling Prep (FMP) earnings revision history (10+ years of analyst estimate changes) for all universe equities and ETFs
- [x] **DATA-06**: System ingests OECD leading indicator series via FRED mirror (uses FRED_API_KEY) for country-level macro context

### Feature Engineering

- [x] **FEAT-01**: System computes point-in-time rolling z-scores for all 6 macro factors, using only data available up to each historical date (no global normalization)
- [ ] **FEAT-02**: System produces cross-sectional factor rankings across all countries and sectors at each historical date (relative scoring within universe)
- [x] **FEAT-03**: System builds a complete factor feature matrix: 6 factors × all assets × daily frequency, stored in DB for backtest and scoring use
- [ ] **FEAT-04**: Automated tests verify that no feature row uses data from a future date — backtest pipeline fails if look-ahead bias is detected
- [ ] **FEAT-05**: Country-health pillar scores and ETF flows regime signal are read from existing pipelines as factor inputs (not recomputed), with optional recalibration to reduce overweight bias toward stable-governance countries

### Regime Classifier

- [ ] **REGM-01**: System classifies macro regimes using data-derived clustering (k-means or GMM) on the macro feature vector — regime labels emerge from data, not hardcoded definitions
- [ ] **REGM-02**: Regime labels are stabilized across re-fits using template matching (e.g., Wasserstein distance to canonical cluster prototypes), so the same economic environment always maps to the same label
- [ ] **REGM-03**: Regime classifier is validated against known historical periods (2008 GFC, 2020 COVID shock, 2022 rate shock) before any downstream use
- [ ] **REGM-04**: System computes regime transition probabilities: P(regime changes in next 3/6/12 months) based on historical regime duration and transition frequency

### Backtesting Engine

- [ ] **BACK-01**: Walk-forward backtest engine trains factor weights only on data preceding each test window — never on data from the test period itself
- [ ] **BACK-02**: Factor weights are optimized per regime (each regime label has its own weight set derived from backtesting), with global fallback weights when a regime has insufficient samples
- [ ] **BACK-03**: A pre-committed holdout set (most recent 3 years) is reserved before any optimization begins and never touched during weight tuning — used only for final OOS validation
- [ ] **BACK-04**: Backtest reports hit rate (% correct directional calls), annualized Sharpe, and max drawdown vs SPY/ACWI benchmark — OOS metrics only, no in-sample stats displayed

### Allocation Signals

- [ ] **ALLC-01**: Daily scoring cron applies current regime's factor weights to latest features and produces ranked overweight/underweight signals for all countries and sectors
- [ ] **ALLC-02**: Each signal includes conviction score, primary factor drivers (factor attribution), current regime context, and recommended entry ETF ticker
- [ ] **ALLC-03**: System computes probabilistic forecasts for each country/sector: P(outperforms benchmark in next 6/12 months) based on current factor + regime state
- [ ] **ALLC-04**: Single-stock filter screens equities within favored sectors using O'Neil-style criteria: EPS rank, SMR rating, RS rating (computed from price vs. universe), DMA position (50/100/200), institutional sponsorship trend (fund count y/y), and earnings revision momentum
- [ ] **ALLC-05**: Dashboard surfaces top buy-side and sell-side analyst recommendations for favored equities, providing external conviction validation alongside model signals (e.g., shows Google/Microsoft as buys when model and consensus align)

### Dashboard & Integration

- [ ] **DASH-01**: Dashboard displays current regime badge with factor breakdown (which factors are driving the regime, when it started, historical duration)
- [ ] **DASH-02**: Allocation table shows all countries and sectors ranked by signal strength with conviction scores, factor attribution, and recommended ETF entry
- [ ] **DASH-03**: Backtest stats panel displays OOS hit rate, Sharpe, max drawdown vs benchmark — visible model credibility
- [ ] **DASH-04**: Single-stock recommendations panel shows top picks per favored sector with O'Neil scores, technical setup summary, and external analyst consensus
- [ ] **DASH-05**: Macro Allocation Engine is added to `/dashboard/tools` page with a card entry consistent with existing tool cards

## v2 Requirements

### Enhanced Signals

- **ENH-01**: Tactical/strategic signal decomposition — separate momentum (weeks-months) overlay from macro regime (quarters-years) base signal
- **ENH-02**: Central bank action probabilities — P(Fed hike/cut at next meeting) derived from yield curve and futures data
- **ENH-03**: Calibrated probabilities using Platt scaling or isotonic regression on OOS prediction data (requires one full backtest cycle to accumulate calibration data)
- **ENH-04**: Deflated Sharpe Ratio reporting to account for multiple comparisons bias in factor selection

### Portfolio Construction

- **PORT-01**: Position sizing guidance based on conviction score and regime-adjusted volatility
- **PORT-02**: Correlation-adjusted allocation (don't double-count correlated calls)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time intraday signals | Macro tool — signal cadence is daily/weekly, not tick-by-tick |
| Options or derivatives | Universe restricted to ETFs and equities only |
| Execution / order management | Research and signal generation only, no brokerage integration |
| Private or alternative data | Only publicly available APIs |
| Hardcoded factor weights | Weights must be model-derived from backtesting — a core design constraint |
| Hardcoded regime definitions | Regimes must emerge from data clustering, not hand-labeled |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| DATA-05 | Phase 1 | Complete |
| DATA-06 | Phase 1 | Complete |
| FEAT-01 | Phase 2 | Complete |
| FEAT-02 | Phase 2 | Pending |
| FEAT-03 | Phase 2 | Complete |
| FEAT-04 | Phase 2 | Pending |
| FEAT-05 | Phase 2 | Pending |
| REGM-01 | Phase 3 | Pending |
| REGM-02 | Phase 3 | Pending |
| REGM-03 | Phase 3 | Pending |
| REGM-04 | Phase 3 | Pending |
| BACK-01 | Phase 4 | Pending |
| BACK-02 | Phase 4 | Pending |
| BACK-03 | Phase 4 | Pending |
| BACK-04 | Phase 4 | Pending |
| ALLC-01 | Phase 5 | Pending |
| ALLC-02 | Phase 5 | Pending |
| ALLC-03 | Phase 5 | Pending |
| ALLC-04 | Phase 5 | Pending |
| ALLC-05 | Phase 5 | Pending |
| DASH-01 | Phase 6 | Pending |
| DASH-02 | Phase 6 | Pending |
| DASH-03 | Phase 6 | Pending |
| DASH-04 | Phase 6 | Pending |
| DASH-05 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after initial definition*
