import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Section } from '@/components/section';
import { Button } from '@/components/button';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Force dynamic rendering to prevent static generation issues with database calls
export const dynamic = 'force-dynamic';

async function getArticle(slug: string) {
  const article = await prisma.article.findUnique({
    where: { slug },
  });

  if (!article || !article.published) {
    return null;
  }

  return article;
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);

  if (!article) {
    notFound();
  }

  const tags = article.tags ? article.tags.split(',').map(t => t.trim()) : [];

  return (
    <>
      {/* Header Section */}
      <Section className="pt-32 pb-16" dark>
        <div className="max-w-4xl mx-auto">
          <Link href="/research">
            <Button variant="ghost" className="mb-8 inline-flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Research
            </Button>
          </Link>

          <div className="mb-6">
            <span className="px-3 py-1 bg-white/10 text-white rounded text-sm font-medium">
              {article.division}
            </span>
          </div>

          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            {article.title}
          </h1>

          <p className="text-xl mb-8 text-white/80">
            {article.excerpt}
          </p>

          <div className="flex items-center space-x-6 text-white/70">
            <span className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              {article.author}
            </span>
            {article.publishedAt && (
              <span className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                {new Date(article.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
      </Section>

      {/* Cover Image */}
      {article.coverImage && (
        <Section>
          <div className="max-w-5xl mx-auto">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-auto rounded-2xl shadow-2xl"
            />
          </div>
        </Section>
      )}

      {/* Article Content */}
      <Section>
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="font-serif text-4xl font-bold mt-12 mb-6" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="font-serif text-3xl font-bold mt-10 mb-4" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="font-serif text-2xl font-bold mt-8 mb-3" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="text-lg leading-relaxed mb-6" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside mb-6 space-y-2" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-inside mb-6 space-y-2" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-primary pl-6 italic my-6" {...props} />
                ),
                code: ({ node, inline, ...props }: any) =>
                  inline ? (
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm" {...props} />
                  ) : (
                    <code className="block bg-gray-100 p-4 rounded-lg overflow-x-auto my-6" {...props} />
                  ),
                img: ({ node, ...props }) => (
                  <img className="w-full h-auto rounded-lg my-8 shadow-lg" {...props} />
                ),
              }}
            >
              {article.content}
            </ReactMarkdown>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-12 pt-8 border-t">
              <div className="flex items-center flex-wrap gap-2">
                <Tag className="w-5 h-5 text-gray-500" />
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Back to Research */}
      <Section dark>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl font-bold mb-6">
            Explore More Research
          </h2>
          <Link href="/research">
            <Button size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              View All Articles
            </Button>
          </Link>
        </div>
      </Section>
    </>
  );
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  return {
    title: `${article.title} | SGC Research`,
    description: article.excerpt,
  };
}

