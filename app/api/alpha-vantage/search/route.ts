import { NextRequest, NextResponse } from 'next/server';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const routeName = 'search';
  const internalPath = new URL(request.url).pathname;
  const { searchParams } = new URL(request.url);
  const keywords = searchParams.get('q') || '';

  let upstreamUrl: string;

  try {
    if (!keywords) {
      return NextResponse.json({
        error: 'Query parameter required',
        routeName,
        keywords,
        classification: 'invalid_request',
        upstreamStatus: null,
        upstreamTopKeys: [],
        message: 'Missing keywords parameter'
      }, { status: 400 });
    }

    // Alpha Vantage Symbol Search API
    upstreamUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keywords)}&apikey=[REDACTED]`;

    const response = await fetch(upstreamUrl.replace('[REDACTED]', ALPHA_VANTAGE_API_KEY));
    const upstreamStatus = response.status;
    const data = await response.json();
    const upstreamTopKeys = Object.keys(data);
    const elapsedMs = Date.now() - startTime;

    // Classify response
    let classification: string;
    if (data.Note) classification = 'rate_limit';
    else if (data.Information) classification = 'premium';
    else if (data['Error Message']) classification = 'invalid_request';
    else classification = 'ok_search';

    // Log structured data
    console.log(JSON.stringify({
      routeName,
      keywords,
      internalPath,
      timestamp: new Date().toISOString(),
      internalStatus: classification === 'ok_search' ? 200 : 400,
      upstreamUrl,
      upstreamStatus,
      upstreamTopKeys,
      hasNote: !!data.Note,
      hasInformation: !!data.Information,
      hasErrorMessage: !!data['Error Message'],
      payloadShape: {
        bestMatchesCount: data.bestMatches?.length || 0,
        topMatches: data.bestMatches?.slice(0, 3).map((match: any) => ({
          symbol: match['1. symbol'],
          region: match['4. region'],
          currency: match['8. currency'],
          matchScore: match['9. matchScore']
        })) || []
      },
      classification,
      elapsedMs,
      ...(classification !== 'ok_search' && { upstreamPreview: JSON.stringify(data).substring(0, 200) })
    }));

    if (data.Note) {
      return NextResponse.json({
        error: 'API rate limit exceeded',
        details: 'Alpha Vantage free tier allows 25 requests per day. Please try again tomorrow.',
        note: data.Note,
        routeName,
        keywords,
        classification,
        upstreamStatus,
        upstreamTopKeys,
        message: data.Note
      }, { status: 429 });
    }

    if (data['Error Message']) {
      return NextResponse.json({
        error: 'API error',
        details: data['Error Message'],
        routeName,
        keywords,
        classification,
        upstreamStatus,
        upstreamTopKeys,
        message: data['Error Message']
      }, { status: 400 });
    }

    if (!response.ok) {
      return NextResponse.json({
        error: 'HTTP error',
        details: `Status: ${response.status}`,
        routeName,
        keywords,
        classification,
        upstreamStatus,
        upstreamTopKeys,
        message: `HTTP ${response.status}`
      }, { status: response.status });
    }

    // Transform Alpha Vantage response to our format
    const results = data.bestMatches?.map((match: any) => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      type: match['3. type'],
      region: match['4. region'],
      marketOpen: match['5. marketOpen'],
      marketClose: match['6. marketClose'],
      timezone: match['7. timezone'],
      currency: match['8. currency'],
      matchScore: match['9. matchScore']
    })) || [];

    return NextResponse.json({
      query: keywords,
      results: results.slice(0, 10), // Limit to top 10 results
      count: results.length
    });

  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.log(JSON.stringify({
      routeName,
      keywords,
      internalPath,
      timestamp: new Date().toISOString(),
      internalStatus: 500,
      upstreamUrl,
      upstreamStatus: null,
      upstreamTopKeys: [],
      hasNote: false,
      hasInformation: false,
      hasErrorMessage: false,
      payloadShape: { error: true },
      classification: 'parse_error',
      elapsedMs,
      error: error instanceof Error ? error.message : 'Unknown error'
    }));

    return NextResponse.json(
      {
        error: 'Failed to search symbols',
        routeName,
        keywords,
        classification: 'parse_error',
        upstreamStatus: null,
        upstreamTopKeys: [],
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}