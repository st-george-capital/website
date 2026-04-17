import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { replayHoldout, DEFAULT_CONFIG } from '@/lib/macro-engine/backtest';

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

  return {
    points,
    runId:        'live-replay',
    dataStart:    replay.dataStart,
    holdoutStart: replay.holdoutStart,
    asOfDate:     replay.asOfDate,
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
