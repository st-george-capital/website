import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeSuggestedTrades } from '@/lib/quant/cvar-optimizer';
import { fetchAlphaVantageQuote } from '@/lib/alpha-vantage';
import { sequential } from '@/lib/market-data/rate-limit';

export const dynamic = 'force-dynamic';

// GET most recent completed run. Recomputes the "current" side (current
// holdings/weights/prices) server-side on each call, so the current-vs-target comparison
// shown on the Holdings dashboard's ReweightModelSection is always live even if the saved
// run's own `universe` snapshot is stale — avoids a client-side double-fetch/race between
// /api/portfolio/summary and this route (per plan Section 10).
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const latestRun = await prisma.savedOptimizationRun.findFirst({
      where: { status: 'completed' },
      orderBy: { createdAt: 'desc' },
      include: { constraintSet: true },
    });

    if (!latestRun) {
      return NextResponse.json({ run: null });
    }

    const holdings = await prisma.holding.findMany({
      where: { assetType: { not: 'Cash' }, visible: true },
      select: { ticker: true, apiTicker: true, quantity: true, sector: true, region: true },
    });
    const tickerFor = (h: { ticker: string; apiTicker: string | null }) => h.apiTicker || h.ticker;

    // Rate-limit-safe: sequential + staggered rather than a tight loop, since Alpha
    // Vantage's free tier allows only a handful of requests per minute and this route can
    // be hit repeatedly from the Holdings dashboard (see lib/market-data/rate-limit.ts,
    // the same helper app/api/dashboard/flows/route.ts uses for its ETF universe fetch).
    const priceMap: Record<string, number> = {};
    const quoteResults = await sequential(
      holdings.map((h) => async () => {
        const ticker = tickerFor(h);
        try {
          const quote = await fetchAlphaVantageQuote(ticker);
          return quote?.price ? { ticker, price: quote.price } : null;
        } catch {
          return null;
        }
      }),
      550,
      8000
    );
    quoteResults.forEach((r) => {
      if (r) priceMap[r.ticker] = r.price;
    });
    // Fall back to the last backfilled PriceHistory close for any ticker whose live quote
    // failed or was skipped (rate-limited).
    const missingTickers = holdings.map(tickerFor).filter((t) => priceMap[t] === undefined);
    if (missingTickers.length > 0) {
      const lastBars = await prisma.priceHistory.findMany({
        where: { ticker: { in: missingTickers } },
        orderBy: { date: 'desc' },
        distinct: ['ticker'],
      });
      for (const bar of lastBars) priceMap[bar.ticker] = bar.close;
    }

    let portfolioValue = 0;
    for (const h of holdings) {
      portfolioValue += (priceMap[tickerFor(h)] ?? 0) * h.quantity;
    }

    const currentHoldingsInfo = holdings.map((h) => ({
      ticker: tickerFor(h),
      quantity: h.quantity,
      sector: h.sector,
      region: h.region,
    }));

    const targetWeights = latestRun.targetWeights as unknown as Record<string, number>;
    const liveSuggestedTrades = computeSuggestedTrades(targetWeights, currentHoldingsInfo, portfolioValue, priceMap);

    return NextResponse.json({
      run: {
        id: latestRun.id,
        asOfDate: latestRun.asOfDate,
        createdAt: latestRun.createdAt,
        status: latestRun.status,
        expectedCVaR: latestRun.expectedCVaR,
        benchmarkCVaR: latestRun.benchmarkCVaR,
        targetWeights,
        sectorWeights: latestRun.sectorWeights,
        regionWeights: latestRun.regionWeights,
        factorExposures: latestRun.factorExposures,
        stressTestResults: latestRun.stressTestResults,
        diagnostics: latestRun.diagnostics,
        constraintSetName: latestRun.constraintSet?.name ?? null,
      },
      suggestedTrades: liveSuggestedTrades,
      currentPortfolioValue: portfolioValue,
      pricesAsOf: new Date().toISOString(),
    });
  } catch (error) {
    console.error('CVaR optimizer latest run error:', error);
    return NextResponse.json({ error: 'Failed to fetch latest optimization run' }, { status: 500 });
  }
}
