import { Hero } from '@/components/hero';
import { Section, SectionHeader } from '@/components/section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { Badge } from '@/components/ui/badge';
import { FileText, TrendingUp, Download, Calendar } from 'lucide-react';
import Link from 'next/link';

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
}

async function getStrategyDocuments(type?: string) {
  try {
    const url = type
      ? `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/strategy?type=${type}&published=true`
      : `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/strategy?published=true`;

    const response = await fetch(url, {
      cache: 'no-store',
    });

    if (!response.ok) return [];

    const documents = await response.json();
    return documents as StrategyDocument[];
  } catch (error) {
    console.error('Failed to fetch strategy documents:', error);
    return [];
  }
}

export default async function StrategyPage() {
  const investmentStrategies = await getStrategyDocuments('investment_strategy');
  const industryReports = await getStrategyDocuments('industry_report');

  return (
    <>
      <Hero
        title="Our Strategy & Research"
        subtitle="Investment strategies and industry deep-dives"
        height="medium"
      />

      {/* Market Strategy & Outlooks */}
      <Section className="pt-16" dark>
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            title="Market Strategy & Outlooks"
            subtitle="Our approach to investment strategy and risk management"
            centered
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12 mb-16">
            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-white text-xl">Market Outlook</CardTitle>
                <CardDescription className="text-white/80">
                  Our latest market analysis and strategic positioning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 text-sm mb-4">
                  Comprehensive market analysis covering economic trends, sector rotations, and investment themes.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-white text-xl">Risk Framework</CardTitle>
                <CardDescription className="text-white/80">
                  Our approach to portfolio risk management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 text-sm mb-4">
                  Systematic risk assessment and position sizing methodologies.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-white text-xl">Investment Process</CardTitle>
                <CardDescription className="text-white/80">
                  How we research and evaluate opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 text-sm mb-4">
                  Rigorous fundamental analysis and quantitative evaluation methods.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="border-t border-white/10 pt-16">
            <SectionHeader
              title="Investment Strategies"
              subtitle="Annual investment strategies and market positioning"
              centered
            />
          </div>

          {investmentStrategies.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
              {investmentStrategies.map((strategy) => (
                <Card key={strategy.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-2 text-xs">
                          Investment Strategy
                        </Badge>
                        <CardTitle className="font-serif text-xl text-white mb-2">
                          {strategy.title}
                        </CardTitle>
                        <div className="text-sm text-white/60 mb-3">
                          {strategy.year}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {strategy.executiveSummary && (
                      <p className="text-white/80 text-sm mb-4 line-clamp-3">
                        {strategy.executiveSummary}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-white/60">
                        {strategy.industries && `Industries: ${strategy.industries}`}
                      </div>
                      <div className="flex gap-2">
                        {strategy.documentFile && (
                          <a href={strategy.documentFile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1 border border-border rounded-md text-sm hover:bg-accent transition-colors">
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </a>
                        )}
                        <Link href={`/strategy/${strategy.id}`} className="inline-flex items-center px-3 py-1 border border-border rounded-md text-sm hover:bg-accent transition-colors">
                          View
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="font-serif text-2xl font-bold text-white mb-2">Investment Strategies Coming Soon</h3>
              <p className="text-white/60">
                Our comprehensive investment strategy documents will be published here.
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* Industry Reports */}
      <Section>
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            title="Industry Reports"
            subtitle="Deep-dive analysis of key industries and sectors"
            centered
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12 mb-16">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Technology Sector</CardTitle>
                <CardDescription>
                  Analysis of emerging technologies and digital transformation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm mb-4">
                  Deep-dive into AI, cloud computing, and semiconductor trends shaping the future.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Healthcare Innovation</CardTitle>
                <CardDescription>
                  Biotechnology and medical technology advancements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm mb-4">
                  Analysis of pharmaceutical pipelines, medical devices, and healthcare delivery models.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Financial Services</CardTitle>
                <CardDescription>
                  Fintech innovations and traditional banking evolution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm mb-4">
                  Digital payments, blockchain applications, and regulatory changes in finance.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="border-t border-border pt-16">
            <h3 className="font-serif text-3xl font-bold mb-8 text-center">Published Industry Reports</h3>
          </div>

          {industryReports.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
              {industryReports.map((report) => (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-2 text-xs">
                          Industry Report
                        </Badge>
                        <CardTitle className="font-serif text-xl mb-2">
                          {report.title}
                        </CardTitle>
                        <div className="text-sm text-muted-foreground mb-3">
                          {report.year}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {report.executiveSummary && (
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                        {report.executiveSummary}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {report.industries && `Industry: ${report.industries}`}
                      </div>
                      <div className="flex gap-2">
                        {report.documentFile && (
                          <a href={report.documentFile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1 border border-border rounded-md text-sm hover:bg-accent transition-colors">
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </a>
                        )}
                        <Link href={`/strategy/${report.id}`} className="inline-flex items-center px-3 py-1 border border-border rounded-md text-sm hover:bg-accent transition-colors">
                          View
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-serif text-2xl font-bold mb-2">Industry Reports Coming Soon</h3>
              <p className="text-muted-foreground">
                Our comprehensive industry analysis reports will be published here.
              </p>
            </div>
          )}
        </div>
      </Section>
    </>
  );
}

export const dynamic = 'force-dynamic';
