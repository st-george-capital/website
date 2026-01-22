import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // FRED API for 10-Year Treasury Constant Maturity Rate (DGS10)
    const fredApiKey = process.env.FRED_API_KEY;
    if (!fredApiKey) {
      // Fallback to a reasonable default 10Y treasury yield (around 4.5% as of 2024)
      return NextResponse.json({
        yield: 0.045, // 4.5%
        date: new Date().toISOString().split('T')[0],
        source: 'Fallback (FRED API key not configured)',
        note: 'Using fallback value. Configure FRED_API_KEY for live data.'
      });
    }

    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=${fredApiKey}&file_type=json&limit=1&sort_order=desc`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.observations || data.observations.length === 0) {
      return NextResponse.json({
        error: 'No treasury yield data available'
      }, { status: 404 });
    }

    const latestObservation = data.observations[0];
    const yieldValue = parseFloat(latestObservation.value);

    if (isNaN(yieldValue)) {
      return NextResponse.json({
        error: 'Invalid treasury yield data'
      }, { status: 500 });
    }

    return NextResponse.json({
      yield: yieldValue / 100, // Convert to decimal
      date: latestObservation.date,
      source: 'FRED DGS10'
    });

  } catch (error) {
    console.error('FRED Treasury API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch treasury yield' },
      { status: 500 }
    );
  }
}