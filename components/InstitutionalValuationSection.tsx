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

function formatBillions(value: number) {
  return `$${(value / 1e9).toFixed(1)}B`;
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
  const forecastYears = Array.from({ length: inputs.forecastYears }, (_, i) => i + 1);
  
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
      <div className="space-y-8">
        {valuationText && (
          <div className="report-lead">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {valuationText}
            </ReactMarkdown>
          </div>
        )}

        <div className="report-stat-strip avoid-break">
          <div className="report-stat">
            <span className="report-stat-label">Intrinsic Value</span>
            <span className="report-stat-value">${outputs.intrinsicValuePerShare.toFixed(2)}</span>
          </div>
          <div className="report-stat">
            <span className="report-stat-label">Current Price</span>
            <span className="report-stat-value">${inputs.currentPrice.toFixed(2)}</span>
          </div>
          <div className="report-stat">
            <span className="report-stat-label">Upside / Downside</span>
            <span className={`report-stat-value ${outputs.upsideDownside >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {(outputs.upsideDownside * 100).toFixed(1)}%
            </span>
          </div>
          <div className="report-stat">
            <span className="report-stat-label">WACC</span>
            <span className="report-stat-value">{(outputs.wacc * 100).toFixed(2)}%</span>
          </div>
          <div className="report-stat">
            <span className="report-stat-label">Terminal Growth</span>
            <span className="report-stat-value">{(inputs.perpetualGrowth * 100).toFixed(2)}%</span>
          </div>
        </div>

        <div className="report-two-col">
          <div>
            <div className="report-subhead mb-3">DCF Summary</div>
            <table className="report-table">
              <colgroup>
                <col style={{ width: '58%' }} />
                <col style={{ width: '42%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td>Enterprise Value</td>
                  <td className="num">{formatBillions(outputs.enterpriseValue)}</td>
                </tr>
                <tr>
                  <td>Equity Value</td>
                  <td className="num">{formatBillions(outputs.equityValue)}</td>
                </tr>
                <tr>
                  <td>PV of Terminal Value</td>
                  <td className="num">{formatBillions(outputs.pvOfTerminalValue)}</td>
                </tr>
                <tr>
                  <td>Terminal Contribution</td>
                  <td className="num">{(outputs.terminalValueContribution * 100).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <div className="report-subhead mb-3">Valuation Conclusion</div>
            <p className="text-[11.5px] leading-7 text-slate-800">
              The current base case points to fair value of <strong>${outputs.intrinsicValuePerShare.toFixed(2)}</strong> per share,
              with value supported by <strong>{formatBillions(pvForecastFCF)}</strong> of present value from the explicit forecast period
              and <strong>{formatBillions(outputs.pvOfTerminalValue)}</strong> from the terminal period.
            </p>
            <p className="mt-3 text-[11.5px] leading-7 text-slate-800">
              On this basis, the model implies <strong className={outputs.upsideDownside >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                {(outputs.upsideDownside * 100).toFixed(1)}% {outputs.upsideDownside >= 0 ? 'upside' : 'downside'}
              </strong> versus the prevailing share price.
            </p>
          </div>
        </div>

        <ValuationBridge
          pvForecastFCF={pvForecastFCF}
          pvTerminalValue={outputs.pvOfTerminalValue}
          enterpriseValue={outputs.enterpriseValue}
          netDebt={netDebt}
          equityValue={outputs.equityValue}
          variant={variant}
        />

        <div className="report-two-col">
          <div>
            <div className="report-subhead mb-3">Key Valuation Assumptions</div>
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

          <div>
            <div className="report-subhead mb-3">WACC Build</div>
            <table className="report-table">
              <tbody>
                <tr>
                  <td>Risk-Free Rate</td>
                  <td className="num">{(inputs.riskFreeRate * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td>Equity Risk Premium</td>
                  <td className="num">{(inputs.equityRiskPremium * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td>Beta</td>
                  <td className="num">{inputs.beta.toFixed(2)}x</td>
                </tr>
                <tr>
                  <td>Cost of Equity</td>
                  <td className="num">{(outputs.costOfEquity * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td>After-Tax Cost of Debt</td>
                  <td className="num">{(outputs.afterTaxCostOfDebt * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td>Target Debt Weight</td>
                  <td className="num">{(inputs.targetDebtRatio * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td>WACC</td>
                  <td className="num">{(outputs.wacc * 100).toFixed(2)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="report-two-col">
          <div>
            <div className="report-subhead mb-3">Forecast Summary</div>
            <table className="report-table">
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '28%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="num">Revenue Growth</th>
                  <th className="num">EBIT Margin</th>
                  <th className="num">FCFF</th>
                </tr>
              </thead>
              <tbody>
                {forecastYears.map((year, index) => (
                  <tr key={year}>
                    <td>Y{year}</td>
                    <td className="num">{(inputs.revenueGrowth[index] * 100).toFixed(1)}%</td>
                    <td className="num">{(inputs.ebitMargin[index] * 100).toFixed(1)}%</td>
                    <td className="num">{formatBillions(outputs.freeCashFlow[index])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <div className="report-subhead mb-3">Terminal Value</div>
            <table className="report-table">
              <tbody>
                <tr>
                  <td>Forecast Horizon</td>
                  <td className="num">{inputs.forecastYears} years</td>
                </tr>
                <tr>
                  <td>Perpetual Growth Rate</td>
                  <td className="num">{(inputs.perpetualGrowth * 100).toFixed(2)}%</td>
                </tr>
                <tr>
                  <td>Terminal Value</td>
                  <td className="num">{formatBillions(outputs.terminalValue)}</td>
                </tr>
                <tr>
                  <td>PV of Terminal Value</td>
                  <td className="num">{formatBillions(outputs.pvOfTerminalValue)}</td>
                </tr>
                <tr>
                  <td>% of Enterprise Value</td>
                  <td className="num">{(outputs.terminalValueContribution * 100).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
            <p className="report-caption">
              Terminal value assumes {(inputs.perpetualGrowth * 100).toFixed(2)}% perpetual growth and remains consistent with
              a mature steady-state return profile.
            </p>
          </div>
        </div>

        <div className="report-two-col">
          <RevenueGrowthChart
            years={forecastYears}
            growthRates={inputs.revenueGrowth}
            terminalGrowth={inputs.perpetualGrowth}
            variant={variant}
          />
          <EBITMarginChart
            years={forecastYears}
            margins={inputs.ebitMargin}
            variant={variant}
          />
        </div>

        <SensitivityTable
          baseWACC={outputs.wacc}
          baseTerminalGrowth={inputs.perpetualGrowth}
          baseValue={outputs.intrinsicValuePerShare}
          calculateValue={calculateValue}
          variant={variant}
        />

        <div className="report-two-col">
          <div>
            <div className="report-subhead mb-3">Valuation Methodology</div>
            <p className="text-[11.5px] leading-7 text-slate-800">
              Our discounted cash flow uses a free cash flow to the firm framework, projecting operating performance across a
              {` ${inputs.forecastYears}-year `} explicit forecast period and discounting those cash flows at a
              {` ${(outputs.wacc * 100).toFixed(2)}% `} weighted average cost of capital. The model bridges enterprise value to
              equity value by adjusting for net debt of {formatBillions(netDebt)} and dividing by diluted shares outstanding.
            </p>
            <p className="mt-3 text-[11.5px] leading-7 text-slate-800">
              Terminal value is derived using a {(inputs.perpetualGrowth * 100).toFixed(2)}% perpetual growth assumption and
              contributes {(outputs.terminalValueContribution * 100).toFixed(1)}% of total enterprise value, underscoring the
              importance of long-run margin durability and reinvestment discipline.
            </p>
          </div>

          <div>
            <div className="report-subhead mb-3">Target Price Takeaway</div>
            <p className="text-[11.5px] leading-7 text-slate-800">
              At the prevailing market price of <strong>${inputs.currentPrice.toFixed(2)}</strong>, the current DCF implies a
              fair value range centered on <strong>${outputs.intrinsicValuePerShare.toFixed(2)}</strong> per share. That outcome
              is most sensitive to the terminal growth rate and discount-rate assumptions shown in the sensitivity matrix.
            </p>
            <p className="mt-3 text-[11.5px] leading-7 text-slate-800">
              We therefore view execution against forecast growth and margin assumptions as the primary determinant of whether
              the present valuation gap closes over the stated investment horizon.
            </p>
          </div>
        </div>
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
