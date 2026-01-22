import { NextRequest, NextResponse } from 'next/server';
import { toNum } from '@/lib/utils';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const startTime = Date.now();
  const routeName = 'balance';
  const symbol = params.ticker.toUpperCase();
  const internalPath = new URL(request.url).pathname;

  try {
    // Alpha Vantage Balance Sheet API
    const upstreamUrl = `https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol=${symbol}&apikey=[REDACTED]`;

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
    else classification = 'ok_statement';

    // Log structured data
    console.log(JSON.stringify({
      routeName,
      symbol,
      internalPath,
      timestamp: new Date().toISOString(),
      internalStatus: classification === 'ok_statement' ? 200 : 404,
      upstreamUrl,
      upstreamStatus,
      upstreamTopKeys,
      hasNote: !!data.Note,
      hasInformation: !!data.Information,
      hasErrorMessage: !!data['Error Message'],
      payloadShape: {
        annualReportsCount: data.annualReports?.length || 0,
        quarterlyReportsCount: data.quarterlyReports?.length || 0
      },
      classification,
      elapsedMs,
      ...(classification !== 'ok_statement' && { upstreamPreview: JSON.stringify(data).substring(0, 200) })
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

    if (!data.annualReports || !Array.isArray(data.annualReports)) {
      return NextResponse.json({
        error: 'Balance sheet data not found',
        ticker: symbol,
        routeName,
        symbol,
        classification,
        upstreamStatus,
        upstreamTopKeys,
        message: 'No annualReports array found'
      }, { status: 404 });
    }

    // Transform annual reports to our format
    const annualReports = data.annualReports.slice(0, 5).map((report: any) => ({
      fiscalDateEnding: report.fiscalDateEnding,
      reportedCurrency: report.reportedCurrency,

      // Assets
      totalAssets: toNum(report.totalAssets),
      totalCurrentAssets: toNum(report.totalCurrentAssets),
      cashAndCashEquivalentsAtCarryingValue: toNum(report.cashAndCashEquivalentsAtCarryingValue),
      cashAndShortTermInvestments: toNum(report.cashAndShortTermInvestments),
      inventory: toNum(report.inventory),
      currentNetReceivables: toNum(report.currentNetReceivables),
      totalNonCurrentAssets: toNum(report.totalNonCurrentAssets),
      propertyPlantEquipment: toNum(report.propertyPlantEquipment),
      accumulatedDepreciationAmortizationPPE: toNum(report.accumulatedDepreciationAmortizationPPE),
      intangibleAssets: toNum(report.intangibleAssets),
      intangibleAssetsExcludingGoodwill: toNum(report.intangibleAssetsExcludingGoodwill),
      goodwill: toNum(report.goodwill),
      investments: toNum(report.investments),
      longTermInvestments: toNum(report.longTermInvestments),
      shortTermInvestments: toNum(report.shortTermInvestments),
      otherCurrentAssets: toNum(report.otherCurrentAssets),
      otherNonCurrentAssets: toNum(report.otherNonCurrentAssets),

      // Liabilities & Equity
      totalLiabilities: toNum(report.totalLiabilities),
      totalCurrentLiabilities: toNum(report.totalCurrentLiabilities),
      currentAccountsPayable: toNum(report.currentAccountsPayable),
      deferredRevenue: toNum(report.deferredRevenue),
      currentDebt: toNum(report.currentDebt),
      shortTermDebt: toNum(report.shortTermDebt),
      totalNonCurrentLiabilities: toNum(report.totalNonCurrentLiabilities),
      capitalLeaseObligations: toNum(report.capitalLeaseObligations),
      longTermDebt: toNum(report.longTermDebt),
      currentLongTermDebt: toNum(report.currentLongTermDebt),
      longTermDebtNoncurrent: toNum(report.longTermDebtNoncurrent),
      shortLongTermDebtTotal: toNum(report.shortLongTermDebtTotal),
      otherCurrentLiabilities: toNum(report.otherCurrentLiabilities),
      otherNonCurrentLiabilities: toNum(report.otherNonCurrentLiabilities),
      totalShareholderEquity: toNum(report.totalShareholderEquity),
      treasuryStock: toNum(report.treasuryStock),
      retainedEarnings: toNum(report.retainedEarnings),
      commonStock: toNum(report.commonStock),
      commonStockSharesOutstanding: toNum(report.commonStockSharesOutstanding)
    }));

    // Also include quarterly data (last 8 quarters)
    const quarterlyReports = data.quarterlyReports?.slice(0, 8).map((report: any) => ({
      fiscalDateEnding: report.fiscalDateEnding,
      reportedCurrency: report.reportedCurrency,

      // Assets
      totalAssets: toNum(report.totalAssets),
      totalCurrentAssets: toNum(report.totalCurrentAssets),
      cashAndCashEquivalentsAtCarryingValue: toNum(report.cashAndCashEquivalentsAtCarryingValue),
      cashAndShortTermInvestments: toNum(report.cashAndShortTermInvestments),
      inventory: toNum(report.inventory),
      currentNetReceivables: toNum(report.currentNetReceivables),
      totalNonCurrentAssets: toNum(report.totalNonCurrentAssets),
      propertyPlantEquipment: toNum(report.propertyPlantEquipment),
      accumulatedDepreciationAmortizationPPE: toNum(report.accumulatedDepreciationAmortizationPPE),
      intangibleAssets: toNum(report.intangibleAssets),
      intangibleAssetsExcludingGoodwill: toNum(report.intangibleAssetsExcludingGoodwill),
      goodwill: toNum(report.goodwill),
      investments: toNum(report.investments),
      longTermInvestments: toNum(report.longTermInvestments),
      shortTermInvestments: toNum(report.shortTermInvestments),
      otherCurrentAssets: toNum(report.otherCurrentAssets),
      otherNonCurrentAssets: toNum(report.otherNonCurrentAssets),

      // Liabilities & Equity
      totalLiabilities: toNum(report.totalLiabilities),
      totalCurrentLiabilities: toNum(report.totalCurrentLiabilities),
      currentAccountsPayable: toNum(report.currentAccountsPayable),
      deferredRevenue: toNum(report.deferredRevenue),
      currentDebt: toNum(report.currentDebt),
      shortTermDebt: toNum(report.shortTermDebt),
      totalNonCurrentLiabilities: toNum(report.totalNonCurrentLiabilities),
      capitalLeaseObligations: toNum(report.capitalLeaseObligations),
      longTermDebt: toNum(report.longTermDebt),
      currentLongTermDebt: toNum(report.currentLongTermDebt),
      longTermDebtNoncurrent: toNum(report.longTermDebtNoncurrent),
      shortLongTermDebtTotal: toNum(report.shortLongTermDebtTotal),
      otherCurrentLiabilities: toNum(report.otherCurrentLiabilities),
      otherNonCurrentLiabilities: toNum(report.otherNonCurrentLiabilities),
      totalShareholderEquity: toNum(report.totalShareholderEquity),
      treasuryStock: toNum(report.treasuryStock),
      retainedEarnings: toNum(report.retainedEarnings),
      commonStock: toNum(report.commonStock),
      commonStockSharesOutstanding: toNum(report.commonStockSharesOutstanding)
    })) || [];

    return NextResponse.json({
      symbol: data.symbol,
      annualReports,
      quarterlyReports
    });

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
        error: 'Failed to fetch balance sheet',
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