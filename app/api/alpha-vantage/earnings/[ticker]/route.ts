import { NextRequest, NextResponse } from 'next/server';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const symbol = params.ticker.toUpperCase();

  try {
    const url = `https://www.alphavantage.co/query?function=EARNINGS&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.Note) {
      return NextResponse.json({
        error: 'API rate limit exceeded',
        details: 'Alpha Vantage free tier allows 25 requests per day.',
      }, { status: 429 });
    }

    if (data['Error Message']) {
      return NextResponse.json({
        error: 'Symbol not found',
        ticker: symbol
      }, { status: 404 });
    }

    if (!response.ok || !data.quarterlyEarnings) {
      return NextResponse.json({
        error: 'Failed to fetch earnings data',
        ticker: symbol
      }, { status: response.status || 500 });
    }

    // Return quarterly and annual earnings
    return NextResponse.json({
      symbol: data.symbol,
      quarterlyEarnings: data.quarterlyEarnings || [],
      annualEarnings: data.annualEarnings || []
    });

  } catch (error) {
    console.error('Error fetching earnings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings data' },
      { status: 500 }
    );
  }
}
