// ─── Build RawVariableRow[] from World Bank time series ────────────────────────

import { VARIABLES } from './dictionary';
import type { RawVariableRow } from './scoring';

export interface WBObservation {
  country: { id: string };
  date: string;
  value: number | null;
}

/** Sorted newest-first per country per indicator code */
export type SeriesByCode = Map<string, Map<string, { date: string; value: number }[]>>;

export function observationsToSeries(
  observations: WBObservation[],
  code: string,
  into: SeriesByCode
): void {
  const byCountry = new Map<string, WBObservation[]>();
  for (const obs of observations) {
    const cid = obs.country.id;
    if (!byCountry.has(cid)) byCountry.set(cid, []);
    byCountry.get(cid)!.push(obs);
  }
  const countryMap = new Map<string, { date: string; value: number }[]>();
  for (const [cid, rows] of byCountry.entries()) {
    const sorted = rows
      .filter(r => r.value !== null)
      .sort((a, b) => Number(b.date) - Number(a.date))
      .map(r => ({ date: r.date, value: r.value as number }));
    countryMap.set(cid, sorted);
  }
  into.set(code, countryMap);
}

/** Latest observation + prior year (for momentum), same as legacy buildLookup */
export function valueAtLatest(
  series: { date: string; value: number }[] | undefined
): { level: number | null; prevLevel: number | null; dataYear: string | null } {
  if (!series || series.length === 0) {
    return { level: null, prevLevel: null, dataYear: null };
  }
  return {
    level: series[0].value,
    prevLevel: series[1]?.value ?? null,
    dataYear: series[0].date,
  };
}

function valueAtYear(
  series: { date: string; value: number }[] | undefined,
  year: number
): number | null {
  if (!series) return null;
  const y = String(year);
  const hit = series.find(p => p.date === y);
  return hit?.value ?? null;
}

/**
 * Pick the most recent calendar year where at least `minShare` of countries
 * in `peerIds` have a non-null observation for this indicator.
 */
export function pickAnchorYear(
  countrySeries: Map<string, { date: string; value: number }[]>,
  peerIds: string[],
  minShare = 0.7
): number | null {
  const yearCounts = new Map<number, number>();
  for (const cid of peerIds) {
    const s = countrySeries.get(cid);
    if (!s) continue;
    for (const p of s) {
      const y = Number(p.date);
      if (!Number.isFinite(y)) continue;
      yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1);
    }
  }
  const years = [...yearCounts.entries()]
    .filter(([, c]) => c / peerIds.length >= minShare)
    .map(([y]) => y)
    .sort((a, b) => b - a);
  return years.length > 0 ? years[0] : null;
}

export function buildRawRows(
  seriesByCode: SeriesByCode,
  countryCodes: string[],
  mode: 'latest' | 'sameYear'
): RawVariableRow[] {
  const rows: RawVariableRow[] = [];

  for (const def of VARIABLES) {
    const countryMap = seriesByCode.get(def.code);
    if (!countryMap) {
      for (const country of countryCodes) {
        rows.push({
          id: def.id,
          country,
          level: null,
          prevLevel: null,
          population: null,
          dataYear: null,
        });
      }
      continue;
    }

    let anchor: number | null = null;
    if (mode === 'sameYear') {
      anchor = pickAnchorYear(countryMap, countryCodes, 0.7);
    }

    for (const country of countryCodes) {
      const s = countryMap.get(country);
      if (mode === 'latest' || anchor === null) {
        const { level, prevLevel, dataYear } = valueAtLatest(s);
        rows.push({
          id: def.id,
          country,
          level,
          prevLevel,
          population: null,
          dataYear,
        });
      } else {
        const level = valueAtYear(s, anchor);
        const prevLevel = valueAtYear(s, anchor - 1);
        rows.push({
          id: def.id,
          country,
          level,
          prevLevel,
          population: null,
          dataYear: level !== null ? String(anchor) : null,
        });
      }
    }
  }

  return rows;
}
