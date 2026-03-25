// ─── Alternate variable sets for robustness / sensitivity (non-default) ─────

import { VARIABLES, type VariableDef } from './dictionary';

export function cloneDefs(): VariableDef[] {
  return VARIABLES.map(v => ({ ...v }));
}

export function dropIds(defs: VariableDef[], ids: string[]): VariableDef[] {
  const s = new Set(ids);
  return defs.filter(v => !s.has(v.id));
}

/** Productive: remove exports % GDP */
export function productiveVariant1(defs: VariableDef[]): VariableDef[] {
  return dropIds(defs, ['exports_pct_gdp']);
}

/** Replace goods+services exports with services-heavy proxy (level precomputed in series) */
export function productiveVariant2(defs: VariableDef[]): VariableDef[] {
  return defs.map(v => {
    if (v.id !== 'exports_pct_gdp') return v;
    return {
      ...v,
      id: 'services_exports_pct_gdp',
      code: '__SVC_EXP_PCT_GDP',
      label: 'Services exports (est. % GDP)',
      unit: '% GDP',
      why: 'Services exports as a share of GDP (BOP services / nominal GDP) — stress-test vs goods+services export share.',
    };
  });
}

/** Broad capacity: drop exports + manufacturing VA; single GDP per capita level */
export function productiveVariant3(defs: VariableDef[]): VariableDef[] {
  const filtered = dropIds(defs, ['exports_pct_gdp', 'manufacturing_va_per_capita']);
  const gdpPc: VariableDef = {
    id: 'gdp_per_capita_level',
    pillar: 'productive_capacity',
    code: 'NY.GDP.PCAP.KD',
    label: 'GDP per capita (constant)',
    unit: 'constant USD',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Single broad productivity/income proxy when trade + manufacturing variables are removed.',
    weight: 3,
  };
  return [...filtered, gdpPc];
}

export function humanVariant1(defs: VariableDef[]): VariableDef[] {
  return dropIds(defs, ['secondary_enrollment']);
}

export function humanVariant2(defs: VariableDef[]): VariableDef[] {
  return dropIds(defs, ['tertiary_enrollment']);
}

/** Shift weight from formal enrollment toward LFP + life expectancy */
export function humanVariant3(defs: VariableDef[]): VariableDef[] {
  return defs.map(v => {
    if (v.pillar !== 'human_capital') return v;
    if (v.id === 'tertiary_enrollment') return { ...v, weight: 1.5 };
    if (v.id === 'secondary_enrollment') return { ...v, weight: 1 };
    if (v.id === 'labor_force_participation') return { ...v, weight: 3.5 };
    if (v.id === 'life_expectancy') return { ...v, weight: 2 };
    return v;
  });
}

export function innovationVariant1(defs: VariableDef[]): VariableDef[] {
  return dropIds(defs, ['high_tech_exports']);
}

/** Halve high-tech export weight; reallocate freed mass across other innovation vars in proportion to their baseline weights */
export function innovationVariant2(defs: VariableDef[]): VariableDef[] {
  const othersIds = ['rd_expenditure', 'researchers_rd', 'patent_applications', 'ip_receipts'];
  const baseOthers = othersIds
    .map(id => defs.find(v => v.id === id))
    .filter((v): v is VariableDef => v != null);
  const othersSum = baseOthers.reduce((s, v) => s + v.weight, 0);
  const ht = defs.find(v => v.id === 'high_tech_exports');
  const freed = (ht?.weight ?? 2) - 1;
  return defs.map(v => {
    if (v.pillar !== 'innovation') return v;
    if (v.id === 'high_tech_exports') return { ...v, weight: 1 };
    if (othersIds.includes(v.id) && othersSum > 0) {
      const w = v.weight;
      return { ...v, weight: w + (w / othersSum) * freed };
    }
    return v;
  });
}

export function innovationVariant3(defs: VariableDef[]): VariableDef[] {
  return defs.map(v => {
    if (v.pillar !== 'innovation') return v;
    if (v.id === 'rd_expenditure') return { ...v, weight: 4 };
    if (v.id === 'ip_receipts') return { ...v, weight: 3 };
    if (v.id === 'patent_applications') return { ...v, weight: 1.5 };
    if (v.id === 'high_tech_exports') return { ...v, weight: 1 };
    if (v.id === 'researchers_rd') return { ...v, weight: 2 };
    return v;
  });
}

/** Overlay + financial depth / services (codes fetched separately) */
export function overlayPlusDefs(defs: VariableDef[]): VariableDef[] {
  const extra: VariableDef[] = [
    {
      id: 'domestic_credit_private',
      pillar: 'overlay',
      code: 'FS.AST.PRVT.GD.ZS',
      label: 'Domestic credit to private sector',
      unit: '% GDP',
      direction: 'up_good',
      kind: 'structural',
      useChange: false,
      why: 'Financial depth proxy — credit intermediation to the private sector.',
      weight: 2,
    },
    {
      id: 'services_exports_overlay',
      pillar: 'overlay',
      code: '__SVC_EXP_PCT_GDP',
      label: 'Services exports (est. % GDP)',
      unit: '% GDP',
      direction: 'up_good',
      kind: 'structural',
      useChange: false,
      why: 'Cross-border services scale — complements goods/market-cap metrics for centrality.',
      weight: 2,
    },
  ];
  return [...defs, ...extra];
}

export function spearmanFromRanks(
  countries: string[],
  rankA: Map<string, number>,
  rankB: Map<string, number>
): number {
  const n = countries.length;
  if (n < 3) return NaN;
  let sumD2 = 0;
  for (const c of countries) {
    const ra = rankA.get(c);
    const rb = rankB.get(c);
    if (ra === undefined || rb === undefined) continue;
    sumD2 += (ra - rb) ** 2;
  }
  return 1 - (6 * sumD2) / (n * (n * n - 1));
}

export function rankStats(
  baseline: Map<string, number>,
  variant: Map<string, number>,
  countries: string[]
): {
  avgAbsRankMove: number;
  maxAbsRankMove: number;
  deltas: { country: string; baseRank: number; variantRank: number; delta: number }[];
} {
  const deltas: { country: string; baseRank: number; variantRank: number; delta: number }[] = [];
  let sum = 0;
  let max = 0;
  for (const c of countries) {
    const br = baseline.get(c) ?? 999;
    const vr = variant.get(c) ?? 999;
    const d = Math.abs(br - vr);
    sum += d;
    if (d > max) max = d;
    deltas.push({ country: c, baseRank: br, variantRank: vr, delta: d });
  }
  const n = countries.length || 1;
  return { avgAbsRankMove: sum / n, maxAbsRankMove: max, deltas: deltas.sort((a, b) => b.delta - a.delta) };
}
