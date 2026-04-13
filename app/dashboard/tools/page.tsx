'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { Brain, Calculator, BarChart3, FileText, GitBranch, Globe, MessageSquareText, Sparkles, TrendingUp } from 'lucide-react';

const tools = [
  {
    id: 'dcf',
    name: 'DCF Valuation Tool',
    description: 'Interactive Discounted Cash Flow valuation model for equity research and analysis',
    href: '/dashboard/tools/dcf',
    icon: Calculator,
    features: [
      'Free Cash Flow projections',
      'Terminal value estimation',
      'Sensitivity analysis',
      'Bull & bear scenarios',
      'Professional charts',
    ],
  },
  {
    id: 'equity-research',
    name: 'Equity Research Reports',
    description: 'Create and manage institutional-grade equity research reports linked to DCF models',
    href: '/dashboard/research',
    icon: FileText,
    features: [
      'Link to saved DCF models',
      'Bull & bear cases from DCF',
      'Valuation tables and charts',
      'Publish or hide on website',
    ],
  },
  {
    id: 'capital-flows',
    name: 'Capital Flows & Positioning',
    description: 'ETF-based proxy for global institutional capital movement, risk regime detection, and macro context',
    href: '/dashboard/flows',
    icon: GitBranch,
    features: [
      'Risk regime composite signal',
      'ETF heatmap across 24 instruments',
      'Pair ratios with z-scores & trends',
      'Market structure: breadth, dispersion',
      'Macro bar: Fed rate, yields, crude, BTC',
    ],
  },
  {
    id: 'country-health',
    name: 'Country Macro Health Index',
    description: 'Score countries across five pillars: productive capacity, human capital, macro sustainability, institutions, and innovation',
    href: '/dashboard/country-health',
    icon: Globe,
    features: [
      '5-pillar scoring framework',
      'World Bank & governance data',
      'Market monetization overlay',
      'Country classification by type',
      '11 countries tracked',
    ],
  },
  {
    id: 'interview-tool',
    name: 'Interview Tool',
    description: 'A searchable interview bank with quiz mode, member submissions, and admin review for finance and consulting roles',
    href: '/dashboard/tools/interview',
    icon: Brain,
    features: [
      '350+ seeded interview prompts',
      'Role, desk, and company filters',
      'Randomized Test Me mode',
      'Community question submissions',
      'Admin moderation queue',
    ],
  },
  {
    id: 'sentiment-tool',
    name: 'Sentiment Tool',
    description: 'Live news-sentiment analysis for a ticker or company, translated into an investment memo view',
    href: '/dashboard/tools/sentiment',
    icon: MessageSquareText,
    features: [
      'Live Alpha Vantage news sentiment',
      'Ticker and keyword filtering',
      'Bullish vs bearish drivers',
      'Recent article trend view',
      'Price-context divergence check',
    ],
  },
  {
    id: 'supplementary-tools',
    name: 'Supplementary Tools',
    description: 'Transcript, insider, estimate, and calendar overlays for faster equity research prep',
    href: '/dashboard/tools/supplementary',
    icon: Sparkles,
    features: [
      'Earnings call transcript read',
      'Insider transaction tape',
      'Forward estimate context',
      'Upcoming earnings calendar',
      'Dashboard-only research desk',
    ],
  },
  {
    id: 'macro-engine',
    name: 'Macro Allocation Engine',
    description: 'Current macro regime, ranked country/sector allocation signals with backtested OOS accuracy, and top single-stock picks per favored sector',
    href: '/dashboard/tools/macro-engine',
    icon: TrendingUp,
    features: [
      'Current regime badge with factor breakdown',
      'Ranked overweight/underweight allocation signals',
      'Probabilistic 6m/12m outperformance forecasts',
      'OOS backtest hit rate, Sharpe, and max drawdown',
      "Top single-stock picks with O'Neil scores and analyst consensus",
    ],
  },
];

export default function ToolsDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Research Tools</h1>
          <p className="text-muted-foreground">
            Professional valuation, analysis, and macro intelligence tools
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <Card key={tool.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <tool.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">{tool.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {tool.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Features:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {tool.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 flex-shrink-0"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href={tool.href}>
                  <Button className="w-full">
                    Open {tool.name}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Coming Soon Placeholder */}
        <Card className="border-dashed border-2">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Coming Soon</CardTitle>
                <CardDescription>
                  More research tools in development
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Additional valuation tools and analysis features are being developed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
