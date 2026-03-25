import { NextResponse } from 'next/server';
import {
  VARIABLES,
  COUNTRY_META,
  ANALYSIS_PEER_IDS,
} from '@/lib/country-health/dictionary';
import type { VariableDef } from '@/lib/country-health/dictionary';
import {
  scoreCountries,
  scoreCountriesForDefs,
  rankByCoreScore,
  rankByOverlayScore,
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
import { topContributors, variableContributionsToCore } from '@/lib/country-health/contributions';
import {
  cloneDefs,
  dropIds,
  productiveVariant1,
  productiveVariant2,
  productiveVariant3,
  humanVariant1,
  humanVariant2,
  humanVariant3,
  innovationVariant1,
  innovationVariant2,
  innovationVariant3,
  overlayPlusDefs,
  structuralCoreDefs,
  instNoPvDefs,
  instReweightVaGeDefs,
  overlaySlimDefs,
  spearmanFromRanks,
  rankStats,
} from '@/lib/country-health/sensitivity-variants';

export const dynamic = 'force-dynamic';

const WB_BASE = 'https://api.worldbank.org/v2';
const MRV = 15;

/** Extra World Bank series for composites & overlay_plus */
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

/** Services exports (current US$) / nominal GDP (current US$) × 100 — rough % of GDP proxy */
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

function toRankMap(rk: { country: string; rank: number }[]): Map<string, number> {
  return new Map(rk.map(x => [x.country, x.rank]));
}

function enrichCountry(
  s: CountryScore,
  variableDefs: VariableDef[],
  rank: number
) {
  const { positive, negative } = topContributors(s, variableDefs, 5);
  const allContrib = variableContributionsToCore(s, variableDefs);
  return {
    ...s,
    rank,
    coreContributions: { topPositive: positive, topNegative: negative, all: allContrib },
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pruned = searchParams.get('pruned') === '1';
    const altProductive = searchParams.get('alt_productive') === '1';
    const altHuman = searchParams.get('alt_human') === '1';
    const altInnovation = searchParams.get('alt_innovation') === '1';
    const overlayPlus = searchParams.get('overlay_plus') === '1';
    const structuralCore = searchParams.get('structural_core') === '1';
    const instNoPv = searchParams.get('inst_no_pv') === '1';
    const instReweightVaGe = searchParams.get('inst_reweight_va_ge') === '1';
    const overlaySlim = searchParams.get('overlay_slim') === '1';

    const fetchIds = allPeerCountryIds();
    const codesList = allCodesToFetch();

    const [seriesByCode, populations] = await Promise.all([
      fetchAllSeries(fetchIds, codesList),
      fetchPopulations(fetchIds),
    ]);

    injectCompositeServicesExportsPct(seriesByCode, fetchIds);

    const defaultIds = PEER_SETS.default.ids;

    const rawLatest = buildRawRows(seriesByCode, defaultIds, 'latest', VARIABLES);
    injectPopulation(rawLatest, populations);

    const rawSameYear = buildRawRows(seriesByCode, defaultIds, 'sameYear', VARIABLES);
    injectPopulation(rawSameYear, populations);

    const scoresLatest: CountryScore[] = scoreCountries(rawLatest, populations);
    const scoresSameYear: CountryScore[] = scoreCountries(rawSameYear, populations);

    const ranksLatest = rankByCoreScore(scoresLatest);
    const ranksSameYear = rankByCoreScore(scoresSameYear);
    const sameYearComparison = rankComparisonStats(
      ranksLatest.map(r => ({ country: r.country, rank: r.rank })),
      ranksSameYear.map(r => ({ country: r.country, rank: r.rank }))
    );

    const rankMapBaseline = toRankMap(rankByCoreScore(scoresLatest));

    const peerSensitivity: Record<
      string,
      { label: string; order: string[]; ranks: Record<string, number>; scores: Record<string, number | null> }
    > = {};

    for (const [key, { label, ids }] of Object.entries(PEER_SETS)) {
      const sub = buildRawRows(seriesByCode, ids, 'latest', VARIABLES);
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

    const rawAnalysis = buildRawRows(seriesByCode, ANALYSIS_PEER_IDS, 'latest', VARIABLES);
    injectPopulation(rawAnalysis, populations);
    const scoresAnalysis = scoreCountries(rawAnalysis, populations);
    const rkAnalysis = rankByCoreScore(scoresAnalysis);
    const analysisRankMap = toRankMap(rkAnalysis);
    const countriesAnalysis = rkAnalysis.map(r => {
      const s = scoresAnalysis.find(x => x.country === r.country)!;
      const meta = COUNTRY_META[r.country] ?? { id: r.country, name: r.country, flag: '🌍', region: 'Unknown' };
      const ld = ranksLatest.find(x => x.country === r.country);
      return {
        ...enrichCountry(s, VARIABLES, r.rank),
        meta,
        defaultBasketRank: ld?.rank ?? null,
      };
    });

    const countries = ranksLatest.map(r => {
      const s = scoresLatest.find(x => x.country === r.country)!;
      const hit = countriesAnalysis.find(c => c.country === r.country);
      const meta = COUNTRY_META[s.country] ?? { id: s.country, name: s.country, flag: '🌍', region: 'Unknown' };
      return {
        ...enrichCountry(s, VARIABLES, r.rank),
        meta,
        analysisRank: hit?.rank ?? null,
        analysisCoreScore: hit?.coreScore ?? null,
      };
    });

    const countryMeta = COUNTRY_META;

    const payload: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      countries,
      countriesAnalysis,
      analysisPeerIds: ANALYSIS_PEER_IDS,
      robustness: {
        sameYearVsLatest: {
          ...sameYearComparison,
        },
        peerSensitivity,
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
        sensitivityModes:
          'Append ?pruned=1, ?alt_productive=1, ?alt_human=1, ?alt_innovation=1, or ?overlay_plus=1 for experimental robustness payloads (does not change default scores).',
        frameworkNotes: [
          'This model is a peer-relative structural macro / institutional / innovation score. All ranks are relative to the peer set — they measure standing within the group, not absolute development levels.',
          'The overlay is a separate, conservative market-access / monetization lens. It reflects how accessible and liquid a country\'s capital markets are. It is not part of the core structural score and should be read independently.',
          'The model does not fully capture great-power strategic dominance, reserve-currency centrality, geopolitical leverage, or intangible-asset accumulation. Countries like the United States may appear structurally under-ranked relative to their actual global systemic weight for precisely this reason.',
          'Political Stability (PV.EST) weight is intentionally set below other institutional variables. WB PV.EST captures terrorism/violence/political disruption risk — it is not a direct measure of governance quality and tends to penalize large, diverse democracies more than small authoritarian states. Rule of Law and Government Effectiveness are more discriminating within this peer set.',
        ],
      },
    };

    // ─── ?pruned=1 ───────────────────────────────────────────────────────────
    if (pruned) {
      const peer = defaultIds;
      const variants: Record<string, { label: string; drop: string[] }> = {
        A_productive_capacity_redundancy: {
          label: 'A: drop Real GDP Growth + GDP per Capita Growth (pair)',
          drop: ['gdp_growth', 'gdp_per_capita_growth'],
        },
        B_innovation_redundancy: {
          label: 'B: drop R&D Expenditure + Researchers in R&D (pair)',
          drop: ['rd_expenditure', 'researchers_rd'],
        },
        C_market_depth_redundancy: {
          label: 'C: drop Stock Market Cap / GDP + Listed Companies (pair)',
          drop: ['market_cap_gdp', 'listed_companies'],
        },
      };
      const prunedOut: Record<string, unknown> = {};
      for (const [k, { label, drop }] of Object.entries(variants)) {
        const defs = dropIds(cloneDefs(), drop);
        const raw = buildRawRows(seriesByCode, peer, 'latest', defs);
        injectPopulation(raw, populations);
        const sc = scoreCountriesForDefs(raw, populations, defs);
        const rk = rankByCoreScore(sc);
        const vm = toRankMap(rk);
        const sp = spearmanFromRanks(peer, rankMapBaseline, vm);
        const st = rankStats(rankMapBaseline, vm, peer);
        prunedOut[k] = {
          label,
          spearmanRankVsFull: Number.isNaN(sp) ? null : sp,
          avgAbsRankMove: st.avgAbsRankMove,
          maxAbsRankMove: st.maxAbsRankMove,
          perCountryDeltas: st.deltas,
        };
      }
      payload.prunedRobustness = prunedOut;
    }

    // ─── ?alt_productive=1 ───────────────────────────────────────────────────
    if (altProductive) {
      const peer = ANALYSIS_PEER_IDS;
      const rawB = buildRawRows(seriesByCode, peer, 'latest', VARIABLES);
      injectPopulation(rawB, populations);
      const base = scoreCountriesForDefs(rawB, populations, VARIABLES);
      const baseRk = toRankMap(rankByCoreScore(base));

      const v1d = productiveVariant1(cloneDefs());
      const v2d = productiveVariant2(cloneDefs());
      const v3d = productiveVariant3(cloneDefs());

      const runV = (defs: VariableDef[]) => {
        const raw = buildRawRows(seriesByCode, peer, 'latest', defs);
        injectPopulation(raw, populations);
        const sc = scoreCountriesForDefs(raw, populations, defs);
        const rk = toRankMap(rankByCoreScore(sc));
        const st = rankStats(baseRk, rk, peer);
        const top = st.deltas.slice(0, 5);
        return {
          rankOrder: rankByCoreScore(sc).map(x => x.country),
          ...st,
          top5Movers: top,
        };
      };

      payload.altProductive = {
        peerSet: peer,
        variant1_remove_exports: runV(v1d),
        variant2_services_exports_proxy: runV(v2d),
        variant3_broad_capacity: runV(v3d),
      };
    }

    // ─── ?alt_human=1 ────────────────────────────────────────────────────────
    if (altHuman) {
      const peer = ANALYSIS_PEER_IDS;
      const rawB = buildRawRows(seriesByCode, peer, 'latest', VARIABLES);
      injectPopulation(rawB, populations);
      const base = scoreCountriesForDefs(rawB, populations, VARIABLES);
      const baseRk = toRankMap(rankByCoreScore(base));

      const runs = {
        variant1_drop_secondary: humanVariant1(cloneDefs()),
        variant2_drop_tertiary: humanVariant2(cloneDefs()),
        variant3_shift_to_lfp_life: humanVariant3(cloneDefs()),
      };

      const focus = ['US', 'GB', 'DE', 'CA', 'IN', 'VN'];
      const out: Record<string, unknown> = {};

      for (const [name, defs] of Object.entries(runs)) {
        const raw = buildRawRows(seriesByCode, peer, 'latest', defs);
        injectPopulation(raw, populations);
        const sc = scoreCountriesForDefs(raw, populations, defs);
        const rk = toRankMap(rankByCoreScore(sc));
        const st = rankStats(baseRk, rk, peer);
        const focusDeltas = focus
          .map(c => st.deltas.find(x => x.country === c))
          .filter((d): d is NonNullable<typeof d> => d != null);
        out[name] = {
          ...st,
          top5Movers: st.deltas.slice(0, 5),
          focusCountries: focusDeltas,
        };
      }
      payload.altHuman = out;
    }

    // ─── ?alt_innovation=1 ───────────────────────────────────────────────────
    if (altInnovation) {
      const peer = ANALYSIS_PEER_IDS;
      const rawB = buildRawRows(seriesByCode, peer, 'latest', VARIABLES);
      injectPopulation(rawB, populations);
      const base = scoreCountriesForDefs(rawB, populations, VARIABLES);
      const baseRk = toRankMap(rankByCoreScore(base));

      const runs = {
        variant1_drop_high_tech_exports: innovationVariant1(cloneDefs()),
        variant2_downweight_high_tech_reallocate: innovationVariant2(cloneDefs()),
        variant3_emphasize_ip_and_rd: innovationVariant3(cloneDefs()),
      };

      const focus = ['US', 'GB', 'CN', 'DE', 'KR', 'SG'];
      const out: Record<string, unknown> = {};

      for (const [name, defs] of Object.entries(runs)) {
        const raw = buildRawRows(seriesByCode, peer, 'latest', defs);
        injectPopulation(raw, populations);
        const sc = scoreCountriesForDefs(raw, populations, defs);
        const rk = toRankMap(rankByCoreScore(sc));
        const st = rankStats(baseRk, rk, peer);
        const focusDeltas = focus
          .map(c => st.deltas.find(x => x.country === c))
          .filter((d): d is NonNullable<typeof d> => d != null);
        out[name] = {
          ...st,
          top5Movers: st.deltas.slice(0, 5),
          focusCountries: focusDeltas,
        };
      }
      payload.altInnovation = out;
    }

    // ─── ?overlay_plus=1 ─────────────────────────────────────────────────────
    if (overlayPlus) {
      const peer = ANALYSIS_PEER_IDS;
      const rawBase = buildRawRows(seriesByCode, peer, 'latest', VARIABLES);
      injectPopulation(rawBase, populations);
      const scBase = scoreCountries(rawBase, populations);
      const overlayBase = rankByOverlayScore(scBase);

      const defs = overlayPlusDefs(cloneDefs());
      const raw = buildRawRows(seriesByCode, peer, 'latest', defs);
      injectPopulation(raw, populations);
      const sc = scoreCountriesForDefs(raw, populations, defs);
      const overlayPlusRk = rankByOverlayScore(sc);

      const baseOm = toRankMap(overlayBase.map(r => ({ country: r.country, rank: r.rank })));
      const plusOm = toRankMap(overlayPlusRk.map(r => ({ country: r.country, rank: r.rank })));
      const st = rankStats(baseOm, plusOm, peer);
      const focus = ['US', 'GB', 'CH', 'SG', 'CA', 'JP'];
      payload.overlayPlus = {
        overlayRankComparison: st,
        focusCountries: focus
          .map(c => st.deltas.find(d => d.country === c))
          .filter(Boolean),
        rankOrderBaselineOverlay: overlayBase.map(x => x.country),
        rankOrderOverlayPlus: overlayPlusRk.map(x => x.country),
      };
    }

    // ─── ?structural_core=1 ──────────────────────────────────────────────────
    if (structuralCore) {
      const peer = ANALYSIS_PEER_IDS;
      const rawB = buildRawRows(seriesByCode, peer, 'latest', VARIABLES);
      injectPopulation(rawB, populations);
      const baseRk = toRankMap(rankByCoreScore(scoreCountriesForDefs(rawB, populations, VARIABLES)));
      const defs = structuralCoreDefs(cloneDefs());
      const raw = buildRawRows(seriesByCode, peer, 'latest', defs);
      injectPopulation(raw, populations);
      const sc = scoreCountriesForDefs(raw, populations, defs);
      const rk = rankByCoreScore(sc);
      const vm = toRankMap(rk);
      const sp = spearmanFromRanks(peer, baseRk, vm);
      const st = rankStats(baseRk, vm, peer);
      const focus = ['US', 'CN', 'SG', 'IN', 'DE'];
      payload.structuralCore = {
        spearmanVsBaseline: Number.isNaN(sp) ? null : sp,
        avgAbsRankMove: st.avgAbsRankMove,
        maxAbsRankMove: st.maxAbsRankMove,
        top10Movers: st.deltas.slice(0, 10),
        allDeltas: st.deltas,
        focusCountries: focus.map(c => st.deltas.find(d => d.country === c)).filter(Boolean),
        rankOrder: rk.map(x => x.country),
        weightsApplied: {
          gdp_growth: 1,
          gdp_per_capita_growth: 1,
          gross_capital_formation: defs.find(v => v.id === 'gross_capital_formation')?.weight,
          manufacturing_va_per_capita: defs.find(v => v.id === 'manufacturing_va_per_capita')?.weight,
          exports_pct_gdp: defs.find(v => v.id === 'exports_pct_gdp')?.weight,
        },
      };
    }

    // ─── ?inst_no_pv=1 ───────────────────────────────────────────────────────
    if (instNoPv) {
      const peer = ANALYSIS_PEER_IDS;
      const rawB = buildRawRows(seriesByCode, peer, 'latest', VARIABLES);
      injectPopulation(rawB, populations);
      const baseRk = toRankMap(rankByCoreScore(scoreCountriesForDefs(rawB, populations, VARIABLES)));
      const defs = instNoPvDefs(cloneDefs());
      const raw = buildRawRows(seriesByCode, peer, 'latest', defs);
      injectPopulation(raw, populations);
      const sc = scoreCountriesForDefs(raw, populations, defs);
      const rk = rankByCoreScore(sc);
      const vm = toRankMap(rk);
      const sp = spearmanFromRanks(peer, baseRk, vm);
      const st = rankStats(baseRk, vm, peer);
      const focus = ['US', 'GB', 'DE', 'KR', 'SG', 'CN'];
      const focusInstDeltas = focus.map(c => {
        const base = scoreCountriesForDefs(rawB, populations, VARIABLES).find(x => x.country === c);
        const variant = sc.find(x => x.country === c);
        return {
          country: c,
          baseInstScore: (base?.pillarScores['institutional']?.score ?? null) !== null ? (base!.pillarScores['institutional'].score! * 100) : null,
          variantInstScore: (variant?.pillarScores['institutional']?.score ?? null) !== null ? (variant!.pillarScores['institutional'].score! * 100) : null,
          baseRank: baseRk.get(c) ?? null,
          variantRank: vm.get(c) ?? null,
          rankDelta: (vm.get(c) ?? 0) - (baseRk.get(c) ?? 0),
        };
      });
      payload.instNoPv = {
        spearmanVsBaseline: Number.isNaN(sp) ? null : sp,
        avgAbsRankMove: st.avgAbsRankMove,
        maxAbsRankMove: st.maxAbsRankMove,
        allDeltas: st.deltas,
        focusCountries: focusInstDeltas,
      };
    }

    // ─── ?inst_reweight_va_ge=1 ──────────────────────────────────────────────
    if (instReweightVaGe) {
      const peer = ANALYSIS_PEER_IDS;
      const rawB = buildRawRows(seriesByCode, peer, 'latest', VARIABLES);
      injectPopulation(rawB, populations);
      const baseScores = scoreCountriesForDefs(rawB, populations, VARIABLES);
      const baseRk = toRankMap(rankByCoreScore(baseScores));
      const defs = instReweightVaGeDefs(cloneDefs());
      const raw = buildRawRows(seriesByCode, peer, 'latest', defs);
      injectPopulation(raw, populations);
      const sc = scoreCountriesForDefs(raw, populations, defs);
      const rk = rankByCoreScore(sc);
      const vm = toRankMap(rk);
      const sp = spearmanFromRanks(peer, baseRk, vm);
      const st = rankStats(baseRk, vm, peer);
      const focus = ['US', 'GB', 'DE', 'KR', 'SG', 'CN'];
      const focusInstDeltas = focus.map(c => {
        const base = baseScores.find(x => x.country === c);
        const variant = sc.find(x => x.country === c);
        return {
          country: c,
          baseInstScore: (base?.pillarScores['institutional']?.score ?? null) !== null ? (base!.pillarScores['institutional'].score! * 100) : null,
          variantInstScore: (variant?.pillarScores['institutional']?.score ?? null) !== null ? (variant!.pillarScores['institutional'].score! * 100) : null,
          baseRank: baseRk.get(c) ?? null,
          variantRank: vm.get(c) ?? null,
          rankDelta: (vm.get(c) ?? 0) - (baseRk.get(c) ?? 0),
        };
      });
      payload.instReweightVaGe = {
        spearmanVsBaseline: Number.isNaN(sp) ? null : sp,
        avgAbsRankMove: st.avgAbsRankMove,
        maxAbsRankMove: st.maxAbsRankMove,
        allDeltas: st.deltas,
        focusCountries: focusInstDeltas,
      };
    }

    // ─── ?overlay_slim=1 ─────────────────────────────────────────────────────
    if (overlaySlim) {
      const peer = ANALYSIS_PEER_IDS;
      const rawBase = buildRawRows(seriesByCode, peer, 'latest', VARIABLES);
      injectPopulation(rawBase, populations);
      const scBase = scoreCountries(rawBase, populations);
      const overlayBase = rankByOverlayScore(scBase);
      const defs = overlaySlimDefs(cloneDefs());
      const raw = buildRawRows(seriesByCode, peer, 'latest', defs);
      injectPopulation(raw, populations);
      const sc = scoreCountriesForDefs(raw, populations, defs);
      const slimRk = rankByOverlayScore(sc);
      const baseOm = toRankMap(overlayBase.map(r => ({ country: r.country, rank: r.rank })));
      const slimOm = toRankMap(slimRk.map(r => ({ country: r.country, rank: r.rank })));
      const sp = spearmanFromRanks(peer, baseOm, slimOm);
      const st = rankStats(baseOm, slimOm, peer);
      payload.overlaySlim = {
        spearmanVsBaselineOverlay: Number.isNaN(sp) ? null : sp,
        avgAbsRankMove: st.avgAbsRankMove,
        maxAbsRankMove: st.maxAbsRankMove,
        allDeltas: st.deltas,
        rankOrderBaseline: overlayBase.map(x => x.country),
        rankOrderSlim: slimRk.map(x => x.country),
      };
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error('[country-health] GET error:', err);
    return NextResponse.json({ error: 'Failed to compute country health scores' }, { status: 500 });
  }
}
