import { prisma } from '@/lib/prisma';
import { Hero } from '@/components/hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
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
        title="Research & Insights"
        breadcrumb="What We Do / Research & Insights"
        height="small"
        align="left"
      />

      <Section className="!py-12 !md:py-16">
        <div className="grid md:grid-cols-2 gap-20 items-start">
          <div>
            <h2 className="font-serif text-5xl md:text-6xl font-bold">
              Analyzing Current Events
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-lg text-gray-600 leading-relaxed">
              We examine current events and forecast their impact by analyzing historical patterns and market mechanics. Our research uncovers opportunities through deep understanding of how markets respond to economic, political, and social developments.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              By combining rigorous historical analysis with real-time data, we identify mispriced assets and emerging trends before they become consensus.
            </p>
          </div>
        </div>
      </Section>

      {/* Equity Research Reports Section (if any are toggled for website) */}
      {equityReports.length > 0 && (
        <Section className="!py-12 !md:py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-8">Equity Research Reports</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {equityReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/equity-research/${report.ticker}`}
                  className="group"
                >
                  <Card className="h-full hover:shadow-xl transition-all duration-300 bg-white border-2 border-transparent hover:border-blue-500">
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
        </Section>
      )}

      {/* Research Articles Section */}
      <Section dark className="!py-12 !md:py-16">
        <div className="max-w-7xl mx-auto">
          {articles.length === 0 ? (
            <Card className="bg-white">
              <CardHeader className="text-center py-12">
                <CardTitle className="font-serif text-2xl mb-3">No Research Published Yet</CardTitle>
                <CardDescription>
                  Check back soon for our latest research and market insights.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article) => (
                <Link key={article.id} href={`/research/${article.slug}`}>
                  <Card className="h-full hover:shadow-xl transition-shadow cursor-pointer bg-white">
                    {article.coverImage && (
                      <div className="w-full h-48 overflow-hidden rounded-t-lg">
                        <img
                          src={article.coverImage}
                          alt={article.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-3">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                          {article.division}
                        </span>
                        {article.featured && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                            Featured
                          </span>
                        )}
                      </div>
                      <CardTitle className="font-serif text-xl mb-3 line-clamp-2">
                        {article.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3 mb-4">
                        {article.excerpt}
                      </CardDescription>
                      <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {article.author}
                          </span>
                          {article.publishedAt && (
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {new Date(article.publishedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center text-primary font-medium mt-4">
                        Read More
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Section>

      {articles.length > 0 && (
        <Section className="!py-12 !md:py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-6">
              Want to Contribute?
            </h2>
            <p className="text-xl mb-8 text-gray-600">
              Join our research team and publish your insights
            </p>
            <Link href="/contact">
              <Button size="lg">
                <span>Get In Touch</span>
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </Section>
      )}
    </>
  );
}
