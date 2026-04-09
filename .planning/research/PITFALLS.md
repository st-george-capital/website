# Pitfalls Research

**Domain:** Macro Quantitative / Systematic Macro Allocation Engine
**Researched:** 2026-04-08
**Confidence:** HIGH (look-ahead bias, overfitting, regime instability); MEDIUM (calibration, survivorship bias specifics for ETFs); HIGH (live serving contamination)

---

## Critical Pitfalls

### Pitfall 1: Look-Ahead Bias in Feature Construction

**What goes wrong:**
The historical feature matrix is built using data that was not yet available at each point in time. For example: z-scores computed using the full 20-year dataset before slicing into train/test windows; rolling windows that include the current observation in the "past" window anchor; FRED series that use revised values (the revised value was not the value available at time T). Backtest hit rates look excellent. Live performance collapses. The factor weights learned are spurious — they were trained on information the model would not have had in real time.

**Why it happens:**
Vectorized pandas/numpy operations make it trivially easy to compute a z-score across the full time series. The bug is invisible: `df['z'] = (df['x'] - df['x'].mean()) / df['x'].std()` uses the full-sample mean and std, which includes future observations. No error is thrown. The result looks numerically correct.

**How to avoid:**
Implement point-in-time feature construction as the only way to build the feature matrix. For any historical date T, filter the source data to `date <= T` before computing any rolling statistic. Use `df.expanding().mean()` or `df.rolling(N).mean()` rather than whole-series statistics. For FRED data, store and use vintage values (the value as-of the release date), not the final revised value. Walk-forward cross-validation enforces this structurally — the test window can only see data the train window did not.

**Warning signs:**
- Backtest Sharpe ratio above 2.0 for macro signals (macro signals are inherently noisy; extraordinary Sharpe in backtest is a red flag)
- Factor weights that seem unreasonably large for one factor
- Strategy appears to "know" inflection points precisely — e.g., selling exactly at a cycle peak
- Performance drops sharply when you add a 1-week publication lag to data

**Phase to address:**
Phase 2 (Feature Engineering). This must be enforced at the point where the feature matrix is constructed, before the backtester ever sees data. Add an automated test: for each row in the feature matrix, assert that no source data from a date after that row's date was used.

---

### Pitfall 2: Overfitting Factor Weights to the Training Window

**What goes wrong:**
The optimizer finds weights that maximize hit rate or Sharpe over the training period. Those weights exploit idiosyncratic patterns in that specific window (e.g., 2010–2020 U.S. tech cycle) rather than generalized macro relationships. Out-of-sample, the weights perform at or below random. The more factors you include and the more optimization iterations you run, the worse this gets — this is the multiple comparisons / data snooping problem: with enough degrees of freedom, any random dataset can be "fit" to show positive returns.

**Why it happens:**
Standard optimization (maximize in-sample Sharpe) has no penalty for complexity. Researchers add more factors because each additional factor seems to improve the training window result. The number of effective trials is often much larger than it appears: testing 20 factor combinations × 5 weighting schemes × 3 lookback windows = 300 effective comparisons, each of which has a chance of appearing significant purely by luck.

**How to avoid:**
Use walk-forward optimization with a strict train/test split ratio (e.g., train on 15 years, test on 5, no overlap). Report only the out-of-sample test window results as "the model's performance." Apply the Deflated Sharpe Ratio to correct for the number of strategies tried. Prefer regularization (ridge/lasso on factor weights) over unconstrained optimization. Keep the factor count minimal — macro regimes are driven by 4–6 well-understood forces (growth, inflation, liquidity, flows, spreads, commodities), not 30 micro-factors. Add a regime-sparse fallback: if a regime has fewer than N historical samples (e.g., N=20), use global weights rather than regime-specific weights.

**Warning signs:**
- Adding more factors always improves backtest performance (should plateau or degrade at some point)
- Factor weights that flip sign between training windows
- The optimal weight for a factor changes by more than 50% between rolling windows
- Backtest Sharpe/hit rate in training period is materially higher than in the held-out test period

**Phase to address:**
Phase 3 (Backtester). The walk-forward structure must be defined before any optimization runs. The test window results must be computed and stored separately from the training window results. The dashboard should display only the test-window hit rates prominently.

---

### Pitfall 3: Regime Label Instability

**What goes wrong:**
The regime classifier (k-means or HMM) is re-fit whenever new data arrives. Each re-fit produces new cluster centroids, and the cluster numbering is arbitrary — what was "Regime 2" (high-growth, low-inflation) last month may become "Regime 0" after the next fit. Downstream code assumes regime labels are stable identifiers. The allocation engine silently serves the wrong factor weight set for weeks before anyone notices.

A related problem: regimes switch too frequently. If the classifier detects a new regime every 2–3 weeks, the factor scoring engine is effectively re-weighting at high frequency, defeating the purpose of a macro signal (which has a natural resolution of weeks-to-months).

**Why it happens:**
K-means and GMM are non-deterministic (random initialization) and label-permutation invariant — they produce no canonical ordering of clusters. HMMs share the label-switching problem and additionally exhibit poor stability during volatile periods. Researchers fit the classifier, verify the current labels look sensible, ship it, and only discover the instability after a re-fit permutes the labels.

**How to avoid:**
Use template-based label stabilization: after initial fitting, anchor regime identities by their economic interpretation (e.g., "the regime with highest yield curve spread z-score is 'tightening'"). On every re-fit, match new clusters to the canonical templates using minimum Wasserstein distance between cluster distributions rather than label index. Enforce a minimum regime dwell time: require a regime to persist for at least K consecutive observations before switching the live label. Store the `regime_label_mapping` table alongside `regime_labels` so re-fitting is auditable.

**Warning signs:**
- Regime label assigned to the most recent date changes between two script runs with no new data
- Current regime changes more than once every 3 weeks on average
- Live allocation signals flip between "overweight" and "underweight" for the same country/sector within a 2-week window with no macro catalyst

**Phase to address:**
Phase 3 (Regime Classifier). Template matching and dwell-time enforcement must be built into `regime/label-history.ts` before any backtest runs — backtest results depend on stable regime labels. Add a test: apply the classifier twice to identical data; assert the resulting labels are identical (deterministic seeding + template matching).

---

### Pitfall 4: Survivorship Bias in ETF Universe

**What goes wrong:**
The ETF universe is defined as the list of ETFs that exist today. When backtesting 20 years, any ETF launched after 2005 or that was liquidated before now is missing from the universe. The model is evaluated only against survivors — instruments that happened to perform well enough to remain in existence. According to Morningstar research, roughly 58% of funds that existed in 1999 were no longer in existence by 2019. Overstating backtest returns by 4–6% annually is a common documented consequence.

**Why it happens:**
It is much easier to pull the current universe from an API than to reconstruct the historical point-in-time universe. Alpha Vantage returns data for currently listed instruments by default. The researcher does not think to ask "what ETFs existed in 2007 that no longer exist today?"

**How to avoid:**
For ETF-based backtesting (as opposed to stock selection), survivorship bias is less severe than for equities — ETF liquidations are less frequent than stock delistings, and liquidated ETFs usually merge into surviving funds rather than going to zero. However, the universe configuration file (`lib/macro-engine/ingest/universe.ts`) should document the launch date of each ETF and exclude it from backtest periods before its inception date. For country/sector ETFs launched after 2010 (e.g., many EM ETFs), fall back to the underlying index total return or a proxy ETF for the pre-inception period, with this substitution clearly documented. For any ETF that was liquidated during the backtest period, include its return history through delisting and treat the subsequent period as "no position."

**Warning signs:**
- Using ETFs with inception dates after 2010 to model pre-2010 macro regimes
- Not knowing the inception date of each ETF in your universe
- Country ETFs that currently exist were not available for a significant portion of the target 20-year window

**Phase to address:**
Phase 1 (Data Ingestion + Universe Config). The `universe.ts` config file should include inception dates for every instrument. The ingest script should assert that no price data is requested before the instrument's inception date. During backtest, the simulation must check the instrument's available history before including it in a period.

---

### Pitfall 5: Data Snooping via Multiple Comparisons (The "Garden of Forking Paths")

**What goes wrong:**
You test factor A. It doesn't show a significant hit rate. You try factor B. Better. You try factors A+B together. Better still. You adjust the lookback window. You try 3 months, 6 months, 12 months. You adjust the z-score normalization period. Eventually a combination works. You report the final result. The problem: you have implicitly tested dozens of combinations, each of which would have a random chance of appearing significant. The final "positive" result reflects selection, not discovery. This is the multiple comparisons / data snooping problem. Institutional quants estimate this affects the majority of published systematic strategies.

**Why it happens:**
Research is inherently iterative. When a factor doesn't work as expected, the natural response is to tweak parameters. There is no formal accounting of the number of combinations tried. The researcher genuinely believes they found a real signal.

**How to avoid:**
Pre-register the factor set before running any optimization — commit the factor list to a document or git commit before touching the data. Apply the Deflated Sharpe Ratio (DSR) or Bonferroni correction when reporting hit rates. Reserve a final holdout period (e.g., the most recent 2 years) that is never touched during research — the model only sees it once, after all development is complete. Treat the holdout as a "one-shot" reality check. Limit the total number of factors to those with an a-priori economic rationale.

**Warning signs:**
- You have tried more than 3 combinations of factor configurations before settling on the final set
- The factor weights look surprisingly "clean" — round numbers or heavily skewed to one factor
- The strategy only works for a specific lookback window and doesn't generalize to ±1 month

**Phase to address:**
Phase 3 (Backtester). The backtest run script should log every parameter combination tried (even informally). The `backtest_runs` table should store the parameters alongside results so the total search space is auditable. Reserve the most recent 2 years of data from the start — it must not be used until the model is finalized.

---

### Pitfall 6: Probability Miscalibration in Forecasts

**What goes wrong:**
The model outputs `P(regime transition) = 0.85` or `P(country outperforms) = 0.70`. These numbers are taken at face value. In reality, discriminative classifiers (logistic regression, gradient boosted trees, softmax outputs from neural networks) are systematically overconfident — predicted probabilities do not match empirical frequencies. A model that says "85% confident" may only be correct 55% of the time. When the dashboard displays these probabilities, they mislead rather than inform.

**Why it happens:**
Probability calibration is a separate step from model training. Most tutorials stop at training. Calibration requires a held-out calibration set (separate from the test set) and either Platt scaling or isotonic regression applied post-training. This extra step is often skipped.

**How to avoid:**
After training the regime classifier and factor scorer, compute a calibration curve on a held-out calibration set (not the test set). If the curve deviates significantly from the diagonal, apply Platt scaling or isotonic regression to correct the outputs. Report the Expected Calibration Error (ECE) as a model quality metric alongside hit rate. For macro regime probabilities specifically: because macro data is low-frequency (monthly) and non-stationary, consider using a simpler Bayesian approach (Dirichlet posterior over regime transitions) which has better calibration properties than discriminative classifiers on small samples.

**Warning signs:**
- Predicted probabilities frequently cluster near 90%+ even for noisy signals
- Reliability diagram (predicted probability vs. actual frequency) shows a flat or S-curve rather than a diagonal
- The model never outputs probabilities in the 40–60% range (should be common for uncertain macro transitions)

**Phase to address:**
Phase 4 (Factor Scorer + Probabilistic Forecasting). Calibration must be evaluated before signals are written to the dashboard. The `probabilistic_forecasts` table should include a `calibration_error` field per model version.

---

### Pitfall 7: Future Data Leakage into the Live Serving Path

**What goes wrong:**
The offline pipeline computes features and signals and writes them to the database. The online serving path reads from the database. The contamination is subtle: the feature engineering script accidentally uses `MAX(date)` from the full price history to normalize a z-score instead of the date-bounded anchor. Or the cron that runs `run-scoring.ts` reads FRED data that was revised after yesterday (FRED revises historical data silently — the number you fetch today for "2023-Q3 GDP" may be different from the number available on 2023-10-01). Or the API route accidentally re-runs a feature computation inline using all available data. The live signal then encodes information that was not available when the model was trained, producing allocations that cannot be replicated going forward.

**Why it happens:**
The boundary between "data as it was known at time T" and "data as it is known today" is not enforced at the database or API layer — it is a disciplinary convention that is easy to violate. FRED's silent historical revisions are a particularly common source of contamination that surprises even experienced quants.

**How to avoid:**
The Signal Store (PostgreSQL) is the only interface between offline and online — enforce this as a hard architectural rule. The API routes must only read from pre-written result rows, never call any function from `lib/macro-engine/features/` or `lib/macro-engine/regime/`. Store FRED data with `fetch_date` metadata so it is possible to reconstruct "what FRED said on date X" rather than "what FRED says today about date X." Use FRED's vintage API (ALFRED — FRED's archival service) for historical backtesting to get real-time vintage values. For the scoring cron, assert that the data snapshot used has a `data_as_of` timestamp — and log it to the `ingest_log` — so contamination is detectable in audit.

**Warning signs:**
- The `run-scoring.ts` script calls any function that reads from `macro_snapshots` with no date ceiling
- FRED series in the feature matrix use the current (revised) values rather than first-release values
- Any Next.js API route calls `buildCurrentFeatureSnapshot()` or similar computation function
- The feature matrix contains rows with `data_as_of` dates in the future relative to the signal date

**Phase to address:**
Phase 1 (Data Ingestion) for FRED vintage discipline; Phase 5 (Signal Server) for the hard read-only boundary on the online path. Add an integration test: after running `run-scoring.ts`, query the API route and assert the returned signal's `computed_at` timestamp predates any future data.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode factor weights from intuition | Faster MVP | Weights are unjustifiable, cannot be improved, and may cause regulatory/credibility issues for a hedge fund tool | Never |
| Use full-sample z-scores for feature engineering | Simpler code | Guarantees look-ahead bias; invalidates all backtest results | Never |
| Define ETF universe as "whatever ETFs exist today" | Faster setup | Survivorship bias; backtest appears better than live performance | Only acceptable if universe is restricted to ETFs with 20+ year history (e.g., SPY, EEM) |
| Skip calibration, display raw classifier probabilities | Faster dashboard | Misleading probability displays; erodes analyst trust when forecasts are systematically overconfident | Never for displayed probabilities; acceptable internally for signal ranking |
| Use same data split for feature selection and model evaluation | Simplicity | Data snooping; reported hit rate is meaningless | Never |
| Run feature engineering inline on the API request path | Avoids cron setup | Dashboard becomes slow/unreliable; Vercel timeouts; risk of partial computation contaminating signals | Only for a local development debug mode, never in production |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| FRED API | Fetching current revised values for historical dates (e.g., current value of 2010-Q1 GDP) — not the value available in 2010 | Use ALFRED (FRED's vintage API) for backtesting: `api.stlouisfed.org/fred/vintage_dates` to retrieve real-time release values |
| Alpha Vantage | Fetching daily OHLCV without checking if the ETF existed at the requested date | Store inception dates in universe config; assert `requested_start >= inception_date` before any fetch |
| Alpha Vantage | Running all 50 ETF fetches concurrently, hitting the 75 req/min rate limit | Sequential fetch with stagger (existing `lib/alpha-vantage.ts` pattern) — do not parallelize |
| PostgreSQL (regime labels) | Assuming cluster label integers are stable across re-fits | Store label-to-template mapping in `regime_label_mapping` table; re-fit output is matched to canonical templates before writing |
| Existing country-health pipeline | Assuming country-health scores are current when the feature build runs | Enforce cron ordering: `run-ingest.ts` (country-health) must complete before `run-ingest.ts` (macro-engine) starts |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Running backtest in a Next.js API route | Vercel timeout, 504 errors, partial results stored | Backtest is always a script (`scripts/macro-engine/run-backtest.ts`), never an HTTP handler | Immediately on any 20-year backtest run |
| Fetching 20 years of daily price history on every cron run | Ingest takes hours, hits AV rate limits | Incremental ingest: fetch only dates after `MAX(date)` in `price_history` table | After initial load is complete |
| Building full feature matrix in memory for 50 instruments × 20 years | OOM on standard Node.js heap | Stream feature computation by instrument or by year; use database for intermediate results | At ~50 instruments × daily data |
| Re-fitting the regime classifier daily | Daily label instability, excessive compute | Re-fit regime classifier monthly or on-demand; daily cron only runs `run-scoring.ts` | Immediately — daily re-fits defeat regime stability |

---

## "Looks Done But Isn't" Checklist

- [ ] **Feature engineering:** Uses point-in-time windows for every rolling statistic — verify by checking that `buildPointInTimeFeatures(date, data)` never reads `data.filter(r => r.date > date)`
- [ ] **Backtest hit rates:** Displayed numbers are from the held-out test window, not the training window — verify by checking which date range is labeled "test" in `backtest_runs` table
- [ ] **Regime labels:** Are stable across re-fits without manual intervention — verify by running the classifier twice on identical data and asserting label agreement
- [ ] **FRED data:** Stored with `fetch_date` and uses vintage values for backtesting — verify by checking that the 2008 recession data rows match FRED's first-release values, not current revised values
- [ ] **ETF universe:** Includes inception dates and backtest excludes instruments before their inception — verify by checking that no price rows exist before `inception_date` in the universe config
- [ ] **API routes:** Zero calls to any computation function from `lib/macro-engine/` — verify by grepping for imports of `features/`, `regime/`, `backtest/` in `app/api/` files
- [ ] **Probabilities:** Have been calibration-checked against a held-out calibration set — verify by producing a reliability diagram before any probabilities reach the dashboard
- [ ] **Holdout set:** Most recent 2 years of data have never been touched during development — verify by checking that `run-backtest.ts` has a hard-coded `test_end` date that was set before any research began

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Discovered look-ahead bias after backtest is complete | HIGH | Rebuild the feature matrix using point-in-time construction; re-run full backtest; discard previous factor weights |
| Overfitted weights discovered on live signal review | MEDIUM | Re-run backtest with stricter regularization; apply Deflated Sharpe Ratio; present revised (lower) out-of-sample hit rates |
| Regime label permutation discovered in production | MEDIUM | Implement template-matching retroactively; audit `allocation_signals` rows for the affected period and mark them invalid |
| FRED vintage contamination discovered mid-project | HIGH | Re-fetch FRED series using ALFRED vintage API; rebuild feature matrix; re-run backtest |
| ETF survivorship bias discovered post-backtest | MEDIUM | Identify ETFs with inception dates after 2005; replace pre-inception rows with proxy index data or exclude from those periods; re-run backtest |
| Probability miscalibration discovered post-dashboard launch | LOW | Apply Platt scaling post-hoc using held-out calibration set; update `probabilistic_forecasts` table with corrected values |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Look-ahead bias in feature construction | Phase 2: Feature Engineering | Unit test: `buildPointInTimeFeatures(date, data)` never reads data after `date` |
| Overfitting factor weights | Phase 3: Backtester | Report only test-window Sharpe/hit rate; training vs. test performance gap < 15% |
| Regime label instability | Phase 3: Regime Classifier | Classifier produces identical labels on two runs with identical data (deterministic seed + template matching) |
| ETF survivorship bias | Phase 1: Data Ingestion + Universe Config | Universe config has inception dates; no price rows exist before inception |
| Data snooping / multiple comparisons | Phase 3: Backtester | Factor set pre-committed before optimization; holdout period untouched until model finalized |
| Probability miscalibration | Phase 4: Factor Scorer + Probabilistic Forecasting | Calibration curve (reliability diagram) produced and passes ECE < 0.10 threshold |
| Future data leakage into serving path | Phase 1 (FRED vintage) + Phase 5 (Signal Server) | No `lib/macro-engine/features/` imports in `app/api/`; FRED rows have `fetch_date` metadata |

---

## Sources

- [Look-Ahead Bias: The Invisible Killer (Quantreo)](https://www.newsletter.quantreo.com/p/look-ahead-bias-the-invisible-killer)
- [Look-ahead Bias in Quantitative Finance: The Silent Killer (Medium)](https://medium.com/funny-ai-quant/look-ahead-bias-in-quantitative-finance-the-silent-killer-of-trading-strategies-bbbbb31d943a)
- [The Critical Pitfalls of Backtesting Trading Strategies (Starqube)](https://starqube.com/backtesting-investment-strategies/)
- [Why Most Backtests Fail: Overfitting, Look-Ahead Bias, and Data Snooping (Frontier Ledger)](https://frontierledger.ai/foundations-core-concepts/why-most-backtests-fail-overfitting-look-ahead-bias-and-data-snooping)
- [Walk-Forward Optimization: How It Works, Its Limitations (QuantInsti)](https://blog.quantinsti.com/walk-forward-optimization-introduction/)
- [Backtest Overfitting in the Machine Learning Era (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0950705124011110)
- [A Reality Check for Data Snooping (White, ResearchGate)](https://www.researchgate.net/publication/4896389_A_Reality_Check_for_Data_Snooping)
- [Survivorship Bias in Backtesting Explained (LuxAlgo)](https://www.luxalgo.com/blog/survivorship-bias-in-backtesting-explained/)
- [Survivorship Bias in Trading (QuantifiedStrategies)](https://www.quantifiedstrategies.com/survivorship-bias-in-backtesting/)
- [A Primer on Survivorship Bias (QuantRocket)](https://www.quantrocket.com/blog/survivorship-bias/)
- [Regime-Switching Factor Investing with Hidden Markov Models (MDPI, 2020)](https://www.mdpi.com/1911-8074/13/12/311)
- [Explainable Regime-Aware Investing (arXiv, 2026)](https://arxiv.org/html/2603.04441)
- [Classifying Market Regimes (Macrosynergy)](https://macrosynergy.com/research/classifying-market-regimes/)
- [Hidden Trap in Algorithmic Trading: Data Leakage in Backtesting (Medium)](https://medium.com/@wl8380/the-hidden-trap-in-algorithmic-trading-data-leakage-in-backtesting-622a13e01cb9)
- [Tail Calibration of Probabilistic Forecasts (Taylor & Francis, 2025)](https://www.tandfonline.com/doi/full/10.1080/01621459.2025.2506194)
- [Portfolio Optimization and Backtesting (Book slides, Palomar)](https://portfoliooptimizationbook.com/slides/slides-backtesting.pdf)

---
*Pitfalls research for: Macro Quantitative Allocation Engine (SGC Hedge Fund Backend)*
*Researched: 2026-04-08*
