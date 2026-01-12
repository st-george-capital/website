import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

// Cache duration in minutes
const CACHE_DURATION = 15;

async function fetchFromPolygon(ticker: string) {
  const apiKey = process.env.POLYGON_API_KEY;
  
  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not configured');
  }

  const response = await fetch(
    `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?apiKey=${apiKey}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch from Polygon');
  }

  const data = await response.json();
  
  if (data.results && data.results.length > 0) {
    const result = data.results[0];
    return {
      price: result.c, // close price
      change: result.c - result.o,
      changePercent: ((result.c - result.o) / result.o) * 100,
      volume: result.v,
    };
  }

  throw new Error('No data available');
}

async function fetchFromYahooFinance(ticker: string) {
  // Fallback to Yahoo Finance API (free, but less reliable)
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch from Yahoo Finance');
  }

  const data = await response.json();
  const quote = data.chart.result[0];
  const meta = quote.meta;
  
  return {
    price: meta.regularMarketPrice,
    change: meta.regularMarketPrice - meta.previousClose,
    changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
    volume: meta.regularMarketVolume || 0,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase();

    // Check cache first
    const cached = await prisma.marketData.findUnique({
      where: { ticker },
    });

    if (cached) {
      const cacheAge = Date.now() - cached.lastUpdated.getTime();
      const cacheAgeMinutes = cacheAge / (1000 * 60);

      if (cacheAgeMinutes < CACHE_DURATION) {
        return NextResponse.json({
          ...cached,
          cached: true,
        });
      }
    }

    // Fetch fresh data
    let marketData;
    
    try {
      // Try Polygon first if API key is available
      if (process.env.POLYGON_API_KEY) {
        marketData = await fetchFromPolygon(ticker);
      } else {
        throw new Error('No Polygon API key');
      }
    } catch (error) {
      // Fallback to Yahoo Finance
      try {
        marketData = await fetchFromYahooFinance(ticker);
      } catch (fallbackError) {
        return NextResponse.json(
          { error: 'Failed to fetch market data from all sources' },
          { status: 500 }
        );
      }
    }

    // Update cache
    const updated = await prisma.marketData.upsert({
      where: { ticker },
      update: {
        price: marketData.price,
        change: marketData.change,
        changePercent: marketData.changePercent,
        volume: Math.floor(marketData.volume),
        lastUpdated: new Date(),
      },
      create: {
        ticker,
        price: marketData.price,
        change: marketData.change,
        changePercent: marketData.changePercent,
        volume: Math.floor(marketData.volume),
      },
    });

    return NextResponse.json({
      ...updated,
      cached: false,
    });
  } catch (error) {
    console.error('Market data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}

