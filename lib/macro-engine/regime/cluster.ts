// lib/macro-engine/regime/cluster.ts
import { kmeans } from 'ml-kmeans';
import { prismaDirectUrl as prisma } from '../db';
import type { DailyFeatureVector, RegimeFitResult } from './types';
import { FEATURE_DIMENSIONS } from './types';
import { createId } from '@paralleldrive/cuid2';

/**
 * Query FactorFeatureMatrix and aggregate to one vector per date.
 * Z-score nulls are imputed to 0 (null = no data = average signal).
 * Returns vectors sorted by date ascending.
 *
 * Uses raw SQL with date-cursor pagination (2-year chunks) to stay under
 * Prisma Accelerate's 5MB response limit when querying the full history.
 */
export async function buildDailyFeatureVectors(
  startDate: Date,
  endDate: Date
): Promise<DailyFeatureVector[]> {
  const allRows: { featureDate: Date; zGrowth: number | null; zInflation: number | null; zMonetary: number | null; zCredit: number | null; zCarry: number | null; zEarnings: number | null }[] = [];

  // Paginate in 2-year chunks to stay under Accelerate's 5MB response limit
  const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;
  let chunkStart = new Date(startDate);
  while (chunkStart <= endDate) {
    const chunkEnd = new Date(Math.min(chunkStart.getTime() + TWO_YEARS_MS, endDate.getTime()));
    const chunk = await prisma.$queryRaw<{ featureDate: Date; zGrowth: number | null; zInflation: number | null; zMonetary: number | null; zCredit: number | null; zCarry: number | null; zEarnings: number | null }[]>`
      SELECT "featureDate", "zGrowth", "zInflation", "zMonetary", "zCredit", "zCarry", "zEarnings"
      FROM factor_feature_matrix
      WHERE "featureDate" >= ${chunkStart} AND "featureDate" <= ${chunkEnd}
      ORDER BY "featureDate" ASC
    `;
    allRows.push(...chunk);
    chunkStart = new Date(chunkEnd.getTime() + 24 * 60 * 60 * 1000); // next day
  }

  const rows = allRows;

  // Group raw nullable values by featureDate
  const byDate = new Map<string, Array<(number | null)[]>>();
  for (const row of rows) {
    const key = row.featureDate.toISOString().slice(0, 10);
    const vec: (number | null)[] = [
      row.zGrowth,
      row.zInflation,
      row.zMonetary,
      row.zCredit,
      row.zCarry,
      row.zEarnings,
    ];
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(vec);
  }

  let excludedDates = 0;
  const result: DailyFeatureVector[] = [];

  for (const [dateStr, vecs] of Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    // Count nulls per dimension across all asset rows for this date
    const dimNullCounts = FEATURE_DIMENSIONS.map((_, i) =>
      vecs.filter(v => v[i] === null).length
    );
    const totalNulls = dimNullCounts.reduce((s, n) => s + n, 0);
    const totalValues = vecs.length * FEATURE_DIMENSIONS.length;
    const nullFraction = totalNulls / totalValues;

    // Exclude dates where more than 50% of dimension values are null
    if (nullFraction > 0.5) {
      excludedDates++;
      continue;
    }

    // Average non-null values per dimension; impute remaining nulls to 0
    const vector = FEATURE_DIMENSIONS.map((_, i) => {
      const nonNull = vecs.map(v => v[i]).filter((x): x is number => x !== null);
      if (nonNull.length === 0) return 0; // dimension entirely missing — impute 0
      return nonNull.reduce((s, x) => s + x, 0) / nonNull.length;
    });

    result.push({ date: new Date(dateStr), vector });
  }

  if (excludedDates > 0) {
    console.warn(`buildDailyFeatureVectors: excluded ${excludedDates} date(s) with >50% null z-scores`);
  }

  return result;
}

/**
 * Fit k-means clusters on daily feature vectors.
 * seed=42 + kmeans++ initialization ensures determinism within a single run.
 */
export function fitClusters(
  dailyVectors: DailyFeatureVector[],
  k: number = 4
): RegimeFitResult {
  const data = dailyVectors.map(dv => dv.vector);
  const result = kmeans(data, k, {
    seed: 42,
    initialization: 'kmeans++',
    maxIterations: 300,
    tolerance: 1e-6,
  });
  return {
    fitId: createId(),
    fitDate: new Date(),
    k,
    centroids: result.centroids as number[][],
    clusterAssignments: result.clusters,
    converged: result.converged,
    iterations: result.iterations,
  };
}

/**
 * Auto-name a regime using its cluster index as the primary key, with the
 * dominant factor dimension appended for human readability.
 *
 * Using positional "Regime-{idx}" guarantees uniqueness across k clusters,
 * preventing the previous bug where two clusters with the same dominant
 * dimension (e.g. both "zCredit") collapsed to a single label downstream.
 *
 * @param centroid  - The cluster centroid vector
 * @param clusterIdx - The 0-based cluster index (ensures label uniqueness)
 */
// Human-readable suffix for each dimension index (zCarry is now momentum)
const REGIME_SUFFIX: Record<string, string> = {
  zGrowth:    'growth',
  zInflation: 'inflation',
  zMonetary:  'monetary',
  zCredit:    'credit',
  zCarry:     'momentum',
  zEarnings:  'earnings',
};

export function autoNameRegime(centroid: number[], clusterIdx: number): string {
  let maxAbs = -Infinity;
  let dominantIdx = 0;
  for (let i = 0; i < centroid.length; i++) {
    const abs = Math.abs(centroid[i]);
    if (abs > maxAbs) { maxAbs = abs; dominantIdx = i; }
  }
  const dimName = FEATURE_DIMENSIONS[dominantIdx];
  const suffix = maxAbs < 0.3 ? 'neutral' : (REGIME_SUFFIX[dimName] ?? dimName);
  return `Regime-${clusterIdx}-${suffix}`;
}
