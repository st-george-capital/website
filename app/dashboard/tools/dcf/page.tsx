'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
// Using native HTML form elements instead of custom UI components
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator, TrendingUp, BarChart3, AlertTriangle, Info, Download, Upload, FileText } from 'lucide-react';
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
  enterpriseValue: number;
  equityValue: number;
  intrinsicValuePerShare: number;
  upsideDownside: number;

  // WACC
  costOfEquity: number;
  afterTaxCostOfDebt: number;
  wacc: number;
}

// Export Functions
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
    ['Terminal Value (PV)', (outputs.terminalValue / Math.pow(1 + outputs.wacc, inputs.forecastYears)).toFixed(0), inputs.currency],
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
          <div class="metric-value">${inputs.currency}${outputs.intrinsicValuePerShare.toFixed(2)}</div>
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
  periods: string[];
  companyName?: string;
  ticker?: string;
}

export default function DCFToolPage() {
  const [inputs, setInputs] = useState<DCFInputs>(getDefaultInputs());
  const [activeTab, setActiveTab] = useState('inputs');
  const [financialData, setFinancialData] = useState<ExtractedFinancials | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Calculate outputs whenever inputs change
  const outputs = useMemo(() => calculateDCF(inputs), [inputs]);

  const updateInput = (field: keyof DCFInputs, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }));
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

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState({
    income: null as File | null,
    cashflow: null as File | null,
    balance: null as File | null,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'income' | 'cashflow' | 'balance') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFiles(prev => ({ ...prev, [type]: file }));

    // If all three files are uploaded, process them
    const newFiles = { ...uploadedFiles, [type]: file };
    if (newFiles.income && newFiles.cashflow && newFiles.balance) {
      await processFinancialFiles(newFiles.income, newFiles.cashflow, newFiles.balance);
    }
  };

  const processFinancialFiles = async (incomeFile: File, cashFlowFile: File, balanceFile: File) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      // In a real implementation, you'd send these files to an API endpoint
      // For now, we'll simulate parsing with sample data structure
      const extractedData = await parseFactSetFiles(incomeFile, cashFlowFile, balanceFile);
      setFinancialData(extractedData);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to process financial files');
    } finally {
      setIsUploading(false);
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
        ? metrics.currentAssets.map((ca, i) => ca - (metrics.currentLiabilities[i] || 0))
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

  const autoPopulateFromFinancials = () => {
    if (!financialData) return;

    // Calculate historical growth rates and margins (using most recent growth)
    const revenueGrowth = financialData.revenue.length > 1
      ? (financialData.revenue[financialData.revenue.length - 1] - financialData.revenue[financialData.revenue.length - 2]) / financialData.revenue[financialData.revenue.length - 2]
      : 0.05;

    const avgEbitMargin = financialData.ebit[0] / financialData.revenue[0];
    const avgTaxRate = financialData.ebit[0] > 0
      ? (1 - financialData.netIncome[0] / financialData.ebit[0])
      : 0.25;

    // Calculate CapEx and depreciation rates
    const avgCapexRate = financialData.capex[0] / financialData.revenue[0];
    const avgDepreciationRate = financialData.depreciation[0] / financialData.revenue[0];

    // Estimate WACC (simplified)
    const estimatedWACC = 0.08 + (financialData.totalDebt[0] / (financialData.totalDebt[0] + financialData.shareholdersEquity[0])) * 0.02;

    // Auto-populate inputs
    setInputs(prev => ({
      ...prev,
      companyName: financialData.companyName || prev.companyName,
      ticker: financialData.ticker || prev.ticker,
      totalDebt: financialData.totalDebt[0] || prev.totalDebt,
      cashEquivalents: financialData.cashAndEquivalents[0] || prev.cashEquivalents,
      startingRevenue: financialData.revenue[0] || prev.startingRevenue,
      revenueGrowth: [revenueGrowth, revenueGrowth * 0.9, revenueGrowth * 0.8, revenueGrowth * 0.7, revenueGrowth * 0.6],
      ebitMargin: Array(5).fill(avgEbitMargin),
      capexPercentOfRevenue: avgCapexRate,
      depreciationPercentOfRevenue: avgDepreciationRate,
      cashTaxRate: avgTaxRate,
      riskFreeRate: 0.0425, // Keep current
      equityRiskPremium: 0.06, // Keep current
      targetDebtRatio: financialData.totalDebt[0] / (financialData.totalDebt[0] + financialData.shareholdersEquity[0]),
      costOfDebt: estimatedWACC + 0.02, // Estimate cost of debt
    }));
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
        <Button onClick={loadExample} variant="outline">
          Load Example Company
        </Button>
        <Button onClick={resetInputs} variant="outline">
          Reset Assumptions
        </Button>
        <Button onClick={() => exportToCSV(inputs, outputs)} variant="outline" className="flex items-center">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
        <Button onClick={() => printSnapshot(inputs, outputs)} variant="outline">
          Print Snapshot
        </Button>
      </div>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Upload Financial Statements (FactSet Format)
          </CardTitle>
          <CardDescription>
            Upload Income Statement, Cash Flow, and Balance Sheet Excel files from FactSet to auto-populate DCF assumptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Income Statement</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => handleFileUpload(e, 'income')}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cash Flow Statement</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => handleFileUpload(e, 'cashflow')}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Balance Sheet</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => handleFileUpload(e, 'balance')}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{uploadError}</p>
              </div>
            )}

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
                >
                  Auto-Populate DCF Assumptions
                </Button>
              </div>
            )}

            {isUploading && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">🔄 Processing financial statements...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Custom Tabs Implementation */}
      <div className="space-y-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'inputs', label: 'Assumptions' },
              { id: 'valuation', label: 'Valuation' },
              { id: 'charts', label: 'Charts' },
              { id: 'sensitivity', label: 'Sensitivity' },
              { id: 'financials', label: 'Financial Deep Dive' },
            ].map((tab) => (
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
          {activeTab === 'inputs' && (
            <DCFInputsForm inputs={inputs} updateInput={updateInput} updateArrayInput={updateArrayInput} />
          )}

          {activeTab === 'valuation' && (
            <>
              <ValuationSummary inputs={inputs} outputs={outputs} />
              <CashFlowTable outputs={outputs} />
            </>
          )}

          {activeTab === 'charts' && (
            <DCFCharts inputs={inputs} outputs={outputs} />
          )}

          {activeTab === 'sensitivity' && (
            <SensitivityAnalysis inputs={inputs} outputs={outputs} />
          )}

          {activeTab === 'financials' && (
            <FinancialDeepDive financialData={financialData} />
          )}
        </div>
      </div>

      {/* Quality Checks and Warnings */}
      <DCFQualityChecks inputs={inputs} outputs={outputs} />

      {/* Implied Multiples */}
      <DCFImpliedMultiples inputs={inputs} outputs={outputs} />

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

// Input Forms Component
function DCFInputsForm({
  inputs,
  updateInput,
  updateArrayInput
}: {
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
            Basic company information and capital structure
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
              <label className="block text-sm font-medium mb-1">Ticker</label>
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
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inputs.currency}
                onChange={(e) => updateInput('currency', e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Current Price</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inputs.currentPrice}
                onChange={(e) => updateInput('currentPrice', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Shares Outstanding (M)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inputs.sharesOutstanding / 1000000}
                onChange={(e) => updateInput('sharesOutstanding', (parseFloat(e.target.value) || 0) * 1000000)}
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
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inputs.startingRevenue / 1000000}
                onChange={(e) => updateInput('startingRevenue', (parseFloat(e.target.value) || 0) * 1000000)}
              />
            </div>
          </div>

          {/* Growth and Margin Tables */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-medium mb-3">Revenue Growth (%)</h4>
              <div className="space-y-2">
                {inputs.revenueGrowth.slice(0, inputs.forecastYears).map((growth, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm w-12">Year {index + 1}:</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={(growth * 100).toFixed(1)}
                      onChange={(e) => updateArrayInput('revenueGrowth', index, (parseFloat(e.target.value) || 0) / 100)}
                    />
                    <span className="text-sm">%</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">
                EBIT Margin (%)
                {inputs.forecastMode === 'advanced' && (
                  <span className="text-xs text-muted-foreground ml-2">(Advanced mode allows year-by-year)</span>
                )}
              </h4>
              <div className="space-y-2">
                {(inputs.forecastMode === 'advanced' && inputs.ebitMarginAdvanced
                  ? inputs.ebitMarginAdvanced
                  : inputs.ebitMargin
                ).slice(0, inputs.forecastYears).map((margin, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm w-12">Year {index + 1}:</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={(margin * 100).toFixed(1)}
                      onChange={(e) => {
                        if (inputs.forecastMode === 'advanced') {
                          const newArray = [...(inputs.ebitMarginAdvanced || inputs.ebitMargin)];
                          newArray[index] = (parseFloat(e.target.value) || 0) / 100;
                          updateInput('ebitMarginAdvanced', newArray);
                        } else {
                          updateArrayInput('ebitMargin', index, (parseFloat(e.target.value) || 0) / 100);
                        }
                      }}
                    />
                    <span className="text-sm">%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mode-specific inputs */}
          {inputs.forecastMode === 'simple' ? (
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div>
                <label className="block text-sm font-medium mb-1">Capex (% of Revenue)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={(inputs.capexPercentOfRevenue * 100).toFixed(1)}
                  onChange={(e) => updateInput('capexPercentOfRevenue', (parseFloat(e.target.value) || 0) / 100)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">D&A (% of Revenue)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={(inputs.depreciationPercentOfRevenue * 100).toFixed(1)}
                  onChange={(e) => updateInput('depreciationPercentOfRevenue', (parseFloat(e.target.value) || 0) / 100)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ΔNWC (% of Rev Change)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={(inputs.nwcChangePercentOfRevenueChange * 100).toFixed(1)}
                  onChange={(e) => updateInput('nwcChangePercentOfRevenueChange', (parseFloat(e.target.value) || 0) / 100)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cash Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={(inputs.cashTaxRate * 100).toFixed(1)}
                  onChange={(e) => updateInput('cashTaxRate', (parseFloat(e.target.value) || 0) / 100)}
                />
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <h4 className="font-medium">Advanced Mode Settings</h4>

              {/* Capex by year */}
              <div>
                <label className="block text-sm font-medium mb-2">Capex (% of Revenue by Year)</label>
                <div className="grid grid-cols-5 gap-2">
                  {(inputs.capexByYear || Array(inputs.forecastYears).fill(inputs.capexPercentOfRevenue)).map((capex, index) => (
                    <div key={index} className="text-center">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={(capex * 100).toFixed(1)}
                        onChange={(e) => {
                          const newArray = [...(inputs.capexByYear || Array(inputs.forecastYears).fill(inputs.capexPercentOfRevenue))];
                          newArray[index] = (parseFloat(e.target.value) || 0) / 100;
                          updateInput('capexByYear', newArray);
                        }}
                      />
                      <div className="text-xs text-gray-500 mt-1">Y{index + 1}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Depreciation by year */}
              <div>
                <label className="block text-sm font-medium mb-2">D&A (% of Revenue by Year)</label>
                <div className="grid grid-cols-5 gap-2">
                  {(inputs.depreciationByYear || Array(inputs.forecastYears).fill(inputs.depreciationPercentOfRevenue)).map((dep, index) => (
                    <div key={index} className="text-center">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={(dep * 100).toFixed(1)}
                        onChange={(e) => {
                          const newArray = [...(inputs.depreciationByYear || Array(inputs.forecastYears).fill(inputs.depreciationPercentOfRevenue))];
                          newArray[index] = (parseFloat(e.target.value) || 0) / 100;
                          updateInput('depreciationByYear', newArray);
                        }}
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
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={(inputs.riskFreeRate * 100).toFixed(2)}
                onChange={(e) => updateInput('riskFreeRate', (parseFloat(e.target.value) || 0) / 100)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Equity Risk Premium (%)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={(inputs.equityRiskPremium * 100).toFixed(2)}
                onChange={(e) => updateInput('equityRiskPremium', (parseFloat(e.target.value) || 0) / 100)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Beta</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inputs.beta}
                onChange={(e) => updateInput('beta', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cost of Debt (%)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={(inputs.costOfDebt * 100).toFixed(2)}
                onChange={(e) => updateInput('costOfDebt', (parseFloat(e.target.value) || 0) / 100)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={(inputs.taxRate * 100).toFixed(2)}
                onChange={(e) => updateInput('taxRate', (parseFloat(e.target.value) || 0) / 100)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target Debt Ratio (%)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={(inputs.targetDebtRatio * 100).toFixed(1)}
                onChange={(e) => updateInput('targetDebtRatio', (parseFloat(e.target.value) || 0) / 100)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terminal Value */}
      <Card>
        <CardHeader>
          <CardTitle>Terminal Value</CardTitle>
          <CardDescription>
            Method for calculating the value beyond the forecast period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Terminal Value Method</label>
            <select
              className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={inputs.terminalMethod}
              onChange={(e) => updateInput('terminalMethod', e.target.value as any)}
            >
              <option value="perpetual">Perpetual Growth</option>
              <option value="multiple">Exit Multiple</option>
              <option value="both">Both (Average)</option>
            </select>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Perpetual Growth (%)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={(inputs.perpetualGrowth * 100).toFixed(2)}
                onChange={(e) => updateInput('perpetualGrowth', (parseFloat(e.target.value) || 0) / 100)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Exit Multiple</label>
              <input
                type="number"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inputs.exitMultiple}
                onChange={(e) => updateInput('exitMultiple', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Exit Multiple Metric</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inputs.exitMultipleMetric}
                onChange={(e) => updateInput('exitMultipleMetric', e.target.value as any)}
              >
                <option value="ebitda">EBITDA</option>
                <option value="ebit">EBIT</option>
                <option value="fcf">Free Cash Flow</option>
              </select>
            </div>
            <div className={inputs.terminalMethod === 'both' ? '' : 'opacity-50'}>
              <label className="block text-sm font-medium mb-1">Terminal Weighting (% Perpetual)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={(inputs.terminalWeighting * 100).toFixed(0)}
                onChange={(e) => updateInput('terminalWeighting', (parseFloat(e.target.value) || 0) / 100)}
                disabled={inputs.terminalMethod !== 'both'}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Valuation Summary Component
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

  // Check 4: Extreme EV/EBITDA multiple
  const lastEBIT = outputs.ebit[outputs.ebit.length - 1];
  const approxEBITDA = lastEBIT + (inputs.startingRevenue * inputs.depreciationPercentOfRevenue); // Rough estimate
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
function DCFImpliedMultiples({ inputs, outputs }: { inputs: DCFInputs; outputs: DCFOutputs }) {
  const lastYearRevenue = outputs.revenues[outputs.revenues.length - 1];
  const lastYearEBIT = outputs.ebit[outputs.ebit.length - 1];
  const lastYearNOPAT = outputs.nopat[outputs.nopat.length - 1];

  // Approximate EBITDA (rough estimate)
  const approxEBITDA = lastYearEBIT + (lastYearRevenue * inputs.depreciationPercentOfRevenue);

  const multiples = [
    {
      name: 'EV/EBITDA',
      value: (outputs.enterpriseValue / approxEBITDA).toFixed(1) + 'x',
      description: 'Enterprise Value to EBITDA multiple'
    },
    {
      name: 'EV/EBIT',
      value: (outputs.enterpriseValue / lastYearEBIT).toFixed(1) + 'x',
      description: 'Enterprise Value to EBIT multiple'
    },
    {
      name: 'P/E',
      value: (outputs.intrinsicValuePerShare / lastYearNOPAT * inputs.sharesDiluted / inputs.sharesDiluted).toFixed(1) + 'x',
      description: 'Price to Earnings multiple (based on last year NOPAT)'
    },
    {
      name: 'P/B',
      value: 'N/A', // Would need book value data
      description: 'Price to Book multiple (requires balance sheet data)'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Implied Multiples</CardTitle>
        <CardDescription>
          Valuation multiples implied by your DCF intrinsic value
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {multiples.map((multiple, index) => (
            <div key={index} className="text-center p-3 bg-gray-50 rounded">
              <div className="text-lg font-semibold text-primary">{multiple.value}</div>
              <div className="text-sm font-medium">{multiple.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{multiple.description}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p><strong>Note:</strong> These multiples are based on terminal year financials and your DCF assumptions. EBITDA is approximated as EBIT + Depreciation.</p>
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
              <YAxis yAxisId="percent" orientation="right" tickFormatter={(value) => `${value.toFixed(0)}%`} />
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
                    <td key={i} className="text-right py-2 px-2">{turnover.toFixed(2)}x</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Debt-to-Equity</td>
                  {ratios.leverage.debtToEquity.map((ratio, i) => (
                    <td key={i} className="text-right py-2 px-2">{ratio.toFixed(2)}x</td>
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
              <YAxis tickFormatter={(value) => `$${Number(value).toFixed(2)}`} />
              <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Price']} />
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
function SensitivityAnalysis({ inputs, outputs }: { inputs: DCFInputs; outputs: DCFOutputs }) {
  const [selectedSensitivity, setSelectedSensitivity] = useState<'wacc_growth' | 'wacc_multiple' | 'growth_margin'>('wacc_growth');

  // Generate WACC × Terminal Growth sensitivity table
  const generateWaccGrowthSensitivity = () => {
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
          const terminalValue = outputs.freeCashFlow[outputs.freeCashFlow.length - 1] * (1 + growth) / (wacc - growth);
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
            <p><strong>Color coding:</strong> Darker colors indicate larger deviations from base case (${outputs.intrinsicValuePerShare.toFixed(2)})</p>
            {selectedSensitivity === 'wacc_growth' && (
              <p><strong>Note:</strong> Red "Error" cells occur when terminal growth rate ≥ WACC (mathematically invalid)</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// DCF Calculation Logic
function calculateDCF(inputs: DCFInputs): DCFOutputs {
  const revenues: number[] = [];
  const ebit: number[] = [];
  const nopat: number[] = [];
  const freeCashFlow: number[] = [];

  // Calculate operating forecasts
  let revenue = inputs.startingRevenue;
  for (let year = 0; year < inputs.forecastYears; year++) {
    revenue *= (1 + inputs.revenueGrowth[year]);
    revenues.push(revenue);

    // EBIT calculation - use advanced mode if available, otherwise simple mode
    const ebitMargin = inputs.forecastMode === 'advanced' && inputs.ebitMarginAdvanced
      ? inputs.ebitMarginAdvanced[year]
      : inputs.ebitMargin[year];
    const ebitValue = revenue * ebitMargin;
    ebit.push(ebitValue);

    // Tax rate - use advanced mode if available, otherwise simple mode
    const taxRate = inputs.forecastMode === 'advanced' && inputs.cashTaxRateByYear
      ? inputs.cashTaxRateByYear[year]
      : inputs.cashTaxRate;
    const nopatValue = ebitValue * (1 - taxRate);
    nopat.push(nopatValue);

    // Working capital changes
    let nwcChange = 0;
    if (year === 0) {
      // First year: assume NWC builds from zero
      const revenueChange = revenue - inputs.startingRevenue;
      nwcChange = revenueChange * (inputs.forecastMode === 'advanced' && inputs.nwcChangeByYear
        ? inputs.nwcChangeByYear[year]
        : inputs.nwcChangePercentOfRevenueChange);
    } else {
      // Subsequent years: change based on revenue growth
      const revenueChange = revenues[year] - revenues[year - 1];
      nwcChange = revenueChange * (inputs.forecastMode === 'advanced' && inputs.nwcChangeByYear
        ? inputs.nwcChangeByYear[year]
        : inputs.nwcChangePercentOfRevenueChange);
    }

    // Depreciation
    const depreciation = revenue * (inputs.forecastMode === 'advanced' && inputs.depreciationByYear
      ? inputs.depreciationByYear[year]
      : inputs.depreciationPercentOfRevenue);

    // Capex
    const capex = revenue * (inputs.forecastMode === 'advanced' && inputs.capexByYear
      ? inputs.capexByYear[year]
      : inputs.capexPercentOfRevenue);

    // FCFF calculation
    const fcff = nopatValue + depreciation - capex - nwcChange;
    freeCashFlow.push(fcff);
  }

  // Calculate WACC
  const costOfEquity = inputs.riskFreeRate + inputs.beta * inputs.equityRiskPremium;
  const afterTaxCostOfDebt = inputs.costOfDebt * (1 - inputs.taxRate);
  const wacc = costOfEquity * (1 - inputs.targetDebtRatio) + afterTaxCostOfDebt * inputs.targetDebtRatio;

  // Calculate terminal value
  let terminalValue = 0;
  const lastFCFF = freeCashFlow[freeCashFlow.length - 1];
  const lastRevenue = revenues[revenues.length - 1];
  const lastEBIT = ebit[ebit.length - 1];

  if (inputs.terminalMethod === 'perpetual') {
    terminalValue = lastFCFF * (1 + inputs.perpetualGrowth) / (wacc - inputs.perpetualGrowth);
  } else if (inputs.terminalMethod === 'multiple') {
    let exitMetric = 0;
    if (inputs.exitMultipleMetric === 'ebitda') {
      // Approximate EBITDA as EBIT + Depreciation (rough estimate)
      const approxDepreciation = lastRevenue * inputs.depreciationPercentOfRevenue;
      exitMetric = lastEBIT + approxDepreciation;
    } else if (inputs.exitMultipleMetric === 'ebit') {
      exitMetric = lastEBIT;
    } else {
      exitMetric = lastFCFF;
    }
    terminalValue = exitMetric * inputs.exitMultiple;
  } else if (inputs.terminalMethod === 'both') {
    // Perpetuity component
    const perpetualTV = lastFCFF * (1 + inputs.perpetualGrowth) / (wacc - inputs.perpetualGrowth);

    // Multiple component
    let exitMetric = 0;
    if (inputs.exitMultipleMetric === 'ebitda') {
      const approxDepreciation = lastRevenue * inputs.depreciationPercentOfRevenue;
      exitMetric = lastEBIT + approxDepreciation;
    } else if (inputs.exitMultipleMetric === 'ebit') {
      exitMetric = lastEBIT;
    } else {
      exitMetric = lastFCFF;
    }
    const multipleTV = exitMetric * inputs.exitMultiple;

    // Weighted average
    terminalValue = (perpetualTV * inputs.terminalWeighting) + (multipleTV * (1 - inputs.terminalWeighting));
  }

  // Calculate present values (with mid-year convention if enabled)
  let pvFcff = 0;
  for (let i = 0; i < freeCashFlow.length; i++) {
    const discountPeriod = inputs.midYearConvention ? i + 0.5 : i + 1;
    pvFcff += freeCashFlow[i] / Math.pow(1 + wacc, discountPeriod);
  }
  const pvTerminal = terminalValue / Math.pow(1 + wacc, inputs.forecastYears);

  // Calculate enterprise and equity value
  const enterpriseValue = pvFcff + pvTerminal;
  const netDebt = inputs.totalDebt - inputs.cashEquivalents;
  const equityValue = enterpriseValue - netDebt - inputs.preferredEquity - inputs.minorityInterest + inputs.nonOperatingAssets;
  const intrinsicValuePerShare = equityValue / inputs.sharesDiluted;
  const upsideDownside = (intrinsicValuePerShare - inputs.currentPrice) / inputs.currentPrice;

  return {
    revenues,
    ebit,
    nopat,
    freeCashFlow,
    terminalValue,
    enterpriseValue,
    equityValue,
    intrinsicValuePerShare,
    upsideDownside,
    costOfEquity,
    afterTaxCostOfDebt,
    wacc,
  };
}