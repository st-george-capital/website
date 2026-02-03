import { prisma } from '@/lib/prisma';
import { Hero } from '@/components/hero';
import { Section } from '@/components/section';
import { Card, CardContent } from '@/components/card';
import Link from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getPublishedEquityReports() {
  const reports = await prisma.equityResearchReport.findMany({
    where: {
      published: true,
    },
    orderBy: { publishedAt: 'desc' },
  });
  return reports;
}

export default async function EquityResearchPage() {
  const reports = await getPublishedEquityReports();

  return (
    <>
      <Hero
        title="Equity Research"
        breadcrumb="What We Do / Equity Research"
        height="small"
        align="left"
      />

      <Section className="!py-12 !md:py-16">
        <div className="grid md:grid-cols-2 gap-20 items-start">
          <div>
            <h2 className="font-serif text-5xl md:text-6xl font-bold">
              Evaluating Companies
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-lg text-gray-600 leading-relaxed">
              Our equity research analyzes individual companies through rigorous financial modeling and competitive analysis. We evaluate business models, competitive positioning, and intrinsic value to identify market opportunities.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Each report combines quantitative DCF valuation with qualitative assessment of management quality, industry dynamics, and sustainable competitive advantages.
            </p>
          </div>
        </div>
      </Section>

      <Section dark className="!py-12 !md:py-16">
        <div className="max-w-7xl mx-auto">
          {reports.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="text-center py-12">
                <h3 className="font-serif text-2xl font-bold mb-3">No Reports Published Yet</h3>
                <p className="text-gray-600">
                  Check back soon for our latest equity research coverage.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {reports.map((report) => (
                <Link key={report.id} href={`/equity-research/${report.ticker}`}>
                  <Card className="h-full hover:shadow-xl transition-shadow cursor-pointer bg-white">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-serif text-xl font-bold mb-1">
                            {report.companyName}
                          </h3>
                          <p className="text-sm text-gray-600">{report.ticker} • {report.exchange}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          report.recommendation === 'buy' ? 'bg-green-100 text-green-800' :
                          report.recommendation === 'sell' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {report.recommendation.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4 pt-4 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Target Price:</span>
                          <span className="font-semibold">${report.targetPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Current:</span>
                          <span className="font-semibold">${report.currentPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Upside:</span>
                          <span className={`font-semibold ${report.impliedUpside >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(report.impliedUpside * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(report.reportDate).toLocaleDateString()}
                        </div>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{report.sector}</span>
                      </div>

                      <div className="flex items-center text-primary font-medium mt-4">
                        Read Report
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
