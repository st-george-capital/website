import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { replayHoldout, DEFAULT_CONFIG } from '@/lib/macro-engine/backtest';
import type { ScoredDayRecord } from '@/lib/macro-engine/backtest';

export const dynamic = 'force-dynamic';

/**
 * Serves the honest model trajectory for the dashboard's equity chart and
 * "Today's Trades" card. Replays the current backtest model day-by-day over
 * the holdout window (HOLDOUT_START → latest), applying credit-gate flats
 * and transaction costs identically to the canonical backtest.
 *
 * `?start=YYYY-MM-DD` / `?end=YYYY-MM-DD` filter the returned points; the
 * model is always replayed from HOLDOUT_START so cumulative equity is
 * consistent regardless of the visible range.
 *
 * Replaces the prior 63-day top-half synthetic curve (inconsistent with the
 * 21-day top-25% model actually running). See CHANGELOG Chunk 6.
 */

export type HistoryPoint = {
  date:                 string;    // YYYY-MM-DD
  regime:               string;
  gated:                boolean;   // true when credit-gated (flat)
  portfolioReturnNet:   number;    // 0 when gated
  portfolioReturnGross: number;    // 0 when gated
  spyReturn:            number;    // always present (SPY has coverage every active day)
  excessReturnNet:      number;    // (portfolio - SPY) * finalSize - cost; 0 when gated
  excessReturnGross:    number;    // same without cost; 0 when gated
  cumulativePortfolioNet:   number;   // (1 + rtn_t)·…·(1 + rtn_T) starting at 1
  cumulativePortfolioGross: number;
  cumulativeSpy:        number;
  turnover:             number;    // 0 when gated
  cost:                 number;    // 0 when gated
  finalSize:            number;    // 0 when gated
  basket: Array<{ ticker: string; weight: number; score: number }>;
  // Back-compat mirror fields (old API names used elsewhere in UI)
  portfolioReturn:      number;    // = portfolioReturnNet
  excessReturn:         number;    // = excessReturnNet
  cumulativePortfolio:  number;    // = cumulativePortfolioNet
};

export type RegimeAttribution = {
  regime:           string;
  nDays:            number;      // total days in this regime (active + gated)
  nActive:          number;      // only non-gated days contribute to returns
  nGated:           number;
  // Mean per-period excess over SPY (post/pre transaction costs) — diagnostic.
  meanExcessNet:    number;
  meanExcessGross:  number;
  // Annualized Sharpe on this regime's active observations, same convention
  // as the main backtest (252/21 periods per year).
  sharpeNet:        number | null;
  sharpeGross:      number | null;
  // Hit rate on active days (fraction with excessNet > 0).
  hitRate:          number | null;
  // Cumulative portfolio return earned during this regime's active days
  // (compounded), expressed as a multiplicative factor. 1.0 = neutral.
  cumReturnNet:     number;
  cumReturnGross:   number;
  // Cumulative SPY return over the same days (for excess-vs-regime comparisons).
  cumSpy:           number;
  avgTurnover:      number;      // mean L1 turnover on active days
  // Share of holdout time spent in this regime (nDays / total).
  shareOfTime:      number;
  // Share of holdout alpha (sum of netExcess) delivered by this regime.
  alphaShareNet:    number;
  alphaShareGross:  number;
};

export type HistoryPayload = {
  points:       HistoryPoint[];
  runId:        string;
  dataStart:    string;
  holdoutStart: string;
  asOfDate:     string;
  summary: {
    sharpeNet:         number;
    sharpeGross:       number;
    maxDrawdownNet:    number | null;
    maxDrawdownGross:  number | null;
    avgTurnover:       number;
    annualizedCostBps: number;
    hitRate:           number;
    nActive:           number;
    nGated:            number;
    activeFraction:    number;
    // Cumulative return at the last visible point
    finalPortfolioNet:   number;
    finalPortfolioGross: number;
    finalSpy:            number;
  };
  byRegime:     RegimeAttribution[];
  config: {
    longFraction:       number;
    transactionCostBps: number;
    creditGate:         'on' | 'off' | 'selective';
    forwardDays:        number;
  };
};

// Small in-memory cache keyed by the latest regime date. Replays are expensive
// (~60-90s) and the underlying inputs only change when new daily feature rows
// land, so this cuts typical dashboard hits to ~50ms once warm.
let CACHE: { key: string; ts: number; payload: HistoryPayload } | null = null;
const TTL_MS = 15 * 60 * 1000;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get('start');
  const endParam   = searchParams.get('end');

  const now = Date.now();
  let full: HistoryPayload;
  if (CACHE && (now - CACHE.ts) < TTL_MS) {
    full = CACHE.payload;
  } else {
    full = await buildFullReplay();
    CACHE = { key: full.asOfDate, ts: now, payload: full };
  }

  // Apply range filter on top of the cached full replay
  if (!startParam && !endParam) {
    return NextResponse.json(full);
  }

  const filtered: HistoryPoint[] = full.points.filter((p) => {
    if (startParam && p.date < startParam) return false;
    if (endParam   && p.date > endParam)   return false;
    return true;
  });

  // Recompute summary "finalX" on the filtered slice — but keep Sharpe/MDD
  // pinned to the full holdout replay so the summary card numbers match the
  // backtest tables exactly regardless of the zoom level.
  const last = filtered[filtered.length - 1];
  const summary: HistoryPayload['summary'] = {
    ...full.summary,
    finalPortfolioNet:   last?.cumulativePortfolioNet   ?? 1,
    finalPortfolioGross: last?.cumulativePortfolioGross ?? 1,
    finalSpy:            last?.cumulativeSpy            ?? 1,
  };

  return NextResponse.json({ ...full, points: filtered, summary } satisfies HistoryPayload);
}

async function buildFullReplay(): Promise<HistoryPayload> {
  const replay = await replayHoldout(DEFAULT_CONFIG);

  let cumNet   = 1;
  let cumGross = 1;
  let cumSpy   = 1;
  const points: HistoryPoint[] = [];

  for (const p of replay.points) {
    // SPY accrues every day where SPY has a forward return, regardless of
    // whether we were in the market — it's the benchmark curve.
    const spyReturn = p.benchmarkReturn ?? 0;
    cumSpy *= 1 + spyReturn;

    const pfGross = p.grossExcess ?? 0;   // (basket - spy) * size; 0 when gated
    const pfNet   = p.netExcess   ?? 0;   // gross - cost; 0 when gated

    // Backtest convention: on ACTIVE days the "uninvested" slice (1-size)
    // tracks SPY, so actual portfolio return = spy + (basket-spy)*size =
    // spy + grossExcess. On GATED days the whole point of the credit gate
    // is to be OUT of the market; we flat the portfolio to 0 return (cash)
    // so the equity curve honestly shows the drawdown the gate avoided.
    const pfReturnGross = p.gated ? 0 : (spyReturn + pfGross);
    const pfReturnNet   = p.gated ? 0 : (spyReturn + pfNet);

    cumGross *= 1 + pfReturnGross;
    cumNet   *= 1 + pfReturnNet;

    points.push({
      date:                    p.date,
      regime:                  p.regime,
      gated:                   p.gated,
      portfolioReturnNet:      pfReturnNet,
      portfolioReturnGross:    pfReturnGross,
      spyReturn,
      excessReturnNet:         pfNet,
      excessReturnGross:       pfGross,
      cumulativePortfolioNet:   cumNet,
      cumulativePortfolioGross: cumGross,
      cumulativeSpy:            cumSpy,
      turnover:  p.turnover ?? 0,
      cost:      p.cost     ?? 0,
      finalSize: p.finalSize ?? 0,
      basket:    p.basket.map((b) => ({ ticker: b.ticker, weight: b.weight, score: b.score })),

      portfolioReturn:     pfReturnNet,
      excessReturn:        pfNet,
      cumulativePortfolio: cumNet,
    });
  }

  const m = replay.metrics;

  const byRegime = buildRegimeAttribution(replay.points);

  return {
    points,
    runId:        'live-replay',
    dataStart:    replay.dataStart,
    holdoutStart: replay.holdoutStart,
    asOfDate:     replay.asOfDate,
    byRegime,
    summary: {
      sharpeNet:         m.sharpeAnn,
      sharpeGross:       m.sharpeAnnGross,
      maxDrawdownNet:    m.maxDrawdown,
      maxDrawdownGross:  m.maxDrawdownGross,
      avgTurnover:       m.avgTurnover,
      annualizedCostBps: m.annualizedCostBps,
      hitRate:           m.hitRate,
      nActive:           m.nPeriods,
      nGated:            m.flatDays,
      activeFraction:    m.activeFraction,
      finalPortfolioNet:   cumNet,
      finalPortfolioGross: cumGross,
      finalSpy:            cumSpy,
    },
    config: replay.config,
  };
}

/**
 * Groups the holdout replay by regime label and computes an attribution row per
 * regime: how often we were in it, how much alpha it delivered, and the
 * sharpe/hit-rate conditional on being in it.
 *
 * Only active (non-gated) days contribute to the return statistics; gated days
 * are recorded as `nGated` for each regime so you can see e.g. "Regime-4-credit
 * was 20% of holdout time, all of it gated flat → 0% alpha share by design".
 *
 * Sharpe uses PPY=252/21 (the engine's non-overlapping monthly convention).
 * Sharpe is null when a regime has fewer than 4 active days (noise).
 */
function buildRegimeAttribution(points: ScoredDayRecord[]): RegimeAttribution[] {
  if (points.length === 0) return [];

  const PPY = 252 / 21;
  const total = points.length;

  // Totals for alpha-share normalization. Use absolute values so that
  // regimes with negative alpha still count proportionally (otherwise a
  // -0.5% alpha regime plus a +1.0% alpha regime would naively "share"
  // 200% of the total and the sign of the share would flip).
  let totalAbsNet = 0;
  let totalAbsGross = 0;
  for (const p of points) {
    if (!p.gated) {
      totalAbsNet   += Math.abs(p.netExcess   ?? 0);
      totalAbsGross += Math.abs(p.grossExcess ?? 0);
    }
  }

  const groups = new Map<string, ScoredDayRecord[]>();
  for (const p of points) {
    const arr = groups.get(p.regime);
    if (arr) arr.push(p); else groups.set(p.regime, [p]);
  }

  const rows: RegimeAttribution[] = [];
  for (const [regime, recs] of groups) {
    const active = recs.filter(r => !r.gated);
    const gated  = recs.length - active.length;

    const nets   = active.map(r => r.netExcess   ?? 0);
    const grosses= active.map(r => r.grossExcess ?? 0);
    const meanNet   = nets.length   ? nets.reduce((a, b) => a + b, 0)    / nets.length   : 0;
    const meanGross = grosses.length? grosses.reduce((a, b) => a + b, 0) / grosses.length: 0;

    const std = (xs: number[], mean: number) => {
      if (xs.length < 2) return 0;
      const v = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
      return Math.sqrt(v);
    };
    const sdNet   = std(nets,    meanNet);
    const sdGross = std(grosses, meanGross);
    const sharpeNet   = nets.length >= 4 && sdNet   > 0 ? (meanNet   / sdNet  ) * Math.sqrt(PPY) : null;
    const sharpeGross = nets.length >= 4 && sdGross > 0 ? (meanGross / sdGross) * Math.sqrt(PPY) : null;
    const hitRate     = nets.length > 0 ? nets.filter(x => x > 0).length / nets.length : null;

    // Compound active-day portfolio returns. Active-day convention:
    //   pfReturn = spy + grossExcess   (matches the equity-curve builder
    //   above; uninvested slice tracks SPY). Gated days earn 0 here.
    let cumNet   = 1;
    let cumGross = 1;
    let cumSpy   = 1;
    let turnoverSum = 0;
    for (const r of active) {
      const spy   = r.benchmarkReturn ?? 0;
      const gross = r.grossExcess     ?? 0;
      const net   = r.netExcess       ?? 0;
      cumSpy   *= 1 + spy;
      cumGross *= 1 + spy + gross;
      cumNet   *= 1 + spy + net;
      turnoverSum += (r.turnover ?? 0);
    }

    const sumAbsNet   = nets.reduce((a, b) => a + Math.abs(b), 0);
    const sumAbsGross = grosses.reduce((a, b) => a + Math.abs(b), 0);

    rows.push({
      regime,
      nDays:   recs.length,
      nActive: active.length,
      nGated:  gated,
      meanExcessNet:   meanNet,
      meanExcessGross: meanGross,
      sharpeNet,
      sharpeGross,
      hitRate,
      cumReturnNet:    cumNet,
      cumReturnGross:  cumGross,
      cumSpy,
      avgTurnover:     active.length > 0 ? turnoverSum / active.length : 0,
      shareOfTime:     total > 0 ? recs.length / total : 0,
      alphaShareNet:   totalAbsNet   > 0 ? sumAbsNet   / totalAbsNet   : 0,
      alphaShareGross: totalAbsGross > 0 ? sumAbsGross / totalAbsGross : 0,
    });
  }

  // Sort by alpha share (descending) so the UI leads with the regimes
  // actually driving the strategy.
  rows.sort((a, b) => b.alphaShareNet - a.alphaShareNet);
  return rows;
}
