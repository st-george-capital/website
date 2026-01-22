import { NextRequest, NextResponse } from 'next/server';
import { toNum } from '@/lib/utils';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase();

    // Alpha Vantage Balance Sheet API
    const url = `https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;

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
        error: 'Balance sheet data not found',
        ticker
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
    console.error('Alpha Vantage balance sheet error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance sheet' },
      { status: 500 }
    );
  }
}