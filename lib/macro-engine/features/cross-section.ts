// lib/macro-engine/features/cross-section.ts
import { crossSectionZScore } from '../../country-health/scoring';
import type { FeatureRow } from '../types';

type FactorKey = 'zGrowth' | 'zInflation' | 'zMonetary' | 'zCredit' | 'zCarry' | 'zEarnings';
type RankKey   = 'rankGrowth' | 'rankInflation' | 'rankMonetary' | 'rankCredit' | 'rankCarry' | 'rankEarnings';

const FACTOR_TO_RANK: Record<FactorKey, RankKey> = {
  zGrowth:    'rankGrowth',
  zInflation: 'rankInflation',
  zMonetary:  'rankMonetary',
  zCredit:    'rankCredit',
  zCarry:     'rankCarry',
  zEarnings:  'rankEarnings',
};

/**
 * For a set of FeatureRows at the same date, compute cross-sectional percentile ranks
 * for each of the 6 macro factors. Mutates rank_ fields on each row.
 * Rows with null z-scores receive null rank — NOT 0.
 */
export function computeCrossSection(rows: FeatureRow[]): FeatureRow[] {
  for (const [zKey, rankKey] of Object.entries(FACTOR_TO_RANK) as [FactorKey, RankKey][]) {
    const values = rows.map(r => r[zKey]);
    const ranks = crossSectionZScore(values);
    rows.forEach((r, i) => { r[rankKey] = ranks[i]; });
  }
  return rows;
}
