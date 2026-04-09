// lib/macro-engine/regime/types.ts
// TypeScript contracts for Phase 3 — Regime Classifier.
// These shapes mirror the Prisma models exactly to avoid impedance mismatch.

/** One row from FactorFeatureMatrix aggregated to a daily macro vector. */
export interface DailyFeatureVector {
  date: Date;
  vector: number[]; // [zGrowth, zInflation, zMonetary, zCredit, zCarry, zEarnings] — nulls imputed to 0
}

/** Result of a single k-means fit run. */
export interface RegimeFitResult {
  fitId: string;           // cuid or ISO timestamp string — shared key for this run
  fitDate: Date;
  k: number;
  centroids: number[][];   // [k x 6] centroid positions
  clusterAssignments: number[]; // per-vector label (0..k-1, pre-stabilization)
  converged: boolean;
  iterations: number;
}

/** One persisted regime label for a calendar date. Mirrors RegimeLabel Prisma model. */
export interface RegimeLabelRow {
  date: Date;
  regimeLabel: string;     // canonical name e.g. "risk-off", "growth"
  labelIndex: number;      // integer 0..k-1
  confidence: number | null;
  fitId: string;
}

/** One row of the transition probability matrix. Mirrors RegimeTransition Prisma model. */
export interface TransitionMatrixRow {
  fitId: string;
  fromLabel: string;
  toLabel: string;
  prob1Day: number;
  prob63Day: number;
  prob126Day: number;
  prob252Day: number;
}

/** Canonical centroid template stored after first fit. Mirrors RegimeTemplate Prisma model. */
export interface RegimeTemplateRow {
  id: string;
  fitDate: Date;
  regimeLabel: string;
  labelIndex: number;
  centroidJson: string;    // JSON-serialized number[]
  isActive: boolean;
}

/** Dimension ordering for feature vectors — must be consistent everywhere. */
export const FEATURE_DIMENSIONS = ['zGrowth', 'zInflation', 'zMonetary', 'zCredit', 'zCarry', 'zEarnings'] as const;
export type FeatureDimension = typeof FEATURE_DIMENSIONS[number];
