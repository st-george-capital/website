'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
// Using native HTML form elements instead of custom UI components
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calculator, TrendingUp, BarChart3, AlertTriangle, Info } from 'lucide-react';
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

  // Operating Forecast
  forecastMode: 'simple' | 'advanced';
  startingRevenue: number;
  revenueGrowth: number[]; // One per year
  ebitMargin: number[]; // One per year

  // Advanced mode additional inputs
  depreciationPercent: number;
  capexPercent: number;
  nwcChangePercent: number;
  cashTaxRate: number;

  // Discount Rate (WACC)
  riskFreeRate: number;
  equityRiskPremium: number;
  beta: number;
  costOfDebt: number;
  taxRate: number;
  targetDebtRatio: number; // or D/E ratio

  // Terminal Value
  terminalMethod: 'perpetual' | 'multiple' | 'both';
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

  forecastMode: 'simple',
  startingRevenue: 2000000000,
  revenueGrowth: [0.15, 0.12, 0.10, 0.08, 0.06], // 15%, 12%, 10%, 8%, 6%
  ebitMargin: [0.25, 0.26, 0.27, 0.28, 0.29], // Improving margins

  depreciationPercent: 0.05,
  capexPercent: 0.08,
  nwcChangePercent: 0.02,
  cashTaxRate: 0.25,

  riskFreeRate: 0.0425, // 4.25%
  equityRiskPremium: 0.06, // 6%
  beta: 1.2,
  costOfDebt: 0.055, // 5.5%
  taxRate: 0.25,
  targetDebtRatio: 0.3, // 30% debt

  terminalMethod: 'both',
  perpetualGrowth: 0.025, // 2.5%
  exitMultiple: 12,
  exitMultipleMetric: 'ebitda',
});

export default function DCFToolPage() {
  const [inputs, setInputs] = useState<DCFInputs>(getDefaultInputs());
  const [activeTab, setActiveTab] = useState('inputs');

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
      <div className="flex gap-4">
        <Button onClick={loadExample} variant="outline">
          Load Example Company
        </Button>
        <Button onClick={resetInputs} variant="outline">
          Reset Assumptions
        </Button>
      </div>

      {/* Custom Tabs Implementation */}
      <div className="space-y-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'inputs', label: 'Assumptions' },
              { id: 'valuation', label: 'Valuation' },
              { id: 'charts', label: 'Charts' },
              { id: 'sensitivity', label: 'Sensitivity' },
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
            <DCFCharts outputs={outputs} />
          )}

          {activeTab === 'sensitivity' && (
            <SensitivityAnalysis inputs={inputs} />
          )}
        </div>
      </div>

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
              <h4 className="font-medium mb-3">EBIT Margin (%)</h4>
              <div className="space-y-2">
                {inputs.ebitMargin.slice(0, inputs.forecastYears).map((margin, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm w-12">Year {index + 1}:</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={(margin * 100).toFixed(1)}
                      onChange={(e) => updateArrayInput('ebitMargin', index, (parseFloat(e.target.value) || 0) / 100)}
                    />
                    <span className="text-sm">%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
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

          <div className="grid grid-cols-3 gap-4">
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

// Charts Component (Simplified for now)
function DCFCharts({ outputs }: { outputs: DCFOutputs }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Valuation Charts
        </CardTitle>
        <CardDescription>
          Visual representation of cash flows and valuation components
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Interactive charts coming soon...</p>
          <p className="text-sm mt-2">Free Cash Flow: {outputs.freeCashFlow.map(fcf => fcf.toLocaleString()).join(', ')}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Sensitivity Analysis Component (Simplified for now)
function SensitivityAnalysis({ inputs }: { inputs: DCFInputs }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sensitivity Analysis</CardTitle>
        <CardDescription>
          How valuation changes with different assumptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Interactive sensitivity analysis coming soon...</p>
          <p className="text-sm mt-2">WACC: {(inputs.riskFreeRate + inputs.beta * inputs.equityRiskPremium) * 100}%</p>
        </div>
      </CardContent>
    </Card>
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

    const ebitValue = revenue * inputs.ebitMargin[year];
    ebit.push(ebitValue);

    const nopatValue = ebitValue * (1 - inputs.cashTaxRate);
    nopat.push(nopatValue);

    // Simplified FCFF calculation
    const depreciation = revenue * inputs.depreciationPercent;
    const capex = revenue * inputs.capexPercent;
    const nwcChange = revenue * inputs.nwcChangePercent;

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

  if (inputs.terminalMethod === 'perpetual' || inputs.terminalMethod === 'both') {
    const perpetualTV = lastFCFF * (1 + inputs.perpetualGrowth) / (wacc - inputs.perpetualGrowth);
    if (inputs.terminalMethod === 'perpetual') {
      terminalValue = perpetualTV;
    } else {
      // Calculate exit multiple TV
      let exitMetric = 0;
      if (inputs.exitMultipleMetric === 'ebitda') {
        exitMetric = revenues[revenues.length - 1] * 0.3; // Approximate EBITDA
      } else if (inputs.exitMultipleMetric === 'ebit') {
        exitMetric = ebit[ebit.length - 1];
      } else {
        exitMetric = lastFCFF;
      }
      const multipleTV = exitMetric * inputs.exitMultiple;
      terminalValue = (perpetualTV + multipleTV) / 2; // Average
    }
  } else if (inputs.terminalMethod === 'multiple') {
    let exitMetric = 0;
    if (inputs.exitMultipleMetric === 'ebitda') {
      exitMetric = revenues[revenues.length - 1] * 0.3; // Approximate EBITDA
    } else if (inputs.exitMultipleMetric === 'ebit') {
      exitMetric = ebit[ebit.length - 1];
    } else {
      exitMetric = lastFCFF;
    }
    terminalValue = exitMetric * inputs.exitMultiple;
  }

  // Calculate present values
  let pvFcff = 0;
  for (let i = 0; i < freeCashFlow.length; i++) {
    pvFcff += freeCashFlow[i] / Math.pow(1 + wacc, i + 1);
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