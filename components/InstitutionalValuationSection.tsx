'use client';

import { ValuationBridge, RevenueGrowthChart, EBITMarginChart, SensitivityTable } from './ValuationVisuals';
import ReactMarkdown, { type Components } from 'react-markdown';
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
  comparables?: { source: string; rows: any[]; updatedAt: string } | null;
  valuationText: string;
  variant?: 'default' | 'document';
}

function formatBillions(value: number) {
  return `$${(value / 1e9).toFixed(1)}B`;
}

const valuationMarkdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mt-6 mb-3 text-lg font-bold text-slate-900">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-5 mb-2 text-base font-semibold text-slate-900">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-4 mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="my-3 leading-7 text-gray-700">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-3 ml-6 list-disc space-y-2 text-gray-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 ml-6 list-decimal space-y-2 text-gray-700">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="pl-1 leading-7">{children}</li>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-50">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-slate-100 px-3 py-2 align-top text-sm text-gray-700">{children}</td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-slate-300 pl-4 italic text-slate-700">{children}</blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-blue-700 underline underline-offset-2">{children}</a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  img: ({ src, alt }) => (
    <img src={src ?? ''} alt={alt ?? ''} className="my-4 block max-w-full rounded-lg" />
  ),
};

function ValuationMarkdown({ content, compact = false }: { content: string; compact?: boolean }) {
  return (
    <div className={compact ? 'text-[15px]' : 'text-base'}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={valuationMarkdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function InstitutionalValuationSection({
  dcfData,
  comparables,
  valuationText,
  variant = 'default',
}: Props) {
  const isDocument = variant === 'document';

  if (!dcfData) {
    return (
      <div className={isDocument ? 'text-slate-700' : 'text-gray-700'}>
        <ValuationMarkdown content={valuationText} compact={isDocument} />
      </div>
    );
  }

  const { inputs, outputs, companyName } = dcfData;
  const netDebt = inputs.totalDebt - inputs.cashEquivalents;
  const pvForecastFCF = outputs.enterpriseValue - outputs.pvOfTerminalValue;
  const avgRevenueGrowth = inputs.revenueGrowth.reduce((sum, value) => sum + value, 0) / Math.max(inputs.revenueGrowth.length, 1);
  const avgEbitMargin = inputs.ebitMargin.reduce((sum, value) => sum + value, 0) / Math.max(inputs.ebitMargin.length, 1);
  const avgFcff = outputs.freeCashFlow.reduce((sum, value) => sum + value, 0) / Math.max(outputs.freeCashFlow.length, 1);

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
        <p className="report-lead">
          Our valuation framework blends relative market context with a discounted cash flow assessment to anchor fair value at{' '}
          <strong>${outputs.intrinsicValuePerShare.toFixed(2)}</strong> per share. The current base case implies{' '}
          <strong className={outputs.upsideDownside >= 0 ? 'text-emerald-700' : 'text-red-700'}>
            {(outputs.upsideDownside * 100).toFixed(1)}% {outputs.upsideDownside >= 0 ? 'upside' : 'downside'}
          </strong>{' '}
          versus the prevailing share price, with sensitivity primarily driven by discount rate, terminal growth, and execution
          against the forecast margin profile.
        </p>

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

        <div className="report-valuation-grid">
          <div className="space-y-5">
            {comparables?.rows?.length ? (
              <div className="report-table-wrap">
                <div className="report-subhead mb-3">Comparable Companies</div>
                <table className="report-table text-[9.6px]">
                  <colgroup>
                    <col style={{ width: '31%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '16%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {['Company', 'EV/Rev', 'EV/EBITDA', 'Fwd P/E', 'P/S', 'Rev. Gr.', 'EBITDA Mgn.'].map((heading) => (
                        <th key={heading} className={heading === 'Company' ? '' : 'num'}>
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparables.rows.map((row: any, index: number) => (
                      <tr key={`${row.ticker}-${index}`} className={row.isSubject ? 'bg-slate-100' : ''}>
                        <td>
                          <div className="font-medium">{row.name}</div>
                          <div className="text-[9px] text-slate-500">{row.ticker}</div>
                        </td>
                        <td className="num">{row.evToRevenue != null ? `${row.evToRevenue.toFixed(1)}x` : '—'}</td>
                        <td className="num">{row.evToEBITDA != null ? `${row.evToEBITDA.toFixed(1)}x` : '—'}</td>
                        <td className="num">{row.peForward != null ? `${row.peForward.toFixed(1)}x` : '—'}</td>
                        <td className="num">{row.priceToSales != null ? `${row.priceToSales.toFixed(1)}x` : '—'}</td>
                        <td className="num">{row.revenueGrowthYoY != null ? `${(row.revenueGrowthYoY * 100).toFixed(1)}%` : '—'}</td>
                        <td className="num">{row.ebitdaMargin != null ? `${(row.ebitdaMargin * 100).toFixed(1)}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {comparables.source && (
                  <div className="report-caption">Source: {comparables.source}</div>
                )}
              </div>
            ) : null}

            <ValuationBridge
              pvForecastFCF={pvForecastFCF}
              pvTerminalValue={outputs.pvOfTerminalValue}
              enterpriseValue={outputs.enterpriseValue}
              netDebt={netDebt}
              equityValue={outputs.equityValue}
              variant={variant}
            />

            <SensitivityTable
              baseWACC={outputs.wacc}
              baseTerminalGrowth={inputs.perpetualGrowth}
              baseValue={outputs.intrinsicValuePerShare}
              calculateValue={calculateValue}
              variant={variant}
            />
          </div>

          <div className="space-y-5">
            <div>
              <div className="report-subhead mb-3">WACC Summary</div>
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

            <div>
              <div className="report-subhead mb-3">Key Assumptions</div>
              <table className="report-table">
                <tbody>
                  <tr>
                    <td>Capex / Revenue</td>
                    <td className="num">{(inputs.capexPercentOfRevenue * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td>D&amp;A / Revenue</td>
                    <td className="num">{(inputs.depreciationPercentOfRevenue * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td>NWC / Revenue Delta</td>
                    <td className="num">{(inputs.nwcChangePercentOfRevenueChange * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td>Cash Tax Rate</td>
                    <td className="num">{(inputs.cashTaxRate * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td>Net Debt</td>
                    <td className="num">{formatBillions(netDebt)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div className="report-subhead mb-3">Condensed Forecast Summary</div>
              <table className="report-table">
                <tbody>
                  <tr>
                    <td>Revenue Growth</td>
                    <td className="num">{(inputs.revenueGrowth[0] * 100).toFixed(1)}% to {(inputs.revenueGrowth[inputs.revenueGrowth.length - 1] * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td>Average Revenue Growth</td>
                    <td className="num">{(avgRevenueGrowth * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td>EBIT Margin</td>
                    <td className="num">{(inputs.ebitMargin[0] * 100).toFixed(1)}% to {(inputs.ebitMargin[inputs.ebitMargin.length - 1] * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td>Average EBIT Margin</td>
                    <td className="num">{(avgEbitMargin * 100).toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td>Average FCFF</td>
                    <td className="num">{formatBillions(avgFcff)}</td>
                  </tr>
                  <tr>
                    <td>Terminal Contribution</td>
                    <td className="num">{(outputs.terminalValueContribution * 100).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

              <div>
                <div className="report-subhead mb-3">Methodology & Takeaway</div>
                <p className="text-[11.2px] leading-6 text-slate-800">
                  We apply a free cash flow to the firm framework across a {inputs.forecastYears}-year forecast period and discount
                  value at {(outputs.wacc * 100).toFixed(2)}%. The base case supports fair value of <strong>${outputs.intrinsicValuePerShare.toFixed(2)}</strong>{' '}
                  per share, implying <strong className={outputs.upsideDownside >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                    {(outputs.upsideDownside * 100).toFixed(1)}% {outputs.upsideDownside >= 0 ? 'upside' : 'downside'}
                  </strong> versus the prevailing market price. The principal drivers remain terminal growth, discount rate,
                  and delivery against the forecast margin profile.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const forecastYears = Array.from({ length: inputs.forecastYears }, (_, i) => i + 1);

  return (
    <div className={isDocument ? 'space-y-6' : 'space-y-8'}>
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

      <ValuationBridge
        pvForecastFCF={pvForecastFCF}
        pvTerminalValue={outputs.pvOfTerminalValue}
        enterpriseValue={outputs.enterpriseValue}
        netDebt={netDebt}
        equityValue={outputs.equityValue}
        variant={variant}
      />

      <div className="grid md:grid-cols-2 gap-6">
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

      <SensitivityTable
        baseWACC={outputs.wacc}
        baseTerminalGrowth={inputs.perpetualGrowth}
        baseValue={outputs.intrinsicValuePerShare}
        calculateValue={calculateValue}
        variant={variant}
      />

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
