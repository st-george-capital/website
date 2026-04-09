# Phase 4: Backtesting Engine - Research

**Researched:** 2026-04-08
**Domain:** Walk-forward backtesting, regime-conditioned weight optimization, OOS validation
**Confidence:** HIGH (architecture well-constrained by prior phases; formulas from first principles; no exotic external libraries required)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BACK-01 | Walk-forward backtest engine trains factor weights only on data preceding each test window — never on data from the test period itself | Walk-forward windowing algorithm; strict boundary enforcement via date slicing on pre-built FactorFeatureMatrix + RegimeLabel tables |
| BACK-02 | Factor weights are optimized per regime (each regime label has its own weight set derived from backtesting), with global fallback weights when a regime has insufficient samples | Ridge regression per regime partition; minimum-sample-count guard; global fallback derived from full training corpus |
| BACK-03 | A pre-committed holdout set (most recent 3 years) is reserved before any optimization begins and never touched during weight tuning — used only for final OOS validation | Hard date ceiling constant declared before any loop; all training/test windows capped at that ceiling; holdout metrics computed once at end |
| BACK-04 | Backtest reports hit rate (% correct directional calls), annualized Sharpe, and max drawdown vs SPY/ACWI benchmark — OOS metrics only, no in-sample stats displayed | Exact metric formulas documented below; benchmark returns from OhlcvDaily (SPY + ACWI already present); result stored in BacktestRun + BacktestMetric tables |
</phase_requirements>

---

## Summary

Phase 4 adds a walk-forward backtesting engine that derives regime-conditioned factor weights from historical data, then validates them on a held-out 3-year window. The engine is an offline script — it reads the pre-built `FactorFeatureMatrix` and `RegimeLabel` tables from Phases 2 and 3, runs weight optimization, and writes results to new `BacktestRun` and `FactorWeightSet` tables. Next.js API routes in Phase 6 only read from those result tables; they do not run the backtest.

The core optimization problem is straightforward: given a training window of (featureDate, ticker, z-scores, regime) rows plus forward returns computed from `OhlcvDaily`, fit a linear model (ridge regression) that maps the 6 z-score factors to 1-month-forward excess returns over SPY. This is done once per regime label per walk-forward step. The final weight set for each regime is the average across all walk-forward steps (or the last step — either is defensible; average is more stable).

The holdout boundary is the single most important invariant in this phase. It must be declared as a constant before any loop, and every date range must be verified against it. The simplest enforcement mechanism is a helper function `assertNotHoldout(date: Date)` that throws if the date falls inside the holdout window — called at every training/test window boundary.

**Primary recommendation:** Use ridge regression (ridge parameter λ ≈ 0.01–0.1) per regime partition on walk-forward training windows. Store weight sets and OOS metrics in two new Prisma models. Scripts follow the established pattern: `run-backtest.ts` (computation) + `verify-backtest.ts` (validation).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `simple-statistics` | ^7.8.9 (already installed) | Mean, std dev, correlation, linear regression helpers | Already in project; covers all metric computations |
| `ml-matrix` | ^6.12.1 (already installed) | Matrix operations for ridge regression (X^T X + λI)^{-1} X^T y | Already in project from Phase 3 |
| Prisma | ^5.22.0 (already installed) | BacktestRun + FactorWeightSet + BacktestMetric storage | Established ORM throughout project |
| `date-fns` | ^4.1.0 (already installed) | Date arithmetic for window slicing, addMonths, differenceInDays | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | (devDep, already used) | Run TypeScript CLI scripts directly | All backtest scripts |

### What NOT to Add
No new libraries are needed. Ridge regression in 6 dimensions is 6×6 matrix math — `ml-matrix` handles it completely. Do not add `mathjs`, `tensorflow`, or any ML framework. The problem does not require them.

### Installation
No new packages required. All dependencies are already present.

---

## Architecture Patterns

### Recommended Project Structure
```
lib/macro-engine/backtest/
├── types.ts           # BacktestConfig, WeightSet, WindowResult, MetricsResult contracts
├── windows.ts         # Walk-forward window generator (produces {trainStart, trainEnd, testStart, testEnd}[])
├── returns.ts         # Forward return computation from OhlcvDaily adjClose
├── weights.ts         # Ridge regression: fitWeightsForRegime(features, returns) → number[6]
├── metrics.ts         # hitRate(), annualizedSharpe(), maxDrawdown() — pure functions
└── index.ts           # runBacktest(config) orchestrator — no algorithm logic

scripts/macro-engine/
├── run-backtest.ts    # CLI: calls runBacktest(), writes DB results
└── verify-backtest.ts # CLI: reads DB results, asserts OOS metrics are present and sane
```

### Pattern 1: Walk-Forward Window Generator
**What:** Produces an array of non-overlapping {trainStart, trainEnd, testStart, testEnd} objects. Training window expands (expanding window, not rolling) to maximize data usage. Test window is fixed length (e.g., 3 months).

**When to use:** Called once at the start of `runBacktest()` before any DB access.

**Example:**
```typescript
// lib/macro-engine/backtest/windows.ts
export interface BacktestWindow {
  trainStart: Date;
  trainEnd:   Date;   // exclusive of testStart
  testStart:  Date;
  testEnd:    Date;   // exclusive of next trainEnd
}

const HOLDOUT_START = new Date('2022-01-01'); // most recent 3 years from ~2025

/**
 * Generates expanding walk-forward windows.
 * ALL windows must end before HOLDOUT_START.
 * trainMinYears: minimum years of training data before first test window (e.g., 3).
 * testMonths: length of each test step (e.g., 3 months = ~63 trading days).
 */
export function generateWindows(
  dataStart: Date,
  testMonths: number = 3,
  trainMinYears: number = 3
): BacktestWindow[] { ... }

export function assertNotHoldout(date: Date): void {
  if (date >= HOLDOUT_START) {
    throw new Error(`Holdout boundary violation: date ${date.toISOString()} >= holdout start ${HOLDOUT_START.toISOString()}`);
  }
}
```

### Pattern 2: Ridge Regression Weight Fitting
**What:** For a given training window + regime label, collect all (featureVector, forwardReturn) pairs, build the design matrix X [n×6] and target vector y [n], then solve ridge: w = (X^T X + λI)^{-1} X^T y.

**When to use:** Called once per regime per walk-forward step.

**Example:**
```typescript
// lib/macro-engine/backtest/weights.ts
import { Matrix } from 'ml-matrix';

// FEATURE_DIMENSIONS order: [zGrowth, zInflation, zMonetary, zCredit, zCarry, zEarnings]
export function fitWeightsRidge(
  features: number[][],  // [n x 6] — each row is one (ticker, date) observation
  returns: number[],     // [n] — forward excess return for that (ticker, date)
  lambda: number = 0.05
): number[] {
  const X = new Matrix(features);        // n×6
  const y = Matrix.columnVector(returns); // n×1
  const XtX = X.transpose().mmul(X);    // 6×6
  const reg = Matrix.eye(6).mul(lambda); // λI
  const XtXreg = XtX.add(reg);          // 6×6 regularized
  const Xty = X.transpose().mmul(y);    // 6×1
  const w = XtXreg.solve(Xty);          // 6×1
  return w.getColumn(0);
}
```

### Pattern 3: Regime-Conditioned Weight Sets with Global Fallback
**What:** After fitting weights per regime, check if any regime had fewer than `MIN_REGIME_SAMPLES` observations in the training window. If so, use global weights (fitted on all training data regardless of regime) as fallback.

**Constants:**
- `MIN_REGIME_SAMPLES = 30` — minimum (ticker, date) observations for a regime-specific fit. Below this, fall back to global.

**Example:**
```typescript
// lib/macro-engine/backtest/index.ts (inside runBacktest loop)
const regimeGroups = groupByRegime(trainRows); // Map<regimeLabel, TrainRow[]>
const globalWeights = fitWeightsRidge(allTrainFeatures, allTrainReturns);

const weightSets: Record<string, number[]> = {};
for (const [regime, rows] of regimeGroups) {
  if (rows.length >= MIN_REGIME_SAMPLES) {
    weightSets[regime] = fitWeightsRidge(rows.map(r => r.features), rows.map(r => r.fwdReturn));
  } else {
    weightSets[regime] = globalWeights; // fallback
    console.log(`Regime "${regime}" has ${rows.length} samples — using global fallback`);
  }
}
```

### Pattern 4: Holdout Enforcement
**What:** The holdout date is a module-level constant. `assertNotHoldout` is called at every point data is sliced for training or testing. Holdout metrics are computed exactly once, after all walk-forward optimization is complete.

**Invariant:** `HOLDOUT_START` must equal today minus 3 years, but committed as a hard-coded constant, not computed at runtime (avoids drift across runs). Value: `2022-01-01` (gives ~3 years holdout as of early 2025 data; adjust if data ends earlier).

### Anti-Patterns to Avoid
- **Rolling training window instead of expanding:** Using a fixed-size rolling window wastes early data. Use expanding windows (train always starts at `dataStart`).
- **Computing forward returns from `close` instead of `adjClose`:** Must use `adjClose` for split/dividend-adjusted returns. `OhlcvDaily` has both columns — always use `adjClose`.
- **Displaying in-sample metrics:** BACK-04 is explicit — only OOS stats. The DB schema should enforce this by only writing metrics for test/holdout windows.
- **Re-fitting regimes inside the backtest loop:** Phase 3 regime labels are already written to DB for all dates. The backtest reads them — it does not re-run clustering. This avoids look-ahead bias from clustering on future data.
- **Using `RegimeLabel.date` without checking the date boundary:** Always filter `RegimeLabel` by `date < testStart` for training data.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ridge regression | Custom gradient descent | `ml-matrix` solve with regularization | Already installed; 6D matrix inversion is exact, no iteration needed |
| Standard deviation, mean | Manual sum loops | `simple-statistics` mean(), standardDeviation() | Already installed; handles edge cases |
| Date interval arithmetic | Manual ms math | `date-fns` addMonths(), differenceInCalendarDays() | Already installed; handles month-end edge cases |
| Prisma upsert patterns | Raw SQL | `prisma.backtestRun.upsert()` | Established pattern across all prior phases |

---

## Common Pitfalls

### Pitfall 1: Look-Ahead in Regime Labels
**What goes wrong:** Using `RegimeLabel` rows from the test or holdout period when building training features.
**Why it happens:** Easy to query `WHERE date <= testEnd` instead of `WHERE date < testStart`.
**How to avoid:** Training data query always uses `date < window.testStart` as its ceiling for both `FactorFeatureMatrix` and `RegimeLabel`.
**Warning signs:** Training Sharpe much higher than OOS Sharpe (>2× difference).

### Pitfall 2: Forward Return Computation — Survivorship / Missing Prices
**What goes wrong:** Some tickers have gaps in `OhlcvDaily` for certain dates. If you skip missing forward prices, you bias toward tickers with continuous data.
**How to avoid:** When computing forward return for (ticker, featureDate), if `adjClose` at `featureDate + 21 days` is missing, skip that observation entirely (do not impute zero). Log a count of skipped observations.

### Pitfall 3: Annualized Sharpe — Incorrect Scaling
**What goes wrong:** Computing Sharpe on monthly returns then multiplying by sqrt(12) without verifying the return frequency is exactly monthly.
**How to avoid:** Always derive the annualization factor from the actual return interval: if test window step is 21 trading days, factor = sqrt(252 / 21). Do not hardcode sqrt(12).

### Pitfall 4: Max Drawdown — Reset on Each Window vs Cumulative
**What goes wrong:** Computing max drawdown per walk-forward window and reporting the worst window's value, instead of computing it on the full OOS cumulative return series.
**How to avoid:** Accumulate OOS returns in order, build a single cumulative return vector, then compute drawdown on that vector. For holdout: same approach on holdout returns.

### Pitfall 5: Holdout Date Drift
**What goes wrong:** Computing `HOLDOUT_START = subYears(new Date(), 3)` at runtime — the boundary changes every day, making results non-reproducible.
**How to avoid:** Hard-code `HOLDOUT_START` as a constant (e.g., `new Date('2022-01-01')`). Document the chosen value in a comment.

### Pitfall 6: Benchmark Excess Return Sign Convention
**What goes wrong:** Computing excess return as `assetReturn - benchmarkReturn` but using SPY return as the portfolio return (comparing portfolio to itself).
**How to avoid:** The "portfolio" is the equal-weighted long-short score signal across universe ETFs. The "benchmark" is SPY (or ACWI for non-US). Excess = portfolio - benchmark. Sharpe is computed on the excess return series.

---

## Code Examples

### Forward Return Computation from OhlcvDaily
```typescript
// lib/macro-engine/backtest/returns.ts
import { prisma } from '../db';
import { addBusinessDays } from 'date-fns'; // or manual trading-day offset

const FORWARD_DAYS = 21; // ~1 month in trading days

/**
 * Returns { ticker, featureDate, fwdReturn } for all (ticker, date) pairs
 * in a given date range. fwdReturn = (adjClose[date+21] / adjClose[date]) - 1.
 * Pairs with missing forward price are omitted (not zero-filled).
 */
export async function computeForwardReturns(
  tickers: string[],
  startDate: Date,
  endDate: Date
): Promise<{ ticker: string; featureDate: Date; fwdReturn: number }[]> {
  // Fetch prices for [startDate, endDate + FORWARD_DAYS buffer]
  const rows = await prisma.$queryRaw<{ ticker: string; date: Date; adjClose: number }[]>`
    SELECT ticker, date, "adjClose"
    FROM ohlcv_daily
    WHERE ticker = ANY(${tickers})
      AND date >= ${startDate}
      AND date <= ${addBusinessDays(endDate, FORWARD_DAYS + 5)}
    ORDER BY ticker, date ASC
  `;

  // Build lookup: ticker -> Map<dateStr, adjClose>
  const priceMap = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!priceMap.has(r.ticker)) priceMap.set(r.ticker, new Map());
    priceMap.get(r.ticker)!.set(r.date.toISOString().slice(0, 10), r.adjClose);
  }

  const results: { ticker: string; featureDate: Date; fwdReturn: number }[] = [];
  // ... iterate, find nearest trading day ~21 days forward, compute return
  return results;
}
```

### Performance Metric Formulas
```typescript
// lib/macro-engine/backtest/metrics.ts
import { mean, standardDeviation } from 'simple-statistics';

/** Hit rate: fraction of periods where predicted direction matched actual direction */
export function hitRate(predicted: number[], actual: number[]): number {
  let hits = 0;
  for (let i = 0; i < predicted.length; i++) {
    if (Math.sign(predicted[i]) === Math.sign(actual[i])) hits++;
  }
  return hits / predicted.length;
}

/**
 * Annualized Sharpe ratio on excess returns.
 * periodsPerYear: trading periods per year (e.g., 252 for daily, 12 for monthly, 252/21 for 21-day steps)
 */
export function annualizedSharpe(excessReturns: number[], periodsPerYear: number): number {
  const mu = mean(excessReturns);
  const sigma = standardDeviation(excessReturns);
  if (sigma === 0) return 0;
  return (mu / sigma) * Math.sqrt(periodsPerYear);
}

/**
 * Maximum drawdown on a cumulative return series.
 * Input: array of period returns (not cumulative prices).
 * Returns: max drawdown as a negative fraction (e.g., -0.35 for 35% drawdown).
 */
export function maxDrawdown(periodReturns: number[]): number {
  let peak = 1;
  let maxDD = 0;
  let cumulative = 1;
  for (const r of periodReturns) {
    cumulative *= (1 + r);
    if (cumulative > peak) peak = cumulative;
    const dd = (cumulative - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }
  return maxDD; // negative value
}
```

### DB Schema (New Prisma Models)
```prisma
// Add to prisma/schema.prisma — Backtesting Engine models

model BacktestRun {
  id            String   @id @default(cuid())
  runAt         DateTime @default(now())
  dataStart     Date     String   // ISO date string of training corpus start
  holdoutStart  String   // ISO date string — hard boundary, e.g. "2022-01-01"
  windowCount   Int      // number of walk-forward steps
  stepMonths    Int      // test window length in months
  lambdaRidge   Float    // ridge regularization parameter used
  minRegimeSamples Int   // threshold for regime-specific vs global fallback
  notes         String?

  weightSets    FactorWeightSet[]
  metrics       BacktestMetric[]

  @@map("backtest_runs")
}

model FactorWeightSet {
  id           String   @id @default(cuid())
  runId        String
  regimeLabel  String   // regime label, or "global" for fallback
  wGrowth      Float
  wInflation   Float
  wMonetary    Float
  wCredit      Float
  wCarry       Float
  wEarnings    Float
  sampleCount  Int      // number of (ticker, date) observations used
  isFallback   Boolean  @default(false)
  createdAt    DateTime @default(now())

  run BacktestRun @relation(fields: [runId], references: [id], onDelete: Cascade)

  @@unique([runId, regimeLabel])
  @@map("factor_weight_sets")
}

model BacktestMetric {
  id           String   @id @default(cuid())
  runId        String
  window       String   // "oos" (walk-forward OOS aggregate) or "holdout"
  benchmark    String   // "SPY" or "ACWI"
  hitRate      Float    // 0-1
  sharpeAnn    Float    // annualized Sharpe on excess returns
  maxDrawdown  Float    // negative fraction
  startDate    String   // ISO date of metric window start
  endDate      String   // ISO date of metric window end
  nPeriods     Int      // number of test periods included
  createdAt    DateTime @default(now())

  run BacktestRun @relation(fields: [runId], references: [id], onDelete: Cascade)

  @@unique([runId, window, benchmark])
  @@map("backtest_metrics")
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Rolling window (fixed train size) | Expanding window (train always from dataStart) | More data used per step; weights stabilize over time |
| OLS regression | Ridge regression (L2 regularization) | Prevents weight blow-up when factors are correlated; critical for macro factor collinearity |
| Global single weight set | Per-regime weight sets with fallback | Captures regime-specific factor relevance (e.g., carry matters more in risk-off) |

---

## Open Questions

1. **Exact holdout boundary date**
   - What we know: "most recent 3 years" from the requirements
   - What's unclear: The DB may have data through late 2024 or 2025 — the exact holdout start depends on data availability
   - Recommendation: Declare `HOLDOUT_START = new Date('2022-01-01')` as the constant, which gives ~3 years from a 2025 run date. Verify data coverage in `verify-backtest.ts`.

2. **Forward return horizon**
   - What we know: Requirements say "directional calls" but don't specify 1-month vs 3-month
   - What's unclear: ALLC-03 (Phase 5) mentions "outperforms benchmark in next 6/12 months" — inconsistency with typical 21-day backtest steps
   - Recommendation: Use 21-trading-day (1-month) forward returns for optimization. Phase 5 can re-use weights and forecast at 6/12 months using a hold-period scaling approach.

3. **Universe for return computation**
   - What we know: `OhlcvDaily` has all universe tickers plus SPY and ACWI
   - What's unclear: Sector ETFs may have short inception histories — some rows will naturally have no forward price
   - Recommendation: Use proxy tickers (already defined in universe config) for pre-inception history, consistent with Phase 1 DATA-03 design.

4. **Walk-forward step size and minimum training period**
   - Recommendation: 3-month test steps, minimum 3 years training (36 steps across ~17 years of data excluding holdout gives ~5+ years of OOS coverage for the aggregate metric).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No test runner currently (Phase 1-3 used CLI verification scripts) |
| Config file | None — see Wave 0 |
| Quick run command | `npx tsc --noEmit` |
| Full suite command | `npm run verify:backtest` (to be created) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BACK-01 | No training row uses data >= testStart | smoke | `npm run verify:backtest` | Wave 0 |
| BACK-02 | Each regime has its own weight row; regimes below threshold have isFallback=true | smoke | `npm run verify:backtest` | Wave 0 |
| BACK-03 | No DB row has featureDate >= HOLDOUT_START in any training window | smoke | `npm run verify:backtest` | Wave 0 |
| BACK-04 | BacktestMetric rows with window="holdout" exist with hitRate, sharpeAnn, maxDrawdown fields | smoke | `npm run verify:backtest` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit`
- **Per wave merge:** `npx tsc --noEmit && npm run verify:backtest` (after run-backtest.ts exists)
- **Phase gate:** Full `npm run verify:backtest` green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/macro-engine/verify-backtest.ts` — covers all BACK-* requirements (DB assertion script)
- [ ] `package.json` — add `"run:backtest"` and `"verify:backtest"` scripts

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection: `prisma/schema.prisma`, `lib/macro-engine/regime/types.ts`, `lib/macro-engine/features/index.ts`, `package.json` — all confirmed present
- First-principles derivation: Ridge regression formula, Sharpe/drawdown/hit-rate formulas are standard quantitative finance definitions

### Secondary (MEDIUM confidence)
- `simple-statistics` npm package docs — standard deviation, mean functions available at v7.8.9 (confirmed installed)
- `ml-matrix` npm package — Matrix solve confirmed available (used in Phase 3)

### Tertiary (LOW confidence — not needed, all covered above)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; no new packages required
- Architecture: HIGH — pattern is consistent extension of Phase 3 orchestrator pattern; ridge regression math is exact
- Pitfalls: HIGH — look-ahead and holdout violations are well-understood failure modes; benchmark return formula verified from first principles
- DB schema: HIGH — directly derived from requirements; follows established Prisma patterns in this codebase

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (stable domain — formulas and installed libraries won't change)
