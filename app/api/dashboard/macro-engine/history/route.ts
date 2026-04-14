import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export type HistoryPoint = {
  date: string;          // YYYY-MM-DD
  regime: string;
  portfolioReturn: number;  // equal-weight long-top-half 63-day return
  spyReturn: number;
  excessReturn: number;     // portfolio - SPY
  cumulativePortfolio: number; // cumulative from start (1.0 = baseline)
  cumulativeSpy: number;
  rankings: Array<{
    ticker: string;
    rank: number;
    score: number;
    direction: 'overweight' | 'underweight';
  }>;
};

export type HistoryPayload = {
  points: HistoryPoint[];
  runId: string;
  dataStart: string;
};

const FEATURE_DIMS = ['zGrowth', 'zInflation', 'zMonetary', 'zCredit', 'zCarry', 'zEarnings'] as const;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');

  // Default: last 4 years
  const endDate = endParam ? new Date(endParam) : new Date();
  const startDate = startParam
    ? new Date(startParam)
    : new Date(endDate.getTime() - 4 * 365 * 24 * 60 * 60 * 1000);

  // 1. Get latest backtest run + weights
  const latestRun = await prisma.backtestRun.findFirst({ orderBy: { runAt: 'desc' } });
  if (!latestRun) return NextResponse.json({ points: [], runId: '', dataStart: '' });

  const weightRows = await prisma.factorWeightSet.findMany({
    where: { runId: latestRun.id },
  });
  const weightMap = new Map(
    weightRows.map((w) => [
      w.regimeLabel,
      [w.wGrowth, w.wInflation, w.wMonetary, w.wCredit, w.wCarry, w.wEarnings],
    ]),
  );
  const globalWeights = weightMap.get('global') ?? new Array(6).fill(0);

  // 2. Get regime labels for the date range
  const regimeRows = await prisma.regimeLabel.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    orderBy: { date: 'asc' },
    select: { date: true, regimeLabel: true },
  });
  const regimeMap = new Map(regimeRows.map((r) => [r.date.toISOString().slice(0, 10), r.regimeLabel]));

  // 3. Get feature matrix — paginate by ticker to stay under 5MB
  type FeatureRow = { featureDate: Date; ticker: string; zGrowth: number | null; zInflation: number | null; zMonetary: number | null; zCredit: number | null; zCarry: number | null; zEarnings: number | null };
  const allFeatures: FeatureRow[] = [];

  // Get tickers that exist in this date range
  const tickerRows = await prisma.$queryRaw<{ ticker: string }[]>`
    SELECT DISTINCT ticker FROM factor_feature_matrix
    WHERE "featureDate" >= ${startDate} AND "featureDate" <= ${endDate}
    AND ticker NOT IN ('SPY') -- SPY is benchmark, not a portfolio candidate
    ORDER BY ticker
  `;
  const tickers = tickerRows.map((r) => r.ticker);

  for (const ticker of tickers) {
    const rows = await prisma.$queryRaw<FeatureRow[]>`
      SELECT "featureDate", ticker, "zGrowth", "zInflation", "zMonetary", "zCredit", "zCarry", "zEarnings"
      FROM factor_feature_matrix
      WHERE ticker = ${ticker}
        AND "featureDate" >= ${startDate}
        AND "featureDate" <= ${endDate}
      ORDER BY "featureDate" ASC
    `;
    allFeatures.push(...rows);
  }

  // 4. Get SPY prices for forward returns (need FORWARD_DAYS=63 ahead)
  const FORWARD_DAYS = 63;
  const priceEnd = new Date(endDate.getTime() + (FORWARD_DAYS + 15) * 24 * 60 * 60 * 1000);

  type PriceRow = { ticker: string; date: Date; adjClose: number };
  const allPriceRows: PriceRow[] = [];
  const allTickers = [...tickers, 'SPY'];

  for (const ticker of allTickers) {
    const rows = await prisma.$queryRaw<PriceRow[]>`
      SELECT ticker, date, "adjClose"
      FROM ohlcv_daily
      WHERE ticker = ${ticker}
        AND date >= ${startDate}
        AND date <= ${priceEnd}
      ORDER BY date ASC
    `;
    allPriceRows.push(...rows);
  }

  // Build price lookup: ticker → sorted prices
  const priceByTicker = new Map<string, { date: Date; adjClose: number }[]>();
  for (const r of allPriceRows) {
    if (!priceByTicker.has(r.ticker)) priceByTicker.set(r.ticker, []);
    priceByTicker.get(r.ticker)!.push({ date: r.date, adjClose: r.adjClose });
  }

  function forwardReturn(ticker: string, baseDate: Date): number | null {
    const prices = priceByTicker.get(ticker);
    if (!prices) return null;
    const base = prices.find((p) => p.date.getTime() === baseDate.getTime());
    if (!base) return null;
    const targetMs = baseDate.getTime() + FORWARD_DAYS * 24 * 60 * 60 * 1000;
    const fwd = prices.find(
      (p) => p.date.getTime() >= targetMs && p.date.getTime() <= targetMs + 15 * 24 * 60 * 60 * 1000,
    );
    if (!fwd) return null;
    return fwd.adjClose / base.adjClose - 1;
  }

  // 5. Group features by date, score, rank, compute portfolio return
  const byDate = new Map<string, FeatureRow[]>();
  for (const row of allFeatures) {
    const dk = row.featureDate.toISOString().slice(0, 10);
    if (!byDate.has(dk)) byDate.set(dk, []);
    byDate.get(dk)!.push(row);
  }

  const points: HistoryPoint[] = [];
  let cumPortfolio = 1.0;
  let cumSpy = 1.0;

  for (const [dateKey, rows] of Array.from(byDate.entries()).sort()) {
    const regime = regimeMap.get(dateKey) ?? 'unknown';
    const weights = weightMap.get(regime) ?? globalWeights;

    // Score each ticker
    const scored: Array<{ ticker: string; score: number; fwdReturn: number | null }> = [];
    for (const row of rows) {
      const vec = FEATURE_DIMS.map((d) => (row[d] as number | null) ?? 0);
      const score = vec.reduce((s, v, i) => s + v * weights[i], 0);
      const fwdRet = forwardReturn(row.ticker, row.featureDate);
      scored.push({ ticker: row.ticker, score, fwdReturn: fwdRet });
    }

    // Filter to tickers with valid forward returns
    const withReturns = scored.filter((s) => s.fwdReturn !== null);
    if (withReturns.length < 2) continue;

    const spyReturn = forwardReturn('SPY', new Date(dateKey));
    if (spyReturn === null) continue;

    // Rank descending by score
    withReturns.sort((a, b) => b.score - a.score);
    const longCount = Math.ceil(withReturns.length / 2);
    const portfolioReturn =
      withReturns.slice(0, longCount).reduce((s, t) => s + t.fwdReturn!, 0) / longCount;

    const excessReturn = portfolioReturn - spyReturn;
    cumPortfolio *= 1 + portfolioReturn;
    cumSpy *= 1 + spyReturn;

    const rankings = withReturns.map((t, i) => ({
      ticker: t.ticker,
      rank: i + 1,
      score: t.score,
      direction: (i < longCount ? 'overweight' : 'underweight') as 'overweight' | 'underweight',
    }));

    points.push({
      date: dateKey,
      regime,
      portfolioReturn,
      spyReturn,
      excessReturn,
      cumulativePortfolio: cumPortfolio,
      cumulativeSpy: cumSpy,
      rankings,
    });
  }

  return NextResponse.json({
    points,
    runId: latestRun.id,
    dataStart: latestRun.dataStart,
  } satisfies HistoryPayload);
}
