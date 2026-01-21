import { NextRequest, NextResponse } from 'next/server';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  console.log('Alpha Vantage Overview API called for ticker:', params.ticker);
  try {
    const ticker = params.ticker.toUpperCase();
    console.log('Processing ticker:', ticker);

    // Alpha Vantage Company Overview API
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    console.log('Overview API URL:', url);

    const response = await fetch(url);
    console.log('Overview API response status:', response.status);
    console.log('Overview API response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('Overview API raw response:', data);
    console.log('Response keys:', Object.keys(data));

    // Check if response is empty or invalid
    if (!data || Object.keys(data).length === 0) {
      console.log('Empty response from Alpha Vantage');
      return NextResponse.json({
        error: 'Empty response',
        details: `No data returned for ticker ${ticker}. Please check the symbol.`,
        ticker: ticker
      }, { status: 404 });
    }

    if (data.Note) {
      console.log('Alpha Vantage rate limit hit:', data.Note);
      return NextResponse.json({
        error: 'API rate limit exceeded',
        details: 'Alpha Vantage free tier allows 25 requests per day. Please try again tomorrow.',
        note: data.Note
      }, { status: 429 });
    }

    if (data['Error Message']) {
      console.log('Alpha Vantage API error:', data['Error Message']);
      return NextResponse.json({
        error: 'API error',
        details: data['Error Message']
      }, { status: 400 });
    }

    if (!response.ok) {
      console.log('HTTP error from Alpha Vantage:', response.status);
      return NextResponse.json({
        error: 'HTTP error',
        details: `Status: ${response.status}`,
        url: url
      }, { status: response.status });
    }

    if (data['Error Message'] || !data.Symbol) {
      return NextResponse.json({
        error: 'Symbol not found',
        ticker
      }, { status: 404 });
    }

    // Transform to our format
    const companyData = {
      symbol: data.Symbol,
      name: data.Name,
      description: data.Description,
      exchange: data.Exchange,
      currency: data.Currency,
      country: data.Country,
      sector: data.Sector,
      industry: data.Industry,
      employees: parseInt(data.FullTimeEmployees) || null,
      fiscalYearEnd: data.FiscalYearEnd,
      latestQuarter: data.LatestQuarter,
      marketCapitalization: parseFloat(data.MarketCapitalization) || null,
      ebitda: parseFloat(data.EBITDA) || null,
      peRatio: parseFloat(data.PERatio) || null,
      pegRatio: parseFloat(data.PEGRatio) || null,
      bookValue: parseFloat(data.BookValue) || null,
      dividendPerShare: parseFloat(data.DividendPerShare) || null,
      dividendYield: parseFloat(data.DividendYield) || null,
      eps: parseFloat(data.EPS) || null,
      revenuePerShareTTM: parseFloat(data.RevenuePerShareTTM) || null,
      profitMargin: parseFloat(data.ProfitMargin) || null,
      operatingMarginTTM: parseFloat(data.OperatingMarginTTM) || null,
      returnOnAssetsTTM: parseFloat(data.ReturnOnAssetsTTM) || null,
      returnOnEquityTTM: parseFloat(data.ReturnOnEquityTTM) || null,
      revenueTTM: parseFloat(data.RevenueTTM) || null,
      grossProfitTTM: parseFloat(data.GrossProfitTTM) || null,
      dilutedEPSTTM: parseFloat(data.DilutedEPSTTM) || null,
      quarterlyEarningsGrowthYOY: parseFloat(data.QuarterlyEarningsGrowthYOY) || null,
      quarterlyRevenueGrowthYOY: parseFloat(data.QuarterlyRevenueGrowthYOY) || null,
      analystTargetPrice: parseFloat(data.AnalystTargetPrice) || null,
      trailingPE: parseFloat(data.TrailingPE) || null,
      forwardPE: parseFloat(data.ForwardPE) || null,
      priceToSalesRatioTTM: parseFloat(data.PriceToSalesRatioTTM) || null,
      priceToBookRatio: parseFloat(data.PriceToBookRatio) || null,
      evToRevenue: parseFloat(data.EVToRevenue) || null,
      evToEBITDA: parseFloat(data.EVToEBITDA) || null,
      beta: parseFloat(data.Beta) || null,
      week52High: parseFloat(data['52WeekHigh']) || null,
      week52Low: parseFloat(data['52WeekLow']) || null,
      day50MovingAverage: parseFloat(data['50DayMovingAverage']) || null,
      day200MovingAverage: parseFloat(data['200DayMovingAverage']) || null,
      sharesOutstanding: parseFloat(data.SharesOutstanding) || null,
      dividendDate: data.DividendDate,
      exDividendDate: data.ExDividendDate
    };

    return NextResponse.json(companyData);

  } catch (error) {
    console.error('Alpha Vantage overview error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company overview' },
      { status: 500 }
    );
  }
}