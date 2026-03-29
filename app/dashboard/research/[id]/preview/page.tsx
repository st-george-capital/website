'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { ArrowLeft, Download, Edit, TrendingUp, TrendingDown, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { InstitutionalValuationSection } from '@/components/InstitutionalValuationSection';

interface ResearchReport {
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
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
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

export default function ResearchReportPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const isPdfMode = searchParams.get('export') === 'pdf';

  useEffect(() => {
    if (params.id) {
      fetchReport(params.id as string);
    }
  }, [params.id]);

  useEffect(() => {
    if (!isPdfMode || !report) return;

    const timer = window.setTimeout(() => {
      window.print();
    }, 700);

    return () => window.clearTimeout(timer);
  }, [isPdfMode, report]);

  const fetchReport = async (id: string) => {
    try {
      const response = await fetch(`/api/research-reports/${id}`);
      if (!response.ok) throw new Error('Failed to fetch report');
      
      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec.toLowerCase()) {
      case 'buy': return 'bg-green-600 text-white';
      case 'sell': return 'bg-red-600 text-white';
      case 'overweight': return 'bg-green-600 text-white';
      case 'underweight': return 'bg-red-600 text-white';
      case 'neutral': return 'bg-gray-600 text-white';
      case 'hold': return 'bg-gray-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getProbabilityBadge = (prob: string) => {
    const colors = {
      low: 'bg-yellow-100 text-yellow-800',
      medium: 'bg-orange-100 text-orange-800',
      high: 'bg-red-100 text-red-800',
    };
    return colors[prob as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getImpactBadge = (impact: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-orange-100 text-orange-800',
      high: 'bg-red-100 text-red-800',
    };
    return colors[impact as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleExportPDF = () => {
    if (!report) return;
    window.open(`/dashboard/research/${report.id}/preview?export=pdf`, '_blank', 'noopener,noreferrer');
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Report not found</p>
        <Link href="/dashboard/research">
          <Button className="mt-4">Back to Reports</Button>
        </Link>
      </div>
    );
  }

  if (isPdfMode) {
    return (
      <>
        <style jsx global>{`
          @media print {
            @page {
              size: letter;
              margin: 0.55in 0.6in 0.7in;
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
          <header className="border-b border-slate-300 pb-8">
            <div className="flex items-start justify-between gap-8">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  St. George Capital
                </div>
                <div className="mt-2 font-serif text-5xl leading-none text-slate-950">
                  {report.companyName}
                </div>
                <div className="mt-3 text-sm font-medium uppercase tracking-[0.18em] text-slate-600">
                  {report.ticker} • {report.exchange}
                </div>
                <div className="mt-6 max-w-xl text-[13px] leading-6 text-slate-700">
                  Institutional-format equity research export built from the dashboard report content.
                </div>
              </div>
              <div className="w-64 shrink-0 rounded-sm border border-slate-300 bg-slate-50 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Rating Snapshot
                </div>
                <div className={`mt-3 inline-flex rounded-sm px-3 py-1.5 text-sm font-semibold ${getRecommendationColor(report.recommendation)}`}>
                  {report.recommendation.toUpperCase()}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Current</div>
                    <div className="mt-1 font-semibold">${report.currentPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Target</div>
                    <div className="mt-1 font-semibold">${report.targetPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Upside</div>
                    <div className={`mt-1 font-semibold ${report.impliedUpside >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {(report.impliedUpside * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Horizon</div>
                    <div className="mt-1 font-semibold">{report.timeHorizon}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-4 gap-4 border-t border-slate-200 pt-5 text-[11px]">
              <div>
                <div className="uppercase tracking-[0.16em] text-slate-500">Sector</div>
                <div className="mt-1 font-medium text-slate-900">{report.sector}</div>
              </div>
              <div>
                <div className="uppercase tracking-[0.16em] text-slate-500">Industry</div>
                <div className="mt-1 font-medium text-slate-900">{report.industry}</div>
              </div>
              <div>
                <div className="uppercase tracking-[0.16em] text-slate-500">Coverage</div>
                <div className="mt-1 font-medium capitalize text-slate-900">{report.coverageStatus}</div>
              </div>
              <div>
                <div className="uppercase tracking-[0.16em] text-slate-500">Report Date</div>
                <div className="mt-1 font-medium text-slate-900">
                  {new Date(report.reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </div>
            <div className="mt-4 text-[11px] text-slate-600">Analysts: {report.analysts.join(', ')}</div>
          </header>

          <PdfSection number="1" title="Executive Summary">
            <div className="grid grid-cols-[1.2fr_0.8fr] gap-8">
              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
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
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Driver</div>
                        <PdfMarkdown content={bullet.driver || '—'} />
                      </div>
                      <div className="mt-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Market Mispricing</div>
                        <PdfMarkdown content={bullet.mispricing || '—'} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="border border-slate-300 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Key Metrics</div>
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
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Coverage Note</div>
                  <p className="mt-3 text-[11.5px] leading-6 text-slate-800">
                    {report.companyName} is rated <span className="font-semibold">{report.recommendation.toUpperCase()}</span> with a
                    target price of <span className="font-semibold">${report.targetPrice.toFixed(2)}</span>, implying
                    {' '}<span className="font-semibold">{(report.impliedUpside * 100).toFixed(1)}%</span> upside to the
                    current price.
                  </p>
                </div>
              </aside>
            </div>
          </PdfSection>

          <PdfSection number="2" title="Company Snapshot & Price Performance" pageBreak>
            <div className="grid grid-cols-3 gap-x-6 gap-y-4 border border-slate-300 p-5 text-[11px]">
              {report.priceDate && (
                <div>
                  <div className="uppercase tracking-[0.16em] text-slate-500">Date of Price</div>
                  <div className="mt-1 font-medium text-slate-900">{report.priceDate}</div>
                </div>
              )}
              {report.fiftyTwoWeekRange && (
                <div>
                  <div className="uppercase tracking-[0.16em] text-slate-500">52-Week Range</div>
                  <div className="mt-1 font-medium text-slate-900">{report.fiftyTwoWeekRange}</div>
                </div>
              )}
              {report.marketCap != null && (
                <div>
                  <div className="uppercase tracking-[0.16em] text-slate-500">Market Cap</div>
                  <div className="mt-1 font-medium text-slate-900">${report.marketCap.toLocaleString()} mn</div>
                </div>
              )}
              {report.sharesOutstanding != null && (
                <div>
                  <div className="uppercase tracking-[0.16em] text-slate-500">Shares O/S</div>
                  <div className="mt-1 font-medium text-slate-900">{report.sharesOutstanding.toLocaleString()} mn</div>
                </div>
              )}
              {report.fiscalYearEnd && (
                <div>
                  <div className="uppercase tracking-[0.16em] text-slate-500">Fiscal Year End</div>
                  <div className="mt-1 font-medium text-slate-900">{report.fiscalYearEnd}</div>
                </div>
              )}
              {report.priceTargetEndDate && (
                <div>
                  <div className="uppercase tracking-[0.16em] text-slate-500">Price Target End Date</div>
                  <div className="mt-1 font-medium text-slate-900">{report.priceTargetEndDate}</div>
                </div>
              )}
              {(report.peRatio != null || report.dcfInputs?.peRatio != null) && (
                <div>
                  <div className="uppercase tracking-[0.16em] text-slate-500">P/E</div>
                  <div className="mt-1 font-medium text-slate-900">{(report.peRatio ?? report.dcfInputs?.peRatio).toFixed(2)}x</div>
                </div>
              )}
              {(report.forwardPE != null || report.dcfInputs?.forwardPE != null) && (
                <div>
                  <div className="uppercase tracking-[0.16em] text-slate-500">Forward P/E</div>
                  <div className="mt-1 font-medium text-slate-900">{(report.forwardPE ?? report.dcfInputs?.forwardPE).toFixed(2)}x</div>
                </div>
              )}
              {report.dividendYield != null && (
                <div>
                  <div className="uppercase tracking-[0.16em] text-slate-500">Dividend Yield</div>
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
                        <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[10px] uppercase tracking-[0.16em]">Event</th>
                        <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[10px] uppercase tracking-[0.16em]">Timeframe</th>
                        <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[10px] uppercase tracking-[0.16em]">Probability</th>
                        <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[10px] uppercase tracking-[0.16em]">Mechanism</th>
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
                        <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[10px] uppercase tracking-[0.16em]">Event</th>
                        <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[10px] uppercase tracking-[0.16em]">Timeframe</th>
                        <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[10px] uppercase tracking-[0.16em]">Probability</th>
                        <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[10px] uppercase tracking-[0.16em]">Mechanism</th>
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
                            <th key={heading} className="border border-slate-300 bg-slate-100 px-2 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
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
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Important Disclosures</div>
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

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.55in;
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

          .pdf-export-root {
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .pdf-export-root .page-break {
            break-before: page;
            page-break-before: always;
          }

          .pdf-export-root .print-card {
            box-shadow: none !important;
            border-color: #d1d5db !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className={`${isPdfMode ? 'pdf-export-root max-w-[8.5in] mx-auto space-y-5 pb-10' : 'max-w-5xl mx-auto space-y-6 pb-12'}`}>
        {!isPdfMode && (
          <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow sticky top-0 z-10">
            <Link href="/dashboard/research">
              <Button variant="outline" className="text-gray-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Reports
              </Button>
            </Link>
            <div className="flex gap-2">
              <Link href={`/dashboard/research/${report.id}/edit`}>
                <Button className="bg-blue-600 text-white hover:bg-blue-700">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Report
                </Button>
              </Link>
              <Button
                onClick={handleExportPDF}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to PDF
              </Button>
              <Button
                onClick={handlePrintReport}
                className="bg-gray-600 text-white hover:bg-gray-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Report
              </Button>
            </div>
          </div>
        )}

        {isPdfMode && (
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-4 print-card">
            <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
              <div>
                <div className="font-semibold text-slate-900">St. George Capital Research Export</div>
                <div>Prepared from dashboard report content for clean PDF output</div>
              </div>
              <div className="text-right">
                <div>{new Date(report.reportDate).toLocaleDateString()}</div>
                <div>{report.analysts.join(', ')}</div>
              </div>
            </div>
          </div>
        )}

      {/* Cover Page */}
      <Card className="print-card bg-gradient-to-br from-blue-900 to-blue-700 text-white">
        <CardContent className="p-12">
          <div className="text-center space-y-6">
            <div className="text-sm uppercase tracking-wide opacity-80">
              St. George Capital • Equity Research
            </div>
            <h1 className="text-5xl font-bold mb-2">
              {report.companyName}
            </h1>
            <div className="text-2xl font-semibold opacity-90">
              {report.ticker} • {report.exchange}
            </div>
            
            <div className="inline-flex items-center gap-4 bg-white/20 backdrop-blur-sm px-8 py-4 rounded-lg">
              <div className="text-center">
                <div className="text-sm opacity-80">Recommendation</div>
                <div className={`text-2xl font-bold px-4 py-2 rounded mt-1 ${getRecommendationColor(report.recommendation)}`}>
                  {report.recommendation.toUpperCase()}
                </div>
              </div>
              <div className="w-px h-12 bg-white/30" />
              <div className="text-center">
                <div className="text-sm opacity-80">Target Price</div>
                <div className="text-3xl font-bold">${report.targetPrice.toFixed(2)}</div>
              </div>
              <div className="w-px h-12 bg-white/30" />
              <div className="text-center">
                <div className="text-sm opacity-80">Implied Upside</div>
                <div className={`text-3xl font-bold flex items-center ${report.impliedUpside >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {report.impliedUpside >= 0 ? <TrendingUp className="w-6 h-6 mr-1" /> : <TrendingDown className="w-6 h-6 mr-1" />}
                  {(report.impliedUpside * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="pt-6 text-sm opacity-80">
              <div>{report.sector} • {report.industry}</div>
              <div className="mt-2">Analysts: {report.analysts.join(', ')}</div>
              <div className="mt-1">{new Date(report.reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Snapshot & Price Performance */}
      {(report.priceDate || report.fiftyTwoWeekRange != null || report.marketCap != null || report.sharesOutstanding != null || report.fiscalYearEnd || report.priceTargetEndDate || report.dataSource || (report.performanceMetrics && (report.performanceMetrics as any).absYTD != null) || report.dcfInputs || (report.priceHistory && report.priceHistory.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Company Snapshot & Price Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              {report.priceDate && (
                <div>
                  <div className="text-gray-500">Date of Price</div>
                  <div className="font-semibold">{report.priceDate}</div>
                </div>
              )}
              {report.fiftyTwoWeekRange && (
                <div>
                  <div className="text-gray-500">52-Week Range ($)</div>
                  <div className="font-semibold">{report.fiftyTwoWeekRange}</div>
                </div>
              )}
              {report.marketCap != null && (
                <div>
                  <div className="text-gray-500">Market Cap ($ mn)</div>
                  <div className="font-semibold">{report.marketCap.toLocaleString()}</div>
                </div>
              )}
              {report.fiscalYearEnd && (
                <div>
                  <div className="text-gray-500">Fiscal Year End</div>
                  <div className="font-semibold">{report.fiscalYearEnd}</div>
                </div>
              )}
              {report.sharesOutstanding != null && (
                <div>
                  <div className="text-gray-500">Shares O/S (mn)</div>
                  <div className="font-semibold">{report.sharesOutstanding.toLocaleString()}</div>
                </div>
              )}
              {report.priceTargetEndDate && (
                <div>
                  <div className="text-gray-500">Price Target End Date</div>
                  <div className="font-semibold">{report.priceTargetEndDate}</div>
                </div>
              )}
              {(report.peRatio != null || report.dcfInputs?.peRatio != null) && (
                <div>
                  <div className="text-gray-500">P/E Ratio</div>
                  <div className="font-semibold">{(report.peRatio ?? report.dcfInputs?.peRatio).toFixed(2)}</div>
                </div>
              )}
              {(report.forwardPE != null || report.dcfInputs?.forwardPE != null) && (
                <div>
                  <div className="text-gray-500">Forward P/E (DCF)</div>
                  <div className="font-semibold text-blue-600">{(report.forwardPE ?? report.dcfInputs?.forwardPE).toFixed(2)}</div>
                  <div className="text-xs text-gray-400">Our projection</div>
                </div>
              )}
              {report.forwardPEConsensus != null && (
                <div>
                  <div className="text-gray-500">Forward P/E (Consensus)</div>
                  <div className="font-semibold text-purple-600">{report.forwardPEConsensus.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">Analyst estimates</div>
                </div>
              )}
              {report.dividendYield != null && (
                <div>
                  <div className="text-gray-500">Dividend Yield</div>
                  <div className="font-semibold">{report.dividendYield.toFixed(2)}%</div>
                </div>
              )}
            </div>
            {report.dataSource && (
              <p className="text-xs text-gray-500">Source: {report.dataSource}</p>
            )}
            {(() => {
              const hasEPS = !!report.epsTableMarkdown;
              const hasChart = report.showPriceChart !== false && (
                (report.priceHistory && report.priceHistory.length > 0) ||
                (report.dcfInputs?.priceHistory && report.dcfInputs.priceHistory.length > 0) ||
                !!report.priceChartImageUrl
              );
              const sideBySide = hasEPS && hasChart;
              return (
                <div className={sideBySide ? 'grid grid-cols-2 gap-4 items-stretch' : 'space-y-4'}>
                  {hasEPS && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">EPS (Recurring)</h4>
                      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <div className="prose prose-sm max-w-none [&_table]:w-full [&_table]:border-collapse [&_table]:m-0 [&_th]:bg-gray-50 [&_th]:border-b [&_th]:border-gray-200 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-gray-600 [&_td]:border-b [&_td]:border-gray-100 [&_td]:px-4 [&_td]:py-3 [&_td]:text-sm [&_td]:text-gray-900 [&_tr:last-child_td]:border-b-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                            {report.epsTableMarkdown!}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}
                  {hasChart && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 flex flex-col">
                      <h4 className="font-semibold mb-3 text-gray-800">Price Chart (100 Days)</h4>
                      {report.priceChartImageUrl && !(report.priceHistory && report.priceHistory.length > 0) ? (
                        <img src={report.priceChartImageUrl} alt="Price Chart" className="w-full h-auto rounded" />
                      ) : (
                        <div className="flex-1 min-h-48 relative">
                          <svg viewBox="0 0 800 220" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                            {(() => {
                              const chartData = (report.priceHistory || report.dcfInputs?.priceHistory || []).slice(0, 100);
                              if (!chartData.length) return null;
                              const prices = chartData.map((d: any) => d.close);
                              const maxPrice = Math.max(...prices);
                              const topPad = maxPrice * 0.05;
                              const range = maxPrice + topPad;
                              const points = chartData.map((d: any, i: number) => {
                                const x = (chartData.length > 1 ? i / (chartData.length - 1) : 0) * 760 + 20;
                                const y = 200 - (d.close / range) * 180;
                                return `${x},${y}`;
                              }).join(' ');
                              const areaPoints = `${points} 760,200 20,200`;
                              return (
                                <>
                                  <rect x="20" y="20" width="760" height="180" fill="white" rx="4" />
                                  <line x1="20" y1="200" x2="780" y2="200" stroke="#e5e7eb" strokeWidth="1" />
                                  <line x1="20" y1="20" x2="20" y2="200" stroke="#e5e7eb" strokeWidth="1" />
                                  <polygon points={areaPoints} fill="rgba(59, 130, 246, 0.08)" stroke="none" />
                                  <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  <text x="20" y="215" fontSize="11" fill="#6b7280">{chartData[chartData.length - 1]?.date}</text>
                                  <text x="780" y="215" fontSize="11" fill="#6b7280" textAnchor="end">{chartData[0]?.date}</text>
                                  <text x="20" y="28" fontSize="11" fill="#6b7280" fontWeight="500">${maxPrice.toFixed(2)}</text>
                                  <text x="20" y="208" fontSize="11" fill="#6b7280" fontWeight="500">$0</text>
                                </>
                              );
                            })()}
                          </svg>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b">
            <div>
              <div className="text-sm text-gray-600 mb-1">Current Price</div>
              <div className="text-2xl font-bold">${report.currentPrice.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Price Target</div>
              <div className="text-2xl font-bold text-blue-600">${report.targetPrice.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Coverage Status</div>
              <div className="text-lg font-semibold capitalize">{report.coverageStatus}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Time Horizon</div>
              <div className="text-lg font-semibold">{report.timeHorizon}</div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">Investment Thesis</h3>
            <div className="space-y-4">
              {report.investmentThesis.map((bullet, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r">
                  {bullet.title && (
                    <div className="font-semibold text-gray-900 mb-2 prose prose-sm max-w-none [&_img]:block [&_img]:mx-auto [&_img]:rounded [&_img]:max-w-full">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{bullet.title}</ReactMarkdown>
                    </div>
                  )}
                  <div className="text-gray-700 mb-1 prose prose-sm max-w-none [&_img]:block [&_img]:mx-auto [&_img]:rounded [&_img]:max-w-full">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{bullet.claim}</ReactMarkdown>
                  </div>
                  <div className="text-gray-700 mb-2">
                    <div className="font-semibold text-base text-gray-900 mb-0.5">Driver</div>
                    <div className="prose prose-sm max-w-none mt-0.5 [&_img]:block [&_img]:mx-auto [&_img]:rounded [&_img]:max-w-full">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{bullet.driver || '—'}</ReactMarkdown>
                    </div>
                  </div>
                  <div className="text-gray-700">
                    <div className="font-semibold text-base text-gray-900 mb-0.5">Market Mispricing</div>
                    <div className="prose prose-sm max-w-none mt-0.5 [&_img]:block [&_img]:mx-auto [&_img]:rounded [&_img]:max-w-full">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{bullet.mispricing || '—'}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Model */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Business Model & Economics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">How the Company Makes Money</h3>
            <div className="prose max-w-none text-gray-700
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
              [&_th]:bg-gray-50 [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
              [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
              [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2
              [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2
              [&_strong]:font-semibold [&_img]:block [&_img]:mx-auto [&_img]:rounded [&_img]:max-w-full">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {report.businessModel || 'Not provided'}
              </ReactMarkdown>
            </div>
          </div>
          
          {report.unitEconomics && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Unit Economics</h3>
              <div className="prose max-w-none text-gray-700
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
                [&_th]:bg-gray-50 [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
                [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
                [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2 [&_img]:block [&_img]:mx-auto [&_img]:rounded [&_img]:max-w-full">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {report.unitEconomics}
                </ReactMarkdown>
              </div>
            </div>
          )}
          
          {report.economicMoat && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Economic Moat</h3>
              <div className="prose max-w-none text-gray-700
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
                [&_th]:bg-gray-50 [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
                [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
                [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2 [&_img]:block [&_img]:mx-auto [&_img]:rounded [&_img]:max-w-full">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {report.economicMoat}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Industry Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Industry & Competitive Landscape</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none text-gray-700
            [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
            [&_th]:bg-gray-50 [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
            [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
            [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2 [&_img]:block [&_img]:mx-auto [&_img]:rounded [&_img]:max-w-full">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {report.industryAnalysis || 'Not provided'}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {/* Catalysts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Catalysts & Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {report.catalystsNearTerm.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 text-blue-700">Near-Term Catalysts (0-6 months)</h3>
              <div className="space-y-3">
                {report.catalystsNearTerm.map((catalyst, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-gray-900">{catalyst.event}</div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getProbabilityBadge(catalyst.probability)}`}>
                        {catalyst.probability} probability
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">{catalyst.mechanism}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.catalystsMediumTerm.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 text-indigo-700">Medium-Term Catalysts (6-18 months)</h3>
              <div className="space-y-3">
                {report.catalystsMediumTerm.map((catalyst, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-gray-900">{catalyst.event}</div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getProbabilityBadge(catalyst.probability)}`}>
                        {catalyst.probability} probability
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">{catalyst.mechanism}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Valuation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Valuation Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Comps table */}
          {report.competitivePosition?.rows && report.competitivePosition.rows.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Comparable Companies</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Company','Mkt Cap','EV/Rev','EV/EBITDA','P/E','Fwd P/E','P/S','Rev Growth','EBITDA Margin','Beta'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.competitivePosition.rows.map((row: any, i: number) => (
                      <tr key={row.ticker} className={`border-b border-gray-100 ${row.isSubject ? 'bg-blue-50 font-semibold text-blue-900' : i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                        <td className="px-3 py-2">{row.name}<br/><span className="text-gray-400 font-mono text-[10px]">{row.ticker}</span></td>
                        <td className="px-3 py-2">{row.marketCap != null ? (row.marketCap >= 1000 ? `$${(row.marketCap/1000).toFixed(1)}B` : `$${row.marketCap.toFixed(0)}M`) : '—'}</td>
                        <td className="px-3 py-2">{row.evToRevenue != null ? `${row.evToRevenue.toFixed(1)}x` : '—'}</td>
                        <td className="px-3 py-2">{row.evToEBITDA != null ? `${row.evToEBITDA.toFixed(1)}x` : '—'}</td>
                        <td className="px-3 py-2">{row.peTrailing != null ? `${row.peTrailing.toFixed(1)}x` : '—'}</td>
                        <td className="px-3 py-2">{row.peForward != null ? `${row.peForward.toFixed(1)}x` : '—'}</td>
                        <td className="px-3 py-2">{row.priceToSales != null ? `${row.priceToSales.toFixed(1)}x` : '—'}</td>
                        <td className="px-3 py-2">{row.revenueGrowthYoY != null ? `${(row.revenueGrowthYoY*100).toFixed(1)}%` : '—'}</td>
                        <td className="px-3 py-2">{row.ebitdaMargin != null ? `${(row.ebitdaMargin*100).toFixed(1)}%` : '—'}</td>
                        <td className="px-3 py-2">{row.beta != null ? row.beta.toFixed(2) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <InstitutionalValuationSection
            dcfData={report.dcfInputs && report.dcfOutputs ? {
              inputs: report.dcfInputs as any,
              outputs: report.dcfOutputs as any,
              companyName: report.companyName
            } : null}
            valuationText={report.valuationAnalysis || 'Not provided'}
          />
        </CardContent>
      </Card>

      {/* Bull & Bear Cases */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Bull & Bear Cases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {(report.bullCase != null && report.bullCase !== '') && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Bull Case</h3>
              <div className="prose max-w-none text-gray-700 border-l-4 border-green-500 pl-4 py-2 bg-green-50
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
                [&_th]:bg-green-100 [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
                [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
                [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2 [&_img]:block [&_img]:mx-auto [&_img]:rounded [&_img]:max-w-full">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {report.bullCase}
                </ReactMarkdown>
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-lg mb-3">Bear Case Scenario</h3>
            <div className="prose max-w-none text-gray-700 border-l-4 border-red-500 pl-4 py-2 bg-red-50
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
              [&_th]:bg-red-100 [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
              [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
              [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2 [&_img]:block [&_img]:mx-auto [&_img]:rounded [&_img]:max-w-full">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {report.bearCase || 'Not provided'}
              </ReactMarkdown>
            </div>
          </div>

          {(report.bullBearJustification != null && report.bullBearJustification !== '') && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Justification</h3>
              <div className="prose max-w-none text-gray-700 bg-gray-50 border rounded-lg p-4
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
                [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {report.bullBearJustification}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Risks */}
      {report.keyRisks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Key Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.keyRisks.map((risk, index) => (
                <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-gray-900">{risk.title}</div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getImpactBadge(risk.impact)}`}>
                      {risk.impact} impact
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 mb-2">{risk.description}</div>
                  {risk.mitigation && (
                    <div className="text-sm text-gray-600 italic">
                      <span className="font-medium">Mitigation:</span> {risk.mitigation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Strategies (if provided) */}
      {report.aiStrategies != null && report.aiStrategies !== '' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">AI & Data Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none text-gray-700
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
              [&_th]:bg-gray-50 [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
              [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
              [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2 [&_img]:block [&_img]:mx-auto [&_img]:rounded [&_img]:max-w-full">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {report.aiStrategies}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ESG (if provided) */}
      {report.esgFactors && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">ESG & Governance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none text-gray-700
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
              [&_th]:bg-gray-50 [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
              [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
              [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2 [&_img]:block [&_img]:mx-auto [&_img]:rounded [&_img]:max-w-full">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {report.esgFactors}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conclusion (if provided) */}
      {report.concludingSection != null && report.concludingSection !== '' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Conclusion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none text-gray-700
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
              [&_th]:bg-gray-50 [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
              [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
              [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2
              [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2 [&_img]:block [&_img]:mx-auto [&_img]:rounded [&_img]:max-w-full">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {report.concludingSection}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclosures */}
      <Card className="bg-gray-50 border-2 border-gray-300">
        <CardContent className="pt-6">
          <h3 className="font-bold text-sm mb-2">IMPORTANT DISCLOSURES</h3>
          <p className="text-xs text-gray-700">
            This report has been prepared by St. George Capital for educational purposes only. 
            It does not constitute investment advice or a solicitation to buy or sell securities. 
            St. George Capital and its members may hold positions in the securities discussed. 
            Past performance does not guarantee future results. Investors should conduct their own 
            due diligence and consult with qualified financial advisors before making investment decisions.
          </p>
          <div className="mt-3 pt-3 border-t border-gray-300 text-xs text-gray-600">
            Report Status: <span className="font-semibold capitalize">{report.status}</span>
            {report.published && <span className="ml-2 text-green-600">• Published</span>}
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
