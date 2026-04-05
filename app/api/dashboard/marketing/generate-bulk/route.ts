import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  buildCaptionPack,
  buildMarketingSourceSnapshot,
  hasMarketingAccess,
  listMarketingSourceOptions,
  resolveCampaignTitle,
  type MarketingSourceType,
} from '@/lib/marketing';
import { launchPdfBrowser, renderAndStoreMarketingPack } from '@/lib/marketing-renderer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function resolveOrigin(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? 'http';
  if (!host) throw new Error('Unable to resolve host');
  return `${protocol}://${host}`;
}

function toJsonValue(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function rangeToDate(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case 'month': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    case 'year': {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    case 'all':
    default:
      return null;
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 });
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
    const sourceType = body.sourceType as MarketingSourceType;
    const range = typeof body.range === 'string' ? body.range : 'month';

    if (!sourceType || sourceType === 'manual') {
      return NextResponse.json({ error: 'sourceType must be a non-manual type' }, { status: 400 });
    }

    const sinceDate = rangeToDate(range);
    const origin = resolveOrigin(request);

    // Get all source items for this type
    const sources = await listMarketingSourceOptions(sourceType);

    // Filter by date range if applicable
    const filteredSources = sinceDate
      ? sources.filter((s) => {
          // Sources don't have createdAt directly, so we check existing campaigns
          // and generate for all that don't have a campaign yet in the range
          return true; // We'll filter via DB query below
        })
      : sources;

    // Find which sources already have a generated campaign
    const existingCampaigns = await prisma.marketingCampaign.findMany({
      where: {
        sourceType,
        status: 'generated',
        ...(sinceDate ? { createdAt: { gte: sinceDate } } : {}),
      },
      select: { sourceId: true },
    });
    const existingSourceIds = new Set(existingCampaigns.map((c) => c.sourceId));

    // Only generate for sources that don't already have a campaign in this range
    const toGenerate = filteredSources.filter((s) => !existingSourceIds.has(s.id));

    let generated = 0;
    let errors = 0;

    if (toGenerate.length === 0) {
      return NextResponse.json({
        total: 0,
        generated: 0,
        errors: 0,
        skipped: filteredSources.length,
      });
    }

    // Launch a single shared browser for all renders
    const browser = await launchPdfBrowser();

    try {
      for (const source of toGenerate) {
        try {
          const snapshot = await buildMarketingSourceSnapshot({
            sourceType,
            sourceId: source.id,
          });
          const captions = buildCaptionPack(snapshot);
          const title = resolveCampaignTitle(snapshot);

          const campaign = await prisma.marketingCampaign.create({
            data: {
              sourceType: snapshot.sourceType,
              sourceId: snapshot.sourceId || null,
              campaignKind: snapshot.campaignKind,
              title,
              status: 'draft',
              sourceSnapshot: toJsonValue(snapshot),
              generatedCaptions: toJsonValue(captions),
              createdBy: userId,
            },
          });

          const rendered = await renderAndStoreMarketingPack({
            campaignId: campaign.id,
            snapshot,
            captions,
            origin,
            sharedBrowser: browser,
          });

          await prisma.$transaction([
            prisma.marketingAsset.deleteMany({ where: { campaignId: campaign.id } }),
            prisma.marketingCampaign.update({
              where: { id: campaign.id },
              data: {
                title: resolveCampaignTitle(rendered.snapshot),
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

          generated++;
        } catch (err) {
          console.error(`[bulk-generate] Failed for source ${source.id}:`, err);
          errors++;
        }
      }
    } finally {
      await browser.close();
    }

    return NextResponse.json({
      total: toGenerate.length,
      generated,
      errors,
      skipped: filteredSources.length - toGenerate.length,
    });
  } catch (error) {
    console.error('[dashboard/marketing/generate-bulk] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bulk generation failed' },
      { status: 500 }
    );
  }
}
