// ─── Variable-level contribution to pillar and core scores ────────────────────

import { PILLAR_LABELS, PILLAR_WEIGHTS, type Pillar, type VariableDef } from './dictionary';
import type { CountryScore, ScoredVariable } from './scoring';

export interface VariableCoreContribution {
  id: string;
  label: string;
  pillar: Pillar;
  pillarLabel: string;
  rawValue: number | null;
  normalizedScore: number | null;
  weight: number;
  contributionToPillar: number | null;
  contributionToCore: number | null;
  unit: string;
}

/** Approximate marginal contribution: W_p × (fs×w / availW_in_pillar). */
export function variableContributionsToCore(
  score: CountryScore,
  variableDefs: VariableDef[]
): VariableCoreContribution[] {
  const out: VariableCoreContribution[] = [];
  const corePillars: Pillar[] = ['productive_capacity', 'human_capital', 'macro_sustainability', 'institutional', 'innovation'];

  for (const p of corePillars) {
    const ps = score.pillarScores[p];
    if (!ps) continue;
    const availW = ps.variables
      .filter(v => v.finalScore !== null)
      .reduce((s, v) => s + v.weight, 0);
    if (availW <= 0) continue;

    for (const v of ps.variables) {
      if (v.finalScore === null) continue;
      const def = variableDefs.find(d => d.id === v.id);
      const w = def?.weight ?? v.weight;
      const toPillar = (v.finalScore * w) / availW;
      const toCore = PILLAR_WEIGHTS[p] * toPillar;
      out.push({
        id: v.id,
        label: v.label,
        pillar: p,
        pillarLabel: PILLAR_LABELS[p],
        rawValue: v.rawValue,
        normalizedScore: v.finalScore,
        weight: w,
        contributionToPillar: toPillar,
        contributionToCore: toCore,
        unit: v.unit,
      });
    }
  }

  return out.sort((a, b) => (b.contributionToCore ?? 0) - (a.contributionToCore ?? 0));
}

export function topContributors(
  score: CountryScore,
  variableDefs: VariableDef[],
  n = 5
): { positive: VariableCoreContribution[]; negative: VariableCoreContribution[] } {
  const all = variableContributionsToCore(score, variableDefs);
  const sorted = [...all].sort((a, b) => (b.contributionToCore ?? 0) - (a.contributionToCore ?? 0));
  const positive = sorted.slice(0, n);
  const negative = [...all].sort((a, b) => (a.contributionToCore ?? 0) - (b.contributionToCore ?? 0)).slice(0, n);
  return { positive, negative };
}
