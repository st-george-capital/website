import { NextRequest, NextResponse } from 'next/server';

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
      totalAssets: parseFloat(report.totalAssets) || 0,
      totalCurrentAssets: parseFloat(report.totalCurrentAssets) || 0,
      cashAndCashEquivalentsAtCarryingValue: parseFloat(report.cashAndCashEquivalentsAtCarryingValue) || 0,
      cashAndShortTermInvestments: parseFloat(report.cashAndShortTermInvestments) || 0,
      inventory: parseFloat(report.inventory) || 0,
      currentNetReceivables: parseFloat(report.currentNetReceivables) || 0,
      totalNonCurrentAssets: parseFloat(report.totalNonCurrentAssets) || 0,
      propertyPlantEquipment: parseFloat(report.propertyPlantEquipment) || 0,
      accumulatedDepreciationAmortizationPPE: parseFloat(report.accumulatedDepreciationAmortizationPPE) || 0,
      intangibleAssets: parseFloat(report.intangibleAssets) || 0,
      intangibleAssetsExcludingGoodwill: parseFloat(report.intangibleAssetsExcludingGoodwill) || 0,
      goodwill: parseFloat(report.goodwill) || 0,
      investments: parseFloat(report.investments) || 0,
      longTermInvestments: parseFloat(report.longTermInvestments) || 0,
      shortTermInvestments: parseFloat(report.shortTermInvestments) || 0,
      otherCurrentAssets: parseFloat(report.otherCurrentAssets) || 0,
      otherNonCurrentAssets: parseFloat(report.otherNonCurrentAssets) || 0,

      // Liabilities & Equity
      totalLiabilities: parseFloat(report.totalLiabilities) || 0,
      totalCurrentLiabilities: parseFloat(report.totalCurrentLiabilities) || 0,
      currentAccountsPayable: parseFloat(report.currentAccountsPayable) || 0,
      deferredRevenue: parseFloat(report.deferredRevenue) || 0,
      currentDebt: parseFloat(report.currentDebt) || 0,
      shortTermDebt: parseFloat(report.shortTermDebt) || 0,
      totalNonCurrentLiabilities: parseFloat(report.totalNonCurrentLiabilities) || 0,
      capitalLeaseObligations: parseFloat(report.capitalLeaseObligations) || 0,
      longTermDebt: parseFloat(report.longTermDebt) || 0,
      currentLongTermDebt: parseFloat(report.currentLongTermDebt) || 0,
      longTermDebtNoncurrent: parseFloat(report.longTermDebtNoncurrent) || 0,
      shortLongTermDebtTotal: parseFloat(report.shortLongTermDebtTotal) || 0,
      otherCurrentLiabilities: parseFloat(report.otherCurrentLiabilities) || 0,
      otherNonCurrentLiabilities: parseFloat(report.otherNonCurrentLiabilities) || 0,
      totalShareholderEquity: parseFloat(report.totalShareholderEquity) || 0,
      treasuryStock: parseFloat(report.treasuryStock) || 0,
      retainedEarnings: parseFloat(report.retainedEarnings) || 0,
      commonStock: parseFloat(report.commonStock) || 0,
      commonStockSharesOutstanding: parseFloat(report.commonStockSharesOutstanding) || 0
    }));

    // Also include quarterly data (last 8 quarters)
    const quarterlyReports = data.quarterlyReports?.slice(0, 8).map((report: any) => ({
      fiscalDateEnding: report.fiscalDateEnding,
      reportedCurrency: report.reportedCurrency,

      // Assets
      totalAssets: parseFloat(report.totalAssets) || 0,
      totalCurrentAssets: parseFloat(report.totalCurrentAssets) || 0,
      cashAndCashEquivalentsAtCarryingValue: parseFloat(report.cashAndCashEquivalentsAtCarryingValue) || 0,
      cashAndShortTermInvestments: parseFloat(report.cashAndShortTermInvestments) || 0,
      inventory: parseFloat(report.inventory) || 0,
      currentNetReceivables: parseFloat(report.currentNetReceivables) || 0,
      totalNonCurrentAssets: parseFloat(report.totalNonCurrentAssets) || 0,
      propertyPlantEquipment: parseFloat(report.propertyPlantEquipment) || 0,
      accumulatedDepreciationAmortizationPPE: parseFloat(report.accumulatedDepreciationAmortizationPPE) || 0,
      intangibleAssets: parseFloat(report.intangibleAssets) || 0,
      intangibleAssetsExcludingGoodwill: parseFloat(report.intangibleAssetsExcludingGoodwill) || 0,
      goodwill: parseFloat(report.goodwill) || 0,
      investments: parseFloat(report.investments) || 0,
      longTermInvestments: parseFloat(report.longTermInvestments) || 0,
      shortTermInvestments: parseFloat(report.shortTermInvestments) || 0,
      otherCurrentAssets: parseFloat(report.otherCurrentAssets) || 0,
      otherNonCurrentAssets: parseFloat(report.otherNonCurrentAssets) || 0,

      // Liabilities & Equity
      totalLiabilities: parseFloat(report.totalLiabilities) || 0,
      totalCurrentLiabilities: parseFloat(report.totalCurrentLiabilities) || 0,
      currentAccountsPayable: parseFloat(report.currentAccountsPayable) || 0,
      deferredRevenue: parseFloat(report.deferredRevenue) || 0,
      currentDebt: parseFloat(report.currentDebt) || 0,
      shortTermDebt: parseFloat(report.shortTermDebt) || 0,
      totalNonCurrentLiabilities: parseFloat(report.totalNonCurrentLiabilities) || 0,
      capitalLeaseObligations: parseFloat(report.capitalLeaseObligations) || 0,
      longTermDebt: parseFloat(report.longTermDebt) || 0,
      currentLongTermDebt: parseFloat(report.currentLongTermDebt) || 0,
      longTermDebtNoncurrent: parseFloat(report.longTermDebtNoncurrent) || 0,
      shortLongTermDebtTotal: parseFloat(report.shortLongTermDebtTotal) || 0,
      otherCurrentLiabilities: parseFloat(report.otherCurrentLiabilities) || 0,
      otherNonCurrentLiabilities: parseFloat(report.otherNonCurrentLiabilities) || 0,
      totalShareholderEquity: parseFloat(report.totalShareholderEquity) || 0,
      treasuryStock: parseFloat(report.treasuryStock) || 0,
      retainedEarnings: parseFloat(report.retainedEarnings) || 0,
      commonStock: parseFloat(report.commonStock) || 0,
      commonStockSharesOutstanding: parseFloat(report.commonStockSharesOutstanding) || 0
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