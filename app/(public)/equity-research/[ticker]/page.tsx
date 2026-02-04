import { notFound } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { InstitutionalValuationSection } from '@/components/InstitutionalValuationSection';

const prisma = new PrismaClient();

async function getPublishedReport(ticker: string) {
  const report = await prisma.equityResearchReport.findFirst({
    where: {
      ticker: ticker.toUpperCase(),
      published: true,
      showOnWebsite: true,
    },
    orderBy: {
      publishedAt: 'desc',
    },
  });

  return report;
}

export default async function PublicResearchReportPage({
  params,
}: {
  params: { ticker: string };
}) {
  const report = await getPublishedReport(params.ticker);

  if (!report) {
    notFound();
  }

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

  const thesis = report.investmentThesis as any[];
  const catalystsNear = report.catalystsNearTerm as any[];
  const catalystsMedium = report.catalystsMediumTerm as any[];
  const risks = report.keyRisks as any[];

  return (
    <div className="min-h-screen bg-[#030116]">
      {/* Navigation */}
            <nav className="border-b border-white/10 bg-[#030116]/95 backdrop-blur-sm sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <Link href="/equity-research" className="inline-flex items-center text-white/80 hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Equity Research
                </Link>
              </div>
            </nav>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        {/* Cover Section */}
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl p-12 text-white">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm opacity-80">
              <span className="uppercase tracking-wide">St. George Capital • Equity Research</span>
            </div>
            
            <h1 className="text-5xl font-bold">
              {report.companyName}
            </h1>
            
            <div className="text-2xl font-semibold opacity-90">
              {report.ticker} • {report.exchange}
            </div>
            
            <div className="flex items-center gap-6 pt-4">
              <div className="text-center">
                <div className="text-sm opacity-80 mb-1">Recommendation</div>
                <div className={`text-xl font-bold px-6 py-3 rounded-lg ${getRecommendationColor(report.recommendation)}`}>
                  {report.recommendation.toUpperCase()}
                </div>
              </div>
              
              <div className="w-px h-16 bg-white/30" />
              
              <div className="text-center">
                <div className="text-sm opacity-80 mb-1">Target Price</div>
                <div className="text-4xl font-bold">${report.targetPrice.toFixed(2)}</div>
              </div>
              
              <div className="w-px h-16 bg-white/30" />
              
              <div className="text-center">
                <div className="text-sm opacity-80 mb-1">Implied Upside</div>
                <div className={`text-4xl font-bold flex items-center ${report.impliedUpside >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {report.impliedUpside >= 0 ? <TrendingUp className="w-8 h-8 mr-2" /> : <TrendingDown className="w-8 h-8 mr-2" />}
                  {(report.impliedUpside * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-6 text-sm border-t border-white/20">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(report.reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {report.analysts.join(', ')}
              </div>
              <div>
                {report.sector} • {report.industry}
              </div>
            </div>
          </div>
        </div>

        {/* Company Snapshot & Price Performance */}
        {(report.priceDate || report.fiftyTwoWeekRange || report.marketCap != null || report.sharesOutstanding != null || report.fiscalYearEnd || report.priceTargetEndDate || report.dataSource || (report.performanceMetrics as any)?.absYTD != null || report.dcfInputs || ((report as any).priceHistory && (report as any).priceHistory.length > 0)) && (
          <div className="bg-white rounded-2xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Company Snapshot & Price Performance</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              {report.priceDate && (
                <div>
                  <div className="text-gray-500">Date of Price</div>
                  <div className="font-semibold text-gray-900">{report.priceDate}</div>
                </div>
              )}
              {report.fiftyTwoWeekRange && (
                <div>
                  <div className="text-gray-500">52-Week Range ($)</div>
                  <div className="font-semibold text-gray-900">{report.fiftyTwoWeekRange}</div>
                </div>
              )}
              {report.marketCap != null && (
                <div>
                  <div className="text-gray-500">Market Cap ($ mn)</div>
                  <div className="font-semibold text-gray-900">{report.marketCap.toLocaleString()}</div>
                </div>
              )}
              {report.fiscalYearEnd && (
                <div>
                  <div className="text-gray-500">Fiscal Year End</div>
                  <div className="font-semibold text-gray-900">{report.fiscalYearEnd}</div>
                </div>
              )}
              {report.sharesOutstanding != null && (
                <div>
                  <div className="text-gray-500">Shares O/S (mn)</div>
                  <div className="font-semibold text-gray-900">{report.sharesOutstanding.toLocaleString()}</div>
                </div>
              )}
              {report.priceTargetEndDate && (
                <div>
                  <div className="text-gray-500">Price Target End Date</div>
                  <div className="font-semibold text-gray-900">{report.priceTargetEndDate}</div>
                </div>
              )}
              {((report as any).peRatio != null || (report.dcfInputs as any)?.peRatio != null) && (
                <div>
                  <div className="text-gray-500">P/E Ratio</div>
                  <div className="font-semibold text-gray-900">{((report as any).peRatio ?? (report.dcfInputs as any)?.peRatio).toFixed(2)}</div>
                </div>
              )}
              {((report as any).forwardPE != null || (report.dcfInputs as any)?.forwardPE != null) && (
                <div>
                  <div className="text-gray-500">Forward P/E (DCF)</div>
                  <div className="font-semibold text-blue-600">{((report as any).forwardPE ?? (report.dcfInputs as any)?.forwardPE).toFixed(2)}</div>
                  <div className="text-xs text-gray-400">Our projection</div>
                </div>
              )}
              {(report as any).forwardPEConsensus != null && (
                <div>
                  <div className="text-gray-500">Forward P/E (Consensus)</div>
                  <div className="font-semibold text-purple-600">{(report as any).forwardPEConsensus.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">Analyst estimates</div>
                </div>
              )}
              {(report as any).dividendYield != null && (
                <div>
                  <div className="text-gray-500">Dividend Yield</div>
                  <div className="font-semibold text-gray-900">{(report as any).dividendYield.toFixed(2)}%</div>
                </div>
              )}
            </div>
            {report.dataSource && (
              <p className="text-sm text-gray-500">Source: {report.dataSource}</p>
            )}
            {report.performanceMetrics && (report.performanceMetrics as any).absYTD != null && (
              <div className="overflow-x-auto">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Price Performance</h3>
                <table className="w-full border text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border px-3 py-2 text-left"> </th>
                      <th className="border px-3 py-2 text-left">YTD</th>
                      <th className="border px-3 py-2 text-left">1m</th>
                      <th className="border px-3 py-2 text-left">3m</th>
                      <th className="border px-3 py-2 text-left">12m</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border px-3 py-2 font-medium">Abs</td>
                      {['absYTD', 'abs1m', 'abs3m', 'abs12m'].map((key) => (
                        <td key={key} className="border px-3 py-2">
                          {(report.performanceMetrics as any)[key] != null ? `${(report.performanceMetrics as any)[key]}%` : '—'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border px-3 py-2 font-medium">Rel</td>
                      {['relYTD', 'rel1m', 'rel3m', 'rel12m'].map((key) => (
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
                <h3 className="font-semibold text-lg text-gray-900 mb-2">EPS (Recurring)</h3>
                <div className="prose prose-sm max-w-none text-gray-700
                  [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:px-2 [&_td]:px-2 [&_th]:py-1 [&_td]:py-1 [&_th]:bg-gray-50">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {report.epsTableMarkdown}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            {(((report as any).priceHistory && (report as any).priceHistory.length > 0) || ((report.dcfInputs as any)?.priceHistory && (report.dcfInputs as any).priceHistory.length > 0) || (report as any).priceChartImageUrl) && (
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Price Chart (1 Year)</h3>
                {(report as any).priceChartImageUrl && !((report as any).priceHistory && (report as any).priceHistory.length > 0) ? (
                  <div className="w-full">
                    <img src={(report as any).priceChartImageUrl} alt="Price Chart" className="w-full h-auto border rounded" />
                  </div>
                ) : (
                <div className="w-full h-64 relative">
                  <svg viewBox="0 0 800 200" className="w-full h-full">
                    {(() => {
                      const chartData = ((report as any).priceHistory || (report.dcfInputs as any)?.priceHistory || []).slice(0, 252); // ~1 year of trading days
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
                )}
              </div>
            )}
          </div>
        )}

        {/* Executive Summary */}
        <div className="bg-white rounded-2xl p-8 space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">Executive Summary</h2>
          
          <div className="grid grid-cols-2 gap-6 pb-6 border-b">
            <div>
              <div className="text-sm text-gray-600 mb-1">Current Price</div>
              <div className="text-2xl font-bold">${report.currentPrice.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Price Target</div>
              <div className="text-2xl font-bold text-blue-600">${report.targetPrice.toFixed(2)}</div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-xl mb-4 text-gray-900">Investment Thesis</h3>
            <div className="space-y-4">
              {thesis.map((bullet: any, index: number) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50 rounded-r">
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
        </div>

        {/* Business Model */}
        <div className="bg-white rounded-2xl p-8 space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">Business Model & Economics</h2>
          <div className="prose max-w-none text-gray-700
            [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
            [&_th]:bg-gray-50 [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
            [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
            [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {report.businessModel}
            </ReactMarkdown>
          </div>
          {report.unitEconomics && (
            <>
              <h3 className="font-semibold text-xl text-gray-900">Unit Economics</h3>
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
            </>
          )}
          {report.economicMoat && (
            <>
              <h3 className="font-semibold text-xl text-gray-900">Economic Moat</h3>
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
            </>
          )}
        </div>

        {/* Industry Analysis */}
        <div className="bg-white rounded-2xl p-8 space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">Industry & Competitive Landscape</h2>
          <div className="prose max-w-none text-gray-700
            [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
            [&_th]:bg-gray-50 [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
            [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
            [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {report.industryAnalysis}
            </ReactMarkdown>
          </div>
        </div>

        {/* Catalysts */}
        {(catalystsNear.length > 0 || catalystsMedium.length > 0) && (
          <div className="bg-white rounded-2xl p-8 space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Catalysts & Timeline</h2>
            
            {catalystsNear.length > 0 && (
              <div>
                <h3 className="font-semibold text-xl mb-4 text-blue-700">Near-Term Catalysts (0-6 months)</h3>
                <div className="space-y-3">
                  {catalystsNear.map((catalyst: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-gray-900">{catalyst.event}</div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getProbabilityBadge(catalyst.probability)}`}>
                          {catalyst.probability}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">{catalyst.mechanism}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {catalystsMedium.length > 0 && (
              <div>
                <h3 className="font-semibold text-xl mb-4 text-indigo-700">Medium-Term Catalysts (6-18 months)</h3>
                <div className="space-y-3">
                  {catalystsMedium.map((catalyst: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-gray-900">{catalyst.event}</div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getProbabilityBadge(catalyst.probability)}`}>
                          {catalyst.probability}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">{catalyst.mechanism}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Valuation */}
        <div className="bg-white rounded-2xl p-8 space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">Valuation Analysis</h2>
          <InstitutionalValuationSection
            dcfData={report.dcfInputs && report.dcfOutputs ? {
              inputs: report.dcfInputs as any,
              outputs: report.dcfOutputs as any,
              companyName: report.companyName
            } : null}
            valuationText={report.valuationAnalysis}
          />
        </div>

        {/* Bull & Bear Cases */}
        <div className="bg-white rounded-2xl p-8 space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">Bull & Bear Cases</h2>
          
          {report.bullCase && (
            <div>
              <h3 className="font-semibold text-xl mb-4 text-gray-900">Bull Case</h3>
              <div className="prose max-w-none text-gray-700 border-l-4 border-green-500 pl-4 py-3 bg-green-50 rounded-r
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
            <h3 className="font-semibold text-xl mb-4 text-gray-900">Bear Case Scenario</h3>
            <div className="prose max-w-none text-gray-700 border-l-4 border-red-500 pl-4 py-3 bg-red-50 rounded-r
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
              [&_th]:bg-red-100 [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
              [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
              [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report.bearCase}
              </ReactMarkdown>
            </div>
          </div>

          {report.bullBearJustification && (
            <div>
              <h3 className="font-semibold text-xl mb-4 text-gray-900">Justification</h3>
              <div className="prose max-w-none text-gray-700 bg-gray-50 border rounded-lg p-4
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
                [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {report.bullBearJustification}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Key Risks */}
        {risks.length > 0 && (
          <div className="bg-white rounded-2xl p-8 space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Key Risks</h2>
            <div className="space-y-3">
              {risks.map((risk: any, index: number) => (
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
          </div>
        )}

        {/* AI Strategies */}
        {report.aiStrategies && (
          <div className="bg-white rounded-2xl p-8 space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">AI & Data Strategy</h2>
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
          </div>
        )}

        {/* ESG */}
        {report.esgFactors && (
          <div className="bg-white rounded-2xl p-8 space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">ESG & Governance</h2>
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
          </div>
        )}

        {/* Disclosures */}
        <div className="bg-gray-900 rounded-2xl p-8 text-white">
          <h3 className="font-bold text-sm mb-3 uppercase tracking-wide">Important Disclosures</h3>
          <p className="text-sm text-white/80 leading-relaxed">
            This report has been prepared by St. George Capital for educational purposes only. 
            It does not constitute investment advice or a solicitation to buy or sell securities. 
            St. George Capital and its members may hold positions in the securities discussed. 
            Past performance does not guarantee future results. Investors should conduct their own 
            due diligence and consult with qualified financial advisors before making investment decisions.
          </p>
          <div className="mt-4 pt-4 border-t border-white/20 text-xs text-white/60">
            Published: {report.publishedAt ? new Date(report.publishedAt).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
