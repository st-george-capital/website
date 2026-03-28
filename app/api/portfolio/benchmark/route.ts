import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { fetchAlphaVantageDailyHistory } from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '90');
    const ticker = searchParams.get('ticker') || 'SPY';

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Check cache
    const cached = await prisma.benchmarkData.findMany({
      where: {
        ticker,
        date: { gte: since },
      },
      orderBy: { date: 'asc' },
    });

    // If we have recent data (within 24h), use cache
    const latestCached = cached.length > 0 ? cached[cached.length - 1] : null;
    const isFresh =
      latestCached &&
      Date.now() - latestCached.date.getTime() < CACHE_DURATION_MS * 2;

    if (cached.length > 5 && isFresh) {
      return NextResponse.json({
        benchmark: cached.map((d) => ({
          date: d.date.toISOString().split('T')[0],
          close: d.close,
        })),
      });
    }

    // Fetch from Alpha Vantage
    try {
      const history = await fetchAlphaVantageDailyHistory(ticker, 'compact');

      // Store in cache
      for (const point of history) {
        const date = new Date(point.date);
        date.setHours(0, 0, 0, 0);
        await prisma.benchmarkData.upsert({
          where: {
            ticker_date: { ticker, date },
          },
          update: { close: point.close },
          create: { ticker, date, close: point.close },
        });
      }

      // Filter to requested date range
      const filtered = history.filter(
        (d) => new Date(d.date) >= since
      );

      return NextResponse.json({ benchmark: filtered });
    } catch {
      // Fallback to whatever cache we have
      if (cached.length > 0) {
        return NextResponse.json({
          benchmark: cached.map((d) => ({
            date: d.date.toISOString().split('T')[0],
            close: d.close,
          })),
        });
      }
      throw new Error('No benchmark data available');
    }
  } catch (error) {
    console.error('Benchmark data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch benchmark data' },
      { status: 500 }
    );
  }
}
