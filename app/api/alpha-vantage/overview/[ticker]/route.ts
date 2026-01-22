import { NextRequest, NextResponse } from 'next/server';
import { toNum } from '@/lib/utils';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const startTime = Date.now();
  const routeName = 'overview';
  const symbol = params.ticker.toUpperCase();
  const internalPath = new URL(request.url).pathname;
  const upstreamUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=[REDACTED]`;

  try {

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
    else if (!data.Symbol && !data.Name) classification = 'empty_overview';
    else classification = 'ok_overview';

    // Log structured data
    console.log(JSON.stringify({
      routeName,
      symbol,
      internalPath,
      timestamp: new Date().toISOString(),
      internalStatus: classification === 'ok_overview' ? 200 : 404,
      upstreamUrl,
      upstreamStatus,
      upstreamTopKeys,
      hasNote: !!data.Note,
      hasInformation: !!data.Information,
      hasErrorMessage: !!data['Error Message'],
      payloadShape: {
        hasSymbol: !!data.Symbol,
        hasName: !!data.Name
      },
      classification,
      elapsedMs,
      ...(classification !== 'ok_overview' && { upstreamPreview: JSON.stringify(data).substring(0, 200) })
    }));

    // Check if response is empty or invalid
    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json({
        error: 'Empty response',
        details: `No data returned for ticker ${symbol}. Please check the symbol.`,
        ticker: symbol,
        routeName,
        symbol,
        classification,
        upstreamStatus,
        upstreamTopKeys,
        message: data.Note || data.Information || data['Error Message'] || 'Empty response'
      }, { status: 404 });
    }

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

    if (!response.ok) {
      return NextResponse.json({
        error: 'HTTP error',
        details: `Status: ${response.status}`,
        url: upstreamUrl,
        routeName,
        symbol,
        classification,
        upstreamStatus,
        upstreamTopKeys,
        message: `HTTP ${response.status}`
      }, { status: response.status });
    }

    if (data['Error Message'] || !data.Symbol) {
      return NextResponse.json({
        error: 'Symbol not found',
        ticker: symbol,
        routeName,
        symbol,
        classification,
        upstreamStatus,
        upstreamTopKeys,
        message: data['Error Message'] || 'Symbol not found'
      }, { status: 404 });
    }

    // Check if response is empty or invalid
    if (!data || Object.keys(data).length === 0) {
      console.log('Empty response from Alpha Vantage');
      return NextResponse.json({
        error: 'Empty response',
        details: `No data returned for ticker ${symbol}. Please check the symbol.`,
        ticker: symbol
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
      marketCapitalization: toNum(data.MarketCapitalization),
      ebitda: toNum(data.EBITDA),
      peRatio: toNum(data.PERatio),
      pegRatio: toNum(data.PEGRatio),
      bookValue: toNum(data.BookValue),
      dividendPerShare: toNum(data.DividendPerShare),
      dividendYield: toNum(data.DividendYield),
      eps: toNum(data.EPS),
      revenuePerShareTTM: toNum(data.RevenuePerShareTTM),
      profitMargin: toNum(data.ProfitMargin),
      operatingMarginTTM: toNum(data.OperatingMarginTTM),
      returnOnAssetsTTM: toNum(data.ReturnOnAssetsTTM),
      returnOnEquityTTM: toNum(data.ReturnOnEquityTTM),
      revenueTTM: toNum(data.RevenueTTM),
      grossProfitTTM: toNum(data.GrossProfitTTM),
      dilutedEPSTTM: toNum(data.DilutedEPSTTM),
      quarterlyEarningsGrowthYOY: toNum(data.QuarterlyEarningsGrowthYOY),
      quarterlyRevenueGrowthYOY: toNum(data.QuarterlyRevenueGrowthYOY),
      analystTargetPrice: toNum(data.AnalystTargetPrice),
      trailingPE: toNum(data.TrailingPE),
      forwardPE: toNum(data.ForwardPE),
      priceToSalesRatioTTM: toNum(data.PriceToSalesRatioTTM),
      priceToBookRatio: toNum(data.PriceToBookRatio),
      evToRevenue: toNum(data.EVToRevenue),
      evToEBITDA: toNum(data.EVToEBITDA),
      beta: toNum(data.Beta),
      week52High: toNum(data['52WeekHigh']),
      week52Low: toNum(data['52WeekLow']),
      day50MovingAverage: toNum(data['50DayMovingAverage']),
      day200MovingAverage: toNum(data['200DayMovingAverage']),
      sharesOutstanding: toNum(data.SharesOutstanding),
      dividendDate: data.DividendDate,
      exDividendDate: data.ExDividendDate
    };

    return NextResponse.json(companyData);

  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.log(JSON.stringify({
      routeName,
      symbol,
      internalPath,
      timestamp: new Date().toISOString(),
      internalStatus: 500,
      upstreamUrl: `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=[REDACTED]`,
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
        error: 'Failed to fetch company overview',
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