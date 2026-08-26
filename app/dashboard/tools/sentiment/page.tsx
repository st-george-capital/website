'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { RelatedResearchTools } from '@/components/related-research-tools';
import { ToolReadingGuide } from '@/components/tool-reading-guide';
import { getToolReadingGuide } from '@/lib/tool-reading-guides';
import type { SentimentLabel, SentimentResponsePayload } from '@/lib/sentiment';
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Globe2,
  MessageSquareText,
  Newspaper,
  Radar,
  RefreshCw,
  Search,
  Sparkles,
  Tags,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';

type ArticleFilter = 'all' | SentimentLabel;

function sentimentTone(label: SentimentLabel) {
  switch (label) {
    case 'bullish':
      return {
        text: 'Bullish',
        pill: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        accent: 'text-emerald-700',
        icon: TrendingUp,
      };
    case 'bearish':
      return {
        text: 'Bearish',
        pill: 'bg-red-100 text-red-800 border border-red-200',
        accent: 'text-red-700',
        icon: TrendingDown,
      };
    default:
      return {
        text: 'Neutral',
        pill: 'bg-slate-100 text-slate-700 border border-slate-200',
        accent: 'text-slate-700',
        icon: Radar,
      };
  }
}

function confidenceTone(confidence: 'low' | 'medium' | 'high') {
  if (confidence === 'high') return 'text-emerald-700';
  if (confidence === 'medium') return 'text-amber-700';
  return 'text-slate-600';
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatPrice(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return `$${value.toFixed(2)}`;
}

function ArticleTonePill({ label }: { label: SentimentLabel }) {
  const tone = sentimentTone(label);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.pill}`}>
      {tone.text}
    </span>
  );
}

function SocialScoreCard({
  title,
  source,
}: {
  title: string;
  source: NonNullable<SentimentResponsePayload['socialOverlay']>['reddit'];
}) {
  const tone = source.overallLabel ? sentimentTone(source.overallLabel) : sentimentTone('neutral');

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</div>
          <div className="mt-2 flex items-center gap-2">
            {source.overallLabel ? <ArticleTonePill label={source.overallLabel} /> : null}
            <span className="text-sm text-slate-500">{source.status}</span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${source.overallLabel ? tone.accent : 'text-slate-400'}`}>
            {source.overallScore != null ? `${source.overallScore > 0 ? '+' : ''}${source.overallScore.toFixed(2)}` : '—'}
          </div>
          <div className="text-xs text-slate-500">
            {source.sampleCount} sample{source.sampleCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {source.note && (
        <p className="mt-3 text-sm leading-6 text-slate-600">{source.note}</p>
      )}

      {source.topMentions.length > 0 && (
        <div className="mt-4 space-y-3">
          {source.topMentions.slice(0, 3).map((mention) => (
            <div key={`${mention.source}-${mention.title}-${mention.publishedAt || ''}`} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{mention.title}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                    {mention.source}{mention.publishedAt ? ` · ${formatDateTime(mention.publishedAt)}` : ''}
                  </div>
                </div>
                <div className={`text-sm font-semibold ${mention.score >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {mention.score > 0 ? '+' : ''}{mention.score.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DriverList({
  title,
  label,
  items,
}: {
  title: string;
  label: SentimentLabel;
  items: SentimentResponsePayload['bullishDrivers'];
}) {
  const tone = sentimentTone(label);
  const Icon = tone.icon;

  return (
    <Card className="hover:shadow-none">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${label === 'bullish' ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <Icon className={`h-5 w-5 ${tone.accent}`} />
          </div>
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>
              {items.length ? 'Most relevant recent evidence in the live news flow.' : 'No strong articles in this direction for the selected window.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length ? items.map((item) => (
          <div key={`${item.url}-${item.publishedAt}`} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{item.headline}</h4>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                  {item.source} · {formatDateTime(item.publishedAt)}
                </p>
              </div>
              <span className={`text-xs font-semibold ${tone.accent}`}>
                {item.score > 0 ? '+' : ''}{item.score.toFixed(2)}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{item.detail}</p>
          </div>
        )) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            Try broadening the horizon or removing the keyword filter.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SentimentToolPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [query, setQuery] = useState('');
  const [keyword, setKeyword] = useState('');
  const [peers, setPeers] = useState('');
  const [horizon, setHorizon] = useState('7');
  const [articleFilter, setArticleFilter] = useState<ArticleFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SentimentResponsePayload | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [router, status]);

  const visibleArticles = useMemo(() => {
    if (!result) return [];
    if (articleFilter === 'all') return result.articles;
    return result.articles.filter((article) => article.articleSentimentLabel === articleFilter);
  }, [articleFilter, result]);

  async function analyzeSymbol(symbolOrQuery: string) {
    if (!symbolOrQuery.trim()) {
      setError('Enter a ticker or company to analyze.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        query: symbolOrQuery.trim(),
        horizon,
      });

      if (keyword.trim()) {
        params.set('keyword', keyword.trim());
      }

      if (peers.trim()) {
        params.set('peers', peers.trim());
      }

      const response = await fetch(`/api/dashboard/sentiment?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze sentiment');
      }

      setResult(data);
      setArticleFilter('all');

      if (data.entity?.symbol) {
        router.replace(`/dashboard/tools/sentiment?symbol=${encodeURIComponent(data.entity.symbol)}`);
      }
    } catch (fetchError) {
      setResult(null);
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to analyze sentiment');
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await analyzeSymbol(query);
  }

  useEffect(() => {
    const symbol = searchParams.get('symbol');
    if (symbol) {
      setQuery(symbol);
    }
  }, [searchParams]);

  useEffect(() => {
    const symbol = searchParams.get('symbol');
    if (!symbol || status !== 'authenticated') return;
    void analyzeSymbol(symbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, status]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-sm text-slate-500">Loading sentiment tool...</div>
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
        <Card hover={false}>
          <CardHeader>
            <CardTitle>Sentiment Tool</CardTitle>
            <CardDescription>
              Visitor accounts cannot access live research tools. Contact an admin if you need member access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const overallTone = result ? sentimentTone(result.snapshot.overallSentimentLabel) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/dashboard/tools" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to tools
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Sentiment Tool</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Pull live Alpha Vantage news sentiment for a ticker or company, organize the recent tape into bullish and bearish drivers,
            and translate the flow into an investment-focused memo view.
          </p>
        </div>
      </div>

      {getToolReadingGuide('sentiment') ? (
        <ToolReadingGuide
          guide={getToolReadingGuide('sentiment')!}
          symbol={result?.entity.symbol}
          defaultOpen={false}
          compact
        />
      ) : null}

      <Card hover={false} className="overflow-visible border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_45%,#eef4ff_100%)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b1f3a] text-white">
              <MessageSquareText className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">Live News Read</CardTitle>
              <CardDescription>
                Ticker-first analysis with optional keyword narrowing.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-[1.15fr_1fr_1fr_180px_auto]" onSubmit={handleAnalyze}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Ticker or company</label>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="MSFT or Microsoft"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Keyword / topic</label>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Copilot, Azure, margins..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Peers</label>
              <input
                value={peers}
                onChange={(event) => setPeers(event.target.value)}
                placeholder="GOOGL, AMZN, ORCL"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Horizon</label>
              <select
                value={horizon}
                onChange={(event) => setHorizon(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                <option value="3">Last 3 days</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full" loading={loading}>
                {!loading && <Search className="mr-2 h-4 w-4" />}
                Analyze Sentiment
              </Button>
            </div>
          </form>

          {error && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {result?.entity.symbol ? (
        <RelatedResearchTools symbol={result.entity.symbol} currentTool="sentiment" />
      ) : null}

      {result && (
        <>
          <Card hover={false} className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-950">
                      {result.entity.companyName || result.entity.symbol || result.entity.query}
                    </h2>
                    {result.entity.symbol && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {result.entity.symbol}
                      </span>
                    )}
                    {overallTone && <ArticleTonePill label={result.snapshot.overallSentimentLabel} />}
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{result.narrative.coverageSummary}</p>
                </div>

                <div className="grid min-w-[280px] grid-cols-2 gap-3 lg:w-[360px]">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Signal strength</div>
                    <div className="mt-2 text-2xl font-bold text-slate-950">{result.snapshot.signalStrength}</div>
                    <div className={`mt-1 text-xs font-medium uppercase ${confidenceTone(result.snapshot.confidence)}`}>
                      {result.snapshot.confidence} confidence
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Articles</div>
                    <div className="mt-2 text-2xl font-bold text-slate-950">{result.snapshot.articleCount}</div>
                    <div className="mt-1 text-xs text-slate-500">Latest {formatDateTime(result.snapshot.latestPublishedAt)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bullish / Bearish</div>
                    <div className="mt-2 text-lg font-bold text-slate-950">
                      {result.snapshot.bullishCount} / {result.snapshot.bearishCount}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{result.snapshot.neutralCount} neutral articles</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Price context</div>
                    <div className="mt-2 text-lg font-bold text-slate-950">
                      {formatPrice(result.priceContext?.currentPrice)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      1D {formatPercent(result.priceContext?.dayChangePercent)} · 5D {formatPercent(result.priceContext?.trailingFiveDayReturn)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-[#0b1f3a] px-5 py-4 text-white">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-1 h-5 w-5 flex-shrink-0 text-sky-200" />
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100">Why this might matter for the stock</div>
                    <p className="mt-2 text-sm leading-6 text-white/90">{result.narrative.investmentTakeaway}</p>
                  </div>
                </div>
              </div>

              {result.emptyState && (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                  {result.emptyState}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_1.05fr_0.9fr]">
            <DriverList title="Bullish Drivers" label="bullish" items={result.bullishDrivers} />
            <DriverList title="Bearish Drivers" label="bearish" items={result.bearishDrivers} />

            <Card className="hover:shadow-none">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <RefreshCw className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Recent Sentiment Trend</CardTitle>
                    <CardDescription>
                      Average sentiment across the most recent article buckets.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.trend.length ? result.trend.map((point) => {
                  const width = `${Math.min(100, Math.max(8, Math.abs(point.averageSentiment) * 120))}%`;
                  const barClass = point.averageSentiment >= 0
                    ? 'bg-emerald-500'
                    : 'bg-red-500';

                  return (
                    <div key={point.label}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>{point.label}</span>
                        <span>{point.articleCount} article{point.articleCount === 1 ? '' : 's'}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${barClass}`} style={{ width }} />
                      </div>
                      <div className="mt-1 text-right text-xs font-medium text-slate-600">
                        {point.averageSentiment > 0 ? '+' : ''}{point.averageSentiment.toFixed(2)}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-sm text-slate-500">Not enough article flow to build a trend yet.</div>
                )}

                {result.priceContext?.divergenceSignal && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                    {result.priceContext.divergenceSignal}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_0.95fr_1.1fr]">
            <Card className="hover:shadow-none">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <Globe2 className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Source Breakdown</CardTitle>
                    <CardDescription>
                      Weighted contribution by source, so repeated syndication does not overpower the read.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.sourceBreakdown.length ? result.sourceBreakdown.map((source) => (
                  <div key={source.source} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{source.source}</div>
                        <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                          {source.articleCount} article{source.articleCount === 1 ? '' : 's'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${source.averageSentiment >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          Avg {source.averageSentiment > 0 ? '+' : ''}{source.averageSentiment.toFixed(2)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Weight {source.weightedContribution > 0 ? '+' : ''}{source.weightedContribution.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-slate-500">No source mix available yet.</div>
                )}
              </CardContent>
            </Card>

            <Card className="hover:shadow-none">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <Tags className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">What The News Is Saying</CardTitle>
                    <CardDescription>
                      Event buckets showing what is actually driving the current tape.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.eventBreakdown.length ? result.eventBreakdown.map((event) => (
                  <div key={event.tag} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold capitalize text-slate-900">{event.tag}</div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                        {event.articleCount} article{event.articleCount === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${event.averageSentiment >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {event.averageSentiment > 0 ? '+' : ''}{event.averageSentiment.toFixed(2)}
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-slate-500">No event tagging available yet.</div>
                )}
              </CardContent>
            </Card>

            <Card className="hover:shadow-none">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <Users className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Peer Comparison</CardTitle>
                    <CardDescription>
                      Compare the name against peers to see whether tone is idiosyncratic or sector-wide.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.peerComparison?.length ? result.peerComparison.map((peer) => (
                  <div key={peer.symbol} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{peer.symbol}</div>
                        <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                          {peer.companyName || 'Peer comparison'}
                        </div>
                      </div>
                      <ArticleTonePill label={peer.overallSentimentLabel} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                      <span>Signal {peer.signalStrength}</span>
                      <span>{peer.overallSentimentScore > 0 ? '+' : ''}{peer.overallSentimentScore.toFixed(2)}</span>
                      <span>{peer.articleCount} articles</span>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    Add peers like <span className="font-medium text-slate-700">GOOGL, AMZN, ORCL</span> to compare the live read.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {result.socialOverlay && (
            <Card hover={false} className="border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_45%,#eef4ff_100%)]">
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b1f3a] text-white">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Supplementary Social Overlay</CardTitle>
                      <CardDescription>
                        Separate Reddit and X read layered on top of the core live news signal.
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {result.socialOverlay.overallSupplementaryLabel ? (
                      <ArticleTonePill label={result.socialOverlay.overallSupplementaryLabel} />
                    ) : null}
                    <div className="text-sm text-slate-600">
                      Overlay score{' '}
                      <span className="font-semibold text-slate-900">
                        {result.socialOverlay.overallSupplementaryScore != null
                          ? `${result.socialOverlay.overallSupplementaryScore > 0 ? '+' : ''}${result.socialOverlay.overallSupplementaryScore.toFixed(2)}`
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-5 xl:grid-cols-2">
                  <SocialScoreCard title="Reddit" source={result.socialOverlay.reddit} />
                  <SocialScoreCard title="X" source={result.socialOverlay.x} />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Reference models</div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {result.socialOverlay.referenceModels.map((model) => (
                      <a
                        key={model.url}
                        href={model.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {model.name}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card hover={false} className="border-slate-200">
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <Newspaper className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Recent Article Feed</CardTitle>
                    <CardDescription>
                      The most relevant live articles behind the current sentiment read.
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'bullish', 'neutral', 'bearish'] as ArticleFilter[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setArticleFilter(option)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                        articleFilter === option
                          ? 'bg-[#0b1f3a] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {visibleArticles.length ? visibleArticles.map((article) => (
                <div key={article.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ArticleTonePill label={article.articleSentimentLabel} />
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          {article.source} · {formatDateTime(article.publishedAt)}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold leading-7 text-slate-950">{article.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{article.summary}</p>
                      {article.topics.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {article.topics.slice(0, 4).map((topic) => (
                            <span key={topic} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                      {article.eventTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {article.eventTags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="lg:pl-4 lg:text-right">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Score</div>
                      <div className={`mt-1 text-lg font-bold ${sentimentTone(article.articleSentimentLabel).accent}`}>
                        {article.articleSentimentScore > 0 ? '+' : ''}{article.articleSentimentScore.toFixed(2)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">Relevance {article.relevanceScore.toFixed(2)}</div>
                      <div className="mt-1 text-xs text-slate-500">Source weight {article.sourceWeight.toFixed(2)}</div>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#0b1f3a] hover:underline"
                      >
                        Open article
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                  No articles match the current feed filter.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
