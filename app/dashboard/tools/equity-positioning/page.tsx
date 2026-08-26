'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  LineChart,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { RelatedResearchTools } from '@/components/related-research-tools';
import { ToolAtAGlance } from '@/components/tool-digest';
import { ToolReadingGuide } from '@/components/tool-reading-guide';
import { getToolReadingGuide } from '@/lib/tool-reading-guides';
import type {
  EarningsEventImpact,
  EquityPositioningResponse,
  PositioningBias,
} from '@/lib/equity-positioning';

type PositioningTab = 'revisions' | 'options';

const tabs: Array<{
  id: PositioningTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    id: 'revisions',
    label: 'Earnings Revisions',
    icon: LineChart,
    description: 'Estimate vs actual history and how the stock reacted after each print.',
  },
  {
    id: 'options',
    label: 'Options Flow',
    icon: BarChart3,
    description: 'Put/call positioning, skew, and unusual activity for single-name bias.',
  },
];

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatRatio(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toFixed(2);
}

function formatEps(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toFixed(2);
}

function biasTone(bias: PositioningBias) {
  switch (bias) {
    case 'bullish':
      return {
        label: 'Bullish Positioning',
        pill: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        icon: TrendingUp,
        accent: 'text-emerald-700',
      };
    case 'bearish':
      return {
        label: 'Bearish / Hedged',
        pill: 'bg-red-100 text-red-800 border border-red-200',
        icon: TrendingDown,
        accent: 'text-red-700',
      };
    default:
      return {
        label: 'Neutral Positioning',
        pill: 'bg-slate-100 text-slate-700 border border-slate-200',
        icon: BarChart3,
        accent: 'text-slate-700',
      };
  }
}

function outcomePill(outcome: EarningsEventImpact['outcome']) {
  if (outcome === 'beat') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (outcome === 'miss') return 'bg-red-100 text-red-800 border border-red-200';
  if (outcome === 'inline') return 'bg-slate-100 text-slate-700 border border-slate-200';
  return 'bg-amber-50 text-amber-700 border border-amber-200';
}

function StatCard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-slate-950">{value}</div>
      {subtext ? <div className="mt-1 text-xs text-slate-500">{subtext}</div> : null}
    </div>
  );
}

export default function EquityPositioningPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [activeTab, setActiveTab] = useState<PositioningTab>('revisions');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EquityPositioningResponse | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [router, status]);

  useEffect(() => {
    const symbol = searchParams.get('symbol');
    const tab = searchParams.get('tab');
    if (symbol) {
      setQuery(symbol);
    }
    if (tab === 'options' || tab === 'revisions') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const symbol = searchParams.get('symbol');
    if (!symbol || status !== 'authenticated') return;
    void loadData(symbol, (searchParams.get('tab') as PositioningTab) || 'revisions');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, status]);

  async function loadData(symbolOrQuery: string, tab: PositioningTab = activeTab) {
    if (!symbolOrQuery.trim()) {
      setError('Enter a ticker or company first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ tab });
      params.set(/^[A-Za-z.\-]{1,8}$/.test(symbolOrQuery.trim()) ? 'symbol' : 'query', symbolOrQuery.trim());

      const response = await fetch(`/api/dashboard/equity-positioning?${params.toString()}`);
      const data = (await response.json()) as EquityPositioningResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || data.emptyState || 'Failed to load equity positioning data');
      }

      setResult(data);
      if (data.entity.symbol) {
        const nextParams = new URLSearchParams({ symbol: data.entity.symbol, tab });
        router.replace(`/dashboard/tools/equity-positioning?${nextParams.toString()}`);
      }
    } catch (fetchError) {
      setResult(null);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load equity positioning data');
    } finally {
      setLoading(false);
    }
  }

  const revisions = result?.revisions;
  const options = result?.options;

  const estimateChartPoints = useMemo(() => revisions?.estimateSeries || [], [revisions]);

  const readingGuide = getToolReadingGuide('equity-positioning');

  const positioningDigest = useMemo(() => {
    const symbol = result?.entity.symbol;
    if (!symbol) {
      return {
        headline: 'Enter a ticker to see how earnings and options positioning line up.',
        bullets: [
          'Earnings tab: did beats or misses move the stock over the next few weeks?',
          'Options tab: is the market leaning bullish, hedged, or bearish via puts and calls?',
        ],
      };
    }

    if (activeTab === 'options' && options) {
      const bias = options.summary.positioningBias;
      return {
        headline:
          bias === 'bearish'
            ? `${symbol}: options flow looks defensive or bearish right now.`
            : bias === 'bullish'
              ? `${symbol}: options flow looks more call-heavy / bullish.`
              : `${symbol}: options positioning looks balanced.`,
        bullets: [
          options.summary.positioningDetail,
          options.summary.putCallOiRatio != null
            ? `Put/call open interest is ${options.summary.putCallOiRatio.toFixed(2)} (above 1.0 often means more hedging demand).`
            : 'Put/call open interest ratio is unavailable for this name.',
          'This is not short interest — it is options-market positioning only.',
        ],
      };
    }

    if (revisions) {
      const beatRate =
        revisions.summary.beatRate != null
          ? `${(revisions.summary.beatRate * 100).toFixed(0)}% beat rate`
          : 'limited earnings history';
      return {
        headline: `${symbol}: earnings revisions and post-print price reactions.`,
        bullets: [
          `Historical print quality: ${beatRate} across ${revisions.summary.eventsAnalyzed} events.`,
          revisions.summary.avgReturn5dAfterBeat != null
            ? `After beats, the stock averaged ${formatPercent(revisions.summary.avgReturn5dAfterBeat)} over 5 trading days.`
            : 'Post-beat price reaction is still building as more prints come in.',
          revisions.summary.revisionMomentumDetail,
        ],
      };
    }

    return {
      headline: `Analyzing ${symbol}...`,
      bullets: ['Loading positioning data for this ticker.'],
    };
  }, [activeTab, options, result?.entity.symbol, revisions]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-sm text-slate-500">Loading equity positioning tool...</div>
      </div>
    );
  }

  if (session?.user?.role === 'visitor') {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/tools" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to tools
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Member access required</CardTitle>
            <CardDescription>
              Equity positioning is available to full SGC members. Ask an admin to upgrade your account from visitor to user.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link href="/dashboard/tools" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to tools
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Equity Positioning</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Single-name positioning view: how earnings revisions and surprises moved the stock, plus options-market bias from put/call flow.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form
            className="flex flex-col gap-4 lg:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void loadData(query, activeTab);
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ticker or company, e.g. AAPL"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none ring-primary/20 focus:ring-2"
              />
            </div>
            <Button type="submit" disabled={loading} className="min-w-[160px]">
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Analyze'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                if (result?.entity.symbol) {
                  void loadData(result.entity.symbol, tab.id);
                }
              }}
              className={`rounded-2xl border p-4 text-left transition ${
                selected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-xl p-2 ${selected ? 'bg-primary/10' : 'bg-slate-100'}`}>
                  <Icon className={`h-5 w-5 ${selected ? 'text-primary' : 'text-slate-600'}`} />
                </div>
                <div>
                  <div className="font-semibold text-slate-950">{tab.label}</div>
                  <div className="mt-1 text-sm text-slate-500">{tab.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {readingGuide ? <ToolReadingGuide guide={readingGuide} symbol={result?.entity.symbol} /> : null}

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {result?.entity.symbol ? (
        <RelatedResearchTools symbol={result.entity.symbol} currentTool="equity-positioning" />
      ) : null}

      <ToolAtAGlance headline={positioningDigest.headline} bullets={positioningDigest.bullets} />

      {activeTab === 'revisions' && revisions ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Beat Rate"
              value={revisions.summary.beatRate != null ? formatPercent(revisions.summary.beatRate * 100) : '—'}
              subtext={`${revisions.summary.eventsAnalyzed} earnings events`}
            />
            <StatCard
              label="Avg Surprise"
              value={formatPercent(revisions.summary.avgSurprisePercent)}
              subtext="Mean EPS surprise across history"
            />
            <StatCard
              label="Avg +5d After Beat"
              value={formatPercent(revisions.summary.avgReturn5dAfterBeat)}
            />
            <StatCard
              label="Avg +5d After Miss"
              value={formatPercent(revisions.summary.avgReturn5dAfterMiss)}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Forward Estimate Momentum</CardTitle>
              <CardDescription>{revisions.summary.revisionMomentumDetail}</CardDescription>
            </CardHeader>
            <CardContent>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  revisions.summary.revisionMomentum === 'up'
                    ? 'bg-emerald-100 text-emerald-800'
                    : revisions.summary.revisionMomentum === 'down'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-100 text-slate-700'
                }`}
              >
                {revisions.summary.revisionMomentum.toUpperCase()}
              </span>
            </CardContent>
          </Card>

          {estimateChartPoints.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Estimate vs Price Context</CardTitle>
                <CardDescription>
                  Quarterly estimate at each earnings event alongside the stock price on that date.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {estimateChartPoints.map((point) => (
                  <div
                    key={point.date}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="text-sm font-medium text-slate-900">{point.date}</div>
                    <div className="flex gap-6 text-sm text-slate-600">
                      <span>Est EPS: {formatEps(point.estimatedEps)}</span>
                      <span>Price: {point.price != null ? `$${point.price.toFixed(2)}` : '—'}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Earnings Events & Price Reaction</CardTitle>
              <CardDescription>
                How the stock moved on the print and over the next 5 and 20 trading days.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Report Date</th>
                    <th className="px-3 py-2 font-medium">Outcome</th>
                    <th className="px-3 py-2 font-medium">Est / Actual</th>
                    <th className="px-3 py-2 font-medium">Surprise</th>
                    <th className="px-3 py-2 font-medium">Day Of</th>
                    <th className="px-3 py-2 font-medium">+5d</th>
                    <th className="px-3 py-2 font-medium">+20d</th>
                  </tr>
                </thead>
                <tbody>
                  {revisions.earningsEvents.map((event) => (
                    <tr key={`${event.reportedDate}-${event.fiscalDateEnding}`} className="border-b border-slate-100">
                      <td className="px-3 py-3 text-slate-900">{event.reportedDate || event.fiscalDateEnding}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${outcomePill(event.outcome)}`}>
                          {event.outcome}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {formatEps(event.estimatedEps)} / {formatEps(event.reportedEps)}
                      </td>
                      <td className="px-3 py-3">{formatPercent(event.surprisePercent)}</td>
                      <td className="px-3 py-3">{formatPercent(event.returnDayOf)}</td>
                      <td className="px-3 py-3">{formatPercent(event.return5d)}</td>
                      <td className="px-3 py-3">{formatPercent(event.return20d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {revisions.forwardEstimates.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Forward Estimate Ladder</CardTitle>
                <CardDescription>Upcoming analyst EPS estimates with 30-day revision direction when available.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {revisions.forwardEstimates.map((row) => (
                  <div
                    key={row.period}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-medium text-slate-900">{row.period}</div>
                      <div className="text-xs text-slate-500">
                        {row.analystCount != null ? `${row.analystCount} analysts` : 'Analyst count unavailable'}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>EPS {formatEps(row.epsEstimate)}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          row.revisionDirection === 'up'
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.revisionDirection === 'down'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {row.revisionDirection}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'options' && options ? (
        <div className="space-y-6">
          {(() => {
            const tone = biasTone(options.summary.positioningBias);
            const Icon = tone.icon;
            return (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>Options Positioning Bias</CardTitle>
                      <CardDescription>{options.summary.positioningDetail}</CardDescription>
                    </div>
                    <div className={`rounded-xl p-3 ${tone.pill}`}>
                      <Icon className={`h-5 w-5 ${tone.accent}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.pill}`}>
                    {tone.label}
                  </span>
                  {options.note ? <p className="mt-4 text-sm text-slate-600">{options.note}</p> : null}
                </CardContent>
              </Card>
            );
          })()}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Put/Call OI" value={formatRatio(options.summary.putCallOiRatio)} subtext="Open interest ratio" />
            <StatCard label="Put/Call Volume" value={formatRatio(options.summary.putCallVolumeRatio)} subtext="Near-term flow ratio" />
            <StatCard label="ATM IV" value={options.summary.atmImpliedVol != null ? `${(options.summary.atmImpliedVol * 100).toFixed(1)}%` : '—'} />
            <StatCard label="Put Skew" value={options.summary.putSkew != null ? `${(options.summary.putSkew * 100).toFixed(1)} pts` : '—'} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <StatCard label="Call OI" value={options.summary.totalCallOi.toLocaleString()} />
            <StatCard label="Put OI" value={options.summary.totalPutOi.toLocaleString()} />
            <StatCard label="Call Volume" value={options.summary.totalCallVolume.toLocaleString()} />
            <StatCard label="Put Volume" value={options.summary.totalPutVolume.toLocaleString()} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Unusual Activity</CardTitle>
              <CardDescription>
                Contracts with the highest volume-to-open-interest ratio in the near-term chain
                {options.asOfDate ? ` as of ${options.asOfDate}` : ''}.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Strike</th>
                    <th className="px-3 py-2 font-medium">Expiry</th>
                    <th className="px-3 py-2 font-medium">Volume</th>
                    <th className="px-3 py-2 font-medium">OI</th>
                    <th className="px-3 py-2 font-medium">Vol/OI</th>
                    <th className="px-3 py-2 font-medium">IV</th>
                  </tr>
                </thead>
                <tbody>
                  {options.unusualContracts.map((contract) => (
                    <tr key={contract.contractId} className="border-b border-slate-100">
                      <td className="px-3 py-3 uppercase text-slate-900">{contract.type}</td>
                      <td className="px-3 py-3">${contract.strike.toFixed(2)}</td>
                      <td className="px-3 py-3">{contract.expiration}</td>
                      <td className="px-3 py-3">{contract.volume.toLocaleString()}</td>
                      <td className="px-3 py-3">{contract.openInterest.toLocaleString()}</td>
                      <td className="px-3 py-3">{contract.volumeOiRatio != null ? contract.volumeOiRatio.toFixed(2) : '—'}</td>
                      <td className="px-3 py-3">
                        {contract.impliedVolatility != null ? `${(contract.impliedVolatility * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {result?.emptyState ? (
        <Card>
          <CardContent className="py-8 text-sm text-slate-600">{result.emptyState}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
