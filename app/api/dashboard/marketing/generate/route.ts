import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  buildCaptionPack,
  buildMarketingSourceSnapshot,
  resolveCampaignTitle,
  hasMarketingAccess,
  type MarketingCampaignKind,
  type MarketingCaptionPack,
  type MarketingManualInput,
  type MarketingOverrideFields,
  type MarketingSourceType,
} from '@/lib/marketing';
import { renderAndStoreMarketingPack } from '@/lib/marketing-renderer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function resolveOrigin(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? 'http';

  if (!host) {
    throw new Error('Unable to resolve host for marketing asset generation.');
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
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const campaignId = typeof body.campaignId === 'string' ? body.campaignId : null;
    const sourceType = body.sourceType as MarketingSourceType;
    const sourceId = typeof body.sourceId === 'string' ? body.sourceId : null;
    const campaignKind = body.campaignKind as MarketingCampaignKind | undefined;
    const manualInput = (body.manualInput || null) as MarketingManualInput | null;
    const overrideFields = (body.overrideFields || null) as MarketingOverrideFields | null;
    const captionsOverride = (body.generatedCaptions || null) as MarketingCaptionPack | null;

    if (!sourceType) {
      return NextResponse.json({ error: 'sourceType is required' }, { status: 400 });
    }

    const snapshot = await buildMarketingSourceSnapshot({
      sourceType,
      sourceId,
      campaignKind,
      manualInput,
    });
    const captions = captionsOverride || buildCaptionPack(snapshot, overrideFields);
    const title = resolveCampaignTitle(snapshot, overrideFields);

    const campaign = campaignId
      ? await prisma.marketingCampaign.update({
          where: { id: campaignId },
          data: {
            sourceType: snapshot.sourceType,
            sourceId: snapshot.sourceId || null,
            campaignKind: snapshot.campaignKind,
            title,
            status: 'draft',
            sourceSnapshot: toJsonValue(snapshot),
            overrideFields: overrideFields ? toJsonValue(overrideFields) : undefined,
            generatedCaptions: toJsonValue(captions),
          },
        })
      : await prisma.marketingCampaign.create({
          data: {
            sourceType: snapshot.sourceType,
            sourceId: snapshot.sourceId || null,
            campaignKind: snapshot.campaignKind,
            title,
            status: 'draft',
            sourceSnapshot: toJsonValue(snapshot),
            overrideFields: overrideFields ? toJsonValue(overrideFields) : undefined,
            generatedCaptions: toJsonValue(captions),
            createdBy: userId,
          },
        });

    const rendered = await renderAndStoreMarketingPack({
      campaignId: campaign.id,
      snapshot,
      overrides: overrideFields,
      captions,
      origin: resolveOrigin(request),
    });

    await prisma.$transaction([
      prisma.marketingAsset.deleteMany({ where: { campaignId: campaign.id } }),
      prisma.marketingCampaign.update({
        where: { id: campaign.id },
        data: {
          title: resolveCampaignTitle(rendered.snapshot, overrideFields),
          status: 'generated',
          sourceSnapshot: toJsonValue(rendered.snapshot),
          overrideFields: overrideFields ? toJsonValue(overrideFields) : undefined,
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
    console.error('[dashboard/marketing/generate] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate marketing pack' },
      { status: 500 }
    );
  }
}
