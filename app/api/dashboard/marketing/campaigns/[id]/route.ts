import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasMarketingAccess } from '@/lib/marketing';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!hasMarketingAccess(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaign = await prisma.marketingCampaign.findUnique({
      where: { id: params.id },
      include: {
        assets: {
          orderBy: [{ platform: 'asc' }, { ordering: 'asc' }],
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('[dashboard/marketing/campaigns/[id]] GET error:', error);
    return NextResponse.json({ error: 'Failed to load marketing campaign' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!hasMarketingAccess(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.$transaction([
      prisma.marketingAsset.deleteMany({ where: { campaignId: params.id } }),
      prisma.marketingCampaign.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[dashboard/marketing/campaigns/[id]] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
