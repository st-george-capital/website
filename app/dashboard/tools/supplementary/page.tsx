'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  FileText,
  Inbox,
  LineChart,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { cn, formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import type {
  SupplementaryEstimateRow,
  SupplementaryResponsePayload,
  SupplementaryTab,
} from '@/lib/supplementary';

const tabs: Array<{
  id: SupplementaryTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    id: 'transcript',
    label: 'Transcript',
    icon: FileText,
    description: 'Prepared remarks, Q&A split, tone, and notable passages.',
  },
  {
    id: 'insider',
    label: 'Insider',
    icon: Users,
    description: 'Directional insider activity, cluster context, and transaction tape.',
  },
  {
    id: 'estimates',
    label: 'Estimates',
    icon: LineChart,
    description: 'Forward EPS and revenue estimates with coverage context.',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: CalendarClock,
    description: 'Upcoming earnings events across the next reporting window.',
  },
];

function looksLikeTicker(value: string) {
  return /^[A-Za-z.\-]{1,8}$/.test(value.trim());
}

function formatMoneyCompact(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  if (Math.abs(value) >= 1_000_000_000) return `${value < 0 ? '-' : ''}$${(Math.abs(value) / 1_000_000_000).toFixed(2)}bn`;
  if (Math.abs(value) >= 1_000_000) return `${value < 0 ? '-' : ''}$${(Math.abs(value) / 1_000_000).toFixed(1)}m`;
  return formatCurrency(value);
}

function formatOptionalDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return formatDate(value);
  } catch {
    return value;
  }
}

function EstimateRevisionPill({ direction }: { direction: SupplementaryEstimateRow['revisionDirection'] }) {
  const classes =
    direction === 'up'
      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
      : direction === 'down'
        ? 'bg-red-100 text-red-800 border border-red-200'
        : direction === 'flat'
          ? 'bg-slate-100 text-slate-700 border border-slate-200'
          : 'bg-amber-50 text-amber-700 border border-amber-200';

  const label =
    direction === 'up'
      ? 'Revisions Up'
      : direction === 'down'
        ? 'Revisions Down'
        : direction === 'flat'
          ? 'Flat'
          : 'No Revision Read';

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${classes}`}>{label}</span>;
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-slate-950">{value}</div>
      {subtext ? <div className="mt-1 text-xs text-slate-500">{subtext}</div> : null}
    </div>
  );
}

export default function SupplementaryToolsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [activeTab, setActiveTab] = useState<SupplementaryTab>('transcript');
  const [query, setQuery] = useState('');
  const [quarter, setQuarter] = useState('');
  const [horizon, setHorizon] = useState<'3month' | '6month' | '12month'>('3month');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Partial<Record<SupplementaryTab, SupplementaryResponsePayload>>>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [router, status]);

  const currentResult = results[activeTab] || null;

  const transcriptQuarterOptions = useMemo(
    () => currentResult?.transcript?.availableQuarters || [],
    [currentResult]
  );

  async function loadTab(tab = activeTab) {
    if (tab !== 'calendar' && !query.trim()) {
      setError('Enter a ticker or company first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ tab });

      if (query.trim()) {
        params.set(looksLikeTicker(query.trim()) ? 'symbol' : 'query', query.trim());
      }

      if (tab === 'transcript' && quarter.trim()) {
        params.set('quarter', quarter.trim());
      }

      if (tab === 'calendar') {
        params.set('horizon', horizon);
      }

      const response = await fetch(`/api/dashboard/supplementary?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load supplementary data');
      }

      setResults((previous) => ({
        ...previous,
        [tab]: data,
      }));

      if (tab === 'transcript' && data.transcript?.selectedQuarter) {
        setQuarter(data.transcript.selectedQuarter.replace(/^Q([1-4]) (\d{4})$/, '$2Q$1'));
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load supplementary data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'calendar' && !results.calendar) {
      void loadTab('calendar');
    }
    // Intentional: only prime the calendar tab once when it becomes active.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-sm text-slate-500">Loading supplementary tools...</div>
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
            <CardTitle>Supplementary Tools</CardTitle>
            <CardDescription>
              Visitor accounts cannot access live research tooling. Contact an admin if you need member access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/dashboard/tools" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to tools
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Supplementary Tools</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            A research support desk for transcript reads, insider tape, forward estimate context, and the upcoming earnings calendar.
          </p>
        </div>
      </div>

      <Card hover={false} className="overflow-visible border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f7fbff_45%,#eef4ff_100%)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b1f3a] text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">Research Support Desk</CardTitle>
              <CardDescription>
                Alpha Vantage overlays that complement DCF, sentiment, and reports.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-b border-slate-200">
            <nav className="flex flex-wrap gap-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setError(null);
                    }}
                    className={cn(
                      'inline-flex items-center gap-2 border-b-2 px-1 py-2 text-sm font-medium transition',
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-700'
                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_220px_220px_auto]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {activeTab === 'calendar' ? 'Ticker filter (optional)' : 'Ticker or company'}
              </label>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={activeTab === 'calendar' ? 'Optional: MSFT' : 'MSFT or Microsoft'}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>

            {activeTab === 'transcript' ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Quarter</label>
                {transcriptQuarterOptions.length ? (
                  <select
                    value={quarter}
                    onChange={(event) => setQuarter(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    {transcriptQuarterOptions.map((option) => (
                      <option key={option} value={option.replace(/^Q([1-4]) (\d{4})$/, '$2Q$1')}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={quarter}
                    onChange={(event) => setQuarter(event.target.value)}
                    placeholder="Latest available"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                )}
              </div>
            ) : activeTab === 'calendar' ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Horizon</label>
                <select
                  value={horizon}
                  onChange={(event) => setHorizon(event.target.value as '3month' | '6month' | '12month')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  <option value="3month">Next 3 months</option>
                  <option value="6month">Next 6 months</option>
                  <option value="12month">Next 12 months</option>
                </select>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                {tabs.find((tab) => tab.id === activeTab)?.description}
              </div>
            )}

            <div className="hidden lg:block" />

            <div className="flex items-end">
              <Button onClick={() => loadTab()} className="w-full" loading={loading}>
                {!loading && <Search className="mr-2 h-4 w-4" />}
                Load {tabs.find((tab) => tab.id === activeTab)?.label}
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {currentResult?.emptyState && (
        <Card hover={false} className="border-dashed border-slate-300">
          <CardContent className="flex items-center gap-3 p-6">
            <Inbox className="h-5 w-5 text-slate-400" />
            <p className="text-sm text-slate-500">{currentResult.emptyState}</p>
          </CardContent>
        </Card>
      )}

      {currentResult?.entity.symbol && (
        <Card hover={false}>
          <CardContent className="grid gap-4 p-6 md:grid-cols-4">
            <StatCard label="Ticker" value={currentResult.entity.symbol} subtext={currentResult.entity.companyName || undefined} />
            <StatCard label="Workspace" value={tabs.find((tab) => tab.id === activeTab)?.label || activeTab} />
            <StatCard
              label="Quarter / Horizon"
              value={
                activeTab === 'transcript'
                  ? currentResult.transcript?.selectedQuarter || 'Latest'
                  : activeTab === 'calendar'
                    ? currentResult.calendar?.horizon || horizon
                    : 'Live'
              }
            />
            <StatCard
              label="Coverage"
              value={
                activeTab === 'insider'
                  ? `${currentResult.insider?.summary.transactionCount || 0} records`
                  : activeTab === 'estimates'
                    ? `${(currentResult.estimates?.quarterly.length || 0) + (currentResult.estimates?.annual.length || 0)} estimate rows`
                    : activeTab === 'calendar'
                      ? `${currentResult.calendar?.entries.length || 0} events`
                      : `${currentResult.transcript?.sections.reduce((count, section) => count + section.paragraphs.length, 0) || 0} transcript blocks`
              }
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'transcript' && currentResult?.transcript && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-4">
            <StatCard label="Management tone" value={currentResult.transcript.managementTone} />
            <StatCard label="Topics" value={String(currentResult.transcript.keyTopics.length)} />
            <StatCard label="Notable passages" value={String(currentResult.transcript.notableSnippets.length)} />
            <StatCard label="Quarter" value={currentResult.transcript.selectedQuarter || 'Latest'} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card hover={false}>
              <CardHeader>
                <CardTitle className="text-xl">Management Tone</CardTitle>
                <CardDescription>{currentResult.transcript.managementToneDetail}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Key topics mentioned</div>
                  <div className="mt-3 space-y-3">
                    {currentResult.transcript.keyTopics.map((topic) => (
                      <div key={topic.topic}>
                        <div className="mb-1 flex items-center justify-between text-sm font-medium text-slate-800">
                          <span>{topic.topic}</span>
                          <span className="text-xs text-slate-500">{topic.mentions} mentions</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-[#0b1f3a]" style={{ width: `${Math.min(100, topic.mentions * 8)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Notable passages</div>
                  <div className="mt-3 space-y-3">
                    {currentResult.transcript.notableSnippets.map((snippet, index) => (
                      <div key={`${snippet}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-700">
                        {snippet}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {currentResult.transcript.sections.map((section) => (
                <Card key={section.label} hover={false}>
                  <CardHeader>
                    <CardTitle className="text-xl">{section.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {section.paragraphs.map((paragraph, index) => (
                      <p key={`${section.label}-${index}`} className="text-sm leading-7 text-slate-700">
                        {paragraph}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'insider' && currentResult?.insider && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Buys" value={String(currentResult.insider.summary.buyCount)} />
            <StatCard label="Sells" value={String(currentResult.insider.summary.sellCount)} />
            <StatCard label="Net shares" value={formatNumber(Math.round(currentResult.insider.summary.netShares))} />
            <StatCard label="Most active insider" value={currentResult.insider.summary.mostActiveInsider || '—'} />
            <StatCard label="Cluster activity" value={currentResult.insider.summary.clusterActivity} />
          </div>

          <Card hover={false}>
            <CardHeader>
              <CardTitle className="text-xl">Latest Insider Tape</CardTitle>
              <CardDescription>
                Direction, sizing, and clustering matter more than any single isolated filing.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Insider</th>
                    <th className="py-3 pr-4">Title</th>
                    <th className="py-3 pr-4">Action</th>
                    <th className="py-3 pr-4 text-right">Shares</th>
                    <th className="py-3 pr-4 text-right">Price</th>
                    <th className="py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {currentResult.insider.transactions.map((transaction) => (
                    <tr key={`${transaction.insiderName}-${transaction.date}-${transaction.value}`} className="border-b border-slate-100 text-slate-700">
                      <td className="py-3 pr-4">{formatOptionalDate(transaction.date)}</td>
                      <td className="py-3 pr-4 font-medium text-slate-900">{transaction.insiderName}</td>
                      <td className="py-3 pr-4">{transaction.title || '—'}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
                            transaction.action === 'buy'
                              ? 'bg-emerald-100 text-emerald-800'
                              : transaction.action === 'sell'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-700'
                          )}
                        >
                          {transaction.action}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right">{transaction.shares != null ? formatNumber(Math.round(transaction.shares)) : '—'}</td>
                      <td className="py-3 pr-4 text-right">{transaction.sharePrice != null ? formatCurrency(transaction.sharePrice) : '—'}</td>
                      <td className="py-3 text-right">{formatMoneyCompact(transaction.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'estimates' && currentResult?.estimates && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Next period" value={currentResult.estimates.nextPeriod || '—'} />
            <StatCard label="Coverage" value={currentResult.estimates.analystCoverage != null ? `${currentResult.estimates.analystCoverage} analysts` : '—'} />
            <StatCard label="Rows" value={`${currentResult.estimates.quarterly.length} quarterly / ${currentResult.estimates.annual.length} annual`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card hover={false}>
              <CardHeader>
                <CardTitle className="text-xl">Quarterly Estimates</CardTitle>
                <CardDescription>Forward quarterly estimate tape for the next relevant reporting periods.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-3 pr-4">Period</th>
                      <th className="py-3 pr-4">Report Date</th>
                      <th className="py-3 pr-4 text-right">EPS</th>
                      <th className="py-3 pr-4 text-right">Revenue</th>
                      <th className="py-3 pr-4 text-right">Analysts</th>
                      <th className="py-3">Revision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentResult.estimates.quarterly.map((row) => (
                      <tr key={`${row.period}-${row.reportDate}`} className="border-b border-slate-100 text-slate-700">
                        <td className="py-3 pr-4 font-medium text-slate-900">{row.period}</td>
                        <td className="py-3 pr-4">{formatOptionalDate(row.reportDate)}</td>
                        <td className="py-3 pr-4 text-right">{row.epsEstimate != null ? row.epsEstimate.toFixed(2) : '—'}</td>
                        <td className="py-3 pr-4 text-right">{formatMoneyCompact(row.revenueEstimate)}</td>
                        <td className="py-3 pr-4 text-right">{row.analystCount != null ? formatNumber(Math.round(row.analystCount)) : '—'}</td>
                        <td className="py-3"><EstimateRevisionPill direction={row.revisionDirection} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card hover={false}>
              <CardHeader>
                <CardTitle className="text-xl">Annual Estimates</CardTitle>
                <CardDescription>Longer-duration estimate context, kept separate from the DCF model assumptions.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-3 pr-4">Period</th>
                      <th className="py-3 pr-4 text-right">EPS</th>
                      <th className="py-3 pr-4 text-right">Revenue</th>
                      <th className="py-3 pr-4 text-right">Analysts</th>
                      <th className="py-3">Revision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentResult.estimates.annual.map((row) => (
                      <tr key={`${row.period}-${row.reportDate || 'annual'}`} className="border-b border-slate-100 text-slate-700">
                        <td className="py-3 pr-4 font-medium text-slate-900">{row.period}</td>
                        <td className="py-3 pr-4 text-right">{row.epsEstimate != null ? row.epsEstimate.toFixed(2) : '—'}</td>
                        <td className="py-3 pr-4 text-right">{formatMoneyCompact(row.revenueEstimate)}</td>
                        <td className="py-3 pr-4 text-right">{row.analystCount != null ? formatNumber(Math.round(row.analystCount)) : '—'}</td>
                        <td className="py-3"><EstimateRevisionPill direction={row.revisionDirection} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && currentResult?.calendar && (
        <Card hover={false}>
          <CardHeader>
            <CardTitle className="text-xl">Upcoming Earnings Calendar</CardTitle>
            <CardDescription>
              Browse the near-term reporting tape or narrow to a single ticker when you want event timing context.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-3 pr-4">Report Date</th>
                  <th className="py-3 pr-4">Ticker</th>
                  <th className="py-3 pr-4">Company</th>
                  <th className="py-3 pr-4">Fiscal Period</th>
                  <th className="py-3 text-right">Estimate</th>
                </tr>
              </thead>
              <tbody>
                {currentResult.calendar.entries.map((entry) => (
                  <tr key={`${entry.symbol}-${entry.reportDate}-${entry.fiscalDateEnding}`} className="border-b border-slate-100 text-slate-700">
                    <td className="py-3 pr-4">{formatOptionalDate(entry.reportDate)}</td>
                    <td className="py-3 pr-4 font-medium text-slate-900">{entry.symbol}</td>
                    <td className="py-3 pr-4">{entry.companyName || '—'}</td>
                    <td className="py-3 pr-4">{entry.fiscalDateEnding || '—'}</td>
                    <td className="py-3 text-right">
                      {entry.estimate != null
                        ? `${entry.currency === 'USD' || !entry.currency ? '$' : `${entry.currency} `}${entry.estimate.toFixed(2)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
