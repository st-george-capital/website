import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getTradeSignals } from '@/lib/trade-radar/service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const payload = await getTradeSignals({
    page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
    pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : undefined,
    country: searchParams.get('country'),
    signalType: searchParams.get('signalType'),
    themeKey: searchParams.get('themeKey'),
    severityBucket: searchParams.get('severityBucket'),
    q: searchParams.get('q'),
  });

  return NextResponse.json(payload);
}
