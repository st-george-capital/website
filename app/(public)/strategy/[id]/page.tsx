import { Hero } from '@/components/hero';
import { Section } from '@/components/section';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { Badge } from '@/components/ui/badge';
import { FileText, TrendingUp, Download, ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { notFound } from 'next/navigation';

interface StrategyDocument {
  id: string;
  type: 'investment_strategy' | 'industry_report';
  title: string;
  year: string;
  content: string;
  executiveSummary?: string;
  industries?: string;
  sectors?: string;
  coverImage?: string;
  documentFile?: string;
  published: boolean;
  publishDate?: string;
  createdAt: string;
}

async function getStrategyDocument(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/strategy/${id}`,
      {
        cache: 'no-store',
      }
    );

    if (!response.ok) return null;

    const document = await response.json();
    return document as StrategyDocument;
  } catch (error) {
    console.error('Failed to fetch strategy document:', error);
    return null;
  }
}

export default async function StrategyDocumentPage({
  params,
}: {
  params: { id: string };
}) {
  const document = await getStrategyDocument(params.id);

  if (!document) {
    notFound();
  }

  return (
    <>
      <Hero
        title={document.title}
        subtitle={`${document.type === 'investment_strategy' ? 'Investment Strategy' : 'Industry Report'} • ${document.year}`}
        height="small"
      />

      <Section className="pt-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <div className="mb-8">
            <Button variant="ghost" asChild>
              <Link href="/strategy">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Strategy & Research
              </Link>
            </Button>
          </div>

          {/* Document Header */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {document.type === 'investment_strategy' ? (
                      <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-8 h-8 text-primary" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileText className="w-8 h-8 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">
                        {document.type === 'investment_strategy' ? 'Investment Strategy' : 'Industry Report'}
                      </Badge>
                      <Badge variant="secondary">
                        {document.year}
                      </Badge>
                    </div>
                    <CardTitle className="text-3xl font-serif mb-4">
                      {document.title}
                    </CardTitle>
                    {document.executiveSummary && (
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        {document.executiveSummary}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                {document.industries && (
                  <span>Industries: {document.industries}</span>
                )}
                {document.sectors && (
                  <span>Sectors: {document.sectors}</span>
                )}
                {document.publishDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Published {new Date(document.publishDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {document.documentFile && (
                <Button asChild>
                  <a href={document.documentFile} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF Version
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Document Content */}
          <Card>
            <CardContent className="pt-6">
              <div className="prose prose-lg max-w-none dark:prose-invert">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1 className="font-serif text-4xl font-bold mt-12 mb-6 scroll-mt-20" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className="font-serif text-3xl font-bold mt-10 mb-4 scroll-mt-20" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="font-serif text-2xl font-bold mt-8 mb-3 scroll-mt-20" {...props} />
                    ),
                    h4: ({ node, ...props }) => (
                      <h4 className="font-serif text-xl font-bold mt-6 mb-2 scroll-mt-20" {...props} />
                    ),
                    p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                    em: ({ node, ...props }) => <em className="italic" {...props} />,
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="border-l-4 border-primary pl-4 italic my-6 bg-muted/50 py-2 px-4 rounded-r-lg" {...props} />
                    ),
                    a: ({ node, ...props }) => (
                      <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                    ),
                    img: ({ node, ...props }) => (
                      <img className="my-6 rounded-lg shadow-md max-w-full h-auto" {...props} />
                    ),
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto my-6">
                        <table className="min-w-full border border-border" {...props} />
                      </div>
                    ),
                    th: ({ node, ...props }) => (
                      <th className="border border-border px-4 py-2 bg-muted font-semibold text-left" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="border border-border px-4 py-2" {...props} />
                    ),
                  }}
                >
                  {document.content}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>
    </>
  );
}

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
