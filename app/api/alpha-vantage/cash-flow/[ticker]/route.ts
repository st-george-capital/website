import { NextRequest, NextResponse } from 'next/server';
import { toNum } from '@/lib/utils';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const startTime = Date.now();
  const routeName = 'cash';
  const symbol = params.ticker.toUpperCase();
  const internalPath = new URL(request.url).pathname;

  try {
    // Alpha Vantage Cash Flow API
    const upstreamUrl = `https://www.alphavantage.co/query?function=CASH_FLOW&symbol=${symbol}&apikey=[REDACTED]`;

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
        error: 'Cash flow data not found',
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

      // Operating Activities
      operatingCashflow: toNum(report.operatingCashflow),
      cashflowFromInvestment: toNum(report.cashflowFromInvestment),
      cashflowFromFinancing: toNum(report.cashflowFromFinancing),
      proceedsFromRepaymentsOfShortTermDebt: toNum(report.proceedsFromRepaymentsOfShortTermDebt),
      paymentsForRepurchaseOfCommonStock: toNum(report.paymentsForRepurchaseOfCommonStock),
      paymentsForRepurchaseOfEquity: toNum(report.paymentsForRepurchaseOfEquity),
      paymentsForRepurchaseOfPreferredStock: toNum(report.paymentsForRepurchaseOfPreferredStock),
      dividendPayout: toNum(report.dividendPayout),
      dividendPayoutCommonStock: toNum(report.dividendPayoutCommonStock),
      dividendPayoutPreferredStock: toNum(report.dividendPayoutPreferredStock),
      proceedsFromIssuanceOfCommonStock: toNum(report.proceedsFromIssuanceOfCommonStock),
      proceedsFromIssuanceOfLongTermDebtAndCapitalSecuritiesNet: toNum(report.proceedsFromIssuanceOfLongTermDebtAndCapitalSecuritiesNet),
      proceedsFromIssuanceOfPreferredStock: toNum(report.proceedsFromIssuanceOfPreferredStock),
      proceedsFromRepurchaseOfEquity: toNum(report.proceedsFromRepurchaseOfEquity),
      proceedsFromSaleOfTreasuryStock: toNum(report.proceedsFromSaleOfTreasuryStock),
      changeInCashAndCashEquivalents: toNum(report.changeInCashAndCashEquivalents),
      changeInExchangeRate: toNum(report.changeInExchangeRate),
      netIncome: toNum(report.netIncome),

      // Investment Activities
      capitalExpenditures: toNum(report.capitalExpenditures),
      capitalExpenditureReported: toNum(report.capitalExpenditureReported),

      // Calculated Fields
      freeCashFlow: toNum(report.operatingCashflow) - toNum(report.capitalExpenditures)
    }));

    // Also include quarterly data (last 8 quarters)
    const quarterlyReports = data.quarterlyReports?.slice(0, 8).map((report: any) => ({
      fiscalDateEnding: report.fiscalDateEnding,
      reportedCurrency: report.reportedCurrency,

      // Operating Activities
      operatingCashflow: toNum(report.operatingCashflow),
      cashflowFromInvestment: toNum(report.cashflowFromInvestment),
      cashflowFromFinancing: toNum(report.cashflowFromFinancing),
      proceedsFromRepaymentsOfShortTermDebt: toNum(report.proceedsFromRepaymentsOfShortTermDebt),
      paymentsForRepurchaseOfCommonStock: toNum(report.paymentsForRepurchaseOfCommonStock),
      paymentsForRepurchaseOfEquity: toNum(report.paymentsForRepurchaseOfEquity),
      paymentsForRepurchaseOfPreferredStock: toNum(report.paymentsForRepurchaseOfPreferredStock),
      dividendPayout: toNum(report.dividendPayout),
      dividendPayoutCommonStock: toNum(report.dividendPayoutCommonStock),
      dividendPayoutPreferredStock: toNum(report.dividendPayoutPreferredStock),
      proceedsFromIssuanceOfCommonStock: toNum(report.proceedsFromIssuanceOfCommonStock),
      proceedsFromIssuanceOfLongTermDebtAndCapitalSecuritiesNet: toNum(report.proceedsFromIssuanceOfLongTermDebtAndCapitalSecuritiesNet),
      proceedsFromIssuanceOfPreferredStock: toNum(report.proceedsFromIssuanceOfPreferredStock),
      proceedsFromRepurchaseOfEquity: toNum(report.proceedsFromRepurchaseOfEquity),
      proceedsFromSaleOfTreasuryStock: toNum(report.proceedsFromSaleOfTreasuryStock),
      changeInCashAndCashEquivalents: toNum(report.changeInCashAndCashEquivalents),
      changeInExchangeRate: toNum(report.changeInExchangeRate),
      netIncome: toNum(report.netIncome),

      // Investment Activities
      capitalExpenditures: toNum(report.capitalExpenditures),
      capitalExpenditureReported: toNum(report.capitalExpenditureReported),

      // Calculated Fields
      freeCashFlow: toNum(report.operatingCashflow) - toNum(report.capitalExpenditures)
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
        error: 'Failed to fetch cash flow',
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