'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { AlertCircle, Loader2, Radar, RefreshCw, Route, Save, ShieldAlert, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  TradeBriefsPayload,
  TradeRadarRefreshPayload,
  TradeRadarSummaryPayload,
  TradeRoutesPayload,
  TradeSignalDetailPayload,
  TradeSignalsPayload,
  TradeWatchlistsPayload,
} from '@/lib/trade-radar/types';

type TabId = 'radar' | 'watchlists' | 'routes' | 'briefs';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'radar', label: 'Radar' },
  { id: 'watchlists', label: 'Watchlists' },
  { id: 'routes', label: 'Routes' },
  { id: 'briefs', label: 'Briefs' },
];

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body as T;
}

function formatPct(value: number | null) {
  if (value == null) return 'n/a';
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(0)}%`;
}

function formatNumber(value: number | null) {
  if (value == null) return 'n/a';
  return value.toFixed(1);
}

function severityTone(bucket: string) {
  if (bucket === 'critical') return 'bg-red-100 text-red-700';
  if (bucket === 'high') return 'bg-orange-100 text-orange-700';
  if (bucket === 'medium') return 'bg-yellow-100 text-yellow-700';
  return 'bg-slate-100 text-slate-700';
}

function TradeSummaryCards({ summary }: { summary: TradeRadarSummaryPayload | null }) {
  const items = [
    { label: 'Active High-Severity Signals', value: summary?.totals.activeHighSeveritySignals ?? '—', sub: 'critical + high this week' },
    { label: 'Biggest Parent Acceleration', value: summary?.totals.biggestParentAcceleration ?? '—', sub: 'largest parent-linked shift' },
    { label: 'Top Substitution Corridor', value: summary?.totals.biggestSubstitutionCorridor ?? '—', sub: 'route rerouting signal' },
    { label: 'Top Theme', value: summary?.totals.topTheme ?? '—', sub: 'highest-signal theme' },
    { label: 'Coverage Health', value: summary?.totals.coverageHealth ?? '—', sub: 'latest ingest run' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label} className="hover:shadow-none">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-[0.14em] text-slate-500">{item.label}</CardDescription>
            <CardTitle className="text-xl font-semibold leading-tight text-slate-900">{item.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">{item.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TradeRadarPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<TabId>('radar');
  const [summary, setSummary] = useState<TradeRadarSummaryPayload | null>(null);
  const [signals, setSignals] = useState<TradeSignalsPayload | null>(null);
  const [watchlists, setWatchlists] = useState<TradeWatchlistsPayload | null>(null);
  const [routes, setRoutes] = useState<TradeRoutesPayload | null>(null);
  const [briefs, setBriefs] = useState<TradeBriefsPayload | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<TradeSignalDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    country: '',
    signalType: '',
    themeKey: '',
    severityBucket: '',
    q: '',
  });
  const [refreshing, setRefreshing] = useState(false);
  const isAdmin = session?.user?.role === 'admin';

  const signalQuery = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, signalsData, watchlistsData, routesData, briefsData] = await Promise.all([
        readJson<TradeRadarSummaryPayload>('/api/dashboard/trade-radar/summary'),
        readJson<TradeSignalsPayload>(`/api/dashboard/trade-radar/signals?${signalQuery}`),
        readJson<TradeWatchlistsPayload>('/api/dashboard/trade-radar/watchlists'),
        readJson<TradeRoutesPayload>('/api/dashboard/trade-radar/routes'),
        readJson<TradeBriefsPayload>('/api/dashboard/trade-radar/briefs'),
      ]);
      setSummary(summaryData);
      setSignals(signalsData);
      setWatchlists(watchlistsData);
      setRoutes(routesData);
      setBriefs(briefsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [signalQuery]);

  async function openSignal(id: string) {
    setDetailLoading(true);
    try {
      const payload = await readJson<TradeSignalDetailPayload>(`/api/dashboard/trade-radar/signals/${id}`);
      setSelectedSignal(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveWatchlist() {
    if (!selectedSignal) return;
    const signal = selectedSignal.signal;
    await readJson('/api/dashboard/trade-radar/watchlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        watchType: signal.parentName ? 'parent' : signal.entityName ? 'entity' : signal.themeKey ? 'theme' : signal.routeKey ? 'route' : 'hs6',
        label: signal.parentName ?? signal.entityName ?? signal.themeLabel ?? signal.routeKey ?? signal.hs6 ?? signal.title,
        parentEntityId: (signal.detail.parentEntityId as string | undefined) ?? null,
        entityId: (signal.detail.entityId as string | undefined) ?? null,
        themeKey: signal.themeKey,
        hs6: signal.hs6,
        routeKey: signal.routeKey,
      }),
    });
    const updated = await readJson<TradeWatchlistsPayload>('/api/dashboard/trade-radar/watchlists');
    setWatchlists(updated);
  }

  async function refreshPipeline() {
    setRefreshing(true);
    setError(null);
    try {
      await readJson<TradeRadarRefreshPayload>('/api/dashboard/trade-radar/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullRefresh: false }),
      });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Radar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Trade Shift Radar</h1>
              <p className="text-slate-600">
                Weekly Panjiva-based signal engine for cross-border trade shifts, rerouting, and parent-level exposure changes.
              </p>
            </div>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={refreshPipeline}
            disabled={refreshing}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh Weekly Pipeline
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <TradeSummaryCards summary={summary} />

      <Tabs value={tab} onValueChange={(value) => setTab(value as TabId)}>
        <TabsList className="h-auto flex-wrap gap-2 rounded-none border-b border-slate-200 bg-transparent p-0 pb-2">
          {TABS.map((item) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              className="rounded-full border-0 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <>
          {tab === 'radar' && (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
              <div className="space-y-6">
                <Card hover={false}>
                  <CardHeader>
                    <CardTitle className="text-xl text-slate-900">Signal Filters</CardTitle>
                    <CardDescription>Filter the latest weekly signal run by country, theme, type, and free text.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-5">
                    <input
                      value={filters.q}
                      onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))}
                      placeholder="Search route, HS6, theme, explanation"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                    />
                    <select
                      value={filters.country}
                      onChange={(e) => setFilters((current) => ({ ...current, country: e.target.value }))}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">All countries</option>
                      {signals?.filters.countries.map((country) => <option key={country} value={country}>{country}</option>)}
                    </select>
                    <select
                      value={filters.signalType}
                      onChange={(e) => setFilters((current) => ({ ...current, signalType: e.target.value }))}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">All signal types</option>
                      {signals?.filters.signalTypes.map((signalType) => <option key={signalType} value={signalType}>{signalType.replace(/_/g, ' ')}</option>)}
                    </select>
                    <select
                      value={filters.severityBucket}
                      onChange={(e) => setFilters((current) => ({ ...current, severityBucket: e.target.value }))}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">All severities</option>
                      {signals?.filters.severityBuckets.map((bucket) => <option key={bucket} value={bucket}>{bucket}</option>)}
                    </select>
                  </CardContent>
                </Card>

                <Card hover={false}>
                  <CardHeader>
                    <CardTitle className="text-xl text-slate-900">Latest Ranked Signals</CardTitle>
                    <CardDescription>
                      {signals?.total ?? 0} signals for {signals?.latestWeek ? new Date(signals.latestWeek).toLocaleDateString() : 'latest run'}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {signals?.items.length ? signals.items.map((signal) => (
                      <button
                        key={signal.id}
                        onClick={() => openSignal(signal.id)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${severityTone(signal.severityBucket)}`}>
                                {signal.severityBucket}
                              </span>
                              <span className="text-xs uppercase tracking-[0.14em] text-slate-500">{signal.signalType.replace(/_/g, ' ')}</span>
                              {signal.themeLabel && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{signal.themeLabel}</span>}
                            </div>
                            <h3 className="mt-2 text-lg font-semibold text-slate-900">{signal.title}</h3>
                            <p className="mt-1 text-sm text-slate-600">{signal.explanation}</p>
                          </div>
                          <div className="rounded-xl bg-slate-900 px-3 py-2 text-center text-white">
                            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-300">Score</div>
                            <div className="text-xl font-semibold">{signal.signalScore.toFixed(0)}</div>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-5">
                          <div>
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Country</div>
                            <div>{signal.sourceCountry ?? '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Route</div>
                            <div>{signal.routeKey ?? '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Raw vs Median</div>
                            <div>{formatNumber(signal.metrics.rawValue)} / {formatNumber(signal.metrics.baselineMedian)}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Robust Z</div>
                            <div>{formatNumber(signal.metrics.baselineRobustZ)}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">YoY</div>
                            <div>{formatPct(signal.metrics.yoyDelta)}</div>
                          </div>
                        </div>
                      </button>
                    )) : (
                      <div className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center text-slate-500">
                        No signals matched the current filters.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card hover={false} className="xl:sticky xl:top-24 xl:h-fit">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl text-slate-900">Signal Explanation</CardTitle>
                      <CardDescription>Inspect time series, counterparties, and watchlist actions for the selected signal.</CardDescription>
                    </div>
                    {selectedSignal && (
                      <button
                        onClick={saveWatchlist}
                        className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Watchlist
                      </button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {detailLoading ? (
                    <div className="flex min-h-[240px] items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                    </div>
                  ) : selectedSignal ? (
                    <>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${severityTone(selectedSignal.signal.severityBucket)}`}>
                            {selectedSignal.signal.severityBucket}
                          </span>
                          {selectedSignal.signal.marketTags.map((tag) => (
                            <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{tag}</span>
                          ))}
                        </div>
                        <h3 className="mt-3 text-xl font-semibold text-slate-900">{selectedSignal.signal.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{selectedSignal.signal.explanation}</p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-4">
                          <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Route and Product</div>
                          <div className="mt-2 text-sm text-slate-700">
                            <div>Route: {selectedSignal.signal.routeKey ?? '—'}</div>
                            <div>HS6: {selectedSignal.signal.hs6 ?? '—'}</div>
                            <div>Theme: {selectedSignal.signal.themeLabel ?? '—'}</div>
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4">
                          <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Metric Snapshot</div>
                          <div className="mt-2 text-sm text-slate-700">
                            <div>Raw value: {formatNumber(selectedSignal.signal.metrics.rawValue)}</div>
                            <div>Baseline median: {formatNumber(selectedSignal.signal.metrics.baselineMedian)}</div>
                            <div>Robust z-score: {formatNumber(selectedSignal.signal.metrics.baselineRobustZ)}</div>
                            <div>4-week momentum: {formatPct(selectedSignal.signal.metrics.shortMomentum)}</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Time Series</h4>
                        <div className="mt-3 space-y-2">
                          {selectedSignal.timeSeries.slice(-8).map((point) => (
                            <div key={point.weekStart} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                              <div className="flex items-center justify-between">
                                <span>{new Date(point.weekStart).toLocaleDateString()}</span>
                                <span>{point.shipmentCount} shipments</span>
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                value/kg {formatNumber(point.avgValuePerKg)} · counterparties {point.uniqueCounterparties}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Top Counterparties</h4>
                        <div className="mt-3 space-y-2">
                          {selectedSignal.counterparties.length ? selectedSignal.counterparties.map((counterparty) => (
                            <div key={counterparty.name} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-medium text-slate-900">{counterparty.name}</div>
                                  <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{counterparty.role}</div>
                                </div>
                                <div className="text-right text-xs text-slate-500">
                                  <div>{counterparty.shipmentCount} shipments</div>
                                  <div>{counterparty.totalValue != null ? `$${counterparty.totalValue.toFixed(0)}` : 'n/a'}</div>
                                </div>
                              </div>
                            </div>
                          )) : (
                            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                              No counterparty breakdown is available for this slice yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 text-center text-slate-500">
                      <Sparkles className="mb-3 h-8 w-8 text-slate-400" />
                      Select a signal from the radar table to inspect its time series and counterparties.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {tab === 'watchlists' && (
            <Card hover={false}>
              <CardHeader>
                <CardTitle className="text-xl text-slate-900">Saved Watchlists</CardTitle>
                <CardDescription>Track parents, entities, themes, routes, and HS6 slices across weekly signal runs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {watchlists?.items.length ? watchlists.items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{item.watchType}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{item.scope}</span>
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.label}</h3>
                        {item.notes && <p className="mt-1 text-sm text-slate-600">{item.notes}</p>}
                      </div>
                      {item.latestSignal && (
                        <button
                          onClick={() => {
                            setTab('radar');
                            openSignal(item.latestSignal!.id);
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          View latest signal
                        </button>
                      )}
                    </div>
                    <div className="mt-3 text-sm text-slate-500">
                      {item.latestSignal
                        ? `${item.latestSignal.signalType.replace(/_/g, ' ')} · score ${item.latestSignal.signalScore.toFixed(0)}`
                        : 'No matching signal in the latest weekly run.'}
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center text-slate-500">
                    Save a signal from the Radar tab to start building a watchlist.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {tab === 'routes' && (
            <Card hover={false}>
              <CardHeader>
                <CardTitle className="text-xl text-slate-900">Route and Rerouting Monitor</CardTitle>
                <CardDescription>Country-to-country corridor changes and substitution patterns flagged in the latest run.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {routes?.items.length ? routes.items.map((route) => (
                  <div key={`${route.routeKey}-${route.themeLabel}`} className="rounded-xl border border-slate-200 px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-slate-900">
                          <Route className="h-4 w-4" />
                          <h3 className="text-lg font-semibold">{route.routeKey}</h3>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{route.explanation}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {route.themeLabel && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{route.themeLabel}</span>}
                          {route.sourceCountry && route.destinationCountry && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                              {route.sourceCountry} → {route.destinationCountry}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-900 px-3 py-2 text-center text-white">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-300">Score</div>
                        <div className="text-xl font-semibold">{route.score.toFixed(0)}</div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Weekly shipments</div>
                        <div>{route.shipmentCount ?? 'n/a'}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-400">Weekly value</div>
                        <div>{route.totalValue != null ? `$${route.totalValue.toFixed(0)}` : 'n/a'}</div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center text-slate-500">
                    No route-level shifts have been surfaced yet.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {tab === 'briefs' && (
            <Card hover={false}>
              <CardHeader>
                <CardTitle className="text-xl text-slate-900">Generated Weekly Briefs</CardTitle>
                <CardDescription>Draft markdown briefs generated from the latest ranked signal set.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {briefs?.items.length ? briefs.items.map((brief) => (
                  <div key={brief.id} className="rounded-xl border border-slate-200 px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{brief.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{brief.description ?? 'No description provided.'}</p>
                        <div className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">
                          {brief.publishDate ? `publish date ${new Date(brief.publishDate).toLocaleDateString()}` : 'draft'}
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/weekly/${brief.id}/view`}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Open brief
                      </Link>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center text-slate-500">
                    No trade radar briefs have been generated yet.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {summary?.coverage.warnings.length ? (
        <Card hover={false}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg text-slate-900">Coverage Notes</CardTitle>
            </div>
            <CardDescription>These warnings came from the latest ingest run and help interpret unstable or missing slices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            {summary.coverage.warnings.map((warning, index) => (
              <div key={`${warning}-${index}`} className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
                {warning}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
