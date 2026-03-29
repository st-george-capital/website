import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { InstitutionalValuationSection } from '@/components/InstitutionalValuationSection';
import sgcLogo from '@/images/exec team/logo/sgc_logo.png';

export interface ResearchExportReport {
  id: string;
  companyName: string;
  ticker: string;
  exchange: string;
  sector: string;
  industry: string;
  reportDate: string;
  analysts: string[];
  coverageStatus: string;
  recommendation: string;
  currentPrice: number;
  targetPrice: number;
  impliedUpside: number;
  timeHorizon: string;
  currency: string;
  priceDate?: string | null;
  fiftyTwoWeekRange?: string | null;
  marketCap?: number | null;
  sharesOutstanding?: number | null;
  fiscalYearEnd?: string | null;
  priceTargetEndDate?: string | null;
  performanceMetrics?: {
    absYTD?: number; abs1m?: number; abs3m?: number; abs12m?: number;
    relYTD?: number; rel1m?: number; rel3m?: number; rel12m?: number;
  } | null;
  epsTableMarkdown?: string | null;
  dataSource?: string | null;
  peRatio?: number | null;
  forwardPE?: number | null;
  forwardPEConsensus?: number | null;
  dividendYield?: number | null;
  priceChartImageUrl?: string | null;
  showPriceChart?: boolean;
  priceHistory?: Array<{ date: string; close: number }> | null;
  dcfInputs?: any;
  dcfOutputs?: any;
  investmentThesis: Array<{
    title?: string;
    claim: string;
    driver: string;
    mispricing: string;
  }>;
  concludingSection?: string | null;
  businessModel: string;
  unitEconomics?: string;
  economicMoat?: string;
  industryAnalysis: string;
  competitivePosition?: { source: string; rows: any[]; updatedAt: string } | null;
  catalystsNearTerm: Array<{
    event: string;
    mechanism: string;
    probability: string;
    timeframe: string;
  }>;
  catalystsMediumTerm: Array<{
    event: string;
    mechanism: string;
    probability: string;
    timeframe: string;
  }>;
  valuationAnalysis: string;
  bearCase: string;
  bullCase?: string | null;
  bullBearJustification?: string | null;
  aiStrategies?: string | null;
  keyRisks: Array<{
    title: string;
    description: string;
    impact: string;
    mitigation: string;
  }>;
  esgFactors?: string;
  published: boolean;
  status: string;
}

const PDF_MARKDOWN_CLASSNAME = `
  prose max-w-none text-[11.15px] leading-[1.8] text-slate-800
  prose-headings:font-semibold prose-headings:text-slate-950
  prose-p:my-2.5 prose-p:text-slate-800
  prose-strong:text-slate-950
  prose-ul:my-2.5 prose-ul:list-disc prose-ul:pl-5
  prose-ol:my-2.5 prose-ol:list-decimal prose-ol:pl-5
  prose-li:my-1
  prose-table:my-4 prose-table:w-full prose-table:table-fixed prose-table:border-collapse
  prose-thead:border prose-thead:border-slate-300
  prose-th:border prose-th:border-slate-300 prose-th:bg-slate-100 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-[9.5px] prose-th:font-semibold prose-th:uppercase prose-th:text-slate-700
  prose-td:border prose-td:border-slate-300 prose-td:px-3 prose-td:py-2 prose-td:text-[10.5px]
  prose-blockquote:border-l-2 prose-blockquote:border-slate-300 prose-blockquote:pl-4 prose-blockquote:text-slate-700
  [&_img]:mx-auto [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded
`;

const EXPORT_DOCUMENT_STYLES = `
  @media print {
    @page {
      size: letter;
      margin: 0.75in 0.75in 0.85in;
    }

    body {
      background: #ffffff !important;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    nav,
    button {
      display: none !important;
    }

    .pdf-doc {
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .pdf-doc .page-break {
      break-before: page;
      page-break-before: always;
    }

    .pdf-doc .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }

  .pdf-doc {
    font-family: Georgia, "Times New Roman", serif;
  }

  .pdf-doc .report-sans {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  }

  .pdf-doc .report-box {
    border: 1px solid #cbd5e1;
    background: #fff;
  }

  .pdf-doc .report-box-soft {
    border: 1px solid #dbe3ef;
    background: #f8fafc;
  }

  .pdf-doc .report-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10.5px;
    color: #0f172a;
  }

  .pdf-doc .report-table th {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    padding: 8px 10px;
    text-align: left;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    color: #475569;
  }

  .pdf-doc .report-table td {
    border: 1px solid #cbd5e1;
    padding: 8px 10px;
    vertical-align: top;
  }

  .pdf-doc .report-table .num {
    text-align: right;
    white-space: nowrap;
  }

  .pdf-doc .report-caption {
    margin-top: 8px;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 9px;
    color: #64748b;
  }
`;

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="report-sans mb-3 text-[9px] font-semibold uppercase text-slate-500">
      {children}
    </div>
  );
}

function MetricDefinition({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="border-t border-slate-200 pt-2 first:border-t-0 first:pt-0">
      <div className="report-sans text-[9px] font-semibold uppercase text-slate-500">{label}</div>
      <div className={`mt-1 text-[12px] font-semibold ${accent ? 'text-slate-950' : 'text-slate-800'}`}>{value}</div>
    </div>
  );
}

function formatPercent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatMoney(value: number, digits = 2) {
  return `$${value.toFixed(digits)}`;
}

function PdfSection({
  number,
  title,
  children,
  pageBreak = false,
}: {
  number: string;
  title: string;
  children: ReactNode;
  pageBreak?: boolean;
}) {
  return (
    <section className={`${pageBreak ? 'page-break' : ''} report-section border-t-2 border-slate-800 pt-6`}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="report-sans text-[9px] font-semibold uppercase text-slate-500">
            Section {number}
          </div>
          <h2 className="mt-1 font-serif text-[26px] leading-tight text-slate-950">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function PdfMarkdown({ content }: { content?: string | null }) {
  if (!content) {
    return <p className="text-[11.5px] text-slate-500">Not provided.</p>;
  }

  return (
    <div className={PDF_MARKDOWN_CLASSNAME}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

function markdownToPlainText(content?: string | null) {
  if (!content) return '';
  return content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]\(([^)]*)\)/g, '$1')
    .replace(/[#>*_`~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getRecommendationColor(rec: string) {
  switch (rec.toLowerCase()) {
    case 'buy': return 'bg-green-600 text-white';
    case 'sell': return 'bg-red-600 text-white';
    case 'overweight': return 'bg-green-600 text-white';
    case 'underweight': return 'bg-red-600 text-white';
    case 'neutral': return 'bg-gray-600 text-white';
    case 'hold': return 'bg-gray-600 text-white';
    default: return 'bg-gray-600 text-white';
  }
}

function getImpactBadge(impact: string) {
  const colors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-orange-100 text-orange-800',
    high: 'bg-red-100 text-red-800',
  };
  return colors[impact as keyof typeof colors] || 'bg-gray-100 text-gray-800';
}

export function ResearchExportDocument({
  report,
  logoSrc = sgcLogo.src,
}: {
  report: ResearchExportReport;
  logoSrc?: string;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: EXPORT_DOCUMENT_STYLES }} />

      <div
        className="pdf-doc mx-auto max-w-[8.15in] bg-white px-10 py-8 text-slate-900"
        data-company-name={report.companyName}
        data-ticker={report.ticker}
        data-report-date={new Date(report.reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
      >
        <header className="min-h-[9.4in] flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-8">
              <div className="flex items-center gap-4">
                <img
                  src={logoSrc}
                  alt="St. George Capital"
                  width={120}
                  height={120}
                  className="h-auto w-[96px]"
                />
                <div>
                  <div className="report-sans text-[10px] font-semibold uppercase text-slate-500">
                    St. George Capital
                  </div>
                  <div className="report-sans mt-2 text-[11px] uppercase text-slate-600">
                    Equity Research
                  </div>
                </div>
              </div>
              <div className="report-sans text-right text-[10px] uppercase text-slate-500">
                {new Date(report.reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            <div className="mt-20 border-t border-slate-300 pt-10">
              <div className="report-sans text-[10px] font-semibold uppercase text-slate-500">
                Initiation of Coverage
              </div>
              <h1 className="mt-4 max-w-4xl font-serif text-[58px] leading-[0.98] text-slate-950">
                {report.companyName}
              </h1>
              <div className="report-sans mt-5 text-[15px] font-medium uppercase text-slate-600">
                {report.ticker} • {report.exchange}
              </div>
            </div>

            <div className="mt-16 grid grid-cols-[1.2fr_0.8fr] gap-10">
              <div>
                <SectionLabel>Investment Summary</SectionLabel>
                <div className="mt-4 space-y-4">
                  {report.investmentThesis.slice(0, 3).map((bullet, index) => (
                    <div key={index} className="report-box-soft px-4 py-3">
                      <div className="report-sans text-[11px] font-semibold uppercase text-slate-500">
                        {bullet.title ? markdownToPlainText(bullet.title) : `Thesis ${index + 1}`}
                      </div>
                      <p className="mt-2 text-[11.25px] leading-6 text-slate-700">
                        {markdownToPlainText(bullet.claim).slice(0, 210)}
                        {markdownToPlainText(bullet.claim).length > 210 ? '...' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="report-box p-5">
                <SectionLabel>Rating Snapshot</SectionLabel>
                <div className={`report-sans mt-4 inline-flex rounded-sm px-3 py-1.5 text-sm font-semibold ${getRecommendationColor(report.recommendation)}`}>
                  {report.recommendation.toUpperCase()}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4">
                  <MetricDefinition label="Current Price" value={formatMoney(report.currentPrice)} accent />
                  <MetricDefinition label="Target Price" value={formatMoney(report.targetPrice)} accent />
                  <MetricDefinition
                    label="Implied Upside"
                    value={<span className={report.impliedUpside >= 0 ? 'text-emerald-700' : 'text-red-700'}>{formatPercent(report.impliedUpside)}</span>}
                  />
                  <MetricDefinition label="Time Horizon" value={report.timeHorizon} />
                  <MetricDefinition label="Sector" value={report.sector} />
                  <MetricDefinition label="Industry" value={report.industry} />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-300 pt-5">
            <div className="grid grid-cols-2 gap-6 text-[11px]">
              <div>
                <div className="report-sans uppercase text-slate-500">Analysts</div>
                <div className="mt-1 font-medium text-slate-900">{report.analysts.join(', ')}</div>
              </div>
              <div className="text-right">
                <div className="report-sans uppercase text-slate-500">Coverage</div>
                <div className="mt-1 font-medium capitalize text-slate-900">{report.coverageStatus}</div>
              </div>
            </div>
          </div>
        </header>

        <PdfSection number="1" title="Executive Summary" pageBreak>
          <div className="grid grid-cols-[1.2fr_0.8fr] gap-8">
            <div>
              <SectionLabel>Investment Thesis</SectionLabel>
              <div className="space-y-4">
                {report.investmentThesis.map((bullet, index) => (
                  <div key={index} className="avoid-break report-box-soft p-4">
                    {bullet.title && (
                      <div className="report-sans mb-2 text-[11px] font-semibold uppercase text-slate-500">
                        <PdfMarkdown content={bullet.title} />
                      </div>
                    )}
                    <div className="text-[11.5px] leading-6 text-slate-800">
                      <PdfMarkdown content={bullet.claim} />
                    </div>
                    <div className="mt-4 border-t border-slate-200 pt-3">
                      <div className="report-sans text-[9px] font-semibold uppercase text-slate-500">Primary Driver</div>
                      <PdfMarkdown content={bullet.driver || '—'} />
                    </div>
                    <div className="mt-3">
                      <div className="report-sans text-[9px] font-semibold uppercase text-slate-500">Market Mispricing</div>
                      <PdfMarkdown content={bullet.mispricing || '—'} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="report-box p-4">
                <SectionLabel>Recommendation Snapshot</SectionLabel>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                  <MetricDefinition label="Recommendation" value={report.recommendation.toUpperCase()} accent />
                  <MetricDefinition label="Time Horizon" value={report.timeHorizon} />
                  <MetricDefinition label="Current Price" value={formatMoney(report.currentPrice)} />
                  <MetricDefinition label="Target Price" value={formatMoney(report.targetPrice)} />
                  <MetricDefinition
                    label="Upside / Downside"
                    value={<span className={report.impliedUpside >= 0 ? 'text-emerald-700' : 'text-red-700'}>{formatPercent(report.impliedUpside)}</span>}
                    accent
                  />
                  <MetricDefinition label="Coverage Status" value={report.coverageStatus} />
                </div>
              </div>

              <div className="report-box-soft p-4">
                <SectionLabel>Investment View</SectionLabel>
                <p className="mt-3 text-[11.5px] leading-6 text-slate-800">
                  {report.companyName} is rated <span className="font-semibold">{report.recommendation.toUpperCase()}</span> with a
                  target price of <span className="font-semibold">{formatMoney(report.targetPrice)}</span>, implying{' '}
                  <span className="font-semibold">{formatPercent(report.impliedUpside)}</span> relative to the current price of{' '}
                  <span className="font-semibold">{formatMoney(report.currentPrice)}</span>.
                </p>
              </div>
            </aside>
          </div>
        </PdfSection>

        <PdfSection number="2" title="Company Snapshot & Price Performance" pageBreak>
          <div className="report-box grid grid-cols-3 gap-x-6 gap-y-4 p-5 text-[11px]">
            {report.priceDate && (
              <div>
                <div className="report-sans uppercase text-slate-500">Date of Price</div>
                <div className="mt-1 font-medium text-slate-900">{report.priceDate}</div>
              </div>
            )}
            {report.fiftyTwoWeekRange && (
              <div>
                <div className="report-sans uppercase text-slate-500">52-Week Range</div>
                <div className="mt-1 font-medium text-slate-900">{report.fiftyTwoWeekRange}</div>
              </div>
            )}
            {report.marketCap != null && (
              <div>
                <div className="report-sans uppercase text-slate-500">Market Cap</div>
                <div className="mt-1 font-medium text-slate-900">${report.marketCap.toLocaleString()} mn</div>
              </div>
            )}
            {report.sharesOutstanding != null && (
              <div>
                <div className="report-sans uppercase text-slate-500">Shares O/S</div>
                <div className="mt-1 font-medium text-slate-900">{report.sharesOutstanding.toLocaleString()} mn</div>
              </div>
            )}
            {report.fiscalYearEnd && (
              <div>
                <div className="report-sans uppercase text-slate-500">Fiscal Year End</div>
                <div className="mt-1 font-medium text-slate-900">{report.fiscalYearEnd}</div>
              </div>
            )}
            {report.priceTargetEndDate && (
              <div>
                <div className="report-sans uppercase text-slate-500">Price Target End Date</div>
                <div className="mt-1 font-medium text-slate-900">{report.priceTargetEndDate}</div>
              </div>
            )}
            {(report.peRatio != null || report.dcfInputs?.peRatio != null) && (
              <div>
                <div className="report-sans uppercase text-slate-500">P/E</div>
                <div className="mt-1 font-medium text-slate-900">{(report.peRatio ?? report.dcfInputs?.peRatio).toFixed(2)}x</div>
              </div>
            )}
            {(report.forwardPE != null || report.dcfInputs?.forwardPE != null) && (
              <div>
                <div className="report-sans uppercase text-slate-500">Forward P/E</div>
                <div className="mt-1 font-medium text-slate-900">{(report.forwardPE ?? report.dcfInputs?.forwardPE).toFixed(2)}x</div>
              </div>
            )}
            {report.dividendYield != null && (
              <div>
                <div className="report-sans uppercase text-slate-500">Dividend Yield</div>
                <div className="mt-1 font-medium text-slate-900">{report.dividendYield.toFixed(2)}%</div>
              </div>
            )}
          </div>

          {report.dataSource && (
            <div className="mt-3 text-[10px] text-slate-500">Source: {report.dataSource}</div>
          )}

          {((report.priceHistory && report.priceHistory.length > 0) || report.priceChartImageUrl || report.epsTableMarkdown) && (
            <div className="mt-6 grid grid-cols-2 gap-6">
              {report.epsTableMarkdown && (
                <div className="avoid-break">
                  <SectionLabel>EPS Summary</SectionLabel>
                  <div className="report-box p-4">
                    <PdfMarkdown content={report.epsTableMarkdown} />
                  </div>
                  <div className="report-caption">Consensus and historical EPS summary as entered in the report source content.</div>
                </div>
              )}
              {(report.priceHistory && report.priceHistory.length > 0) || report.priceChartImageUrl ? (
                <div className="avoid-break">
                  <SectionLabel>Price Performance</SectionLabel>
                  <div className="report-box p-4">
                    {report.priceChartImageUrl && !(report.priceHistory && report.priceHistory.length > 0) ? (
                      <img src={report.priceChartImageUrl} alt="Price Chart" className="w-full h-auto rounded" />
                    ) : (
                      <svg viewBox="0 0 800 220" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                        {(() => {
                          const chartData = (report.priceHistory || report.dcfInputs?.priceHistory || []).slice(0, 100);
                          if (!chartData.length) return null;
                          const prices = chartData.map((point: any) => point.close);
                          const maxPrice = Math.max(...prices);
                          const topPad = maxPrice * 0.05;
                          const range = maxPrice + topPad;
                          const points = chartData.map((point: any, index: number) => {
                            const x = (chartData.length > 1 ? index / (chartData.length - 1) : 0) * 760 + 20;
                            const y = 200 - (point.close / range) * 180;
                            return `${x},${y}`;
                          }).join(' ');
                          const areaPoints = `${points} 760,200 20,200`;
                          return (
                            <>
                              <rect x="20" y="20" width="760" height="180" fill="white" rx="4" />
                              <line x1="20" y1="200" x2="780" y2="200" stroke="#cbd5e1" strokeWidth="1" />
                              <line x1="20" y1="20" x2="20" y2="200" stroke="#cbd5e1" strokeWidth="1" />
                              <polygon points={areaPoints} fill="rgba(30, 41, 59, 0.06)" stroke="none" />
                              <polyline points={points} fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </>
                          );
                        })()}
                      </svg>
                    )}
                  </div>
                  <div className="report-caption">Figure 1. Recent share-price trend based on the 100-day history available in the model inputs.</div>
                </div>
              ) : null}
            </div>
          )}
        </PdfSection>

        <PdfSection number="3" title="Business Model & Economics">
          <div className="space-y-6">
            <div className="report-box p-5">
              <SectionLabel>How the Company Makes Money</SectionLabel>
              <PdfMarkdown content={report.businessModel} />
            </div>
            {report.unitEconomics && (
              <div className="report-box p-5">
                <SectionLabel>Unit Economics</SectionLabel>
                <PdfMarkdown content={report.unitEconomics} />
              </div>
            )}
            {report.economicMoat && (
              <div className="report-box p-5">
                <SectionLabel>Economic Moat</SectionLabel>
                <PdfMarkdown content={report.economicMoat} />
              </div>
            )}
          </div>
        </PdfSection>

        <PdfSection number="4" title="Industry & Competitive Landscape">
          <div className="report-box p-5">
            <SectionLabel>Industry Analysis</SectionLabel>
            <PdfMarkdown content={report.industryAnalysis} />
          </div>
        </PdfSection>

        <PdfSection number="5" title="Catalysts & Timeline">
          <div className="space-y-6">
            {report.catalystsNearTerm.length > 0 && (
              <div className="avoid-break">
                <SectionLabel>Near-Term Catalysts</SectionLabel>
                <table className="report-table">
                  <colgroup>
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '49%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Timeframe</th>
                      <th>Probability</th>
                      <th>Mechanism</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.catalystsNearTerm.map((catalyst, index) => (
                      <tr key={index}>
                        <td className="font-medium">{catalyst.event}</td>
                        <td>{catalyst.timeframe || '—'}</td>
                        <td className="capitalize">{catalyst.probability}</td>
                        <td>{catalyst.mechanism}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {report.catalystsMediumTerm.length > 0 && (
              <div className="avoid-break">
                <SectionLabel>Medium-Term Catalysts</SectionLabel>
                <table className="report-table">
                  <colgroup>
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '49%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Timeframe</th>
                      <th>Probability</th>
                      <th>Mechanism</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.catalystsMediumTerm.map((catalyst, index) => (
                      <tr key={index}>
                        <td className="font-medium">{catalyst.event}</td>
                        <td>{catalyst.timeframe || '—'}</td>
                        <td className="capitalize">{catalyst.probability}</td>
                        <td>{catalyst.mechanism}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </PdfSection>

        <PdfSection number="6" title="Valuation Analysis" pageBreak>
          <div className="space-y-6">
            {report.competitivePosition?.rows && report.competitivePosition.rows.length > 0 && (
              <div className="avoid-break">
                <SectionLabel>Comparable Companies</SectionLabel>
                <div className="overflow-x-auto border border-slate-300">
                  <table className="report-table">
                    <colgroup>
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '11%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {['Company','Mkt Cap','EV/Rev','EV/EBITDA','P/E','Fwd P/E','P/S','Rev Growth','EBITDA Margin','Beta'].map((heading) => (
                          <th key={heading} className={heading === 'Company' ? '' : 'num'}>
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.competitivePosition.rows.map((row: any, index: number) => (
                        <tr key={`${row.ticker}-${index}`} className={row.isSubject ? 'bg-slate-100' : ''}>
                          <td>
                            <div className="font-medium">{row.name}</div>
                            <div className="text-[9px] text-slate-500">{row.ticker}</div>
                          </td>
                          <td className="num">{row.marketCap != null ? (row.marketCap >= 1000 ? `$${(row.marketCap / 1000).toFixed(1)}B` : `$${row.marketCap.toFixed(0)}M`) : '—'}</td>
                          <td className="num">{row.evToRevenue != null ? `${row.evToRevenue.toFixed(1)}x` : '—'}</td>
                          <td className="num">{row.evToEBITDA != null ? `${row.evToEBITDA.toFixed(1)}x` : '—'}</td>
                          <td className="num">{row.peTrailing != null ? `${row.peTrailing.toFixed(1)}x` : '—'}</td>
                          <td className="num">{row.peForward != null ? `${row.peForward.toFixed(1)}x` : '—'}</td>
                          <td className="num">{row.priceToSales != null ? `${row.priceToSales.toFixed(1)}x` : '—'}</td>
                          <td className="num">{row.revenueGrowthYoY != null ? `${(row.revenueGrowthYoY * 100).toFixed(1)}%` : '—'}</td>
                          <td className="num">{row.ebitdaMargin != null ? `${(row.ebitdaMargin * 100).toFixed(1)}%` : '—'}</td>
                          <td className="num">{row.beta != null ? row.beta.toFixed(2) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {report.competitivePosition.source && (
                  <div className="report-caption">Source: {report.competitivePosition.source}</div>
                )}
              </div>
            )}

            <div className="avoid-break">
              <InstitutionalValuationSection
                dcfData={report.dcfInputs && report.dcfOutputs ? {
                  inputs: report.dcfInputs as any,
                  outputs: report.dcfOutputs as any,
                  companyName: report.companyName,
                } : null}
                valuationText={report.valuationAnalysis || 'Not provided'}
                variant="document"
              />
            </div>
          </div>
        </PdfSection>

        <PdfSection number="7" title="Scenario Analysis">
          <div className="grid grid-cols-2 gap-6">
            {report.bullCase && (
              <div className="avoid-break border-l-4 border-emerald-600 bg-emerald-50 p-5">
                <div className="report-sans mb-2 text-[10px] font-semibold uppercase text-emerald-700">Bull Case</div>
                <PdfMarkdown content={report.bullCase} />
              </div>
            )}
            <div className="avoid-break border-l-4 border-red-600 bg-red-50 p-5">
              <div className="report-sans mb-2 text-[10px] font-semibold uppercase text-red-700">Bear Case</div>
              <PdfMarkdown content={report.bearCase} />
            </div>
          </div>
          {report.bullBearJustification && (
            <div className="report-box mt-6 p-5">
              <SectionLabel>Scenario Framing</SectionLabel>
              <PdfMarkdown content={report.bullBearJustification} />
            </div>
          )}
        </PdfSection>

        {report.keyRisks.length > 0 && (
          <PdfSection number="8" title="Key Risks">
            <div className="space-y-4">
              {report.keyRisks.map((risk, index) => (
                <div key={index} className="avoid-break report-box p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="font-semibold text-slate-950">{risk.title}</div>
                    <span className={`report-sans rounded px-2 py-1 text-[10px] font-semibold uppercase ${getImpactBadge(risk.impact)}`}>
                      {risk.impact} impact
                    </span>
                  </div>
                  <p className="mt-2 text-[11.5px] leading-6 text-slate-800">{risk.description}</p>
                  {risk.mitigation && (
                    <p className="mt-2 text-[11px] italic text-slate-600">
                      <span className="font-medium not-italic">Mitigation:</span> {risk.mitigation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </PdfSection>
        )}

        {report.aiStrategies && (
          <PdfSection number="9" title="AI & Data Strategy">
            <div className="report-box p-5">
              <SectionLabel>AI & Data Strategy</SectionLabel>
              <PdfMarkdown content={report.aiStrategies} />
            </div>
          </PdfSection>
        )}

        {report.esgFactors && (
          <PdfSection number="10" title="ESG & Governance">
            <div className="report-box p-5">
              <SectionLabel>ESG & Governance</SectionLabel>
              <PdfMarkdown content={report.esgFactors} />
            </div>
          </PdfSection>
        )}

        {report.concludingSection && (
          <PdfSection number="11" title="Conclusion">
            <div className="report-box p-5">
              <SectionLabel>Conclusion</SectionLabel>
              <PdfMarkdown content={report.concludingSection} />
            </div>
          </PdfSection>
        )}

        <section className="mt-10 border-t border-slate-300 pt-4">
          <div className="report-sans text-[10px] font-semibold uppercase text-slate-500">Important Disclosures</div>
          <p className="mt-3 text-[10.5px] leading-5 text-slate-600">
            This report has been prepared by St. George Capital for educational purposes only. It does not constitute
            investment advice or a solicitation to buy or sell securities. St. George Capital and its members may hold
            positions in the securities discussed. Past performance does not guarantee future results. Investors should
            conduct their own due diligence and consult with qualified financial advisors before making investment decisions.
          </p>
          <div className="mt-3 text-[10px] text-slate-500">
            Report status: <span className="font-semibold capitalize text-slate-700">{report.status}</span>
            {report.published && <span className="ml-2 text-emerald-700">• Published</span>}
          </div>
        </section>
      </div>
    </>
  );
}
