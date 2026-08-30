'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Using native HTML form elements instead of custom UI components
import { Badge } from '@/components/ui/badge';
import { toNum } from '@/lib/utils';
import { ArrowLeft, Calculator, TrendingUp, BarChart3, AlertTriangle, Info, Download, Upload, FileText, Save, Trash2, List } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';
import Link from 'next/link';

// Number formatting helper
function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// DCF Calculation Types
interface DCFInputs {
  // Company Setup
  companyName: string;
  ticker: string;
  currency: string;
  currentPrice: number;
  sharesOutstanding: number;
  sharesDiluted: number;
  totalDebt: number;
  cashEquivalents: number;
  preferredEquity: number;
  minorityInterest: number;
  nonOperatingAssets: number;

  // Forecast Horizon
  forecastYears: number;
  midYearConvention: boolean; // Advanced mode only

  // Operating Forecast
  forecastMode: 'simple' | 'advanced';
  startingRevenue: number;
  revenueGrowth: number[]; // One per year

  // Simple Mode
  ebitMargin: number[]; // One per year
  capexPercentOfRevenue: number; // Fixed %
  depreciationPercentOfRevenue: number; // Fixed %
  nwcChangePercentOfRevenueChange: number; // Fixed %
  cashTaxRate: number;

  // Advanced Mode
  ebitMarginAdvanced?: number[]; // By year (optional, falls back to simple)
  capexByYear?: number[]; // Capex as % of revenue by year
  depreciationByYear?: number[]; // D&A as % of revenue by year
  nwcChangeByYear?: number[]; // ΔNWC as % of revenue change by year
  cashTaxRateByYear?: number[]; // Tax rate by year

  // Discount Rate (WACC)
  riskFreeRate: number;
  equityRiskPremium: number;
  beta: number;
  costOfDebt: number;
  taxRate: number;
  targetDebtRatio: number; // or D/E ratio

  // Terminal Value
  terminalMethod: 'perpetual' | 'multiple' | 'both';
  terminalWeighting: number; // For 'both' method: % perpetual vs % multiple (0.5 = 50/50)
  perpetualGrowth: number;
  exitMultiple: number;
  exitMultipleMetric: 'ebitda' | 'ebit' | 'fcf';
}

interface DCFOutputs {
  // Cash Flows
  revenues: number[];
  ebit: number[];
  nopat: number[];
  freeCashFlow: number[];

  // Valuation
  terminalValue: number;
  pvOfFcff: number;
  pvOfTerminalValue: number;
  enterpriseValue: number;
  equityValue: number;
  intrinsicValuePerShare: number;
  upsideDownside: number;
  terminalValueContribution: number;

  // WACC
  costOfEquity: number;
  afterTaxCostOfDebt: number;
  wacc: number;
}

// Export Functions
function exportToExcel(inputs: DCFInputs, outputs: DCFOutputs, financialData: ExtractedFinancials | null, selectedCompany: CompanyOverview | null) {
  try {
    console.log('Starting Excel export...');
    // Create workbook
    const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    ['DCF Analysis Summary'],
    [''],
    ['Company Information'],
    ['Company Name', inputs.companyName],
    ['Ticker', inputs.ticker],
    ['Currency', inputs.currency],
    ['Current Price', inputs.currentPrice],
    ['Shares Outstanding', inputs.sharesOutstanding],
    ['Shares Diluted', inputs.sharesDiluted],
    [''],
    ['Valuation Results'],
    ['Enterprise Value', outputs.enterpriseValue.toFixed(0)],
    ['Equity Value', outputs.equityValue.toFixed(0)],
    ['Intrinsic Value per Share', outputs.intrinsicValuePerShare.toFixed(2)],
    ['Upside/Downside %', (outputs.upsideDownside * 100).toFixed(1) + '%'],
    [''],
    ['WACC Breakdown'],
    ['Risk-Free Rate', (inputs.riskFreeRate * 100).toFixed(2) + '%'],
    ['Equity Risk Premium', (inputs.equityRiskPremium * 100).toFixed(2) + '%'],
    ['Beta', inputs.beta.toFixed(2)],
    ['Cost of Equity', ((inputs.riskFreeRate + inputs.beta * inputs.equityRiskPremium) * 100).toFixed(2) + '%'],
    ['Cost of Debt', (inputs.costOfDebt * 100).toFixed(2) + '%'],
    ['Tax Rate', (inputs.taxRate * 100).toFixed(2) + '%'],
    ['After-Tax Cost of Debt', (inputs.costOfDebt * (1 - inputs.taxRate) * 100).toFixed(2) + '%'],
    ['Target Debt Ratio', (inputs.targetDebtRatio * 100).toFixed(2) + '%'],
    ['WACC', (outputs.wacc * 100).toFixed(2) + '%'],
    [''],
    ['Terminal Value'],
    ['Terminal Growth Rate', (inputs.perpetualGrowth * 100).toFixed(2) + '%'],
    ['Terminal Value', outputs.terminalValue.toFixed(0)],
    ['PV of Terminal Value', outputs.pvOfTerminalValue.toFixed(0)],
    ['Terminal Value % of EV', (outputs.terminalValueContribution * 100).toFixed(1) + '%']
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

  // Sheet 2: Cash Flow Projections
  const cfData = [
    ['Cash Flow Projections'],
    [''],
    ['Year', 'Revenue', 'Revenue Growth %', 'EBIT', 'EBIT Margin %', 'NOPAT', 'FCFF', 'Discount Factor', 'PV of FCFF']
  ];
  outputs.freeCashFlow.forEach((fcf, index) => {
    const revenue = outputs.revenues[index];
    const ebit = outputs.ebit[index];
    const nopat = outputs.nopat[index];
    const revenueGrowth = index > 0 ? ((revenue / outputs.revenues[index - 1]) - 1) * 100 : 0;
    const ebitMargin = revenue > 0 ? (ebit / revenue) * 100 : 0;
    const discountFactor = 1 / Math.pow(1 + outputs.wacc, index + 1);
    const pvFcff = fcf * discountFactor;
    cfData.push([
      `Year ${index + 1}`,
      revenue.toFixed(0),
      revenueGrowth.toFixed(1) + '%',
      ebit.toFixed(0),
      ebitMargin.toFixed(1) + '%',
      nopat.toFixed(0),
      fcf.toFixed(0),
      discountFactor.toFixed(4),
      pvFcff.toFixed(0)
    ]);
  });
  cfData.push(['']);
  cfData.push(['Total PV of FCFF', outputs.pvOfFcff.toFixed(0)]);
  const ws2 = XLSX.utils.aoa_to_sheet(cfData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Cash Flows');

  // Sheet 3: Sensitivity Analysis - WACC x Terminal Growth
  const sensitivityWACCData = [
    ['Sensitivity Analysis: WACC vs Terminal Growth Rate'],
    ['Intrinsic Value per Share'],
    ['']
  ];
  const waccRange = [-0.02, -0.015, -0.01, -0.005, 0, 0.005, 0.01, 0.015, 0.02];
  const termGrowthRange = [-0.01, -0.0075, -0.005, -0.0025, 0, 0.0025, 0.005, 0.0075, 0.01];
  
  // Header row
  const headerRow = ['WACC \\ Term Growth'];
  termGrowthRange.forEach(tg => {
    headerRow.push(((inputs.perpetualGrowth + tg) * 100).toFixed(2) + '%');
  });
  sensitivityWACCData.push(headerRow);

  // Data rows
  waccRange.forEach(wd => {
    const row: any[] = [((outputs.wacc + wd) * 100).toFixed(2) + '%'];
    termGrowthRange.forEach(tg => {
      const testInputs = { ...inputs, perpetualGrowth: inputs.perpetualGrowth + tg };
      const testOutputs = calculateDCF(testInputs);
      const adjustedWacc = outputs.wacc + wd;
      const adjustedPvFcff = outputs.freeCashFlow.reduce((sum, fcf, i) => 
        sum + fcf / Math.pow(1 + adjustedWacc, i + 1), 0);
      const adjustedTermValue = testOutputs.terminalValue / Math.pow(1 + adjustedWacc, inputs.forecastYears);
      const adjustedEV = adjustedPvFcff + adjustedTermValue;
      const adjustedEquity = adjustedEV - inputs.totalDebt + inputs.cashEquivalents - inputs.preferredEquity - inputs.minorityInterest;
      const adjustedPerShare = adjustedEquity / inputs.sharesDiluted;
      row.push(adjustedPerShare.toFixed(2));
    });
    sensitivityWACCData.push(row);
  });
  const ws3 = XLSX.utils.aoa_to_sheet(sensitivityWACCData);
  XLSX.utils.book_append_sheet(wb, ws3, 'Sensitivity WACC-Growth');

  // Sheet 4: Sensitivity Analysis - Revenue CAGR x Operating Margin
  const sensitivityRevenueData = [
    ['Sensitivity Analysis: Revenue CAGR vs Operating Margin'],
    ['Intrinsic Value per Share'],
    ['']
  ];
  const revenueCAGRRange = [-0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03];
  const marginRange = [-0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03];
  
  // Calculate base CAGR
  const baseCAGR = inputs.revenueGrowth.length > 0 
    ? inputs.revenueGrowth.reduce((sum, g) => sum + g, 0) / inputs.revenueGrowth.length 
    : 0.05;
  const baseMargin = inputs.ebitMargin.length > 0 
    ? inputs.ebitMargin.reduce((sum, m) => sum + m, 0) / inputs.ebitMargin.length 
    : 0.15;

  // Header row
  const headerRow2 = ['Rev CAGR \\ Margin'];
  marginRange.forEach(m => {
    headerRow2.push(((baseMargin + m) * 100).toFixed(1) + '%');
  });
  sensitivityRevenueData.push(headerRow2);

  // Data rows
  revenueCAGRRange.forEach(rc => {
    const row: any[] = [((baseCAGR + rc) * 100).toFixed(1) + '%'];
    marginRange.forEach(m => {
      const testInputs = { 
        ...inputs, 
        revenueGrowth: inputs.revenueGrowth.map(g => baseCAGR + rc),
        ebitMargin: inputs.ebitMargin.map(margin => baseMargin + m)
      };
      const testOutputs = calculateDCF(testInputs);
      row.push(testOutputs.intrinsicValuePerShare.toFixed(2));
    });
    sensitivityRevenueData.push(row);
  });
  const ws4 = XLSX.utils.aoa_to_sheet(sensitivityRevenueData);
  XLSX.utils.book_append_sheet(wb, ws4, 'Sensitivity Rev-Margin');

  // Sheet 5: Scenario Analysis
  const scenarioData = [
    ['Scenario Analysis'],
    [''],
    ['Scenario', 'Revenue Growth', 'Operating Margin', 'WACC', 'Terminal Growth', 'Intrinsic Value', 'Upside/Downside'],
    ['']
  ];

  // Base case
  scenarioData.push([
    'Base',
    (baseCAGR * 100).toFixed(1) + '%',
    (baseMargin * 100).toFixed(1) + '%',
    (outputs.wacc * 100).toFixed(2) + '%',
    (inputs.perpetualGrowth * 100).toFixed(2) + '%',
    outputs.intrinsicValuePerShare.toFixed(2),
    (outputs.upsideDownside * 100).toFixed(1) + '%'
  ]);

  // Bull case
  const bullInputs = {
    ...inputs,
    revenueGrowth: inputs.revenueGrowth.map(g => g + 0.02),
    ebitMargin: inputs.ebitMargin.map(m => m + 0.015),
    perpetualGrowth: inputs.perpetualGrowth + 0.005
  };
  const bullOutputs = calculateDCF(bullInputs);
  const bullWacc = bullOutputs.wacc - 0.0075;
  const bullUpside = inputs.currentPrice > 0 ? ((bullOutputs.intrinsicValuePerShare / inputs.currentPrice) - 1) : 0;
  scenarioData.push([
    'Bull',
    ((baseCAGR + 0.02) * 100).toFixed(1) + '%',
    ((baseMargin + 0.015) * 100).toFixed(1) + '%',
    ((outputs.wacc - 0.0075) * 100).toFixed(2) + '%',
    ((inputs.perpetualGrowth + 0.005) * 100).toFixed(2) + '%',
    bullOutputs.intrinsicValuePerShare.toFixed(2),
    (bullUpside * 100).toFixed(1) + '%'
  ]);

  // Bear case
  const bearInputs = {
    ...inputs,
    revenueGrowth: inputs.revenueGrowth.map(g => Math.max(0, g - 0.02)),
    ebitMargin: inputs.ebitMargin.map(m => Math.max(0.01, m - 0.015)),
    perpetualGrowth: Math.max(0, inputs.perpetualGrowth - 0.005)
  };
  const bearOutputs = calculateDCF(bearInputs);
  const bearWacc = bearOutputs.wacc + 0.01;
  const bearUpside = inputs.currentPrice > 0 ? ((bearOutputs.intrinsicValuePerShare / inputs.currentPrice) - 1) : 0;
  scenarioData.push([
    'Bear',
    ((baseCAGR - 0.02) * 100).toFixed(1) + '%',
    ((baseMargin - 0.015) * 100).toFixed(1) + '%',
    ((outputs.wacc + 0.01) * 100).toFixed(2) + '%',
    ((Math.max(0, inputs.perpetualGrowth - 0.005)) * 100).toFixed(2) + '%',
    bearOutputs.intrinsicValuePerShare.toFixed(2),
    (bearUpside * 100).toFixed(1) + '%'
  ]);

  const ws5 = XLSX.utils.aoa_to_sheet(scenarioData);
  XLSX.utils.book_append_sheet(wb, ws5, 'Scenarios');

  // Sheet 6: Inputs (all parameters)
  const inputsData = [
    ['DCF Model Inputs'],
    [''],
    ['Operating Forecast'],
    ['Forecast Years', inputs.forecastYears],
    ['Forecast Mode', inputs.forecastMode],
    ['Starting Revenue', inputs.startingRevenue],
    ['Mid-Year Convention', inputs.midYearConvention ? 'Yes' : 'No'],
    [''],
    ['Revenue Growth by Year']
  ];
  inputs.revenueGrowth.forEach((g, i) => {
    inputsData.push([`Year ${i + 1}`, (g * 100).toFixed(2) + '%']);
  });
  inputsData.push(['']);
  inputsData.push(['EBIT Margin by Year']);
  inputs.ebitMargin.forEach((m, i) => {
    inputsData.push([`Year ${i + 1}`, (m * 100).toFixed(2) + '%']);
  });
  inputsData.push(['']);
  inputsData.push(['Other Operating Assumptions']);
  inputsData.push(['Capex % of Revenue', (inputs.capexPercentOfRevenue * 100).toFixed(2) + '%']);
  inputsData.push(['D&A % of Revenue', (inputs.depreciationPercentOfRevenue * 100).toFixed(2) + '%']);
  inputsData.push(['NWC Change % of Rev Change', (inputs.nwcChangePercentOfRevenueChange * 100).toFixed(2) + '%']);
  inputsData.push(['Cash Tax Rate', (inputs.cashTaxRate * 100).toFixed(2) + '%']);
  inputsData.push(['']);
  inputsData.push(['Balance Sheet Items']);
  inputsData.push(['Total Debt', inputs.totalDebt]);
  inputsData.push(['Cash & Equivalents', inputs.cashEquivalents]);
  inputsData.push(['Preferred Equity', inputs.preferredEquity]);
  inputsData.push(['Minority Interest', inputs.minorityInterest]);
  inputsData.push(['Non-Operating Assets', inputs.nonOperatingAssets]);
  const ws6 = XLSX.utils.aoa_to_sheet(inputsData);
  XLSX.utils.book_append_sheet(wb, ws6, 'Inputs');

    // Generate and download
    console.log('Writing workbook...');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${inputs.ticker}_DCF_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('Excel export completed successfully!');
  } catch (error) {
    console.error('Excel export failed:', error);
    alert(`Failed to export Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function exportToCSV(inputs: DCFInputs, outputs: DCFOutputs) {
  const headers = ['Metric', 'Value', 'Unit'];
  const data = [
    ['Company', inputs.companyName, ''],
    ['Ticker', inputs.ticker, ''],
    ['Current Price', inputs.currentPrice.toString(), inputs.currency],
    ['Shares Outstanding', inputs.sharesOutstanding.toString(), 'shares'],
    ['Shares Diluted', inputs.sharesDiluted.toString(), 'shares'],
    ['Enterprise Value', outputs.enterpriseValue.toFixed(0), inputs.currency],
    ['Equity Value', outputs.equityValue.toFixed(0), inputs.currency],
    ['Intrinsic Value per Share', outputs.intrinsicValuePerShare.toFixed(2), inputs.currency],
    ['Upside/Downside', (outputs.upsideDownside * 100).toFixed(1) + '%', ''],
    ['WACC', (outputs.wacc * 100).toFixed(2) + '%', ''],
    ['Terminal Value (PV)', outputs.pvOfTerminalValue.toFixed(0), inputs.currency],
    ['', '', ''],
    ['Cash Flow Projections', '', ''],
    ['Year', 'Revenue', 'EBIT', 'NOPAT', 'FCFF']
  ];

  outputs.freeCashFlow.forEach((_, index) => {
    data.push([
      `Year ${index + 1}`,
      outputs.revenues[index].toFixed(0),
      outputs.ebit[index].toFixed(0),
      outputs.nopat[index].toFixed(0),
      outputs.freeCashFlow[index].toFixed(0)
    ]);
  });

  const csvContent = [headers, ...data].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${inputs.ticker}_DCF_Analysis.csv`;
  link.click();
}

function printSnapshot(inputs: DCFInputs, outputs: DCFOutputs) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${inputs.companyName} - DCF Analysis Snapshot</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
        .metric { padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .metric-value { font-size: 18px; font-weight: bold; color: #2563eb; }
        .metric-label { font-size: 12px; color: #666; }
        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f5f5f5; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${inputs.companyName} (${inputs.ticker})</h1>
        <h2>DCF Valuation Analysis</h2>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="metrics">
        <div class="metric">
          <div class="metric-value">${inputs.currency}${(outputs.enterpriseValue / 1000000).toFixed(0)}M</div>
          <div class="metric-label">Enterprise Value</div>
        </div>
        <div class="metric">
          <div class="metric-value">${inputs.currency}${(outputs.equityValue / 1000000).toFixed(0)}M</div>
          <div class="metric-label">Equity Value</div>
        </div>
        <div class="metric">
          <div class="metric-value">${inputs.currency}${formatNumber(outputs.intrinsicValuePerShare, 2)}</div>
          <div class="metric-label">Intrinsic Value/Share</div>
        </div>
        <div class="metric">
          <div class="metric-value">${(outputs.upsideDownside * 100).toFixed(1)}%</div>
          <div class="metric-label">${outputs.upsideDownside >= 0 ? 'Upside' : 'Downside'}</div>
        </div>
      </div>

      <h3>Key Assumptions</h3>
      <table class="table">
        <tr><td>WACC</td><td>${(outputs.wacc * 100).toFixed(2)}%</td></tr>
        <tr><td>Terminal Growth</td><td>${(inputs.perpetualGrowth * 100).toFixed(2)}%</td></tr>
        <tr><td>Forecast Years</td><td>${inputs.forecastYears}</td></tr>
        <tr><td>Shares Outstanding</td><td>${inputs.sharesOutstanding.toLocaleString()}</td></tr>
      </table>

      <h3>Cash Flow Summary</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Year</th>
            <th>Revenue (${inputs.currency}M)</th>
            <th>FCFF (${inputs.currency}M)</th>
          </tr>
        </thead>
        <tbody>
          ${outputs.freeCashFlow.map((fcf, index) => `
            <tr>
              <td>Year ${index + 1}</td>
              <td>${(outputs.revenues[index] / 1000000).toFixed(0)}</td>
              <td>${(fcf / 1000000).toFixed(0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px;">
        <strong>Educational Purpose Only:</strong> This analysis is for educational and research purposes only.
        Not investment advice. Generated by DCF Valuation Tool.
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
  printWindow.print();
}

// Default inputs for example company
const getDefaultInputs = (): DCFInputs => ({
  companyName: 'Example Corp',
  ticker: 'EXAM',
  currency: 'USD',
  currentPrice: 50.00,
  sharesOutstanding: 100000000,
  sharesDiluted: 105000000,
  totalDebt: 500000000,
  cashEquivalents: 200000000,
  preferredEquity: 0,
  minorityInterest: 0,
  nonOperatingAssets: 0,

  forecastYears: 5,
  midYearConvention: false, // Default to year-end for simplicity

  forecastMode: 'simple',
  startingRevenue: 2000000000,
  revenueGrowth: [0.15, 0.12, 0.10, 0.08, 0.06], // 15%, 12%, 10%, 8%, 6%

  // Simple Mode
  ebitMargin: [0.25, 0.26, 0.27, 0.28, 0.29], // Improving margins
  capexPercentOfRevenue: 0.08, // 8% of revenue
  depreciationPercentOfRevenue: 0.05, // 5% of revenue
  nwcChangePercentOfRevenueChange: 0.02, // 2% of revenue change
  cashTaxRate: 0.25,

  // Advanced Mode (undefined by default)
  ebitMarginAdvanced: undefined,
  capexByYear: undefined,
  depreciationByYear: undefined,
  nwcChangeByYear: undefined,
  cashTaxRateByYear: undefined,

  riskFreeRate: 0.0425, // 4.25%
  equityRiskPremium: 0.06, // 6%
  beta: 1.2,
  costOfDebt: 0.055, // 5.5%
  taxRate: 0.25,
  targetDebtRatio: 0.3, // 30% debt

  terminalMethod: 'both',
  terminalWeighting: 0.5, // 50/50 split
  perpetualGrowth: 0.025, // 2.5%
  exitMultiple: 12,
  exitMultipleMetric: 'ebitda',
});

function resizeYearArray(values: number[] | undefined, forecastYears: number, fallbackValue: number): number[] | undefined {
  if (values == null) return undefined;

  const resized = values.slice(0, forecastYears);
  const fillValue = resized.length > 0 ? resized[resized.length - 1] : fallbackValue;

  while (resized.length < forecastYears) {
    resized.push(fillValue);
  }

  return resized;
}

function normalizeInputsForForecastYears(inputs: DCFInputs): DCFInputs {
  const forecastYears = Math.max(1, Math.floor(inputs.forecastYears || 5));

  return {
    ...inputs,
    forecastYears,
    revenueGrowth: resizeYearArray(inputs.revenueGrowth, forecastYears, 0.05) ?? Array(forecastYears).fill(0.05),
    ebitMargin: resizeYearArray(inputs.ebitMargin, forecastYears, 0.15) ?? Array(forecastYears).fill(0.15),
    ebitMarginAdvanced: resizeYearArray(inputs.ebitMarginAdvanced, forecastYears, inputs.ebitMargin[inputs.ebitMargin.length - 1] ?? 0.15),
    capexByYear: resizeYearArray(inputs.capexByYear, forecastYears, inputs.capexPercentOfRevenue),
    depreciationByYear: resizeYearArray(inputs.depreciationByYear, forecastYears, inputs.depreciationPercentOfRevenue),
    nwcChangeByYear: resizeYearArray(inputs.nwcChangeByYear, forecastYears, inputs.nwcChangePercentOfRevenueChange),
    cashTaxRateByYear: resizeYearArray(inputs.cashTaxRateByYear, forecastYears, inputs.cashTaxRate),
  };
}

// Financial data extracted from uploaded files
interface ExtractedFinancials {
  revenue: number[];
  ebit: number[];
  ebitda: number[];
  netIncome: number[];
  totalAssets: number[];
  totalLiabilities: number[];
  shareholdersEquity: number[];
  cashAndEquivalents: number[];
  totalDebt: number[];
  capex: number[];
  depreciation: number[];
  workingCapital: number[];
  currentAssets: number[];
  currentLiabilities: number[];
  periods: string[];
  companyName?: string;
  ticker?: string;
  // Company overview data (merged from selectedCompany for research report auto-population)
  sector?: string;
  industry?: string;
  fiscalYearEnd?: string;
  week52High?: number;
  week52Low?: number;
  sharesOutstanding?: number;
  // PE ratios
  peRatio?: number;
  forwardPE?: number; // Calculated from DCF
  forwardPEConsensus?: number; // From API (analyst consensus)
  dividendYield?: number;
  dilutedEPSTTM?: number; // From API
  // EPS data (quarterly)
  quarterlyEPS?: Array<{ fiscalDateEnding: string; reportedEPS: string }>;
  // Price performance (calculated from time series)
  pricePerformance?: {
    absYTD?: number; abs1m?: number; abs3m?: number; abs12m?: number;
    relYTD?: number; rel1m?: number; rel3m?: number; rel12m?: number;
  };
  // Price history for charting
  priceHistory?: Array<{ date: string; close: number }>;
}

interface CompanyOverview {
  symbol: string;
  name: string;
  description?: string;
  exchange: string;
  currency: string;
  sector: string;
  industry: string;
  employees?: number;
  marketCapitalization?: number;
  ebitda?: number;
  peRatio?: number;
  forwardPE?: number;
  evToEBITDA?: number;
  evToRevenue?: number;
  beta?: number;
  week52High?: number;
  week52Low?: number;
  sharesOutstanding?: number;
  revenueTTM?: number;
  dilutedEPSTTM?: number;
  dividendYield?: number;
  dividendPerShare?: number;
  grossProfitTTM?: number;
  profitMargin?: number;
  operatingMarginTTM?: number;
  returnOnEquityTTM?: number;
  returnOnAssetsTTM?: number;
  fiscalYearEnd?: string;
}

interface InvestorSnapshotProps {
  companyData: CompanyOverview | null;
  financialData: ExtractedFinancials | null;
  quoteData: any;
}

function InvestorSnapshot({ companyData, financialData, quoteData }: InvestorSnapshotProps) {
  // Calculate metrics using proper sourcing as specified
  const currentPrice = quoteData?.price || 0;
  const sharesOutstanding = companyData?.sharesOutstanding || 0;
  const marketCap = sharesOutstanding * currentPrice;

  // Use company data from OVERVIEW API
  const revenueTTM = companyData?.revenueTTM || 0;
  const ebitdaTTM = companyData?.ebitda || 0;
  const epsTTM = companyData?.dilutedEPSTTM || 0;
  const peRatio = companyData?.peRatio || financialData?.peRatio || 0;
  const forwardPE = companyData?.forwardPE ?? financialData?.forwardPE ?? null;
  const evEbitda = companyData?.evToEBITDA || 0;
  const evSales = companyData?.evToRevenue || 0;
  const dividendYield = companyData?.dividendYield || 0;

  // Compute Enterprise Value
  let ev = 0;
  if (evEbitda && ebitdaTTM) {
    ev = evEbitda * ebitdaTTM;
  } else if (evSales && revenueTTM) {
    ev = evSales * revenueTTM;
  }

  // Earnings Yield = EPS / Price
  const earningsYield = epsTTM && currentPrice ? epsTTM / currentPrice : 0;

  // FCF Yield calculation (simplified TTM proxy)
  const fcfTTM = financialData?.capex?.slice(0, 4).reduce((sum, capex, i) => {
    const opCashflow = financialData?.capex?.[i] ? (financialData.capex[i] * 2) : 0; // Rough proxy
    return sum + (opCashflow - (capex || 0));
  }, 0) || 0;
  const fcfYield = fcfTTM && marketCap ? fcfTTM / marketCap : 0;

  // Profitability from OVERVIEW API
  const grossMarginTTM = companyData?.grossProfitTTM && revenueTTM ? companyData.grossProfitTTM / revenueTTM : 0;
  const operatingMarginTTM = companyData?.operatingMarginTTM || 0;
  const netMarginTTM = companyData?.profitMargin || 0;
  const roeTTM = companyData?.returnOnEquityTTM || 0;
  const roaTTM = companyData?.returnOnAssetsTTM || 0;

  // ROIC proxy calculation
  let roicProxy = null;
  let roicProxyAvailable = false;
  if (financialData?.ebit?.[0] && financialData?.totalAssets?.[0] && financialData?.totalLiabilities?.[0] && financialData?.shareholdersEquity?.[0]) {
    const ebit = financialData.ebit[0];
    const taxRate = financialData.netIncome?.[0] && ebit ? (ebit - (financialData.netIncome[0] || 0)) / ebit : 0.25;
    const nopat = ebit * (1 - taxRate);
    const investedCapital = (financialData.totalLiabilities[0] + financialData.shareholdersEquity[0] - (financialData.cashAndEquivalents?.[0] || 0));
    roicProxy = investedCapital > 0 ? nopat / investedCapital : 0;
    roicProxyAvailable = true;
  }

  // Leverage/Liquidity from balance sheet
  const totalDebt = Math.abs(financialData?.totalDebt?.[0] || 0);
  const cashAndEquivalents = financialData?.cashAndEquivalents?.[0] || 0;
  const netDebt = totalDebt - cashAndEquivalents;
  const shareholdersEquity = financialData?.shareholdersEquity?.[0] || 0;
  const totalAssets = financialData?.totalAssets?.[0] || 0;

  const netDebtToEBITDA = ebitdaTTM ? netDebt / ebitdaTTM : 0;
  const debtToEquity = shareholdersEquity ? totalDebt / shareholdersEquity : 0;

  const currentAssets = financialData?.currentAssets?.[0] || 0;
  const currentLiabilities = financialData?.currentLiabilities?.[0] || 0;
  const currentRatio = currentLiabilities ? currentAssets / currentLiabilities : 0;

  const ebit = financialData?.ebit?.[0] || 0;
  const interestExpense = financialData?.depreciation?.[0] ? financialData.depreciation[0] * 0.1 : 0; // Rough proxy
  const interestCoverage = interestExpense ? ebit / interestExpense : 0;

  // Growth calculations
  const calculateCAGR = (values: number[], years: number) => {
    if (!values || values.length < 2) return 0;
    const recent = values.slice(0, years);
    if (recent.length < 2) return 0;
    const start = recent[recent.length - 1];
    const end = recent[0];
    if (start <= 0) return 0;
    return Math.pow(end / start, 1 / (recent.length - 1)) - 1;
  };

  const revenueCAGR3Y = calculateCAGR(financialData?.revenue || [], 3);
  const revenueCAGR5Y = calculateCAGR(financialData?.revenue || [], 5);

  // EPS CAGR from earnings history (placeholder - would need EARNINGS API)
  const epsCAGR3Y = 0; // TODO: Implement with EARNINGS API
  const epsCAGR5Y = 0;

  // FCF CAGR
  const fcfValues = financialData?.capex?.map((capex, i) => {
    const opCashflow = financialData?.capex?.[i] ? financialData.capex[i] * 2 : 0;
    return opCashflow - (capex || 0);
  }) || [];
  const fcfCAGR3Y = calculateCAGR(fcfValues, 3);
  const fcfCAGR5Y = calculateCAGR(fcfValues, 5);

  // Share count trend (placeholder - would need SHARES_OUTSTANDING API)
  const shareCountChange3Y = 0; // TODO: Implement with SHARES_OUTSTANDING API
  const shareCountChange5Y = 0;

  // Payout ratio
  const dividendPerShare = companyData?.dividendPerShare || 0;
  const payoutRatio = epsTTM > 0 ? dividendPerShare / epsTTM : 0;


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Investor Snapshot
          </CardTitle>
          <CardDescription>
            Key financial metrics and ratios for investment analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Valuation Panel */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-blue-700 border-b pb-2">Valuation</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Market Cap</span>
                  <div className="text-right">
                    <div className="font-medium">${(marketCap / 1e9).toFixed(1)}B</div>
                    <div className="text-xs text-gray-500">OVERVIEW.MarketCapitalization</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Enterprise Value</span>
                  <div className="text-right">
                    <div className="font-medium">{ev > 0 ? `$${(ev / 1e9).toFixed(1)}B` : 'Not available'}</div>
                    <div className="text-xs text-gray-500">{ev > 0 ? 'Computed from EV multiples' : 'Missing EV/EBITDA or EV/Sales'}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">P/E (TTM)</span>
                  <div className="text-right">
                    <div className="font-medium">{peRatio > 0 ? `${peRatio.toFixed(1)}x` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">OVERVIEW.PERatio</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Forward P/E</span>
                  <div className="text-right">
                    <div className="font-medium">{forwardPE != null && forwardPE > 0 ? `${Number(forwardPE).toFixed(1)}x` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">OVERVIEW.ForwardPE</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">EV/EBITDA (TTM)</span>
                  <div className="text-right">
                    <div className="font-medium">{evEbitda > 0 ? `${evEbitda.toFixed(1)}x` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">OVERVIEW.EVToEBITDA</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">EV/Sales (TTM)</span>
                  <div className="text-right">
                    <div className="font-medium">{evSales > 0 ? `${evSales.toFixed(1)}x` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">OVERVIEW.EVToRevenue</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">FCF Yield</span>
                  <div className="text-right">
                    <div className="font-medium">{fcfYield > 0 ? `${(fcfYield * 100).toFixed(1)}%` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">CASH_FLOW.quarterlyReports</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Earnings Yield</span>
                  <div className="text-right">
                    <div className="font-medium">{earningsYield > 0 ? `${(earningsYield * 100).toFixed(1)}%` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">OVERVIEW.DilutedEPSTTM / GLOBAL_QUOTE.price</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profitability Panel */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-green-700 border-b pb-2">Profitability</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Gross Margin (TTM)</span>
                  <div className="text-right">
                    <div className="font-medium">{grossMarginTTM > 0 ? `${(grossMarginTTM * 100).toFixed(1)}%` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">OVERVIEW.GrossProfitTTM / OVERVIEW.RevenueTTM</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Operating Margin (TTM)</span>
                  <div className="text-right">
                    <div className="font-medium">{operatingMarginTTM > 0 ? `${(operatingMarginTTM * 100).toFixed(1)}%` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">OVERVIEW.OperatingMarginTTM</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Net Margin (TTM)</span>
                  <div className="text-right">
                    <div className="font-medium">{netMarginTTM > 0 ? `${(netMarginTTM * 100).toFixed(1)}%` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">OVERVIEW.ProfitMargin</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">ROE (TTM)</span>
                  <div className="text-right">
                    <div className="font-medium">{roeTTM > 0 ? `${(roeTTM * 100).toFixed(1)}%` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">OVERVIEW.ReturnOnEquityTTM</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">ROA (TTM)</span>
                  <div className="text-right">
                    <div className="font-medium">{roaTTM > 0 ? `${(roaTTM * 100).toFixed(1)}%` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">OVERVIEW.ReturnOnAssetsTTM</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">ROIC Proxy</span>
                  <div className="text-right">
                    <div className="font-medium">{roicProxyAvailable && roicProxy ? `${(roicProxy * 100).toFixed(1)}%` : 'Not available'}</div>
                    <div className="text-xs text-gray-500">{roicProxyAvailable ? 'NOPAT / Invested Capital' : 'Missing required statement fields'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Leverage/Liquidity Panel */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-orange-700 border-b pb-2">Leverage/Liquidity</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Net Debt</span>
                  <div className="text-right">
                    <div className="font-medium">${(netDebt / 1e9).toFixed(1)}B</div>
                    <div className="text-xs text-gray-500">Total Debt - Cash (FY0)</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Net Debt/EBITDA</span>
                  <div className="text-right">
                    <div className="font-medium">{netDebtToEBITDA > 0 ? `${netDebtToEBITDA.toFixed(1)}x` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">Net Debt / OVERVIEW.EBITDA</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Debt/Equity</span>
                  <div className="text-right">
                    <div className="font-medium">{debtToEquity > 0 ? `${debtToEquity.toFixed(1)}x` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">BALANCE_SHEET.shortTermDebt + longTermDebt / totalShareholderEquity</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Ratio</span>
                  <div className="text-right">
                    <div className="font-medium">{currentRatio.toFixed(1)}x</div>
                    <div className="text-xs text-gray-500">Current Assets / Current Liabilities (FY0)</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Interest Coverage</span>
                  <div className="text-right">
                    <div className="font-medium">{interestCoverage.toFixed(1)}x</div>
                    <div className="text-xs text-gray-500">EBIT / Interest Expense (TTM)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Growth/Quality Panel */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-purple-700 border-b pb-2">Growth/Quality</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Revenue CAGR (3Y)</span>
                  <div className="text-right">
                    <div className="font-medium">{revenueCAGR3Y !== 0 ? `${(revenueCAGR3Y * 100).toFixed(1)}%` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">INCOME_STATEMENT.annualReports.totalRevenue</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Revenue CAGR (5Y)</span>
                  <div className="text-right">
                    <div className="font-medium">{revenueCAGR5Y !== 0 ? `${(revenueCAGR5Y * 100).toFixed(1)}%` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">INCOME_STATEMENT.annualReports.totalRevenue</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">EPS CAGR (3Y)</span>
                  <div className="text-right">
                    <div className="font-medium">N/A</div>
                    <div className="text-xs text-gray-500">EARNINGS.annualEarnings.reportedEPS (API not yet integrated)</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">FCF CAGR (3Y)</span>
                  <div className="text-right">
                    <div className="font-medium">{fcfCAGR3Y !== 0 ? `${(fcfCAGR3Y * 100).toFixed(1)}%` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">CASH_FLOW.annualReports.operatingCashflow - capitalExpenditures</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Share Count Trend (3Y)</span>
                  <div className="text-right">
                    <div className="font-medium">N/A</div>
                    <div className="text-xs text-gray-500">SHARES_OUTSTANDING.quarterly (API not yet integrated)</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Dividend Yield</span>
                  <div className="text-right">
                    <div className="font-medium">{dividendYield > 0 ? `${(dividendYield * 100).toFixed(1)}%` : 'N/A'}</div>
                    <div className="text-xs text-gray-500">OVERVIEW.DividendYield</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Payout Ratio</span>
                  <div className="text-right">
                    <div className="font-medium">{epsTTM > 0 ? `${(payoutRatio * 100).toFixed(1)}%` : 'Not meaningful'}</div>
                    <div className="text-xs text-gray-500">OVERVIEW.DividendPerShare / OVERVIEW.DilutedEPSTTM</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Calculate price performance (YTD, 1m, 3m, 12m absolute and relative to S&P 500)
function calculatePricePerformance(priceData: Array<{ date: string; close: number }>) {
  if (!priceData || priceData.length === 0) return undefined;

  const today = new Date();
  const currentPrice = priceData[0]?.close;
  
  // Helper to find price at a specific date
  const findPriceAtDate = (targetDate: Date) => {
    const target = targetDate.toISOString().split('T')[0];
    const entry = priceData.find(d => d.date <= target);
    return entry?.close || currentPrice;
  };

  // Calculate dates
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

  // Get prices at those dates
  const priceYTD = findPriceAtDate(yearStart);
  const price1m = findPriceAtDate(oneMonthAgo);
  const price3m = findPriceAtDate(threeMonthsAgo);
  const price12m = findPriceAtDate(oneYearAgo);

  // Calculate absolute returns (as percentages, e.g., -32.8 for -32.8%)
  const absYTD = ((currentPrice - priceYTD) / priceYTD) * 100;
  const abs1m = ((currentPrice - price1m) / price1m) * 100;
  const abs3m = ((currentPrice - price3m) / price3m) * 100;
  const abs12m = ((currentPrice - price12m) / price12m) * 100;

  // For relative performance, we'd need S&P 500 data. For now, use placeholder or estimate
  // In production, you'd fetch SPX data and calculate relative performance
  // For now, assume market returned ~10% annually, adjust proportionally
  const marketYTD = 5; // Placeholder: assume market is up 5% YTD
  const market1m = 1;
  const market3m = 3;
  const market12m = 10;

  return {
    absYTD: parseFloat(absYTD.toFixed(1)),
    abs1m: parseFloat(abs1m.toFixed(1)),
    abs3m: parseFloat(abs3m.toFixed(1)),
    abs12m: parseFloat(abs12m.toFixed(1)),
    relYTD: parseFloat((absYTD - marketYTD).toFixed(1)),
    rel1m: parseFloat((abs1m - market1m).toFixed(1)),
    rel3m: parseFloat((abs3m - market3m).toFixed(1)),
    rel12m: parseFloat((abs12m - market12m).toFixed(1))
  };
}

export default function DCFToolPage() {
  const router = useRouter();
  const [inputs, setInputs] = useState<DCFInputs>(getDefaultInputs());
  const [activeTab, setActiveTab] = useState<'snapshot' | 'assumptions' | 'valuation' | 'charts' | 'sensitivity' | 'financials' | 'comps' | 'final'>('snapshot');
  const [compsData, setCompsData] = useState<CompsRow[]>([]);
  const [compsIncludeInResearch, setCompsIncludeInResearch] = useState(true);
  const [financialData, setFinancialData] = useState<ExtractedFinancials | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyOverview | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [marketData, setMarketData] = useState<any>(null);
  const [earningsData, setEarningsData] = useState<any>(null);
  const [priceHistory, setPriceHistory] = useState<any>(null);
  const [selectedScenario, setSelectedScenario] = useState<'base' | 'bull' | 'bear'>('base');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [forceRecalc, setForceRecalc] = useState(0);
  const [advancedScenarioMode, setAdvancedScenarioMode] = useState(false);
  const [customScenarioParams, setCustomScenarioParams] = useState({
    bull: { revenueGrowthAdj: 0.02, marginAdj: 0.015, waccAdj: -0.0075, termGrowthAdj: 0.005 },
    bear: { revenueGrowthAdj: -0.02, marginAdj: -0.015, waccAdj: 0.01, termGrowthAdj: -0.005 }
  });
  const [savedModelId, setSavedModelId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [modelName, setModelName] = useState('');
  const [manageModelsList, setManageModelsList] = useState<any[]>([]);
  const [showAllModels, setShowAllModels] = useState(false);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  // Fetch market data for ERP calculation
  const fetchMarketData = async () => {
    try {
      const [spxResponse, treasuryResponse] = await Promise.all([
        fetch('/api/alpha-vantage/market-data/spx').then(r => r.json()),
        fetch('/api/fred/10y-treasury').then(r => r.json())
      ]);

      if (spxResponse.error || treasuryResponse.error) {
        console.warn('Market data fetch failed:', spxResponse.error || treasuryResponse.error);
        return;
      }

      const fetchedMarketData = {
        spxEarningsYield: spxResponse.earningsYield || 0,
        treasuryYield: treasuryResponse.yield || 0,
        erp: Math.max(0, (spxResponse.earningsYield || 0) - (treasuryResponse.yield || 0)),
        lastUpdated: new Date().toISOString(),
        sources: {
          spx: spxResponse.source,
          treasury: treasuryResponse.source
        }
      };

      setMarketData(fetchedMarketData);

      // Update ERP in inputs with calculated value (even if using fallbacks)
      updateInput('equityRiskPremium', fetchedMarketData.erp);

    } catch (error) {
      console.warn('Failed to fetch market data for ERP:', error);
    }
  };

  // Calculate outputs whenever inputs change
  const outputs = useMemo(() => calculateDCF(inputs), [inputs, forceRecalc]);

  // Fetch market data on mount
  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchManageModels = async () => {
    try {
      const url = isAdmin && showAllModels ? '/api/dcf-models?all=true' : '/api/dcf-models';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch models');
      const data = await res.json();
      setManageModelsList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setManageModelsList([]);
    }
  };

  const deleteDCFModel = async (id: string) => {
    if (!confirm('Delete this DCF model? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/dcf-models/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setManageModelsList(prev => prev.filter(m => m.id !== id));
      if (savedModelId === id) setSavedModelId(null);
    } catch (e) {
      console.error(e);
      alert('Failed to delete model');
    }
  };

  useEffect(() => {
    fetchManageModels();
  }, [isAdmin, showAllModels]);

  const updateInput = (field: keyof DCFInputs, value: any) => {
    setInputs(prev => {
      const nextInputs = { ...prev, [field]: value };
      return field === 'forecastYears' ? normalizeInputsForForecastYears(nextInputs) : nextInputs;
    });
  };

  const updateArrayInput = (field: keyof DCFInputs, index: number, value: number) => {
    if (Array.isArray(inputs[field])) {
      const newArray = [...(inputs[field] as number[])];
      newArray[index] = value;
      setInputs(prev => ({ ...prev, [field]: newArray }));
    }
  };

  const loadExample = () => {
    setInputs(getDefaultInputs());
  };

  const resetInputs = () => {
    setInputs({
      ...getDefaultInputs(),
      companyName: '',
      ticker: '',
      currentPrice: 0,
      sharesOutstanding: 0,
      sharesDiluted: 0,
      totalDebt: 0,
      cashEquivalents: 0,
    });
  };

  // Build outputs with bull/bear scenarios for saving (report can pre-fill from these)
  const getOutputsWithScenarios = () => {
    const bullParams = advancedScenarioMode ? customScenarioParams.bull : { revenueGrowthAdj: 0.02, marginAdj: 0.015, waccAdj: -0.0075, termGrowthAdj: 0.005 };
    const bearParams = advancedScenarioMode ? customScenarioParams.bear : { revenueGrowthAdj: -0.02, marginAdj: -0.015, waccAdj: 0.01, termGrowthAdj: -0.005 };
    const bullInputs = {
      ...inputs,
      revenueGrowth: inputs.revenueGrowth.map((g: number) => g + bullParams.revenueGrowthAdj),
      ebitMargin: inputs.ebitMargin.map((m: number) => m + bullParams.marginAdj),
      riskFreeRate: inputs.riskFreeRate + bullParams.waccAdj,
      perpetualGrowth: Math.max(0.005, Math.min(inputs.perpetualGrowth + bullParams.termGrowthAdj, inputs.riskFreeRate + bullParams.waccAdj - 0.01))
    };
    const bearInputs = {
      ...inputs,
      revenueGrowth: inputs.revenueGrowth.map((g: number) => g + bearParams.revenueGrowthAdj),
      ebitMargin: inputs.ebitMargin.map((m: number) => m + bearParams.marginAdj),
      riskFreeRate: inputs.riskFreeRate + bearParams.waccAdj,
      perpetualGrowth: Math.max(0.005, Math.min(inputs.perpetualGrowth + bearParams.termGrowthAdj, inputs.riskFreeRate + bearParams.waccAdj - 0.01))
    };
    const bullOutputs = calculateDCF(bullInputs);
    const bearOutputs = calculateDCF(bearInputs);
    return { ...outputs, bull: bullOutputs, bear: bearOutputs };
  };

  // Save DCF Model
  const saveDCFModel = async () => {
    if (!modelName.trim()) {
      alert('Please enter a name for this model');
      return;
    }

    setIsSaving(true);
    try {
      const outputsToSave = getOutputsWithScenarios();
      // Merge company overview data into financialData for research report auto-population
      const enrichedFinancialData = financialData ? {
        ...financialData,
        sector: selectedCompany?.sector || financialData.sector,
        industry: selectedCompany?.industry || financialData.industry,
        fiscalYearEnd: selectedCompany?.fiscalYearEnd,
        week52High: selectedCompany?.week52High,
        week52Low: selectedCompany?.week52Low,
        sharesOutstanding: selectedCompany?.sharesOutstanding,
      } : null;
      
      console.log('Saving DCF model with financialData:', {
        hasPriceHistory: !!enrichedFinancialData?.priceHistory,
        priceHistoryLength: enrichedFinancialData?.priceHistory?.length || 0,
        hasQuarterlyEPS: !!enrichedFinancialData?.quarterlyEPS,
        quarterlyEPSLength: enrichedFinancialData?.quarterlyEPS?.length || 0
      });
      
      const response = await fetch('/api/dcf-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: inputs.ticker,
          companyName: inputs.companyName,
          inputs: {
            ...inputs,
            ...(compsIncludeInResearch && compsData.length > 0 ? { comps: compsData } : {}),
          },
          outputs: outputsToSave,
          financialData: enrichedFinancialData,
          name: modelName,
        }),
      });

      if (!response.ok) throw new Error('Failed to save model');

      const savedModel = await response.json();
      setSavedModelId(savedModel.id);
      setShowSaveModal(false);
      alert('DCF model saved successfully!');
    } catch (error) {
      console.error('Error saving DCF model:', error);
      alert('Failed to save DCF model');
    } finally {
      setIsSaving(false);
    }
  };

  // Update existing DCF Model
  const updateDCFModel = async () => {
    if (!savedModelId) return;
    
    console.log('Updating DCF model - financialData has priceHistory:', !!financialData?.priceHistory, 'length:', financialData?.priceHistory?.length || 0);

    setIsSaving(true);
    try {
      const outputsToSave = getOutputsWithScenarios();
      // Merge company overview data into financialData for research report auto-population
      const enrichedFinancialData = financialData ? {
        ...financialData,
        sector: selectedCompany?.sector || financialData.sector,
        industry: selectedCompany?.industry || financialData.industry,
        fiscalYearEnd: selectedCompany?.fiscalYearEnd,
        week52High: selectedCompany?.week52High,
        week52Low: selectedCompany?.week52Low,
        sharesOutstanding: selectedCompany?.sharesOutstanding,
      } : null;
      
      const response = await fetch(`/api/dcf-models/${savedModelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: {
            ...inputs,
            ...(compsIncludeInResearch && compsData.length > 0 ? { comps: compsData } : {}),
          },
          outputs: outputsToSave,
          financialData: enrichedFinancialData,
        }),
      });

      if (!response.ok) throw new Error('Failed to update model');

      alert('DCF model updated successfully!');
    } catch (error) {
      console.error('Error updating DCF model:', error);
      alert('Failed to update DCF model');
    } finally {
      setIsSaving(false);
    }
  };

  // Company selection and analysis
  const handleCompanySelect = async (company: CompanyOverview) => {
    setSelectedCompany(company);
    setAnalysisError(null);
    // Automatically run analysis for the selected company
    await runFullAnalysis(company.symbol);
  };

  const runFullAnalysis = async (ticker: string) => {
    console.log('🚀 runFullAnalysis called with ticker:', ticker);
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      console.log('Starting full analysis for ticker:', ticker);

      // Validate ticker format
      if (!ticker || ticker.length < 1 || ticker.length > 5) {
        throw new Error(`Invalid ticker symbol: ${ticker}. Please use a valid stock symbol like AAPL or TSLA.`);
      }

      // Fetch all data in parallel with better error handling
      const fetchWithError = async (url: string, name: string) => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          return data;
        } catch (error) {
          console.error(`Failed to fetch ${name}:`, error);
          throw new Error(`Failed to fetch ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      let overview, quote, income, balance, cashflow, earnings, timeSeries;
      try {
        // Fetch in batches to avoid Alpha Vantage rate limit (5 requests/second)
        // Batch 1: Core financial data (5 requests)
        [overview, quote, income, balance, cashflow] = await Promise.all([
          fetchWithError(`/api/alpha-vantage/overview/${encodeURIComponent(ticker)}`, 'company overview'),
          fetchWithError(`/api/alpha-vantage/quote/${encodeURIComponent(ticker)}`, 'stock quote'),
          fetchWithError(`/api/alpha-vantage/income-statement/${encodeURIComponent(ticker)}`, 'income statement'),
          fetchWithError(`/api/alpha-vantage/balance-sheet/${encodeURIComponent(ticker)}`, 'balance sheet'),
          fetchWithError(`/api/alpha-vantage/cash-flow/${encodeURIComponent(ticker)}`, 'cash flow statement')
        ]);
        
        // Wait 1 second to avoid burst pattern (Alpha Vantage is strict about this)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Batch 2: Earnings (1 request)
        earnings = await fetchWithError(`/api/alpha-vantage/earnings/${encodeURIComponent(ticker)}`, 'earnings data');
        
        // Wait another second before time series (this endpoint is particularly sensitive)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Batch 3: Price data (1 request)
        timeSeries = await fetchWithError(`/api/alpha-vantage/time-series/${encodeURIComponent(ticker)}`, 'price history');
        
        console.log('Price history data received:', {
          hasPriceData: !!timeSeries?.priceData,
          priceDataLength: timeSeries?.priceData?.length || 0
        });
      } catch (fetchError) {
        // If any fetch fails, set debug info with the error
        setDebugInfo({
          ticker,
          error: fetchError instanceof Error ? fetchError.message : 'Network error during data fetch',
          timestamp: new Date().toISOString()
        });
        throw fetchError;
      }

      // Check for API errors
      if (overview.error) {
        throw new Error(`Company overview error: ${overview.details || overview.error}`);
      }
      if (!overview.symbol && !overview.Symbol) {
        throw new Error(`No data found for ticker "${ticker}". Please check the symbol and try again.`);
      }

      console.log('API responses received:', {
        overview: !!(overview.symbol || overview.Symbol),
        quote: !!quote['Global Quote'],
        income: !!income.annualReports,
        balance: !!balance.annualReports,
        cashflow: !!cashflow.annualReports,
        earnings: !!earnings?.quarterlyEarnings,
        timeSeries: !!timeSeries?.priceData
      });

      console.log('API response details:', {
        overview: { symbol: overview.symbol, error: overview.error },
        quote: { hasQuote: !!quote['Global Quote'], error: quote.error },
        income: { hasReports: !!income.annualReports, error: income.error },
        balance: { hasReports: !!balance.annualReports, error: balance.error },
        cashflow: { hasReports: !!cashflow.annualReports, error: cashflow.error },
        earnings: { hasEarnings: !!earnings?.quarterlyEarnings, count: earnings?.quarterlyEarnings?.length || 0 },
        timeSeries: { hasPriceData: !!timeSeries?.priceData, count: timeSeries?.priceData?.length || 0 }
      });

      // Check for critical errors (overview and quote are required)
      if (overview.error || quote.error) {
        throw new Error(
          overview.error?.details ||
          quote.error?.details ||
          'Failed to fetch company overview or quote'
        );
      }
      
      // Log warnings for non-critical errors but continue
      if (income.error) console.warn('Income statement fetch failed:', income.error);
      if (balance.error) console.warn('Balance sheet fetch failed:', balance.error);
      if (cashflow.error) console.warn('Cash flow statement fetch failed:', cashflow.error);
      
      // Check if we have enough data to proceed with DCF
      const hasFinancialStatements = income.annualReports && balance.annualReports && cashflow.annualReports;
      if (!hasFinancialStatements) {
        console.warn('Missing financial statements - will only populate price history and company info');
      }

      // Set company overview so Investor Snapshot and rest of app have PE ratios and company info
      setSelectedCompany(overview);

      // Process and combine the data (will return empty arrays if statements missing)
      const processedData = processAlphaVantageData(overview, quote, income, balance, cashflow);
      
      // Calculate price performance from time series
      const pricePerformance = calculatePricePerformance(timeSeries?.priceData || []);
      
      console.log('Time series data received:', {
        hasTimeSeries: !!timeSeries,
        hasPriceData: !!timeSeries?.priceData,
        priceDataLength: timeSeries?.priceData?.length || 0,
        sampleData: timeSeries?.priceData?.slice(0, 2)
      });
      
      // Enrich financial data with EPS, PE ratios, dividend yield, and price performance
      const enrichedData: ExtractedFinancials = {
        ...processedData,
        peRatio: overview.peRatio,
        forwardPEConsensus: overview.forwardPE, // Analyst consensus from API
        dividendYield: overview.dividendYield ? overview.dividendYield * 100 : undefined, // Convert to percentage
        dilutedEPSTTM: overview.dilutedEPSTTM,
        quarterlyEPS: earnings?.quarterlyEarnings?.slice(0, 12) || [], // Last 12 quarters
        pricePerformance: pricePerformance,
        priceHistory: timeSeries?.priceData?.slice(0, 365).map((d: any) => ({ date: d.date, close: d.close })) || []
      };
      
      console.log('Enriched data priceHistory:', enrichedData.priceHistory?.length || 0, 'data points');
      
      setFinancialData(enrichedData);
      setQuote(quote);
      setEarningsData(earnings);
      setPriceHistory(timeSeries);

      console.log('Processed financial data:', enrichedData);

      // Auto-populate DCF inputs with the financial data
      // Pass processedData directly to avoid race condition with state update
      autoPopulateFromFinancials(quote, processedData);

      console.log('DCF inputs auto-populated from financial data');

    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setAnalysisError(errorMessage);

      // Store debug info for troubleshooting (only if not already set)
      if (!debugInfo || debugInfo.ticker !== ticker) {
        setDebugInfo({
          ticker,
          error: errorMessage,
          timestamp: new Date().toISOString()
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parseFactSetFiles = async (incomeFile: File, cashFlowFile: File, balanceFile: File): Promise<ExtractedFinancials> => {
    try {
      // Read all three Excel files
      const [incomeData, cashFlowData, balanceData] = await Promise.all([
        readExcelFile(incomeFile),
        readExcelFile(cashFlowFile),
        readExcelFile(balanceFile)
      ]);

      // Extract company info from the income statement file
      const companyName = extractCompanyName(incomeData);
      const ticker = extractTicker(incomeData);
      const periods = extractPeriods(incomeData);

      console.log('Extracted periods:', periods);
      console.log('Company:', companyName, 'Ticker:', ticker);

      // Extract financial metrics with better error handling
      const metrics = {
        revenue: extractMetric(incomeData, 'Sales'),
        ebit: extractMetric(incomeData, 'EBIT'),
        netIncome: extractMetric(incomeData, 'Net Income'),
        depreciation: extractMetric(incomeData, 'Depreciation & Amortization') ||
                     extractMetric(incomeData, 'Depreciation'),

        totalAssets: extractMetric(balanceData, 'Total Assets'),
        totalLiabilities: extractMetric(balanceData, 'Total Liabilities'),
        shareholdersEquity: extractMetric(balanceData, 'Total Shareholders\' Equity') ||
                           extractMetric(balanceData, 'Total Equity'),
        cashAndEquivalents: extractMetric(balanceData, 'Cash & Short-Term Investments') ||
                           extractMetric(balanceData, 'Cash Only'),
        totalDebt: extractMetric(balanceData, 'Total Debt') ||
                  extractMetric(balanceData, 'Long-Term Debt'),
        currentAssets: extractMetric(balanceData, 'Total Current Assets'),
        currentLiabilities: extractMetric(balanceData, 'Total Current Liabilities'),

        capex: extractMetric(cashFlowData, 'Capital Expenditures'),
        depreciation_cf: extractMetric(cashFlowData, 'Depreciation')
      };

      console.log('Extracted metrics:', Object.fromEntries(
        Object.entries(metrics).map(([key, value]) => [key, value ? value.length : 0])
      ));

      // Calculate derived metrics
      const ebitda = metrics.ebit && metrics.depreciation
        ? metrics.ebit.map((e, i) => e + (metrics.depreciation![i] || 0))
        : metrics.ebit || [];

      const workingCapital = metrics.currentAssets && metrics.currentLiabilities
        ? metrics.currentAssets.map((ca, i) => ca - (metrics.currentLiabilities![i] || 0))
        : [];

      // Ensure all arrays have the same length (use the minimum available periods)
      const minLength = Math.min(...Object.values(metrics)
        .filter(arr => arr && arr.length > 0)
        .map(arr => arr!.length));

      const normalizeArray = (arr: number[] | null): number[] => {
        if (!arr || arr.length === 0) return [];
        return arr.slice(0, minLength);
      };

      return {
        companyName: companyName || 'Unknown Company',
        ticker: ticker || 'TICKER',
        periods: periods.slice(0, minLength) || [],
        revenue: normalizeArray(metrics.revenue),
        ebit: normalizeArray(metrics.ebit),
        ebitda: normalizeArray(ebitda),
        netIncome: normalizeArray(metrics.netIncome),
        totalAssets: normalizeArray(metrics.totalAssets),
        totalLiabilities: normalizeArray(metrics.totalLiabilities),
        shareholdersEquity: normalizeArray(metrics.shareholdersEquity),
        cashAndEquivalents: normalizeArray(metrics.cashAndEquivalents),
        totalDebt: normalizeArray(metrics.totalDebt),
        capex: normalizeArray(metrics.capex),
        depreciation: normalizeArray(metrics.depreciation || metrics.depreciation_cf),
        workingCapital: normalizeArray(workingCapital),
        currentAssets: normalizeArray(metrics.currentAssets),
        currentLiabilities: normalizeArray(metrics.currentLiabilities),
      };
    } catch (error) {
      console.error('Excel parsing error:', error);
      throw new Error(`Failed to parse Excel files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Helper function to read Excel file
  const readExcelFile = (file: File): Promise<any[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          resolve(jsonData as any[][]);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Extract company name from Excel data
  const extractCompanyName = (data: any[][]): string | null => {
    // Look for company name in the first few rows
    for (let i = 0; i < Math.min(10, data.length); i++) {
      for (let j = 0; j < data[i].length; j++) {
        const cell = data[i][j];
        if (typeof cell === 'string' && (cell.includes('Inc.') || cell.includes('Corp') || cell.includes('Ltd') || cell.includes('Company'))) {
          return cell.trim();
        }
      }
    }
    return null;
  };

  // Extract ticker from Excel data
  const extractTicker = (data: any[][]): string | null => {
    // Look for ticker in the first few rows
    for (let i = 0; i < Math.min(10, data.length); i++) {
      for (let j = 0; j < data[i].length; j++) {
        const cell = data[i][j];
        if (typeof cell === 'string' && /^\s*[A-Z]{1,5}\s*$/.test(cell.trim())) {
          return cell.trim();
        }
      }
    }
    return null;
  };

  // Extract periods from Excel data
  const extractPeriods = (data: any[][]): string[] => {
    // Look for period headers (usually in row 6-9, can be SEP '24, DEC '23, etc.)
    for (let i = 5; i < Math.min(15, data.length); i++) {
      const row = data[i];
      if (row && row.length > 2) {
        const periods: string[] = [];
        for (let j = 1; j < row.length; j++) {
          const cell = row[j];
          if (cell && typeof cell === 'string' &&
              (cell.includes("'") || cell.includes('LTM') || cell.includes('FY'))) {
            // Handle various period formats: SEP '24, DEC '23, FY2024, LTM, etc.
            periods.push(cell.trim());
          }
        }
        // Look for patterns like SEP '24, DEC '23, etc.
        const periodPattern = periods.filter(p =>
          /\b(SEP|DEC|MAR|JUN|AUG|NOV|JAN|FEB|APR|MAY|JUL|OCT|FY|LTM)\b/.test(p)
        );
        if (periodPattern.length >= 3) {
          return periodPattern;
        }
      }
    }
    return [];
  };

  // Create a dataframe-like structure from Excel data
  const createDataFrame = (data: any[][]): { [key: string]: number[] } => {
    const periods = extractPeriods(data);
    if (periods.length === 0) return {};

    // Find the data start row (after periods row)
    let dataStartRow = -1;
    for (let i = 8; i < Math.min(15, data.length); i++) {
      const row = data[i];
      if (row && row.length > 0 && typeof row[0] === 'string' && row[0].trim()) {
        // Check if this looks like a metric name (not empty, not a header)
        const cell = row[0].trim();
        if (cell && !cell.includes('Source:') && !cell.includes('Restate') && cell.length > 2) {
          dataStartRow = i;
          break;
        }
      }
    }

    if (dataStartRow === -1) return {};

    const dataframe: { [key: string]: number[] } = {};

    // Extract data rows
    for (let i = dataStartRow; i < data.length; i++) {
      const row = data[i];
      if (row && row.length > 1 && typeof row[0] === 'string') {
        const metricName = row[0].trim();
        if (metricName && !metricName.includes('Total') && metricName.length > 2) {
          const values: number[] = [];

          // Extract values for each period
          for (let j = 1; j <= periods.length && j < row.length; j++) {
            const cell = row[j];
            if (typeof cell === 'number' && !isNaN(cell) && isFinite(cell)) {
              values.push(cell);
            } else if (typeof cell === 'string') {
              // Try to parse string numbers
              const parsed = parseFloat(cell.replace(/,/g, ''));
              if (!isNaN(parsed) && isFinite(parsed)) {
                values.push(parsed);
              }
            }
          }

          if (values.length >= Math.min(3, periods.length)) {
            dataframe[metricName] = values;
          }
        }
      }
    }

    return dataframe;
  };

  // Extract metric values from Excel data
  const extractMetric = (data: any[][], metricName: string): number[] | null => {
    const dataframe = createDataFrame(data);

    // Try exact match first
    if (dataframe[metricName]) {
      return dataframe[metricName];
    }

    // Try partial matches
    for (const [key, values] of Object.entries(dataframe)) {
      if (key.toLowerCase().includes(metricName.toLowerCase()) ||
          metricName.toLowerCase().includes(key.toLowerCase())) {
        return values;
      }
    }

    // Try common variations
    const variations = {
      'Sales': ['Revenue', 'Total Revenue', 'Net Sales'],
      'EBIT': ['Operating Income', 'EBIT', 'Earnings Before Interest and Taxes'],
      'Net Income': ['Net Earnings', 'Net Profit', 'Profit After Tax'],
      'Capital Expenditures': ['CapEx', 'Capital Expense', 'Property Plant Equipment'],
      'Depreciation': ['Depreciation & Amortization', 'D&A', 'Depreciation Expense'],
      'Total Assets': ['Assets', 'Total Assets'],
      'Total Liabilities': ['Liabilities', 'Total Liabilities'],
      'Total Shareholders\' Equity': ['Shareholders Equity', 'Equity', 'Stockholders Equity'],
      'Cash & Short-Term Investments': ['Cash', 'Cash and Equivalents', 'Cash & ST Investments'],
      'Total Current Assets': ['Current Assets'],
      'Total Current Liabilities': ['Current Liabilities']
    };

    if (variations[metricName as keyof typeof variations]) {
      for (const variation of variations[metricName as keyof typeof variations]) {
        for (const [key, values] of Object.entries(dataframe)) {
          if (key.toLowerCase().includes(variation.toLowerCase())) {
            return values;
          }
        }
      }
    }

    return null;
  };

  // Process Alpha Vantage data into our format
  const processAlphaVantageData = (
    overview: any,
    quote: any,
    income: any,
    balance: any,
    cashflow: any
  ): ExtractedFinancials => {
    // Alpha Vantage returns data newest → oldest. Keep consistent ordering.
    // Extract periods from annual reports (newest → oldest)
    const periods = income.annualReports?.map((report: any) => report.fiscalDateEnding) || [];

    // Extract financial metrics with proper numeric conversion
    const revenue = income.annualReports?.map((report: any) => toNum(report.totalRevenue)) || [];
    const ebit = income.annualReports?.map((report: any) => toNum(report.ebit)) || [];
    const ebitda = income.annualReports?.map((report: any) => toNum(report.ebitda)) || [];
    const netIncome = income.annualReports?.map((report: any) => toNum(report.netIncome)) || [];

    // Balance sheet data
    const totalAssets = balance.annualReports?.map((report: any) => toNum(report.totalAssets)) || [];
    const totalLiabilities = balance.annualReports?.map((report: any) => toNum(report.totalLiabilities)) || [];
    const shareholdersEquity = balance.annualReports?.map((report: any) => toNum(report.totalShareholderEquity)) || [];
    const cashAndEquivalents = balance.annualReports?.map((report: any) =>
      toNum(report.cashAndCashEquivalentsAtCarryingValue ?? report.cashAndShortTermInvestments)
    ) || [];
    const totalDebt = balance.annualReports?.map((report: any) => {
      // Sum all debt components: long-term debt, short-term debt, current debt
      // Convert to numbers first to avoid string concatenation
      const longTerm = toNum(report.longTermDebt ?? report.longTermDebtNoncurrent);
      const shortTerm = toNum(report.shortTermDebt ?? report.shortLongTermDebtTotal);
      const currentDebt = toNum(report.currentDebt ?? report.currentLongTermDebt);
      return longTerm + shortTerm + currentDebt;
    }) || [];

    // Cash flow data
    const capex = cashflow.annualReports?.map((report: any) => Math.abs(toNum(report.capitalExpenditures))) || [];
    const depreciation = income.annualReports?.map((report: any) => toNum(report.depreciationAndAmortization)) || [];

    // Calculate working capital (Current Assets - Current Liabilities)
    const currentAssets = balance.annualReports?.map((report: any) => toNum(report.totalCurrentAssets)) || [];
    const currentLiabilities = balance.annualReports?.map((report: any) => toNum(report.totalCurrentLiabilities)) || [];
    const workingCapital = currentAssets.map((ca: number, i: number) => ca - (currentLiabilities[i] || 0));

    return {
      companyName: overview.name ?? overview.Name,
      ticker: overview.symbol ?? overview.Symbol,
      periods,
      revenue,
      ebit,
      ebitda,
      netIncome,
      totalAssets,
      totalLiabilities,
      shareholdersEquity,
      cashAndEquivalents,
      totalDebt,
      capex,
      depreciation,
      workingCapital,
      currentAssets,
      currentLiabilities,
    };
  };

  const autoPopulateFromFinancials = (quote?: any, processedData?: ExtractedFinancials) => {
    console.log('🔄 autoPopulateFromFinancials called');
    const dataToUse = processedData || financialData;
    if (!dataToUse) {
      console.log('No financial data available for auto-population');
      return;
    }

    console.log('Financial data for auto-population:', dataToUse);

    // Validate data availability
    if (!dataToUse.revenue || dataToUse.revenue.length === 0) {
      console.error('No revenue data available');
      return;
    }

    // Calculate historical growth rates (most recent 2-3 years for stability)
    let revenueGrowth = 0.05; // Default
    if (dataToUse.revenue.length >= 2) {
      // Data is newest → oldest. Take first 3 (most recent) and reverse for CAGR calculation (oldest → newest)
      const recentRevenue = dataToUse.revenue.slice(0, 3).reverse(); // First 3 years, reversed to oldest→newest
      const growthRates = [];
      for (let i = 1; i < recentRevenue.length; i++) {
        if (recentRevenue[i-1] > 0) {
          growthRates.push((recentRevenue[i] - recentRevenue[i-1]) / recentRevenue[i-1]);
        }
      }
      if (growthRates.length > 0) {
        revenueGrowth = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
        console.log('Individual growth rates:', growthRates.map(r => (r * 100).toFixed(1) + '%'));
        console.log('Average growth rate before capping:', (revenueGrowth * 100).toFixed(1) + '%');
        // Cap extreme growth rates
        revenueGrowth = Math.max(-0.5, Math.min(0.5, revenueGrowth));
        console.log('Final growth rate after capping:', (revenueGrowth * 100).toFixed(1) + '%');
      }
    }

    // Calculate EBIT margin from recent years
    let avgEbitMargin = 0.10; // Default
    if (dataToUse.ebit.length > 0 && dataToUse.revenue.length > 0) {
      const recentMargins = [];
      const minLength = Math.min(dataToUse.ebit.length, dataToUse.revenue.length, 3);
      // Use most recent years for margin calculation
      for (let i = 0; i < minLength; i++) {
        if (dataToUse.revenue[i] > 0) {
          recentMargins.push(dataToUse.ebit[i] / dataToUse.revenue[i]);
        }
      }
      if (recentMargins.length > 0) {
        avgEbitMargin = recentMargins.reduce((sum, margin) => sum + margin, 0) / recentMargins.length;
        avgEbitMargin = Math.max(0.01, Math.min(0.50, avgEbitMargin)); // Reasonable bounds
      }
    }

    // Calculate effective tax rate
    let avgTaxRate = 0.25; // Default
    if (dataToUse.ebit.length > 0 && dataToUse.netIncome.length > 0) {
      const taxRates = [];
      const minLength = Math.min(dataToUse.ebit.length, dataToUse.netIncome.length, 3);
      for (let i = 0; i < minLength; i++) {
        if (dataToUse.ebit[i] > 0) {
          const taxRate = 1 - (dataToUse.netIncome[i] / dataToUse.ebit[i]);
          if (taxRate >= 0 && taxRate <= 0.5) { // Reasonable tax rate bounds
            taxRates.push(taxRate);
          }
        }
      }
      if (taxRates.length > 0) {
        avgTaxRate = taxRates.reduce((sum, rate) => sum + rate, 0) / taxRates.length;
      }
    }

    // Calculate capital expenditure intensity
    let avgCapexRate = 0.08; // Default
    if (dataToUse.capex.length > 0 && dataToUse.revenue.length > 0) {
      const capexRates = [];
      const minLength = Math.min(dataToUse.capex.length, dataToUse.revenue.length, 3);
      for (let i = 0; i < minLength; i++) {
        if (dataToUse.revenue[i] > 0) {
          capexRates.push(Math.abs(dataToUse.capex[i]) / dataToUse.revenue[i]);
        }
      }
      if (capexRates.length > 0) {
        avgCapexRate = capexRates.reduce((sum, rate) => sum + rate, 0) / capexRates.length;
        avgCapexRate = Math.max(0.01, Math.min(0.30, avgCapexRate)); // Reasonable bounds
      }
    }

    // Calculate depreciation rate
    let avgDepreciationRate = 0.05; // Default
    if (dataToUse.depreciation.length > 0 && dataToUse.revenue.length > 0) {
      const depRates = [];
      const minLength = Math.min(dataToUse.depreciation.length, dataToUse.revenue.length, 3);
      for (let i = 0; i < minLength; i++) {
        if (dataToUse.revenue[i] > 0) {
          depRates.push(Math.abs(dataToUse.depreciation[i]) / dataToUse.revenue[i]);
        }
      }
      if (depRates.length > 0) {
        avgDepreciationRate = depRates.reduce((sum, rate) => sum + rate, 0) / depRates.length;
        avgDepreciationRate = Math.max(0.01, Math.min(0.20, avgDepreciationRate)); // Reasonable bounds
      }
    }

    // Calculate capital structure and WACC
    const totalDebt = dataToUse.totalDebt.length > 0 ? Math.abs(dataToUse.totalDebt[0]) : 0;
    const equity = dataToUse.shareholdersEquity.length > 0 ? Math.abs(dataToUse.shareholdersEquity[0]) : 1;
    const totalCapital = totalDebt + equity;

    // Estimate cost of debt (simplified - could be improved with actual interest expense)
    const costOfDebt = 0.05 + (totalDebt / totalCapital) * 0.02; // Base rate + leverage premium

    // Estimate WACC
    const riskFreeRate = inputs.riskFreeRate; // Use input value
    const equityRiskPremium = inputs.equityRiskPremium; // Use input value
    const beta = selectedCompany?.beta || inputs.beta; // Use actual beta from API or input
    const costOfEquity = riskFreeRate + beta * equityRiskPremium;
    const afterTaxCostOfDebt = costOfDebt * (1 - avgTaxRate);
    const wacc = (equity / totalCapital) * costOfEquity + (totalDebt / totalCapital) * afterTaxCostOfDebt;

    console.log('Calculated DCF assumptions:', {
      revenueGrowth: (revenueGrowth * 100).toFixed(1) + '%',
      ebitMargin: (avgEbitMargin * 100).toFixed(1) + '%',
      taxRate: (avgTaxRate * 100).toFixed(1) + '%',
      capexRate: (avgCapexRate * 100).toFixed(1) + '%',
      depreciationRate: (avgDepreciationRate * 100).toFixed(1) + '%',
      wacc: (wacc * 100).toFixed(1) + '%',
      totalDebt: (totalDebt / 1000000).toFixed(0) + 'M',
      equity: (equity / 1000000).toFixed(0) + 'M',
      startingRevenue: (dataToUse.revenue[0] / 1000000).toFixed(0) + 'M'
    });

    // Create growth profile with deceleration (typical DCF approach)
    const growthProfile = [
      revenueGrowth, // Year 1
      revenueGrowth * 0.9, // Year 2 - slight deceleration
      revenueGrowth * 0.8, // Year 3
      revenueGrowth * 0.7, // Year 4
      revenueGrowth * 0.6  // Year 5 - approaching terminal growth
    ];

    // Update inputs with comprehensive assumptions
    const updatedInputs = {
      ...inputs,
      companyName: dataToUse.companyName || inputs.companyName,
      ticker: dataToUse.ticker || inputs.ticker,
      currentPrice: quote?.price || inputs.currentPrice,
      sharesOutstanding: selectedCompany?.sharesOutstanding || inputs.sharesOutstanding || 100000000,
      sharesDiluted: selectedCompany?.sharesOutstanding ? selectedCompany.sharesOutstanding * 1.05 : inputs.sharesDiluted || 105000000,
      totalDebt: totalDebt,
      cashEquivalents: dataToUse.cashAndEquivalents.length > 0 ? dataToUse.cashAndEquivalents[0] : 0,
      startingRevenue: dataToUse.revenue[0],
      revenueGrowth: growthProfile,
      ebitMargin: Array(5).fill(avgEbitMargin),
      capexPercentOfRevenue: avgCapexRate,
      depreciationPercentOfRevenue: avgDepreciationRate,
      cashTaxRate: avgTaxRate,
      riskFreeRate: riskFreeRate,
      equityRiskPremium: equityRiskPremium,
      beta: beta,
      targetDebtRatio: totalDebt / totalCapital,
      costOfDebt: costOfDebt,
      perpetualGrowth: Math.max(0.015, Math.min(0.04, riskFreeRate - 0.01)), // Conservative terminal growth
    };

    console.log('About to update DCF inputs with:', {
      companyName: updatedInputs.companyName,
      ticker: updatedInputs.ticker,
      currentPrice: updatedInputs.currentPrice,
      sharesOutstanding: (updatedInputs.sharesOutstanding / 1000000).toFixed(0) + 'M',
      totalDebt: (updatedInputs.totalDebt / 1000000).toFixed(0) + 'M',
      cashEquivalents: (updatedInputs.cashEquivalents / 1000000).toFixed(0) + 'M',
      startingRevenue: (updatedInputs.startingRevenue / 1000000).toFixed(0) + 'M',
      revenueGrowth: updatedInputs.revenueGrowth.map(g => (g * 100).toFixed(1) + '%'),
      ebitMargin: updatedInputs.ebitMargin.map(m => (m * 100).toFixed(1) + '%'),
      perpetualGrowth: (updatedInputs.perpetualGrowth * 100).toFixed(1) + '%'
    });

    setInputs(normalizeInputsForForecastYears(updatedInputs));
    console.log('DCF inputs updated successfully:', updatedInputs);

    // Force recalculation by triggering useEffect
    setTimeout(() => {
      setForceRecalc(prev => prev + 1);
      console.log('✅ DCF recalculation triggered');
    }, 100);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/tools" className="p-2 text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">DCF Valuation Tool</h1>
          <p className="text-muted-foreground">
            Professional discounted cash flow analysis for equity valuation
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 flex-wrap">
        <Button onClick={loadExample} variant="outline" className="text-gray-700">
          Load Example Company
        </Button>
        <Button onClick={resetInputs} variant="outline" className="text-gray-700">
          Reset Assumptions
        </Button>
        
        
        <Button 
          onClick={() => setShowSaveModal(true)} 
          className="flex items-center bg-purple-600 text-white hover:bg-purple-700"
          disabled={!inputs.ticker || !inputs.companyName}
        >
          <Save className="w-4 h-4 mr-2" />
          {savedModelId ? 'Update Model' : 'Save Model'}
        </Button>
        
        {savedModelId && (
          <Button 
            onClick={() => router.push(`/dashboard/research/new?dcfModelId=${savedModelId}`)} 
            className="flex items-center bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            Create Research Report
          </Button>
        )}

        <Button onClick={() => exportToCSV(inputs, outputs)} className="flex items-center bg-blue-600 text-white hover:bg-blue-700">
          <Download className="w-4 h-4 mr-2" />
          📊 Export CSV
        </Button>
        <Button onClick={() => exportToExcel(inputs, outputs, financialData, selectedCompany)} className="flex items-center bg-green-600 text-white hover:bg-green-700">
          <Download className="w-4 h-4 mr-2" />
          📈 Export Excel
        </Button>
        <Button onClick={() => printSnapshot(inputs, outputs)} variant="outline" className="text-gray-700">
          Print Snapshot
        </Button>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Save DCF Model</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Model Name</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder={`${inputs.ticker} - ${new Date().toLocaleDateString()}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  onClick={() => setShowSaveModal(false)} 
                  variant="outline"
                  className="text-gray-700"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={savedModelId ? updateDCFModel : saveDCFModel} 
                  disabled={isSaving}
                  className="bg-purple-600 text-white hover:bg-purple-700"
                >
                  {isSaving ? 'Saving...' : 'Save Model'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage saved models (all users: own list; admin: can show all and delete any) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <List className="w-5 h-5 mr-2" />
            Manage saved models
          </CardTitle>
          <CardDescription>
            View and delete saved DCF models to keep the list clean.
            {isAdmin && ' As admin you can toggle to see all users\' models.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAdmin && (
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={showAllModels}
                onChange={(e) => setShowAllModels(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Show all models (all users)</span>
            </label>
          )}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {manageModelsList.length === 0 ? (
              <p className="text-sm text-gray-500">No saved models.</p>
            ) : (
              manageModelsList.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-gray-50 border border-gray-100"
                >
                  <div>
                    <span className="font-medium">{m.name}</span>
                    <span className="text-gray-500 text-sm ml-2">{m.ticker} • {new Date(m.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => deleteDCFModel(m.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-3 text-gray-700" onClick={fetchManageModels}>
            Refresh list
          </Button>
        </CardContent>
      </Card>

      {/* Company Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Company Analysis - Alpha Vantage API
          </CardTitle>
          <CardDescription>
            Search for any public company by ticker symbol. Select from suggestions or type a ticker and click "Run DCF Analysis" to automatically fetch financial data and perform valuation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <TickerSearch
              onSelectCompany={handleCompanySelect}
              onRunAnalysis={runFullAnalysis}
              selectedCompany={selectedCompany}
              isAnalyzing={isAnalyzing}
            />

            {financialData && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  ✅ Successfully loaded financial data for {financialData.companyName || 'Company'}
                  ({financialData.periods.length} periods: {financialData.periods[0]} to {financialData.periods[financialData.periods.length - 1]})
                </p>
                <Button
                  onClick={() => autoPopulateFromFinancials()}
                  className="mt-2"
                  size="sm"
                  variant="outline"
                >
                  Auto-Populate DCF Assumptions
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Custom Tabs Implementation */}
      <div className="space-y-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {([
              { id: 'snapshot' as const, label: 'Investor Snapshot' },
              { id: 'assumptions' as const, label: 'Assumptions' },
              { id: 'valuation' as const, label: 'DCF Valuation' },
              { id: 'charts' as const, label: 'Charts & Analysis' },
              { id: 'sensitivity' as const, label: 'Sensitivity Analysis' },
              { id: 'financials' as const, label: 'Financial Deep Dive' },
              { id: 'comps' as const, label: 'Comps' },
              { id: 'final' as const, label: 'DCF Final' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-6">
          {activeTab === 'snapshot' && (
            <InvestorSnapshot
              companyData={selectedCompany}
              financialData={financialData}
              quoteData={quote}
            />
          )}
          {activeTab === 'assumptions' && (
            <div className="space-y-6">
              {/* Key Assumptions Summary */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-800">
                    <Calculator className="w-5 h-5 mr-2" />
                    DCF Key Assumptions Summary
                  </CardTitle>
                  <CardDescription>
                    Core assumptions driving the valuation model
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {(inputs.revenueGrowth[0] * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Revenue Growth (Yr 1)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {(inputs.ebitMargin[0] * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">EBIT Margin</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {((inputs.riskFreeRate + inputs.beta * inputs.equityRiskPremium) * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Cost of Equity</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {(outputs.wacc * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">WACC</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Input Forms */}
              <DCFInputsForm inputs={inputs} updateInput={updateInput} updateArrayInput={updateArrayInput} />

              {/* Assumption Sources & Methodology */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Info className="w-5 h-5 mr-2 text-blue-600" />
                    Assumption Methodology
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Growth Rates</h4>
                      <p className="text-sm text-gray-600">
                        Derived from historical revenue growth trends, industry averages, and company-specific factors.
                        Terminal growth assumes convergence to long-term GDP growth.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Margins & Tax</h4>
                      <p className="text-sm text-gray-600">
                        EBIT margins based on historical performance and industry benchmarks.
                        Tax rates reflect statutory rates adjusted for permanent differences.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">WACC Components</h4>
                      <p className="text-sm text-gray-600">
                        Risk-free rate based on 10-year Treasury yields. Beta reflects company-specific risk.
                        Cost of debt estimated from capital structure and credit spreads.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Terminal Value</h4>
                      <p className="text-sm text-gray-600">
                        Perpetual growth method preferred for stable companies. Exit multiple used for cyclical businesses.
                        Both methods shown for comparison.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'valuation' && (
            <div className="space-y-6">
              {/* Valuation Summary - Key Outputs */}
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-green-800">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    DCF Valuation Summary
                  </CardTitle>
                  <CardDescription>
                    Key valuation outputs and upside/downside analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-lg border border-green-200">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-1">
                          ${formatNumber(outputs.intrinsicValuePerShare, 2)}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">Intrinsic Value per Share</div>
                        <div className={`text-lg font-semibold ${outputs.upsideDownside >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {outputs.upsideDownside >= 0 ? '+' : ''}{(outputs.upsideDownside * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">vs Current Price</div>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-green-200">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-1">
                          ${(outputs.enterpriseValue / 1000000).toFixed(0)}M
                        </div>
                        <div className="text-sm text-gray-600 mb-2">Enterprise Value</div>
                        <div className="text-lg font-semibold text-blue-600">
                          ${(outputs.equityValue / 1000000).toFixed(0)}M
                        </div>
                        <div className="text-xs text-gray-500">Equity Value</div>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-green-200">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-1">
                          {((outputs.terminalValue / outputs.enterpriseValue) * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 mb-2">Terminal Value % of EV</div>
                        <div className={`text-lg font-semibold ${outputs.terminalValueContribution < 0.8 ? 'text-green-600' : 'text-orange-600'}`}>
                          {outputs.terminalValueContribution < 0.8 ? 'Acceptable' : 'High - Review'}
                        </div>
                        <div className="text-xs text-gray-500">Terminal Value Check</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* EPS Comparison - Our Projection vs Consensus */}
              {(() => {
                const currentPrice = inputs.currentPrice || 0;
                const ttmEPS = financialData?.dilutedEPSTTM || 0;
                const year1GrowthRate = inputs.revenueGrowth?.[0] || 0;
                
                // Calculate our projected EPS using TTM EPS grown by Year 1 growth rate
                const ourProjectedEPS = ttmEPS > 0 ? ttmEPS * (1 + year1GrowthRate) : 0;
                const ourForwardPE = currentPrice > 0 && ourProjectedEPS > 0 ? currentPrice / ourProjectedEPS : null;
                
                // Get consensus from API
                const consensusForwardPE = financialData?.forwardPEConsensus || null;
                const consensusEPS = currentPrice > 0 && consensusForwardPE ? currentPrice / consensusForwardPE : null;
                
                const epsDifference = ourProjectedEPS && consensusEPS ? ((ourProjectedEPS - consensusEPS) / consensusEPS) * 100 : null;
                
                return (ourProjectedEPS > 0 || consensusEPS) ? (
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="flex items-center text-blue-800">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Forward P/E & EPS Comparison
                      </CardTitle>
                      <CardDescription>
                        Our DCF-based projections vs analyst consensus estimates
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                          <div className="text-center">
                            <div className="text-sm text-gray-500 mb-2">Our Projected EPS (Next Year)</div>
                            <div className="text-3xl font-bold text-blue-600 mb-1">
                              ${ourProjectedEPS.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-600 mb-2">Forward P/E: {ourForwardPE ? `${ourForwardPE.toFixed(1)}x` : 'N/A'}</div>
                            <div className="text-xs text-gray-500">TTM EPS: ${ttmEPS.toFixed(2)} × {((year1GrowthRate) * 100).toFixed(1)}% growth</div>
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                          <div className="text-center">
                            <div className="text-sm text-gray-500 mb-2">Consensus EPS Estimate</div>
                            <div className="text-3xl font-bold text-purple-600 mb-1">
                              {consensusEPS ? `$${consensusEPS.toFixed(2)}` : 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600 mb-2">Forward P/E: {consensusForwardPE ? `${consensusForwardPE.toFixed(1)}x` : 'N/A'}</div>
                            <div className="text-xs text-gray-500">From Alpha Vantage API</div>
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                          <div className="text-center">
                            <div className="text-sm text-gray-500 mb-2">Difference</div>
                            <div className={`text-3xl font-bold mb-1 ${epsDifference && epsDifference > 0 ? 'text-green-600' : epsDifference && epsDifference < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                              {epsDifference !== null ? `${epsDifference > 0 ? '+' : ''}${epsDifference.toFixed(1)}%` : 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              {epsDifference !== null && epsDifference > 10 ? 'More bullish than consensus' : 
                               epsDifference !== null && epsDifference < -10 ? 'More bearish than consensus' : 
                               epsDifference !== null ? 'Aligned with consensus' : '—'}
                            </div>
                            <div className="text-xs text-gray-500">Our EPS vs Consensus</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null;
              })()}

              {/* Detailed Cash Flow Analysis */}
              <ValuationSummary inputs={inputs} outputs={outputs} />

              {/* Cash Flow Waterfall */}
              <Card>
                <CardHeader>
                  <CardTitle>Enterprise Value Build</CardTitle>
                  <CardDescription>
                    Step-by-step calculation of enterprise value from cash flows
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium">PV of Explicit FCFF (Years 1-5)</span>
                      <span className="font-bold">${(outputs.pvOfFcff / 1000000).toFixed(0)}M</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium">PV of Terminal Value</span>
                      <span className="font-bold">${(outputs.pvOfTerminalValue / 1000000).toFixed(0)}M</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-t-2 border-t-gray-800">
                      <span className="font-bold text-lg">Enterprise Value</span>
                      <span className="font-bold text-lg">${(outputs.enterpriseValue / 1000000).toFixed(0)}M</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium">Less: Net Debt</span>
                      <span className="font-bold">${((inputs.totalDebt - inputs.cashEquivalents) / 1000000).toFixed(0)}M</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t-2 border-t-green-600">
                      <span className="font-bold text-green-700">Equity Value</span>
                      <span className="font-bold text-green-700">${(outputs.equityValue / 1000000).toFixed(0)}M</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium">Per Share (Diluted)</span>
                      <span className="font-bold">${formatNumber(outputs.intrinsicValuePerShare, 2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Cash Flow Table */}
              <CashFlowTable outputs={outputs} />
            </div>
          )}

          {(activeTab === 'charts' || activeTab === 'sensitivity' || activeTab === 'financials') && (
            <div className="space-y-6">
              {/* Analysis Navigation - Always visible when in analysis tabs */}
              <Card>
                <CardHeader>
                  <CardTitle>DCF Analysis Tools</CardTitle>
                  <CardDescription>
                    Professional visualization and analysis of DCF components
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => setActiveTab('charts')}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        activeTab === 'charts' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <BarChart3 className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                      <div className="text-sm font-medium">FCFF & Value</div>
                    </button>
                    <button
                      onClick={() => setActiveTab('sensitivity')}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        activeTab === 'sensitivity' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
                      <div className="text-sm font-medium">Sensitivity</div>
                    </button>
                    <button
                      onClick={() => setActiveTab('financials')}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        activeTab === 'financials' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <Calculator className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                      <div className="text-sm font-medium">Financials</div>
                    </button>
                    <button className="p-3 rounded-lg border-2 border-gray-200 opacity-50 cursor-not-allowed">
                      <Download className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                      <div className="text-sm font-medium">Export</div>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Show content based on active tab */}
              {activeTab === 'charts' && <DCFCharts inputs={inputs} outputs={outputs} />}
            </div>
          )}

          {activeTab === 'comps' && (
            <DCFComps
              inputs={inputs}
              compsData={compsData}
              setCompsData={setCompsData}
              includeInResearch={compsIncludeInResearch}
              setIncludeInResearch={setCompsIncludeInResearch}
            />
          )}

          {activeTab === 'final' && <DCFFinalPresentation inputs={inputs} outputs={outputs} />}
        </div>
      </div>

      {/* DCF Quality Checks & Implied Multiples */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DCFQualityChecks inputs={inputs} outputs={outputs} />
        <WACCBreakdown inputs={inputs} outputs={outputs} />
      </div>

      {/* DCF Summary & Investment Thesis */}
      <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-800">
            <TrendingUp className="w-5 h-5 mr-2" />
            DCF Valuation Summary & Investment Thesis
          </CardTitle>
          <CardDescription>
            Professional valuation summary with key takeaways and investment implications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Key Metrics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    ${formatNumber(outputs.intrinsicValuePerShare, 2)}
                  </div>
                  <div className="text-sm text-gray-600">Intrinsic Value</div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {outputs.upsideDownside >= 0 ? '+' : ''}{(outputs.upsideDownside * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Upside/Downside</div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {((outputs.terminalValue / outputs.enterpriseValue) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Terminal Value %</div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {(outputs.wacc * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">WACC</div>
                </div>
              </div>
            </div>

            {/* Investment Thesis */}
            <div className="bg-white p-6 rounded-lg border">
              <h4 className="font-semibold text-lg mb-3">Investment Thesis</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Valuation:</span>
                  <span className={`ml-2 ${outputs.upsideDownside >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {inputs.companyName || 'The company'} is currently trading at
                    {outputs.upsideDownside >= 0 ? ` ${(outputs.upsideDownside * 100).toFixed(1)}% below ` : ` ${Math.abs(outputs.upsideDownside * 100).toFixed(1)}% above `}
                    our DCF-derived intrinsic value of ${formatNumber(outputs.intrinsicValuePerShare, 2)} per share.
                  </span>
                </div>

                <div>
                  <span className="font-medium">Key Drivers:</span>
                  <span className="ml-2 text-gray-700">
                    The valuation is most sensitive to {outputs.wacc > 0.12 ? 'WACC assumptions' : inputs.perpetualGrowth < 0.025 ? 'terminal growth rates' : 'revenue growth and margins'}.
                    Terminal value represents {((outputs.terminalValue / outputs.enterpriseValue) * 100).toFixed(1)}% of enterprise value,
                    which is {outputs.terminalValueContribution > 0.8 ? 'relatively high' : outputs.terminalValueContribution > 0.6 ? 'reasonable' : 'conservative'}.
                  </span>
                </div>

                <div>
                  <span className="font-medium">Recommendation:</span>
                  <span className={`ml-2 font-medium ${outputs.upsideDownside >= 0.15 ? 'text-green-600' : outputs.upsideDownside <= -0.15 ? 'text-red-600' : 'text-yellow-600'}`}>
                    {outputs.upsideDownside >= 0.15 ? 'BUY - Significant upside to intrinsic value' :
                     outputs.upsideDownside <= -0.15 ? 'SELL/AVOID - Trading above intrinsic value' :
                     'HOLD - Fairly valued, monitor key assumptions'}
                  </span>
                </div>
              </div>
            </div>

            {/* Methodology Notes */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">DCF Methodology Notes</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Enterprise value calculated using discounted cash flow to firm (FCFF) methodology</li>
                <li>• {inputs.forecastYears}-year explicit forecast period with {inputs.perpetualGrowth.toFixed(1)}% terminal growth</li>
                <li>• WACC of {(outputs.wacc * 100).toFixed(1)}% reflects cost of equity and debt weighted by capital structure</li>
                <li>• All figures in millions except per-share values</li>
                <li>• This analysis is for educational purposes and should not be considered investment advice</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scenario Analysis</CardTitle>
              <CardDescription>
                Bear, Base, and Bull case valuations with different assumptions
              </CardDescription>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={advancedScenarioMode}
                onChange={(e) => setAdvancedScenarioMode(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Advanced Mode</span>
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {/* Scenario Selector */}
          <div className="flex gap-4 mb-6">
            {[
              { key: 'bear', label: 'Bear Case', color: 'text-red-600', bg: 'bg-red-50' },
              { key: 'base', label: 'Base Case', color: 'text-blue-600', bg: 'bg-blue-50' },
              { key: 'bull', label: 'Bull Case', color: 'text-green-600', bg: 'bg-green-50' }
            ].map(({ key, label, color, bg }) => (
              <button
                key={key}
                onClick={() => setSelectedScenario(key as any)}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  selectedScenario === key ? `border-current ${bg} ${color}` : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Advanced Mode: Custom Parameter Adjustments */}
          {advancedScenarioMode && selectedScenario !== 'base' && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-semibold mb-3">Customize {selectedScenario === 'bull' ? 'Bull' : 'Bear'} Case Parameters</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Revenue Growth Adjustment (bps)</label>
                  <NumericInput
                    value={customScenarioParams[selectedScenario].revenueGrowthAdj * 10000}
                    onChange={(n) => setCustomScenarioParams(prev => ({
                      ...prev,
                      [selectedScenario]: { ...prev[selectedScenario], revenueGrowthAdj: n / 10000 }
                    }))}
                    toDisplay={(n) => n.toFixed(0)}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {(customScenarioParams[selectedScenario].revenueGrowthAdj * 100).toFixed(2)}% adjustment
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Operating Margin Adjustment (bps)</label>
                  <NumericInput
                    value={customScenarioParams[selectedScenario].marginAdj * 10000}
                    onChange={(n) => setCustomScenarioParams(prev => ({
                      ...prev,
                      [selectedScenario]: { ...prev[selectedScenario], marginAdj: n / 10000 }
                    }))}
                    toDisplay={(n) => n.toFixed(0)}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {(customScenarioParams[selectedScenario].marginAdj * 100).toFixed(2)}% adjustment
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">WACC Adjustment (bps)</label>
                  <NumericInput
                    value={customScenarioParams[selectedScenario].waccAdj * 10000}
                    onChange={(n) => setCustomScenarioParams(prev => ({
                      ...prev,
                      [selectedScenario]: { ...prev[selectedScenario], waccAdj: n / 10000 }
                    }))}
                    toDisplay={(n) => n.toFixed(0)}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {(customScenarioParams[selectedScenario].waccAdj * 100).toFixed(2)}% adjustment
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Terminal Growth Adjustment (bps)</label>
                  <NumericInput
                    value={customScenarioParams[selectedScenario].termGrowthAdj * 10000}
                    onChange={(n) => setCustomScenarioParams(prev => ({
                      ...prev,
                      [selectedScenario]: { ...prev[selectedScenario], termGrowthAdj: n / 10000 }
                    }))}
                    toDisplay={(n) => n.toFixed(0)}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {(customScenarioParams[selectedScenario].termGrowthAdj * 100).toFixed(2)}% adjustment
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Scenario Results */}
          <div className="space-y-4">
            {(() => {
              const getScenarioInputs = (scenario: 'base' | 'bull' | 'bear') => {
                if (scenario === 'base') return inputs;
                
                const params = advancedScenarioMode ? customScenarioParams[scenario] : (scenario === 'bull' 
                  ? { revenueGrowthAdj: 0.02, marginAdj: 0.015, waccAdj: -0.0075, termGrowthAdj: 0.005 }
                  : { revenueGrowthAdj: -0.02, marginAdj: -0.015, waccAdj: 0.01, termGrowthAdj: -0.005 });
                
                return {
                  ...inputs,
                  revenueGrowth: inputs.revenueGrowth.map(g => g + params.revenueGrowthAdj),
                  ebitMargin: inputs.ebitMargin.map(m => m + params.marginAdj),
                  riskFreeRate: inputs.riskFreeRate + params.waccAdj,
                  perpetualGrowth: Math.max(0.005, Math.min(inputs.perpetualGrowth + params.termGrowthAdj, inputs.riskFreeRate + params.waccAdj - 0.01))
                };
              };

              const scenarioInputs = getScenarioInputs(selectedScenario);
              const scenarioOutputs = calculateDCF(scenarioInputs);
              const upsideDownside = inputs.currentPrice !== 0 ?
                ((scenarioOutputs.intrinsicValuePerShare - inputs.currentPrice) / inputs.currentPrice) * 100 : 0;

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold mb-2">
                      ${formatNumber(scenarioOutputs.intrinsicValuePerShare, 2)}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Intrinsic Value per Share</div>
                    <div className={`text-sm font-medium ${upsideDownside >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {upsideDownside >= 0 ? '+' : ''}{upsideDownside.toFixed(1)}% vs Current Price
                    </div>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold mb-2">
                      ${(scenarioOutputs.enterpriseValue / 1e9).toFixed(1)}B
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Enterprise Value</div>
                    <div className="text-sm text-gray-500">
                      Terminal: {((scenarioOutputs.pvOfTerminalValue / scenarioOutputs.enterpriseValue) * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold mb-2">
                      {(scenarioOutputs.wacc * 100).toFixed(2)}%
                    </div>
                    <div className="text-sm text-gray-600 mb-2">WACC</div>
                    <div className="text-sm text-gray-500">
                      g: {(scenarioInputs.perpetualGrowth * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Scenario Comparison Bar */}
          <div className="mt-6">
            <h4 className="font-semibold mb-3">Scenario Range</h4>
            {(() => {
              const baseOutputs = calculateDCF(inputs);
              
              const bullParams = advancedScenarioMode ? customScenarioParams.bull : { revenueGrowthAdj: 0.02, marginAdj: 0.015, waccAdj: -0.0075, termGrowthAdj: 0.005 };
              const bearParams = advancedScenarioMode ? customScenarioParams.bear : { revenueGrowthAdj: -0.02, marginAdj: -0.015, waccAdj: 0.01, termGrowthAdj: -0.005 };
              
              const bullInputs = {
                ...inputs,
                revenueGrowth: inputs.revenueGrowth.map(g => g + bullParams.revenueGrowthAdj),
                ebitMargin: inputs.ebitMargin.map(m => m + bullParams.marginAdj),
                riskFreeRate: inputs.riskFreeRate + bullParams.waccAdj,
                perpetualGrowth: Math.max(0.005, Math.min(inputs.perpetualGrowth + bullParams.termGrowthAdj, inputs.riskFreeRate + bullParams.waccAdj - 0.01))
              };
              const bearInputs = {
                ...inputs,
                revenueGrowth: inputs.revenueGrowth.map(g => g + bearParams.revenueGrowthAdj),
                ebitMargin: inputs.ebitMargin.map(m => m + bearParams.marginAdj),
                riskFreeRate: inputs.riskFreeRate + bearParams.waccAdj,
                perpetualGrowth: Math.max(0.005, Math.min(inputs.perpetualGrowth + bearParams.termGrowthAdj, inputs.riskFreeRate + bearParams.waccAdj - 0.01))
              };

              const bullOutputs = calculateDCF(bullInputs);
              const bearOutputs = calculateDCF(bearInputs);

              const min = Math.min(bearOutputs.intrinsicValuePerShare, bullOutputs.intrinsicValuePerShare);
              const max = Math.max(bearOutputs.intrinsicValuePerShare, bullOutputs.intrinsicValuePerShare);
              const range = max - min;
              const currentPos = ((inputs.currentPrice - min) / range) * 100;

              return (
                <div className="relative">
                  <div 
                    className="absolute -top-8 text-xs text-white font-bold whitespace-nowrap bg-black px-2 py-1 rounded z-20"
                    style={{ 
                      left: `${Math.max(5, Math.min(95, currentPos))}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    Current: ${formatNumber(inputs.currentPrice, 2)}
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2 mt-6">
                    <span>Bear: ${formatNumber(bearOutputs.intrinsicValuePerShare, 2)}</span>
                    <span>Base: ${formatNumber(baseOutputs.intrinsicValuePerShare, 2)}</span>
                    <span>Bull: ${formatNumber(bullOutputs.intrinsicValuePerShare, 2)}</span>
                  </div>
                  <div className="h-6 bg-gray-200 rounded-full relative">
                    <div
                      className="absolute top-0 h-6 bg-gradient-to-r from-red-400 via-blue-400 to-green-400 rounded-full"
                      style={{ width: '100%' }}
                    />
                    <div
                      className="absolute -top-2 w-2 h-10 bg-black"
                      style={{ left: `${Math.max(0, Math.min(100, currentPos))}%`, transform: 'translateX(-50%)' }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* DCF Driver Bridge */}
      <Card>
        <CardHeader>
          <CardTitle>DCF Driver Bridge</CardTitle>
          <CardDescription>
            Decomposition of intrinsic value from enterprise value to equity value per share
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Waterfall Chart */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-4">Value Bridge</h4>
              <div className="flex items-end justify-center space-x-2 h-32">
                {(() => {
                  const pvFcff = outputs.pvOfFcff || 0;
                  const pvTerminal = outputs.pvOfTerminalValue || 0;
                  const enterpriseValue = outputs.enterpriseValue;
                  const netDebt = (financialData?.totalDebt?.[0] || 0) - (financialData?.cashAndEquivalents?.[0] || 0);
                  const equityValue = outputs.equityValue;
                  const perShare = outputs.intrinsicValuePerShare;

                  const values = [pvFcff, enterpriseValue, equityValue, perShare * inputs.sharesOutstanding];
                  const maxValue = Math.max(...values);

                  return (
                    <>
                      <div className="text-center">
                        <div
                          className="bg-blue-500 w-16 rounded-t"
                          style={{ height: `${(pvFcff / maxValue) * 100}px` }}
                        />
                        <div className="text-xs mt-1">PV FCFF</div>
                        <div className="text-xs font-medium">${(pvFcff / 1e6).toFixed(0)}M</div>
                      </div>

                      <div className="text-center">
                        <div
                          className="bg-green-500 w-16"
                          style={{ height: `${(pvTerminal / maxValue) * 100}px` }}
                        />
                        <div className="text-xs mt-1">PV Terminal</div>
                        <div className="text-xs font-medium">${(pvTerminal / 1e6).toFixed(0)}M</div>
                      </div>

                      <div className="text-center">
                        <div
                          className={`w-16 ${netDebt < 0 ? 'bg-red-500' : 'bg-orange-500'}`}
                          style={{ height: `${Math.abs(netDebt) / maxValue * 100}px` }}
                        />
                        <div className="text-xs mt-1">Net Debt</div>
                        <div className="text-xs font-medium">${(netDebt / 1e6).toFixed(0)}M</div>
                      </div>

                      <div className="text-center">
                        <div
                          className="bg-indigo-500 w-16"
                          style={{ height: `${(equityValue / maxValue) * 100}px` }}
                        />
                        <div className="text-xs mt-1">Equity Value</div>
                        <div className="text-xs font-medium">${(equityValue / 1e6).toFixed(0)}M</div>
                      </div>

                      <div className="text-center">
                        <div
                          className="bg-purple-500 w-16 rounded-t"
                          style={{ height: `${((perShare * inputs.sharesOutstanding) / maxValue) * 100}px` }}
                        />
                        <div className="text-xs mt-1">Per Share</div>
                        <div className="text-xs font-medium">${formatNumber(perShare, 2)}</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Bridge Summary */}
              <div className="mt-4 grid grid-cols-5 gap-4 text-center text-sm">
                <div>
                  <div className="font-medium">${(outputs.pvOfFcff / 1e6).toFixed(0)}M</div>
                  <div className="text-gray-600">PV of FCFF</div>
                </div>
                <div>
                  <div className="font-medium">${(outputs.enterpriseValue / 1e6).toFixed(0)}M</div>
                  <div className="text-gray-600">Enterprise Value</div>
                  <div className="text-xs text-gray-500">{((outputs.terminalValue / outputs.enterpriseValue) * 100).toFixed(1)}% terminal</div>
                </div>
                <div>
                  <div className="font-medium">${(((financialData?.totalDebt?.[0] || 0) - (financialData?.cashAndEquivalents?.[0] || 0)) / 1e6).toFixed(0)}M</div>
                  <div className="text-gray-600">Net Debt</div>
                </div>
                <div>
                  <div className="font-medium">${(outputs.equityValue / 1e6).toFixed(0)}M</div>
                  <div className="text-gray-600">Equity Value</div>
                </div>
                <div>
                  <div className="font-medium">${formatNumber(outputs.intrinsicValuePerShare, 2)}</div>
                  <div className="text-gray-600">Per Share</div>
                </div>
              </div>

              {/* Terminal Value Warning */}
              {outputs.terminalValueContribution > 0.7 && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                    <div className="text-sm">
                      <strong>High Terminal Value:</strong> {((outputs.terminalValue / outputs.enterpriseValue) * 100).toFixed(1)}% of enterprise value comes from terminal value. This is unusually high - consider reviewing growth assumptions or extending the forecast period.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Educational Purposes Only</h4>
              <p className="text-sm text-yellow-700 mt-1">
                This DCF tool is provided for educational and research purposes only. It is not intended as investment advice,
                and users should conduct their own due diligence and consult with qualified financial professionals before making
                investment decisions. Past performance does not guarantee future results.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Numeric input that keeps a local string while the user is typing and only
// commits the parsed number to global state on blur. Fixes the React controlled-
// input problem where parseFloat+re-render eats decimal points mid-keystroke.
function NumericInput({
  value,
  onChange,
  toDisplay = (n: number) => String(n),
  fromDisplay = (s: string) => { const n = parseFloat(s.replace(/[^0-9.-]/g, '')); return isNaN(n) ? 0 : n; },
  className,
  ...rest
}: {
  value: number;
  onChange: (n: number) => void;
  toDisplay?: (n: number) => string;
  fromDisplay?: (s: string) => number;
  className?: string;
  [k: string]: any;
}) {
  const [local, setLocal] = useState(() => toDisplay(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setLocal(toDisplay(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={local}
      className={className}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={(e) => { focused.current = true; e.target.select(); }}
      onBlur={() => {
        focused.current = false;
        const parsed = fromDisplay(local);
        onChange(parsed);
        setLocal(toDisplay(parsed));
      }}
      {...rest}
    />
  );
}

// Input Forms Component
function DCFInputsForm({ inputs, updateInput, updateArrayInput }: {
  inputs: DCFInputs;
  updateInput: (field: keyof DCFInputs, value: any) => void;
  updateArrayInput: (field: keyof DCFInputs, index: number, value: number) => void;
}) {
  return (
    <div className="grid gap-6">
      {/* Company Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            Company Setup
          </CardTitle>
          <CardDescription>
            Basic company information and market data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inputs.companyName}
                onChange={(e) => updateInput('companyName', e.target.value)}
                placeholder="e.g., Apple Inc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ticker Symbol</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inputs.ticker}
                onChange={(e) => updateInput('ticker', e.target.value)}
                placeholder="e.g., AAPL"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Current Price ($)</label>
              <NumericInput
                value={inputs.currentPrice}
                onChange={(n) => updateInput('currentPrice', n)}
                toDisplay={(n) => n.toFixed(2)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Shares Outstanding (M)</label>
              <NumericInput
                value={inputs.sharesOutstanding / 1000000}
                onChange={(n) => updateInput('sharesOutstanding', n * 1000000)}
                toDisplay={(n) => n.toFixed(3)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Shares Diluted (M)</label>
              <NumericInput
                value={inputs.sharesDiluted / 1000000}
                onChange={(n) => updateInput('sharesDiluted', n * 1000000)}
                toDisplay={(n) => n.toFixed(3)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Horizon */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast Horizon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <label className="block text-sm font-medium mb-1">Years to Forecast</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={inputs.forecastYears.toString()}
              onChange={(e) => updateInput('forecastYears', parseInt(e.target.value))}
            >
              <option value="3">3 Years</option>
              <option value="5">5 Years</option>
              <option value="7">7 Years</option>
              <option value="10">10 Years</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Operating Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>Operating Forecast</CardTitle>
          <CardDescription>
            Revenue and margin assumptions for the forecast period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Forecast Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="forecastMode"
                  value="simple"
                  checked={inputs.forecastMode === 'simple'}
                  onChange={(e) => updateInput('forecastMode', e.target.value)}
                  className="mr-2"
                />
                Simple Mode
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="forecastMode"
                  value="advanced"
                  checked={inputs.forecastMode === 'advanced'}
                  onChange={(e) => updateInput('forecastMode', e.target.value)}
                  className="mr-2"
                />
                Advanced Mode
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Starting Revenue ($M)</label>
              <NumericInput
                value={inputs.startingRevenue / 1000000}
                onChange={(n) => updateInput('startingRevenue', n * 1000000)}
                toDisplay={(n) => n.toFixed(0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Terminal Growth (%)</label>
              <NumericInput
                value={inputs.perpetualGrowth * 100}
                onChange={(n) => updateInput('perpetualGrowth', n / 100)}
                toDisplay={(n) => n.toFixed(2)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Revenue Growth */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Revenue Growth Rate (%) {inputs.forecastMode === 'simple' ? '- Flat Rate' : '- By Year'}
            </label>
            {inputs.forecastMode === 'simple' ? (
              <NumericInput
                value={inputs.revenueGrowth[0] * 100}
                onChange={(n) => updateInput('revenueGrowth', Array(inputs.forecastYears).fill(n / 100))}
                toDisplay={(n) => n.toFixed(1)}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <div className="grid grid-cols-5 gap-3">
                {(inputs.revenueGrowth || Array(inputs.forecastYears).fill(0.05)).map((growth, index) => (
                  <div key={index} className="text-center">
                    <NumericInput
                      value={growth * 100}
                      onChange={(n) => updateArrayInput('revenueGrowth', index, n / 100)}
                      toDisplay={(n) => n.toFixed(1)}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                    />
                    <div className="text-xs text-gray-500 mt-1 font-medium">Y{index + 1}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EBIT Margin */}
          <div>
            <label className="block text-sm font-medium mb-2">
              EBIT Margin (%) {inputs.forecastMode === 'simple' ? '- Flat Rate' : '- By Year'}
            </label>
            {inputs.forecastMode === 'simple' ? (
              <NumericInput
                value={inputs.ebitMargin[0] * 100}
                onChange={(n) => updateInput('ebitMargin', Array(inputs.forecastYears).fill(n / 100))}
                toDisplay={(n) => n.toFixed(1)}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <div className="grid grid-cols-5 gap-3">
                {(inputs.ebitMargin || Array(inputs.forecastYears).fill(0.15)).map((margin, index) => (
                  <div key={index} className="text-center">
                    <NumericInput
                      value={margin * 100}
                      onChange={(n) => updateArrayInput('ebitMargin', index, n / 100)}
                      toDisplay={(n) => n.toFixed(1)}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                    />
                    <div className="text-xs text-gray-500 mt-1 font-medium">Y{index + 1}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Capex and Depreciation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Capex (% of Revenue)</label>
              <NumericInput
                value={inputs.capexPercentOfRevenue * 100}
                onChange={(n) => updateInput('capexPercentOfRevenue', n / 100)}
                toDisplay={(n) => n.toFixed(1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">D&A (% of Revenue)</label>
              <NumericInput
                value={inputs.depreciationPercentOfRevenue * 100}
                onChange={(n) => updateInput('depreciationPercentOfRevenue', n / 100)}
                toDisplay={(n) => n.toFixed(1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Advanced Mode Options */}
          {inputs.forecastMode === 'advanced' && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm">Advanced Options</h4>

              {/* Depreciation by year */}
              <div>
                <label className="block text-sm font-medium mb-2">D&A (% of Revenue by Year)</label>
                <div className="grid grid-cols-5 gap-2">
                  {(inputs.depreciationByYear || Array(inputs.forecastYears).fill(inputs.depreciationPercentOfRevenue)).map((dep, index) => (
                    <div key={index} className="text-center">
                      <NumericInput
                        value={dep * 100}
                        onChange={(n) => {
                          const newArray = [...(inputs.depreciationByYear || Array(inputs.forecastYears).fill(inputs.depreciationPercentOfRevenue))];
                          newArray[index] = n / 100;
                          updateInput('depreciationByYear', newArray);
                        }}
                        toDisplay={(n) => n.toFixed(1)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <div className="text-xs text-gray-500 mt-1">Y{index + 1}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mid-year convention */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="midYearConvention"
                  checked={inputs.midYearConvention}
                  onChange={(e) => updateInput('midYearConvention', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="midYearConvention" className="text-sm font-medium">
                  Use mid-year discounting convention
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discount Rate (WACC) */}
      <Card>
        <CardHeader>
          <CardTitle>Discount Rate (WACC)</CardTitle>
          <CardDescription>
            Cost of equity, debt, and weighted average cost of capital
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Risk-Free Rate (%)</label>
              <NumericInput
                value={inputs.riskFreeRate * 100}
                onChange={(n) => updateInput('riskFreeRate', n / 100)}
                toDisplay={(n) => n.toFixed(2)}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Equity Risk Premium (%)</label>
              <div className="flex items-center space-x-2">
                <NumericInput
                  value={inputs.equityRiskPremium * 100}
                  onChange={(n) => updateInput('equityRiskPremium', n / 100)}
                  toDisplay={(n) => n.toFixed(2)}
                  className="flex-1 px-4 py-3 text-lg border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  Market: 6.0%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                S&P 500 earnings yield - 10Y Treasury yield (auto-updated)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Beta</label>
              <NumericInput
                value={inputs.beta}
                onChange={(n) => updateInput('beta', n)}
                toDisplay={(n) => n.toFixed(2)}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cost of Debt (%)</label>
              <NumericInput
                value={inputs.costOfDebt * 100}
                onChange={(n) => updateInput('costOfDebt', n / 100)}
                toDisplay={(n) => n.toFixed(2)}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
              <NumericInput
                value={inputs.taxRate * 100}
                onChange={(n) => updateInput('taxRate', n / 100)}
                toDisplay={(n) => n.toFixed(2)}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target Debt Ratio (%)</label>
              <NumericInput
                value={inputs.targetDebtRatio * 100}
                onChange={(n) => updateInput('targetDebtRatio', n / 100)}
                toDisplay={(n) => n.toFixed(2)}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
function ValuationSummary({ inputs, outputs }: { inputs: DCFInputs; outputs: DCFOutputs }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: inputs.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Valuation Summary</CardTitle>
          <CardDescription>
            Key valuation metrics and comparison to current market price
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{formatCurrency(outputs.enterpriseValue)}</div>
              <div className="text-sm text-muted-foreground">Enterprise Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{formatCurrency(outputs.equityValue)}</div>
              <div className="text-sm text-muted-foreground">Equity Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(outputs.intrinsicValuePerShare)}</div>
              <div className="text-sm text-muted-foreground">Intrinsic Value/Share</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(inputs.currentPrice)}</div>
              <div className="text-sm text-muted-foreground">Current Price</div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-center space-x-8">
              <div className="text-center">
                <div className={`text-xl font-bold ${outputs.upsideDownside >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(outputs.upsideDownside)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {outputs.upsideDownside >= 0 ? 'Upside' : 'Downside'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">{formatPercent(outputs.wacc)}</div>
                <div className="text-sm text-muted-foreground">WACC</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WACC Calculation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold">{formatPercent(outputs.costOfEquity)}</div>
              <div className="text-sm text-muted-foreground">Cost of Equity</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{formatPercent(outputs.afterTaxCostOfDebt)}</div>
              <div className="text-sm text-muted-foreground">After-Tax Cost of Debt</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-primary">{formatPercent(outputs.wacc)}</div>
              <div className="text-sm text-muted-foreground">WACC</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Cash Flow Table Component
function CashFlowTable({ outputs }: { outputs: DCFOutputs }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Projections</CardTitle>
        <CardDescription>
          Free cash flow to the firm (FCFF) for each forecast year
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Year</th>
                <th className="text-right py-2">Revenue</th>
                <th className="text-right py-2">EBIT</th>
                <th className="text-right py-2">NOPAT</th>
                <th className="text-right py-2">FCFF</th>
              </tr>
            </thead>
            <tbody>
              {outputs.freeCashFlow.map((_, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2">Year {index + 1}</td>
                  <td className="text-right py-2">{outputs.revenues[index]?.toLocaleString()}</td>
                  <td className="text-right py-2">{outputs.ebit[index]?.toLocaleString()}</td>
                  <td className="text-right py-2">{outputs.nopat[index]?.toLocaleString()}</td>
                  <td className="text-right py-2 font-medium">{outputs.freeCashFlow[index]?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Quality Checks Component
function DCFQualityChecks({ inputs, outputs }: { inputs: DCFInputs; outputs: DCFOutputs }) {
  const checks = [];

  // Check 1: Terminal growth >= WACC
  const terminalValuePercent = (outputs.terminalValue / Math.pow(1 + outputs.wacc, inputs.forecastYears)) / outputs.enterpriseValue;
  if (inputs.perpetualGrowth >= outputs.wacc) {
    checks.push({
      type: 'error',
      message: `Terminal growth rate (${(inputs.perpetualGrowth * 100).toFixed(1)}%) ≥ WACC (${(outputs.wacc * 100).toFixed(1)}%) - mathematically invalid`,
      severity: 'high'
    });
  }

  // Check 2: Terminal value > 80% of EV
  if (terminalValuePercent > 0.8) {
    checks.push({
      type: 'warning',
      message: `Terminal value represents ${(terminalValuePercent * 100).toFixed(1)}% of EV - very sensitive to assumptions`,
      severity: 'medium'
    });
  }

  // Check 3: Negative FCFF in perpetuity
  const lastFCFF = outputs.freeCashFlow[outputs.freeCashFlow.length - 1];
  if (lastFCFF < 0 && inputs.perpetualGrowth > 0) {
    checks.push({
      type: 'warning',
      message: 'Negative FCFF with positive terminal growth - perpetuity will be negative',
      severity: 'high'
    });
  }

  // Check 4: Extreme EV/EBITDA multiple — use terminal-year revenue for D&A approximation
  const lastEBIT = outputs.ebit[outputs.ebit.length - 1];
  const terminalRevenue = outputs.revenues[outputs.revenues.length - 1];
  const approxEBITDA = lastEBIT + (terminalRevenue * inputs.depreciationPercentOfRevenue);
  const evToEbitda = outputs.enterpriseValue / approxEBITDA;
  if (evToEbitda < 3 || evToEbitda > 25) {
    checks.push({
      type: 'warning',
      message: `Implied EV/EBITDA of ${evToEbitda.toFixed(1)}x is outside typical range (3-25x)`,
      severity: 'low'
    });
  }

  if (checks.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <div>
              <h4 className="font-medium text-green-800">DCF Quality Check: All Clear</h4>
              <p className="text-sm text-green-700 mt-1">
                No major issues detected with your DCF assumptions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
          DCF Quality Checks
        </CardTitle>
        <CardDescription>
          Potential issues with your DCF model that may affect reliability
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checks.map((check, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded border">
              <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                check.severity === 'high' ? 'text-red-500' :
                check.severity === 'medium' ? 'text-orange-500' : 'text-yellow-500'
              }`} />
              <div>
                <p className="text-sm font-medium">{check.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Severity: {check.severity === 'high' ? 'High' : check.severity === 'medium' ? 'Medium' : 'Low'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Implied Multiples Component
function WACCBreakdown({ inputs, outputs }: { inputs: DCFInputs; outputs: DCFOutputs }) {
  const costOfEquity = inputs.riskFreeRate + (inputs.beta * inputs.equityRiskPremium);
  const afterTaxCostOfDebt = inputs.costOfDebt * (1 - inputs.taxRate);
  const equityWeight = 1 - inputs.targetDebtRatio;
  const debtWeight = inputs.targetDebtRatio;
  const wacc = outputs.wacc;

  return (
    <Card>
      <CardHeader>
        <CardTitle>WACC Breakdown</CardTitle>
        <CardDescription>
          Weighted Average Cost of Capital calculation and components
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Cost of Equity */}
          <div className="border-l-4 border-blue-500 pl-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Cost of Equity (CAPM)</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Risk-Free Rate</span>
                <span className="font-medium">{(inputs.riskFreeRate * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Beta</span>
                <span className="font-medium">{inputs.beta.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Equity Risk Premium</span>
                <span className="font-medium">{(inputs.equityRiskPremium * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold text-gray-800">= Cost of Equity</span>
                <span className="font-bold text-blue-600">{(costOfEquity * 100).toFixed(2)}%</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Formula: Rf + β × ERP = {(inputs.riskFreeRate * 100).toFixed(2)}% + {inputs.beta.toFixed(2)} × {(inputs.equityRiskPremium * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Cost of Debt */}
          <div className="border-l-4 border-red-500 pl-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">After-Tax Cost of Debt</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Cost of Debt (Pre-tax)</span>
                <span className="font-medium">{(inputs.costOfDebt * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax Rate</span>
                <span className="font-medium">{(inputs.taxRate * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold text-gray-800">= After-Tax Cost of Debt</span>
                <span className="font-bold text-red-600">{(afterTaxCostOfDebt * 100).toFixed(2)}%</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Formula: Rd × (1 - Tax) = {(inputs.costOfDebt * 100).toFixed(2)}% × (1 - {(inputs.taxRate * 100).toFixed(2)}%)
              </div>
            </div>
          </div>

          {/* Capital Structure */}
          <div className="border-l-4 border-purple-500 pl-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Capital Structure (Target)</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Equity Weight</span>
                <span className="font-medium">{(equityWeight * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Debt Weight</span>
                <span className="font-medium">{(debtWeight * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* WACC Calculation */}
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">WACC Calculation</div>
            <div className="space-y-2 text-sm mb-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Equity: {(equityWeight * 100).toFixed(1)}% × {(costOfEquity * 100).toFixed(2)}%</span>
                <span className="font-medium">{(equityWeight * costOfEquity * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Debt: {(debtWeight * 100).toFixed(1)}% × {(afterTaxCostOfDebt * 100).toFixed(2)}%</span>
                <span className="font-medium">{(debtWeight * afterTaxCostOfDebt * 100).toFixed(2)}%</span>
              </div>
            </div>
            <div className="flex justify-between pt-3 border-t-2 border-green-600">
              <span className="font-bold text-gray-900 text-lg">WACC (Discount Rate)</span>
              <span className="font-bold text-green-700 text-xl">{(wacc * 100).toFixed(2)}%</span>
            </div>
            <div className="text-xs text-gray-600 mt-2">
              WACC = (E/V × Re) + (D/V × Rd × (1-Tax))
            </div>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <p className="font-semibold mb-1">Why WACC Matters:</p>
            <p>WACC is the discount rate used to calculate present value of future cash flows. A lower WACC increases valuation, while a higher WACC decreases it. WACC reflects the company's cost of capital from both equity and debt sources.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Financial Deep Dive Component
function FinancialDeepDive({ financialData }: { financialData: ExtractedFinancials | null }) {
  if (!financialData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No financial data loaded</p>
            <p className="text-sm mt-2">Upload FactSet Excel files to see detailed financial analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate financial ratios and trends
  const ratios = {
    profitability: {
      grossMargin: financialData.revenue.map((rev, i) =>
        rev > 0 ? ((financialData.revenue[i] - (financialData.ebitda[i] - financialData.ebit[i])) / rev) : 0
      ),
      ebitMargin: financialData.ebit.map((ebit, i) => financialData.revenue[i] > 0 ? ebit / financialData.revenue[i] : 0),
      netMargin: financialData.netIncome.map((ni, i) => financialData.revenue[i] > 0 ? ni / financialData.revenue[i] : 0),
    },
    efficiency: {
      assetTurnover: financialData.revenue.map((rev, i) => financialData.totalAssets[i] > 0 ? rev / financialData.totalAssets[i] : 0),
      workingCapitalRatio: financialData.workingCapital.map((wc, i) => financialData.totalAssets[i] > 0 ? wc / financialData.totalAssets[i] : 0),
    },
    leverage: {
      debtToEquity: financialData.totalDebt.map((debt, i) => financialData.shareholdersEquity[i] > 0 ? debt / financialData.shareholdersEquity[i] : 0),
      debtToAssets: financialData.totalDebt.map((debt, i) => financialData.totalAssets[i] > 0 ? debt / financialData.totalAssets[i] : 0),
    },
    growth: {
      revenueGrowth: financialData.revenue.map((rev, i) =>
        i < financialData.revenue.length - 1 ? (rev - financialData.revenue[i + 1]) / financialData.revenue[i + 1] : 0
      ),
      ebitGrowth: financialData.ebit.map((ebit, i) =>
        i < financialData.ebit.length - 1 ? (ebit - financialData.ebit[i + 1]) / financialData.ebit[i + 1] : 0
      ),
    },
  };

  const chartData = financialData.periods.map((period, i) => ({
    period,
    revenue: financialData.revenue[i] || 0,
    ebit: financialData.ebit[i] || 0,
    netIncome: financialData.netIncome[i] || 0,
    ebitMargin: ratios.profitability.ebitMargin[i] * 100,
    revenueGrowth: ratios.growth.revenueGrowth[i] * 100,
  }));

  return (
    <div className="space-y-6">
      {/* Key Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              ${(financialData.revenue[0] / 1000).toFixed(0)}B
            </div>
            <p className="text-xs text-muted-foreground">Latest Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {(ratios.profitability.ebitMargin[0] * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">EBIT Margin</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {(ratios.growth.revenueGrowth[0] * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Revenue Growth</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {(ratios.leverage.debtToEquity[0]).toFixed(1)}x
            </div>
            <p className="text-xs text-muted-foreground">Debt-to-Equity</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Performance Trends</CardTitle>
          <CardDescription>Revenue, EBIT, and margins over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="amount" orientation="left" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}B`} />
              <YAxis yAxisId="percent" orientation="right" tickFormatter={(value) => `${formatNumber(value, 0)}%`} />
              <Tooltip
                formatter={(value: any, name: string) => {
                  if (name === 'revenue' || name === 'ebit') return [`$${(value / 1000).toFixed(1)}B`, name];
                  return [`${value.toFixed(1)}${name.includes('Growth') || name.includes('Margin') ? '%' : ''}`, name];
                }}
              />
              <Bar yAxisId="amount" dataKey="revenue" fill="#8884d8" name="Revenue" />
              <Bar yAxisId="amount" dataKey="ebit" fill="#82ca9d" name="EBIT" />
              <Line yAxisId="percent" type="monotone" dataKey="ebitMargin" stroke="#ff7300" name="EBIT Margin" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Financial Ratios Table */}
      <Card>
        <CardHeader>
          <CardTitle>Key Financial Ratios</CardTitle>
          <CardDescription>Profitability, efficiency, and leverage metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Ratio</th>
                  {financialData.periods.map(period => (
                    <th key={period} className="text-right py-2 px-2">{period}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-medium">EBIT Margin</td>
                  {ratios.profitability.ebitMargin.map((margin, i) => (
                    <td key={i} className="text-right py-2 px-2">{(margin * 100).toFixed(1)}%</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Net Margin</td>
                  {ratios.profitability.netMargin.map((margin, i) => (
                    <td key={i} className="text-right py-2 px-2">{(margin * 100).toFixed(1)}%</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Asset Turnover</td>
                  {ratios.efficiency.assetTurnover.map((turnover, i) => (
                    <td key={i} className="text-right py-2 px-2">{formatNumber(turnover, 2)}x</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Debt-to-Equity</td>
                  {ratios.leverage.debtToEquity.map((ratio, i) => (
                    <td key={i} className="text-right py-2 px-2">{formatNumber(ratio, 2)}x</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 font-medium">Revenue Growth</td>
                  {ratios.growth.revenueGrowth.map((growth, i) => (
                    <td key={i} className="text-right py-2 px-2">{(growth * 100).toFixed(1)}%</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Charts Component
function DCFCharts({ inputs, outputs }: { inputs: DCFInputs; outputs: DCFOutputs }) {
  // Prepare FCFF chart data
  const fcffData = outputs.freeCashFlow.map((fcf, index) => ({
    year: `Year ${index + 1}`,
    fcff: Math.round(fcf / 1000000), // In millions
  }));

  // Prepare Terminal Value contribution data
  const terminalContributionData = [
    { name: 'PV of Explicit FCFF', value: Math.round((outputs.enterpriseValue - outputs.terminalValue / Math.pow(1 + outputs.wacc, inputs.forecastYears)) / 1000000) },
    { name: 'PV of Terminal Value', value: Math.round((outputs.terminalValue / Math.pow(1 + outputs.wacc, inputs.forecastYears)) / 1000000) },
  ];

  // Prepare Price vs Intrinsic data
  const priceData = [
    { name: 'Current Price', value: inputs.currentPrice, type: 'current' },
    { name: 'Intrinsic Value', value: outputs.intrinsicValuePerShare, type: 'intrinsic' },
  ];

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

  return (
    <div className="space-y-6">
      {/* FCFF Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Free Cash Flow Forecast
          </CardTitle>
          <CardDescription>
            FCFF by year (in millions) - shows the cash flow profile and terminal value input
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fcffData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => `${value}M`} />
              <Tooltip formatter={(value) => [`$${value}M`, 'FCFF']} />
              <Bar dataKey="fcff" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Price vs Intrinsic Value */}
      <Card>
        <CardHeader>
          <CardTitle>Price vs Intrinsic Value</CardTitle>
          <CardDescription>
            Current market price compared to calculated intrinsic value per share
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={priceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `$${formatNumber(Number(value), 2)}`} />
              <Tooltip formatter={(value) => [`$${formatNumber(Number(value), 2)}`, 'Price']} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 text-center">
            <span className={`text-lg font-semibold ${outputs.upsideDownside >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {outputs.upsideDownside >= 0 ? 'Upside' : 'Downside'}: {Math.abs(outputs.upsideDownside * 100).toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Terminal Value Contribution */}
      <Card>
        <CardHeader>
          <CardTitle>Terminal Value Contribution</CardTitle>
          <CardDescription>
            Percentage of enterprise value from terminal value: {(outputs.terminalValue / Math.pow(1 + outputs.wacc, inputs.forecastYears) / outputs.enterpriseValue * 100).toFixed(1)}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={terminalContributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {terminalContributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`$${value}M`, 'EV Contribution']} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* EV Waterfall (P1) */}
      <Card>
        <CardHeader>
          <CardTitle>Enterprise Value Build</CardTitle>
          <CardDescription>
            How enterprise value is constructed from explicit cash flows and terminal value
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">
                ${(outputs.enterpriseValue - outputs.terminalValue / Math.pow(1 + outputs.wacc, inputs.forecastYears)).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">PV of Explicit FCFF</div>
            </div>
            <div className="p-4 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">
                ${(outputs.terminalValue / Math.pow(1 + outputs.wacc, inputs.forecastYears)).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">PV of Terminal Value</div>
            </div>
            <div className="p-4 bg-purple-50 rounded">
              <div className="text-2xl font-bold text-purple-600">
                ${outputs.enterpriseValue.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total EV</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EV to Equity Bridge (P1) */}
      <Card>
        <CardHeader>
          <CardTitle>EV to Equity Bridge</CardTitle>
          <CardDescription>
            Converting enterprise value to equity value through balance sheet adjustments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span>Enterprise Value</span>
              <span className="font-semibold">${outputs.enterpriseValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>- Net Debt ({inputs.currency})</span>
              <span className="text-red-600">- ${(inputs.totalDebt - inputs.cashEquivalents).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>- Preferred Equity</span>
              <span className="text-red-600">- ${inputs.preferredEquity.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>- Minority Interest</span>
              <span className="text-red-600">- ${inputs.minorityInterest.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>+ Non-operating Assets</span>
              <span className="text-green-600">+ ${inputs.nonOperatingAssets.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t-2 border-black">
              <span className="font-bold">Equity Value</span>
              <span className="font-bold">${outputs.equityValue.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Sensitivity Analysis Component
function SensitivityAnalysis({ inputs, outputs, financialData }: { inputs: DCFInputs; outputs: DCFOutputs; financialData: ExtractedFinancials | null }) {
  const [selectedSensitivity, setSelectedSensitivity] = useState<'wacc_growth' | 'wacc_multiple' | 'growth_margin'>('wacc_growth');
  const [selectedScenario, setSelectedScenario] = useState<'base' | 'bull' | 'bear'>('base');
  const [advancedScenarioMode, setAdvancedScenarioMode] = useState(false);
  const [customScenarioParams, setCustomScenarioParams] = useState({
    bull: { revenueGrowthAdj: 0.02, marginAdj: 0.015, waccAdj: -0.0075, termGrowthAdj: 0.005 },
    bear: { revenueGrowthAdj: -0.02, marginAdj: -0.015, waccAdj: 0.01, termGrowthAdj: -0.005 }
  });

  // Generate WACC × Terminal Growth sensitivity table
  const generateWaccGrowthSensitivity = () => {
    console.log('Generating WACC × Growth sensitivity, outputs:', outputs);
    console.log('FCF length:', outputs.freeCashFlow.length, 'FCF values:', outputs.freeCashFlow);

    const waccRange = [];
    const growthRange = [];

    // Generate WACC range: current ± 200bps in 50bps steps
    for (let i = -4; i <= 4; i++) {
      waccRange.push(outputs.wacc + i * 0.005);
    }

    // Generate growth range: current ± 200bps in 50bps steps
    for (let i = -4; i <= 4; i++) {
      growthRange.push(inputs.perpetualGrowth + i * 0.005);
    }

    const tableData: Array<Record<string, string>> = [];
    for (const wacc of waccRange) {
      const row: Record<string, string> = { wacc: (wacc * 100).toFixed(1) + '%' };
      for (const growth of growthRange) {
        if (wacc <= growth) {
          row[(growth * 100).toFixed(1) + '%'] = 'Error';
        } else {
          // Calculate intrinsic value for this WACC/growth combination
          const lastFCF = outputs.freeCashFlow[outputs.freeCashFlow.length - 1];
          if (!lastFCF || lastFCF === 0) {
            row[(growth * 100).toFixed(1) + '%'] = '0.00';
            continue;
          }

          const terminalValue = lastFCF * (1 + growth) / (wacc - growth);
          const pvTerminal = terminalValue / Math.pow(1 + wacc, inputs.forecastYears);
          let pvFcff = 0;
          for (let i = 0; i < outputs.freeCashFlow.length; i++) {
            pvFcff += outputs.freeCashFlow[i] / Math.pow(1 + wacc, i + 1);
          }
          const enterpriseValue = pvFcff + pvTerminal;
          const netDebt = inputs.totalDebt - inputs.cashEquivalents;
          const equityValue = enterpriseValue - netDebt - inputs.preferredEquity - inputs.minorityInterest + inputs.nonOperatingAssets;
          const intrinsicValuePerShare = equityValue / inputs.sharesDiluted;

          row[(growth * 100).toFixed(1) + '%'] = intrinsicValuePerShare.toFixed(2);
        }
      }
      tableData.push(row);
    }

    return { tableData, waccRange, growthRange };
  };

  // Generate Growth × EBIT Margin sensitivity table
  const generateGrowthMarginSensitivity = () => {
    const growthRange = [];
    const marginRange = [];

    // Generate growth range: current ± 200bps in 50bps steps
    for (let i = -4; i <= 4; i++) {
      growthRange.push(inputs.revenueGrowth[0] + i * 0.005); // Use first year growth
    }

    // Generate margin range: current ± 200bps in 50bps steps
    for (let i = -4; i <= 4; i++) {
      marginRange.push(inputs.ebitMargin[0] + i * 0.005); // Use first year margin
    }

    const tableData: Array<Record<string, string>> = [];
    for (const growth of growthRange) {
      const row: Record<string, string> = { growth: (growth * 100).toFixed(1) + '%' };
      for (const margin of marginRange) {
        // Recalculate with new assumptions
        const testInputs = { ...inputs, revenueGrowth: [growth, ...inputs.revenueGrowth.slice(1)], ebitMargin: [margin, ...inputs.ebitMargin.slice(1)] };
        const testOutputs = calculateDCF(testInputs);
        row[(margin * 100).toFixed(1) + '%'] = testOutputs.intrinsicValuePerShare.toFixed(2);
      }
      tableData.push(row);
    }

    return { tableData, growthRange, marginRange };
  };

  const getSensitivityData = (): { tableData: Array<Record<string, string>>, waccRange?: number[], growthRange?: number[], marginRange?: number[] } => {
    if (selectedSensitivity === 'wacc_growth') {
      return generateWaccGrowthSensitivity();
    } else if (selectedSensitivity === 'growth_margin') {
      return generateGrowthMarginSensitivity();
    }
    return { tableData: [] };
  };

  const { tableData } = getSensitivityData();

  const getHeatmapColor = (value: string, baseValue: number) => {
    if (value === 'Error') return 'bg-red-100 text-red-800';
    const numValue = parseFloat(value);
    const diff = numValue - baseValue;
    const percentDiff = Math.abs(diff) / baseValue;

    if (percentDiff > 0.3) return 'bg-red-200 text-red-900';
    if (percentDiff > 0.2) return 'bg-orange-200 text-orange-900';
    if (percentDiff > 0.1) return 'bg-yellow-200 text-yellow-900';
    if (percentDiff > 0.05) return 'bg-green-200 text-green-900';
    return 'bg-blue-200 text-blue-900';
  };

  return (
    <div className="space-y-6">
      {/* Sensitivity Analysis Explanation */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">Understanding Sensitivity Analysis</h4>
              <p className="text-sm text-blue-700 mt-1">
                <strong>WACC × Terminal Growth:</strong> Shows how valuation changes when you vary both the discount rate (WACC) and long-term growth rate (g).
                The numbers represent intrinsic value per share. Darker colors = larger deviations from base case.
                Red "Error" cells occur when g ≥ WACC (mathematically invalid for perpetuity formula).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sensitivity Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Sensitivity Analysis</CardTitle>
          <CardDescription>
            How valuation changes with different assumptions - table view with heatmap coloring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <label className="flex items-center">
              <input
                type="radio"
                name="sensitivity"
                value="wacc_growth"
                checked={selectedSensitivity === 'wacc_growth'}
                onChange={(e) => setSelectedSensitivity(e.target.value as any)}
                className="mr-2"
              />
              WACC × Terminal Growth
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="sensitivity"
                value="growth_margin"
                checked={selectedSensitivity === 'growth_margin'}
                onChange={(e) => setSelectedSensitivity(e.target.value as any)}
                className="mr-2"
              />
              Revenue Growth × EBIT Margin
            </label>
          </div>

          {/* Sensitivity Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-3 py-2 text-left">
                    {selectedSensitivity === 'wacc_growth' ? 'WACC' : 'Revenue Growth'}
                  </th>
                  {tableData.length > 0 && Object.keys(tableData[0]).filter(key => key !== (selectedSensitivity === 'wacc_growth' ? 'wacc' : 'growth')).map(header => (
                    <th key={header} className="border border-gray-300 px-3 py-2 text-center">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2 font-medium">
                      {selectedSensitivity === 'wacc_growth' ? row.wacc : row.growth}
                    </td>
                    {Object.entries(row).filter(([key]) => key !== (selectedSensitivity === 'wacc_growth' ? 'wacc' : 'growth')).map(([key, value]) => (
                      <td key={key} className={`border border-gray-300 px-3 py-2 text-center ${getHeatmapColor(value as string, outputs.intrinsicValuePerShare)}`}>
                        {value === 'Error' ? 'Error' : `$${value}`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            <p><strong>Color coding:</strong> Darker colors indicate larger deviations from base case (${formatNumber(outputs.intrinsicValuePerShare, 2)})</p>
            {selectedSensitivity === 'wacc_growth' && (
              <p><strong>Note:</strong> Red "Error" cells occur when terminal growth rate ≥ WACC (mathematically invalid)</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scenario Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Scenario Analysis</CardTitle>
          <CardDescription>
            Bear, Base, and Bull case valuations with different assumptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Scenario Selector */}
          <div className="flex gap-4 mb-6">
            {[
              { key: 'bear', label: 'Bear Case', color: 'text-red-600', bg: 'bg-red-50' },
              { key: 'base', label: 'Base Case', color: 'text-blue-600', bg: 'bg-blue-50' },
              { key: 'bull', label: 'Bull Case', color: 'text-green-600', bg: 'bg-green-50' }
            ].map(({ key, label, color, bg }) => (
              <button
                key={key}
                onClick={() => setSelectedScenario(key as any)}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  selectedScenario === key ? `border-current ${bg} ${color}` : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Scenario Results */}
          <div className="space-y-4">
            {(() => {
              const getScenarioInputs = (scenario: 'base' | 'bull' | 'bear') => {
                if (scenario === 'base') return inputs;
                
                const params = advancedScenarioMode ? customScenarioParams[scenario] : (scenario === 'bull' 
                  ? { revenueGrowthAdj: 0.02, marginAdj: 0.015, waccAdj: -0.0075, termGrowthAdj: 0.005 }
                  : { revenueGrowthAdj: -0.02, marginAdj: -0.015, waccAdj: 0.01, termGrowthAdj: -0.005 });
                
                return {
                  ...inputs,
                  revenueGrowth: inputs.revenueGrowth.map(g => g + params.revenueGrowthAdj),
                  ebitMargin: inputs.ebitMargin.map(m => m + params.marginAdj),
                  riskFreeRate: inputs.riskFreeRate + params.waccAdj,
                  perpetualGrowth: Math.max(0.005, Math.min(inputs.perpetualGrowth + params.termGrowthAdj, inputs.riskFreeRate + params.waccAdj - 0.01))
                };
              };

              const scenarioInputs = getScenarioInputs(selectedScenario);
              const scenarioOutputs = calculateDCF(scenarioInputs);
              const upsideDownside = inputs.currentPrice !== 0 ?
                ((scenarioOutputs.intrinsicValuePerShare - inputs.currentPrice) / inputs.currentPrice) * 100 : 0;

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold mb-2">
                      ${formatNumber(scenarioOutputs.intrinsicValuePerShare, 2)}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Intrinsic Value per Share</div>
                    <div className={`text-sm font-medium ${upsideDownside >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {upsideDownside >= 0 ? '+' : ''}{upsideDownside.toFixed(1)}% vs Current Price
                    </div>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold mb-2">
                      ${(scenarioOutputs.enterpriseValue / 1e9).toFixed(1)}B
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Enterprise Value</div>
                    <div className="text-sm text-gray-500">
                      Terminal: {((scenarioOutputs.pvOfTerminalValue / scenarioOutputs.enterpriseValue) * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold mb-2">
                      {(scenarioOutputs.wacc * 100).toFixed(2)}%
                    </div>
                    <div className="text-sm text-gray-600 mb-2">WACC</div>
                    <div className="text-sm text-gray-500">
                      g: {(scenarioInputs.perpetualGrowth * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Scenario Comparison Bar */}
          <div className="mt-6">
            <h4 className="font-semibold mb-3">Scenario Range</h4>
            {(() => {
              const baseOutputs = calculateDCF(inputs);
              
              const bullParams = advancedScenarioMode ? customScenarioParams.bull : { revenueGrowthAdj: 0.02, marginAdj: 0.015, waccAdj: -0.0075, termGrowthAdj: 0.005 };
              const bearParams = advancedScenarioMode ? customScenarioParams.bear : { revenueGrowthAdj: -0.02, marginAdj: -0.015, waccAdj: 0.01, termGrowthAdj: -0.005 };
              
              const bullInputs = {
                ...inputs,
                revenueGrowth: inputs.revenueGrowth.map(g => g + bullParams.revenueGrowthAdj),
                ebitMargin: inputs.ebitMargin.map(m => m + bullParams.marginAdj),
                riskFreeRate: inputs.riskFreeRate + bullParams.waccAdj,
                perpetualGrowth: Math.max(0.005, Math.min(inputs.perpetualGrowth + bullParams.termGrowthAdj, inputs.riskFreeRate + bullParams.waccAdj - 0.01))
              };
              const bearInputs = {
                ...inputs,
                revenueGrowth: inputs.revenueGrowth.map(g => g + bearParams.revenueGrowthAdj),
                ebitMargin: inputs.ebitMargin.map(m => m + bearParams.marginAdj),
                riskFreeRate: inputs.riskFreeRate + bearParams.waccAdj,
                perpetualGrowth: Math.max(0.005, Math.min(inputs.perpetualGrowth + bearParams.termGrowthAdj, inputs.riskFreeRate + bearParams.waccAdj - 0.01))
              };

              const bullOutputs = calculateDCF(bullInputs);
              const bearOutputs = calculateDCF(bearInputs);

              const min = Math.min(bearOutputs.intrinsicValuePerShare, bullOutputs.intrinsicValuePerShare);
              const max = Math.max(bearOutputs.intrinsicValuePerShare, bullOutputs.intrinsicValuePerShare);
              const range = max - min;
              const currentPos = ((inputs.currentPrice - min) / range) * 100;

              return (
                <div className="relative">
                  <div 
                    className="absolute -top-8 text-xs text-white font-bold whitespace-nowrap bg-black px-2 py-1 rounded z-20"
                    style={{ 
                      left: `${Math.max(5, Math.min(95, currentPos))}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    Current: ${formatNumber(inputs.currentPrice, 2)}
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2 mt-6">
                    <span>Bear: ${formatNumber(bearOutputs.intrinsicValuePerShare, 2)}</span>
                    <span>Base: ${formatNumber(baseOutputs.intrinsicValuePerShare, 2)}</span>
                    <span>Bull: ${formatNumber(bullOutputs.intrinsicValuePerShare, 2)}</span>
                  </div>
                  <div className="h-6 bg-gray-200 rounded-full relative">
                    <div
                      className="absolute top-0 h-6 bg-gradient-to-r from-red-400 via-blue-400 to-green-400 rounded-full"
                      style={{ width: '100%' }}
                    />
                    <div
                      className="absolute -top-2 w-2 h-10 bg-black"
                      style={{ left: `${Math.max(0, Math.min(100, currentPos))}%`, transform: 'translateX(-50%)' }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* DCF Driver Bridge */}
      <Card>
        <CardHeader>
          <CardTitle>DCF Driver Bridge</CardTitle>
          <CardDescription>
            Decomposition of intrinsic value from enterprise value to equity value per share
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Waterfall Chart */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-4">Value Bridge</h4>
              <div className="flex items-end justify-center space-x-2 h-32">
                {(() => {
                  const pvFcff = outputs.pvOfFcff || 0;
                  const pvTerminal = outputs.pvOfTerminalValue || 0;
                  const enterpriseValue = outputs.enterpriseValue;
                  const netDebt = (financialData?.totalDebt?.[0] || 0) - (financialData?.cashAndEquivalents?.[0] || 0);
                  const equityValue = outputs.equityValue;
                  const perShare = outputs.intrinsicValuePerShare;

                  const values = [pvFcff, enterpriseValue, equityValue, perShare * inputs.sharesOutstanding];
                  const maxValue = Math.max(...values);

                  return (
                    <>
                      <div className="text-center">
                        <div
                          className="bg-blue-500 w-16 rounded-t"
                          style={{ height: `${(pvFcff / maxValue) * 100}px` }}
                        />
                        <div className="text-xs mt-1">PV FCFF</div>
                        <div className="text-xs font-medium">${(pvFcff / 1e6).toFixed(0)}M</div>
                      </div>

                      <div className="text-center">
                        <div
                          className="bg-green-500 w-16"
                          style={{ height: `${(pvTerminal / maxValue) * 100}px` }}
                        />
                        <div className="text-xs mt-1">PV Terminal</div>
                        <div className="text-xs font-medium">${(pvTerminal / 1e6).toFixed(0)}M</div>
                      </div>

                      <div className="text-center">
                        <div
                          className={`w-16 ${netDebt < 0 ? 'bg-red-500' : 'bg-orange-500'}`}
                          style={{ height: `${Math.abs(netDebt) / maxValue * 100}px` }}
                        />
                        <div className="text-xs mt-1">Net Debt</div>
                        <div className="text-xs font-medium">${(netDebt / 1e6).toFixed(0)}M</div>
                      </div>

                      <div className="text-center">
                        <div
                          className="bg-indigo-500 w-16"
                          style={{ height: `${(equityValue / maxValue) * 100}px` }}
                        />
                        <div className="text-xs mt-1">Equity Value</div>
                        <div className="text-xs font-medium">${(equityValue / 1e6).toFixed(0)}M</div>
                      </div>

                      <div className="text-center">
                        <div
                          className="bg-purple-500 w-16 rounded-t"
                          style={{ height: `${((perShare * inputs.sharesOutstanding) / maxValue) * 100}px` }}
                        />
                        <div className="text-xs mt-1">Per Share</div>
                        <div className="text-xs font-medium">${formatNumber(perShare, 2)}</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Bridge Summary */}
              <div className="mt-4 grid grid-cols-5 gap-4 text-center text-sm">
                <div>
                  <div className="font-medium">${(outputs.pvOfFcff / 1e6).toFixed(0)}M</div>
                  <div className="text-gray-600">PV of FCFF</div>
                </div>
                <div>
                  <div className="font-medium">${(outputs.enterpriseValue / 1e6).toFixed(0)}M</div>
                  <div className="text-gray-600">Enterprise Value</div>
                  <div className="text-xs text-gray-500">{((outputs.terminalValue / outputs.enterpriseValue) * 100).toFixed(1)}% terminal</div>
                </div>
                <div>
                  <div className="font-medium">${(((financialData?.totalDebt?.[0] || 0) - (financialData?.cashAndEquivalents?.[0] || 0)) / 1e6).toFixed(0)}M</div>
                  <div className="text-gray-600">Net Debt</div>
                </div>
                <div>
                  <div className="font-medium">${(outputs.equityValue / 1e6).toFixed(0)}M</div>
                  <div className="text-gray-600">Equity Value</div>
                </div>
                <div>
                  <div className="font-medium">${formatNumber(outputs.intrinsicValuePerShare, 2)}</div>
                  <div className="text-gray-600">Per Share</div>
                </div>
              </div>

              {/* Terminal Value Warning */}
              {outputs.terminalValueContribution > 0.7 && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                    <div className="text-sm">
                      <strong>High Terminal Value:</strong> {((outputs.terminalValue / outputs.enterpriseValue) * 100).toFixed(1)}% of enterprise value comes from terminal value. This is unusually high - consider reviewing growth assumptions or extending the forecast period.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── DCF Final Presentation ────────────────────────────────────────────────────

const WACC_DELTAS  = [-0.02, -0.015, -0.01, -0.005, 0, 0.005, 0.01, 0.015, 0.02] as const;
const GROWTH_DELTAS = [-0.01, -0.0075, -0.005, -0.0025, 0, 0.0025, 0.005, 0.0075, 0.01] as const;
const MULT_DELTAS   = [-4, -3, -2, -1, 0, 1, 2, 3, 4] as const;

function fmtM(n: number | null | undefined, dec = 0): string {
  if (n == null || isNaN(n as number)) return '—';
  const m = (n as number) / 1_000_000;
  return m.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtPctFinal(n: number | null | undefined, dec = 1): string {
  if (n == null || isNaN(n as number)) return '—';
  return ((n as number) * 100).toFixed(dec) + '%';
}

function heatCell(value: number, base: number): { bg: string; fg: string } {
  if (!base || isNaN(value)) return { bg: '#F0F0F0', fg: '#888888' };
  const t = Math.max(-1, Math.min(1, (value - base) / base / 0.3));
  if (t >= 0) {
    const r = Math.round(255 - 229 * t), g = Math.round(255 - 184 * t), b = Math.round(255 - 206 * t);
    return { bg: `rgb(${r},${g},${b})`, fg: t > 0.55 ? '#FFFFFF' : '#1A4731' };
  }
  const s = -t;
  const r = Math.round(255 - 132 * s), g = Math.round(255 - 229 * s), b = Math.round(255 - 208 * s);
  return { bg: `rgb(${r},${g},${b})`, fg: s > 0.55 ? '#FFFFFF' : '#7B1A2F' };
}

// ─── Comps Table ──────────────────────────────────────────────────────────────

interface CompsRow {
  ticker: string; name: string; isSubject: boolean;
  sector: string | null; industry: string | null;
  marketCap: number | null; evToEBITDA: number | null; evToRevenue: number | null;
  peTrailing: number | null; peForward: number | null; priceToSales: number | null;
  priceToBook: number | null; revenueGrowthYoY: number | null;
  operatingMargin: number | null; ebitdaMargin: number | null;
  beta: number | null; revenueTTM: number | null; ebitda: number | null;
}

function compsFmtM(v: number | null): string {
  if (v === null) return '—';
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}B`;
  return `$${v.toFixed(0)}M`;
}
function compsFmtX(v: number | null): string { return v === null ? '—' : `${v.toFixed(1)}x`; }
function compsFmtPct(v: number | null): string { return v === null ? '—' : `${(v * 100).toFixed(1)}%`; }
function median(vals: number[]): number | null {
  const s = vals.filter(v => isFinite(v)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function DCFComps({
  inputs,
  compsData,
  setCompsData,
  includeInResearch,
  setIncludeInResearch,
}: {
  inputs: DCFInputs;
  compsData: CompsRow[];
  setCompsData: (rows: CompsRow[]) => void;
  includeInResearch: boolean;
  setIncludeInResearch: (v: boolean) => void;
}) {
  const [peerInput, setPeerInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string; isRateLimit?: boolean } | null>(null);
  const [peersSource, setPeersSource] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchComps = async (manualPeers?: string[]) => {
    if (!inputs.ticker) { setError({ message: 'Load a company in the DCF tool first.' }); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tools/comps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: inputs.ticker, peers: manualPeers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({
          message: data.error || 'Failed to fetch comps',
          details: data.details,
          isRateLimit: res.status === 429,
        });
        return;
      }
      setCompsData(data.rows || []);
      setPeersSource(data.peersSource);
      setHasFetched(true);
    } catch (e) {
      setError({ message: 'Network error fetching comps.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPeers = () => {
    const tickers = peerInput.split(/[\s,]+/).map(t => t.trim().toUpperCase()).filter(Boolean);
    if (!tickers.length) return;
    const existing = compsData.map(r => r.ticker);
    const newTickers = tickers.filter(t => !existing.includes(t));
    if (!newTickers.length) return;
    const existingPeers = compsData.filter(r => !r.isSubject).map(r => r.ticker);
    fetchComps([...existingPeers, ...newTickers]);
    setPeerInput('');
  };

  const handleRemovePeer = (ticker: string) => {
    const remaining = compsData.filter(r => !r.isSubject && r.ticker !== ticker).map(r => r.ticker);
    fetchComps(remaining);
  };

  // Compute medians (exclude subject)
  const peers = compsData.filter(r => !r.isSubject);
  const med = {
    evToEBITDA: median(peers.map(r => r.evToEBITDA).filter((v): v is number => v !== null)),
    evToRevenue: median(peers.map(r => r.evToRevenue).filter((v): v is number => v !== null)),
    peTrailing: median(peers.map(r => r.peTrailing).filter((v): v is number => v !== null)),
    peForward: median(peers.map(r => r.peForward).filter((v): v is number => v !== null)),
    priceToSales: median(peers.map(r => r.priceToSales).filter((v): v is number => v !== null)),
    revenueGrowthYoY: median(peers.map(r => r.revenueGrowthYoY).filter((v): v is number => v !== null)),
    operatingMargin: median(peers.map(r => r.operatingMargin).filter((v): v is number => v !== null)),
    ebitdaMargin: median(peers.map(r => r.ebitdaMargin).filter((v): v is number => v !== null)),
    beta: median(peers.map(r => r.beta).filter((v): v is number => v !== null)),
  };

  const cols = [
    { key: 'name',            label: 'Company',          fmt: (r: CompsRow) => <span className="font-medium">{r.name}<br/><span className="text-[10px] text-gray-400 font-mono">{r.ticker}</span></span>, medVal: null },
    { key: 'marketCap',       label: 'Mkt Cap',          fmt: (r: CompsRow) => compsFmtM(r.marketCap), medVal: null },
    { key: 'revenueTTM',      label: 'Rev TTM',          fmt: (r: CompsRow) => compsFmtM(r.revenueTTM), medVal: null },
    { key: 'evToRevenue',     label: 'EV/Rev',           fmt: (r: CompsRow) => compsFmtX(r.evToRevenue), medVal: compsFmtX(med.evToRevenue) },
    { key: 'evToEBITDA',      label: 'EV/EBITDA',        fmt: (r: CompsRow) => compsFmtX(r.evToEBITDA), medVal: compsFmtX(med.evToEBITDA) },
    { key: 'peTrailing',      label: 'P/E (TTM)',         fmt: (r: CompsRow) => compsFmtX(r.peTrailing), medVal: compsFmtX(med.peTrailing) },
    { key: 'peForward',       label: 'Fwd P/E',          fmt: (r: CompsRow) => compsFmtX(r.peForward), medVal: compsFmtX(med.peForward) },
    { key: 'priceToSales',    label: 'P/S',              fmt: (r: CompsRow) => compsFmtX(r.priceToSales), medVal: compsFmtX(med.priceToSales) },
    { key: 'revenueGrowthYoY',label: 'Rev Growth',       fmt: (r: CompsRow) => compsFmtPct(r.revenueGrowthYoY), medVal: compsFmtPct(med.revenueGrowthYoY) },
    { key: 'ebitdaMargin',    label: 'EBITDA Margin',    fmt: (r: CompsRow) => compsFmtPct(r.ebitdaMargin), medVal: compsFmtPct(med.ebitdaMargin) },
    { key: 'operatingMargin', label: 'Op Margin',        fmt: (r: CompsRow) => compsFmtPct(r.operatingMargin), medVal: compsFmtPct(med.operatingMargin) },
    { key: 'beta',            label: 'Beta',             fmt: (r: CompsRow) => r.beta !== null ? r.beta.toFixed(2) : '—', medVal: med.beta !== null ? med.beta.toFixed(2) : '—' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Comparable Companies</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Peer multiples benchmarked against {inputs.companyName || inputs.ticker || 'the subject company'}.
            {peersSource === 'fmp' && <span className="ml-1 text-xs text-blue-500">Peers auto-sourced via FMP</span>}
            {peersSource === 'manual' && <span className="ml-1 text-xs text-gray-400">Peers entered manually</span>}
            {peersSource === 'none' && <span className="ml-1 text-xs text-amber-500">No peers found — add them manually below</span>}
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={includeInResearch}
            onChange={e => setIncludeInResearch(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Include in Research Report</span>
        </label>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => fetchComps()}
          disabled={loading || !inputs.ticker}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Fetching…</>
          ) : hasFetched ? 'Refresh' : 'Build Comps Table'}
        </button>
        <div className="flex items-center gap-2">
          <input
            value={peerInput}
            onChange={e => setPeerInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddPeers()}
            placeholder="Add peers: MSFT, GOOGL, META"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddPeers}
            disabled={loading || !peerInput.trim()}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >Add</button>
        </div>
        {compsData.length > 0 && (
          <span className="text-xs text-gray-400">{compsData.length} companies · {peers.length} peers</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className={`rounded-lg border p-4 ${error.isRateLimit ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-sm font-semibold ${error.isRateLimit ? 'text-amber-800' : 'text-red-800'}`}>
            {error.isRateLimit ? '⏱ API Rate Limit Reached' : '⚠ Error'}
          </p>
          <p className={`text-sm mt-1 ${error.isRateLimit ? 'text-amber-700' : 'text-red-700'}`}>{error.message}</p>
          {error.details && <p className="text-xs mt-1 text-gray-500">{error.details}</p>}
        </div>
      )}

      {/* Empty state */}
      {!hasFetched && !loading && !error && (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-10 text-center text-gray-400">
          <p className="text-sm">Click <strong>Build Comps Table</strong> to auto-fetch peers and multiples for {inputs.ticker || 'your ticker'}.</p>
          <p className="text-xs mt-1">Or enter peer tickers manually above before fetching.</p>
        </div>
      )}

      {/* Table */}
      {compsData.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {cols.map(c => (
                  <th key={c.key} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{c.label}</th>
                ))}
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody>
              {compsData.map((row, i) => (
                <tr key={row.ticker} className={`border-b border-gray-100 ${row.isSubject ? 'bg-blue-50 font-semibold' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                  {cols.map(c => (
                    <td key={c.key} className={`px-3 py-2.5 ${row.isSubject ? 'text-blue-900' : 'text-gray-700'}`}>{c.fmt(row)}</td>
                  ))}
                  <td className="px-3 py-2.5">
                    {!row.isSubject && (
                      <button onClick={() => handleRemovePeer(row.ticker)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                    )}
                  </td>
                </tr>
              ))}
              {/* Median row */}
              {peers.length >= 2 && (
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-medium">
                  <td className="px-3 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wide">Peer Median</td>
                  <td className="px-3 py-2.5 text-gray-500">—</td>
                  <td className="px-3 py-2.5 text-gray-500">—</td>
                  {cols.slice(3).map(c => (
                    <td key={c.key} className="px-3 py-2.5 text-gray-700">{c.medVal}</td>
                  ))}
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Subject vs median callout */}
      {compsData.length > 0 && (() => {
        const subj = compsData.find(r => r.isSubject);
        if (!subj || !med.evToEBITDA || !subj.evToEBITDA) return null;
        const premium = ((subj.evToEBITDA - med.evToEBITDA) / med.evToEBITDA) * 100;
        const isDiscount = premium < -5;
        const isPremium = premium > 5;
        return (
          <div className={`rounded-lg p-3 text-sm ${isPremium ? 'bg-amber-50 border border-amber-200 text-amber-800' : isDiscount ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-gray-50 border border-gray-200 text-gray-600'}`}>
            <span className="font-semibold">{subj.name}</span> trades at <span className="font-semibold">{compsFmtX(subj.evToEBITDA)}</span> EV/EBITDA vs peer median of <span className="font-semibold">{compsFmtX(med.evToEBITDA)}</span> — a <span className="font-semibold">{Math.abs(premium).toFixed(0)}% {isPremium ? 'premium' : isDiscount ? 'discount' : 'inline'}</span> to peers.
          </div>
        );
      })()}
    </div>
  );
}

function DCFFinalPresentation({ inputs, outputs }: { inputs: DCFInputs; outputs: DCFOutputs }) {
  const NAVY    = '#1F3864';
  const DKGREEN = '#1A4731';
  const DKMAROON = '#7B1A2F';

  const years = Array.from({ length: inputs.forecastYears }, (_, i) => i);

  const depRateAt = (i: number) =>
    inputs.forecastMode === 'advanced' && inputs.depreciationByYear?.[i] != null
      ? inputs.depreciationByYear![i] : inputs.depreciationPercentOfRevenue;
  const capRateAt = (i: number) =>
    inputs.forecastMode === 'advanced' && inputs.capexByYear?.[i] != null
      ? inputs.capexByYear![i] : inputs.capexPercentOfRevenue;

  const dna    = years.map(i => outputs.revenues[i] * depRateAt(i));
  const capex  = years.map(i => outputs.revenues[i] * capRateAt(i));
  const nwcChg = years.map(i => outputs.nopat[i] + dna[i] - capex[i] - outputs.freeCashFlow[i]);
  const ebitda = years.map(i => outputs.ebit[i] + dna[i]);
  const taxes  = years.map(i => outputs.ebit[i] - outputs.nopat[i]);

  const discFactor = (i: number) => {
    const p = inputs.midYearConvention ? i + 0.5 : i + 1;
    return 1 / Math.pow(1 + outputs.wacc, p);
  };
  const pvFcfYear = years.map(i => outputs.freeCashFlow[i] * discFactor(i));

  const lastFCFF   = outputs.freeCashFlow[outputs.freeCashFlow.length - 1];
  const lastEBITDA = ebitda[ebitda.length - 1];
  const n          = inputs.forecastYears;

  const tvPerp = outputs.wacc > inputs.perpetualGrowth
    ? lastFCFF * (1 + inputs.perpetualGrowth) / (outputs.wacc - inputs.perpetualGrowth)
    : 0;
  const pvTvPerp = tvPerp / Math.pow(1 + outputs.wacc, n);
  const tvMult   = lastEBITDA * inputs.exitMultiple;
  const pvTvMult = tvMult  / Math.pow(1 + outputs.wacc, n);
  const pvFcfTotal = outputs.pvOfFcff;

  function bridgeEquity(pvTV: number) {
    const ev = pvFcfTotal + pvTV;
    return ev - inputs.totalDebt + inputs.cashEquivalents
      - inputs.preferredEquity - inputs.minorityInterest + inputs.nonOperatingAssets;
  }
  const eqPerp    = bridgeEquity(pvTvPerp);
  const eqMult    = bridgeEquity(pvTvMult);
  const pricePerp = inputs.sharesDiluted > 0 ? eqPerp / inputs.sharesDiluted : 0;
  const priceMult = inputs.sharesDiluted > 0 ? eqMult / inputs.sharesDiluted : 0;
  const premPerp  = inputs.currentPrice > 0 ? pricePerp / inputs.currentPrice - 1 : 0;
  const premMult  = inputs.currentPrice > 0 ? priceMult / inputs.currentPrice - 1 : 0;

  // Sensitivity grids
  const sensitivityData = useMemo(() => {
    const { freeCashFlow: fcfs, wacc } = outputs;
    const { forecastYears: fy, totalDebt: D, cashEquivalents: C, preferredEquity: P,
            minorityInterest: M, nonOperatingAssets: NO, sharesDiluted: S,
            midYearConvention: mid, perpetualGrowth: g0, exitMultiple: em0 } = inputs;

    function price(adjWacc: number, adjTV: number): number {
      const pv = fcfs.reduce((s, f, i) => s + f / Math.pow(1 + adjWacc, mid ? i + 0.5 : i + 1), 0);
      const ev = pv + adjTV / Math.pow(1 + adjWacc, fy);
      return S > 0 ? (ev - D + C - P - M + NO) / S : 0;
    }

    const perpGrid = WACC_DELTAS.map(wd => GROWTH_DELTAS.map(gd => {
      const aw = wacc + wd, ag = g0 + gd;
      return aw > ag ? price(aw, lastFCFF * (1 + ag) / (aw - ag)) : NaN;
    }));
    const multGrid = WACC_DELTAS.map(wd => MULT_DELTAS.map(md =>
      price(wacc + wd, lastEBITDA * (em0 + md))
    ));
    return { perpGrid, multGrid };
  }, [inputs, outputs, lastFCFF, lastEBITDA]);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/dcf-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs, outputs }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${inputs.ticker || 'DCF'}_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Export failed. Please try again.'); }
    setExporting(false);
  };

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const p2 = (n: number) => n.toFixed(2);

  const bridgeRows: Array<{ label: string; perp: string; mult: string; bold?: boolean; big?: boolean; perpClr?: string; multClr?: string }> = [
    { label: 'PV of Unlevered FCFs',       perp: fmtM(pvFcfTotal),             mult: fmtM(pvFcfTotal) },
    { label: '(+) PV of Terminal Value',   perp: fmtM(pvTvPerp),               mult: fmtM(pvTvMult) },
    { label: '= Enterprise Value',         perp: fmtM(pvFcfTotal + pvTvPerp),  mult: fmtM(pvFcfTotal + pvTvMult), bold: true },
    { label: '(–) Total Debt',             perp: `(${fmtM(inputs.totalDebt)})`, mult: `(${fmtM(inputs.totalDebt)})` },
    { label: '(+) Cash & Equivalents',     perp: fmtM(inputs.cashEquivalents), mult: fmtM(inputs.cashEquivalents) },
    ...(inputs.preferredEquity ? [{ label: '(–) Preferred Equity',    perp: `(${fmtM(inputs.preferredEquity)})`, mult: `(${fmtM(inputs.preferredEquity)})` }] : []),
    ...(inputs.minorityInterest ? [{ label: '(–) Minority Interest',   perp: `(${fmtM(inputs.minorityInterest)})`, mult: `(${fmtM(inputs.minorityInterest)})` }] : []),
    ...(inputs.nonOperatingAssets ? [{ label: '(+) Non-Operating Assets', perp: fmtM(inputs.nonOperatingAssets), mult: fmtM(inputs.nonOperatingAssets) }] : []),
    { label: '= Implied Equity Value',     perp: fmtM(eqPerp),                 mult: fmtM(eqMult), bold: true },
    { label: '÷ Diluted Shares (M)',       perp: (inputs.sharesDiluted / 1e6).toFixed(1), mult: (inputs.sharesDiluted / 1e6).toFixed(1) },
    { label: 'Implied Share Price',        perp: `$${p2(pricePerp)}`,          mult: `$${p2(priceMult)}`, bold: true, big: true, perpClr: DKGREEN, multClr: DKMAROON },
    { label: 'Current Share Price',        perp: inputs.currentPrice > 0 ? `$${p2(inputs.currentPrice)}` : '—', mult: inputs.currentPrice > 0 ? `$${p2(inputs.currentPrice)}` : '—' },
    { label: 'Premium / (Discount)',       perp: inputs.currentPrice > 0 ? `${premPerp >= 0 ? '+' : ''}${fmtPctFinal(premPerp)}` : '—', mult: inputs.currentPrice > 0 ? `${premMult >= 0 ? '+' : ''}${fmtPctFinal(premMult)}` : '—', bold: true, perpClr: premPerp >= 0 ? DKGREEN : DKMAROON, multClr: premMult >= 0 ? DKGREEN : DKMAROON },
    { label: 'Terminal Value % of EV',     perp: fmtPctFinal(pvTvPerp / (pvFcfTotal + pvTvPerp)), mult: fmtPctFinal(pvTvMult / (pvFcfTotal + pvTvMult)) },
  ];

  return (
    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden text-xs" style={{ fontFamily: '"Calibri", "Segoe UI", Arial, sans-serif' }}>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <span className="text-[11px] text-gray-500 font-medium">Discounted Cash Flow — Investment Bank Format</span>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="text-[11px] px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 font-medium text-gray-600">Print / PDF</button>
          <button onClick={handleExport} disabled={exporting} className="text-[11px] px-3 py-1.5 rounded font-semibold text-white disabled:opacity-60" style={{ backgroundColor: NAVY }}>
            {exporting ? 'Exporting…' : '⬇ Export to Excel'}
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="px-6 py-5 text-white" style={{ backgroundColor: NAVY }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {inputs.companyName || 'Company'}{inputs.ticker ? ` (${inputs.ticker})` : ''}
            </h1>
            <h2 className="text-sm font-semibold text-white/70 mt-0.5">Discounted Cash Flow Analysis</h2>
          </div>
          <div className="text-right text-[11px] text-white/50">
            <div>Amounts in {inputs.currency}M unless noted</div>
            <div className="mt-0.5">{today}</div>
          </div>
        </div>
      </div>

      {/* ── Assumptions & Output ─────────────────────────────── */}
      <table className="w-full border-collapse">
        <tbody>
          <tr><td colSpan={3} className="text-white text-[11px] font-bold uppercase tracking-wider py-2 px-3" style={{ backgroundColor: NAVY }}>DCF Assumptions &amp; Output</td></tr>
          <tr className="align-top">
            {/* Left: WACC Inputs */}
            <td className="border border-gray-200 p-0 align-top w-[220px]">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr><td colSpan={2} className="py-1.5 px-3 text-white text-[10px] font-semibold" style={{ backgroundColor: DKGREEN }}>WACC &amp; Key Assumptions</td></tr>
                </thead>
                <tbody>
                  {([
                    ['Risk-Free Rate',       fmtPctFinal(inputs.riskFreeRate, 2)],
                    ['Equity Risk Premium',  fmtPctFinal(inputs.equityRiskPremium, 2)],
                    ['Beta',                 inputs.beta.toFixed(2) + 'x'],
                    ['Cost of Equity',       fmtPctFinal(outputs.costOfEquity, 2)],
                    ['Pre-Tax Cost of Debt', fmtPctFinal(inputs.costOfDebt, 2)],
                    ['Tax Rate',             fmtPctFinal(inputs.taxRate, 1)],
                    ['After-Tax Cost of Debt', fmtPctFinal(outputs.afterTaxCostOfDebt, 2)],
                    ['Target Debt Ratio',    fmtPctFinal(inputs.targetDebtRatio, 1)],
                  ] as [string,string][]).map(([label, val], i) => (
                    <tr key={label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-1 px-3 text-gray-700 border-b border-gray-100">{label}</td>
                      <td className="py-1 px-3 text-right font-mono text-gray-800 border-b border-gray-100">{val}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#DBEAFF' }}>
                    <td className="py-1.5 px-3 font-bold border-b border-gray-300">WACC</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold border-b border-gray-300" style={{ color: DKGREEN }}>{fmtPctFinal(outputs.wacc, 2)}</td>
                  </tr>
                  <tr className="bg-gray-100">
                    <td colSpan={2} className="py-1 px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">Terminal Value</td>
                  </tr>
                  {([
                    ['Perpetuity Growth Rate', fmtPctFinal(inputs.perpetualGrowth, 2)],
                    ['Exit Multiple', `${inputs.exitMultiple.toFixed(1)}x ${inputs.exitMultipleMetric.toUpperCase()}`],
                    ['Forecast Horizon', `${inputs.forecastYears} years`],
                    ['Mid-Year Convention', inputs.midYearConvention ? 'Yes' : 'No'],
                  ] as [string,string][]).map(([label, val], i) => (
                    <tr key={label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-1 px-3 text-gray-700 border-b border-gray-100">{label}</td>
                      <td className="py-1 px-3 text-right font-mono text-gray-800 border-b border-gray-100">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>

            {/* Right: Bridge Methods */}
            <td className="border border-gray-200 p-0 align-top" colSpan={2}>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    <td className="py-1.5 px-3 text-[10px] text-gray-500 border-b border-r border-gray-200 bg-gray-50 w-[40%]">Bridge</td>
                    <td className="py-1.5 px-3 font-bold text-center border-b border-r border-gray-200 text-white" style={{ backgroundColor: DKGREEN }}>Perpetuity Growth Method</td>
                    <td className="py-1.5 px-3 font-bold text-center border-b border-gray-200 text-white" style={{ backgroundColor: DKMAROON }}>Exit Multiple Method</td>
                  </tr>
                </thead>
                <tbody>
                  {bridgeRows.map((row, idx) => (
                    <tr key={idx} className={row.big ? '' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} style={row.big ? { backgroundColor: '#DBEAFF' } : {}}>
                      <td className={`py-1 px-3 border-b border-r border-gray-100 text-gray-700 ${row.bold ? 'font-bold' : ''}`}>{row.label}</td>
                      <td className={`py-1 px-3 text-right font-mono border-b border-r border-gray-100 ${row.bold ? 'font-bold' : ''} ${row.big ? 'text-base' : ''}`} style={{ color: row.perpClr || '' }}>{row.perp}</td>
                      <td className={`py-1 px-3 text-right font-mono border-b border-gray-100 ${row.bold ? 'font-bold' : ''} ${row.big ? 'text-base' : ''}`} style={{ color: row.multClr || '' }}>{row.mult}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── FCF Projections ──────────────────────────────────── */}
      <div className="overflow-x-auto border-t-2 border-gray-400">
        <table className="border-collapse" style={{ minWidth: '100%', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '210px' }} />
            {years.map(i => <col key={i} style={{ width: `${Math.max(70, Math.min(110, 680 / inputs.forecastYears))}px` }} />)}
          </colgroup>
          <thead>
            <tr>
              <th colSpan={inputs.forecastYears + 1} className="text-left text-white text-[11px] font-bold uppercase tracking-wider py-2 px-3" style={{ backgroundColor: NAVY }}>
                Unlevered Free Cash Flow Projections ({inputs.currency}M)
              </th>
            </tr>
            <tr style={{ backgroundColor: NAVY }}>
              <th className="py-1.5 px-3 text-left text-white/50 text-[10px] font-normal border-r border-white/20">{inputs.currency}M</th>
              {years.map(i => <th key={i} className="py-1.5 px-2 text-right text-white text-[11px] font-bold border-r border-white/20">FY{i + 1}</th>)}
            </tr>
          </thead>
          <tbody>
            {/* Revenue */}
            <tr><td colSpan={inputs.forecastYears + 1} className="py-1 px-3 text-white text-[10px] font-semibold" style={{ backgroundColor: DKGREEN }}>Revenue</td></tr>
            <tr className="bg-white">
              <td className="py-1 px-3 font-semibold text-gray-800 border-b border-r border-gray-100">Revenue</td>
              {years.map(i => <td key={i} className="py-1 px-2 text-right font-mono text-gray-800 border-b border-r border-gray-100">{fmtM(outputs.revenues[i])}</td>)}
            </tr>
            <tr className="bg-gray-50 italic text-gray-400">
              <td className="py-0.5 px-3 border-b border-r border-gray-100 pl-6">% Growth</td>
              {years.map(i => { const g = i === 0 ? outputs.revenues[0] / inputs.startingRevenue - 1 : outputs.revenues[i] / outputs.revenues[i-1] - 1; return <td key={i} className="py-0.5 px-2 text-right font-mono border-b border-r border-gray-100">{fmtPctFinal(g)}</td>; })}
            </tr>
            {/* EBIT */}
            <tr><td colSpan={inputs.forecastYears + 1} className="py-1 px-3 text-white text-[10px] font-semibold" style={{ backgroundColor: DKGREEN }}>Earnings Before Interest &amp; Taxes (EBIT)</td></tr>
            <tr className="bg-white">
              <td className="py-1 px-3 font-semibold text-gray-800 border-b border-r border-gray-100">EBIT</td>
              {years.map(i => <td key={i} className="py-1 px-2 text-right font-mono text-gray-800 border-b border-r border-gray-100">{fmtM(outputs.ebit[i])}</td>)}
            </tr>
            <tr className="bg-gray-50 italic text-gray-400">
              <td className="py-0.5 px-3 border-b border-r border-gray-100 pl-6">% EBIT Margin</td>
              {years.map(i => <td key={i} className="py-0.5 px-2 text-right font-mono border-b border-r border-gray-100">{fmtPctFinal(outputs.ebit[i] / outputs.revenues[i])}</td>)}
            </tr>
            <tr className="bg-white text-gray-700">
              <td className="py-1 px-3 border-b border-r border-gray-100 pl-5">(–) Income Taxes</td>
              {years.map(i => <td key={i} className="py-1 px-2 text-right font-mono border-b border-r border-gray-100">({fmtM(taxes[i])})</td>)}
            </tr>
            <tr style={{ backgroundColor: '#DBEAFF' }}>
              <td className="py-1.5 px-3 font-bold border-b border-t border-r border-gray-300">= NOPAT</td>
              {years.map(i => <td key={i} className="py-1.5 px-2 text-right font-mono font-bold border-b border-t border-r border-gray-300">{fmtM(outputs.nopat[i])}</td>)}
            </tr>
            {/* D&A */}
            <tr><td colSpan={inputs.forecastYears + 1} className="py-1 px-3 text-white text-[10px] font-semibold italic" style={{ backgroundColor: DKMAROON }}>Adjustments for Non-Cash Charges</td></tr>
            <tr className="bg-white text-gray-700">
              <td className="py-1 px-3 border-b border-r border-gray-100 pl-5">(+) Depreciation &amp; Amortization</td>
              {years.map(i => <td key={i} className="py-1 px-2 text-right font-mono border-b border-r border-gray-100">{fmtM(dna[i])}</td>)}
            </tr>
            <tr className="bg-gray-50 italic text-gray-400">
              <td className="py-0.5 px-3 border-b border-r border-gray-100 pl-8">% Revenue</td>
              {years.map(i => <td key={i} className="py-0.5 px-2 text-right font-mono border-b border-r border-gray-100">{fmtPctFinal(dna[i] / outputs.revenues[i])}</td>)}
            </tr>
            {/* NWC */}
            <tr><td colSpan={inputs.forecastYears + 1} className="py-1 px-3 text-white text-[10px] font-semibold italic" style={{ backgroundColor: DKMAROON }}>Changes in Net Working Capital</td></tr>
            <tr className="bg-white text-gray-700">
              <td className="py-1 px-3 border-b border-r border-gray-100 pl-5">(–) Increase in Net Working Capital</td>
              {years.map(i => <td key={i} className="py-1 px-2 text-right font-mono border-b border-r border-gray-100">({fmtM(nwcChg[i])})</td>)}
            </tr>
            <tr className="bg-gray-50 italic text-gray-400">
              <td className="py-0.5 px-3 border-b border-r border-gray-100 pl-8">% Δ Revenue</td>
              {years.map(i => { const dR = i === 0 ? outputs.revenues[0] - inputs.startingRevenue : outputs.revenues[i] - outputs.revenues[i-1]; return <td key={i} className="py-0.5 px-2 text-right font-mono border-b border-r border-gray-100">{dR ? fmtPctFinal(nwcChg[i] / dR) : '—'}</td>; })}
            </tr>
            {/* Capex */}
            <tr><td colSpan={inputs.forecastYears + 1} className="py-1 px-3 text-white text-[10px] font-semibold italic" style={{ backgroundColor: DKMAROON }}>Capital Expenditures</td></tr>
            <tr className="bg-white text-gray-700">
              <td className="py-1 px-3 border-b border-r border-gray-100 pl-5">(–) Capital Expenditures</td>
              {years.map(i => <td key={i} className="py-1 px-2 text-right font-mono border-b border-r border-gray-100">({fmtM(capex[i])})</td>)}
            </tr>
            <tr className="bg-gray-50 italic text-gray-400">
              <td className="py-0.5 px-3 border-b border-r border-gray-100 pl-8">% Revenue</td>
              {years.map(i => <td key={i} className="py-0.5 px-2 text-right font-mono border-b border-r border-gray-100">{fmtPctFinal(capex[i] / outputs.revenues[i])}</td>)}
            </tr>
            {/* FCFF */}
            <tr style={{ backgroundColor: NAVY }}>
              <td className="py-2 px-3 text-white font-bold border-r border-white/20">= Unlevered Free Cash Flow (FCFF)</td>
              {years.map(i => <td key={i} className="py-2 px-2 text-right font-mono font-bold text-white border-r border-white/20">{fmtM(outputs.freeCashFlow[i])}</td>)}
            </tr>
            <tr className="bg-gray-50 italic text-gray-400">
              <td className="py-0.5 px-3 border-b border-r border-gray-100 pl-6">% Growth</td>
              {years.map(i => { const g = i === 0 ? null : outputs.freeCashFlow[i] / outputs.freeCashFlow[i-1] - 1; return <td key={i} className="py-0.5 px-2 text-right font-mono border-b border-r border-gray-100">{g != null ? fmtPctFinal(g) : '—'}</td>; })}
            </tr>
            {/* Discount rows */}
            <tr className="bg-white text-gray-600">
              <td className="py-1 px-3 border-b border-r border-gray-100 pl-5">Period</td>
              {years.map(i => <td key={i} className="py-1 px-2 text-right font-mono border-b border-r border-gray-100">{inputs.midYearConvention ? (i + 0.5).toFixed(1) : (i + 1)}</td>)}
            </tr>
            <tr className="bg-gray-50 text-gray-600">
              <td className="py-1 px-3 border-b border-r border-gray-100 pl-5">Discount Factor</td>
              {years.map(i => <td key={i} className="py-1 px-2 text-right font-mono border-b border-r border-gray-100">{discFactor(i).toFixed(4)}</td>)}
            </tr>
            <tr style={{ backgroundColor: '#DBEAFF' }}>
              <td className="py-1.5 px-3 font-bold border-b border-t border-r border-gray-300 pl-5">PV of Unlevered FCF</td>
              {years.map(i => <td key={i} className="py-1.5 px-2 text-right font-mono font-bold border-b border-t border-r border-gray-300" style={{ color: DKGREEN }}>{fmtM(pvFcfYear[i])}</td>)}
            </tr>
            {/* EBITDA */}
            <tr><td colSpan={inputs.forecastYears + 1} className="py-1 px-3 text-white text-[10px] font-semibold" style={{ backgroundColor: DKGREEN }}>EBITDA</td></tr>
            <tr className="bg-white">
              <td className="py-1 px-3 font-semibold text-gray-800 border-b border-r border-gray-100">EBITDA</td>
              {years.map(i => <td key={i} className="py-1 px-2 text-right font-mono text-gray-800 border-b border-r border-gray-100">{fmtM(ebitda[i])}</td>)}
            </tr>
            <tr className="bg-gray-50 italic text-gray-400">
              <td className="py-0.5 px-3 border-b border-r border-gray-100 pl-6">% EBITDA Margin</td>
              {years.map(i => <td key={i} className="py-0.5 px-2 text-right font-mono border-b border-r border-gray-100">{fmtPctFinal(ebitda[i] / outputs.revenues[i])}</td>)}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Sensitivity Tables ───────────────────────────────── */}
      <div className="grid grid-cols-2 border-t-2 border-gray-400">
        {/* Perpetuity Growth */}
        <div className="border-r border-gray-300 overflow-x-auto">
          <table className="border-collapse w-full text-[10px]">
            <thead>
              <tr><th colSpan={GROWTH_DELTAS.length + 1} className="text-left text-white text-[11px] font-bold py-2 px-3" style={{ backgroundColor: NAVY }}>Sensitivity — Perpetuity Growth Method (Implied Share Price)</th></tr>
              <tr style={{ backgroundColor: DKGREEN }}>
                <th className="py-1.5 px-2 text-white font-semibold text-left text-[10px]">WACC \ g</th>
                {GROWTH_DELTAS.map((gd, j) => <th key={j} className="py-1.5 px-2 text-right text-white font-semibold">{fmtPctFinal(inputs.perpetualGrowth + gd, 2)}</th>)}
              </tr>
            </thead>
            <tbody>
              {WACC_DELTAS.map((wd, i) => (
                <tr key={i}>
                  <td className="py-1 px-2 font-semibold text-white" style={{ backgroundColor: DKGREEN }}>{fmtPctFinal(outputs.wacc + wd, 2)}</td>
                  {GROWTH_DELTAS.map((_, j) => {
                    const v = sensitivityData.perpGrid[i]?.[j] ?? NaN;
                    const { bg, fg } = heatCell(v, inputs.currentPrice || pricePerp);
                    const isBase = i === 4 && j === 4;
                    return <td key={j} className={`py-1 px-2 text-right font-mono ${isBase ? 'outline outline-2 outline-black font-bold' : ''}`} style={{ backgroundColor: bg, color: fg }}>{isNaN(v) ? '—' : `$${v.toFixed(2)}`}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Exit Multiple */}
        <div className="overflow-x-auto">
          <table className="border-collapse w-full text-[10px]">
            <thead>
              <tr><th colSpan={MULT_DELTAS.length + 1} className="text-left text-white text-[11px] font-bold py-2 px-3" style={{ backgroundColor: NAVY }}>Sensitivity — Exit Multiple Method (Implied Share Price)</th></tr>
              <tr style={{ backgroundColor: DKMAROON }}>
                <th className="py-1.5 px-2 text-white font-semibold text-left text-[10px]">WACC \ EV/EBITDA</th>
                {MULT_DELTAS.map((md, j) => <th key={j} className="py-1.5 px-2 text-right text-white font-semibold">{(inputs.exitMultiple + md).toFixed(1)}x</th>)}
              </tr>
            </thead>
            <tbody>
              {WACC_DELTAS.map((wd, i) => (
                <tr key={i}>
                  <td className="py-1 px-2 font-semibold text-white" style={{ backgroundColor: DKMAROON }}>{fmtPctFinal(outputs.wacc + wd, 2)}</td>
                  {MULT_DELTAS.map((_, j) => {
                    const v = sensitivityData.multGrid[i]?.[j] ?? NaN;
                    const { bg, fg } = heatCell(v, inputs.currentPrice || priceMult);
                    const isBase = i === 4 && j === 4;
                    return <td key={j} className={`py-1 px-2 text-right font-mono ${isBase ? 'outline outline-2 outline-black font-bold' : ''}`} style={{ backgroundColor: bg, color: fg }}>{isNaN(v) ? '—' : `$${v.toFixed(2)}`}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer disclaimer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-400">
        <strong className="text-gray-500">Disclaimer:</strong> For educational and research purposes only. Not investment advice. Actual results may differ materially.
      </div>
    </div>
  );
}

// DCF Calculation Logic
function calculateDCF(inputs: DCFInputs): DCFOutputs {
  const normalizedInputs = normalizeInputsForForecastYears(inputs);
  const revenues: number[] = [];
  const ebit: number[] = [];
  const nopat: number[] = [];
  const freeCashFlow: number[] = [];

  // Calculate operating forecasts
  let revenue = normalizedInputs.startingRevenue;

  for (let year = 0; year < normalizedInputs.forecastYears; year++) {
    revenue *= (1 + normalizedInputs.revenueGrowth[year]);
    revenues.push(revenue);

    // EBIT calculation - use advanced mode if available, otherwise simple mode
    const ebitMargin = normalizedInputs.forecastMode === 'advanced' && normalizedInputs.ebitMarginAdvanced
      ? normalizedInputs.ebitMarginAdvanced[year]
      : normalizedInputs.ebitMargin[year];
    const ebitValue = revenue * ebitMargin;
    ebit.push(ebitValue);

    // Tax rate - use advanced mode if available, otherwise simple mode
    const taxRate = normalizedInputs.forecastMode === 'advanced' && normalizedInputs.cashTaxRateByYear
      ? normalizedInputs.cashTaxRateByYear[year]
      : normalizedInputs.cashTaxRate;
    const nopatValue = ebitValue * (1 - taxRate);
    nopat.push(nopatValue);

    // Working capital changes
    let nwcChange = 0;
    if (year === 0) {
      // First year: assume NWC builds from zero
      const revenueChange = revenue - normalizedInputs.startingRevenue;
      nwcChange = revenueChange * (normalizedInputs.forecastMode === 'advanced' && normalizedInputs.nwcChangeByYear
        ? normalizedInputs.nwcChangeByYear[year]
        : normalizedInputs.nwcChangePercentOfRevenueChange);
    } else {
      // Subsequent years: change based on revenue growth
      const revenueChange = revenues[year] - revenues[year - 1];
      nwcChange = revenueChange * (normalizedInputs.forecastMode === 'advanced' && normalizedInputs.nwcChangeByYear
        ? normalizedInputs.nwcChangeByYear[year]
        : normalizedInputs.nwcChangePercentOfRevenueChange);
    }

    // Depreciation
    const depreciation = revenue * (normalizedInputs.forecastMode === 'advanced' && normalizedInputs.depreciationByYear
      ? normalizedInputs.depreciationByYear[year]
      : normalizedInputs.depreciationPercentOfRevenue);

    // Capex
    const capex = revenue * (normalizedInputs.forecastMode === 'advanced' && normalizedInputs.capexByYear
      ? normalizedInputs.capexByYear[year]
      : normalizedInputs.capexPercentOfRevenue);

    // FCFF calculation
    const fcff = nopatValue + depreciation - capex - nwcChange;
    freeCashFlow.push(fcff);
  }

  // Calculate WACC
  const costOfEquity = normalizedInputs.riskFreeRate + normalizedInputs.beta * normalizedInputs.equityRiskPremium;
  const afterTaxCostOfDebt = normalizedInputs.costOfDebt * (1 - normalizedInputs.taxRate);
  const wacc = costOfEquity * (1 - normalizedInputs.targetDebtRatio) + afterTaxCostOfDebt * normalizedInputs.targetDebtRatio;

  // Calculate terminal value
  let terminalValue = 0;
  const lastFCFF = freeCashFlow[freeCashFlow.length - 1];
  const lastRevenue = revenues[revenues.length - 1];
  const lastEBIT = ebit[ebit.length - 1];
  // Use terminal-year D&A rate (respects advanced mode)
  const terminalDepRate = normalizedInputs.forecastMode === 'advanced' && normalizedInputs.depreciationByYear
    ? normalizedInputs.depreciationByYear[normalizedInputs.depreciationByYear.length - 1]
    : normalizedInputs.depreciationPercentOfRevenue;

  if (normalizedInputs.terminalMethod === 'perpetual') {
    terminalValue = lastFCFF * (1 + normalizedInputs.perpetualGrowth) / (wacc - normalizedInputs.perpetualGrowth);
  } else if (normalizedInputs.terminalMethod === 'multiple') {
    let exitMetric = 0;
    if (normalizedInputs.exitMultipleMetric === 'ebitda') {
      exitMetric = lastEBIT + lastRevenue * terminalDepRate;
    } else if (normalizedInputs.exitMultipleMetric === 'ebit') {
      exitMetric = lastEBIT;
    } else {
      exitMetric = lastFCFF;
    }
    terminalValue = exitMetric * normalizedInputs.exitMultiple;
  } else if (normalizedInputs.terminalMethod === 'both') {
    // Perpetuity component
    const perpetualTV = lastFCFF * (1 + normalizedInputs.perpetualGrowth) / (wacc - normalizedInputs.perpetualGrowth);

    // Multiple component
    let exitMetric = 0;
    if (normalizedInputs.exitMultipleMetric === 'ebitda') {
      exitMetric = lastEBIT + lastRevenue * terminalDepRate;
    } else if (normalizedInputs.exitMultipleMetric === 'ebit') {
      exitMetric = lastEBIT;
    } else {
      exitMetric = lastFCFF;
    }
    const multipleTV = exitMetric * normalizedInputs.exitMultiple;

    // Weighted average
    terminalValue = (perpetualTV * normalizedInputs.terminalWeighting) + (multipleTV * (1 - normalizedInputs.terminalWeighting));
  }

  // Calculate present values (with mid-year convention if enabled)
  let pvFcff = 0;
  for (let i = 0; i < freeCashFlow.length; i++) {
    const discountPeriod = normalizedInputs.midYearConvention ? i + 0.5 : i + 1;
    pvFcff += freeCashFlow[i] / Math.pow(1 + wacc, discountPeriod);
  }
  const pvTerminal = terminalValue / Math.pow(1 + wacc, normalizedInputs.forecastYears);

  // Calculate enterprise and equity value
  const enterpriseValue = pvFcff + pvTerminal;
  const netDebt = normalizedInputs.totalDebt - normalizedInputs.cashEquivalents;
  const equityValue = enterpriseValue - netDebt - normalizedInputs.preferredEquity - normalizedInputs.minorityInterest + normalizedInputs.nonOperatingAssets;
  const sharesDiluted = normalizedInputs.sharesDiluted || 100000000; // Default if not set
  const intrinsicValuePerShare = equityValue / sharesDiluted;
  const upsideDownside = normalizedInputs.currentPrice !== 0 ? (intrinsicValuePerShare - normalizedInputs.currentPrice) / normalizedInputs.currentPrice : 0;
  // PV of terminal value as % of EV — the meaningful sensitivity indicator
  const terminalValueContribution = enterpriseValue > 0 ? pvTerminal / enterpriseValue : 0;

  return {
    revenues,
    ebit,
    nopat,
    freeCashFlow,
    terminalValue,
    pvOfFcff: pvFcff,
    pvOfTerminalValue: pvTerminal,
    enterpriseValue,
    equityValue,
    intrinsicValuePerShare,
    upsideDownside,
    terminalValueContribution,
    costOfEquity,
    afterTaxCostOfDebt,
    wacc,
  };
}

// Ticker Search Component with Autocomplete
function TickerSearch({
  onSelectCompany,
  onRunAnalysis,
  selectedCompany,
  isAnalyzing
}: {
  onSelectCompany: (company: CompanyOverview) => Promise<void>;
  onRunAnalysis: (ticker: string) => Promise<void>;
  selectedCompany: CompanyOverview | null;
  isAnalyzing: boolean;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchTickers = async (searchQuery: string) => {
    console.log('Searching for:', searchQuery);
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      console.log('Making API call to:', `/api/alpha-vantage/search?q=${encodeURIComponent(searchQuery)}`);
      const response = await fetch(`/api/alpha-vantage/search?q=${encodeURIComponent(searchQuery)}`);
      console.log('API response status:', response.status);

      const data = await response.json();
      console.log('API response data:', data);

      if (data.error) {
        console.error('Search error:', data.error);
        setSuggestions([]);
      } else {
        console.log('Setting suggestions:', data.results);
        setSuggestions(data.results || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('Input changed to:', value);
    setQuery(value);
    searchTickers(value);
  };

  const selectCompany = async (symbol: string) => {
    console.log('Selecting company:', symbol);
    try {
      const apiUrl = `/api/alpha-vantage/overview/${symbol}`;
      console.log('Fetching company overview from:', apiUrl);

      const response = await fetch(apiUrl);
      console.log('Overview response status:', response.status);
      console.log('Overview response headers:', Object.fromEntries(response.headers.entries()));

      // Check if response is HTML (error page)
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);

      if (contentType && contentType.includes('text/html')) {
        const htmlText = await response.text();
        console.error('Received HTML instead of JSON:', htmlText.substring(0, 500));
        alert(`API Error: Received HTML response instead of JSON. Status: ${response.status}`);
        return;
      }

      const companyData = await response.json();
      console.log('Company data received:', companyData);

      if (companyData.error) {
        console.error('Company fetch error:', companyData.error);
        alert(`Error loading company data: ${companyData.error}`);
        return;
      }

      console.log('Calling onSelectCompany with:', companyData);
      await onSelectCompany(companyData);
      setQuery(`${companyData.name} (${companyData.symbol})`);
      setShowSuggestions(false);
      console.log('Company selection completed');
    } catch (error) {
      console.error('Company fetch failed:', error);
      alert(`Failed to load company data: ${error}`);
    }
  };

  return (
    <div className="relative" style={{ marginBottom: showSuggestions && suggestions.length > 0 ? '24rem' : '1rem' }}>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search for a company (e.g., AAPL, Microsoft, Tesla)..."
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          {isSearching && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
          {query && !isSearching && (
            <div className="absolute right-3 top-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown - Properly positioned above content */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-2xl max-h-80 overflow-y-auto left-0 right-0">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => selectCompany(suggestion.symbol)}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {suggestion.name}
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {suggestion.symbol} • {suggestion.region}
                  </div>
                  <div className="text-xs text-gray-500">
                    {suggestion.type}
                  </div>
                </div>
                <div className="ml-3 flex-shrink-0">
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {Math.round(parseFloat(suggestion.matchScore) * 100)}% match
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {showSuggestions && query.length >= 2 && suggestions.length === 0 && !isSearching && (
        <div className="absolute z-[9999] w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-2xl p-6 text-center left-0 right-0">
          <div className="text-gray-400 mb-2">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-.966-5.5-2.5" />
            </svg>
          </div>
          <div className="text-gray-600 font-medium">No companies found</div>
          <div className="text-sm text-gray-500 mt-1">Try a different search term or check spelling</div>
        </div>
      )}

      {/* Run Analysis Button - appears when user types a ticker */}
      {query.trim() && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">
                Analyze: {query.toUpperCase()}
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                {selectedCompany
                  ? `${selectedCompany.name} • ${selectedCompany.exchange} • ${selectedCompany.sector}`
                  : 'Click "Run DCF Analysis" to fetch data and perform valuation'
                }
              </p>
              {selectedCompany?.description && (
                <p className="text-sm text-blue-600 mt-2 line-clamp-2">
                  {selectedCompany.description.substring(0, 200)}...
                </p>
              )}
            </div>
            <Button
              onClick={() => {
                console.log('Run DCF Analysis button clicked');
                console.log('Current query:', query);
                // Extract ticker symbol from query (handle formats like "AAPL" or "APPLE INC (AAPL)")
                const tickerMatch = query.trim().match(/\b([A-Z]{1,5})\b/);
                const ticker = tickerMatch ? tickerMatch[1] : query.trim().split(' ')[0];
                console.log('Extracted ticker:', ticker.toUpperCase());
                console.log('Calling onRunAnalysis...');
                onRunAnalysis(ticker.toUpperCase());
                console.log('onRunAnalysis called');
              }}
              disabled={isAnalyzing}
              className="ml-4"
            >
              {isAnalyzing ? '🔄 Analyzing...' : '🚀 Run DCF Analysis'}
            </Button>
          </div>
        </div>
      )}

      {/* Debug info - only show in development */}
      {typeof window !== 'undefined' && window.location.hostname === 'localhost' && query.length >= 2 && (
        <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border">
          <div className="font-mono">
            Status: {isSearching ? '🔄 Searching...' : '✅ Ready'} |
            Results: {suggestions.length} |
            Query: "{query}"
          </div>
        </div>
      )}
    </div>
  );
}
