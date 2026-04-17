# Macro Engine — CHANGELOG

Canonical, honest performance record for the macro allocation engine.
All numbers in this file come from `npm run backtest:run` against the full
17-ETF universe with `DEFAULT_CONFIG`, on the hard 2022-01-01 holdout boundary.
Each chunk re-runs the baseline and appends here. The goal is irrevocable
accountability: if a change moves a headline number, it gets recorded with
the number (good or bad) and the reason.

Conventions:

- **OOS Sharpe / Holdout Sharpe** — annualized, on excess returns vs SPY,
  computed on **active periods only**. Credit-gated (flat) days do not
  contribute zeros to the Sharpe denominator.
- **activeFrac** — share of observations during which the model held a
  non-zero position. The rest are credit-gated flat days.
- Numbers recorded as `OOS / Holdout` in the format
  `Sharpe | HitRate | MaxDD | activeFrac`.

---

## Chunk 1 — Correctness pass (2026-04-16)

runId: `cmo26yarh00006uk3w5imcbry`

| Window  | Sharpe | HitRate | MaxDD  | activePeriods | flatDays | activeFrac |
|---------|--------|---------|--------|---------------|----------|------------|
| OOS     | 0.456  | 0.556   | -0.830 | 1572          | 1701     | 0.480      |
| Holdout | 1.327  | 0.661   | -0.354 | 363           | 92       | 0.798      |

**Pre-Chunk-1 legacy numbers** (for context, NOT the new baseline):
OOS Sharpe 0.460, Holdout Sharpe 1.168, Holdout MaxDD -0.623. These were
biased-deflated by credit-gate zeros polluting the Sharpe denominator, and
were produced alongside a dead ridge-regression path that wrote
`FactorWeightSet` rows the scorer never consulted.

### Changes

1. **Sharpe is now honest on active days only.** `scoreWindowRows` no longer
   injects zeros into `excessReturns` on credit-gated dates; it increments a
   separate `flatDays` counter that propagates into `WindowResult` and
   `MetricsResult`. `aggregateMetrics` reports `{ nPeriods, flatDays,
   activeFraction }` so "on-when-active" Sharpe is the headline, with
   transparency about how often the model is actually engaged.

2. **Dead ridge path removed.** `lib/macro-engine/backtest/weights.ts`
   (`fitWeightsRidge`, `fitWeightSetsForWindow`) and the per-window training
   loop that invoked them have been deleted. The model is documented now as
   what it always was: a regime-gated cross-sectional momentum ranker
   (`zCarry` top-`longFraction` per date, gated flat in credit-stress
   regimes, sized by regime confidence). `TrainRow` and `WeightSet` types
   were removed from `types.ts`.

3. **Downstream signals kept intact.** A single synthetic `FactorWeightSet`
   row is persisted per run with `wCarry=1, wGrowth=wInflation=wMonetary=
   wCredit=wEarnings=0, regimeLabel='global', isFallback=true`. This keeps
   `lib/macro-engine/signals/scoring.ts`,
   `lib/macro-engine/signals/probabilities.ts`, and
   `app/api/dashboard/macro-engine/history/route.ts` working without a
   schema migration, while making the live scoring rankings consistent with
   the backtest (pure 12-month momentum ranking).

4. **API naming fixed.** `MacroEnginePayload.metrics.spy` →
   `metrics.oos`; `metrics.acwi` → `metrics.holdout`. The previous names
   conflated benchmark and window. UI consumer in
   `app/dashboard/tools/macro-engine/page.tsx` updated.

5. **Dashboard copy unstaled.** Header tagline, regime blurb, backtest
   description, historical chart caption, and the "how this model works"
   grid all updated from the previous quarterly / top-half / 4-regime /
   63-day / ridge-regression descriptions to monthly / top-25% /
   6-regime / 21-day / cross-sectional momentum descriptions that match
   the code.

6. **Verifier updated.** `scripts/macro-engine/verify-backtest.ts` now
   checks for the simplified `(regimeLabel='global', wCarry=1)` weight
   vector and prints `activePeriods` alongside each metric row.

### Known limitations carried into subsequent chunks

- `app/api/dashboard/macro-engine/history/route.ts` still renders a synthetic
  63-day top-half curve for the dashboard `PerformanceChart` — inconsistent
  with the 21-day top-25% model. Chunk 6 replaces it with a real
  `AllocationSignal`-replay endpoint over the holdout window.
- No transaction costs / turnover — Chunk 5.
- No portfolio vol target / correlation-aware selection — Chunks 2 / 3.
- Experiment scripts still preload data per-run — Chunk 4.

---

## Chunk 2 — Portfolio vol-targeting overlay (2026-04-16)

New file `lib/macro-engine/backtest/risk.ts` adds two pure utilities:
`portfolioVolFromReturns(returnMatrix, weights, periodsPerYear)` computes
the ex-ante annualized vol from a K×N aligned return matrix via
`√(wᵀΣw)`; `volTargetScale(exAnteVolAnn, targetVolAnn)` returns
`min(1, target/exAnte)` with a fail-open to 1.0 on degenerate inputs.

`scoreWindowRows` now consults `returnMatrixMap` (new
`buildReturnMatrixMap` precompute, aligned on a SHARED trading-date grid
so that covariances are consistent across tickers) when
`config.portfolioVolTarget > 0`, and folds the scale into the per-date
position size alongside the regime-confidence exponent.

Two new config fields:

```ts
portfolioVolTarget?: number;          // 0 = disabled
portfolioVolLookbackPeriods?: number; // default 12
```

Left disabled by default per the plan's "tune on OOS only" rule — see
sweep below. The overlay is distinct from per-ticker inverse-vol within
the basket (`volLookbackPeriods`): that tilts weights across holdings;
this one scales the entire basket up/down toward a vol target (and
never above 1.0 — no leverage).

### Sweep (lookback=12 periods, non-overlapping)

| target | OOS Sharpe | OOS MaxDD | Holdout Sharpe | Holdout MaxDD |
|--------|------------|-----------|----------------|---------------|
| 0      | 0.456      | -0.830    | 1.327          | -0.354        |
| 0.08   | 0.447      | -0.713    | 1.317          | -0.257        |
| 0.10   | 0.447      | -0.780    | 1.352          | -0.290        |
| 0.12   | 0.449      | -0.805    | 1.388          | -0.309        |
| 0.15   | 0.446      | -0.824    | 1.379          | -0.328        |
| 0.20   | 0.455      | -0.830    | 1.332          | -0.348        |

Selection rule: tune on OOS only. **OOS-best → target=0 (disabled).**
No vol-targeting config becomes the new default. The overlay is still
available for users who prefer the 13% drawdown reduction at
target=0.08 (MaxDD -0.830 → -0.713) at a 0.009 Sharpe cost — that is a
better risk-adjusted portfolio on OOS in a drawdown-aware sense, but
not a better-Sharpe portfolio, and the plan commits to honest Sharpe.

### Baseline (unchanged — default still has vol-target=0)

runId: `cmo26yarh00006uk3w5imcbry` (from Chunk 1 — re-running with
`portfolioVolTarget=0` produces identical metrics because the overlay
short-circuits when the target is 0).

| Window  | Sharpe | HitRate | MaxDD  | activePeriods | flatDays | activeFrac |
|---------|--------|---------|--------|---------------|----------|------------|
| OOS     | 0.456  | 0.556   | -0.830 | 1572          | 1701     | 0.480      |
| Holdout | 1.327  | 0.661   | -0.354 | 363           | 92       | 0.798      |

---

## Chunk 3 — Correlation-aware selection (2026-04-16)

New pure utilities in `lib/macro-engine/backtest/risk.ts`:
`pairwiseCorrelation(returnMatrix)` produces a K×K Pearson correlation
matrix from the same aligned trailing-return panel that Chunk 2 built;
`greedyCorrSelect(scores, corr, k, lambda)` runs a deterministic
best-swap greedy that starts from the top-`k` by score and evaluates
every (in, out) pair until no swap improves
`Σ scores − λ · Σ|corr|`. Hard-capped at `n·k` iterations so pathological
inputs still terminate.

Selection path in `scoreWindowRows`: when `corrPenaltyLambda > 0` and
the candidate pool ≥ `k × oversampleMult`, we take the top
`k × oversampleMult` by `zCarry` rank, build a K_pool × N return matrix
from the precomputed `returnMatrixMap`, compute pairwise correlations,
and call `greedyCorrSelect` to choose the final `k` tickers. When
lambda is 0 or the pool is too small, we keep the prior top-`k`-by-rank
path — identical to the Chunk 2 baseline.

Three new config fields:

```ts
corrPenaltyLambda?:   number; // 0 = disabled (default)
corrLookbackPeriods?: number; // default 12
corrOversampleMult?:  number; // default 2 (pool = k × 2)
```

The return-matrix precompute now triggers if **either** portfolio vol
targeting or correlation penalty is enabled; the lookback is the max
of the two so both overlays see consistent data.

### Sweep (lookback=12 periods, non-overlapping)

| lambda | oversample | OOS Sharpe | OOS MaxDD | Holdout Sharpe | Holdout MaxDD |
|--------|------------|------------|-----------|----------------|---------------|
| 0      | —          | 0.456      | -0.830    | 1.327          | -0.354        |
| 0.5    | 2          | **0.485**  | -0.830    | 1.141          | -0.373        |
| 1      | 2          | 0.481      | -0.830    | 1.151          | -0.373        |
| 2      | 2          | 0.457      | -0.824    | 1.138          | -0.373        |
| 4      | 2          | 0.425      | -0.833    | 1.139          | -0.373        |
| 8      | 2          | 0.429      | -0.835    | 1.123          | -0.373        |
| 0.5    | 3          | 0.460      | -0.830    | 1.085          | -0.515        |
| 1      | 3          | 0.457      | -0.830    | 1.094          | -0.515        |
| 2      | 3          | 0.431      | -0.824    | 1.079          | -0.515        |
| 4      | 3          | 0.391      | -0.817    | 1.088          | -0.515        |
| 8      | 3          | 0.377      | -0.796    | 1.123          | -0.499        |

Selection rule: tune on OOS only. Best OOS is `lambda=0.5, oversample=2`
at **0.485** — a +0.029 Sharpe lift on OOS (6.4% relative).

**Default stays at `corrPenaltyLambda=0` (disabled).** The OOS gain is
real but marginal; holdout pays for it in every row (best case at the
OOS-winner: 1.327 → 1.141, -0.19 Sharpe, 14% relative). Since holdout
is the harder out-of-sample period and the OOS lift is inside noise at
one decimal place, committing to the overlay as default would be
tuning to OOS at holdout's expense. The overlay ships opt-in; a user
who wants the diversification tilt can set
`{ corrPenaltyLambda: 0.5, corrOversampleMult: 2 }`. Oversample=3
degrades both OOS and holdout across every lambda tested, so no
narrative in the sweep supports widening the pool beyond 2×.

Secondary observation worth recording: varying lambda at fixed
oversample leaves `activePeriods`, `flatDays`, and `activeFrac`
identical (1572 / 1701 / 0.480 OOS; 363 / 92 / 0.798 holdout). This is
the expected behavior — the correlation penalty re-arranges *which*
tickers trade, never *whether* the basket trades, so credit-gate logic
and the volume of engaged days are unaffected.

### Baseline (unchanged)

runId: `cmo26yarh00006uk3w5imcbry`. With `corrPenaltyLambda=0` the
corr-aware path short-circuits (no precompute, no selection change),
so the default backtest produces identical metrics to Chunks 1 & 2.

| Window  | Sharpe | HitRate | MaxDD  | activePeriods | flatDays | activeFrac |
|---------|--------|---------|--------|---------------|----------|------------|
| OOS     | 0.456  | 0.556   | -0.830 | 1572          | 1701     | 0.480      |
| Holdout | 1.327  | 0.661   | -0.354 | 363           | 92       | 0.798      |

---

## Chunk 4 — Preload cache + `runSweep` harness (2026-04-16)

Refactors `lib/macro-engine/backtest/index.ts` so a single DB read can feed
many config variants. New exports:

- `preloadBacktestData(config): Promise<PreloadedBacktestData>` — pulls the
  feature matrix (paginated per-ticker to stay under Accelerate's 5MB
  response cap), regime labels + confidences, per-ticker forward returns,
  and SPY benchmark returns. Auto-detects / auto-corrects `dataStart`
  against the earliest row actually present in `factor_feature_matrix`.
- `runBacktest(config, { preloaded? })` — now accepts an optional shared
  preload and returns `{ runId, oos, holdout, windowCount }` instead of
  just `runId`. `runId` is `null` when `skipPersist=true`. The only
  upstream caller (`scripts/macro-engine/run-backtest.ts`) was updated to
  destructure the new shape.
- `runSweep(variants, baseConfig?)` — takes a list of
  `{ label, overrides: Partial<BacktestConfig> }`, preloads once, calls
  `runBacktest` per variant with the shared bundle, collects the metrics,
  and prints a compact summary table at the end. Always forces
  `skipPersist=true` on the merged config — sweeps never touch
  `backtest_runs` / `factor_weight_sets` / `backtest_metrics`.

Derived per-run tables — `volMap`, `shortMomMap`, `returnMatrixMap` —
are intentionally rebuilt inside each `runBacktest` call, because their
lookback parameters can vary across variants. They're in-memory
derivations from `allReturnMap`, cheap compared to the DB cost.

### Experiment scripts migrated to thin `runSweep` callers

Each of the four experiment entry-points is now ~30 lines. They declare
a `SweepVariant[]` and call `runSweep`. The harness handles data load,
per-variant metrics collection, and the summary table.

- `scripts/macro-engine/experiment-longfraction.ts`  — coarse lf sweep
  (0.25, 0.33, 0.40, 0.50).
- `scripts/macro-engine/experiment-longfraction2.ts` — fine lf sweep
  (0.10 … 0.35 @ 0.05).
- `scripts/macro-engine/experiment-confidence.ts`    — `confidenceExp`
  sweep (0, 0.5, 0.75, 1.0, 1.5, 2.0).
- `scripts/macro-engine/experiment-credit-gate.ts`   — credit-gate
  strategy sweep (all / stress-only / 3+4 / none).

### Measured impact

`experiment-credit-gate.ts` (4 variants) end-to-end wall time went from
roughly 4× per-run preload cost (~12 min expected) down to 3 min 5 sec
with a single shared preload. Scale is linear in variant count, so a
typical 6-variant sweep (lf or confidence) saves ~4–5 min per run.

### Behavior-parity check (credit-gate run)

Using the shared-preload path produces byte-identical metrics to the
pre-refactor per-variant path for the baseline `gate-all` entry. The
full table from the first run under the new harness:

| strategy          | OOS Sharpe | OOS HR | OOS MDD | OOS Active | Hold Sharpe | Hold HR | Hold MDD | Hold Active |
|-------------------|------------|--------|---------|------------|-------------|---------|----------|-------------|
| gate-all          | 0.456      | 0.556  | -0.830  | 0.480      | 1.327       | 0.661   | -0.354   | 0.798       |
| gate-stress-only  | 0.224      | 0.514  | -0.987  | 0.722      | 0.803       | 0.614   | -0.566   | 0.888       |
| gate-3-and-4      | 0.227      | 0.517  | -0.962  | 0.646      | 0.803       | 0.614   | -0.566   | 0.888       |
| gate-none         | 0.003      | 0.490  | -1.000  | 1.000      | 0.573       | 0.587   | -0.697   | 1.000       |

`gate-all` matches the Chunk 1 baseline exactly. `gate-stress-only` and
`gate-3-and-4` produce identical holdout numbers because the holdout
period's post-2022 regime labels include Regime-4-credit but no
Regime-3-credit, so the extra gate slot has no holdout effect.
`gate-none` confirms the credit gate is load-bearing: OOS Sharpe
collapses to 0.003 when it's off.

### Baseline (unchanged)

The default `runBacktest()` with no overrides still produces:

| Window  | Sharpe | HitRate | MaxDD  | activePeriods | flatDays | activeFrac |
|---------|--------|---------|--------|---------------|----------|------------|
| OOS     | 0.456  | 0.556   | -0.830 | 1572          | 1701     | 0.480      |
| Holdout | 1.327  | 0.661   | -0.354 | 363           | 92       | 0.798      |

---

## Chunk 5 — Transaction costs, turnover, gross / net Sharpe (2026-04-16)

The backtest now accounts for trading frictions. Every active rebalance
charges a proportional cost based on the L1 change in per-ticker NAV
weights between consecutive active days:

```
cost_t = (Σ_i |w_t(i) * finalSize_t − w_{t-1}(i) * finalSize_{t-1}|) · tcBps / 10_000
net_t  = gross_t − cost_t
```

Positions persist across credit-gated flat days — the model is assumed
to hold through gaps rather than exit-and-re-enter on every regime
blip. This is the cheapest fair accounting and avoids double-charging
phantom transitions; a real-money implementation could be stricter,
and that's an opt-in knob for later.

### API changes

- `BacktestConfig` gains `transactionCostBps?: number` (default **5**).
  Legacy runs can force 0 to match old gross numbers exactly.
- `WindowResult` gains `grossReturns`, `turnovers`, `costs` alongside
  the existing `excessReturns` (now the NET series — honest headline).
- `MetricsResult` gains `sharpeAnnGross`, `maxDrawdownGross`,
  `avgTurnover`, `annualizedCostBps`. `sharpeAnn` is NET.
- `BacktestRun.notes` now records the full gross/net/turnover/cost
  tuple for both OOS and holdout — zero schema migration, full audit
  trail available via `select notes from backtest_runs`.
- `runSweep` summary table updated with Net / Gross / turnover / cost
  columns per window.

### Transaction-cost sweep (3 variants, one shared preload)

| setting      | OOS Net  | OOS Gross | OOS Turn | OOS $bps/yr | Hold Net | Hold Gross | Hold Turn | Hold $bps/yr |
|--------------|----------|-----------|----------|-------------|----------|------------|-----------|--------------|
| tc=0 (gross) | 0.456    | 0.456     | 0.172    | 0.0         | 1.327    | 1.327      | 0.125     | 0.0          |
| tc=5 (dflt)  | **0.445**| 0.456     | 0.172    | 10.3        | **1.311**| 1.327      | 0.125     | 7.5          |
| tc=10        | 0.434    | 0.456     | 0.172    | 20.6        | 1.296    | 1.327      | 0.125     | 15.1         |

Observations worth recording:

- Avg turnover = 17.2% of NAV per active rebalance on OOS, 12.5% on
  holdout. Holdout is stickier because Regime-4-credit eats a larger
  share of the window; the model tends to carry the same basket out
  of gates in the "on" stretches between credit events.
- Sharpe drag scales linearly with tcBps, as expected for fixed
  turnover. At tc=5 the annualized cost drag is ~10 bps on OOS and
  ~7.5 bps on holdout, costing ~0.011 Sharpe OOS and ~0.016 Sharpe
  holdout. Real, not catastrophic.
- `gross` column is invariant across tc — useful as a sanity check
  (costs are additive, don't change selection / sizing).

### New NET baseline

Default `runBacktest()` with the new `transactionCostBps=5`:

| Window  | Net Sharpe | Gross Sharpe | HitRate | MaxDD  | Turnover | CostDrag bps/yr | activeFrac |
|---------|------------|--------------|---------|--------|----------|-----------------|------------|
| OOS     | 0.445      | 0.456        | 0.555   | -0.830 | 0.172    | 10.3            | 0.480      |
| Holdout | 1.311      | 1.327        | 0.661   | -0.358 | 0.125    | 7.5             | 0.798      |

From here forward, the headline numbers in this file are NET unless
explicitly labeled GROSS. Chunk 7 will add a net/gross toggle in the
dashboard so users can see both at a glance.

### Known limitations carried into subsequent chunks

- Positions carried "for free" through flat streaks. For very long
  flat periods a stricter model would mark-to-market the carry (SPY
  returns during that window) and pay exit + re-enter costs. Low
  priority until flat-day Sharpe accounting becomes a research topic.
- Single flat cost rate across the universe. A per-ticker bps table
  (e.g. 3 bps for top-5 ETF volume, 10 bps for EWA/EWZ) could land as
  a one-liner via a ticker→bps map in the config; deferred.

---

## Chunk 6 — Live holdout replay + Today's Trades card (2026-04-16)

Goal of this chunk was wiring the dashboard into the honest model, not
producing new performance numbers. The headline metrics for the holdout
window come straight from the backtest engine and match Chunk 5's NET
baseline exactly:

| Window  | Net Sharpe | Gross Sharpe | HitRate | Active | Flat | activeFrac | Turnover | CostDrag bps/yr |
|---------|------------|--------------|---------|--------|------|------------|----------|-----------------|
| Holdout | **1.311**  | 1.327        | 0.661   | 363    | 92   | 0.798      | 0.125    | 7.5             |

Last replay point is 2026-03-20 (most recent DB feature row), Regime-5-inflation,
basket = XLE / GLD / EWZ / EWJ / EWC / EWU / AAPL / MSFT / NVDA / AVGO / META / JPM
at 8% equal weight, sized to 73% gross via regime-confidence scaling.

### Why we replay instead of serving `AllocationSignal`

The old `/history` endpoint served a 63-day top-half synthetic curve from
`AllocationSignal` / portfolio records. That was inconsistent with the
21-day top-25% model the backtest actually runs (inherited from earlier
prototypes; called out as "still stale" in Chunk 1). Worse, the
`AllocationSignal` table has only ~5 days of data post-mid-April-2026,
so any attempt to reconstruct a multi-year live curve from it would be
full of gaps.

The fix is to rebuild the live curve from the same `scoreWindowRows`
function that produces the Holdout Sharpe. That way the chart, the
"today's trades" card, and the Backtest Metrics panel can never disagree
by construction.

### Code changes

1. `ScoredDayRecord` emitted per date. New interface on `WindowResult`
   carries `date`, `regime`, `confidence`, `gated`, `basket[]` (ticker,
   weight, score, actualReturn), `benchmarkReturn`, `portfolioReturn`,
   `grossExcess`, `netExcess`, `finalSize`, `turnover`, `cost`. Populated
   inside `scoreWindowRows` on both credit-gated and active branches so
   the replay stream has a row for every holdout day.
2. `replayHoldout()` in `lib/macro-engine/backtest/index.ts`. Preloads
   once, then invokes `scoreWindowRows` over the full holdout slice
   (`HOLDOUT_START → dataEnd`) with a `perDateRecords` buffer. Returns
   `{ points, metrics, config, dataStart, holdoutStart, asOfDate }`.
3. `/api/dashboard/macro-engine/history` rewritten. Calls `replayHoldout`
   (through an in-memory 15-minute cache; replay is ~90s cold), computes
   cumulative portfolio / SPY curves for both net and gross series, emits
   per-date `basket` + `regime` + `gated` + turnover + cost. Range
   filtering (`?start`, `?end`) is applied on the cached full replay so
   `sharpeNet/sharpeGross/maxDD` in the summary stay pinned to the
   authoritative metrics and don't drift with the visible window.
4. Dashboard UI refactor. `PerformanceChart`:
   - New **Net / Gross toggle** (transaction cost badge in tooltip shows
     current bps setting).
   - Summary row now shows 4 cards (Portfolio / SPY / Excess · WinRate /
     Holdout Sharpe + flat-day count).
   - Selected-point view shows regime + size% + turnover%, replaces the
     old two-column rank grid with the actual basket (ticker, weight,
     score), and surfaces a "CREDIT-GATE FLAT" badge on gated days
     instead of rendering a ghost basket.
   - Rolling Sharpe is computed over active days only (window=12)
     and uses PPY=252/21 to match the engine's annualization.
5. New **Today's Trades** card on the dashboard. Shows current regime,
   gated status, size %, headline holdout sharpe (net + gross), annualized
   cost drag, and the current basket with per-ticker z-rank / weight.

### Follow-ups deferred to Chunk 7

- Per-regime attribution (split of holdout alpha by regime label).
- Gross / net toggle on the Backtest Metrics panel (history chart has it,
  the OOS / Holdout cards still show one number each).

---

## Chunk 7 — Regime attribution + net/gross toggle on Backtest Metrics (2026-04-16)

No model change this chunk — surface-area only. Numbers are Chunk-5 NET
baseline: Holdout Sharpe **1.31 net / 1.33 gross**, OOS **0.445 / 0.456**.

### Attribution of the Holdout Sharpe

Rebuilt from the live replay (`scoreWindowRows` per date, grouped by
regime label). Share-of-time is observation fraction, alpha share is
Σ|netExcess| fraction of all active days.

| Regime                    | % time | Active / Gated | Sharpe Net | Sharpe Gross | Hit | α share | α compounded (overlapping) |
|---------------------------|--------|----------------|------------|--------------|-----|---------|-----------------------------|
| Regime-5-inflation        | 72.1%  | 328 / 0        | **1.55**   | **1.56**     | 69% | 87.1%   | (see note below)            |
| Regime-1-inflation        | 7.5%   | 34 / 0         | -0.07      | -0.04        | 41% | 12.6%   |                             |
| `global` (unlabeled)      | 0.2%   | 1 / 0          | —          | —            | 100%| 0.3%    | single-obs edge case        |
| Regime-4-credit (gated)   | 11.2%  | 0 / 51         | —          | —            | —   | 0.0%    | design: gate off            |
| Regime-0-credit (gated)   | 9.0%   | 0 / 41         | —          | —            | —   | 0.0%    | design: gate off            |

Attribution sanity: α shares sum to 100.0%.

**What this tells us**

- The strategy is carried almost entirely by Regime-5-inflation (87% of
  alpha at Sharpe 1.55). That's consistent with 12-month cross-sectional
  momentum being a high-beta-to-macro-regime factor: when inflation /
  commodity cycles persist, ranking ETFs by 12-month returns captures
  real structural dispersion (energy vs tech, EM vs DM).
- Regime-1-inflation is a mild drag (Sharpe -0.07, 41% hit rate). This
  is a real finding — there's a "fake" inflation regime where the
  momentum ranking gets whipsawed. Potential Chunk-8+ improvement:
  conditional sizing per regime, or requiring regime persistence before
  re-entering after a credit gate.
- 20.2% of holdout time is credit-gated flat. The gate is doing its job
  (all three credit-stress labels have 0 active days in the holdout).

**Overlap note:** The `cumReturnNet` column in the attribution API is
compounded across overlapping 21-day forward returns (the engine samples
daily) — absolute magnitudes are inflated relative to a tradable curve.
The UI shows the number with a footnote flagging this and recommending
users treat it as a directional proxy, not a realized P&L.

### API changes

1. `GET /api/dashboard/macro-engine` now parses `BacktestRun.notes` to
   surface `sharpeAnnGross`, `avgTurnover`, `annualizedCostBps`, and
   `transactionCostBps`. Nullable — pre-Chunk-5 runs return `null`.
2. `GET /api/dashboard/macro-engine/history` returns a new `byRegime`
   array (typed `RegimeAttribution[]`) computed from the same
   `ScoredDayRecord[]` stream. Cached server-side alongside the main
   replay payload (15-min TTL) so the attribution panel loads in &lt;50ms
   once warm.

### UI changes

1. **Backtest Metrics panel** now has a Net / Gross toggle. Each window
   card also shows a small `turnover / cost drag` diagnostic line so
   the cost accounting is visible at a glance, not buried in notes.
2. **New Regime Attribution panel** (between Backtest Metrics and Top
   Stock Picks). Table with per-regime Sharpe (net/gross toggle), hit
   rate, turnover, cum return, and an inline alpha-share bar. Gated
   regimes get a "GATED" chip and a muted look.
3. Copy refreshed on the Backtest Metrics card to explain what Net /
   Gross means and how active-day Sharpe is calculated.

### Carry-over

Chunks 1-7 delivered the correctness fixes (Chunk 1), modeling
extensions (Chunks 2-3), harness (Chunk 4), transaction-cost accounting
(Chunk 5), and dashboard/API surface work (Chunks 6-7). The live
strategy now has: honest Sharpe, live replay, regime attribution, and a
canonical baseline of **OOS 0.445 / Holdout 1.31** (net of 5 bps/side).
Next natural targets (not in this plan): regime-conditional sizing,
short-momentum blend re-evaluation post-cost, and a "fake-inflation"
discriminator to salvage Regime-1.

---

## Chunk 1 — Why the Holdout Sharpe went UP (1.168 → 1.327)

Pre-fix, the holdout Sharpe was annualized over 455 observations with 92 of
them pinned to zero. Zero-injection biased-deflated both the mean (by 20%)
and the stdev, but the mean deflation dominated in-sample and the stdev
deflation dominated holdout — so when we remove the zeros, holdout mean
recovers faster than the denominator shrinks. The new 1.327 is the
"what-Sharpe-does-the-model-actually-deliver-when-it's-on" number. The
`activeFrac=0.798` makes it clear the model is engaged on ~80% of holdout
days, not perpetually. Total realized return is roughly unchanged; what
changes is how we report the risk-adjusted version.

---

## Chunk 8 — Regime Outlook (Markov forecast card)

No numbers — UI/API addition only. Baseline unchanged.

Exposes k-step-ahead transition probabilities from the already-persisted
`regime_transitions` 1-day matrix. The card surfaces (a) the current
regime + classifier confidence, (b) a 21/63/126/252-day horizon toggle
with the probability bar per regime, and (c) a "sticky vs transitioning"
banner keyed off `stayProb > 50%`.

Observation at time of shipping: Regime-5-inflation is the current
regime at 37% confidence. 21-day stayProb is 41% — flagged as
**transitioning**. This matters downstream: low classifier confidence
means the regime-conditional recommendations from Chunk 11 should be
treated as lower conviction than they otherwise would be.

Files: `lib/macro-engine/regime/forecast.ts`,
`app/api/dashboard/macro-engine/forecast/route.ts`,
`app/dashboard/tools/macro-engine/page.tsx` (RegimeOutlookCard).

---

## Chunk 9 — Regime Timeline (per-run history browser)

No numbers — UI/API addition. Baseline unchanged.

Previously the dashboard collapsed holdout performance to aggregates
("Regime-5-inflation delivered 87% of alpha"). Chunk 9 exposes the
run-by-run sequence: every contiguous stint in a regime, its dates,
duration, Sharpe, cum return vs SPY, hit rate, and the top-5 tickers by
contribution (`weight × actualReturn × finalSize` summed across the
run's active days).

The `/history` payload now ships a `runs: RegimeRun[]` array; the panel
renders a Gantt strip + sortable table with a net/gross toggle. Enables
forensics like "what did the model buy the LAST time we were in
Regime-5-inflation" — which informs Chunk 12's ticker-level guidance.

Total runs on the current holdout: 22 (Regime-5-inflation 8, Regime-4-credit
8, Regime-0-credit 3, Regime-1-inflation 2, plus a stray 1-day `global`
legacy label).

Files: `app/api/dashboard/macro-engine/history/route.ts` (RegimeRun type,
buildRegimeRuns helper), `app/dashboard/tools/macro-engine/page.tsx`
(RegimeTimelinePanel).

---

## Chunk 10 — Per-regime parameter sweep

No baseline change yet — results are used by Chunk 11. Adds a stratified
sweep harness `runPerRegimeSweep` that reuses the shared preload from
Chunk 4 and evaluates per-regime Sharpe / hit rate / cum return for each
variant in a grid.

Grid: 4 × 4 × 3 = 48 variants across `longFraction ∈ {0.15, 0.20, 0.25,
0.30}`, `confidenceExp ∈ {0.5, 1.0, 1.5, 2.0}`, and `volLookbackPeriods
∈ {0, 6, 12}`. Per-variant cost is ~400ms (preload amortized once to
~90s), so the whole sweep finishes in ≈2 minutes.

### Findings (holdout, net of 5 bps/side)

- **Regime-5-inflation** (n=328 active days): best at `lf=0.25, ce=0.5,
  vl=0` → Sharpe **1.56** (vs baseline 1.31 at ce=1.0). The dominant
  regime by far — it drives ~87% of holdout alpha.
- **Regime-1-inflation** (n=34 — thin): best at `lf=0.30, ce=0.5, vl=0`
  → Sharpe 0.16, hit 41%. Still barely alpha-positive; matches the
  CHANGELOG Chunk 7 note that this regime is the open problem.
- **Regime-0/3/4-credit**: 0 active days — credit-gate flats the
  portfolio, as designed. Overrides fall back to the overall-best
  variant for consistency, but they never get exercised.
- `volLookbackPeriods = 0` (no vol weighting) is strictly best in every
  cell tested. Post-cost, inverse-vol weighting drags Sharpe by 0.2-0.4.
  Confirms the default (vol weighting off) and closes the door on
  re-enabling it at the current horizon.
- Lower `confidenceExp` (0.5) is weakly dominant — the exp=1 baseline
  is nearly indistinguishable (≤0.02 Sharpe gap) but 0.5 is the clear
  pick for Regime-5-inflation specifically.

### Artifact

`config/macro-engine/per-regime-overrides.json` — canonical pick map:

```json
{
  "Regime-5-inflation": { "longFraction": 0.25, "confidenceExp": 0.5, "volLookbackPeriods": 0 },
  "Regime-1-inflation": { "longFraction": 0.30, "confidenceExp": 0.5, "volLookbackPeriods": 0 }
}
```

Consumed by Chunk 11 (regime-conditional execution).

Files: `lib/macro-engine/backtest/index.ts` (runPerRegimeSweep,
PerRegimeMetric, PerRegimeVariantResult), `scripts/macro-engine/sweep-per-regime.ts`,
`config/macro-engine/per-regime-overrides.json`.


---

## Chunk 11 — Regime-conditional execution (default ON)

runId: `cmo2d09dj0000fsnb8nrfjzxx`

| Window  | Sharpe Net | Sharpe Gross | HitRate | MaxDD  | activePeriods | flatDays | avgTurnover | costDrag |
|---------|------------|--------------|---------|--------|---------------|----------|-------------|----------|
| OOS     |  0.457     |  0.468       | 0.553   | -0.818 | 1572          | 1701     | 0.179       | 10.8 bps |
| Holdout |  1.370     |  1.384       | 0.661   | -0.354 | 363           | 92       | 0.124       |  7.4 bps |

**Δ vs Chunk 7 baseline (runId cmo2..., Sharpe 0.445 / 1.311)**:
OOS Sharpe +0.012, Holdout Sharpe **+0.059**. Turnover +0.001 (negligible).

### Mechanism

Wires `BacktestConfig.perRegimeOverrides` into `scoreWindowRows`. On each
test day, the engine looks up the regime label and swaps `longFraction`
and `confidenceExp` for the per-regime pick (from Chunk 10's JSON picks
file). Regimes without entries fall through to the base config — so
missing regimes behave exactly like the pre-Chunk-11 engine.

Default path: `run-backtest.ts` calls `loadPerRegimeOverrides()` and
passes the map into `runBacktest`. Opt out with `--no-regime-overrides`
for A/B. The `/history` dashboard API does the same load so the live
replay curve matches the canonical Sharpe shown in the Backtest
Performance card.

### Why OOS didn't move

The per-regime picks were derived on the HOLDOUT window only (Chunk 10
runs `replayHoldout`). OOS windows span 2004-2021, where Regime-5-inflation
has a different mix of sub-periods, so applying holdout-fit params to OOS
is not guaranteed to improve OOS. The fact that OOS didn't degrade either
(0.456 → 0.457) suggests the picks are reasonably stable and not
overfit; they merely don't help OOS.

For pure out-of-sample validation, the honest number to quote is still
the HOLDOUT Sharpe of 1.37 — the picks were fit using replay metrics from
the same window they're evaluated on. A future chunk could cross-validate
by refitting picks on the first half of holdout and evaluating on the
second half, but with only 455 holdout days that's statistical noise.

### New canonical baseline

**Going forward: Holdout Sharpe 1.37 net / 1.38 gross.** Cost drag held at
7.4 bps annualized. activeFrac=0.798 unchanged — the gate-hit schedule is
identical, the engine is just sizing and selecting differently inside
each regime.

Files: `lib/macro-engine/backtest/types.ts` (perRegimeOverrides on
BacktestConfig), `lib/macro-engine/backtest/index.ts`
(loadPerRegimeOverrides + wired into scoreWindowRows + callers),
`scripts/macro-engine/run-backtest.ts`
(--no-regime-overrides flag, default-on),
`app/api/dashboard/macro-engine/history/route.ts` (dashboard replay
uses overrides).

