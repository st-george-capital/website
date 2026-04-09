// lib/macro-engine/regime/cluster.ts
import { kmeans } from 'ml-kmeans';
import { prisma } from '../db';
import type { DailyFeatureVector, RegimeFitResult } from './types';
import { FEATURE_DIMENSIONS } from './types';
import { createId } from '@paralleldrive/cuid2';

/**
 * Query FactorFeatureMatrix and aggregate to one vector per date.
 * Z-score nulls are imputed to 0 (null = no data = average signal).
 * Returns vectors sorted by date ascending.
 */
export async function buildDailyFeatureVectors(
  startDate: Date,
  endDate: Date
): Promise<DailyFeatureVector[]> {
  const rows = await prisma.factorFeatureMatrix.findMany({
    where: { featureDate: { gte: startDate, lte: endDate } },
    orderBy: { featureDate: 'asc' },
    select: {
      featureDate: true,
      zGrowth: true,
      zInflation: true,
      zMonetary: true,
      zCredit: true,
      zCarry: true,
      zEarnings: true,
    },
  });

  // Group by featureDate
  const byDate = new Map<string, number[][]>();
  for (const row of rows) {
    const key = row.featureDate.toISOString().slice(0, 10);
    // null → 0: no data treated as average signal
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

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, vecs]) => ({
      date: new Date(dateStr),
      vector: FEATURE_DIMENSIONS.map((_, i) =>
        vecs.reduce((s, v) => s + v[i], 0) / vecs.length
      ),
    }));
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
 * Auto-name a regime based on its dominant z-score dimension.
 * Returns the FEATURE_DIMENSIONS name with the highest absolute centroid value.
 * Used when no canonical name has been assigned to a label yet.
 */
export function autoNameRegime(centroid: number[]): string {
  let maxAbs = -Infinity;
  let dominantIdx = 0;
  for (let i = 0; i < centroid.length; i++) {
    const abs = Math.abs(centroid[i]);
    if (abs > maxAbs) { maxAbs = abs; dominantIdx = i; }
  }
  // If all values near zero, call it "neutral"
  if (maxAbs < 0.3) return 'neutral';
  return FEATURE_DIMENSIONS[dominantIdx];
}
