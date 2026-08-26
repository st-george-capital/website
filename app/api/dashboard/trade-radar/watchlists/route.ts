import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTradeWatchlists } from '@/lib/trade-radar/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await getTradeWatchlists(session.user.id ?? null);
  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const scope = body.scope === 'team' && session.user.role === 'admin' ? 'team' : 'user';
  const label = String(body.label ?? '').trim();
  const watchType = String(body.watchType ?? '').trim();

  if (!label || !watchType) {
    return NextResponse.json({ error: 'label and watchType are required' }, { status: 400 });
  }

  const record = await prisma.tradeWatchlist.create({
    data: {
      userId: scope === 'team' ? null : session.user.id ?? null,
      scope,
      watchType,
      entityId: body.entityId ?? null,
      parentEntityId: body.parentEntityId ?? null,
      themeMapId: body.themeMapId ?? null,
      themeKey: body.themeKey ?? null,
      hs6: body.hs6 ?? null,
      routeKey: body.routeKey ?? null,
      label,
      notes: body.notes ? String(body.notes) : null,
    },
  });

  return NextResponse.json(record, { status: 201 });
}
