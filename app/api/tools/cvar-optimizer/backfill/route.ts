import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOrBackfillPriceHistory } from '@/lib/market-data/price-history';
import { BENCHMARK_TICKER } from '@/lib/quant/cvar-optimizer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Deliberately decoupled from the optimization run itself (see run/route.ts) so a full
// backfill's latency doesn't block every optimization attempt — incremental gap-fills
// after the first backfill are fast (see getOrBackfillPriceHistory).
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    let tickers: string[] | undefined = Array.isArray(body?.tickers) ? body.tickers : undefined;

    if (!tickers || tickers.length === 0) {
      const holdings = await prisma.holding.findMany({
        where: { assetType: { not: 'Cash' } },
        select: { ticker: true, apiTicker: true },
      });
      tickers = holdings.map((h) => h.apiTicker || h.ticker);
      tickers.push(BENCHMARK_TICKER);
    }

    const results = await getOrBackfillPriceHistory(tickers);

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        ok: results.filter((r) => r.status === 'ok').length,
        errors: results.filter((r) => r.status === 'error').length,
        totalRowsWritten: results.reduce((sum, r) => sum + r.rowsWritten, 0),
      },
    });
  } catch (error) {
    console.error('CVaR optimizer backfill error:', error);
    return NextResponse.json({ error: 'Failed to backfill price history' }, { status: 500 });
  }
}
