import type { ReactNode } from 'react';
import Image from 'next/image';
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
  prose max-w-none text-[11.5px] leading-6 text-slate-800
  prose-headings:font-semibold prose-headings:text-slate-950
  prose-p:my-3 prose-p:text-slate-800
  prose-strong:text-slate-950
  prose-ul:my-3 prose-ul:list-disc prose-ul:pl-5
  prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-5
  prose-li:my-1
  prose-table:my-4 prose-table:w-full prose-table:border-collapse
  prose-thead:border prose-thead:border-slate-300
  prose-th:border prose-th:border-slate-300 prose-th:bg-slate-100 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-[10px] prose-th:font-semibold prose-th:uppercase prose-th:tracking-[0.16em]
  prose-td:border prose-td:border-slate-300 prose-td:px-3 prose-td:py-2 prose-td:text-[11px]
  prose-blockquote:border-l-2 prose-blockquote:border-slate-300 prose-blockquote:pl-4 prose-blockquote:text-slate-700
  [&_img]:mx-auto [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded
`;

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
    <section className={`${pageBreak ? 'page-break' : ''} border-t border-slate-300 pt-6`}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Section {number}
          </div>
          <h2 className="mt-2 font-serif text-[28px] leading-none text-slate-950">{title}</h2>
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
}: {
  report: ResearchExportReport;
}) {
  return (
    <>
      <style jsx global>{`
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
      `}</style>

      <div className="pdf-doc mx-auto max-w-[8.15in] bg-white px-10 py-8 text-slate-900">
        <header className="min-h-[9.4in] flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-8">
              <div className="flex items-center gap-4">
                <Image
                  src={sgcLogo}
                  alt="St. George Capital"
                  width={120}
                  height={120}
                  className="h-auto w-[96px]"
                  priority
                />
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    St. George Capital
                  </div>
                  <div className="mt-2 text-[11px] uppercase tracking-[0.14em] text-slate-600">
                    Equity Research
                  </div>
                </div>
              </div>
              <div className="text-right text-[10px] uppercase tracking-[0.14em] text-slate-500">
                {new Date(report.reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            <div className="mt-20 border-t border-slate-300 pt-10">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Initiation of Coverage
              </div>
              <h1 className="mt-4 max-w-4xl font-serif text-[66px] leading-[0.95] text-slate-950">
                {report.companyName}
              </h1>
              <div className="mt-6 text-[16px] font-medium uppercase tracking-[0.12em] text-slate-600">
                {report.ticker} • {report.exchange}
              </div>
            </div>

            <div className="mt-16 grid grid-cols-[1.2fr_0.8fr] gap-10">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Investment Summary
                </div>
                <div className="mt-4 space-y-4">
                  {report.investmentThesis.slice(0, 3).map((bullet, index) => (
                    <div key={index} className="border-l-2 border-slate-300 pl-4">
                      <div className="text-[12px] font-semibold text-slate-950">
                        {bullet.title ? markdownToPlainText(bullet.title) : `Thesis ${index + 1}`}
                      </div>
                      <p className="mt-2 text-[11.5px] leading-6 text-slate-700">
                        {markdownToPlainText(bullet.claim).slice(0, 210)}
                        {markdownToPlainText(bullet.claim).length > 210 ? '...' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-slate-300 p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Rating Snapshot
                </div>
                <div className={`mt-4 inline-flex rounded-sm px-3 py-1.5 text-sm font-semibold ${getRecommendationColor(report.recommendation)}`}>
                  {report.recommendation.toUpperCase()}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 text-[11px]">
                  <div>
                    <div className="uppercase tracking-[0.12em] text-slate-500">Current</div>
                    <div className="mt-1 font-semibold text-slate-950">${report.currentPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.12em] text-slate-500">Target</div>
                    <div className="mt-1 font-semibold text-slate-950">${report.targetPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.12em] text-slate-500">Upside</div>
                    <div className={`mt-1 font-semibold ${report.impliedUpside >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {(report.impliedUpside * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.12em] text-slate-500">Horizon</div>
                    <div className="mt-1 font-semibold text-slate-950">{report.timeHorizon}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.12em] text-slate-500">Sector</div>
                    <div className="mt-1 font-semibold text-slate-950">{report.sector}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.12em] text-slate-500">Industry</div>
                    <div className="mt-1 font-semibold text-slate-950">{report.industry}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-300 pt-5">
            <div className="grid grid-cols-2 gap-6 text-[11px]">
              <div>
                <div className="uppercase tracking-[0.12em] text-slate-500">Analysts</div>
                <div className="mt-1 font-medium text-slate-900">{report.analysts.join(', ')}</div>
              </div>
              <div className="text-right">
                <div className="uppercase tracking-[0.12em] text-slate-500">Coverage</div>
                <div className="mt-1 font-medium capitalize text-slate-900">{report.coverageStatus}</div>
              </div>
            </div>
          </div>
        </header>

        <PdfSection number="1" title="Executive Summary" pageBreak>
          <div className="grid grid-cols-[1.2fr_0.8fr] gap-8">
            <div>
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Investment Thesis
              </h3>
              <div className="space-y-4">
                {report.investmentThesis.map((bullet, index) => (
                  <div key={index} className="avoid-break border-l-2 border-slate-300 pl-4">
                    {bullet.title && (
                      <div className="mb-2 font-semibold text-slate-950">
                        <PdfMarkdown content={bullet.title} />
                      </div>
                    )}
                    <div className="text-[11.5px] leading-6 text-slate-800">
                      <PdfMarkdown content={bullet.claim} />
                    </div>
                    <div className="mt-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Driver</div>
                      <PdfMarkdown content={bullet.driver || '—'} />
                    </div>
                    <div className="mt-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Market Mispricing</div>
                      <PdfMarkdown content={bullet.mispricing || '—'} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="border border-slate-300 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Key Metrics</div>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[11px]">
                  <div>
                    <div className="text-slate-500">Current Price</div>
                    <div className="mt-1 font-semibold">${report.currentPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Target Price</div>
                    <div className="mt-1 font-semibold">${report.targetPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Implied Upside</div>
                    <div className={`mt-1 font-semibold ${report.impliedUpside >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {(report.impliedUpside * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Time Horizon</div>
                    <div className="mt-1 font-semibold">{report.timeHorizon}</div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-300 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Coverage Note</div>
                <p className="mt-3 text-[11.5px] leading-6 text-slate-800">
                  {report.companyName} is rated <span className="font-semibold">{report.recommendation.toUpperCase()}</span> with a
                  target price of <span className="font-semibold">${report.targetPrice.toFixed(2)}</span>, implying{' '}
                  <span className="font-semibold">{(report.impliedUpside * 100).toFixed(1)}%</span> upside to the current price.
                </p>
              </div>
            </aside>
          </div>
        </PdfSection>

        <PdfSection number="2" title="Company Snapshot & Price Performance" pageBreak>
          <div className="grid grid-cols-3 gap-x-6 gap-y-4 border border-slate-300 p-5 text-[11px]">
            {report.priceDate && (
              <div>
                <div className="uppercase tracking-[0.12em] text-slate-500">Date of Price</div>
                <div className="mt-1 font-medium text-slate-900">{report.priceDate}</div>
              </div>
            )}
            {report.fiftyTwoWeekRange && (
              <div>
                <div className="uppercase tracking-[0.12em] text-slate-500">52-Week Range</div>
                <div className="mt-1 font-medium text-slate-900">{report.fiftyTwoWeekRange}</div>
              </div>
            )}
            {report.marketCap != null && (
              <div>
                <div className="uppercase tracking-[0.12em] text-slate-500">Market Cap</div>
                <div className="mt-1 font-medium text-slate-900">${report.marketCap.toLocaleString()} mn</div>
              </div>
            )}
            {report.sharesOutstanding != null && (
              <div>
                <div className="uppercase tracking-[0.12em] text-slate-500">Shares O/S</div>
                <div className="mt-1 font-medium text-slate-900">{report.sharesOutstanding.toLocaleString()} mn</div>
              </div>
            )}
            {report.fiscalYearEnd && (
              <div>
                <div className="uppercase tracking-[0.12em] text-slate-500">Fiscal Year End</div>
                <div className="mt-1 font-medium text-slate-900">{report.fiscalYearEnd}</div>
              </div>
            )}
            {report.priceTargetEndDate && (
              <div>
                <div className="uppercase tracking-[0.12em] text-slate-500">Price Target End Date</div>
                <div className="mt-1 font-medium text-slate-900">{report.priceTargetEndDate}</div>
              </div>
            )}
            {(report.peRatio != null || report.dcfInputs?.peRatio != null) && (
              <div>
                <div className="uppercase tracking-[0.12em] text-slate-500">P/E</div>
                <div className="mt-1 font-medium text-slate-900">{(report.peRatio ?? report.dcfInputs?.peRatio).toFixed(2)}x</div>
              </div>
            )}
            {(report.forwardPE != null || report.dcfInputs?.forwardPE != null) && (
              <div>
                <div className="uppercase tracking-[0.12em] text-slate-500">Forward P/E</div>
                <div className="mt-1 font-medium text-slate-900">{(report.forwardPE ?? report.dcfInputs?.forwardPE).toFixed(2)}x</div>
              </div>
            )}
            {report.dividendYield != null && (
              <div>
                <div className="uppercase tracking-[0.12em] text-slate-500">Dividend Yield</div>
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
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">EPS Table</div>
                  <div className="border border-slate-300 p-4">
                    <PdfMarkdown content={report.epsTableMarkdown} />
                  </div>
                </div>
              )}
              {(report.priceHistory && report.priceHistory.length > 0) || report.priceChartImageUrl ? (
                <div className="avoid-break">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Price Chart</div>
                  <div className="border border-slate-300 p-4">
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
                </div>
              ) : null}
            </div>
          )}
        </PdfSection>

        <PdfSection number="3" title="Business Model & Economics">
          <div className="space-y-6">
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">How the Company Makes Money</div>
              <PdfMarkdown content={report.businessModel} />
            </div>
            {report.unitEconomics && (
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Unit Economics</div>
                <PdfMarkdown content={report.unitEconomics} />
              </div>
            )}
            {report.economicMoat && (
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Economic Moat</div>
                <PdfMarkdown content={report.economicMoat} />
              </div>
            )}
          </div>
        </PdfSection>

        <PdfSection number="4" title="Industry & Competitive Landscape">
          <PdfMarkdown content={report.industryAnalysis} />
        </PdfSection>

        <PdfSection number="5" title="Catalysts & Timeline">
          <div className="space-y-6">
            {report.catalystsNearTerm.length > 0 && (
              <div className="avoid-break">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Near-Term Catalysts</div>
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr>
                      <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[10px] uppercase tracking-[0.12em]">Event</th>
                      <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[10px] uppercase tracking-[0.12em]">Timeframe</th>
                      <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[10px] uppercase tracking-[0.12em]">Probability</th>
                      <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[10px] uppercase tracking-[0.12em]">Mechanism</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.catalystsNearTerm.map((catalyst, index) => (
                      <tr key={index}>
                        <td className="border border-slate-300 px-3 py-2 font-medium">{catalyst.event}</td>
                        <td className="border border-slate-300 px-3 py-2">{catalyst.timeframe || '—'}</td>
                        <td className="border border-slate-300 px-3 py-2 capitalize">{catalyst.probability}</td>
                        <td className="border border-slate-300 px-3 py-2">{catalyst.mechanism}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {report.catalystsMediumTerm.length > 0 && (
              <div className="avoid-break">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Medium-Term Catalysts</div>
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr>
                      <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[10px] uppercase tracking-[0.12em]">Event</th>
                      <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[10px] uppercase tracking-[0.12em]">Timeframe</th>
                      <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[10px] uppercase tracking-[0.12em]">Probability</th>
                      <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[10px] uppercase tracking-[0.12em]">Mechanism</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.catalystsMediumTerm.map((catalyst, index) => (
                      <tr key={index}>
                        <td className="border border-slate-300 px-3 py-2 font-medium">{catalyst.event}</td>
                        <td className="border border-slate-300 px-3 py-2">{catalyst.timeframe || '—'}</td>
                        <td className="border border-slate-300 px-3 py-2 capitalize">{catalyst.probability}</td>
                        <td className="border border-slate-300 px-3 py-2">{catalyst.mechanism}</td>
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
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Comparable Companies</div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[10.5px]">
                    <thead>
                      <tr>
                        {['Company','Mkt Cap','EV/Rev','EV/EBITDA','P/E','Fwd P/E','P/S','Rev Growth','EBITDA Margin','Beta'].map((heading) => (
                          <th key={heading} className="border border-slate-300 bg-slate-100 px-2 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.competitivePosition.rows.map((row: any, index: number) => (
                        <tr key={`${row.ticker}-${index}`} className={row.isSubject ? 'bg-slate-100' : ''}>
                          <td className="border border-slate-300 px-2 py-2">
                            <div className="font-medium">{row.name}</div>
                            <div className="text-[9px] text-slate-500">{row.ticker}</div>
                          </td>
                          <td className="border border-slate-300 px-2 py-2">{row.marketCap != null ? (row.marketCap >= 1000 ? `$${(row.marketCap / 1000).toFixed(1)}B` : `$${row.marketCap.toFixed(0)}M`) : '—'}</td>
                          <td className="border border-slate-300 px-2 py-2">{row.evToRevenue != null ? `${row.evToRevenue.toFixed(1)}x` : '—'}</td>
                          <td className="border border-slate-300 px-2 py-2">{row.evToEBITDA != null ? `${row.evToEBITDA.toFixed(1)}x` : '—'}</td>
                          <td className="border border-slate-300 px-2 py-2">{row.peTrailing != null ? `${row.peTrailing.toFixed(1)}x` : '—'}</td>
                          <td className="border border-slate-300 px-2 py-2">{row.peForward != null ? `${row.peForward.toFixed(1)}x` : '—'}</td>
                          <td className="border border-slate-300 px-2 py-2">{row.priceToSales != null ? `${row.priceToSales.toFixed(1)}x` : '—'}</td>
                          <td className="border border-slate-300 px-2 py-2">{row.revenueGrowthYoY != null ? `${(row.revenueGrowthYoY * 100).toFixed(1)}%` : '—'}</td>
                          <td className="border border-slate-300 px-2 py-2">{row.ebitdaMargin != null ? `${(row.ebitdaMargin * 100).toFixed(1)}%` : '—'}</td>
                          <td className="border border-slate-300 px-2 py-2">{row.beta != null ? row.beta.toFixed(2) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
              />
            </div>
          </div>
        </PdfSection>

        <PdfSection number="7" title="Scenario Analysis">
          <div className="grid grid-cols-2 gap-6">
            {report.bullCase && (
              <div className="avoid-break border border-emerald-300 bg-emerald-50 p-4">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Bull Case</div>
                <PdfMarkdown content={report.bullCase} />
              </div>
            )}
            <div className="avoid-break border border-red-300 bg-red-50 p-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-700">Bear Case</div>
              <PdfMarkdown content={report.bearCase} />
            </div>
          </div>
          {report.bullBearJustification && (
            <div className="mt-6">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Justification</div>
              <PdfMarkdown content={report.bullBearJustification} />
            </div>
          )}
        </PdfSection>

        {report.keyRisks.length > 0 && (
          <PdfSection number="8" title="Key Risks">
            <div className="space-y-4">
              {report.keyRisks.map((risk, index) => (
                <div key={index} className="avoid-break border border-slate-300 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="font-semibold text-slate-950">{risk.title}</div>
                    <span className={`rounded px-2 py-1 text-[10px] font-semibold uppercase ${getImpactBadge(risk.impact)}`}>
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
            <PdfMarkdown content={report.aiStrategies} />
          </PdfSection>
        )}

        {report.esgFactors && (
          <PdfSection number="10" title="ESG & Governance">
            <PdfMarkdown content={report.esgFactors} />
          </PdfSection>
        )}

        {report.concludingSection && (
          <PdfSection number="11" title="Conclusion">
            <PdfMarkdown content={report.concludingSection} />
          </PdfSection>
        )}

        <section className="mt-10 border-t border-slate-300 pt-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Important Disclosures</div>
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
