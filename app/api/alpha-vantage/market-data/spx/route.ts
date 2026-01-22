import { NextRequest, NextResponse } from 'next/server';
import { toNum } from '@/lib/utils';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';

export async function GET(request: NextRequest) {
  try {
    // Get S&P 500 data using SPY as proxy (^GSPC might work too)
    const ticker = 'SPY'; // SPDR S&P 500 ETF Trust

    // Get overview data for SPY
    const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const overviewResponse = await fetch(overviewUrl);
    const overviewData = await overviewResponse.json();

    if (overviewData.Note || overviewData['Error Message']) {
      return NextResponse.json({
        error: 'API limit reached or invalid symbol',
        details: overviewData.Note || overviewData['Error Message']
      }, { status: 429 });
    }

    if (!overviewData.Symbol) {
      return NextResponse.json({
        error: 'S&P 500 data not available'
      }, { status: 404 });
    }

    // Calculate earnings yield proxy: EBIT / Enterprise Value
    // Since we don't have direct earnings data, use EBITDA as proxy
    const ebitda = toNum(overviewData.EBITDA);
    const evToEbitda = toNum(overviewData.EVToEBITDA);

    let earningsYield = 0;
    if (ebitda > 0 && evToEbitda > 0) {
      const enterpriseValue = ebitda * evToEbitda;
      // Rough earnings estimate (EBITDA is not earnings, but provides a proxy)
      const estimatedEarnings = ebitda * 0.7; // Conservative estimate
      earningsYield = estimatedEarnings / enterpriseValue;
    }

    return NextResponse.json({
      earningsYield: earningsYield,
      ebitda: ebitda,
      evToEbitda: evToEbitda,
      symbol: overviewData.Symbol,
      source: 'Alpha Vantage SPY proxy',
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Alpha Vantage SPX API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch S&P 500 data' },
      { status: 500 }
    );
  }
}