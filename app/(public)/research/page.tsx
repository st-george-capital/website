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
        title="Our Take"
        breadcrumb="What We Do / Our Take"
        height="small"
        align="left"
      />

      <Section className="!py-12 !md:py-16">
        <div className="grid md:grid-cols-2 gap-20 items-start">
          <div>
            <h2 className="font-serif text-5xl md:text-6xl font-bold">
              Market Perspectives
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-lg text-gray-600 leading-relaxed">
              Our Take provides perspective on current market events, macroeconomic trends, and investment themes. We analyze how historical patterns and evolving dynamics create opportunities across asset classes.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Through rigorous analysis and real-time market monitoring, we identify mispriced assets and emerging trends before they reach consensus.
            </p>
          </div>
        </div>
      </Section>

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
