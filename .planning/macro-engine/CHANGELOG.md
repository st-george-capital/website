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
