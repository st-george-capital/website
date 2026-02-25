import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { fetchAlphaVantageQuote } from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';

const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function GET() {
  try {
    await requireAuth();

    const holdings = await prisma.holding.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Collect unique tickers (exclude Cash asset type)
    const tickers = [
      ...new Set(
        holdings.filter((h) => h.assetType !== 'Cash').map((h) => h.ticker)
      ),
    ];

    // Check MarketData cache for all tickers
    const cachedData = await prisma.marketData.findMany({
      where: { ticker: { in: tickers } },
    });

    const now = Date.now();
    const marketDataMap: Record<
      string,
      { price: number; change: number; changePercent: number }
    > = {};

    const stale: string[] = [];
    for (const cached of cachedData) {
      const age = now - cached.lastUpdated.getTime();
      if (age < CACHE_DURATION_MS) {
        marketDataMap[cached.ticker] = {
          price: cached.price,
          change: cached.change,
          changePercent: cached.changePercent,
        };
      } else {
        stale.push(cached.ticker);
      }
    }

    const missing = tickers.filter(
      (t) => !cachedData.find((c) => c.ticker === t)
    );
    const toFetch = [...stale, ...missing];

    // Fetch up to 5 tickers from Alpha Vantage per request (rate limit safety)
    const fetchBatch = toFetch.slice(0, 5);

    for (const ticker of fetchBatch) {
      try {
        const quote = await fetchAlphaVantageQuote(ticker);
        marketDataMap[ticker] = {
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
        };
        await prisma.marketData.upsert({
          where: { ticker },
          update: {
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            volume: quote.volume,
            lastUpdated: new Date(),
          },
          create: {
            ticker,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            volume: quote.volume,
          },
        });
      } catch {
        // Fall back to stale cache if available
        const staleCached = cachedData.find((c) => c.ticker === ticker);
        if (staleCached) {
          marketDataMap[ticker] = {
            price: staleCached.price,
            change: staleCached.change,
            changePercent: staleCached.changePercent,
          };
        }
      }
    }

    // For tickers beyond the batch, use stale cache
    for (const ticker of toFetch.slice(5)) {
      const staleCached = cachedData.find((c) => c.ticker === ticker);
      if (staleCached) {
        marketDataMap[ticker] = {
          price: staleCached.price,
          change: staleCached.change,
          changePercent: staleCached.changePercent,
        };
      }
    }

    // Enrich holdings with market data
    let totalStockValue = 0;
    let totalCostBasis = 0;

    const enrichedHoldings = holdings.map((h) => {
      const market = marketDataMap[h.ticker];
      const currentPrice = market?.price ?? null;
      const currentValue =
        currentPrice !== null ? h.quantity * currentPrice : null;
      const totalCost = h.costBasis ? h.quantity * h.costBasis : null;
      const gainLoss =
        currentValue !== null && totalCost !== null
          ? currentValue - totalCost
          : null;
      const gainLossPercent =
        gainLoss !== null && totalCost && totalCost > 0
          ? (gainLoss / totalCost) * 100
          : null;

      if (currentValue !== null) totalStockValue += currentValue;
      if (totalCost !== null) totalCostBasis += totalCost;

      return {
        id: h.id,
        ticker: h.ticker,
        assetType: h.assetType,
        quantity: h.quantity,
        costBasis: h.costBasis,
        entryDate: h.entryDate,
        notes: h.notes,
        sector: h.sector,
        region: h.region,
        strategyTag: h.strategyTag,
        visible: h.visible,
        currentPrice,
        priceChange: market?.change ?? null,
        priceChangePercent: market?.changePercent ?? null,
        currentValue,
        totalCost,
        gainLoss,
        gainLossPercent,
        weight: 0, // computed below
      };
    });

    // Compute weights
    const totalValue = totalStockValue;
    for (const h of enrichedHoldings) {
      if (h.currentValue !== null && totalValue > 0) {
        h.weight = (h.currentValue / totalValue) * 100;
      }
    }

    const totalPnL = totalStockValue - totalCostBasis;
    const totalPnLPercent =
      totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;

    return NextResponse.json({
      holdings: enrichedHoldings,
      summary: {
        totalValue: totalStockValue,
        totalCostBasis,
        totalPnL,
        totalPnLPercent,
        positionCount: holdings.length,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Portfolio summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio summary' },
      { status: 500 }
    );
  }
}
