import { Hero } from '@/components/hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/card';
import { Button } from '@/components/button';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ArrowRight, Calendar, User } from 'lucide-react';

// Force dynamic rendering to prevent static generation issues with database calls
export const dynamic = 'force-dynamic';

async function getArticles() {
  const articles = await prisma.article.findMany({
    where: {
      published: true,
    },
    orderBy: {
      publishedAt: 'desc',
    },
  });
  return articles;
}

export default async function ResearchPage() {
  const articles = await getArticles();

  return (
    <>
      <Hero
        title="Research & Insights"
        subtitle="Institutional-grade analysis from our research divisions"
        height="medium"
      />

      <Section>
        <div className="max-w-7xl mx-auto">
          {articles.length === 0 ? (
            <Card>
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
                  <Card className="h-full hover:shadow-xl transition-shadow cursor-pointer">
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
        <Section dark>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-6">
              Want to Contribute?
            </h2>
            <p className="text-xl mb-8">
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
