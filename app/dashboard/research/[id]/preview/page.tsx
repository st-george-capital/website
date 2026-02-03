'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { ArrowLeft, Download, Edit, Eye, TrendingUp, TrendingDown, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  priceHistory?: Array<{ date: string; close: number }> | null;
  dcfInputs?: any;
  dcfOutputs?: any;
  investmentThesis: Array<{
    claim: string;
    driver: string;
    mispricing: string;
  }>;
  businessModel: string;
  unitEconomics?: string;
  economicMoat?: string;
  industryAnalysis: string;
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

export default function ResearchReportPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchReport(params.id as string);
    }
  }, [params.id]);

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
    // Add print styles
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        @page { margin: 0.5in; size: letter; }
        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        .no-print { display: none !important; }
        .page-break { page-break-before: always; }
        nav, button { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    
    // Trigger print dialog (user can save as PDF)
    window.print();
    
    // Clean up
    setTimeout(() => document.head.removeChild(style), 1000);
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Actions */}
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
            onClick={handleExportPDF}
            className="bg-gray-600 text-white hover:bg-gray-700"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Cover Page */}
      <Card className="bg-gradient-to-br from-blue-900 to-blue-700 text-white">
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
            {report.performanceMetrics && typeof (report.performanceMetrics as any).absYTD === 'number' && (
              <div className="overflow-x-auto">
                <h4 className="font-semibold mb-2">Price Performance</h4>
                <table className="w-full border text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border px-3 py-2 text-left"></th>
                      <th className="border px-3 py-2 text-left">YTD</th>
                      <th className="border px-3 py-2 text-left">1m</th>
                      <th className="border px-3 py-2 text-left">3m</th>
                      <th className="border px-3 py-2 text-left">12m</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border px-3 py-2 font-medium">Abs</td>
                      {(['absYTD', 'abs1m', 'abs3m', 'abs12m'] as const).map((key) => (
                        <td key={key} className="border px-3 py-2">
                          {(report.performanceMetrics as any)[key] != null ? `${(report.performanceMetrics as any)[key]}%` : '—'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border px-3 py-2 font-medium">Rel</td>
                      {(['relYTD', 'rel1m', 'rel3m', 'rel12m'] as const).map((key) => (
                        <td key={key} className="border px-3 py-2">
                          {(report.performanceMetrics as any)[key] != null ? `${(report.performanceMetrics as any)[key]}%` : '—'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            {report.epsTableMarkdown && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">EPS (Recurring)</h4>
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="prose prose-sm max-w-none [&_table]:w-full [&_table]:border-collapse [&_table]:m-0 [&_th]:bg-gray-50 [&_th]:border-b [&_th]:border-gray-200 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-gray-600 [&_td]:border-b [&_td]:border-gray-100 [&_td]:px-4 [&_td]:py-3 [&_td]:text-sm [&_td]:text-gray-900 [&_tr:last-child_td]:border-b-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {report.epsTableMarkdown}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
            {((report.priceHistory && report.priceHistory.length > 0) || (report.dcfInputs?.priceHistory && report.dcfInputs.priceHistory.length > 0)) && (
              <div>
                <h4 className="font-semibold mb-2">Price Chart (1 Year)</h4>
                <div className="w-full h-64 relative">
                  <svg viewBox="0 0 800 200" className="w-full h-full">
                    {(() => {
                      const chartData = (report.priceHistory || report.dcfInputs?.priceHistory || []).slice(0, 252); // ~1 year of trading days
                      if (!chartData.length) return null;
                      const prices = chartData.map((d: any) => d.close);
                      const minPrice = Math.min(...prices);
                      const maxPrice = Math.max(...prices);
                      const priceRange = maxPrice - minPrice;
                      const padding = priceRange * 0.1;
                      
                      const points = chartData.map((d: any, i: number) => {
                        const x = (chartData.length > 1 ? i / (chartData.length - 1) : 0) * 780 + 10;
                        const y = 190 - ((d.close - minPrice + padding) / (priceRange + 2 * padding)) * 180;
                        return `${x},${y}`;
                      }).join(' ');
                      
                      return (
                        <>
                          <polyline
                            points={points}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                          />
                          <line x1="10" y1="190" x2="790" y2="190" stroke="#e5e7eb" strokeWidth="1" />
                          <text x="10" y="205" fontSize="12" fill="#6b7280">{chartData[chartData.length - 1]?.date}</text>
                          <text x="790" y="205" fontSize="12" fill="#6b7280" textAnchor="end">{chartData[0]?.date}</text>
                          <text x="10" y="15" fontSize="12" fill="#6b7280">${maxPrice.toFixed(2)}</text>
                          <text x="10" y="195" fontSize="12" fill="#6b7280">${minPrice.toFixed(2)}</text>
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            )}
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
                  <div className="font-semibold text-gray-900 mb-2">{bullet.claim}</div>
                  <div className="text-sm text-gray-700 mb-1">
                    <span className="font-medium">Driver:</span> {bullet.driver}
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Market Mispricing:</span> {bullet.mispricing}
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
              [&_strong]:font-semibold">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
            [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
        <CardContent>
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
                [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
              [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
              [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
              [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report.esgFactors}
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
  );
}
