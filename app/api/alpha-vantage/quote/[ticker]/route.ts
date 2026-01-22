import { NextRequest, NextResponse } from 'next/server';
import { toNum } from '@/lib/utils';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const startTime = Date.now();
  const routeName = 'quote';
  const symbol = params.ticker.toUpperCase();
  const internalPath = new URL(request.url).pathname;
  const upstreamUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=[REDACTED]`;

  try {

    const response = await fetch(upstreamUrl.replace('[REDACTED]', ALPHA_VANTAGE_API_KEY));
    const upstreamStatus = response.status;
    const data = await response.json();
    const upstreamTopKeys = Object.keys(data);
    const elapsedMs = Date.now() - startTime;

    // Classify response for quote route
    let classification: string;
    if (data.Note) classification = 'rate_limit';
    else if (data.Information) classification = 'premium';
    else if (data['Error Message']) classification = 'invalid_request';
    else if (data['Global Quote'] && (!data['Global Quote']['05. price'] || data['Global Quote']['05. price'] === 'None')) classification = 'empty_quote';
    else classification = 'ok_quote';

    // Log structured data
    console.log(JSON.stringify({
      routeName,
      symbol,
      internalPath,
      timestamp: new Date().toISOString(),
      internalStatus: classification === 'ok_quote' ? 200 : 404,
      upstreamUrl,
      upstreamStatus,
      upstreamTopKeys,
      hasNote: !!data.Note,
      hasInformation: !!data.Information,
      hasErrorMessage: !!data['Error Message'],
      payloadShape: {
        hasGlobalQuote: !!data['Global Quote'],
        globalQuoteKeysCount: data['Global Quote'] ? Object.keys(data['Global Quote']).length : 0,
        priceValue: data['Global Quote']?.['05. price'] || null
      },
      classification,
      elapsedMs,
      ...(classification !== 'ok_quote' && { upstreamPreview: JSON.stringify(data).substring(0, 200) })
    }));

    if (data.Note) {
      return NextResponse.json({
        error: 'API rate limit exceeded',
        details: 'Alpha Vantage free tier allows 25 requests per day. Please try again tomorrow.',
        note: data.Note,
        routeName,
        symbol,
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
        symbol,
        classification,
        upstreamStatus,
        upstreamTopKeys,
        message: data['Error Message']
      }, { status: 400 });
    }

    const quote = data['Global Quote'];
    if (!quote || !quote['01. symbol']) {
      return NextResponse.json({
        error: 'Quote not found',
        ticker: symbol,
        routeName,
        symbol,
        classification,
        upstreamStatus,
        upstreamTopKeys,
        message: 'No Global Quote data returned'
      }, { status: 404 });
    }

    // Transform to our format
    const quoteData = {
      symbol: quote['01. symbol'],
      open: toNum(quote['02. open']) || null,
      high: toNum(quote['03. high']) || null,
      low: toNum(quote['04. low']) || null,
      price: toNum(quote['05. price']) || null,
      volume: toNum(quote['06. volume']) || null,
      latestTradingDay: quote['07. latest trading day'],
      previousClose: toNum(quote['08. previous close']) || null,
      change: toNum(quote['09. change']) || null,
      changePercent: quote['10. change percent']
    };

    return NextResponse.json(quoteData);

  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.log(JSON.stringify({
      routeName,
      symbol,
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
        error: 'Failed to fetch quote',
        routeName,
        symbol,
        classification: 'parse_error',
        upstreamStatus: null,
        upstreamTopKeys: [],
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}