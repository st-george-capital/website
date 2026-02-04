import { NextRequest, NextResponse } from 'next/server';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const startTime = Date.now();
  const symbol = params.ticker.toUpperCase();
  const internalPath = new URL(request.url).pathname;

  try {
    // Use TIME_SERIES_DAILY with outputsize=full to get enough history
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);
    const upstreamStatus = response.status;
    const data = await response.json();
    const elapsedMs = Date.now() - startTime;

    // Log the response
    console.log(JSON.stringify({
      routeName: 'time-series',
      symbol,
      internalPath,
      timestamp: new Date().toISOString(),
      upstreamStatus,
      upstreamTopKeys: Object.keys(data),
      hasNote: !!data.Note,
      hasErrorMessage: !!data['Error Message'],
      hasTimeSeries: !!data['Time Series (Daily)'],
      elapsedMs
    }));

    if (data.Note) {
      return NextResponse.json({
        error: 'API rate limit exceeded',
        details: 'Alpha Vantage free tier allows 25 requests per day.',
        note: data.Note
      }, { status: 429 });
    }

    if (data['Error Message']) {
      return NextResponse.json({
        error: 'Symbol not found',
        ticker: symbol,
        message: data['Error Message']
      }, { status: 404 });
    }

    const timeSeries = data['Time Series (Daily)'];
    if (!response.ok || !timeSeries) {
      console.error('Time series API error:', { upstreamStatus, hasTimeSeries: !!timeSeries, dataKeys: Object.keys(data) });
      return NextResponse.json({
        error: 'Failed to fetch time series data',
        ticker: symbol,
        details: 'No time series data in response'
      }, { status: response.status || 500 });
    }

    // Convert to array and sort by date (newest first)
    const priceData = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'])
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      symbol: data['Meta Data']['2. Symbol'],
      lastRefreshed: data['Meta Data']['3. Last Refreshed'],
      priceData: priceData.slice(0, 500) // Return last ~2 years of daily data
    });

  } catch (error) {
    console.error('Error fetching time series:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time series data' },
      { status: 500 }
    );
  }
}
