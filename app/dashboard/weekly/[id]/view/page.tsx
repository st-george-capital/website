'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { ArrowLeft, FileText, Download, Calendar, Tag, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface WeeklyContent {
  id: string;
  title: string;
  category: 'news' | 'learning';
  year: string;
  season: string;
  week: number;
  description?: string;
  contentType?: 'pdf' | 'markdown';
  content?: string;
  documentFile?: string;
  published: boolean;
  publishDate?: string;
  createdAt: string;
}

export default function WeeklyContentViewPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [content, setContent] = useState<WeeklyContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, [id]);

  const fetchContent = async () => {
    try {
      const response = await fetch(`/api/weekly/${id}`);
      if (response.ok) {
        const data = await response.json();
        setContent(data);
      } else {
        router.push('/dashboard/weekly');
      }
    } catch (error) {
      console.error('Error fetching weekly content:', error);
      router.push('/dashboard/weekly');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Content Not Found</h1>
          <p className="text-muted-foreground">The requested weekly content could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/weekly" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Weekly Content
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                content.category === 'news'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-green-100 text-green-600'
              }`}>
                {content.category === 'news' ? (
                  <FileText className="w-6 h-6" />
                ) : (
                  <BookOpen className="w-6 h-6" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">{content.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{content.year} • {content.season} • Week {content.week}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tag className="w-4 h-4" />
                    <span className="capitalize">{content.category}</span>
                  </div>
                  {content.contentType && (
                    <span className="px-2 py-1 bg-accent rounded text-xs">
                      {content.contentType === 'pdf' ? 'PDF Document' : 'Markdown Content'}
                    </span>
                  )}
                  {content.published ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      Published
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                      Draft
                    </span>
                  )}
                </div>
              </div>
            </div>

            {content.description && (
              <p className="text-lg text-muted-foreground mb-6">{content.description}</p>
            )}
          </div>

          {content.documentFile && (
            <div className="ml-6">
              <a
                href={content.documentFile}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-8">
          {content.contentType === 'pdf' && content.documentFile ? (
            <div className="w-full">
              <iframe
                src={content.documentFile}
                className="w-full h-[800px] border border-border rounded-lg"
                title={content.title}
              />
            </div>
          ) : content.contentType === 'markdown' && content.content ? (
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-3xl font-bold mb-6 mt-8 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-2xl font-bold mb-4 mt-8">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-xl font-semibold mb-3 mt-6">{children}</h3>,
                  h4: ({ children }) => <h4 className="text-lg font-semibold mb-2 mt-4">{children}</h4>,
                  p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="mb-4 ml-6 list-disc">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{children}</code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4">{children}</pre>
                  ),
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                }}
              >
                {content.content}
              </ReactMarkdown>
            </div>
          ) : content.documentFile ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">PDF Document</h3>
              <p className="text-muted-foreground mb-6">
                This weekly content is available as a PDF document.
              </p>
              <a
                href={content.documentFile}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-lg"
              >
                <Download className="w-5 h-5 mr-2" />
                Open PDF Document
              </a>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg">No content available to display.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}