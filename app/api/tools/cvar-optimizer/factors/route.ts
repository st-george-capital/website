import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recomputeFactorExposures } from '@/lib/quant/factors';
import { BENCHMARK_TICKER } from '@/lib/quant/cvar-optimizer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// GET: latest persisted FactorExposure rows (most recent asOfDate per ticker in the
// current holdings universe).
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const holdings = await prisma.holding.findMany({
      where: { assetType: { not: 'Cash' } },
      select: { ticker: true, apiTicker: true },
    });
    const tickers = holdings.map((h) => h.apiTicker || h.ticker);

    const latestPerTicker = await Promise.all(
      tickers.map((ticker) =>
        prisma.factorExposure.findFirst({
          where: { ticker },
          orderBy: { asOfDate: 'desc' },
        })
      )
    );

    return NextResponse.json({
      exposures: latestPerTicker.filter(Boolean),
    });
  } catch (error) {
    console.error('CVaR optimizer factors GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch factor exposures' }, { status: 500 });
  }
}

// POST: recomputes + persists FactorExposure rows for current holdings (admin-only).
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    let tickers: string[] | undefined = Array.isArray(body?.tickers) ? body.tickers : undefined;
    const includeBenchmark = body?.includeBenchmark !== false;

    if (!tickers || tickers.length === 0) {
      const holdings = await prisma.holding.findMany({
        where: { assetType: { not: 'Cash' } },
        select: { ticker: true, apiTicker: true },
      });
      tickers = holdings.map((h) => h.apiTicker || h.ticker);
    }

    if (includeBenchmark && !tickers.includes(BENCHMARK_TICKER)) {
      // URTH has no meaningful OVERVIEW fundamentals (it's an ETF) — factor computation
      // for it will naturally degrade to dataComplete:false on the fundamentals-derived
      // factors, which is expected and fine; momentum/vol still compute from PriceHistory.
      tickers = [...tickers, BENCHMARK_TICKER];
    }

    const asOfDate = new Date();
    const scores = await recomputeFactorExposures(tickers, asOfDate);

    return NextResponse.json({
      asOfDate: asOfDate.toISOString(),
      count: scores.length,
      exposures: scores,
    });
  } catch (error) {
    console.error('CVaR optimizer factors POST error:', error);
    return NextResponse.json({ error: 'Failed to compute factor exposures' }, { status: 500 });
  }
}
