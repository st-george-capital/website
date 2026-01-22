import { NextRequest, NextResponse } from 'next/server';
import { toNum } from '@/lib/utils';

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
    console.error('Alpha Vantage cash flow error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash flow' },
      { status: 500 }
    );
  }
}