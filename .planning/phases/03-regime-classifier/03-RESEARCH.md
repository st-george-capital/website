# Phase 3: Regime Classifier - Research

**Researched:** 2026-04-08
**Domain:** Data-derived macro regime classification — k-means clustering, label stabilization, regime validation, Markov transition probabilities
**Confidence:** HIGH (k-means API, algorithm design, schema); MEDIUM (Wasserstein distance for template matching — no TypeScript library exists, must hand-roll ~30 lines)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REGM-01 | Data-derived clustering (k-means or GMM) on macro feature vector — regime labels emerge from data | ml-kmeans `kmeans(data, k, options)` with seeded init; feature vector = 6 z-scores from FactorFeatureMatrix |
| REGM-02 | Label stabilization via template matching across re-fits — same environment always maps to same label | Wasserstein distance between new cluster centroids and canonical template centroids; hand-rolled ~30-line implementation; no TypeScript npm library available |
| REGM-03 | Validation against 2008 GFC, 2020 COVID, 2022 rate shock | Programmatic check: query regime label for each window, assert each maps to a distinct label; specific date ranges documented below |
| REGM-04 | Regime transition probabilities P(changes in 3/6/12 months) from historical duration and transition frequency | Empirical Markov chain: count transitions between consecutive label pairs in historical sequence; compute row-stochastic matrix; derive k-step forward probabilities |

</phase_requirements>

---

## Summary

Phase 3 builds on the `FactorFeatureMatrix` table produced by Phase 2. The classifier reads all historical `(featureDate, ticker)` rows, aggregates to a single macro-economy-level feature vector per date (averaging z-scores across the universe), then clusters those daily vectors into 4–6 regime labels using k-means from `ml-kmeans`.

The two non-trivial problems are: (1) label stabilization across re-fits — k-means is non-deterministic and label-permutation-invariant, so the same economic environment can map to different integer labels on different runs; (2) transition probability estimation — P(regime changes in 3/6/12 months) must be derived from the empirical frequency and duration of historical regime sequences.

Label stabilization is solved by template-based matching: after the initial fit, save canonical cluster centroids to the DB as templates. On every subsequent re-fit, match new centroids to templates using minimum Euclidean distance (sufficient for centroid matching; Wasserstein is reserved for distribution-level comparisons). Seeded random initialization (`seed` option in ml-kmeans) eliminates non-determinism for single runs; template matching handles cross-run consistency.

Transition probabilities are computed by counting transitions in the historical label sequence, normalizing per row to produce a row-stochastic matrix, then computing k-step forward probabilities via matrix exponentiation for the 3/6/12-month horizons.

**Primary recommendation:** Use `ml-kmeans` with `k=4` initially (growth/inflation quadrant logic as prior), `seed=42`, save canonical centroids after first run, use centroid matching (Euclidean distance) for label stabilization on re-fits. Script pattern follows `run-feature-build.ts` — a standalone CLI `scripts/macro-engine/run-regime-fit.ts`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ml-kmeans` | 7.0.0 | K-means clustering on macro feature vectors | Pure TypeScript, seeded init, returns centroids + cluster assignments; already selected in STACK.md |
| `ml-matrix` | 6.12.1 | Matrix power computation for k-step Markov transition probabilities | Already planned in STACK.md; `Matrix` class supports `.mmul()` for matrix exponentiation |
| Prisma 5 | 5.22.0 (existing) | Store regime labels, canonical templates, transition matrix | No new dependency |

### No New External Libraries Needed
- Wasserstein distance: no TypeScript npm library exists (confirmed by search). Hand-roll ~30 lines (see Code Examples below). This is a simple 1D Wasserstein implementation for centroid distribution comparison — not the full optimal transport problem.
- In practice, for centroid template matching, Euclidean distance between centroid vectors is sufficient and simpler. Wasserstein is documented but centroid-Euclidean is recommended.

**Installation:**
```bash
npm install ml-kmeans ml-matrix
```

---

## Architecture Patterns

### Recommended Project Structure
```
lib/
└── macro-engine/
    └── regime/
        ├── index.ts            # classifyRegimes(startDate, endDate) — entry point
        ├── cluster.ts          # fitClusters(featureMatrix) → KMeansResult; buildFeatureVectors()
        ├── label-history.ts    # assignLabels(result, dates) → RegimeLabelRow[]; stabilizeLabels()
        ├── templates.ts        # loadTemplates(), saveTemplates(), matchToTemplate()
        └── transitions.ts      # computeTransitionMatrix(labels) → TransitionMatrix; kStepProb()
scripts/
└── macro-engine/
    └── run-regime-fit.ts       # CLI: fit clusters → stabilize labels → write DB → compute transitions
```

### Pattern 1: Aggregate Feature Vectors Per Date

**What:** The `FactorFeatureMatrix` has one row per `(featureDate, ticker)`. The regime classifier needs one vector per `featureDate` representing the macro environment. Average the z-scores across all tickers per date.

**When to use:** Always — clustering per-ticker vectors produces asset-level clusters, not regime clusters.

**Example:**
```typescript
// lib/macro-engine/regime/cluster.ts
import { prisma } from '../db';

export async function buildDailyFeatureVectors(
  startDate: Date,
  endDate: Date
): Promise<{ date: Date; vector: number[] }[]> {
  const rows = await prisma.factorFeatureMatrix.findMany({
    where: { featureDate: { gte: startDate, lte: endDate } },
    orderBy: { featureDate: 'asc' },
  });

  // Group by featureDate, average z-scores across tickers
  const byDate = new Map<string, number[][]>();
  for (const row of rows) {
    const key = row.featureDate.toISOString().slice(0, 10);
    const vec = [
      row.zGrowth ?? 0,
      row.zInflation ?? 0,
      row.zMonetary ?? 0,
      row.zCredit ?? 0,
      row.zCarry ?? 0,
      row.zEarnings ?? 0,
    ];
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(vec);
  }

  return Array.from(byDate.entries()).map(([dateStr, vecs]) => ({
    date: new Date(dateStr),
    vector: vecs[0].map((_, i) => vecs.reduce((s, v) => s + v[i], 0) / vecs.length),
  }));
}
```

### Pattern 2: Seeded K-Means with Template Stabilization

**What:** Run k-means with `seed=42` for determinism within a single run. After first run, save centroids as canonical templates to DB. On re-fits, match new centroids to templates by minimum Euclidean distance to produce stable label mapping.

**When to use:** Every time the classifier is re-fit.

**Example:**
```typescript
// lib/macro-engine/regime/cluster.ts
import { kmeans } from 'ml-kmeans';

export function fitClusters(
  vectors: number[][],
  k: number = 4
) {
  return kmeans(vectors, k, {
    seed: 42,
    initialization: 'kmeans++',  // better convergence than random
    maxIterations: 300,
    tolerance: 1e-6,
  });
}
```

```typescript
// lib/macro-engine/regime/templates.ts
// Match new centroids to canonical templates using Euclidean distance
export function matchToTemplates(
  newCentroids: number[][],
  templateCentroids: number[][]
): number[] {
  // Returns permutation: permutation[newIdx] = templateIdx
  const k = newCentroids.length;
  const permutation: number[] = new Array(k).fill(-1);
  const used = new Set<number>();

  for (let ni = 0; ni < k; ni++) {
    let bestTemplate = -1;
    let bestDist = Infinity;
    for (let ti = 0; ti < k; ti++) {
      if (used.has(ti)) continue;
      const dist = euclideanDist(newCentroids[ni], templateCentroids[ti]);
      if (dist < bestDist) { bestDist = dist; bestTemplate = ti; }
    }
    permutation[ni] = bestTemplate;
    used.add(bestTemplate);
  }
  return permutation;
}

function euclideanDist(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
}
```

### Pattern 3: Empirical Markov Transition Matrix

**What:** Count how many times the historical label sequence transitions from regime i to regime j, normalize to produce a row-stochastic matrix. Use matrix exponentiation for k-step probabilities.

**When to use:** After all historical labels are assigned.

**Example:**
```typescript
// lib/macro-engine/regime/transitions.ts
import { Matrix } from 'ml-matrix';

export function computeTransitionMatrix(
  labels: number[],  // ordered time series of regime labels
  k: number           // number of regimes
): number[][] {
  const counts = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < labels.length - 1; i++) {
    counts[labels[i]][labels[i + 1]]++;
  }
  // Normalize each row
  return counts.map(row => {
    const total = row.reduce((s, v) => s + v, 0);
    return total === 0 ? row.map(() => 1 / k) : row.map(v => v / total);
  });
}

// k-step probability via matrix exponentiation
export function kStepTransitionProb(
  transMatrix: number[][],
  stepsAhead: number  // trading days (e.g., 63 = 3 months, 126 = 6 months, 252 = 12 months)
): number[][] {
  let m = new Matrix(transMatrix);
  for (let i = 1; i < stepsAhead; i++) {
    m = m.mmul(new Matrix(transMatrix));
  }
  return m.to2DArray();
}
```

### Anti-Patterns to Avoid

- **Cluster per ticker:** Running k-means on individual ticker feature vectors produces asset clusters, not macro regime clusters. Always aggregate to one vector per date first.
- **Re-fitting daily:** Re-fit the classifier monthly or on-demand only, never daily. Daily re-fits cause label instability and defeat the purpose of regime persistence.
- **Using label integers directly in downstream code:** Label 0/1/2/3 are meaningless without the template mapping. Always store the canonical label name (e.g., "risk-off") alongside the integer.
- **k > 6 without validating sample count:** Each regime needs at least 30 historical samples for reliable transition matrix estimation. With 20 years of daily data, 4 regimes gives ~1250 days per regime on average. Do not increase k beyond 6 without checking minimum sample counts.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| K-means clustering | Custom centroid iteration | `ml-kmeans` | Correct convergence, k-means++ initialization, seeded RNG |
| Matrix multiplication for k-step probs | Manual nested loop | `ml-matrix` `.mmul()` | Handles numerical precision, existing dependency |
| Feature matrix query | Custom SQL aggregation | `prisma.factorFeatureMatrix.findMany()` + JS aggregation | Pattern already established in Phase 2 |

**Key insight:** The only genuinely custom code in this phase is: (1) the centroid template matching (20 lines), (2) the transition matrix counter (15 lines), and (3) the date-range validation against known historical periods. Everything else delegates to ml-kmeans and Prisma.

---

## Common Pitfalls

### Pitfall 1: K-Means Label Permutation Across Re-Fits
**What goes wrong:** K-means assigns cluster labels (0, 1, 2, 3) arbitrarily — the same economic regime can be "Regime 2" today and "Regime 0" after tomorrow's re-fit. Factor weight sets stored per-regime in Phase 4 become silently mismatched.
**Why it happens:** K-means is label-permutation invariant by design. No canonical ordering exists.
**How to avoid:** After first fit, persist centroids as canonical templates in a `RegimeTemplate` DB table. On every re-fit, match new centroid `i` to the template closest in Euclidean distance, then remap the label sequence.
**Warning signs:** Running the classifier twice on identical data produces different integer labels for the same dates.

### Pitfall 2: Non-Determinism Within a Single Run
**What goes wrong:** K-means++ initialization is random. Without a seed, running the script twice produces different results even on the same data.
**How to avoid:** Pass `seed: 42` in `kmeans()` options. Confirm: ml-kmeans `seed` option is verified to exist in the API (HIGH confidence from official docs).
**Warning signs:** The look-alike test (run twice, compare) fails.

### Pitfall 3: Null Z-Scores in Feature Vectors
**What goes wrong:** `FactorFeatureMatrix` rows have nullable z-scores (e.g., `zCarry` is null for sector ETFs, early dates may have null `zCredit` before BAMLH0A0HYM2 series begins). Passing null-containing arrays to k-means produces NaN centroids and cluster assignments.
**How to avoid:** In `buildDailyFeatureVectors`, impute nulls to 0 (zero = no signal) before clustering. Document this imputation — it means "no data" is treated as "average signal," not missing.
**Warning signs:** `result.centroids` contains `NaN` values; cluster assignments are all the same label.

### Pitfall 4: Validating Against Wrong Date Ranges
**What goes wrong:** Using imprecise date ranges for 2008/2020/2022 validation leads to the test passing or failing for the wrong reasons.
**How to avoid:** Use the canonical windows below (from NBER/Fed documentation):
- **2008 GFC peak stress:** 2008-09-01 to 2009-03-31 (Lehman collapse + acute phase)
- **2020 COVID shock:** 2020-02-15 to 2020-05-31 (initial shock + recovery start)
- **2022 rate shock:** 2022-03-01 to 2022-12-31 (Fed hiking cycle onset)

Validation logic: assert that the modal regime label within each window is distinct from the modal label in the other two windows. Do not require all dates within a window to have the same label — regime transitions within stress periods are normal.

### Pitfall 5: Transition Matrix with Zero Rows
**What goes wrong:** A rarely-occurring regime may have zero transitions observed from it to other regimes in the historical record, producing a zero row in the transition matrix. Matrix exponentiation then produces zero rows in k-step matrices, making `P(any transition | rare regime) = 0` rather than a proper probability.
**How to avoid:** Apply Laplace smoothing: add a small epsilon (e.g., 0.01) to all transition counts before normalizing, so every transition is possible.

---

## Code Examples

### Full K-Means Fit with Seeded Init
```typescript
// Source: ml-kmeans GitHub (https://github.com/mljs/kmeans)
import { kmeans } from 'ml-kmeans';

const result = kmeans(data, 4, {
  seed: 42,
  initialization: 'kmeans++',
  maxIterations: 300,
  tolerance: 1e-6,
});
// result.clusters: number[] — assignment per data point
// result.centroids: number[][] — [k x dim] centroid positions
// result.converged: boolean
// result.iterations: number
```

### Regime Validation Check
```typescript
// Check modal regime in each known shock window
function modalLabel(labels: Array<{ date: Date; label: number }>, start: Date, end: Date): number {
  const window = labels.filter(l => l.date >= start && l.date <= end);
  const counts = new Map<number, number>();
  for (const { label } of window) counts.set(label, (counts.get(label) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

const gfcLabel    = modalLabel(history, new Date('2008-09-01'), new Date('2009-03-31'));
const covidLabel  = modalLabel(history, new Date('2020-02-15'), new Date('2020-05-31'));
const rateLabel   = modalLabel(history, new Date('2022-03-01'), new Date('2022-12-31'));

if (gfcLabel === covidLabel || gfcLabel === rateLabel || covidLabel === rateLabel) {
  throw new Error(`Regime validation failed: shock windows share labels (${gfcLabel}, ${covidLabel}, ${rateLabel})`);
}
```

### Choosing K (Elbow Method Inline)
```typescript
// Run for k=3,4,5,6 and compare within-cluster sum of squares (WCSS)
// ml-kmeans result.computeInformation(data) returns { centroid, error, size }[] per cluster
// WCSS = sum of all errors
function computeWCSS(data: number[][], k: number): number {
  const result = kmeans(data, k, { seed: 42, initialization: 'kmeans++' });
  return result.computeInformation(data).reduce((s, c) => s + c.error, 0);
}
// Start with k=4; increase only if WCSS decreases significantly (>15%) AND all regimes have >=30 observations
```

---

## DB Schema Additions

Three new Prisma models are needed:

```prisma
// Canonical cluster centroids saved after first fit — used for template matching on re-fits
model RegimeTemplate {
  id          String   @id @default(cuid())
  fitDate     DateTime // when this template was created
  regimeLabel String   // canonical name: "risk-off", "growth", "inflation", "tightening"
  labelIndex  Int      // 0-based integer used in cluster assignments
  centroidJson String  // JSON: number[] — 6-dim centroid vector
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@map("regime_templates")
}

// Historical regime label per date (one row per calendar date)
model RegimeLabel {
  date           DateTime @id
  regimeLabel    String   // canonical name e.g. "risk-off"
  labelIndex     Int      // integer from k-means
  confidence     Float?   // optional: distance to nearest centroid (inverted)
  fitId          String   // which regime fit produced this label
  createdAt      DateTime @default(now())

  @@map("regime_labels")
}

// Transition probability matrix row
model RegimeTransition {
  id            String   @id @default(cuid())
  fitId         String
  fromLabel     String
  toLabel       String
  prob1Day      Float    // P(transition in 1 trading day)
  prob63Day     Float    // P(transition in ~3 months)
  prob126Day    Float    // P(transition in ~6 months)
  prob252Day    Float    // P(transition in ~12 months)
  computedAt    DateTime @default(now())

  @@unique([fitId, fromLabel, toLabel])
  @@map("regime_transitions")
}
```

**`fitId`** is a string (cuid or ISO timestamp string) shared across `RegimeLabel` and `RegimeTransition` rows for a single classifier run — makes it easy to query "all labels from the most recent fit."

---

## Phase 4 Interface Contract

Phase 4 (Backtester) needs from this phase:

| Need | Source | Query |
|------|--------|-------|
| Regime label for any historical date | `RegimeLabel.regimeLabel` | `findFirst({ where: { date: { lte: targetDate } }, orderBy: { date: 'desc' } })` |
| List of all distinct regime labels | `RegimeLabel` distinct | `findMany({ distinct: ['regimeLabel'] })` |
| Current regime label | `RegimeLabel` latest | `findFirst({ orderBy: { date: 'desc' } })` |
| P(transition in 3/6/12 months) | `RegimeTransition` | `findFirst({ where: { fitId: latestFitId, fromLabel: currentLabel } })` |

The backtester never calls any function in `lib/macro-engine/regime/`. It reads only from the DB tables above. This follows the offline/online separation pattern established in Phase 1.

---

## Script Architecture

The classifier runs as `scripts/macro-engine/run-regime-fit.ts`, following the same pattern as `run-feature-build.ts`:

```
run-regime-fit.ts
  1. Read all FactorFeatureMatrix rows for the configured date range
  2. Aggregate to daily feature vectors (average z-scores across universe)
  3. Run kmeans(vectors, k, { seed: 42, initialization: 'kmeans++' })
  4. Load canonical templates from DB (if exist) → match new centroids → remap labels
  5. If no templates exist → first run → save new centroids as canonical templates
  6. Upsert all RegimeLabel rows (date → canonicalLabel)
  7. Compute transition matrix from full label sequence
  8. Upsert RegimeTransition rows
  9. Run validation: assert 2008/2020/2022 windows map to distinct labels
  10. Exit 0 on success, 1 on validation failure
```

**Cron schedule:** Monthly or on-demand only, never daily. Daily cron runs only `run-scoring.ts` (Phase 5).

**npm script to add:**
```json
"fit:regimes": "tsx scripts/macro-engine/run-regime-fit.ts"
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Hardcoded regime definitions (growth/inflation quadrant) | Data-derived k-means / GMM clustering | Labels reflect actual data structure, not analyst assumptions |
| Fixed global factor weights | Per-regime weight sets | Different macro environments weight factors differently |
| Re-fit k-means with no label stabilization | Template-matched canonical centroids | Eliminates silent label permutation between runs |
| Empirical hit rate in-sample | Walk-forward OOS validation with held-out set (Phase 4) | Prevents overfitting |

**Deprecated/outdated:**
- Python HMM via pythonia bridge: Not needed for Phase 3. Revisit in v2 if k-means regime labels prove too noisy.
- `seed` param not being used: Some older examples of ml-kmeans skip the seed. Always use it.

---

## Open Questions

1. **Choosing k: 4 or 5?**
   - What we know: STACK.md and FEATURES.md both say start with 4 (growth/inflation quadrant logic). Each additional regime requires more historical samples.
   - What's unclear: Whether 20 years of daily data produces clean 4-regime structure or whether 5 is empirically better.
   - Recommendation: Start with k=4, run elbow method inline (WCSS for k=3..6), and report WCSS ratios. Let the planner decide to hard-code k=4 or use the elbow method result.

2. **Canonical label names: assign in code or post-hoc?**
   - What we know: Naming regimes (e.g., "risk-off", "growth") requires inspecting centroid values. The classifier can output names automatically by checking which z-scores are highest in each centroid.
   - What's unclear: Whether automatic naming will be robust enough to not require manual inspection.
   - Recommendation: Auto-name based on dominant z-score dimension in centroid (e.g., highest `zInflation` = "inflation"), but store as a DB field so it can be overridden without re-fitting.

3. **Template matching: Euclidean vs. Wasserstein?**
   - What we know: No TypeScript npm library for Wasserstein exists. Centroid-to-centroid Euclidean distance is computationally equivalent for matching prototype centroids.
   - What's unclear: Whether Euclidean is sufficient for production label stability.
   - Recommendation: Use Euclidean distance for centroid matching (sufficient and simpler). Document Wasserstein as a v2 upgrade if label instability is observed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | TypeScript compiler check (`tsc --noEmit`) + runtime assertion scripts |
| Config file | tsconfig.json (existing) |
| Quick run command | `npx tsc --noEmit` |
| Full suite command | `npm run fit:regimes -- --validate-only` (validation-only mode, no DB writes) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REGM-01 | k-means produces non-degenerate clusters (all k labels assigned) | smoke | `npm run fit:regimes -- --validate-only` | ❌ Wave 0 |
| REGM-02 | Two runs with identical data produce identical label assignments | unit | `npx tsx scripts/macro-engine/verify-regime-stability.ts` | ❌ Wave 0 |
| REGM-03 | 2008/2020/2022 windows map to distinct modal labels | smoke | embedded in `run-regime-fit.ts` validation step | ❌ Wave 0 |
| REGM-04 | Transition matrix rows sum to 1.0 (± 1e-9) and k-step probs are valid | unit | embedded in `transitions.ts` tests | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit`
- **Per wave merge:** `npm run fit:regimes -- --validate-only` (dry-run, reads DB, no writes)
- **Phase gate:** All 4 REGM-0x validations green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/macro-engine/verify-regime-stability.ts` — covers REGM-02 (run classifier twice, assert label agreement)
- [ ] `--validate-only` flag in `run-regime-fit.ts` — covers REGM-01, REGM-03, REGM-04 in dry-run mode
- [ ] `npm install ml-kmeans ml-matrix` — neither package is installed (confirmed via `npm list`)

---

## Sources

### Primary (HIGH confidence)
- ml-kmeans GitHub (https://github.com/mljs/kmeans) — function signature, options (seed, initialization, maxIterations, tolerance, distance), KMeansResult shape
- Phase 2 RESEARCH.md + SUMMARY files — FeatureRow schema, FactorFeatureMatrix Prisma model, existing patterns
- STACK.md — ml-kmeans selection rationale, k-means vs. HMM decision tree
- PITFALLS.md — Regime label instability (Pitfall 3), template matching with Wasserstein distance guidance
- FEATURES.md — 4-regime starting point, sample count minimum, validation against 2008/2020/2022

### Secondary (MEDIUM confidence)
- Tactical Asset Allocation with Macroeconomic Regime Detection (arXiv 2025, https://arxiv.org/html/2503.11499v2) — confirms k-means + template stabilization as current practice
- Market Regime Detection via LSEG (https://developers.lseg.com/en/article-catalog/article/market-regime-detection) — centroid matching pattern
- James McCaffrey Wasserstein JS blog (2023) — confirmed no mature TS library exists; hand-roll is correct approach

### Tertiary (LOW confidence)
- Wasserstein K-Means tutorial (https://www.marketcalls.in/python/identifying-market-regimes-with-the-wasserstein-k-means-algorithm-python-tutorial.html) — Python-only; Euclidean centroid matching recommended instead for TypeScript

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — ml-kmeans API verified from official GitHub; ml-matrix established in Phase 2
- Architecture: HIGH — follows exact patterns from Phase 2 (script-based, offline, Prisma upsert)
- Pitfalls: HIGH — all from PITFALLS.md which is validated research
- Wasserstein implementation: MEDIUM — no TypeScript library; Euclidean centroid matching recommended as simpler alternative

**Research date:** 2026-04-08
**Valid until:** 2026-07-08 (90 days — ml-kmeans is stable, patterns are framework-independent)
