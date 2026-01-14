import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

// Force dynamic rendering for database queries
export const dynamic = 'force-dynamic';

interface Investment {
  id: string;
  type: 'thesis' | 'outlook';
  title: string;
  company?: string;
  ticker?: string;
  year: string;
  season: string;
  content: string;
  thesis?: string;
  entryDate?: string;
  priceAtEntry?: number;
  initialTarget?: number;
  currentTarget?: number;
  exitPrice?: number;
  active: boolean;
  publishDate?: string;
  tags: string;
  coverImage?: string;
  published: boolean;
  createdAt: string;
}

async function getInvestmentTheses() {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/investments?type=thesis&published=true`, {
      cache: 'no-store',
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data as Investment[];
  } catch (error) {
    console.error('Failed to fetch investment theses:', error);
    return [];
  }
}

export default async function HoldingsPage() {
  const theses = await getInvestmentTheses();

  // Sort by publishDate (newest first), fallback to entryDate or createdAt
  const sortedTheses = theses.sort((a, b) => {
    const dateA = a.publishDate ? new Date(a.publishDate).getTime() :
                 a.entryDate ? new Date(a.entryDate).getTime() :
                 new Date(a.createdAt).getTime();
    const dateB = b.publishDate ? new Date(b.publishDate).getTime() :
                 b.entryDate ? new Date(b.entryDate).getTime() :
                 new Date(b.createdAt).getTime();
    return dateB - dateA; // Newest first
  });

  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(value);
  };

  const getTagsArray = (tags: string) => {
    return tags ? tags.split(',').map(tag => tag.trim()) : [];
  };

  return (
    <>
      <Section className="pt-32 pb-16" dark>
        <div className="max-w-4xl">
          <SectionHeader
            title="Our Holdings"
            subtitle="Current investment positions and detailed analysis"
          />
        </div>
      </Section>

      <Section>
        <div className="max-w-6xl mx-auto">
          <p className="text-lg text-center mb-12 max-w-3xl mx-auto">
            Our active investment positions represent carefully researched opportunities.
            Each holding is backed by rigorous quantitative and fundamental analysis.
          </p>

          {theses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <div className="w-6 h-6 bg-primary rounded"></div>
                </div>
                <CardTitle className="mb-2">No Active Positions</CardTitle>
                <CardDescription>
                  Our investment theses are currently being developed. Check back soon for our latest research.
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {theses.map((thesis) => (
                <Card key={thesis.id} className="hover:shadow-lg transition-shadow flex flex-col h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                      {thesis.coverImage ? (
                        <img
                          src={thesis.coverImage}
                          alt={thesis.title}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <div className="w-6 h-6 bg-primary rounded"></div>
                        </div>
                      )}
                      <Badge variant={thesis.active ? "default" : "secondary"} className="text-xs">
                        {thesis.active ? "Active Position" : "Exited Position"}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <CardTitle className="text-lg">{thesis.title}</CardTitle>
                      <CardDescription>
                        {thesis.company && <div className="font-medium">{thesis.company}</div>}
                        {thesis.ticker && <div className="text-sm text-muted-foreground">({thesis.ticker})</div>}
                        <div className="text-sm text-muted-foreground">
                          {thesis.year} • {thesis.season}
                        </div>
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col h-full">
                    <div className="flex-grow space-y-4">
                      {/* Price Information */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Entry Price</div>
                          <div className="font-semibold">{formatCurrency(thesis.priceAtEntry)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">
                            {thesis.active ? "Current Target" : "Exit Price"}
                          </div>
                          <div className={`font-semibold ${!thesis.active ? "text-red-600" : ""}`}>
                            {formatCurrency(thesis.active ? thesis.currentTarget : thesis.exitPrice)}
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        {getTagsArray(thesis.tags).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Thesis Preview */}
                      {thesis.thesis && (
                        <div className="text-sm">
                          <div className="text-muted-foreground mb-1">Thesis:</div>
                          <div className="line-clamp-3 text-muted-foreground">
                            {thesis.thesis}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* View Full Analysis - Always at bottom */}
                    <div className="mt-4">
                      <Link href={`/investments/${thesis.id}`}>
                        <div className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md text-center text-sm font-medium hover:bg-primary/90 transition-colors">
                          View Full Analysis
                        </div>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Disclaimer */}
      <Section dark>
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h3 className="font-serif text-xl font-bold mb-4 text-white">Important Disclaimer</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              All investment information provided is for educational purposes only. St. George Capital is a student-run organization,
              and our analyses should not be considered professional investment advice. Past performance does not guarantee future results.
              Always consult with qualified financial professionals before making investment decisions.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
