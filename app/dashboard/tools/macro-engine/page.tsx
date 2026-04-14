'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
  CartesianGrid, Legend,
} from 'recharts';
import {
  AlertCircle, ArrowLeft, TrendingUp, Info, ChevronDown, ChevronRight, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import type { MacroEnginePayload } from '@/app/api/dashboard/macro-engine/route';
import type { HistoryPayload, HistoryPoint } from '@/app/api/dashboard/macro-engine/history/route';

// ─── Universe metadata ─────────────────────────────────────────────────────────

const TICKER_META: Record<string, { name: string; description: string; flag?: string }> = {
  SPY:  { name: 'S&P 500',           description: 'US large-cap equities',         flag: '🇺🇸' },
  XLK:  { name: 'Technology',        description: 'US Tech sector',                 flag: '💻' },
  XLF:  { name: 'Financials',        description: 'US Banks & Insurance',           flag: '🏦' },
  XLE:  { name: 'Energy',            description: 'US Oil, Gas & Energy',           flag: '⚡' },
  XLV:  { name: 'Health Care',       description: 'US Pharma, Biotech, Hospitals',  flag: '🏥' },
  XLI:  { name: 'Industrials',       description: 'US Defense, Aerospace, Rail',    flag: '🏭' },
  XLY:  { name: 'Cons. Discretionary', description: 'US Retail, Auto, Media',      flag: '🛍️' },
  EWJ:  { name: 'Japan',             description: 'iShares MSCI Japan',             flag: '🇯🇵' },
  EWG:  { name: 'Germany',           description: 'iShares MSCI Germany',           flag: '🇩🇪' },
  EWU:  { name: 'UK',                description: 'iShares MSCI United Kingdom',    flag: '🇬🇧' },
  MCHI: { name: 'China',             description: 'iShares MSCI China',             flag: '🇨🇳' },
  EWZ:  { name: 'Brazil',            description: 'iShares MSCI Brazil',            flag: '🇧🇷' },
  EWC:  { name: 'Canada',            description: 'iShares MSCI Canada',            flag: '🇨🇦' },
  EWA:  { name: 'Australia',         description: 'iShares MSCI Australia',         flag: '🇦🇺' },
};

function tickerLabel(ticker: string) {
  const m = TICKER_META[ticker];
  return m ? `${m.flag ?? ''} ${ticker} · ${m.name}` : ticker;
}

// ─── Regime colors ─────────────────────────────────────────────────────────────

const REGIME_COLORS: Record<string, string> = {
  'Regime-0-zCredit':    '#ef4444', // red
  'Regime-1-zMonetary':  '#f59e0b', // amber
  'Regime-2-zCredit':    '#dc2626', // darker red
  'Regime-3-zCredit':    '#f97316', // orange
};

function regimeColor(label: string): string {
  if (REGIME_COLORS[label]) return REGIME_COLORS[label];
  const l = label.toLowerCase();
  if (l.includes('monetary')) return '#f59e0b';
  if (l.includes('credit'))   return '#ef4444';
  if (l.includes('growth'))   return '#10b981';
  if (l.includes('inflation')) return '#f97316';
  return '#64748b';
}

function regimeDisplayName(label: string): string {
  const m = label.match(/^Regime-(\d+)-(.+)$/);
  if (!m) return label;
  const MAP: Record<string, string> = {
    zCredit: 'Credit Stress', zMonetary: 'Monetary Tightening',
    zGrowth: 'Growth', zInflation: 'Inflation', zEarnings: 'Earnings-Led', zCarry: 'Carry',
    neutral: 'Neutral',
  };
  return `${MAP[m[2]] ?? m[2]} (R${m[1]})`;
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function pct(v: number, decimals = 1) {
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(decimals)}%`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function colorClass(v: number, goodThreshold = 0, badThreshold = 0): string {
  if (v >= goodThreshold) return 'text-emerald-700';
  if (v <= badThreshold) return 'text-red-600';
  return 'text-slate-700';
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, good }: { label: string; value: string; sub?: string; good?: boolean | null }) {
  const color = good === true ? 'text-emerald-700' : good === false ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1.5 text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

function ConvictionBar({ value, direction }: { value: number; direction: string }) {
  const pctVal = Math.round(value * 100);
  const color = direction === 'overweight'
    ? 'bg-emerald-500'
    : direction === 'underweight'
    ? 'bg-red-400'
    : 'bg-slate-300';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pctVal}%` }} />
      </div>
      <span className="text-[11px] font-mono text-slate-500 w-7 text-right">{pctVal}%</span>
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {title}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

// ─── Performance chart ─────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { label: '1Y', months: 12 },
  { label: '2Y', months: 24 },
  { label: '4Y', months: 48 },
  { label: 'All', months: 252 },
];

function PerformanceChart() {
  const [range, setRange] = useState(24); // months
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<HistoryPoint | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const end = new Date();
    const start = new Date(end.getTime() - range * 30 * 24 * 60 * 60 * 1000);
    fetch(`/api/dashboard/macro-engine/history?start=${start.toISOString().slice(0, 10)}&end=${end.toISOString().slice(0, 10)}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => { load(); }, [load]);

  // Deduplicate by date (keep one point per month for readability in chart)
  const chartPoints = (data?.points ?? []).filter((_, i, arr) => {
    // Sample: keep every ~3rd point (weekly-ish sampling of daily feature dates)
    return i === 0 || i === arr.length - 1 || i % 3 === 0;
  }).map(p => ({
    date: p.date,
    portfolio: +((p.cumulativePortfolio - 1) * 100).toFixed(2),
    spy: +((p.cumulativeSpy - 1) * 100).toFixed(2),
    excess: +((p.excessReturn * 100).toFixed(2)),
    regime: p.regime,
  }));

  const finalPortfolio = data?.points[data.points.length - 1]?.cumulativePortfolio ?? 1;
  const finalSpy = data?.points[data.points.length - 1]?.cumulativeSpy ?? 1;
  const totalExcess = finalPortfolio - finalSpy;

  return (
    <div className="space-y-4">
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-700">Portfolio vs SPY (cumulative return, long top-half)</div>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setRange(opt.months)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                range === opt.months
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button" onClick={load}
            className="ml-1 p-1 rounded bg-slate-100 text-slate-400 hover:bg-slate-200"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {data && data.points.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span>
            Portfolio: <strong className={colorClass(finalPortfolio - 1, 0)}>{pct(finalPortfolio - 1)}</strong>
          </span>
          <span>
            SPY: <strong className={colorClass(finalSpy - 1, 0)}>{pct(finalSpy - 1)}</strong>
          </span>
          <span>
            Excess: <strong className={colorClass(totalExcess, 0.01, -0.01)}>{pct(totalExcess)}</strong>
          </span>
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="h-56 flex items-center justify-center text-sm text-slate-400">Loading...</div>
      ) : chartPoints.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm text-slate-400">No data for this range.</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={chartPoints}
            onClick={(e) => {
              if (e?.activePayload?.[0]) {
                const pt = e.activePayload[0].payload;
                setSelectedDate(pt.date);
                const full = data?.points.find(p => p.date === pt.date) ?? null;
                setSelectedPoint(full);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDateShort}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs">
                    <div className="font-semibold text-slate-700 mb-1">{fmtDate(d.date)}</div>
                    <div className="space-y-0.5">
                      <div>Portfolio: <span className={colorClass(d.portfolio, 0)}>{d.portfolio > 0 ? '+' : ''}{d.portfolio}%</span></div>
                      <div>SPY: <span className={colorClass(d.spy, 0)}>{d.spy > 0 ? '+' : ''}{d.spy}%</span></div>
                      <div className="pt-0.5 border-t border-slate-100 text-[10px] text-slate-400">{regimeDisplayName(d.regime)}</div>
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="#e2e8f0" />
            <Line
              type="monotone" dataKey="portfolio"
              stroke="#10b981" strokeWidth={2} dot={false}
              name="Portfolio (top-half long)"
            />
            <Line
              type="monotone" dataKey="spy"
              stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="4 2"
              name="SPY"
            />
            <Legend
              iconType="line" iconSize={12}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Selected date: snapshot of rankings */}
      {selectedPoint && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">{fmtDate(selectedPoint.date)}</div>
              <div className="text-[11px] text-slate-400">
                Regime: <span style={{ color: regimeColor(selectedPoint.regime) }} className="font-medium">
                  {regimeDisplayName(selectedPoint.regime)}
                </span>
              </div>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <div>Portfolio 63d fwd: <strong className={colorClass(selectedPoint.portfolioReturn, 0)}>{pct(selectedPoint.portfolioReturn)}</strong></div>
              <div>SPY 63d fwd: <strong className={colorClass(selectedPoint.spyReturn, 0)}>{pct(selectedPoint.spyReturn)}</strong></div>
              <div>Excess: <strong className={colorClass(selectedPoint.excessReturn, 0.005, -0.005)}>{pct(selectedPoint.excessReturn)}</strong></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {selectedPoint.rankings.map(r => (
              <div key={r.ticker} className="flex items-center gap-2 text-[12px]">
                <span className="w-4 text-slate-300 font-mono">{r.rank}</span>
                <span className={`w-10 font-mono font-bold ${r.direction === 'overweight' ? 'text-emerald-700' : 'text-red-500'}`}>
                  {r.ticker}
                </span>
                <span className="text-slate-400 truncate">
                  {TICKER_META[r.ticker]?.flag} {TICKER_META[r.ticker]?.name ?? ''}
                </span>
                <span className="ml-auto text-slate-300 font-mono text-[10px]">{r.score.toFixed(3)}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-slate-400">Click a different point on the chart to explore any date.</div>
        </div>
      )}
    </div>
  );
}

// ─── Back link ─────────────────────────────────────────────────────────────────

const BackLink = () => (
  <Link href="/dashboard/tools"
    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
    <ArrowLeft className="h-4 w-4" />
    Back to tools
  </Link>
);

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MacroEnginePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<MacroEnginePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/dashboard/macro-engine')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: MacroEnginePayload) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-sm text-slate-500">Loading Macro Allocation Engine...</div>
      </div>
    );
  }

  if ((session?.user as { role?: string })?.role === 'visitor') {
    return (
      <div className="space-y-6">
        <BackLink />
        <Card hover={false}>
          <CardHeader>
            <CardTitle>Macro Allocation Engine</CardTitle>
            <CardDescription>Visitor accounts cannot access live research tools.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <BackLink />
        <Card hover={false}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const regime = data?.regime ?? null;
  const rColor = regime ? regimeColor(regime.regimeLabel) : '#64748b';

  const overweight = (data?.signals ?? []).filter(s => s.direction === 'overweight');
  const underweight = (data?.signals ?? []).filter(s => s.direction === 'underweight');

  const asOfDate = data?.asOfDate ? fmtDate(data.asOfDate.slice(0, 10)) : null;

  // Factor attribution from top-ranked signal
  const topSignal = overweight[0] ?? data?.signals[0] ?? null;
  const attribution = topSignal?.factorAttribution ?? {};

  const FACTOR_DIMS = [
    { key: 'zGrowth',    label: 'Growth',    desc: 'GDP / PMI momentum' },
    { key: 'zInflation', label: 'Inflation', desc: 'CPI / PPI trend' },
    { key: 'zMonetary',  label: 'Monetary',  desc: 'Rate path (Fed Funds)' },
    { key: 'zCredit',    label: 'Credit',    desc: 'Spread dynamics' },
    { key: 'zCarry',     label: 'Carry',     desc: 'Rate differential vs USD' },
    { key: 'zEarnings',  label: 'Earnings',  desc: 'EPS revision momentum' },
  ] as const;

  return (
    <div className="space-y-8 pb-12">
      <BackLink />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <TrendingUp className="h-6 w-6 text-primary" />
            Macro Allocation Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Regime-conditional factor model · 14 global ETFs · Walk-forward backtested
          </p>
        </div>
        {asOfDate && (
          <div className="text-right text-xs text-slate-400">
            <div>Last run</div>
            <div className="font-semibold text-slate-600">{asOfDate}</div>
          </div>
        )}
      </div>

      {/* ── Row 1: Regime + Factor profile ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">

        {/* Regime — 2 cols */}
        <div className="lg:col-span-2">
          <Card hover={false} className="h-full">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Current Regime</CardTitle>
            </CardHeader>
            <CardContent>
              {!regime ? (
                <p className="text-sm text-slate-400">No regime data yet.</p>
              ) : (
                <div className="space-y-4">
                  <div
                    className="rounded-xl border p-4"
                    style={{ borderColor: rColor + '44', backgroundColor: rColor + '0d' }}
                  >
                    <div
                      className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold"
                      style={{ backgroundColor: rColor + '22', color: rColor }}
                    >
                      {regimeDisplayName(regime.regimeLabel)}
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Active since</span>
                        <span className="font-medium">{fmtDate(regime.startDate.slice(0, 10))}</span>
                      </div>
                      {regime.avgDurationDays != null && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Avg duration</span>
                          <span className="font-medium">~{Math.round(regime.avgDurationDays)}d</span>
                        </div>
                      )}
                      {regime.confidence != null && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Confidence</span>
                          <span className="font-medium">{(regime.confidence * 100).toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-[11px] text-slate-400">
                    <Info className="h-3 w-3 shrink-0 mt-0.5" />
                    4 regimes identified via k-means on 20yr of macro data. Each implies different sector factor weights.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Factor profile — 3 cols */}
        <div className="lg:col-span-3">
          <Card hover={false} className="h-full">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Macro Factor Profile</CardTitle>
              <CardDescription className="text-[11px]">
                Z-scores vs 20yr history · positive = above trend, negative = below trend
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!topSignal ? (
                <p className="text-sm text-slate-400">Run signals to populate.</p>
              ) : (
                <div className="space-y-2.5">
                  {FACTOR_DIMS.map(({ key, label, desc }) => {
                    const val = (attribution[key] as number | undefined) ?? 0;
                    const abs = Math.abs(val);
                    const barPct = Math.min(abs / 2.5, 1) * 100;
                    const isPos = val >= 0;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="w-[90px] shrink-0">
                          <div className="text-[12px] font-semibold text-slate-700">{label}</div>
                          <div className="text-[10px] text-slate-400 leading-tight">{desc}</div>
                        </div>
                        <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isPos ? 'bg-emerald-400' : 'bg-red-400'}`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <div className={`w-14 text-right text-[11px] font-mono font-semibold ${isPos ? 'text-emerald-700' : 'text-red-600'}`}>
                          {val > 0 ? '+' : ''}{val.toFixed(2)}σ
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Panel: Allocation Signals ─────────────────────────────────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Allocation Signals</CardTitle>
          <CardDescription className="text-[11px]">
            Ranked by regime-conditional conviction · P(outperf) = empirical probability of outperforming SPY over 6/12 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.signals.length ? (
            <p className="text-sm text-slate-400">No signals yet.</p>
          ) : (
            <div className="space-y-5">
              {/* Overweight */}
              {overweight.length > 0 && (
                <div>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    ↑ Overweight ({overweight.length})
                  </div>
                  <div className="space-y-2">
                    {overweight.map(s => (
                      <div key={s.ticker}
                        className="grid gap-3 rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2.5"
                        style={{ gridTemplateColumns: '1.5rem 3rem 1fr 8rem 5rem 5rem' }}>
                        <div className="text-[11px] text-slate-400 font-mono self-center">{s.rank}</div>
                        <div className="font-mono font-bold text-slate-900 self-center">{s.ticker}</div>
                        <div className="self-center">
                          <div className="text-[12px] font-medium text-slate-700">
                            {TICKER_META[s.ticker]?.flag} {TICKER_META[s.ticker]?.name ?? s.ticker}
                          </div>
                          <div className="text-[10px] text-slate-400">{TICKER_META[s.ticker]?.description}</div>
                        </div>
                        <div className="self-center">
                          <ConvictionBar value={s.convictionScore} direction={s.direction} />
                        </div>
                        <div className="text-right self-center">
                          {s.prob6m != null && (
                            <div className="text-[12px] font-semibold text-slate-700">{(s.prob6m * 100).toFixed(0)}%</div>
                          )}
                          <div className="text-[10px] text-slate-400">P(↑6m)</div>
                        </div>
                        <div className="text-right self-center">
                          {s.prob12m != null && (
                            <div className="text-[12px] font-semibold text-slate-700">{(s.prob12m * 100).toFixed(0)}%</div>
                          )}
                          <div className="text-[10px] text-slate-400">P(↑12m)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Underweight */}
              {underweight.length > 0 && (
                <div>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-red-600">
                    ↓ Underweight ({underweight.length})
                  </div>
                  <div className="space-y-2">
                    {underweight.map(s => (
                      <div key={s.ticker}
                        className="grid gap-3 rounded-lg border border-red-100 bg-red-50/40 px-3 py-2.5"
                        style={{ gridTemplateColumns: '1.5rem 3rem 1fr 8rem 5rem 5rem' }}>
                        <div className="text-[11px] text-slate-400 font-mono self-center">{s.rank}</div>
                        <div className="font-mono font-bold text-slate-900 self-center">{s.ticker}</div>
                        <div className="self-center">
                          <div className="text-[12px] font-medium text-slate-700">
                            {TICKER_META[s.ticker]?.flag} {TICKER_META[s.ticker]?.name ?? s.ticker}
                          </div>
                          <div className="text-[10px] text-slate-400">{TICKER_META[s.ticker]?.description}</div>
                        </div>
                        <div className="self-center">
                          <ConvictionBar value={s.convictionScore} direction={s.direction} />
                        </div>
                        <div className="text-right self-center">
                          {s.prob6m != null && (
                            <div className="text-[12px] font-semibold text-slate-600">{(s.prob6m * 100).toFixed(0)}%</div>
                          )}
                          <div className="text-[10px] text-slate-400">P(↑6m)</div>
                        </div>
                        <div className="text-right self-center">
                          {s.prob12m != null && (
                            <div className="text-[12px] font-semibold text-slate-600">{(s.prob12m * 100).toFixed(0)}%</div>
                          )}
                          <div className="text-[10px] text-slate-400">P(↑12m)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Panel: Historical Performance + Explorer ──────────────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Historical Performance</CardTitle>
          <CardDescription className="text-[11px]">
            Equal-weight long of top-half ranked ETFs each period · Click any point to see what the model signaled on that date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceChart />
        </CardContent>
      </Card>

      {/* ── Panel: Model Performance Metrics ─────────────────────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Model Performance</CardTitle>
          <CardDescription className="text-[11px]">
            Walk-forward OOS · {data?.metrics?.windowCount ?? '—'} quarterly windows · 63-day holding periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.metrics ? (
            <p className="text-sm text-slate-400">No backtest metrics. Run <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">npm run backtest:run</code>.</p>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {data.metrics.spy && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Out-of-Sample · {data.metrics.dataStart} – {data.metrics.holdoutStart}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <MetricCard
                        label="Hit Rate"
                        value={`${(data.metrics.spy.hitRate * 100).toFixed(1)}%`}
                        sub="Top pick direction accuracy"
                        good={data.metrics.spy.hitRate >= 0.55}
                      />
                      <MetricCard
                        label="Sharpe (Ann.)"
                        value={data.metrics.spy.sharpeAnn.toFixed(2)}
                        sub="Portfolio excess return / vol"
                        good={data.metrics.spy.sharpeAnn >= 0.3 ? true : data.metrics.spy.sharpeAnn < 0 ? false : null}
                      />
                    </div>
                  </div>
                )}
                {data.metrics.acwi && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Holdout · {data.metrics.holdoutStart} – present
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <MetricCard
                        label="Hit Rate"
                        value={`${(data.metrics.acwi.hitRate * 100).toFixed(1)}%`}
                        sub="Top pick direction accuracy"
                        good={data.metrics.acwi.hitRate >= 0.55}
                      />
                      <MetricCard
                        label="Sharpe (Ann.)"
                        value={data.metrics.acwi.sharpeAnn.toFixed(2)}
                        sub="Portfolio excess return / vol"
                        good={data.metrics.acwi.sharpeAnn >= 0.3 ? true : data.metrics.acwi.sharpeAnn < 0 ? false : null}
                      />
                    </div>
                  </div>
                )}
              </div>

              <CollapsibleSection title="What these numbers mean">
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 space-y-2 text-[12px] text-slate-600">
                  <p><strong>Hit Rate</strong> — fraction of periods where the top-ranked ETF actually had a positive return. &gt;55% is meaningful alpha; &lt;50% means the signal is noise.</p>
                  <p><strong>Sharpe Ratio</strong> — annualized excess return of an equal-weight portfolio of the top-half ranked ETFs divided by its volatility. This is the <em>portfolio</em> Sharpe, not per-ticker. &gt;0.3 is good; &lt;0 means the ranking added negative value vs buying SPY.</p>
                  <p><strong>Walk-forward</strong> — each quarterly window was tested strictly out-of-sample. The model was never trained on data it was tested against. The OOS period is 2007–2022; holdout is 2022–present (never touched during model development).</p>
                </div>
              </CollapsibleSection>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Panel: Stock Picks ─────────────────────────────────────────── */}
      {data?.stocks && data.stocks.length > 0 && (
        <Card hover={false}>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top Stock Picks</CardTitle>
            <CardDescription className="text-[11px]">
              Stocks in overweight sectors · Ranked by O&apos;Neil composite (RS, EPS rank, SMR, 50/200d MA, institutional trend)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100">
              {data.stocks.map(s => {
                const consensus = s.analystConsensus as Record<string, number> | null;
                const buys = consensus ? ((consensus.strongBuy ?? 0) + (consensus.buy ?? 0)) : null;
                const total = consensus
                  ? ((consensus.strongBuy ?? 0) + (consensus.buy ?? 0) + (consensus.hold ?? 0) + (consensus.sell ?? 0) + (consensus.strongSell ?? 0))
                  : 0;
                const buyPct = total > 0 && buys !== null ? buys / total : null;

                return (
                  <div key={s.ticker} className="py-3 flex flex-wrap gap-x-6 gap-y-1.5 items-start">
                    <div className="flex items-center gap-2 min-w-[130px]">
                      <span className="font-mono font-bold text-slate-900">{s.ticker}</span>
                      <span className="text-[11px] rounded-full bg-slate-100 px-1.5 py-0.5 text-slate-600">{s.sectorEtf}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-0.5 text-[12px]">
                      <span><span className="text-slate-400">RS </span>
                        <span className={`font-semibold ${(s.rsRating ?? 0) >= 80 ? 'text-emerald-700' : (s.rsRating ?? 0) >= 60 ? 'text-slate-700' : 'text-red-600'}`}>
                          {s.rsRating?.toFixed(0) ?? '—'}
                        </span>
                      </span>
                      <span><span className="text-slate-400">EPS </span>
                        <span className="font-semibold">{s.epsRankProxy != null ? (s.epsRankProxy * 100).toFixed(0) : '—'}</span>
                      </span>
                      <span><span className="text-slate-400">SMR </span>
                        <span className={`font-semibold ${'AB'.includes(s.smrProxy ?? '') ? 'text-emerald-700' : 'text-slate-700'}`}>
                          {s.smrProxy ?? '—'}
                        </span>
                      </span>
                      <span>
                        <span className="text-slate-400">50d </span>
                        <span className={`font-semibold ${(s.dma50Position ?? 0) > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {s.dma50Position != null ? ((s.dma50Position > 0) ? '↑' : '↓') : '—'}
                        </span>
                      </span>
                      <span>
                        <span className="text-slate-400">200d </span>
                        <span className={`font-semibold ${(s.dma200Position ?? 0) > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {s.dma200Position != null ? ((s.dma200Position > 0) ? '↑' : '↓') : '—'}
                        </span>
                      </span>
                      {buyPct != null && (
                        <span>
                          <span className="text-slate-400">Analyst buy </span>
                          <span className={`font-semibold ${buyPct >= 0.7 ? 'text-emerald-700' : buyPct >= 0.5 ? 'text-slate-700' : 'text-red-600'}`}>
                            {(buyPct * 100).toFixed(0)}%
                          </span>
                          <span className="text-slate-400"> ({total})</span>
                        </span>
                      )}
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-[10px] text-slate-400">Score</div>
                      <div className="text-base font-bold text-slate-900">{(s.compositeScore * 100).toFixed(0)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Methodology ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5">
        <CollapsibleSection title="How this model works">
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4 text-[12px] text-slate-600">
            {[
              { title: '1. Data', body: 'Daily OHLCV, FRED macro (FEDFUNDS, CPI, credit spreads), OECD leading indicators, AV earnings revisions.' },
              { title: '2. Regime Detection', body: 'k-means on 6 z-scored macro factors finds 4 macro regimes. Stable across re-fits via centroid template matching.' },
              { title: '3. Walk-Forward Backtest', body: 'Ridge regression per regime, trained on rolling windows. Predicts 63-day ETF returns. Never fits on test data.' },
              { title: '4. Signal Scoring', body: "Today's factor z-scores × regime weights = conviction. Top-half = overweight. Empirical calibration gives P(outperf)." },
            ].map(s => (
              <div key={s.title} className="space-y-1">
                <div className="font-semibold text-slate-700">{s.title}</div>
                <p className="leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
