'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Section } from '@/components/section';
import { Button } from '@/components/button';
import { ArrowLeft, Calendar, User, Edit, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  author: string;
  division: string;
  tags: string;
  featured: boolean;
  published: boolean;
  publishedAt: string | null;
}

export default function ArticlePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/articles/${params.id}`);
        if (!res.ok) throw new Error('Failed to fetch article');
        const data = await res.json();
        setArticle(data);
      } catch (error) {
        console.error('Error fetching article:', error);
        alert('Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading article...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Article Not Found</h2>
          <Link href="/dashboard/articles">
            <Button>Back to Articles</Button>
          </Link>
        </div>
      </div>
    );
  }

  const tags = article.tags ? article.tags.split(',').map(t => t.trim()) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Preview Header Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard/articles">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Articles
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              article.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {article.published ? 'Published' : 'Draft'}
            </span>
            <Link href={`/dashboard/articles/${article.id}/edit`}>
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                <Edit className="w-4 h-4 mr-2" />
                Edit Article
              </Button>
            </Link>
            {article.published && (
              <Button
                onClick={() => window.open(`/research/${article.slug}`, '_blank')}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Live
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Article Preview */}
      <>
        {/* Header Section */}
        <Section className="pt-32 pb-16" dark>
          <div className="max-w-4xl mx-auto">
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
                    <p className="mb-6 text-gray-700 leading-relaxed" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="mb-6 space-y-2 list-disc list-inside" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="mb-6 space-y-2 list-decimal list-inside" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="text-gray-700" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      className="border-l-4 border-blue-500 pl-6 italic my-6 text-gray-600"
                      {...props}
                    />
                  ),
                  a: ({ node, ...props }) => (
                    <a
                      className="text-blue-600 hover:text-blue-800 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                  img: ({ node, ...props }) => (
                    <img className="rounded-lg shadow-lg my-8 w-full" {...props} />
                  ),
                  code: ({ node, inline, ...props }: any) =>
                    inline ? (
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono" {...props} />
                    ) : (
                      <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg my-6 overflow-x-auto" {...props} />
                    ),
                }}
              >
                {article.content}
              </ReactMarkdown>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-12 pt-8 border-t">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
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
      </>
    </div>
  );
}
