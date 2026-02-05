'use client';

import { ValuationBridge, RevenueGrowthChart, EBITMarginChart, SensitivityTable } from './ValuationVisuals';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DCFData {
  inputs: {
    currentPrice: number;
    revenueGrowth: number[];
    ebitMargin: number[];
    forecastYears: number;
    perpetualGrowth: number;
    riskFreeRate: number;
    equityRiskPremium: number;
    beta: number;
    costOfDebt: number;
    taxRate: number;
    targetDebtRatio: number;
    totalDebt: number;
    cashEquivalents: number;
    sharesDiluted: number;
    capexPercentOfRevenue: number;
    depreciationPercentOfRevenue: number;
    nwcChangePercentOfRevenueChange: number;
    cashTaxRate: number;
  };
  outputs: {
    intrinsicValuePerShare: number;
    enterpriseValue: number;
    equityValue: number;
    wacc: number;
    costOfEquity: number;
    afterTaxCostOfDebt: number;
    terminalValue: number;
    pvOfTerminalValue: number;
    terminalValueContribution: number;
    upsideDownside: number;
    freeCashFlow: number[];
  };
  companyName: string;
}

interface Props {
  dcfData: DCFData | null;
  valuationText: string;
}

export function InstitutionalValuationSection({ dcfData, valuationText }: Props) {
  if (!dcfData) {
    // Fallback to text-only if no DCF data
    return (
      <div className="prose prose-lg max-w-none text-gray-700 [&_img]:block [&_img]:mx-auto [&_img]:rounded [&_img]:max-w-full">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {valuationText}
        </ReactMarkdown>
      </div>
    );
  }

  const { inputs, outputs, companyName } = dcfData;
  const netDebt = inputs.totalDebt - inputs.cashEquivalents;
  const pvForecastFCF = outputs.enterpriseValue - outputs.pvOfTerminalValue;
  
  // Calculate intrinsic value with different WACC and terminal growth
  const calculateValue = (wacc: number, termGrowth: number) => {
    const lastFCFF = outputs.freeCashFlow[outputs.freeCashFlow.length - 1];
    const termValue = lastFCFF * (1 + termGrowth) / (wacc - termGrowth);
    const pvFcff = outputs.freeCashFlow.reduce((sum, fcf, i) => 
      sum + fcf / Math.pow(1 + wacc, i + 1), 0);
    const pvTermValue = termValue / Math.pow(1 + wacc, inputs.forecastYears);
    const ev = pvFcff + pvTermValue;
    const equity = ev - netDebt;
    return equity / inputs.sharesDiluted;
  };

  return (
    <div className="space-y-8">
      {/* Valuation Summary Box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-8">
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1 uppercase tracking-wide">Intrinsic Value</div>
            <div className="text-4xl font-bold text-blue-900">${outputs.intrinsicValuePerShare.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">per share</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1 uppercase tracking-wide">Current Price</div>
            <div className="text-4xl font-bold text-gray-700">${inputs.currentPrice.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">market quote</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1 uppercase tracking-wide">Upside/(Downside)</div>
            <div className={`text-4xl font-bold ${outputs.upsideDownside >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(outputs.upsideDownside * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">to target</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1 uppercase tracking-wide">Valuation Method</div>
            <div className="text-2xl font-bold text-gray-800">DCF</div>
            <div className="text-xs text-gray-500 mt-1">{inputs.forecastYears}yr + Terminal</div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-blue-200">
          <p className="text-sm text-gray-700 text-center">
            Our DCF model values <strong>{companyName}</strong> at <strong>${outputs.intrinsicValuePerShare.toFixed(2)} per share</strong>, 
            representing a <strong className={outputs.upsideDownside >= 0 ? 'text-green-700' : 'text-red-700'}>
              {(outputs.upsideDownside * 100).toFixed(1)}% {outputs.upsideDownside >= 0 ? 'upside' : 'downside'}
            </strong> to the current market price of ${inputs.currentPrice.toFixed(2)}.
          </p>
        </div>
      </div>

      {/* Valuation Bridge */}
      <ValuationBridge
        pvForecastFCF={pvForecastFCF}
        pvTerminalValue={outputs.pvOfTerminalValue}
        enterpriseValue={outputs.enterpriseValue}
        netDebt={netDebt}
        equityValue={outputs.equityValue}
      />

      {/* Growth and Margins Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <RevenueGrowthChart
          years={Array.from({ length: inputs.forecastYears }, (_, i) => i + 1)}
          growthRates={inputs.revenueGrowth}
          terminalGrowth={inputs.perpetualGrowth}
        />
        <EBITMarginChart
          years={Array.from({ length: inputs.forecastYears }, (_, i) => i + 1)}
          margins={inputs.ebitMargin}
        />
      </div>

      {/* Operating Assumptions */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="font-bold text-xl mb-4 text-gray-900">Key Operating Assumptions</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <table className="text-sm border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-left font-semibold">Assumption</th>
                <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-right font-semibold">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2">Capex as % of Revenue</td>
                <td className="border border-gray-300 px-3 py-2 text-right">{(inputs.capexPercentOfRevenue * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2">D&A as % of Revenue</td>
                <td className="border border-gray-300 px-3 py-2 text-right">{(inputs.depreciationPercentOfRevenue * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2">NWC Change as % of Revenue Δ</td>
                <td className="border border-gray-300 px-3 py-2 text-right">{(inputs.nwcChangePercentOfRevenueChange * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2">Cash Tax Rate</td>
                <td className="border border-gray-300 px-3 py-2 text-right">{(inputs.cashTaxRate * 100).toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
          
          <div>
            <h4 className="font-semibold mb-2 text-gray-900">Terminal Value</h4>
            <table className="text-sm border-collapse w-full">
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-semibold">Perpetual Growth Rate</td>
                  <td className="border border-gray-300 px-3 py-2 text-right">{(inputs.perpetualGrowth * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-semibold">Terminal Value</td>
                  <td className="border border-gray-300 px-3 py-2 text-right">${(outputs.terminalValue / 1e9).toFixed(1)}B</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-semibold">% of Enterprise Value</td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-bold">{(outputs.terminalValueContribution * 100).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-600 mt-2">
              Terminal value assumes {(inputs.perpetualGrowth * 100).toFixed(2)}% perpetual growth, in line with long-term GDP expectations.
            </p>
          </div>
        </div>
      </div>

      {/* Sensitivity Analysis */}
      <SensitivityTable
        baseWACC={outputs.wacc}
        baseTerminalGrowth={inputs.perpetualGrowth}
        baseValue={outputs.intrinsicValuePerShare}
        calculateValue={calculateValue}
      />

      {/* Methodology */}
      <div className="bg-gray-50 p-6 rounded-lg border">
        <h3 className="font-bold text-xl mb-4 text-gray-900">Valuation Methodology</h3>
        <div className="prose max-w-none text-gray-700">
          <p>
            The DCF model employs a Free Cash Flow to the Firm (FCFF) approach, valuing {companyName} based on 
            cash flows available to all capital providers. The methodology includes:
          </p>
          <ol className="list-decimal ml-6 space-y-2 my-3">
            <li>
              <strong>Explicit Forecast Period ({inputs.forecastYears} years):</strong> Operating performance projected based 
              on management guidance, historical trends, and industry dynamics.
            </li>
            <li>
              <strong>Terminal Value:</strong> Represents value beyond the explicit forecast, calculated using perpetuity growth 
              at {(inputs.perpetualGrowth * 100).toFixed(2)}%. Accounts for {(outputs.terminalValueContribution * 100).toFixed(1)}% 
              of total enterprise value.
            </li>
            <li>
              <strong>Discount Rate:</strong> All cash flows discounted at WACC of {(outputs.wacc * 100).toFixed(2)}%, 
              reflecting the company's cost of capital and risk profile.
            </li>
            <li>
              <strong>Bridge to Equity Value:</strong> Enterprise value adjusted for net debt (${(netDebt / 1e9).toFixed(1)}B) 
              to derive equity value attributable to common shareholders.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
