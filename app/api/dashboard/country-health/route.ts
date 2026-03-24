import { NextResponse } from 'next/server';
import { VARIABLES, COUNTRIES } from '@/lib/country-health/dictionary';
import { scoreCountries, type RawVariableRow, type CountryScore } from '@/lib/country-health/scoring';

export const revalidate = 3600; // cache 1 hour — WB data is annual

const WB_BASE = 'https://api.worldbank.org/v2';

// ─── World Bank fetch helper ─────────────────────────────────────────────────

interface WBObservation {
  country: { id: string };
  date: string;
  value: number | null;
}

async function fetchWB(indicator: string, countryCodes: string[], years: number): Promise<WBObservation[]> {
  const codeStr = countryCodes.join(';');
  const url = `${WB_BASE}/country/${codeStr}/indicator/${indicator}?format=json&mrv=${years}&per_page=500`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) return [];
    return json[1] as WBObservation[];
  } catch {
    return [];
  }
}

// ─── Build lookup: { indicator -> { countryId -> { mostRecent, prevYear } } } ─

interface DataPoint { level: number | null; prevLevel: number | null }

function buildLookup(
  observations: WBObservation[]
): Map<string, Map<string, DataPoint>> {
  // observations from a single indicator call; group by country, sort by date desc
  const byCountry: Map<string, WBObservation[]> = new Map();
  for (const obs of observations) {
    const cid = obs.country.id;
    if (!byCountry.has(cid)) byCountry.set(cid, []);
    byCountry.get(cid)!.push(obs);
  }

  // indicator is the same for all — encode as single map
  const singleIndicator: Map<string, DataPoint> = new Map();
  for (const [cid, rows] of byCountry.entries()) {
    const sorted = rows
      .filter(r => r.value !== null)
      .sort((a, b) => Number(b.date) - Number(a.date));
    singleIndicator.set(cid, {
      level: sorted[0]?.value ?? null,
      prevLevel: sorted[1]?.value ?? null,
    });
  }

  // Wrap in the outer map keyed by a placeholder — caller knows which indicator
  const outer: Map<string, Map<string, DataPoint>> = new Map();
  outer.set('__single__', singleIndicator);
  return outer;
}

// ─── World Bank population (for per-capita normalization) ────────────────────

async function fetchPopulations(countryCodes: string[]): Promise<Record<string, number>> {
  const obs = await fetchWB('SP.POP.TOTL', countryCodes, 3);
  const result: Record<string, number> = {};
  const byCountry = buildLookup(obs).get('__single__') ?? new Map();
  for (const [cid, dp] of byCountry.entries()) {
    if (dp.level !== null) result[cid] = dp.level;
  }
  return result;
}

// ─── Batch fetch all indicators (deduplicated by WB code) ────────────────────

async function fetchAllRawRows(countryCodes: string[]): Promise<RawVariableRow[]> {
  // Deduplicate by WB code — multiple variable defs may share a code
  const uniqueCodes = [...new Set(VARIABLES.map(v => v.code))];

  // Chunk into parallel batches to avoid overloading WB API
  const BATCH = 6;
  const results: Map<string, Map<string, DataPoint>> = new Map();

  for (let i = 0; i < uniqueCodes.length; i += BATCH) {
    const chunk = uniqueCodes.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      chunk.map(code => fetchWB(code, countryCodes, 6).then(obs => ({ code, obs })))
    );
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        const { code, obs } = s.value;
        const lookup = buildLookup(obs).get('__single__') ?? new Map();
        results.set(code, lookup);
      }
    }
    // small yield between batches to be a good citizen
    if (i + BATCH < uniqueCodes.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // Build RawVariableRow array
  const rows: RawVariableRow[] = [];
  for (const def of VARIABLES) {
    const countryMap = results.get(def.code) ?? new Map<string, DataPoint>();
    for (const country of countryCodes) {
      const dp = countryMap.get(country) ?? { level: null, prevLevel: null };
      rows.push({
        id: def.id,
        country,
        level: dp.level,
        prevLevel: dp.prevLevel,
        population: null, // filled in separately from population table
      });
    }
  }
  return rows;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const countryCodes = COUNTRIES.map(c => c.id);

    // Parallel: fetch all indicator data + populations
    const [rawRows, populations] = await Promise.all([
      fetchAllRawRows(countryCodes),
      fetchPopulations(countryCodes),
    ]);

    // Inject population into raw rows for per-capita normalization
    for (const row of rawRows) {
      row.population = populations[row.country] ?? null;
    }

    const scores: CountryScore[] = scoreCountries(rawRows, populations);

    // Sort by core score descending (nulls last)
    scores.sort((a, b) => {
      if (a.coreScore === null && b.coreScore === null) return 0;
      if (a.coreScore === null) return 1;
      if (b.coreScore === null) return -1;
      return b.coreScore - a.coreScore;
    });

    // Attach country metadata to each score
    const countryMeta = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));

    const payload = {
      timestamp: new Date().toISOString(),
      countries: scores.map(s => ({
        ...s,
        meta: countryMeta[s.country] ?? { id: s.country, name: s.country, flag: '🌍', region: 'Unknown' },
      })),
      methodology: {
        normalization: 'cross-sectional z-score → scaled to [0,1], clamped at ±3σ',
        momentumBlend: '70% level + 30% YoY change for cyclical variables',
        pillarAggregation: 'weighted average within pillar; missing variables reduce but do not block score',
        coreWeights: {
          productive_capacity: '25%',
          human_capital: '15%',
          macro_sustainability: '20%',
          institutional: '20%',
          innovation: '20%',
        },
        dataSource: 'World Bank Open Data API (no auth required) — annual series, ~1-2 year lag typical',
      },
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error('[country-health] GET error:', err);
    return NextResponse.json({ error: 'Failed to compute country health scores' }, { status: 500 });
  }
}
