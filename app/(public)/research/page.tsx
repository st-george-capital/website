import { prisma } from '@/lib/prisma';
import { Hero } from '@/components/hero';
import { Section } from '@/components/section';
import { Card, CardContent } from '@/components/card';
import Link from 'next/link';
import { Calendar, User, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getPublishedArticles() {
  const articles = await prisma.article.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
  });
  return articles;
}

async function getWebsiteEquityReports() {
  const reports = await prisma.equityResearchReport.findMany({
    where: {
      published: true,
      showOnWebsite: true,
    },
    orderBy: { publishedAt: 'desc' },
  });
  return reports;
}

export default async function ResearchPage() {
  const articles = await getPublishedArticles();
  const equityReports = await getWebsiteEquityReports();

  return (
    <>
      <Hero
        title="Research"
        subtitle="Insights from our Equity & Macro Research division"
        breadcrumb="Research"
        height="small"
        align="left"
      />

      <Section className="!py-16">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Equity Research Reports Section */}
          {equityReports.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Equity Research Reports</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {equityReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/equity-research/${report.ticker}`}
                    className="group"
                  >
                    <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-500">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold group-hover:text-blue-600 transition-colors">
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
                        
                        <div className="space-y-2 mb-4">
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

                        <div className="text-xs text-gray-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(report.reportDate).toLocaleDateString()}
                        </div>

                        <div className="mt-4 flex items-center text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                          Read Report
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Articles Section */}
          <div>
            <h2 className="text-3xl font-bold mb-6">Research Articles</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/research/${article.slug}`}
                  className="group"
                >
                  <Card className="h-full hover:shadow-xl transition-all duration-300">
                    {article.coverImage && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={article.coverImage}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="mb-3">
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                          {article.division}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {article.excerpt}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {article.author}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {article.publishedAt && new Date(article.publishedAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                        Read More
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {articles.length === 0 && equityReports.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No research published yet. Check back soon!</p>
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
