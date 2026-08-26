import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  delay,
  fetchAlphaVantageDailyHistory,
  fetchAlphaVantageEarningsEstimates,
  fetchAlphaVantageEarningsHistory,
  fetchAlphaVantageHistoricalOptions,
  fetchAlphaVantageQuote,
  fetchAlphaVantageSymbolSearch,
  ALPHA_VANTAGE_STAGGER_MS,
} from '@/lib/alpha-vantage';
import {
  buildEarningsRevisionsPayload,
  buildForwardEstimatesFromAv,
  buildOptionsFlowPayload,
  normalizeOptionContracts,
  type EquityPositioningResponse,
} from '@/lib/equity-positioning';

export const dynamic = 'force-dynamic';

type PositioningTab = 'revisions' | 'options';

function looksLikeTicker(value: string) {
  return /^[A-Za-z.\-]{1,8}$/.test(value.trim());
}

function pickBestSymbolMatch(matches: Awaited<ReturnType<typeof fetchAlphaVantageSymbolSearch>>) {
  if (!matches.length) return null;

  return [...matches].sort((left, right) => {
    const regionScore = (match: typeof left) => {
      if (/united states/i.test(match.region)) return 3;
      if (/canada/i.test(match.region)) return 2;
      return 1;
    };

    return regionScore(right) - regionScore(left) || right.matchScore - left.matchScore;
  })[0];
}

async function resolveEntity(rawSymbol: string | null, rawQuery: string | null) {
  const candidate = rawSymbol?.trim() || rawQuery?.trim() || '';

  if (!candidate) {
    return {
      query: null,
      symbol: null,
      companyName: null,
    };
  }

  if (looksLikeTicker(candidate)) {
    return {
      query: rawQuery?.trim() || rawSymbol?.trim() || null,
      symbol: candidate.toUpperCase(),
      companyName: candidate.toUpperCase(),
    };
  }

  const matches = await fetchAlphaVantageSymbolSearch(candidate);
  const bestMatch = pickBestSymbolMatch(matches);

  return {
    query: rawQuery?.trim() || rawSymbol?.trim() || null,
    symbol: bestMatch?.symbol || null,
    companyName: bestMatch?.name || null,
  };
}

function emptyPayload(
  tab: PositioningTab,
  entity: EquityPositioningResponse['entity']
): EquityPositioningResponse {
  return {
    tab,
    entity,
    emptyState: null,
    revisions: null,
    options: null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === 'visitor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = (searchParams.get('tab') === 'options' ? 'options' : 'revisions') as PositioningTab;
    const entity = await resolveEntity(searchParams.get('symbol'), searchParams.get('query'));

    if (!entity.symbol) {
      return NextResponse.json(
        {
          ...emptyPayload(tab, entity),
          emptyState: 'Enter a valid ticker or company name to analyze positioning.',
        },
        { status: 400 }
      );
    }

    if (tab === 'revisions') {
      const earningsHistory = await fetchAlphaVantageEarningsHistory(entity.symbol as string);
      await delay(ALPHA_VANTAGE_STAGGER_MS);

      const prices = await fetchAlphaVantageDailyHistory(entity.symbol as string, 'full');
      await delay(ALPHA_VANTAGE_STAGGER_MS);

      const estimatesRaw = await fetchAlphaVantageEarningsEstimates(entity.symbol as string);

      const forwardEstimates = buildForwardEstimatesFromAv(estimatesRaw as Record<string, unknown>);

      const revisions = buildEarningsRevisionsPayload({
        quarterlyEarnings: earningsHistory.quarterlyEarnings,
        prices,
        forwardEstimates,
      });

      const payload = emptyPayload(tab, entity);
      payload.revisions = revisions;
      payload.emptyState = revisions.earningsEvents.length
        ? null
        : 'No earnings history was returned for this ticker.';

      return NextResponse.json(payload);
    }

    const optionsRaw = await fetchAlphaVantageHistoricalOptions(entity.symbol as string);
    await delay(ALPHA_VANTAGE_STAGGER_MS);

    let quote: Awaited<ReturnType<typeof fetchAlphaVantageQuote>> | null = null;
    try {
      quote = await fetchAlphaVantageQuote(entity.symbol as string);
    } catch {
      quote = null;
    }

    const contracts = normalizeOptionContracts(optionsRaw.contracts);
    const options = buildOptionsFlowPayload(contracts, quote?.price ?? null);
    options.asOfDate = optionsRaw.asOfDate;

    const payload = emptyPayload(tab, entity);
    payload.options = options;
    payload.emptyState = contracts.length
      ? null
      : 'No options chain data was returned for this ticker.';

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load equity positioning data';
    console.error('[dashboard/equity-positioning] GET error:', error);

    if (message.includes('ALPHA_VANTAGE_API_KEY')) {
      return NextResponse.json({ error: 'ALPHA_VANTAGE_API_KEY is not configured' }, { status: 503 });
    }

    if (message.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Alpha Vantage rate limit reached. Please try again in a moment.' },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
