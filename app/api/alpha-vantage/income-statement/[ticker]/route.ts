import { NextRequest, NextResponse } from 'next/server';
import { toNum } from '@/lib/utils';

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
      grossProfit: toNum(report.grossProfit),
      totalRevenue: toNum(report.totalRevenue),
      costOfRevenue: toNum(report.costOfRevenue),
      costofGoodsAndServicesSold: toNum(report.costofGoodsAndServicesSold),
      operatingIncome: toNum(report.operatingIncome),
      sellingGeneralAndAdministrative: toNum(report.sellingGeneralAndAdministrative),
      researchAndDevelopment: toNum(report.researchAndDevelopment),
      operatingExpenses: toNum(report.operatingExpenses),
      investmentIncomeNet: toNum(report.investmentIncomeNet),
      netInterestIncome: toNum(report.netInterestIncome),
      interestIncome: toNum(report.interestIncome),
      interestExpense: toNum(report.interestExpense),
      nonInterestIncome: toNum(report.nonInterestIncome),
      otherNonOperatingIncome: toNum(report.otherNonOperatingIncome),
      depreciation: toNum(report.depreciation),
      depreciationAndAmortization: toNum(report.depreciationAndAmortization),
      incomeBeforeTax: toNum(report.incomeBeforeTax),
      incomeTaxExpense: toNum(report.incomeTaxExpense),
      interestAndDebtExpense: toNum(report.interestAndDebtExpense),
      netIncomeFromContinuingOperations: toNum(report.netIncomeFromContinuingOperations),
      comprehensiveIncomeNetOfTax: toNum(report.comprehensiveIncomeNetOfTax),
      ebit: toNum(report.ebit),
      ebitda: toNum(report.ebitda),
      netIncome: toNum(report.netIncome)
    }));

    // Also include quarterly data (last 8 quarters)
    const quarterlyReports = data.quarterlyReports?.slice(0, 8).map((report: any) => ({
      fiscalDateEnding: report.fiscalDateEnding,
      reportedCurrency: report.reportedCurrency,
      grossProfit: toNum(report.grossProfit),
      totalRevenue: toNum(report.totalRevenue),
      costOfRevenue: toNum(report.costOfRevenue),
      costofGoodsAndServicesSold: toNum(report.costofGoodsAndServicesSold),
      operatingIncome: toNum(report.operatingIncome),
      sellingGeneralAndAdministrative: toNum(report.sellingGeneralAndAdministrative),
      researchAndDevelopment: toNum(report.researchAndDevelopment),
      operatingExpenses: toNum(report.operatingExpenses),
      investmentIncomeNet: toNum(report.investmentIncomeNet),
      netInterestIncome: toNum(report.netInterestIncome),
      interestIncome: toNum(report.interestIncome),
      interestExpense: toNum(report.interestExpense),
      nonInterestIncome: toNum(report.nonInterestIncome),
      otherNonOperatingIncome: toNum(report.otherNonOperatingIncome),
      depreciation: toNum(report.depreciation),
      depreciationAndAmortization: toNum(report.depreciationAndAmortization),
      incomeBeforeTax: toNum(report.incomeBeforeTax),
      incomeTaxExpense: toNum(report.incomeTaxExpense),
      interestAndDebtExpense: toNum(report.interestAndDebtExpense),
      netIncomeFromContinuingOperations: toNum(report.netIncomeFromContinuingOperations),
      comprehensiveIncomeNetOfTax: toNum(report.comprehensiveIncomeNetOfTax),
      ebit: toNum(report.ebit),
      ebitda: toNum(report.ebitda),
      netIncome: toNum(report.netIncome)
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