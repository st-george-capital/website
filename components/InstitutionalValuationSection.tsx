'use client';

import { ValuationBridge, RevenueGrowthChart, EBITMarginChart, SensitivityTable } from './ValuationVisuals';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

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
  variant?: 'default' | 'document';
}

export function InstitutionalValuationSection({ dcfData, valuationText, variant = 'default' }: Props) {
  const isDocument = variant === 'document';

  if (!dcfData) {
    // Fallback to text-only if no DCF data
    return (
      <div className={`prose max-w-none [&_img]:block [&_img]:mx-auto [&_img]:rounded [&_img]:max-w-full ${isDocument ? 'text-slate-700 prose-headings:text-slate-950 prose-p:leading-7' : 'prose-lg text-gray-700'}`}>
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

  if (isDocument) {
    return (
      <div className="space-y-7">
        {valuationText && (
          <div className="report-lead">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {valuationText}
            </ReactMarkdown>
          </div>
        )}

        <table className="report-meta-table">
          <tbody>
            <tr>
              <td>
                <span className="report-meta-label">Intrinsic Value</span>
                <span className="report-meta-value">${outputs.intrinsicValuePerShare.toFixed(2)}</span>
              </td>
              <td>
                <span className="report-meta-label">Current Price</span>
                <span className="report-meta-value">${inputs.currentPrice.toFixed(2)}</span>
              </td>
              <td>
                <span className="report-meta-label">Upside / Downside</span>
                <span className={`report-meta-value ${outputs.upsideDownside >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {(outputs.upsideDownside * 100).toFixed(1)}%
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <span className="report-meta-label">WACC</span>
                <span className="report-meta-value">{(outputs.wacc * 100).toFixed(2)}%</span>
              </td>
              <td>
                <span className="report-meta-label">Terminal Growth</span>
                <span className="report-meta-value">{(inputs.perpetualGrowth * 100).toFixed(2)}%</span>
              </td>
              <td>
                <span className="report-meta-label">Terminal Value Contribution</span>
                <span className="report-meta-value">{(outputs.terminalValueContribution * 100).toFixed(1)}%</span>
              </td>
            </tr>
          </tbody>
        </table>

        <ValuationBridge
          pvForecastFCF={pvForecastFCF}
          pvTerminalValue={outputs.pvOfTerminalValue}
          enterpriseValue={outputs.enterpriseValue}
          netDebt={netDebt}
          equityValue={outputs.equityValue}
          variant={variant}
        />

        <div className="grid grid-cols-2 gap-6">
          <RevenueGrowthChart
            years={Array.from({ length: inputs.forecastYears }, (_, i) => i + 1)}
            growthRates={inputs.revenueGrowth}
            terminalGrowth={inputs.perpetualGrowth}
            variant={variant}
          />
          <EBITMarginChart
            years={Array.from({ length: inputs.forecastYears }, (_, i) => i + 1)}
            margins={inputs.ebitMargin}
            variant={variant}
          />
        </div>

        <div className="report-table-wrap">
          <div className="report-sans mb-3 text-[10px] font-semibold uppercase text-slate-500">DCF Summary</div>
          <table className="report-table">
            <colgroup>
              <col style={{ width: '34%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '34%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            <tbody>
              <tr>
                <td>Enterprise Value</td>
                <td className="num">${(outputs.enterpriseValue / 1e9).toFixed(1)}B</td>
                <td>Equity Value</td>
                <td className="num">${(outputs.equityValue / 1e9).toFixed(1)}B</td>
              </tr>
              <tr>
                <td>PV of Terminal Value</td>
                <td className="num">${(outputs.pvOfTerminalValue / 1e9).toFixed(1)}B</td>
                <td>Net Debt</td>
                <td className="num">${(netDebt / 1e9).toFixed(1)}B</td>
              </tr>
              <tr>
                <td>Cost of Equity</td>
                <td className="num">{(outputs.costOfEquity * 100).toFixed(2)}%</td>
                <td>After-Tax Cost of Debt</td>
                <td className="num">{(outputs.afterTaxCostOfDebt * 100).toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="report-table-wrap">
            <div className="report-sans mb-3 text-[10px] font-semibold uppercase text-slate-500">Key Operating Assumptions</div>
            <table className="report-table">
              <tbody>
                <tr>
                  <td>Capex as % of Revenue</td>
                  <td className="num">{(inputs.capexPercentOfRevenue * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td>D&amp;A as % of Revenue</td>
                  <td className="num">{(inputs.depreciationPercentOfRevenue * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td>NWC Change as % of Revenue Delta</td>
                  <td className="num">{(inputs.nwcChangePercentOfRevenueChange * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td>Cash Tax Rate</td>
                  <td className="num">{(inputs.cashTaxRate * 100).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="report-table-wrap">
            <div className="report-sans mb-3 text-[10px] font-semibold uppercase text-slate-500">Terminal Value</div>
            <table className="report-table">
              <tbody>
                <tr>
                  <td>Perpetual Growth Rate</td>
                  <td className="num">{(inputs.perpetualGrowth * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td>Terminal Value</td>
                  <td className="num">${(outputs.terminalValue / 1e9).toFixed(1)}B</td>
                </tr>
                <tr>
                  <td>% of Enterprise Value</td>
                  <td className="num">{(outputs.terminalValueContribution * 100).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
            <p className="report-caption">
              Terminal value assumes {(inputs.perpetualGrowth * 100).toFixed(2)}% perpetual growth, in line with long-term GDP expectations.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="report-sans text-[10px] font-semibold uppercase text-slate-500">Valuation Methodology</div>
          <p className="text-[11.5px] leading-7 text-slate-800">
            The discounted cash flow uses a free cash flow to the firm approach, projecting operating performance across a
            {` ${inputs.forecastYears}-year `} explicit forecast period and discounting those cash flows at a
            {` ${(outputs.wacc * 100).toFixed(2)}% `} weighted average cost of capital.
          </p>
          <ol className="ml-5 list-decimal space-y-2 text-[11.5px] leading-7 text-slate-800">
            <li>Revenue growth and EBIT margin assumptions are taken directly from the stored model inputs and charted above.</li>
            <li>Terminal value is estimated with a {(inputs.perpetualGrowth * 100).toFixed(2)}% perpetual growth rate and accounts for {(outputs.terminalValueContribution * 100).toFixed(1)}% of enterprise value.</li>
            <li>Enterprise value is bridged to equity value by adjusting for net debt of ${(netDebt / 1e9).toFixed(1)}B and dividing by diluted shares outstanding.</li>
          </ol>
        </div>

        <SensitivityTable
          baseWACC={outputs.wacc}
          baseTerminalGrowth={inputs.perpetualGrowth}
          baseValue={outputs.intrinsicValuePerShare}
          calculateValue={calculateValue}
          variant={variant}
        />
      </div>
    );
  }

  return (
    <div className={isDocument ? 'space-y-6' : 'space-y-8'}>
      {/* Valuation Summary Box */}
      <div className={isDocument ? 'border border-slate-300 bg-slate-50 p-6' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-8'}>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className={isDocument ? 'font-sans text-[9px] font-semibold uppercase text-slate-500 mb-1' : 'text-sm text-gray-600 mb-1 uppercase tracking-wide'}>Intrinsic Value</div>
            <div className={isDocument ? 'text-[32px] font-bold text-slate-950' : 'text-4xl font-bold text-blue-900'}>${outputs.intrinsicValuePerShare.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">per share</div>
          </div>
          <div className="text-center">
            <div className={isDocument ? 'font-sans text-[9px] font-semibold uppercase text-slate-500 mb-1' : 'text-sm text-gray-600 mb-1 uppercase tracking-wide'}>Current Price</div>
            <div className={isDocument ? 'text-[32px] font-bold text-slate-700' : 'text-4xl font-bold text-gray-700'}>${inputs.currentPrice.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">market quote</div>
          </div>
          <div className="text-center">
            <div className={isDocument ? 'font-sans text-[9px] font-semibold uppercase text-slate-500 mb-1' : 'text-sm text-gray-600 mb-1 uppercase tracking-wide'}>Upside/(Downside)</div>
            <div className={`${isDocument ? 'text-[32px] font-bold' : 'text-4xl font-bold'} ${outputs.upsideDownside >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(outputs.upsideDownside * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">to target</div>
          </div>
          <div className="text-center">
            <div className={isDocument ? 'font-sans text-[9px] font-semibold uppercase text-slate-500 mb-1' : 'text-sm text-gray-600 mb-1 uppercase tracking-wide'}>Valuation Method</div>
            <div className={isDocument ? 'text-[26px] font-bold text-slate-900' : 'text-2xl font-bold text-gray-800'}>DCF</div>
            <div className="text-xs text-gray-500 mt-1">{inputs.forecastYears}yr + Terminal</div>
          </div>
        </div>
        
        <div className={`mt-6 pt-6 ${isDocument ? 'border-t border-slate-300' : 'border-t border-blue-200'}`}>
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
        variant={variant}
      />

      {/* Growth and Margins Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <RevenueGrowthChart
          years={Array.from({ length: inputs.forecastYears }, (_, i) => i + 1)}
          growthRates={inputs.revenueGrowth}
          terminalGrowth={inputs.perpetualGrowth}
          variant={variant}
        />
        <EBITMarginChart
          years={Array.from({ length: inputs.forecastYears }, (_, i) => i + 1)}
          margins={inputs.ebitMargin}
          variant={variant}
        />
      </div>

      {/* Operating Assumptions */}
      <div className={isDocument ? 'border border-slate-300 bg-white p-5' : 'bg-white p-6 rounded-lg border'}>
        <h3 className={isDocument ? 'font-sans text-sm font-semibold uppercase text-slate-500 mb-4' : 'font-bold text-xl mb-4 text-gray-900'}>Key Operating Assumptions</h3>
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
            <h4 className={isDocument ? 'font-sans text-[11px] font-semibold uppercase text-slate-500 mb-2' : 'font-semibold mb-2 text-gray-900'}>Terminal Value</h4>
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
        variant={variant}
      />

      {/* Methodology */}
      <div className={isDocument ? 'border border-slate-300 bg-slate-50 p-5' : 'bg-gray-50 p-6 rounded-lg border'}>
        <h3 className={isDocument ? 'font-sans text-sm font-semibold uppercase text-slate-500 mb-4' : 'font-bold text-xl mb-4 text-gray-900'}>Valuation Methodology</h3>
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
