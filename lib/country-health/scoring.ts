// ─── Scoring engine for Country Health Index ─────────────────────────────────
//
// Flow:
//   raw values → direction-adjust → z-score normalize → momentum blend → pillar avg → core score

import { VARIABLES, PILLAR_WEIGHTS, getVariablesByPillarFrom, type Pillar, type VariableDef } from './dictionary';
import { classify } from './classification';

const EPS = 1e-6;

// ─── Confidence tiers (weight coverage within pillar) ────────────────────────
export const PILLAR_COVERAGE_SUPPRESSED = 0.25; // below: no pillar score
export const PILLAR_COVERAGE_LOW = 0.40;        // amber / low-data badge
export const PILLAR_COVERAGE_NORMAL = 0.70;     // below: amber until here

export type PillarConfidenceTier = 'suppressed' | 'low' | 'amber' | 'normal';

export function pillarConfidenceTier(completeness: number): PillarConfidenceTier {
  if (completeness < PILLAR_COVERAGE_SUPPRESSED) return 'suppressed';
  if (completeness < PILLAR_COVERAGE_LOW) return 'low';
  if (completeness < PILLAR_COVERAGE_NORMAL) return 'amber';
  return 'normal';
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawVariableRow {
  id: string;
  country: string;
  level: number | null;
  prevLevel: number | null;
  population: number | null;
  dataYear: string | null;
}

export interface PillarConcentration {
  hhi: number | null;           // Herfindahl on contribution shares (1 = one driver)
  top2Share: number | null;     // sum of two largest shares
  concentrated: boolean;        // true if top2 > 0.7 or hhi > 0.5
  topDrivers: string[];         // up to 2 variable labels
}

export interface ScoredVariable {
  id: string;
  label: string;
  pillar: Pillar;
  rawValue: number | null;
  unit: string;
  direction: string;
  kind: string;
  normalizedLevel: number | null;
  normalizedChange: number | null;
  finalScore: number | null;
  weight: number;
  contribution: number | null;
  dataYear: string | null;
  why: string;
  missing: boolean;
}

export interface PillarScore {
  pillar: Pillar;
  score: number | null;
  completeness: number;
  confidenceTier: PillarConfidenceTier;
  lowConfidence: boolean; // true when tier is low, amber, or suppressed (UI legacy)
  concentration: PillarConcentration;
  variables: ScoredVariable[];
}

export interface CountryScore {
  country: string;
  coreScore: number | null;
  overlayScore: number | null;
  pillarScores: Record<Pillar, PillarScore>;
  completeness: number;
  /** 0–1: weighted pillar coverage + calendar-year cohesion + structural availability */
  confidenceScore: number | null;
  confidenceLabel: string;
  yearDispersion: number | null; // stdev of observation years (core vars)
  classification: string;
  classificationColor: string;
}

// ─── Step 1: direction-adjust ─────────────────────────────────────────────────

function directionAdjust(value: number | null, def: VariableDef): number | null {
  if (value === null) return null;
  return def.direction === 'down_good' ? -value : value;
}

// ─── Momentum: variable-specific ─────────────────────────────────────────────

function momentumRaw(row: { level: number | null; prevLevel: number | null }, def: VariableDef): number | null {
  if (!def.useChange) return null;
  const { level, prevLevel } = row;
  if (level === null || prevLevel === null) return null;
  const mode = def.momentumMode ?? 'pp_delta';
  let raw: number;
  switch (mode) {
    case 'pct_change': {
      const den = Math.max(Math.abs(prevLevel), EPS);
      raw = (level - prevLevel) / den;
      break;
    }
    case 'growth_pp':
    case 'pp_delta':
    default:
      raw = level - prevLevel;
      break;
  }
  return raw;
}

// ─── Step 2: z-score normalize ───────────────────────────────────────────────

export function crossSectionZScore(values: (number | null)[]): (number | null)[] {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length < 5) return values.map(() => null);

  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  const variance = valid.reduce((a, b) => a + (b - mean) ** 2, 0) / valid.length;
  const std = Math.sqrt(variance);
  if (std === 0) return values.map(v => (v !== null ? 0.5 : null));

  return values.map(v => {
    if (v === null) return null;
    const z = Math.max(-3, Math.min(3, (v - mean) / std));
    return (z + 3) / 6;
  });
}

function blendScore(
  normLevel: number | null,
  normChange: number | null,
  useChange: boolean
): number | null {
  if (!useChange || normChange === null) return normLevel;
  if (normLevel === null) return normChange;
  return 0.7 * normLevel + 0.3 * normChange;
}

function pillarConcentration(vars: ScoredVariable[], defs: VariableDef[]): PillarConcentration {
  const pairs: { label: string; mass: number }[] = [];
  defs.forEach((d, i) => {
    const v = vars[i];
    if (v.finalScore === null) return;
    const mass = v.finalScore * d.weight;
    pairs.push({ label: d.label, mass });
  });
  const total = pairs.reduce((s, p) => s + p.mass, 0);
  if (total <= 0 || pairs.length === 0) {
    return { hhi: null, top2Share: null, concentrated: false, topDrivers: [] };
  }
  const shares = pairs.map(p => p.mass / total).sort((a, b) => b - a);
  const hhi = shares.reduce((s, x) => s + x * x, 0);
  const top2Share = (shares[0] ?? 0) + (shares[1] ?? 0);
  const sortedPairs = [...pairs].sort((a, b) => b.mass - a.mass);
  const concentrated = top2Share > 0.7 || hhi > 0.5;
  const topDrivers = sortedPairs.slice(0, 2).map(p => p.label);
  return { hhi, top2Share, concentrated, topDrivers };
}

function countryConfidence(
  pillarScores: Record<Pillar, PillarScore>,
  scoredIndex: Map<string, Map<string, ScoredVariable>>,
  country: string,
  variableDefs: VariableDef[]
): { score: number | null; label: string; yearDispersion: number | null } {
  const corePillars: Pillar[] = ['productive_capacity', 'human_capital', 'macro_sustainability', 'institutional', 'innovation'];
  let wSum = 0;
  let compSum = 0;
  for (const p of corePillars) {
    const pw = PILLAR_WEIGHTS[p];
    wSum += pw;
    compSum += (pillarScores[p]?.completeness ?? 0) * pw;
  }
  const weightedCompleteness = wSum > 0 ? compSum / wSum : 0;

  const years: number[] = [];
  for (const def of variableDefs) {
    if (def.pillar === 'overlay') continue;
    const sv = scoredIndex.get(def.id)?.get(country);
    if (sv?.dataYear) {
      const y = Number(sv.dataYear);
      if (Number.isFinite(y)) years.push(y);
    }
  }
  let yearDispersion: number | null = null;
  let yearScore = 0.85;
  if (years.length >= 2) {
    const meanY = years.reduce((a, b) => a + b, 0) / years.length;
    const varY = years.reduce((s, y) => s + (y - meanY) ** 2, 0) / years.length;
    yearDispersion = Math.sqrt(varY);
    const currentYear = new Date().getFullYear();
    const recencyScore = Math.max(0, 1 - (currentYear - meanY) / 5);
    const consistencyScore = Math.max(0, 1 - yearDispersion / 4);
    yearScore = 0.6 * recencyScore + 0.4 * consistencyScore;
  } else if (years.length === 1) {
    yearDispersion = 0;
    yearScore = 0.9;
  }

  const structDefs = variableDefs.filter(v => v.pillar !== 'overlay' && v.kind === 'structural');
  const structHit = structDefs.filter(d => !scoredIndex.get(d.id)?.get(country)?.missing).length;
  const structRatio = structDefs.length > 0 ? structHit / structDefs.length : 0;

  const conf = 0.45 * weightedCompleteness + 0.35 * yearScore + 0.20 * structRatio;
  let label = 'High';
  if (conf < 0.35) label = 'Low';
  else if (conf < 0.55) label = 'Moderate';
  else if (conf < 0.75) label = 'Fair';

  return { score: conf, label, yearDispersion };
}

export function scoreCountriesForDefs(
  rawRows: RawVariableRow[],
  populations: Record<string, number>,
  variableDefs: VariableDef[]
): CountryScore[] {
  const allCountries = [...new Set(rawRows.map(r => r.country))];

  const index: Map<string, Map<string, RawVariableRow>> = new Map();
  for (const row of rawRows) {
    if (!index.has(row.id)) index.set(row.id, new Map());
    index.get(row.id)!.set(row.country, row);
  }

  const scoredIndex: Map<string, Map<string, ScoredVariable>> = new Map();

  for (const def of variableDefs) {
    const varMap = index.get(def.id);

    const levels: (number | null)[] = allCountries.map(c => {
      const row = varMap?.get(c);
      if (!row) return null;
      let val = row.level;
      if (def.id === 'patent_applications' && val !== null) {
        const pop = populations[c] ?? row.population;
        if (pop && pop > 0) val = (val / pop) * 1_000_000;
      }
      if (def.id === 'ip_receipts' && val !== null) {
        const pop = populations[c] ?? row.population;
        if (pop && pop > 0) val = val / pop;
      }
      if (def.id === 'listed_companies' && val !== null) {
        const pop = populations[c] ?? row.population;
        if (pop && pop > 0) val = (val / pop) * 1_000_000;
      }
      if (def.id === 'portfolio_inflows' && val !== null) {
        const pop = populations[c] ?? row.population;
        if (pop && pop > 0) val = val / pop;
      }
      if (def.id === 'manufacturing_va_per_capita' && val !== null) {
        const pop = populations[c] ?? row.population;
        if (pop && pop > 0) val = val / pop;
      }
      // __SVC_EXP_PCT_GDP: ratio precomputed in ingest/route; gdp_per_capita_level: raw constant USD per capita
      return directionAdjust(val, def);
    });

    const changes: (number | null)[] = def.useChange
      ? allCountries.map(c => {
          const row = varMap?.get(c);
          if (!row) return null;
          const rawChg = momentumRaw(row, def);
          return rawChg === null ? null : directionAdjust(rawChg, def);
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
        weight: def.weight,
        contribution: null,
        dataYear: row?.dataYear ?? null,
        why: def.why,
        missing: rawVal === null,
      });
    });
    scoredIndex.set(def.id, map);
  }

  return allCountries.map(country => {
    const pillarList: Pillar[] = [
      'productive_capacity', 'human_capital', 'macro_sustainability', 'institutional', 'innovation', 'overlay',
    ];

    const pillarScores: Record<Pillar, PillarScore> = {} as Record<Pillar, PillarScore>;

    for (const pillar of pillarList) {
      const defs = getVariablesByPillarFrom(variableDefs, pillar);
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
          weight: def.weight,
          contribution: null,
          dataYear: null,
          why: def.why,
          missing: true,
        };
      });

      const totalWeight = defs.reduce((s, d) => s + d.weight, 0);
      const availableWeight = defs
        .filter((_, i) => vars[i].finalScore !== null)
        .reduce((s, d) => s + d.weight, 0);

      const completeness = totalWeight > 0 ? availableWeight / totalWeight : 0;
      const tier = pillarConfidenceTier(completeness);

      let score: number | null = null;
      if (tier !== 'suppressed' && availableWeight > 0) {
        const weightedSum = defs.reduce((s, d, i) => {
          const fs = vars[i].finalScore;
          return fs !== null ? s + fs * d.weight : s;
        }, 0);
        score = weightedSum / availableWeight;
      }

      vars.forEach(v => {
        if (v.finalScore !== null && availableWeight > 0) {
          v.contribution = (v.finalScore * v.weight) / availableWeight;
        }
      });

      const concentration = pillarConcentration(vars, defs);

      pillarScores[pillar] = {
        pillar,
        score,
        completeness,
        confidenceTier: tier,
        lowConfidence: tier !== 'normal',
        concentration,
        variables: vars,
      };
    }

    const corePillars: Pillar[] = ['productive_capacity', 'human_capital', 'macro_sustainability', 'institutional', 'innovation'];
    let coreWsum = 0;
    let coreTotalW = 0;
    for (const p of corePillars) {
      const ps = pillarScores[p];
      if (ps.score !== null) {
        coreWsum += ps.score * PILLAR_WEIGHTS[p];
        coreTotalW += PILLAR_WEIGHTS[p];
      }
    }
    const coreScore = coreTotalW > 0 ? (coreWsum / coreTotalW) * 100 : null;

    const overlayPs = pillarScores['overlay'];
    const overlayScore = overlayPs.score !== null ? overlayPs.score * 100 : null;

    const allVars = variableDefs.filter(v => v.pillar !== 'overlay');
    const presentVars = allVars.filter(v => {
      const m = scoredIndex.get(v.id);
      return m?.get(country)?.missing === false;
    });
    const completeness = allVars.length > 0 ? presentVars.length / allVars.length : 0;

    const { label, color } = classify(coreScore, overlayScore, pillarScores);
    const conf = countryConfidence(pillarScores, scoredIndex, country, variableDefs);

    return {
      country,
      coreScore,
      overlayScore,
      pillarScores,
      completeness,
      confidenceScore: conf.score,
      confidenceLabel: conf.label,
      yearDispersion: conf.yearDispersion,
      classification: label,
      classificationColor: color,
    };
  });
}

export function scoreCountries(
  rawRows: RawVariableRow[],
  populations: Record<string, number>
): CountryScore[] {
  return scoreCountriesForDefs(rawRows, populations, VARIABLES);
}

/** Rank countries by core score (1 = best). Null scores last. */
export function rankByCoreScore(scores: CountryScore[]): { country: string; rank: number; coreScore: number | null }[] {
  const sorted = [...scores].sort((a, b) => {
    if (a.coreScore === null && b.coreScore === null) return a.country.localeCompare(b.country);
    if (a.coreScore === null) return 1;
    if (b.coreScore === null) return -1;
    return b.coreScore - a.coreScore;
  });
  return sorted.map((s, i) => ({ country: s.country, rank: i + 1, coreScore: s.coreScore }));
}

export function rankByOverlayScore(scores: CountryScore[]): { country: string; rank: number; overlayScore: number | null }[] {
  const sorted = [...scores].sort((a, b) => {
    const av = a.overlayScore ?? -1e9;
    const bv = b.overlayScore ?? -1e9;
    if (av === bv) return a.country.localeCompare(b.country);
    return bv - av;
  });
  return sorted.map((s, i) => ({ country: s.country, rank: i + 1, overlayScore: s.overlayScore }));
}

export function rankComparisonStats(
  latest: { country: string; rank: number }[],
  sameYear: { country: string; rank: number }[]
): {
  avgAbsRankMove: number;
  maxAbsRankMove: number;
  moves: { country: string; rankLatest: number; rankSameYear: number; delta: number }[];
} {
  const mapL = new Map(latest.map(r => [r.country, r.rank]));
  const mapS = new Map(sameYear.map(r => [r.country, r.rank]));
  const countries = [...new Set([...mapL.keys(), ...mapS.keys()])];
  const moves: { country: string; rankLatest: number; rankSameYear: number; delta: number }[] = [];
  let sum = 0;
  let max = 0;
  for (const c of countries) {
    const rl = mapL.get(c) ?? 999;
    const rs = mapS.get(c) ?? 999;
    const delta = Math.abs(rl - rs);
    sum += delta;
    if (delta > max) max = delta;
    moves.push({ country: c, rankLatest: rl, rankSameYear: rs, delta });
  }
  const n = countries.length || 1;
  return { avgAbsRankMove: sum / n, maxAbsRankMove: max, moves: moves.sort((a, b) => b.delta - a.delta) };
}
