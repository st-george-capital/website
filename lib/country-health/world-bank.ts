/**
 * lib/country-health/world-bank.ts
 *
 * Standalone World Bank fetch helpers extracted from app/api/dashboard/country-health/route.ts.
 * Allows the macro-engine factor adapter to reuse the same fetch logic without duplicating it.
 */

import { VARIABLES } from './dictionary';
import type { VariableDef } from './dictionary';
import {
  observationsToSeries,
  buildRawRows,
  type WBObservation,
  type SeriesByCode,
} from './ingest';
import type { RawVariableRow } from './scoring';
import { allPeerCountryIds } from './peer-sets';

const WB_BASE = 'https://api.worldbank.org/v2';
const MRV = 15;

/** Extra World Bank series needed for composites */
const EXTRA_WB_CODES = ['BX.GSR.NFSV.CD', 'NY.GDP.MKTP.CD', 'NY.GDP.PCAP.KD', 'FS.AST.PRVT.GD.ZS'];

function uniqueCodesForDefs(defs: VariableDef[]): string[] {
  return [...new Set(defs.map(v => v.code))];
}

function allCodesToFetch(): string[] {
  const base = uniqueCodesForDefs(VARIABLES);
  return [...new Set([...base, ...EXTRA_WB_CODES])];
}

async function fetchWB(indicator: string, countryCodes: string[]): Promise<WBObservation[]> {
  const codeStr = countryCodes.join(';');
  const url = `${WB_BASE}/country/${codeStr}/indicator/${indicator}?format=json&mrv=${MRV}&per_page=500`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) return [];
    return json[1] as WBObservation[];
  } catch {
    return [];
  }
}

export async function fetchPopulations(countryCodes?: string[]): Promise<Record<string, number>> {
  const codes = countryCodes ?? allPeerCountryIds();
  const obs = await fetchWB('SP.POP.TOTL', codes);
  const series: SeriesByCode = new Map();
  observationsToSeries(obs, 'SP.POP.TOTL', series);
  const popMap = series.get('SP.POP.TOTL') ?? new Map();
  const out: Record<string, number> = {};
  for (const cid of codes) {
    const s = popMap.get(cid);
    if (s?.[0]?.value != null) out[cid] = s[0].value;
  }
  return out;
}

async function fetchAllSeries(countryCodes: string[], codes: string[]): Promise<SeriesByCode> {
  const seriesByCode: SeriesByCode = new Map();
  const BATCH = 6;
  for (let i = 0; i < codes.length; i += BATCH) {
    const chunk = codes.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      chunk.map(code => fetchWB(code, countryCodes).then(obs => ({ code, obs })))
    );
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        const { code, obs } = s.value;
        observationsToSeries(obs, code, seriesByCode);
      }
    }
    if (i + BATCH < codes.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  return seriesByCode;
}

function injectCompositeServicesExportsPct(seriesByCode: SeriesByCode, countryCodes: string[]) {
  const srv = seriesByCode.get('BX.GSR.NFSV.CD');
  const gdp = seriesByCode.get('NY.GDP.MKTP.CD');
  if (!srv || !gdp) return;
  const m = new Map<string, { date: string; value: number }[]>();
  for (const c of countryCodes) {
    const sv = srv.get(c)?.[0];
    const gv = gdp.get(c)?.[0];
    if (!sv || !gv || gv.value === 0) continue;
    const pct = (sv.value / gv.value) * 100;
    m.set(c, [{ date: sv.date, value: pct }]);
  }
  seriesByCode.set('__SVC_EXP_PCT_GDP', m);
}

function injectPopulation(rows: RawVariableRow[], populations: Record<string, number>) {
  for (const row of rows) {
    row.population = populations[row.country] ?? null;
  }
}

/**
 * Fetches current World Bank raw rows for all countries in the default peer set.
 * Uses 'latest' mode — always returns the most recent available data (static for MVP).
 */
export async function fetchWorldBankRows(): Promise<RawVariableRow[]> {
  const fetchIds = allPeerCountryIds();
  const codesList = allCodesToFetch();

  const [seriesByCode, populations] = await Promise.all([
    fetchAllSeries(fetchIds, codesList),
    fetchPopulations(fetchIds),
  ]);

  injectCompositeServicesExportsPct(seriesByCode, fetchIds);

  const rawRows = buildRawRows(seriesByCode, fetchIds, 'latest', VARIABLES);
  injectPopulation(rawRows, populations);

  return rawRows;
}
