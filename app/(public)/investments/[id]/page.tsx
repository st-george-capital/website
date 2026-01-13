import { notFound } from 'next/navigation';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Force dynamic rendering for database queries
export const dynamic = 'force-dynamic';

interface Investment {
  id: string;
  type: 'thesis' | 'outlook';
  title: string;
  company?: string;
  ticker?: string;
  year: number;
  season: string;
  content: string;
  thesis?: string;
  entryDate?: string;
  priceAtEntry?: number;
  initialTarget?: number;
  currentTarget?: number;
  tags: string;
  published: boolean;
  createdAt: string;
}

async function getInvestment(id: string) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/investments/${id}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as Investment;
  } catch (error) {
    console.error('Failed to fetch investment:', error);
    return null;
  }
}

export default async function InvestmentPage({ params }: { params: { id: string } }) {
  const investment = await getInvestment(params.id);

  if (!investment) {
    notFound();
  }

  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTagsArray = (tags: string) => {
    return tags ? tags.split(',').map(tag => tag.trim()) : [];
  };

  return (
    <>
      <Section className="pt-32 pb-16" dark>
        <div className="max-w-4xl">
          <div className="flex items-center space-x-4 mb-6">
            <Link href={investment.type === 'thesis' ? '/holdings' : '/fund'}>
              <div className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </div>
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant={investment.type === 'thesis' ? 'default' : 'secondary'}>
                {investment.type === 'thesis' ? 'Investment Thesis' : 'Market Outlook'}
              </Badge>
              <Badge variant="outline" className="text-white/80 border-white/30">
                {investment.year} • {investment.season}
              </Badge>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white">
              {investment.title}
            </h1>

            {investment.company && (
              <p className="text-xl text-white/80">
                {investment.company}
                {investment.ticker && <span className="ml-2 text-white/60">({investment.ticker})</span>}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {getTagsArray(investment.tags).map((tag) => (
                <Badge key={tag} variant="outline" className="text-white/80 border-white/30">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <div className="max-w-4xl mx-auto">
          {/* Investment Metrics (for theses) */}
          {investment.type === 'thesis' && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Investment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">Entry Date</div>
                    <div className="text-lg font-semibold">{formatDate(investment.entryDate)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">Entry Price</div>
                    <div className="text-lg font-semibold">{formatCurrency(investment.priceAtEntry)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">Initial Target</div>
                    <div className="text-lg font-semibold">{formatCurrency(investment.initialTarget)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">Current Target</div>
                    <div className="text-lg font-semibold text-primary">{formatCurrency(investment.currentTarget)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Thesis Section */}
          {investment.thesis && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Investment Thesis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-lg max-w-none">
                  {investment.thesis.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Full Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>
                {investment.type === 'thesis' ? 'Detailed Analysis' : 'Market Outlook'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-lg max-w-none">
                {investment.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="mt-8 flex justify-between">
            <Link href={investment.type === 'thesis' ? '/holdings' : '/fund'}>
              <div className="flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to {investment.type === 'thesis' ? 'Holdings' : 'Strategy'}</span>
              </div>
            </Link>
          </div>
        </div>
      </Section>

      {/* Disclaimer */}
      <Section dark>
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h3 className="font-serif text-xl font-bold mb-4 text-white">Educational Disclaimer</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              This analysis is provided for educational purposes only. St. George Capital is a student-run organization,
              and our research should not be considered professional investment advice. Market conditions can change rapidly,
              and past performance does not guarantee future results. Always consult with qualified financial professionals
              before making investment decisions.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
