import { notFound } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const prisma = new PrismaClient();

async function getPublishedReport(ticker: string) {
  const report = await prisma.equityResearchReport.findFirst({
    where: {
      ticker: ticker.toUpperCase(),
      published: true,
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
              <div className="max-w-7xl mx-auto px-6 py-4">
                <Link href="/equity-research" className="inline-flex items-center text-white/80 hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Research
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
          <div className="prose prose-sm max-w-none text-gray-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {report.businessModel}
            </ReactMarkdown>
          </div>
          {report.unitEconomics && (
            <>
              <h3 className="font-semibold text-xl text-gray-900">Unit Economics</h3>
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {report.unitEconomics}
                </ReactMarkdown>
              </div>
            </>
          )}
          {report.economicMoat && (
            <>
              <h3 className="font-semibold text-xl text-gray-900">Economic Moat</h3>
              <div className="prose prose-sm max-w-none text-gray-700">
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
          <div className="prose prose-sm max-w-none text-gray-700">
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
          <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-6 rounded-lg">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {report.valuationAnalysis}
            </ReactMarkdown>
          </div>
        </div>

        {/* Risks */}
        <div className="bg-white rounded-2xl p-8 space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">Risks & Bear Case</h2>
          
          {risks.length > 0 && (
            <div>
              <h3 className="font-semibold text-xl mb-4 text-gray-900">Key Risks</h3>
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

          <div>
            <h3 className="font-semibold text-xl mb-4 text-gray-900">Bear Case Scenario</h3>
            <div className="prose prose-sm max-w-none text-gray-700 border-l-4 border-red-500 pl-4 py-3 bg-red-50 rounded-r">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report.bearCase}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* ESG */}
        {report.esgFactors && (
          <div className="bg-white rounded-2xl p-8 space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">ESG & Governance</h2>
            <div className="prose prose-sm max-w-none text-gray-700">
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
