import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  hasMarketingAccess,
  listMarketingSourceOptions,
  type MarketingSourceType,
} from '@/lib/marketing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isSupportedSourceType(value: string | null): value is Exclude<MarketingSourceType, 'manual'> {
  return value === 'job_posting' || value === 'article' || value === 'research_report' || value === 'strategy_document';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!hasMarketingAccess(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    if (!isSupportedSourceType(type)) {
      return NextResponse.json({ error: 'A valid source type is required' }, { status: 400 });
    }

    const options = await listMarketingSourceOptions(type, search);
    return NextResponse.json({ sourceType: type, options });
  } catch (error) {
    console.error('[dashboard/marketing/sources] GET error:', error);
    return NextResponse.json({ error: 'Failed to load marketing sources' }, { status: 500 });
  }
}
