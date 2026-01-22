import { NextRequest, NextResponse } from 'next/server';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase();

    // Alpha Vantage Income Statement API
    const url = `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;

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
        error: 'Income statement data not found',
        ticker
      }, { status: 404 });
    }

    // Transform annual reports to our format
    const annualReports = data.annualReports.slice(0, 5).map((report: any) => ({
      fiscalDateEnding: report.fiscalDateEnding,
      reportedCurrency: report.reportedCurrency,
      grossProfit: parseFloat(report.grossProfit) || 0,
      totalRevenue: parseFloat(report.totalRevenue) || 0,
      costOfRevenue: parseFloat(report.costOfRevenue) || 0,
      costofGoodsAndServicesSold: parseFloat(report.costofGoodsAndServicesSold) || 0,
      operatingIncome: parseFloat(report.operatingIncome) || 0,
      sellingGeneralAndAdministrative: parseFloat(report.sellingGeneralAndAdministrative) || 0,
      researchAndDevelopment: parseFloat(report.researchAndDevelopment) || 0,
      operatingExpenses: parseFloat(report.operatingExpenses) || 0,
      investmentIncomeNet: parseFloat(report.investmentIncomeNet) || 0,
      netInterestIncome: parseFloat(report.netInterestIncome) || 0,
      interestIncome: parseFloat(report.interestIncome) || 0,
      interestExpense: parseFloat(report.interestExpense) || 0,
      nonInterestIncome: parseFloat(report.nonInterestIncome) || 0,
      otherNonOperatingIncome: parseFloat(report.otherNonOperatingIncome) || 0,
      depreciation: parseFloat(report.depreciation) || 0,
      depreciationAndAmortization: parseFloat(report.depreciationAndAmortization) || 0,
      incomeBeforeTax: parseFloat(report.incomeBeforeTax) || 0,
      incomeTaxExpense: parseFloat(report.incomeTaxExpense) || 0,
      interestAndDebtExpense: parseFloat(report.interestAndDebtExpense) || 0,
      netIncomeFromContinuingOperations: parseFloat(report.netIncomeFromContinuingOperations) || 0,
      comprehensiveIncomeNetOfTax: parseFloat(report.comprehensiveIncomeNetOfTax) || 0,
      ebit: parseFloat(report.ebit) || 0,
      ebitda: parseFloat(report.ebitda) || 0,
      netIncome: parseFloat(report.netIncome) || 0
    }));

    // Also include quarterly data (last 8 quarters)
    const quarterlyReports = data.quarterlyReports?.slice(0, 8).map((report: any) => ({
      fiscalDateEnding: report.fiscalDateEnding,
      reportedCurrency: report.reportedCurrency,
      grossProfit: parseFloat(report.grossProfit) || 0,
      totalRevenue: parseFloat(report.totalRevenue) || 0,
      costOfRevenue: parseFloat(report.costOfRevenue) || 0,
      costofGoodsAndServicesSold: parseFloat(report.costofGoodsAndServicesSold) || 0,
      operatingIncome: parseFloat(report.operatingIncome) || 0,
      sellingGeneralAndAdministrative: parseFloat(report.sellingGeneralAndAdministrative) || 0,
      researchAndDevelopment: parseFloat(report.researchAndDevelopment) || 0,
      operatingExpenses: parseFloat(report.operatingExpenses) || 0,
      investmentIncomeNet: parseFloat(report.investmentIncomeNet) || 0,
      netInterestIncome: parseFloat(report.netInterestIncome) || 0,
      interestIncome: parseFloat(report.interestIncome) || 0,
      interestExpense: parseFloat(report.interestExpense) || 0,
      nonInterestIncome: parseFloat(report.nonInterestIncome) || 0,
      otherNonOperatingIncome: parseFloat(report.otherNonOperatingIncome) || 0,
      depreciation: parseFloat(report.depreciation) || 0,
      depreciationAndAmortization: parseFloat(report.depreciationAndAmortization) || 0,
      incomeBeforeTax: parseFloat(report.incomeBeforeTax) || 0,
      incomeTaxExpense: parseFloat(report.incomeTaxExpense) || 0,
      interestAndDebtExpense: parseFloat(report.interestAndDebtExpense) || 0,
      netIncomeFromContinuingOperations: parseFloat(report.netIncomeFromContinuingOperations) || 0,
      comprehensiveIncomeNetOfTax: parseFloat(report.comprehensiveIncomeNetOfTax) || 0,
      ebit: parseFloat(report.ebit) || 0,
      ebitda: parseFloat(report.ebitda) || 0,
      netIncome: parseFloat(report.netIncome) || 0
    })) || [];

    return NextResponse.json({
      symbol: data.symbol,
      annualReports,
      quarterlyReports
    });

  } catch (error) {
    console.error('Alpha Vantage income statement error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch income statement' },
      { status: 500 }
    );
  }
}