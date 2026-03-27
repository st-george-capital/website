import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCashBalance } from '@/lib/cash';

export const dynamic = 'force-dynamic';

// Public endpoint - no auth required
// Returns only aggregate portfolio value and daily change (no position details)
export async function GET() {
  try {
    const holdings = await prisma.holding.findMany({
      select: { ticker: true, apiTicker: true, quantity: true, costBasis: true, assetType: true },
    });

    // Get cached market data for all holdings
    const apiTickers = holdings
      .filter((h) => h.assetType !== 'Cash')
      .map((h) => h.apiTicker || h.ticker);

    const cachedData = await prisma.marketData.findMany({
      where: { ticker: { in: apiTickers } },
    });

    const priceMap: Record<string, { price: number; change: number }> = {};
    for (const c of cachedData) {
      priceMap[c.ticker] = { price: c.price, change: c.change };
    }

    let stocksValue = 0;
    let dailyChange = 0;
    for (const h of holdings) {
      if (h.assetType === 'Cash') continue;
      const apiTicker = h.apiTicker || h.ticker;
      const data = priceMap[apiTicker];
      if (data) {
        stocksValue += h.quantity * data.price;
        dailyChange += h.quantity * data.change;
      } else if (h.costBasis) {
        // Fall back to cost basis when market data isn't cached yet
        stocksValue += h.quantity * h.costBasis;
      }
    }

    const { cashBalance } = await getCashBalance();
    const totalValue = stocksValue + cashBalance;

    return NextResponse.json({
      totalValue,
      dailyChange,
      dailyChangePercent: totalValue > 0 ? (dailyChange / (totalValue - dailyChange)) * 100 : 0,
      positionCount: holdings.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Public portfolio summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio summary' },
      { status: 500 }
    );
  }
}
