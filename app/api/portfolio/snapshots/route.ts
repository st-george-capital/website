import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getCashBalance } from '@/lib/cash';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '90');

    const since = new Date();
    since.setDate(since.getDate() - days);

    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: { date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error('Get snapshots error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snapshots' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await requireAuth();
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    // Compute current portfolio state
    const holdings = await prisma.holding.findMany();
    const { cashBalance } = await getCashBalance();

    // Get current prices from MarketData cache
    const tickers = holdings
      .filter((h) => h.assetType !== 'Cash')
      .map((h) => h.apiTicker || h.ticker);

    const marketData = await prisma.marketData.findMany({
      where: { ticker: { in: tickers } },
    });
    const priceMap: Record<string, number> = {};
    for (const md of marketData) {
      priceMap[md.ticker] = md.price;
    }

    let stocksValue = 0;
    let totalCostBasis = 0;
    for (const h of holdings) {
      const apiTicker = h.apiTicker || h.ticker;
      const price = priceMap[apiTicker];
      if (price) {
        stocksValue += h.quantity * price;
      }
      if (h.costBasis) {
        totalCostBasis += h.quantity * h.costBasis;
      }
    }

    const portfolioValue = stocksValue + cashBalance;

    // Realized P&L aggregate
    const realizedResult = await prisma.transaction.aggregate({
      _sum: { realizedPnL: true },
      where: { realizedPnL: { not: null } },
    });

    // Upsert snapshot for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snapshot = await prisma.portfolioSnapshot.upsert({
      where: { date: today },
      update: {
        portfolioValue,
        stocksValue,
        cashBalance,
        totalCostBasis,
        realizedPnL: realizedResult._sum.realizedPnL || 0,
        positionCount: holdings.length,
      },
      create: {
        date: today,
        portfolioValue,
        stocksValue,
        cashBalance,
        totalCostBasis,
        realizedPnL: realizedResult._sum.realizedPnL || 0,
        positionCount: holdings.length,
      },
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    console.error('Create snapshot error:', error);
    return NextResponse.json(
      { error: 'Failed to create snapshot' },
      { status: 500 }
    );
  }
}
