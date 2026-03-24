// ─── Scoring engine for Country Health Index ─────────────────────────────────
//
// Flow:
//   raw values → direction-adjust → z-score normalize → momentum blend → pillar avg → core score

import { VARIABLES, PILLAR_WEIGHTS, getVariablesByPillar, type Pillar, type VariableDef } from './dictionary';
import { classify } from './classification';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawVariableRow {
  id: string;             // variable id from dictionary
  country: string;        // ISO2
  level: number | null;   // most-recent value
  prevLevel: number | null; // one-year-ago value (for momentum)
  population: number | null; // used only for per-capita patent normalization
}

export interface ScoredVariable {
  id: string;
  label: string;
  pillar: Pillar;
  rawValue: number | null;
  unit: string;
  direction: string;
  kind: string;
  normalizedLevel: number | null;   // 0–1
  normalizedChange: number | null;  // 0–1 (only populated if useChange=true)
  finalScore: number | null;        // 0–1 blended
  why: string;
  missing: boolean;
}

export interface PillarScore {
  pillar: Pillar;
  score: number | null;   // 0–1
  completeness: number;   // 0–1
  variables: ScoredVariable[];
}

export interface CountryScore {
  country: string;
  coreScore: number | null;          // 0–100
  overlayScore: number | null;       // 0–100
  pillarScores: Record<Pillar, PillarScore>;
  completeness: number;              // % of variables with data
  classification: string;
  classificationColor: string;
}

// ─── Step 1: direction-adjust (invert down_good to make high=good universal) ──

function directionAdjust(value: number | null, def: VariableDef): number | null {
  if (value === null) return null;
  // Raw value is kept as-is for display; we negate down_good only during scoring
  return def.direction === 'down_good' ? -value : value;
}

// ─── Step 2: z-score normalize across a cross-section of countries ────────────
//
// Takes an array of (possibly null) direction-adjusted values and returns
// z-scores clamped to [−3, +3] then scaled to [0, 1].
//
// Missing values get null (not scored, not counted against denominator for mean).

export function crossSectionZScore(values: (number | null)[]): (number | null)[] {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length < 2) return values.map(() => null);

  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  const variance = valid.reduce((a, b) => a + (b - mean) ** 2, 0) / valid.length;
  const std = Math.sqrt(variance);
  if (std === 0) return values.map(v => (v !== null ? 0.5 : null));

  return values.map(v => {
    if (v === null) return null;
    const z = Math.max(-3, Math.min(3, (v - mean) / std));
    return (z + 3) / 6; // scale to [0,1]
  });
}

// ─── Step 3: momentum blend for variables with useChange=true ─────────────────
//
// finalScore = 0.70 * normalizedLevel + 0.30 * normalizedChange
// If one side is unavailable, use the available side at full weight.

function blendScore(
  normLevel: number | null,
  normChange: number | null,
  useChange: boolean
): number | null {
  if (!useChange || normChange === null) return normLevel;
  if (normLevel === null) return normChange;
  return 0.7 * normLevel + 0.3 * normChange;
}

// ─── Main scoring function ────────────────────────────────────────────────────
//
// rawRows: one entry per (country × variable) — covers all countries/variables
// population: { [iso2]: number } — for per-capita patent normalization

export function scoreCountries(
  rawRows: RawVariableRow[],
  populations: Record<string, number>
): CountryScore[] {
  const allCountries = [...new Set(rawRows.map(r => r.country))];

  // Index raw data: { variableId -> { country -> RawVariableRow } }
  const index: Map<string, Map<string, RawVariableRow>> = new Map();
  for (const row of rawRows) {
    if (!index.has(row.id)) index.set(row.id, new Map());
    index.get(row.id)!.set(row.country, row);
  }

  // Normalize each variable cross-sectionally
  // Build: { variableId -> { country -> ScoredVariable } }
  const scoredIndex: Map<string, Map<string, ScoredVariable>> = new Map();

  for (const def of VARIABLES) {
    const varMap = index.get(def.id);

    // Collect raw levels and changes for all countries
    const levels: (number | null)[] = allCountries.map(c => {
      const row = varMap?.get(c);
      if (!row) return null;
      let val = row.level;
      // Special: patents → normalize per million population
      if (def.id === 'patent_applications' && val !== null) {
        const pop = populations[c] ?? row.population;
        if (pop && pop > 0) val = (val / pop) * 1_000_000;
      }
      // Special: ip_receipts → per capita
      if (def.id === 'ip_receipts' && val !== null) {
        const pop = populations[c] ?? row.population;
        if (pop && pop > 0) val = (val / pop);
      }
      // Special: listed_companies → per million population
      if (def.id === 'listed_companies' && val !== null) {
        const pop = populations[c] ?? row.population;
        if (pop && pop > 0) val = (val / pop) * 1_000_000;
      }
      // Special: portfolio_inflows → per capita
      if (def.id === 'portfolio_inflows' && val !== null) {
        const pop = populations[c] ?? row.population;
        if (pop && pop > 0) val = (val / pop);
      }
      return directionAdjust(val, def);
    });

    const changes: (number | null)[] = def.useChange
      ? allCountries.map(c => {
          const row = varMap?.get(c);
          if (!row || row.level === null || row.prevLevel === null) return null;
          const chg = row.level - row.prevLevel;
          return directionAdjust(chg, def);
        })
      : allCountries.map(() => null);

    const normLevels = crossSectionZScore(levels);
    const normChanges = def.useChange ? crossSectionZScore(changes) : allCountries.map(() => null);

    const map: Map<string, ScoredVariable> = new Map();
    allCountries.forEach((c, i) => {
      const row = varMap?.get(c);
      const rawVal = row?.level ?? null;
      const normL = normLevels[i];
      const normC = normChanges[i];
      const final = blendScore(normL, normC, def.useChange);
      map.set(c, {
        id: def.id,
        label: def.label,
        pillar: def.pillar,
        rawValue: rawVal,
        unit: def.unit,
        direction: def.direction,
        kind: def.kind,
        normalizedLevel: normL,
        normalizedChange: normC,
        finalScore: final,
        why: def.why,
        missing: rawVal === null,
      });
    });
    scoredIndex.set(def.id, map);
  }

  // Build per-country scores
  return allCountries.map(country => {
    const pillarList: Pillar[] = [
      'productive_capacity', 'human_capital', 'macro_sustainability', 'institutional', 'innovation', 'overlay',
    ];

    const pillarScores: Record<Pillar, PillarScore> = {} as Record<Pillar, PillarScore>;

    for (const pillar of pillarList) {
      const defs = getVariablesByPillar(pillar);
      const vars: ScoredVariable[] = defs.map(def => {
        const map = scoredIndex.get(def.id);
        return map?.get(country) ?? {
          id: def.id,
          label: def.label,
          pillar,
          rawValue: null,
          unit: def.unit,
          direction: def.direction,
          kind: def.kind,
          normalizedLevel: null,
          normalizedChange: null,
          finalScore: null,
          why: def.why,
          missing: true,
        };
      });

      const totalWeight = defs.reduce((s, d) => s + d.weight, 0);
      const available = vars.filter(v => v.finalScore !== null);
      const availableWeight = defs
        .filter((_, i) => vars[i].finalScore !== null)
        .reduce((s, d) => s + d.weight, 0);

      let score: number | null = null;
      if (available.length > 0) {
        const weightedSum = defs.reduce((s, d, i) => {
          const fs = vars[i].finalScore;
          return fs !== null ? s + fs * d.weight : s;
        }, 0);
        score = weightedSum / availableWeight;
      }

      pillarScores[pillar] = {
        pillar,
        score,
        completeness: totalWeight > 0 ? availableWeight / totalWeight : 0,
        variables: vars,
      };
    }

    // Core score: weighted average of core pillars (exclude overlay)
    const corePillars: Pillar[] = ['productive_capacity', 'human_capital', 'macro_sustainability', 'institutional', 'innovation'];
    let coreWsum = 0, coreTotalW = 0;
    for (const p of corePillars) {
      const ps = pillarScores[p];
      if (ps.score !== null) {
        coreWsum += ps.score * PILLAR_WEIGHTS[p];
        coreTotalW += PILLAR_WEIGHTS[p];
      }
    }
    const coreScore = coreTotalW > 0 ? (coreWsum / coreTotalW) * 100 : null;

    // Overlay score
    const overlayPs = pillarScores['overlay'];
    const overlayScore = overlayPs.score !== null ? overlayPs.score * 100 : null;

    // Completeness
    const allVars = VARIABLES.filter(v => v.pillar !== 'overlay');
    const presentVars = allVars.filter(v => {
      const m = scoredIndex.get(v.id);
      return m?.get(country)?.missing === false;
    });
    const completeness = allVars.length > 0 ? presentVars.length / allVars.length : 0;

    // Classification
    const { label, color } = classify(coreScore, overlayScore, pillarScores);

    return {
      country,
      coreScore,
      overlayScore,
      pillarScores,
      completeness,
      classification: label,
      classificationColor: color,
    };
  });
}
