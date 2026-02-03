'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { ArrowLeft, Download, Edit, Eye, TrendingUp, TrendingDown } from 'lucide-react';

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
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/dashboard/research/${report.id}`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit Report
            </Button>
          </Link>
          <Button variant="outline" disabled>
            <Download className="w-4 h-4 mr-2" />
            Export PDF (Coming Soon)
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
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
              {report.businessModel || 'Not provided'}
            </div>
          </div>
          
          {report.unitEconomics && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Unit Economics</h3>
              <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                {report.unitEconomics}
              </div>
            </div>
          )}
          
          {report.economicMoat && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Economic Moat</h3>
              <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                {report.economicMoat}
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
          <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
            {report.industryAnalysis || 'Not provided'}
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
          <div className="prose max-w-none text-gray-700 whitespace-pre-wrap font-mono text-sm">
            {report.valuationAnalysis || 'Not provided'}
          </div>
        </CardContent>
      </Card>

      {/* Risks & Bear Case */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Risks & Bear Case</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {report.keyRisks.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Key Risks</h3>
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
            </div>
          )}

          <div>
            <h3 className="font-semibold text-lg mb-3">Bear Case Scenario</h3>
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap border-l-4 border-red-500 pl-4 py-2 bg-red-50">
              {report.bearCase || 'Not provided'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ESG (if provided) */}
      {report.esgFactors && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">ESG & Governance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
              {report.esgFactors}
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
