import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getTradeSignalDetail } from '@/lib/trade-radar/service';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await getTradeSignalDetail(params.id);
  if (!payload) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(payload);
}
