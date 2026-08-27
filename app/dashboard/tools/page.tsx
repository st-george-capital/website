'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { ToolsHubReadingGuide } from '@/components/tool-reading-guide';
import { Brain, Calculator, FileText, GitBranch, Globe, MessageSquareText, Sparkles, TrendingUp, Radar, Crosshair, ShieldAlert, LineChart } from 'lucide-react';

const tools = [
  {
    id: 'dcf',
    name: 'DCF Valuation Tool',
    description: 'Interactive Discounted Cash Flow valuation model for equity research and analysis',
    plainSummary: 'Use when you need a fair value estimate from cash flows.',
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
    plainSummary: 'Use when you are writing up a formal stock pitch or published report.',
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
    plainSummary: 'Use when you want the big-picture risk-on / risk-off read.',
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
    plainSummary: 'Use when you are comparing countries on structural fundamentals.',
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
    plainSummary: 'Use when you are prepping for finance or consulting interviews.',
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
    plainSummary: 'Use when you want the news narrative around one stock.',
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
    id: 'cvar-optimizer',
    name: 'CVaR Portfolio Optimizer',
    description: 'Baseline late-cycle regime tilt: CVaR-minimizing optimization over fund holdings with sector, region, and factor constraints',
    plainSummary: 'Use when you want portfolio-level risk tilts for fund holdings.',
    href: '/dashboard/tools/cvar-optimizer',
    icon: ShieldAlert,
    features: [
      'Rockafellar-Uryasev CVaR minimization',
      'Sector, region & factor-tilt constraints',
      'Quality / low-Vol factor scoring',
      'Historical stress tests vs URTH',
      'Recommendation-only suggested trades',
    ],
  },
  {
    id: 'supplementary-tools',
    name: 'Supplementary Tools',
    description: 'Transcript, insider, estimate, and calendar overlays for faster equity research prep',
    plainSummary: 'Use for transcripts, insiders, estimates, and earnings dates on one name.',
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
    plainSummary: 'Use when you want which countries/sectors to overweight this month.',
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
  {
    id: 'trade-radar',
    name: 'Trade Shift Radar',
    description: 'WRDS Panjiva-powered dashboard for unusual shipment shifts, route substitutions, and parent-level trade exposure changes',
    plainSummary: 'Use when you are tracking trade rerouting and supply-chain shifts.',
    href: '/dashboard/tools/trade-radar',
    icon: Radar,
    features: [
      'Ranked weekly trade-shift signals',
      'Parent-company linkage and watchlists',
      'Country-to-country rerouting monitor',
      'HS6 theme mapping and market tags',
      'Auto-generated weekly trade brief',
    ],
  },
  {
    id: 'g10-rates',
    name: 'G10 Rates Monitor',
    description: 'G10 policy rates, short-end yields, and 10-year curves with a rough read on who is pricing cuts vs hikes',
    plainSummary: 'Use when you want a cross-country rates snapshot and curve context (free FRED data).',
    href: '/dashboard/tools/g10-rates',
    icon: LineChart,
    features: [
      'G10 policy, short-end, and 10Y yields',
      'Curve slope and front-end vs policy spreads',
      'Rough “cuts priced” proxy (not futures odds)',
      '1-week / 1-month repricing moves',
      'Links to Macro Engine and Capital Flows',
    ],
  },
  {
    id: 'equity-positioning',
    name: 'Equity Positioning',
    description: 'Single-name positioning view with earnings revision price reactions and options flow bias',
    plainSummary: 'Use when you want earnings reaction history and options positioning on one stock.',
    href: '/dashboard/tools/equity-positioning',
    icon: Crosshair,
    features: [
      'Earnings beat/miss history with price reaction',
      'Forward estimate revision momentum',
      'Put/call open interest and volume ratios',
      'IV skew and unusual options activity',
      'Cross-links to sentiment and supplementary tools',
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
            Pick a tool by the question you are trying to answer — each page now starts with a plain-English summary.
          </p>
        </div>
      </div>

      <ToolsHubReadingGuide />

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
                  {'plainSummary' in tool && tool.plainSummary ? (
                    <p className="mt-2 text-sm font-medium text-slate-700">{tool.plainSummary}</p>
                  ) : null}
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

      </div>
    </div>
  );
}
