import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  fetchAlphaVantageDailyHistory,
  fetchAlphaVantageNewsSentiment,
  fetchAlphaVantageQuote,
  fetchAlphaVantageSymbolSearch,
} from '@/lib/alpha-vantage';
import {
  buildPriceContext,
  buildSentimentPayload,
  buildTimeFrom,
  looksLikeTicker,
  normalizeSentimentArticles,
} from '@/lib/sentiment';

export const dynamic = 'force-dynamic';

function normalizeHorizon(raw: string | null) {
  if (raw === '3' || raw === '30') return Number(raw);
  return 7;
}

function pickBestSymbolMatch(matches: Awaited<ReturnType<typeof fetchAlphaVantageSymbolSearch>>) {
  if (!matches.length) return null;

  const sorted = [...matches].sort((left, right) => {
    const regionScore = (match: typeof left) => {
      if (/united states/i.test(match.region)) return 3;
      if (/canada/i.test(match.region)) return 2;
      return 1;
    };

    return (
      regionScore(right) - regionScore(left) ||
      right.matchScore - left.matchScore
    );
  });

  return sorted[0];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === 'visitor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim() || '';
    const keyword = searchParams.get('keyword')?.trim() || '';
    const horizonDays = normalizeHorizon(searchParams.get('horizon'));

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    let symbol: string | null = null;
    let companyName: string | null = null;

    if (looksLikeTicker(query)) {
      symbol = query.toUpperCase();
      companyName = query.toUpperCase();
    } else {
      const matches = await fetchAlphaVantageSymbolSearch(query);
      const bestMatch = pickBestSymbolMatch(matches);
      if (bestMatch) {
        symbol = bestMatch.symbol;
        companyName = bestMatch.name;
      }
    }

    const keywords = keyword
      ? keyword
      : symbol
        ? ''
        : query;

    const rawArticles = await fetchAlphaVantageNewsSentiment({
      tickers: symbol || undefined,
      keywords: keywords || undefined,
      timeFrom: buildTimeFrom(horizonDays),
      sort: 'LATEST',
      limit: 40,
    });

    const articles = normalizeSentimentArticles(rawArticles, symbol);

    const [quoteResult, historyResult] = symbol
      ? await Promise.allSettled([
          fetchAlphaVantageQuote(symbol),
          fetchAlphaVantageDailyHistory(symbol, 'compact'),
        ])
      : [null, null];

    const priceContext = buildPriceContext(
      quoteResult && quoteResult.status === 'fulfilled' ? quoteResult.value.price : null,
      quoteResult && quoteResult.status === 'fulfilled' ? quoteResult.value.changePercent : null,
      historyResult && historyResult.status === 'fulfilled' ? historyResult.value : null,
      buildSentimentPayload({
        query,
        keyword: keyword || null,
        symbol,
        companyName,
        articles,
        priceContext: null,
        usedTickerFilter: Boolean(symbol),
        usedKeywordFilter: Boolean(keywords),
      }).snapshot.overallSentimentLabel
    );

    const payload = buildSentimentPayload({
      query,
      keyword: keyword || null,
      symbol,
      companyName,
      articles,
      priceContext,
      usedTickerFilter: Boolean(symbol),
      usedKeywordFilter: Boolean(keywords),
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sentiment data';
    console.error('[dashboard/sentiment] GET error:', error);

    if (message.includes('ALPHA_VANTAGE_API_KEY')) {
      return NextResponse.json({ error: 'ALPHA_VANTAGE_API_KEY is not configured' }, { status: 503 });
    }

    if (message.includes('rate limit')) {
      return NextResponse.json({ error: 'Alpha Vantage rate limit reached. Please try again in a moment.' }, { status: 429 });
    }

    return NextResponse.json({ error: message || 'Failed to fetch sentiment data' }, { status: 500 });
  }
}
