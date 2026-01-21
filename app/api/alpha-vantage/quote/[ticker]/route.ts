import { NextRequest, NextResponse } from 'next/server';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase();

    // Alpha Vantage Global Quote API
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.Note || data['Error Message']) {
      return NextResponse.json({
        error: 'API limit reached or invalid symbol',
        details: data.Note || data['Error Message']
      }, { status: 429 });
    }

    const quote = data['Global Quote'];
    if (!quote || !quote['01. symbol']) {
      return NextResponse.json({
        error: 'Quote not found',
        ticker
      }, { status: 404 });
    }

    // Transform to our format
    const quoteData = {
      symbol: quote['01. symbol'],
      open: parseFloat(quote['02. open']) || null,
      high: parseFloat(quote['03. high']) || null,
      low: parseFloat(quote['04. low']) || null,
      price: parseFloat(quote['05. price']) || null,
      volume: parseFloat(quote['06. volume']) || null,
      latestTradingDay: quote['07. latest trading day'],
      previousClose: parseFloat(quote['08. previous close']) || null,
      change: parseFloat(quote['09. change']) || null,
      changePercent: quote['10. change percent']
    };

    return NextResponse.json(quoteData);

  } catch (error) {
    console.error('Alpha Vantage quote error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    );
  }
}