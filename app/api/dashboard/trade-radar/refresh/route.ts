import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { runTradeRadarIngest } from '@/lib/trade-radar/pipeline';
import { toRefreshPayload } from '@/lib/trade-radar/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await runTradeRadarIngest({
    fullRefresh: Boolean(body.fullRefresh),
    rowLimit: body.rowLimit ? Number(body.rowLimit) : null,
  });

  return NextResponse.json(toRefreshPayload(result));
}
