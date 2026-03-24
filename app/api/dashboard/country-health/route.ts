import { NextResponse } from 'next/server';
import { VARIABLES, COUNTRY_META } from '@/lib/country-health/dictionary';
import {
  scoreCountries,
  rankByCoreScore,
  rankComparisonStats,
  PILLAR_COVERAGE_SUPPRESSED,
  PILLAR_COVERAGE_LOW,
  PILLAR_COVERAGE_NORMAL,
  type RawVariableRow,
  type CountryScore,
} from '@/lib/country-health/scoring';
import { PEER_SETS, allPeerCountryIds } from '@/lib/country-health/peer-sets';
import {
  observationsToSeries,
  buildRawRows,
  type WBObservation,
  type SeriesByCode,
} from '@/lib/country-health/ingest';

export const revalidate = 3600;

const WB_BASE = 'https://api.worldbank.org/v2';
const MRV = 15;

async function fetchWB(indicator: string, countryCodes: string[]): Promise<WBObservation[]> {
  const codeStr = countryCodes.join(';');
  const url = `${WB_BASE}/country/${codeStr}/indicator/${indicator}?format=json&mrv=${MRV}&per_page=500`;
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

async function fetchPopulations(countryCodes: string[]): Promise<Record<string, number>> {
  const obs = await fetchWB('SP.POP.TOTL', countryCodes);
  const series: SeriesByCode = new Map();
  observationsToSeries(obs, 'SP.POP.TOTL', series);
  const popMap = series.get('SP.POP.TOTL') ?? new Map();
  const out: Record<string, number> = {};
  for (const cid of countryCodes) {
    const s = popMap.get(cid);
    if (s?.[0]?.value != null) out[cid] = s[0].value;
  }
  return out;
}

async function fetchAllSeries(countryCodes: string[]): Promise<SeriesByCode> {
  const uniqueCodes = [...new Set(VARIABLES.map(v => v.code))];
  const seriesByCode: SeriesByCode = new Map();
  const BATCH = 6;

  for (let i = 0; i < uniqueCodes.length; i += BATCH) {
    const chunk = uniqueCodes.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      chunk.map(code => fetchWB(code, countryCodes).then(obs => ({ code, obs })))
    );
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        const { code, obs } = s.value;
        observationsToSeries(obs, code, seriesByCode);
      }
    }
    if (i + BATCH < uniqueCodes.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return seriesByCode;
}

function injectPopulation(rows: RawVariableRow[], populations: Record<string, number>) {
  for (const row of rows) {
    row.population = populations[row.country] ?? null;
  }
}

export async function GET() {
  try {
    const fetchIds = allPeerCountryIds();
    const [seriesByCode, populations] = await Promise.all([
      fetchAllSeries(fetchIds),
      fetchPopulations(fetchIds),
    ]);

    const defaultIds = PEER_SETS.default.ids;

    const rawLatest = buildRawRows(seriesByCode, defaultIds, 'latest');
    injectPopulation(rawLatest, populations);

    const rawSameYear = buildRawRows(seriesByCode, defaultIds, 'sameYear');
    injectPopulation(rawSameYear, populations);

    const scoresLatest: CountryScore[] = scoreCountries(rawLatest, populations);
    const scoresSameYear: CountryScore[] = scoreCountries(rawSameYear, populations);

    const ranksLatest = rankByCoreScore(scoresLatest);
    const ranksSameYear = rankByCoreScore(scoresSameYear);
    const sameYearComparison = rankComparisonStats(
      ranksLatest.map(r => ({ country: r.country, rank: r.rank })),
      ranksSameYear.map(r => ({ country: r.country, rank: r.rank }))
    );

    scoresLatest.sort((a, b) => {
      if (a.coreScore === null && b.coreScore === null) return 0;
      if (a.coreScore === null) return 1;
      if (b.coreScore === null) return -1;
      return b.coreScore - a.coreScore;
    });

    const peerSensitivity: Record<
      string,
      { label: string; order: string[]; ranks: Record<string, number>; scores: Record<string, number | null> }
    > = {};

    for (const [key, { label, ids }] of Object.entries(PEER_SETS)) {
      const sub = buildRawRows(seriesByCode, ids, 'latest');
      injectPopulation(sub, populations);
      const sc = scoreCountries(sub, populations);
      const rk = rankByCoreScore(sc);
      const ranks: Record<string, number> = {};
      const scores: Record<string, number | null> = {};
      rk.forEach(r => {
        ranks[r.country] = r.rank;
        const hit = sc.find(x => x.country === r.country);
        scores[r.country] = hit?.coreScore ?? null;
      });
      peerSensitivity[key] = {
        label,
        order: rk.map(r => r.country),
        ranks,
        scores,
      };
    }

    const countryMeta = COUNTRY_META;

    const payload = {
      timestamp: new Date().toISOString(),
      countries: scoresLatest.map(s => ({
        ...s,
        meta: countryMeta[s.country] ?? { id: s.country, name: s.country, flag: '🌍', region: 'Unknown' },
      })),
      robustness: {
        sameYearVsLatest: {
          ...sameYearComparison,
          interpretation:
            sameYearComparison.avgAbsRankMove < 1.5
              ? 'Rankings are fairly stable when aligning on a common anchor year (typical case).'
              : 'Rankings move materially under same-year alignment — interpret peer-relative scores with care.',
        },
        peerSensitivity,
        notes: [
          'All z-scores are cross-sectional within the active peer set.',
          'expanded basket adds 8 countries; scores are not comparable as absolute levels across different peer definitions.',
        ],
      },
      methodology: {
        normalization: 'cross-sectional z-score → scaled to [0,1], clamped at ±3σ',
        momentumBlend:
          '70% normalized level + 30% normalized momentum. Momentum: growth indicators use pp change; debt/GDP uses percent change of the ratio before z-scoring.',
        pillarAggregation:
          'Weighted average within pillar; missing variables reweight the pillar. Pillar score suppressed below 25% weight coverage.',
        pillarConfidenceThresholds: {
          suppressedBelow: `${Math.round(PILLAR_COVERAGE_SUPPRESSED * 100)}% weight coverage (no pillar score)`,
          lowDataBelow: `${Math.round(PILLAR_COVERAGE_LOW * 100)}%`,
          amberUntil: `${Math.round(PILLAR_COVERAGE_NORMAL * 100)}%`,
        },
        sameYearMode:
          'For robustness, anchor year = most recent year where ≥70% of the peer set has data for that indicator.',
        manufacturing:
          'Productive capacity uses manufacturing value added per capita (constant USD) instead of manufacturing % of GDP to avoid penalizing service-intensive advanced economies.',
        coreWeights: {
          productive_capacity: '25%',
          human_capital: '15%',
          macro_sustainability: '20%',
          institutional: '20%',
          innovation: '20%',
        },
        dataSource: 'World Bank Open Data API — annual series, ~1–2 year publication lag typical',
      },
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error('[country-health] GET error:', err);
    return NextResponse.json({ error: 'Failed to compute country health scores' }, { status: 500 });
  }
}
