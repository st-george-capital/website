import { NextRequest, NextResponse } from 'next/server';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase();

    // Alpha Vantage Cash Flow API
    const url = `https://www.alphavantage.co/query?function=CASH_FLOW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.Note || data['Error Message']) {
      return NextResponse.json({
        error: 'API limit reached or invalid symbol',
        details: data.Note || data['Error Message']
      }, { status: 429 });
    }

    if (!data.annualReports || !Array.isArray(data.annualReports)) {
      return NextResponse.json({
        error: 'Cash flow data not found',
        ticker
      }, { status: 404 });
    }

    // Transform annual reports to our format
    const annualReports = data.annualReports.slice(0, 5).map((report: any) => ({
      fiscalDateEnding: report.fiscalDateEnding,
      reportedCurrency: report.reportedCurrency,

      // Operating Activities
      operatingCashflow: parseFloat(report.operatingCashflow) || 0,
      cashflowFromInvestment: parseFloat(report.cashflowFromInvestment) || 0,
      cashflowFromFinancing: parseFloat(report.cashflowFromFinancing) || 0,
      proceedsFromRepaymentsOfShortTermDebt: parseFloat(report.proceedsFromRepaymentsOfShortTermDebt) || 0,
      paymentsForRepurchaseOfCommonStock: parseFloat(report.paymentsForRepurchaseOfCommonStock) || 0,
      paymentsForRepurchaseOfEquity: parseFloat(report.paymentsForRepurchaseOfEquity) || 0,
      paymentsForRepurchaseOfPreferredStock: parseFloat(report.paymentsForRepurchaseOfPreferredStock) || 0,
      dividendPayout: parseFloat(report.dividendPayout) || 0,
      dividendPayoutCommonStock: parseFloat(report.dividendPayoutCommonStock) || 0,
      dividendPayoutPreferredStock: parseFloat(report.dividendPayoutPreferredStock) || 0,
      proceedsFromIssuanceOfCommonStock: parseFloat(report.proceedsFromIssuanceOfCommonStock) || 0,
      proceedsFromIssuanceOfLongTermDebtAndCapitalSecuritiesNet: parseFloat(report.proceedsFromIssuanceOfLongTermDebtAndCapitalSecuritiesNet) || 0,
      proceedsFromIssuanceOfPreferredStock: parseFloat(report.proceedsFromIssuanceOfPreferredStock) || 0,
      proceedsFromRepurchaseOfEquity: parseFloat(report.proceedsFromRepurchaseOfEquity) || 0,
      proceedsFromSaleOfTreasuryStock: parseFloat(report.proceedsFromSaleOfTreasuryStock) || 0,
      changeInCashAndCashEquivalents: parseFloat(report.changeInCashAndCashEquivalents) || 0,
      changeInExchangeRate: parseFloat(report.changeInExchangeRate) || 0,
      netIncome: parseFloat(report.netIncome) || 0,

      // Investment Activities
      capitalExpenditures: parseFloat(report.capitalExpenditures) || 0,
      capitalExpenditureReported: parseFloat(report.capitalExpenditureReported) || 0,

      // Calculated Fields
      freeCashFlow: (parseFloat(report.operatingCashflow) || 0) - (parseFloat(report.capitalExpenditures) || 0)
    }));

    // Also include quarterly data (last 8 quarters)
    const quarterlyReports = data.quarterlyReports?.slice(0, 8).map((report: any) => ({
      fiscalDateEnding: report.fiscalDateEnding,
      reportedCurrency: report.reportedCurrency,

      // Operating Activities
      operatingCashflow: parseFloat(report.operatingCashflow) || 0,
      cashflowFromInvestment: parseFloat(report.cashflowFromInvestment) || 0,
      cashflowFromFinancing: parseFloat(report.cashflowFromFinancing) || 0,
      proceedsFromRepaymentsOfShortTermDebt: parseFloat(report.proceedsFromRepaymentsOfShortTermDebt) || 0,
      paymentsForRepurchaseOfCommonStock: parseFloat(report.paymentsForRepurchaseOfCommonStock) || 0,
      paymentsForRepurchaseOfEquity: parseFloat(report.paymentsForRepurchaseOfEquity) || 0,
      paymentsForRepurchaseOfPreferredStock: parseFloat(report.paymentsForRepurchaseOfPreferredStock) || 0,
      dividendPayout: parseFloat(report.dividendPayout) || 0,
      dividendPayoutCommonStock: parseFloat(report.dividendPayoutCommonStock) || 0,
      dividendPayoutPreferredStock: parseFloat(report.dividendPayoutPreferredStock) || 0,
      proceedsFromIssuanceOfCommonStock: parseFloat(report.proceedsFromIssuanceOfCommonStock) || 0,
      proceedsFromIssuanceOfLongTermDebtAndCapitalSecuritiesNet: parseFloat(report.proceedsFromIssuanceOfLongTermDebtAndCapitalSecuritiesNet) || 0,
      proceedsFromIssuanceOfPreferredStock: parseFloat(report.proceedsFromIssuanceOfPreferredStock) || 0,
      proceedsFromRepurchaseOfEquity: parseFloat(report.proceedsFromRepurchaseOfEquity) || 0,
      proceedsFromSaleOfTreasuryStock: parseFloat(report.proceedsFromSaleOfTreasuryStock) || 0,
      changeInCashAndCashEquivalents: parseFloat(report.changeInCashAndCashEquivalents) || 0,
      changeInExchangeRate: parseFloat(report.changeInExchangeRate) || 0,
      netIncome: parseFloat(report.netIncome) || 0,

      // Investment Activities
      capitalExpenditures: parseFloat(report.capitalExpenditures) || 0,
      capitalExpenditureReported: parseFloat(report.capitalExpenditureReported) || 0,

      // Calculated Fields
      freeCashFlow: (parseFloat(report.operatingCashflow) || 0) - (parseFloat(report.capitalExpenditures) || 0)
    })) || [];

    return NextResponse.json({
      symbol: data.symbol,
      annualReports,
      quarterlyReports
    });

  } catch (error) {
    console.error('Alpha Vantage cash flow error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash flow' },
      { status: 500 }
    );
  }
}