# Feature Research

**Domain:** Institutional macro allocation engine — global regime classification, factor scoring, sector/country signals, backtesting, probabilistic forecasting
**Researched:** 2026-04-08
**Confidence:** HIGH (regime detection, factor taxonomy, backtest requirements); MEDIUM (probabilistic outputs, exact Bridgewater/Citadel internals — these are proprietary)

---

## Feature Landscape

### Table Stakes (Model Is Useless Without These)

These are the minimum features required for the engine to produce credible, actionable output. Missing any one of these means the output cannot be trusted or acted on.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Point-in-time feature construction** | Without it, all backtest results are fiction — future data leaks into historical signals | MEDIUM | Every historical feature row must use only data available up to that date. Rolling window anchored to the past, never global stats. Non-negotiable foundation. |
| **Macro regime classifier (data-derived labels)** | The primary organizing structure for all downstream signals. Without a regime context, factor weights are unconditional and weaker. | HIGH | Standard institutional approach: Gaussian Mixture Model (GMM) or k-means on macro feature vectors. 4 regimes minimum (growth/inflation quadrant), up to 6-8 if data supports. Labels must be validated against known historical periods (2008 crisis, 2020 COVID, 2022 inflation shock). |
| **Core macro factor set: growth, inflation, flows, spreads, carry, momentum** | These six cover the documented systematic signals used by Research Affiliates, AQR, Macrosynergy, and inferred from Bridgewater's public publications | MEDIUM | Growth: PMI, GDP revisions, LEI; Inflation: CPI surprises, break-evens, PPI; Flows: ETF capital flows (existing); Spreads: IG/HY credit, sovereign; Carry: real yield differentials; Momentum: price and earnings revision momentum. |
| **Cross-sectional normalization of factor scores** | Without this, raw factor values are not comparable across countries or sectors — you can't rank without a common scale | LOW | Z-score each factor cross-sectionally at each date. Standard practice per Macrosynergy quantamental methodology. |
| **Walk-forward backtesting with held-out OOS periods** | In-sample backtest results are meaningless. Walk-forward enforces that optimization uses no future data. | HIGH | Minimum 10 years, target 20. Train on first N years, test on next M, roll forward. Factor weights derived only from train period. Standard in all serious quant shops. |
| **Factor weights derived from backtest optimization (not hand-tuned)** | Hardcoded weights are opinions, not evidence. Model-derived weights can be validated and improved. | HIGH | Explicitly required by PROJECT.md. Use cross-validated optimization (e.g., OLS or Lasso regression of factor scores on forward returns) within each walk-forward window. |
| **Hit rate and Sharpe ratio reporting per signal** | Basic signal validity check. A signal with <52% hit rate on macro time horizons is noise. | LOW | Report per: country, sector, regime, time horizon (1M, 3M, 6M, 12M). Without this, users cannot assess credibility. |
| **Regime-conditional factor weights (separate weights per regime)** | The Citadel/Bridgewater hybrid design — factor weights that are valid in one regime may be noise in another. Growth factor matters more in Growth regime, carry matters more in low-vol regimes. | HIGH | Requires sufficient samples per regime. Fallback to global weights if a regime has < 30 observations. Store per-regime weight sets in model_weights table. |
| **Ranked outperform/underperform signals for countries and sectors** | The core deliverable. Without directional rankings, the engine produces analysis, not decisions. | MEDIUM | Ranked list by composite score. Conviction derived from score magnitude and model confidence. Must separate tactical (1-3M) from strategic (6-12M) horizons. |
| **Survivorship-bias-free universe** | If the backtest only includes assets that exist today, historical performance is inflated. | MEDIUM | Use point-in-time universe construction. For ETFs: include ETFs that existed at each historical test date. Track delistings. |

---

### Differentiators (What Separates Serious From Toy)

These features require significant additional investment but produce qualitatively different output — the difference between a macro spreadsheet and an actual institutional-grade engine.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Probabilistic regime transition forecasts** | Instead of "we are in a Growth regime," output "72% probability of transitioning to Inflation regime within 6 months." Markov transition matrices estimated from historical regime sequences. | HIGH | Requires fitting a Hidden Markov Model (HMM) or Markov chain transition matrix on historical regime label sequences. Output: P(next regime | current regime). Differentiates from static regime-label-only outputs. |
| **Central bank action probability** | "68% probability of rate cut in next 2 meetings" — derived from yield curve shape, inflation surprise momentum, and historical CB reaction function, not from polling. | HIGH | Use Taylor-rule deviation as primary signal. Fed Funds futures implied path as calibration target. Logistic regression or Bayesian update model on historical CB decision data (FRED available). |
| **Probabilistic country/sector outperformance forecasts** | "Korea: 74% probability of positive excess return vs. MSCI World over next 6 months" — not just a rank, but a calibrated probability. | HIGH | Requires isotonic regression or Platt scaling on model scores to produce calibrated probabilities (not raw model confidence). Calibration curves should be shown. |
| **Multi-horizon signal decomposition (tactical vs. strategic)** | Different factors have different signal decay rates. Momentum/flows: weeks-months. Macro regime: quarters-years. Presenting both prevents users from misapplying tactical signals to strategic decisions. | MEDIUM | Build two separate scoring runs: tactical (uses momentum, flows, earnings revisions, shorter z-score windows) and strategic (uses macro health pillars, credit regime, CB stance). Show both in dashboard. |
| **Earnings revision factor with cross-sectional ranking** | Earnings revision momentum is one of the highest Sharpe macro-adjacent factors documented in academic literature (Macrosynergy, AQR). It bridges macro and micro in a way pure macro signals miss. | MEDIUM | Compute country-level and sector-level earnings revision z-scores from AV data. Cross-sectional rank at each date. Plug into factor scorer as a medium-weight input. |
| **Backtest P&L simulation vs. benchmark** | Hit rate alone doesn't capture sizing and regime-conditioned returns. Simulated P&L shows if the signal was actually tradable, not just directionally right. | HIGH | Simulate long/short portfolio: go long top quartile, short bottom quartile. Use ETF price returns as proxy. Benchmark against MSCI World or equal-weight. Report drawdown, max drawdown duration, regime-conditioned P&L. |
| **Factor contribution attribution** | "Korea scored +1.8 sigma. Growth factor contributed +1.2, carry +0.4, momentum +0.2." Without this, scores are black boxes users won't trust. | MEDIUM | Store per-factor weighted contributions alongside composite scores in allocation_signals table. Display as stacked bars in UI. |
| **Regime validation against known economic periods** | Labeling 2008 as a "Growth" regime destroys credibility. Regime model must be validated against canonical crisis/expansion/inflation periods before being used for signals. | LOW | Implementation: compare fitted labels to NBER recession dates, 2008 crisis, 2020 COVID shock, 2022 inflation regime. Output a validation report. This is more process than code. |
| **Configurable ETF/equity universe per country and sector** | Static hardcoded tickers become wrong fast. A universe that updates when better proxies are available is more robust. | MEDIUM | Store universe in a config file or DB table. Schema: {country: "KR", asset_class: "equity", ticker: "EWY", weight: 1.0, valid_from: "2003-01-01", valid_to: null}. Ingest and scoring scripts read from this config, not from scattered magic strings. |
| **Reuse of existing country-health pillar scores as factor inputs** | The 5-pillar country health scoring already computes structural factors (institutions, human capital, macro sustainability). These are legitimate factor inputs and reusing them avoids rebuilding validated pipelines. | LOW | Already exists in lib/country-health/. Fetch from DB in feature engineering step. Map pillars to factor categories. |

---

### Anti-Features (Look Good, Destroy Signal Integrity)

These features are commonly requested, commonly implemented in naive systems, and consistently destroy the credibility and accuracy of macro allocation models. Avoid or implement with explicit guardrails.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Lookahead bias in feature normalization** | "Just z-score the whole series" is easy to code and produces clean-looking backtests | Uses future data to set the mean and std of historical z-scores. Signal looks predictive because it uses information unavailable at that historical date. Results cannot be reproduced live. DB Seven Sins research identifies this as Sin #2. | Expanding-window z-score: at date T, compute mean/std from [T - window, T] only. More complex, but the only valid approach. |
| **Survivorship bias in universe construction** | Easier to just use today's ETF list | ETFs and equities that were delisted or merged are excluded. The surviving universe is biased toward winners. Historical hit rates are artificially inflated. DB research: Sin #1. | Point-in-time universe: at each backtest date, only include assets that existed and were liquid at that date. Track universe changes in the DB. |
| **Overfitting factor weights to the training period** | Maximize in-sample Sharpe looks impressive | Factor weights become tuned to the noise of the training period, not the signal. Reported Sharpe 2-3x higher than what will be achieved live. Each additional tuned parameter increases the probability of overfitting (Bailey et al., 2015). | Walk-forward cross-validation with a held-out OOS period. Use regularization (L1/Lasso) to push unnecessary factor weights toward zero. Report OOS metrics only — never in-sample Sharpe. |
| **Too many regimes (>8 without enough data)** | More regimes feel more precise | Each additional regime requires more historical data to estimate weights reliably. Rare regimes have too few samples for valid weight estimation. The model becomes fragile near regime boundaries. | Start with 4 regimes (growth/inflation quadrants). Add 5th-8th only if you have >30 clean samples per regime in the historical record. Sparse regimes: fall back to global weights. |
| **Daily signal updates for macro factors** | "Freshness" feels rigorous | Macro factors operate on weeks-to-months timescales. Re-scoring daily creates apparent precision without signal — it's just noise layered on signal. High-frequency updates also imply high turnover, which is not consistent with macro time horizons. | Daily ingest is correct. Signal recomputation: weekly or monthly for macro factors. Tactical factors (momentum, flows) can be weekly. Label the staleness and update cadence in the dashboard. |
| **Backtesting with transaction costs ignored** | Cleaner results, simpler implementation | A macro signal with 0.3% edge per month is eliminated by 0.5% transaction costs. DB Seven Sins Sin #5. Hidden turnover from monthly regime switches can be surprisingly large. | Apply realistic friction: 0.05–0.15% for liquid ETFs. Track turnover in the backtest output. Report net-of-friction Sharpe separately. |
| **Self-reported "conviction" without calibration** | Raw model scores are easy to relabel as probabilities | A score of 0.8 is not an 80% probability. Without calibration (Platt scaling or isotonic regression), conviction percentages are arbitrary and mislead users. | Either label scores as scores (not probabilities) or calibrate via isotonic regression on holdout data. Show calibration curve in the dashboard so users understand the model's reliability at different confidence levels. |
| **Using final-revised macro data in backtest** | FRED and other sources serve revised data by default | At the time of original data release, GDP, employment, and CPI figures are often substantially different from final revisions. Using revised data gives the model information that wasn't available historically. Vintage data is the correct input. | Use vintage/real-time data where available (FRED vintage archive). Where vintage is unavailable, add a data release lag: use GDP with a 1-quarter lag, CPI with a 1-month lag. Document which series have this limitation. |
| **Single point-in-time regime label for all signals** | Simpler to implement and explain | Regime boundaries are fuzzy — a country can be transitioning between regimes for weeks. A hard label creates false precision and causes signal discontinuities at regime switches. | Use soft/probabilistic regime membership: each date has a probability distribution across regimes. Factor scoring is a weighted average across regime-specific weights, weighted by regime probabilities. Harder to implement, but avoids cliff-edge behavior at regime transitions. |

---

## Feature Dependencies

```
Point-in-Time Feature Construction
    └──required by──> Regime Classifier
    └──required by──> Factor Weight Optimization (backtest)
    └──required by──> Walk-Forward Backtesting

Regime Classifier
    └──required by──> Regime-Conditional Factor Weights
    └──required by──> Probabilistic Regime Transition Forecasts
    └──required by──> Regime-Filtered Allocation Signals

Walk-Forward Backtesting
    └──required by──> Model-Derived Factor Weights
    └──required by──> Backtest P&L Simulation
    └──required by──> Hit Rate / Sharpe Reporting

Model-Derived Factor Weights
    └──required by──> Factor Scorer (country + sector)
    └──required by──> Factor Contribution Attribution

Factor Scorer
    └──required by──> Ranked Outperform/Underperform Signals
    └──required by──> Probabilistic Country/Sector Forecasts (requires calibration step)

Survivorship-Bias-Free Universe
    └──required by──> Walk-Forward Backtesting (must be in place before backtest runs)

Existing Country-Health Pillar Scores ──enhances──> Factor Scorer (plug in as inputs)
Existing ETF Flow Signals ──enhances──> Factor Scorer (plug in as inputs)

Multi-Horizon Signal Decomposition ──enhances──> Ranked Signals (tactical layer + strategic layer)
Factor Contribution Attribution ──enhances──> Allocation Dashboard (explains scores)
```

### Dependency Notes

- **Point-in-time feature construction** is the foundational dependency for everything. Build and validate this first — if it's wrong, all downstream results are wrong.
- **Regime classifier requires features**, not raw data. Cannot run regime detection until feature engineering is validated.
- **Factor weights require backtest**, which requires regime labels and features. Weight derivation is the terminal step of the offline pipeline.
- **Probabilistic forecasts require calibration data** — you need a holdout period of labeled data to calibrate score-to-probability mapping. Cannot calibrate until you have backtest results with OOS predictions and realized outcomes.
- **Contribution attribution is low-cost** once factor scores are per-factor weighted sums (which they should be structurally). No new data, just decomposition of existing math.
- **Survivorship-bias-free universe must be built before the backtest runs**, not as a later enhancement. Retrofitting it invalidates previously run backtest results.

---

## MVP Definition

### Launch With (v1) — Minimum Engine That Produces Trustworthy Signals

The v1 must produce signals you would actually act on. Anything that undermines signal integrity is a v0 bug, not a v2 feature.

- [ ] **Point-in-time feature construction** — foundational correctness requirement
- [ ] **Macro regime classifier** — 4 regimes minimum, validated against 2008/2020/2022
- [ ] **Core 6-factor set** (growth, inflation, flows, spreads, carry, momentum) with cross-sectional normalization
- [ ] **Walk-forward backtest** (10-year minimum) with OOS hit rate and Sharpe reporting
- [ ] **Model-derived regime-conditional factor weights** from backtest optimization
- [ ] **Ranked country + sector signals** with conviction scores (score magnitude)
- [ ] **Factor contribution attribution** — why does Korea score +1.8? Required for trust.
- [ ] **Survivorship-bias-free universe** — built before backtest runs
- [ ] **Dashboard view**: current regime, ranked allocation table, backtest stats

### Add After Validation (v1.x) — Once Signal Quality Is Confirmed

- [ ] **Multi-horizon decomposition** (tactical vs. strategic layer) — add after v1 signals show positive OOS hit rates
- [ ] **Backtest P&L simulation with friction** — add friction modeling once raw hit rate is confirmed positive
- [ ] **Probabilistic country/sector outperformance forecasts with calibration** — requires sufficient OOS data to calibrate
- [ ] **Central bank action probability** — add after core model is producing credible signals; standalone high-value feature

### Future Consideration (v2+) — After Product-Market Fit

- [ ] **Probabilistic regime transition forecasts** (HMM-based) — high value but high implementation complexity; defer until v1 signals are validated
- [ ] **Soft/probabilistic regime membership** — upgrade from hard labels to probability-weighted regime blending; defer until hard-label version is working
- [ ] **Real-time vintage data sourcing** — infrastructure investment; defer until data quality issues surface in live signals

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Point-in-time feature construction | HIGH | MEDIUM | P1 |
| Macro regime classifier (data-derived) | HIGH | HIGH | P1 |
| Core 6-factor set with normalization | HIGH | MEDIUM | P1 |
| Walk-forward backtest | HIGH | HIGH | P1 |
| Model-derived regime-conditional weights | HIGH | HIGH | P1 |
| Ranked country/sector signals | HIGH | MEDIUM | P1 |
| Survivorship-bias-free universe | HIGH | MEDIUM | P1 |
| Hit rate + Sharpe reporting | HIGH | LOW | P1 |
| Factor contribution attribution | HIGH | LOW | P1 |
| Multi-horizon signal decomposition | HIGH | MEDIUM | P2 |
| Backtest P&L simulation with friction | MEDIUM | MEDIUM | P2 |
| Probabilistic country forecasts (calibrated) | HIGH | HIGH | P2 |
| Central bank action probability | HIGH | HIGH | P2 |
| Configurable ETF/equity universe | MEDIUM | LOW | P2 |
| Earnings revision factor | MEDIUM | MEDIUM | P2 |
| Probabilistic regime transition forecasts | HIGH | HIGH | P3 |
| Soft regime membership (probability-weighted) | MEDIUM | HIGH | P3 |
| Vintage data sourcing | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch — signal integrity or core deliverable
- P2: Should have — materially improves output quality or usability
- P3: Nice to have — significant complexity, defer until P1/P2 validated

---

## Institutional Reference Analysis

How top macro shops structure similar features:

| Feature | Bridgewater-Style (All Weather / Pure Alpha) | Macrosynergy / AQR-Style (Quantamental) | Our Approach |
|---------|----------------------------------------------|----------------------------------------|--------------|
| Regime detection | Growth/inflation quadrant (4 environments), risk-balanced across all | Data-derived clustering on macro feature vectors (GMM / k-means) | Data-derived (GMM on macro features); not hardcoded to 4 quadrants, but validated against growth/inflation interpretation |
| Factor set | Growth surprises, inflation surprises, risk premium | Real equity carry, FX valuation, external balance, economic sentiment, terms-of-trade | Growth, inflation, flows (existing), spreads, carry, momentum; enrich with earnings revisions |
| Regime-conditional weights | Separate asset allocations per environment (public) | Factor timing based on regime | Regime-conditional weight sets per regime (Citadel/Bridgewater hybrid — explicit PROJECT.md design choice) |
| Backtesting | Not public; presumed sophisticated internal walk-forward | Point-in-time quantamental data, explicit no-hindsight normalization | Walk-forward, expanding-window z-scores, OOS-only reporting |
| Probabilistic outputs | Not public; internal Bayesian frameworks implied | Signal probabilities from calibrated scores | Calibrated probabilities via isotonic regression on OOS holdout |
| Universe | Global across all liquid instruments | 19+ country equity indices, cross-country and cross-sector ETFs | ETFs + single stocks, configurable universe per country/sector |

---

## Sources

- [Macrosynergy: Examples of Macro Trading Factors](https://macrosynergy.com/academy/examples-macro-trading-factors/)
- [Macrosynergy: A Scorecard for Global Equity Allocation](https://macrosynergy.com/research/a-macro-quantamental-scorecard-for-global-equity-allocation/)
- [Macrosynergy: Macro Factors and Sectoral Equity Allocation](https://macrosynergy.com/research/macro-factors-and-sectoral-equity-allocation/)
- [Macrosynergy: Systematic Equity Country Allocation with Macro Factors](https://macrosynergy.com/research/systematic-equity-country-allocation-with-macro-factors/)
- [Alpha Architect: Data-Driven Approach to Clustering Macroeconomic Regimes](https://alphaarchitect.com/clustering-macroeconomic-regimes/)
- [Regime-Switching Factor Investing with Hidden Markov Models (MDPI)](https://www.mdpi.com/1911-8074/13/12/311)
- [Tactical Asset Allocation with Macroeconomic Regime Detection (arXiv 2025)](https://arxiv.org/html/2503.11499v1)
- [Fidenza Macro: The Four Quadrant Global Macro Framework](https://www.fidenzamacro.com/p/the-four-quadrant-global-macro-framework)
- [Verdad Capital: Classifying Economic Regimes](https://verdadcap.com/archive/classifying-economic-regimes)
- [Inside Bridgewater's Pure Alpha: Systematic Macro Translation](https://navnoorbawa.substack.com/p/inside-bridgewaters-pure-alpha-how)
- [Deutsche Bank: Seven Sins of Quantitative Investing](https://hudsonthames.org/wp-content/uploads/2022/01/DB-201409-Seven_Sins_of_Quantitative_Investing.pdf)
- [Walk-Forward Optimization: QuantInsti](https://blog.quantinsti.com/walk-forward-optimization-introduction/)
- [Backtest Overfitting in the ML Era (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0950705124011110)
- [AQR: Exploring Macroeconomic Sensitivities](https://www.aqr.com/-/media/AQR/Documents/Journal-Articles/JPM-Exploring-Macro-Economic-Sensitivities.pdf)
- [Research Affiliates: Systematic Global Macro](https://www.researchaffiliates.com/publications/articles/563-systematic-global-macro)
- [Capital Flows Research: Macro Regime Tracker — Yield Curve Signal](https://www.capitalflowsresearch.com/p/macro-regime-tracker-the-yield-curve)

---

*Feature research for: Macro Allocation Engine (SGC Hedge Fund Backend)*
*Researched: 2026-04-08*
