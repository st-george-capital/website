import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  buildMarketingSourceSnapshot,
  hasMarketingAccess,
  resolveCampaignTitle,
  type MarketingCampaignKind,
  type MarketingCaptionPack,
  type MarketingManualInput,
  type MarketingOverrideFields,
  type MarketingSourceType,
} from '@/lib/marketing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeStatus(value: unknown) {
  return value === 'generated' ? 'generated' : 'draft';
}

function toJsonValue(value: unknown) {
  return value as Prisma.InputJsonValue;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!hasMarketingAccess(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get('sourceType');

    const campaigns = await prisma.marketingCampaign.findMany({
      where: sourceType ? { sourceType } : undefined,
      include: {
        assets: {
          orderBy: [{ platform: 'asc' }, { ordering: 'asc' }],
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 24,
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('[dashboard/marketing/campaigns] GET error:', error);
    return NextResponse.json({ error: 'Failed to load marketing campaigns' }, { status: 500 });
  }
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
    const generatedCaptions = (body.generatedCaptions || null) as MarketingCaptionPack | null;
    const status = normalizeStatus(body.status);

    if (!sourceType) {
      return NextResponse.json({ error: 'sourceType is required' }, { status: 400 });
    }

    const snapshot = await buildMarketingSourceSnapshot({
      sourceType,
      sourceId,
      campaignKind,
      manualInput,
    });

    const title = resolveCampaignTitle(snapshot, overrideFields);

    const basePayload = {
      sourceType: snapshot.sourceType,
      sourceId: snapshot.sourceId || null,
      campaignKind: snapshot.campaignKind,
      title,
      status,
      sourceSnapshot: toJsonValue(snapshot),
      overrideFields: overrideFields ? toJsonValue(overrideFields) : undefined,
      generatedCaptions: generatedCaptions ? toJsonValue(generatedCaptions) : undefined,
    };

    const campaign = campaignId
      ? await prisma.marketingCampaign.update({
          where: { id: campaignId },
          data: basePayload,
          include: {
            assets: {
              orderBy: [{ platform: 'asc' }, { ordering: 'asc' }],
            },
          },
        })
      : await prisma.marketingCampaign.create({
          data: {
            ...basePayload,
            createdBy: userId,
          },
          include: {
            assets: {
              orderBy: [{ platform: 'asc' }, { ordering: 'asc' }],
            },
          },
        });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('[dashboard/marketing/campaigns] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save marketing campaign' },
      { status: 500 }
    );
  }
}
