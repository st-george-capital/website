import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ingestPrices, type IngestResult } from '@/lib/macro-engine/ingest/prices';
import {
  getResearchBacktestPayload,
  getResearchPriceCoverage,
  runAndSaveResearchBacktest,
  type ResearchBacktestPayload,
  type ResearchPriceCoveragePayload,
  type ResearchBacktestSummaryRow,
  type SavedResearchBacktestRun,
} from '@/lib/macro-engine/research/runStore';
import { getResearchExpressions, toPriceIngestUniverse } from '@/lib/macro-engine/research/universe';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export type {
  ResearchBacktestPayload,
  ResearchBacktestSummaryRow,
  ResearchPriceCoveragePayload,
  SavedResearchBacktestRun,
};

export type ResearchBacktestApiResponse = ResearchBacktestPayload & {
  ingestResult?: IngestResult;
};

function parseDateParam(value: string | null, fallback: string): Date {
  const raw = value ?? fallback;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${raw}`);
  return date;
}

function parseCsv(value: string | null): string[] | undefined {
  const parsed = value?.split(',').map((x) => x.trim()).filter(Boolean);
  return parsed && parsed.length > 0 ? parsed : undefined;
}

function parseHorizons(value: string | null): number[] | undefined {
  if (!value) return undefined;
  const horizons = value
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isFinite(x) && x > 0)
    .map((x) => Math.round(x));
  return horizons.length > 0 ? horizons : undefined;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await getResearchBacktestPayload();
  return NextResponse.json(payload satisfies ResearchBacktestPayload);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = typeof body.action === 'string'
      ? body.action
      : searchParams.get('action') ?? 'run-backtest';

    if (action === 'ingest-missing-prices') {
      const coverage = await getResearchPriceCoverage();
      const missingSet = new Set(coverage.missingTickers);
      const missingExpressions = getResearchExpressions().filter((expr) => missingSet.has(expr.ticker));
      const ingestResult = missingExpressions.length > 0
        ? await ingestPrices(toPriceIngestUniverse(missingExpressions), { dryRun: false })
        : { source: 'alpha-vantage', rowsUpserted: 0, errors: [], status: 'success' as const };
      const payload = await getResearchBacktestPayload();
      return NextResponse.json({ ...payload, ingestResult } satisfies ResearchBacktestApiResponse);
    }

    const start = typeof body.startDate === 'string' ? body.startDate : searchParams.get('start');
    const end = typeof body.endDate === 'string' ? body.endDate : searchParams.get('end');
    const pairIdsRaw = Array.isArray(body.pairIds)
      ? body.pairIds.filter((x: unknown): x is string => typeof x === 'string').join(',')
      : searchParams.get('pairs');
    const horizonsRaw = Array.isArray(body.horizons)
      ? body.horizons.filter((x: unknown): x is number => typeof x === 'number').join(',')
      : searchParams.get('horizons');
    const requestedPairIds = parseCsv(pairIdsRaw);
    const pairIds = requestedPairIds ?? (await getResearchPriceCoverage())
      .pairs
      .filter((pair) => pair.status === 'ready')
      .map((pair) => pair.pairId);

    if (pairIds.length === 0) {
      throw new Error('No research pairs have enough stored prices to backtest yet. Ingest missing prices first.');
    }

    const run = await runAndSaveResearchBacktest({
      startDate: parseDateParam(start, '2004-01-01'),
      endDate: parseDateParam(end, new Date().toISOString().slice(0, 10)),
      pairIds,
      horizons: parseHorizons(horizonsRaw),
    });

    const payload = await getResearchBacktestPayload();
    return NextResponse.json({
      ...payload,
      latestForCurrentConfig: run,
      needsRun: false,
    } satisfies ResearchBacktestPayload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
