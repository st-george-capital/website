---
status: diagnosed
trigger: "thorough diagnosis of why the macro allocation engine is producing bad results"
created: 2026-04-10T00:00:00.000Z
updated: 2026-04-10T00:00:00.000Z
goal: find_root_cause_only
---

## Current Focus

root_cause: five distinct bugs confirmed with evidence — see Root Causes below
status: diagnosis complete, no fixes applied

---

## Symptoms (as reported)

expected: Regime labels like "Regime 0"/"growth"/"risk-off", positive OOS Sharpe, hitRate > 0.5, meaningful conviction spread, distinct prob6m per ticker
actual:
  - regimeLabel = "zCredit" / "zInflation" / "zGrowth" (factor dimension names)
  - OOS Sharpe = -0.22 to -0.52, hitRate ~0.49, maxDrawdown ~-1.0
  - zCarry = null for all US sector ETFs (by design)
  - conviction scores cluster near 1.0 / 0.0 with one outlier at 0.0
  - prob6m values repeat within groups (0.546, 0.546, 0.546)

---

## Evidence

### E-1: Regime labels are factor dimension names (confirmed)
- checked: `autoNameRegime()` in `lib/macro-engine/regime/cluster.ts` lines 113-123
- found: The function returns `FEATURE_DIMENSIONS[dominantIdx]` where `FEATURE_DIMENSIONS = ['zGrowth', 'zInflation', 'zMonetary', 'zCredit', 'zCarry', 'zEarnings']`. There is no mapping to human-readable names.
- implication: Every regime label stored in the DB is a raw dimension name string, not a semantic macro regime name. This is the intended behavior of `autoNameRegime()` — it was designed this way.

### E-2: Duplicate regime label from autoNameRegime (confirmed)
- checked: RegimeTemplate table in DB
- found: k=4 was fit but both labelIndex=0 and labelIndex=2 are named "zCredit". The centroids are genuinely different (idx=0: [+0.41, +0.59, +0.23, +0.67, +0.43, +0.14], idx=2: [-0.25, +0.66, -0.20, -0.73, +0.37, -0.08]) yet both have "zCredit" as their dominant dimension. Only 3 distinct labels exist for k=4 clusters.
- implication: Regime clustering produced 2 effectively overlapping labels. The regime-conditional weight sets collapse one regime entirely. The `regimeLabel` lookup in the backtest will match idx=0 and idx=2 to the same weight set key, meaning one of the two "zCredit" clusters has no distinct weights — it falls back to the same weights as the other.

### E-3: Regime labels are daily pre-2018, weekly post-2017 (confirmed)
- checked: `regime_labels` date gap analysis
- found:
  - 2006-2017: ~230+ days/year labeled — clearly daily (1-day gaps)
  - 2018 onward: ~50-56 days/year labeled — clearly weekly (7-day gaps, confirmed by literal gap=7 between consecutive entries)
  - 2018-01-01 to 2018-01-08: daily; then switches to weekly cadence (~Jan 17, Jan 24, Jan 31...)
- implication: The regime pipeline was run twice or the feature matrix data shifts from daily to weekly cadence in 2018. FactorFeatureMatrix is also weekly from 2018 (SPY feature date gaps show 7-8 day gaps from mid-Jan 2018). The regime classifier's `buildDailyFeatureVectors` aggregates at the date level — if the underlying features are weekly, the regime vectors are weekly. This means the backtest, which uses `regimeMap.get(dateKey)`, misses regime labels on most daily feature dates from 2018+, defaulting to `'global'` for those dates.

### E-4: Factor weights are extremely small — near-zero across all dimensions (confirmed)
- checked: `factor_weight_sets` table, latest run (2026-04-10)
- found (global weights, 36166 samples):
  - wGrowth   = +0.024  (2.4e-2)
  - wInflation = -0.082  (8.2e-2, largest magnitude)
  - wMonetary  = +0.040
  - wCredit    = +0.012
  - wCarry     = 0.000  (effectively zero — all zCarry are null, imputed to 0)
  - wEarnings  = +0.059
- implication: Raw dot-product scores will be in the range ±0.05 to ±0.15. With min-max normalization over 12 tickers, the range between top and bottom score will be tiny (~0.1 * max_z_spread). The conviction spread is legitimate mathematically but the weights themselves are economically near-noise. The ridge regression is learning essentially nothing useful from the features.

### E-5: zCarry is null for 100% of all rows in the DB (confirmed)
- checked: Q8 query — all 12 tickers, all dates
- found: `has_carry = 0` for every ticker. zCarry is null for all 41,981 rows.
- implication: Every feature vector that goes into ridge regression has zCarry=0 (imputed). The 6th weight dimension (wCarry) is trained on a constant-zero column. The resulting wCarry is 0 by definition. This means the model is effectively a 5-dimensional regression, but one of those 5 (zGrowth) has 32% missing. Effectively the model runs on 4 live dimensions with significant missing data.

### E-6: zEarnings is null for 90% of rows (confirmed)
- checked: Q1 coverage data
- found: `has_earnings = 4,236` out of 41,981 total rows = 10.1% coverage
- implication: For 90% of observations, `zEarnings` is imputed to 0 before feeding ridge regression. The earnings dimension contributes near-zero signal. Ridge regression will assign a non-zero weight to it (wEarnings=+0.059 globally) purely from the 10% of rows that have data, but the practical contribution is negligible and may introduce noise.

### E-7: zGrowth is null for 32% of rows (confirmed)
- checked: Q1 coverage data
- found: `has_growth = 28,581` out of 41,981 = 68% coverage; 32% null
- implication: Significant imputation to zero for one of the primary macro dimensions. The regime vectors and weight regression both see a diluted growth signal.

### E-8: 40% of training rows are excluded by the >3 null filter (confirmed)
- checked: OOS Training Row Survival query
- found: total_rows=40,169 pre-2022; has_enough_dims (>3 non-null)=24,085 = 60% survive; excluded=16,084 = 40% dropped
- implication: The backtest drops 40% of potential training observations. This is correct behavior — these rows are genuinely too sparse — but it means the effective training set is significantly smaller than it appears from the raw row count.

### E-9: Non-null z-score distribution shows structural incompleteness (confirmed)
- checked: sparsity distribution query
- found:
  - 0 non-null: 180 rows (0.4%)
  - 1 non-null: 64 rows (0.2%)
  - 2 non-null: 1,316 rows (3.1%)
  - 3 non-null: 14,524 rows (34.6%)  ← excluded by >3 filter
  - 4 non-null: 21,661 rows (51.6%)  ← KEPT; but always missing zCarry + one other
  - 5 non-null: 4,236 rows (10.1%)   ← KEPT; missing only zCarry
  - 6 non-null: 0 rows (0%)          ← NO row has all 6 dimensions
- implication: Not a single row in the entire feature matrix has all 6 z-scores populated. The "5 non-null" group is rows with all except zCarry (which is always null). The predominant group (52%) has 4 non-null: inflation + monetary + credit + one of growth/earnings. The model never sees a complete feature vector.

### E-10: maxDrawdown near -1.0 indicates strategy repeatedly takes large losing positions (confirmed)
- checked: backtest_metrics table
- found: All runs show maxDrawdown between -0.99 and -1.00
- implication: The cumulative product of (1 + excessReturn) falls near zero. This means the strategy is consistently predicting the wrong direction — it's systematically anti-predictive. A maxDD of -1.0 on excess returns means the strategy consistently loses nearly the full cumulative excess return versus SPY, which is mathematically consistent with a model that has near-zero true predictive power but non-zero weights that happen to be negatively correlated with outcomes in some periods. The core problem is that the weights learned from 2004-2010 data are applied to 2010-2022 test windows, and the regime-conditional weighting uses a regime clustering that assigns ~63% of dates to "zCredit" (1,954/3,150 days), leaving the model effectively using global weights most of the time.

### E-11: Conviction clustering near 1.0/0.0 is a direct consequence of near-zero weight scale (confirmed)
- checked: allocation_signals table, Q10 conviction distribution
- found: Only 12 signals total. Distribution: 0.0 (1), 0.3 (1), 0.4 (1), 0.5 (1), 0.6 (2), 0.7 (1), 0.8 (1), 0.9 (1), 1.0 (3). The extreme values (0.0 and 1.0) dominate.
- checked: `normalizeConviction()` in `lib/macro-engine/signals/conviction.ts`
- found: Min-max normalization over the full set of raw scores. With tiny weights (±0.08 max), the raw score range is narrow but the normalization still spreads it to [0,1]. The clustering near endpoints is an artifact of EWZ having a clearly dominant raw score (Brazil: high zCredit + high zGrowth + high zMonetary in a credit-dominant regime) and SPY anchoring at the bottom (the only ticker with a consistently negative score given its regime-average z-scores). With only 12 tickers, a few outliers dominate the min-max range.
- implication: The conviction spread is not technically broken, but the normalization amplifies noise from tiny underlying weights into apparent extreme conviction.

### E-12: prob6m values cluster by decile bucket, not by ticker (confirmed)
- checked: allocation_signals table Q11
- found: EWZ/EWC/MCHI all show exactly 0.5463; EWA/EWU share 0.5936; XLF/EWG share 0.4785; XLE/XLV share 0.4334. This is 4 distinct prob6m values for 12 tickers.
- checked: `computeOutperformanceProbabilities()` in `lib/macro-engine/signals/probabilities.ts`
- found: Probabilities are looked up from a (regimeLabel, decileBucket) map. MIN_BUCKET_OBS=5. Multiple tickers share the same decile bucket because conviction scores cluster. With only 12 tickers normalized to [0,1], many share the same decile (e.g., convictions 0.95, 0.97, 1.0 all map to decile 9). The calibration lookup returns the same bucket hit-rate for all of them.
- implication: This is expected behavior for the calibration approach — it is NOT a bug per se. The behavior reflects that the underlying conviction distribution is not discriminating enough to spread tickers across 10 deciles. With only 12 tickers, you can have at most 12 non-empty decile buckets but the clustering means far fewer are populated.

### E-13: OOS backtest end date is 2021-12-30, not covering the full pre-2022 window symmetrically (confirmed)
- checked: backtest_metrics for latest run: `startDate=2007-12-31, endDate=2021-12-30, nPeriods=31,396`
- implication: 31,396 periods over ~14 years with ~12 tickers per date = ~2,242 date-ticker observations per year. At 21-day forward returns, this means ~2,242 observations per year. This is consistent with weekly feature data: 52 weeks × 12 tickers = 624 observations/year × 14 years ≈ 8,736. But 31,396 / 14 ≈ 2,242/year / 12 tickers ≈ 187 dates/year — closer to daily, suggesting the backtest IS using daily feature data for the pre-2018 period.

### E-14: Excess returns in backtest computed as actual_return - benchmark_return (verified correct)
- checked: `scoreWindowRows()` in `lib/macro-engine/backtest/index.ts` line 85
- found: `excessReturns.push(actualReturn - benchmarkReturn)` — this is arithmetic excess return (not log-return ratio), using the 21-day forward return for both asset and benchmark
- implication: The excess return computation is arithmetically correct. This is NOT a source of the Sharpe distortion. However: SPY is included in the tickers universe and also used as the benchmark. This means SPY's excess return over itself is always 0.0, which contributes neutral observations. This is not wrong per se but adds zero-signal observations that dilute metrics.

### E-15: The backtest Sharpe is computed on per-observation excess returns, not portfolio returns (architectural issue)
- checked: `aggregateMetrics()` in `lib/macro-engine/backtest/metrics.ts` and `scoreWindowRows()` in `backtest/index.ts`
- found: `excessReturns` is a flat array of every (ticker, date) pair's individual excess return vs SPY. The Sharpe is computed on this as if each observation is a portfolio return period. But in reality, this is a cross-sectional dataset: ~12 tickers × ~187 dates per year = ~2,244 observations per year treated as sequential "periods" for the Sharpe calculation. periodsPerYear = 252/21 = 12, but the actual number of distinct dates per year is ~187 for daily and ~50 for weekly. Treating per-ticker-date observations as independent sequential periods massively overstates the nPeriods count and produces a Sharpe ratio that is not interpretable as a portfolio Sharpe.
- implication: The Sharpe of -0.22 cannot be compared to a typical strategy Sharpe. However, since both numerator and denominator are computed from the same flat series, it still correctly indicates that mean(excessReturn) < 0 — meaning on average, the model's selections underperform SPY, confirming the weights are not predictive.

---

## Root Causes (ranked by severity)

### ROOT CAUSE 1 — CRITICAL: autoNameRegime returns raw dimension names, not semantic labels
**Bug type: Code design flaw**

`autoNameRegime()` in `cluster.ts` returns `FEATURE_DIMENSIONS[dominantIdx]` verbatim. The canonical regime template stores these names, and all subsequent `RegimeLabel` rows use them. The names `zCredit`, `zInflation`, `zGrowth` are column names, not economic regime names like "Credit Stress", "Inflationary Growth", "Risk-off".

Additionally, with k=4 clusters, two centroids both have `zCredit` as their dominant dimension (because zCredit has high absolute values in multiple macro environments). This means:
- Only 3 distinct regime labels exist for k=4 clusters
- labelIndex=0 and labelIndex=2 both map to `"zCredit"` in the `nameMap`
- The `fitWeightSetsForWindow` groups by `regimeLabel` string, so both are merged into one weight set
- The template matching maps new centroids to canonical templates by name, but two templates share the same name — creating ambiguity in the greedy assignment

**Fix direction:** Replace `autoNameRegime` with a lookup table that maps (dominant_dimension, dominant_sign) to semantic names (e.g., zCredit + high → "Credit Expansion", zCredit + low → "Credit Contraction"). Alternatively, use positional names ("Regime-0" through "Regime-3") since human naming is aspirational without hand-labeling. Also enforce unique label names within a fit's nameMap.

---

### ROOT CAUSE 2 — CRITICAL: zCarry is null for 100% of the feature matrix
**Bug type: Data gap / model design flaw**

Every single row in `factor_feature_matrix` has `zCarry = null`. Carry is by design null for US sector ETFs (correct decision per STATE.md). But the universe contains 5 US sector ETFs and 6 country ETFs — and the country ETFs also have null carry. The carry feature was apparently never populated for any ticker.

This means:
- The carry dimension in every training vector is imputed to 0
- Ridge regression fits wCarry = 0 (or near 0) because the carry column is a constant
- The carry dimension provides no discriminating signal in either regime classification or factor scoring
- The 6-dimension model is effectively a 5-dimension model (at best)

**Fix direction:** Either populate zCarry for country ETFs using their respective central bank rate differentials vs. USD, or explicitly remove zCarry from the feature set and use a 5-dimensional model. Continuing to include a zero-filled dimension adds noise and consumes a weight parameter with no value.

---

### ROOT CAUSE 3 — CRITICAL: Ridge regression learns near-zero weights because features and returns are nearly uncorrelated
**Bug type: Model design flaw / data quality**

Global weights from the latest run: wGrowth=0.024, wInflation=-0.082, wMonetary=0.040, wCredit=0.012, wCarry=0, wEarnings=0.059. These are 1-3 orders of magnitude smaller than what a predictive model would show (a typical factor weight in a cross-sectional equity model is in the range 0.1-0.5 with λ=0.05 regularization).

Contributing factors:
1. zCarry is always zero (E-5) — wastes one weight dimension
2. zEarnings is null 90% of the time (E-6) — imputation to 0 flattens this dimension
3. zGrowth is null 32% of the time (E-7) — partial imputation
4. The training labels (`fwdReturn`) are 21-day ETF returns — which are extremely noisy; R² of any linear factor model on 21-day returns is typically < 5%
5. With λ=0.05 regularization and a weak signal, the ridge penalty dominates and shrinks all weights toward zero

The model is technically correct — ridge regression with weak features will shrink weights to near-zero. But this means the scoring produces raw scores in the ±0.1 range, and the conviction normalization (min-max) creates apparent spread from near-noise.

**Fix direction:** This is partly a model design problem. Options:
(a) Use longer forward return horizon (63-day or 126-day) which reduces noise
(b) Standardize z-scores within each cross-section (ticker) before regression
(c) Lower λ (try 0.001) — but this risks overfitting
(d) Use rank-based features rather than raw z-scores to reduce outlier sensitivity
(e) Evaluate whether the factor feature construction itself is sound

---

### ROOT CAUSE 4 — SIGNIFICANT: Regime labels switch from daily (2006-2017) to weekly (2018+) sampling frequency
**Bug type: Data pipeline inconsistency / operational error**

The `regime_labels` table shows:
- 2006-2017: ~230 labeled days/year (daily cadence, gaps of 1-3 days consistent with trading days)
- 2018-2024: ~50-56 labeled days/year (weekly cadence, gaps of 7-8 days consistently)

The FactorFeatureMatrix also shows weekly feature dates from mid-January 2018 onward (feature date gaps jump to 7-8 days for SPY). This indicates the feature build process itself switched to weekly output at some point.

Consequence for the backtest: The `regimeMap` lookup in `scoreWindowRows` uses exact date-string matching (`regimeMap.get(dateKey)`). If a feature row has `featureDate = 2019-03-07` but the nearest regime label is `2019-03-06` (weekly snap), the map lookup returns `undefined`, and the code falls back to `'global'`. In the weekly-regime period, only dates that exactly match the weekly snap dates get regime-specific weights. All other dates use global weights.

However, since both regime_labels AND feature_matrix appear to be weekly from 2018+, the exact-match lookup may actually work for the 2018+ period — the concern is more around the dense 2006-2017 period where daily features must match daily regime dates. The correlated subquery in `computeOutperformanceProbabilities` (`LEFT JOIN regime_labels r ON r.date = (SELECT date ... ORDER BY date DESC LIMIT 1)`) handles this correctly. But the backtest's `trainingRegimeMap` does exact-date lookup, so daily feature rows from 2006-2017 will only match regime labels on trading days.

**Fix direction:** Verify feature and regime sampling frequencies are consistent. If weekly features are intentional for 2018+, this is acceptable but should be documented. Ensure the backtest regime lookup uses a "nearest prior date" approach (same as the calibration subquery) rather than exact-match.

---

### ROOT CAUSE 5 — MODERATE: prob6m values are identical within conviction deciles because the calibration bucket is too coarse
**Bug type: Expected behavior from thin calibration, not a code bug**

With only 12 tickers in the universe and conviction scores that cluster (many tickers share the same decile because the score range is narrow), each calibration bucket contains a mix of all tickers. Multiple tickers landing in the same (regime, decile) bucket get the same empirical hit rate. This is by design — but the coarseness means the system cannot discriminate between individual tickers within the same decile.

Contributing factors:
- The universe has only 12 tickers — far too few for 10-decile bucketing to be meaningful
- Conviction scores cluster because the underlying weights are tiny (see RC-3)
- The calibration is built from pre-2022 data; with weekly features, there are ~260 weeks × ~12 tickers × 4 regime labels = a very thin calibration dataset
- MIN_BUCKET_OBS=5 is achievable, but the buckets have low statistical power

**Fix direction:** Either reduce decile buckets (tertiles: low/medium/high), expand the ticker universe substantially (to 50+), or abandon the (regime, decile) bucketing in favor of a continuous calibration approach (isotonic regression on conviction scores vs. outcomes).

---

## Answers to Specific Questions

### Q1: Why is regimeLabel a factor dimension name like "zCredit"?
`autoNameRegime()` returns `FEATURE_DIMENSIONS[dominantIdx]` directly. This is the designed behavior — the function names a regime after its dominant z-score dimension. There is no mapping from dimension names to economic labels. This is a design flaw that makes the system hard to interpret but does not break the math (the labels are self-consistent strings used as lookup keys throughout the pipeline).

### Q2: Why is Sharpe negative and hitRate ~0.49?
Both causes are present: (a) the weight optimization is learning near-zero weights from a weakly correlated feature matrix (empty zCarry column + sparse zEarnings + noisy 21-day returns), so the model has near-zero predictive power; (b) the feature data quality is genuinely sparse — no row has all 6 dimensions, 40% of rows are dropped by the >3 null filter. The negative Sharpe combined with hitRate ~0.49 is consistent with a model that is producing essentially random signals with slight systematic negative bias in some windows. This is not a calculation error — the model genuinely has no edge.

### Q3: What fraction of FactorFeatureMatrix rows have ≥4 non-null z-scores?
61.7% of all rows (25,897 / 41,981) have ≥4 non-null z-scores.
For OOS training data (featureDate < 2022-01-01): 24,085 / 40,169 = 59.9% survive the >3 null filter.
Critically: 0 rows have all 6 non-null. The best possible row has 5 non-null (10.1% of rows), always missing zCarry.

### Q4: How many distinct regime labels exist? What are they? How stable are they over time?
Exactly 3 distinct labels: "zCredit" (1,954 days, 62%), "zInflation" (951 days, 30%), "zGrowth" (245 days, 8%).
k=4 was fit but two clusters collided on the "zCredit" name, so effectively only 3 regimes are in use.
Stability: Pre-2017, regimes are stable for full years (2006: all zCredit; 2010-2011: all zCredit; 2013-2015: all zInflation). Post-2017, regimes alternate ~monthly between zCredit and zInflation within each year. The regime is highly stable in long pre-2017 stretches but becomes volatile (monthly switching) post-2017.

### Q5: Is the backtest computing excess returns correctly?
Yes, arithmetically correct: `excessReturn = actualReturn - benchmarkReturn` where both are 21-day forward returns. SPY prices are validated before the scoring loop. However, the Sharpe is not computed as a portfolio Sharpe — it is computed as the mean/std of individual (ticker, date) excess return observations, which is a cross-sectional metric, not a time-series Sharpe. This makes the annualized Sharpe using `periodsPerYear = 252/21 = 12` incorrect — the effective number of independent periods is the number of distinct test dates, not the total number of (ticker, date) pairs.

### Q6: Are the factor weights plausible?
No. The latest global weights are all in the range ±0.001 to ±0.082. These are economically meaningless — a unit change in z-score (one standard deviation) changes the portfolio score by at most 0.08. For reference, a factor model with real predictive power typically shows weights with magnitudes of 0.1-0.5 per z-score unit. The near-zero weights are the ridge regression's response to finding near-zero correlation between z-scores and 21-day forward returns in the training data. This is the correct mathematical result given the data quality issues.

### Q7: What does the probability calibration look like — how many historical obs per (regime, decile) bucket?
Pre-2022, the calibration data has:
- zCredit: 24,948 obs
- zInflation: 11,705 obs
- zGrowth: 3,264 obs
- null (no regime match): 252 obs

Per regime, spread across 10 decile buckets → average ~2,495 obs per (zCredit, decile) bucket, ~1,171 per (zInflation, decile), ~326 per (zGrowth, decile). These counts are well above MIN_BUCKET_OBS=5, so the calibration IS using regime-specific buckets, not falling back to global. However, since multiple tickers share the same decile (due to conviction clustering), many of these observations are redundant cross-sections of the same few calibration hit rates. The prob6m values themselves are not obviously wrong — 0.546 for a 6m outperformance rate in a credit-dominated regime is plausible — but they have low discriminating power within regimes.

---

## Fix Priority Order

**Run order after fixes: regime-fit → backtest → signals (full pipeline re-run)**

| Priority | Issue | Type | Impact | Fix Description |
|----------|-------|------|--------|-----------------|
| P0 | zCarry always null | Data gap | Critical — wastes weight dimension | Populate carry for country ETFs OR drop zCarry from feature set |
| P0 | autoNameRegime returns dimension names | Code design flaw | High — confuses users, causes duplicate labels | Replace with semantic labels or enforce unique positional names |
| P1 | Duplicate "zCredit" label for k=4 | Code bug (consequence of P0) | High — collapses two distinct regimes | Fix after autoNameRegime fix; ensure unique labels within a fit |
| P1 | Near-zero weights / weak signal | Model design | Critical — no predictive edge | Extend forward return horizon to 63/126 days; address sparse features |
| P2 | zEarnings 90% null | Data gap | Moderate — imputation dilutes signal | Improve earnings data coverage or remove from feature set until populated |
| P2 | Backtest Sharpe computed as cross-sectional metric | Architectural | Moderate — metric is misleading | Compute Sharpe on daily portfolio returns (aggregate per date, then time-series Sharpe) |
| P3 | Regime label sampling inconsistency (daily→weekly) | Operational | Moderate — regime lookup misses dates | Standardize sampling cadence; use nearest-prior-date lookup in backtest regime map |
| P4 | Conviction calibration too coarse for 12 tickers | Model design | Low (symptomatic) | Will improve if weights improve; long-term: expand universe or reduce decile count |

---

## What Needs Re-run After Fixes

The pipeline stages and their dependencies:

```
feature-build → regime-fit → backtest → signals
```

After each fix category:

**After fixing zCarry data (P0):**
Full pipeline re-run from `feature-build` onward. All downstream results are stale.

**After fixing autoNameRegime + duplicate label (P0/P1):**
Re-run from `regime-fit` onward (backtest + signals). Feature matrix is unaffected.

**After extending forward return horizon (P1):**
Re-run backtest only. Regime labels are unaffected. Signals depend on backtest output (weight sets).

**After fixing cross-sectional Sharpe computation (P2):**
Re-run backtest metrics aggregation only (no re-fit needed — just recompute from existing WindowResult data).

**After fixing regime lookup cadence (P3):**
Re-run backtest only (regime-fit output is unchanged).

**Minimum re-run to get coherent results (fixing P0 + P0/P1 only):**
```
regime-fit → backtest → signals
```

Note: Even after fixing all code bugs, the model may continue to show low predictive power if the fundamental signal quality is poor. The near-zero weights are not a code bug — they are the honest output of ridge regression on noisy 21-day returns with sparse features. Fixing zCarry and extending the horizon are the highest-leverage bets on improving the underlying signal, but they are not guaranteed to produce a positive Sharpe.
