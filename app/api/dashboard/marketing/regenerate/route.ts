import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasMarketingAccess, type MarketingCaptionPack, type MarketingOverrideFields, type MarketingSourceSnapshot } from '@/lib/marketing';
import { renderAndStoreMarketingPack } from '@/lib/marketing-renderer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function resolveOrigin(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? 'http';

  if (!host) {
    throw new Error('Unable to resolve host for marketing asset regeneration.');
  }

  return `${protocol}://${host}`;
}

function toJsonValue(value: unknown) {
  return value as Prisma.InputJsonValue;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!hasMarketingAccess(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const campaignId = typeof body.campaignId === 'string' ? body.campaignId : null;

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    const campaign = await prisma.marketingCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const rendered = await renderAndStoreMarketingPack({
      campaignId: campaign.id,
      snapshot: campaign.sourceSnapshot as unknown as MarketingSourceSnapshot,
      overrides: (campaign.overrideFields || null) as unknown as MarketingOverrideFields | null,
      captions: (campaign.generatedCaptions || null) as unknown as MarketingCaptionPack | null,
      origin: resolveOrigin(request),
    });

    await prisma.$transaction([
      prisma.marketingAsset.deleteMany({ where: { campaignId: campaign.id } }),
      prisma.marketingCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'generated',
          sourceSnapshot: toJsonValue(rendered.snapshot),
          generatedCaptions: toJsonValue(rendered.captions),
        },
      }),
      prisma.marketingAsset.createMany({
        data: rendered.assets.map((asset) => ({
          campaignId: campaign.id,
          platform: asset.platform,
          assetKind: asset.assetKind,
          mimeType: asset.mimeType,
          blobUrl: asset.blobUrl,
          width: asset.width,
          height: asset.height,
          ordering: asset.ordering,
        })),
      }),
    ]);

    const hydrated = await prisma.marketingCampaign.findUnique({
      where: { id: campaign.id },
      include: {
        assets: {
          orderBy: [{ platform: 'asc' }, { ordering: 'asc' }],
        },
      },
    });

    return NextResponse.json(hydrated);
  } catch (error) {
    console.error('[dashboard/marketing/regenerate] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate marketing pack' },
      { status: 500 }
    );
  }
}
