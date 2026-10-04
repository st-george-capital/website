import { prisma } from '@/lib/prisma';
import { buildRegimeForecast } from '@/lib/macro-engine/regime/forecast';
import { G10_COUNTRIES } from '@/lib/g10-rates/config';
import { fetchFredSeriesBatch } from '@/lib/g10-rates/fred';
import { buildCountryRates, buildG10RatesPayload, type G10RatesPayload } from '@/lib/g10-rates/analytics';
import { getTradeRadarSummary, getTradeSignals } from '@/lib/trade-radar/service';

const r = (x: number | null | undefined, nd = 2) => (x == null || !Number.isFinite(x) ? null : Number(x.toFixed(nd)));
const day = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/** Macro Allocation Engine: regime outlook, top stock picks in overweight sectors and backtest record. */
export async function getMacroOutlook() {
  const [forecast, latestSignal, latestRun] = await Promise.all([
    buildRegimeForecast(),
    prisma.allocationSignal.findFirst({ orderBy: { runDate: 'desc' }, select: { runDate: true } }),
    prisma.backtestRun.findFirst({ orderBy: { runAt: 'desc' }, include: { metrics: true } }),
  ]);

  let picks: unknown[] = [];
  if (latestSignal) {
    const overweight = await prisma.allocationSignal.findMany({
      where: { runDate: latestSignal.runDate, direction: 'overweight' },
      select: { etfTicker: true },
    });
    const stocks = await prisma.stockScreenResult.findMany({
      where: { runDate: latestSignal.runDate, sectorEtf: { in: overweight.map((s) => s.etfTicker) } },
      orderBy: { compositeScore: 'desc' },
      take: 10,
    });
    picks = stocks.map((s) => ({
      ticker: s.ticker,
      sector_etf: s.sectorEtf,
      composite_score: r(s.compositeScore, 1),
      rs_rating: r(s.rsRating, 0),
      eps_rank: r(s.epsRankProxy, 0),
      above_200dma_pct: s.dma200Position == null ? null : r(s.dma200Position * 100, 1),
      analyst_consensus: s.analystConsensus ?? null,
    }));
  }

  const metric = (window: string) => {
    const m = latestRun?.metrics.find((x) => x.window === window && x.benchmark === 'SPY');
    return m ? { hit_rate_pct: r(m.hitRate * 100, 1), sharpe: r(m.sharpeAnn), max_drawdown_pct: r(m.maxDrawdown * 100, 1) } : null;
  };

  return {
    source: 'SGC Macro Allocation Engine (stored model output)',
    ...(forecast
      ? {
          regime: forecast.currentRegime,
          as_of: day(forecast.asOfDate),
          confidence: r(forecast.currentConfidence),
          outlook: forecast.horizons.map((h) => ({
            trading_days: h.days,
            stay_probability_pct: r(h.stayProb * 100, 1),
            most_likely_switch: h.mostLikelyExit ? { regime: h.mostLikelyExit.regime, probability_pct: r(h.mostLikelyExit.prob * 100, 1) } : null,
          })),
        }
      : { regime: null, note: 'No active regime fit is stored yet.' }),
    signals_run_date: day(latestSignal?.runDate),
    top_stock_picks_in_overweight_sectors: picks,
    backtest_vs_spy: latestRun
      ? { run_date: day(latestRun.runAt), out_of_sample: metric('oos'), holdout: metric('holdout'), holdout_start: latestRun.holdoutStart }
      : null,
    note: 'Use get_macro_regime for the current overweight/underweight country and sector signals.',
    open_tool: '/dashboard/tools/macro-engine',
  };
}

let g10Cache: { at: number; data: G10RatesPayload } | null = null;
const G10_TTL_MS = 15 * 60_000;

/** G10 Rates Monitor: policy rates, 2y/10y yields, curve shape and what the front end is pricing. */
export async function getG10Rates({ country }: { country?: string }) {
  if (!g10Cache || Date.now() - g10Cache.at > G10_TTL_MS) {
    const series = [...new Set(G10_COUNTRIES.flatMap((c) => [c.policySeries, c.shortSeries, c.longSeries]))];
    const map = await fetchFredSeriesBatch(series, 120);
    const countries = G10_COUNTRIES.map((c) => buildCountryRates(c, map.get(c.policySeries) ?? [], map.get(c.shortSeries) ?? [], map.get(c.longSeries) ?? []));
    const missing = countries.filter((c) => c.dataQuality === 'missing').map((c) => c.code);
    g10Cache = { at: Date.now(), data: buildG10RatesPayload(countries, missing.length ? [`No FRED data for ${missing.join(', ')}`] : []) };
  }
  const p = g10Cache.data;
  const wanted = country?.trim().toUpperCase();
  const rows = p.countries
    .filter((c) => !wanted || c.code.toUpperCase() === wanted || c.name.toUpperCase().includes(wanted))
    .map((c) => ({
      country: c.name,
      code: c.code,
      central_bank: c.centralBank,
      as_of: c.asOfDate,
      policy_rate_pct: r(c.policyRate),
      short_yield_pct: r(c.shortYield),
      ten_year_yield_pct: r(c.longYield),
      curve_slope_pts: r(c.spreads.curveSlope),
      curve: c.curveRegime,
      front_end_vs_policy_pts: r(c.spreads.frontEndVsPolicy),
      market_pricing: c.easingSignal,
      approx_cuts_priced_bps: r(c.spreads.approximateCutsBps, 0),
      change_1m_bps: { short: r(c.changes.short1mBps, 0), ten_year: r(c.changes.long1mBps, 0) },
      data_quality: c.dataQuality,
    }));
  return {
    source: 'SGC G10 Rates Monitor (FRED)',
    headline: p.digest.headline,
    highlights: p.digest.bullets,
    countries: rows,
    caveat: p.disclaimer,
    ...(p.warnings.length ? { warnings: p.warnings } : {}),
    open_tool: '/dashboard/tools/g10-rates',
  };
}

/** Trade Shift Radar signal summaries. Shipment-level Panjiva rows and counterparties are licensed and never returned. */
export async function getTradeSignalsSummary({ country, theme, query, limit = 8 }: { country?: string; theme?: string; query?: string; limit?: number }) {
  const filtered = Boolean(country || theme || query);
  const [summary, list] = await Promise.all([
    getTradeRadarSummary(),
    filtered ? getTradeSignals({ pageSize: Math.min(Math.max(limit, 1), 15), country: country ?? null, themeKey: theme ?? null, q: query ?? null }) : null,
  ]);
  const items = (list?.items ?? summary.topSignals).slice(0, Math.min(Math.max(limit, 1), 15));
  return {
    source: 'SGC Trade Shift Radar (WRDS Panjiva, aggregated weekly signals)',
    latest_week: day(summary.latestWeek),
    active_high_severity_signals: summary.totals.activeHighSeveritySignals,
    biggest_parent_acceleration: summary.totals.biggestParentAcceleration,
    biggest_substitution_corridor: summary.totals.biggestSubstitutionCorridor,
    top_theme: summary.totals.topTheme,
    data_health: summary.totals.coverageHealth,
    signals: items.map((s) => ({
      title: s.title,
      severity: s.severityBucket,
      score: r(s.signalScore, 1),
      type: s.signalType,
      explanation: s.explanation,
      country: s.sourceCountry,
      route: s.routeKey,
      theme: s.themeLabel,
      market_tags: s.marketTags,
      yoy_change: r(s.metrics.yoyDelta),
    })),
    ...(list ? { matching_signals: list.total, filter_options: { countries: list.filters.countries.slice(0, 25), themes: list.filters.themes.slice(0, 25) } } : {}),
    open_tool: '/dashboard/tools/trade-radar',
  };
}

/** Latest completed CVaR Portfolio Optimizer run on the fund's holdings (stored result; nothing is re-solved). */
export async function getLatestCvarRun() {
  const run = await prisma.savedOptimizationRun.findFirst({
    where: { status: 'completed' },
    orderBy: { createdAt: 'desc' },
    select: {
      asOfDate: true, createdAt: true, expectedCVaR: true, benchmarkCVaR: true, expectedReturn: true, targetWeights: true,
      sectorWeights: true, regionWeights: true, factorExposures: true, suggestedTrades: true, stressTestResults: true,
      constraintSet: { select: { name: true } },
    },
  });
  if (!run) return { note: 'No completed CVaR optimizer run is stored yet. An admin runs it from the CVaR Portfolio Optimizer.' };
  const weights = Object.entries((run.targetWeights ?? {}) as Record<string, number>)
    .sort((a, b) => b[1] - a[1])
    .map(([ticker, w]) => ({ ticker, target_weight_pct: r(w * 100, 1) }));
  const trades = Array.isArray(run.suggestedTrades)
    ? (run.suggestedTrades as Record<string, unknown>[]).slice(0, 12).map((t) => ({ ticker: t.ticker, action: t.action, delta_shares: t.deltaShares, delta_dollars: t.deltaDollars, rationale: t.rationale }))
    : [];
  return {
    source: 'SGC CVaR Portfolio Optimizer (latest saved run)',
    run_date: day(run.createdAt),
    constraint_set: run.constraintSet?.name ?? null,
    expected_cvar_pct: r(run.expectedCVaR * 100),
    benchmark_cvar_pct: run.benchmarkCVaR == null ? null : r(run.benchmarkCVaR * 100),
    benchmark: 'URTH (MSCI World)',
    target_weights: weights,
    sector_weights: run.sectorWeights,
    region_weights: run.regionWeights,
    factor_exposures: run.factorExposures,
    suggested_trades_at_run_time: trades,
    stress_tests: run.stressTestResults,
    caveat: 'Recommendation only, as of the run date; trades use prices from that day.',
    open_tool: '/dashboard/tools/cvar-optimizer',
  };
}
