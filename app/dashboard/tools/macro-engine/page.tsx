'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ComposedChart, LineChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid, Legend, Cell, type TooltipProps,
} from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import {
  AlertCircle, ArrowLeft, TrendingUp, Info, ChevronDown, ChevronRight, RefreshCw,
  BarChart2, Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import type { MacroEnginePayload } from '@/app/api/dashboard/macro-engine/route';
import type { HistoryPayload, HistoryPoint } from '@/app/api/dashboard/macro-engine/history/route';

// ─── Universe metadata ─────────────────────────────────────────────────────────

const TICKER_META: Record<string, { name: string; description: string; flag?: string }> = {
  SPY:  { name: 'S&P 500',             description: 'US large-cap equities',         flag: '🇺🇸' },
  XLK:  { name: 'Technology',          description: 'US Tech sector',                 flag: '💻' },
  XLF:  { name: 'Financials',          description: 'US Banks & Insurance',           flag: '🏦' },
  XLE:  { name: 'Energy',              description: 'US Oil, Gas & Energy',           flag: '⚡' },
  XLV:  { name: 'Health Care',         description: 'US Pharma, Biotech, Hospitals',  flag: '🏥' },
  XLI:  { name: 'Industrials',         description: 'US Defense, Aerospace, Rail',    flag: '🏭' },
  XLY:  { name: 'Cons. Discretionary', description: 'US Retail, Auto, Media',         flag: '🛍️' },
  EWJ:  { name: 'Japan',               description: 'iShares MSCI Japan',             flag: '🇯🇵' },
  EWG:  { name: 'Germany',             description: 'iShares MSCI Germany',           flag: '🇩🇪' },
  EWU:  { name: 'UK',                  description: 'iShares MSCI United Kingdom',    flag: '🇬🇧' },
  MCHI: { name: 'China',               description: 'iShares MSCI China',             flag: '🇨🇳' },
  EWZ:  { name: 'Brazil',              description: 'iShares MSCI Brazil',            flag: '🇧🇷' },
  EWC:  { name: 'Canada',              description: 'iShares MSCI Canada',            flag: '🇨🇦' },
  EWA:  { name: 'Australia',           description: 'iShares MSCI Australia',         flag: '🇦🇺' },
};

function tickerLabel(ticker: string) {
  const m = TICKER_META[ticker];
  return m ? `${m.flag ?? ''} ${ticker} · ${m.name}` : ticker;
}

// ─── Regime colors ─────────────────────────────────────────────────────────────

const REGIME_PALETTE: Record<string, string> = {
  credit:    '#ef4444',
  monetary:  '#f59e0b',
  growth:    '#10b981',
  inflation: '#f97316',
  earnings:  '#6366f1',
  momentum:  '#0ea5e9',
  neutral:   '#64748b',
};

function regimeColor(label: string): string {
  const m = label.match(/^Regime-\d+-(.+)$/);
  const key = m?.[1] ?? '';
  return REGIME_PALETTE[key] ?? '#64748b';
}

function regimeDisplayName(label: string): string {
  const m = label.match(/^Regime-(\d+)-(.+)$/);
  if (!m) return label;
  const MAP: Record<string, string> = {
    credit:    'Credit Stress',
    monetary:  'Monetary Tightening',
    growth:    'Growth',
    inflation: 'Inflation',
    earnings:  'Earnings-Led',
    momentum:  'Momentum',
    neutral:   'Neutral',
    // legacy labels before rename
    zCredit:   'Credit Stress', zMonetary: 'Monetary Tightening',
    zGrowth:   'Growth',        zInflation: 'Inflation',
    zEarnings: 'Earnings-Led',  zCarry: 'Momentum',
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

function colorClass(v: number, goodThreshold = 0): string {
  if (v > goodThreshold) return 'text-emerald-700';
  if (v < -goodThreshold) return 'text-red-600';
  return 'text-slate-500';
}

/** Rolling Sharpe over last N observations of an excess return series */
function rollingStats(points: HistoryPoint[], window = 12): { date: string; rollingSharpe: number | null; excess: number }[] {
  return points.map((p, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1);
    let rollingSharpe: number | null = null;
    if (slice.length >= 4) {
      const xs = slice.map(s => s.excessReturn);
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
      const std = Math.sqrt(variance);
      if (std > 0) {
        // Annualize: each point is ~63 trading days, ~4 per year
        rollingSharpe = +(mean / std * Math.sqrt(4)).toFixed(3);
      }
    }
    return {
      date: p.date,
      rollingSharpe,
      excess: +((p.excessReturn * 100).toFixed(2)),
    };
  });
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
  const color = direction === 'overweight' ? 'bg-emerald-500' : direction === 'underweight' ? 'bg-red-400' : 'bg-slate-300';
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

// ─── Regime strip (mini color bar under chart) ────────────────────────────────

function RegimeStrip({ points }: { points: { date: string; regime: string }[] }) {
  if (points.length === 0) return null;
  // Group into contiguous regime runs
  const runs: { regime: string; startIdx: number; endIdx: number }[] = [];
  let cur = { regime: points[0].regime, startIdx: 0, endIdx: 0 };
  for (let i = 1; i < points.length; i++) {
    if (points[i].regime === cur.regime) { cur.endIdx = i; }
    else { runs.push(cur); cur = { regime: points[i].regime, startIdx: i, endIdx: i }; }
  }
  runs.push(cur);

  return (
    <div className="flex w-full h-3 rounded overflow-hidden mt-1">
      {runs.map((run, i) => {
        const width = ((run.endIdx - run.startIdx + 1) / points.length) * 100;
        return (
          <div
            key={i}
            title={regimeDisplayName(run.regime)}
            className="h-full"
            style={{ width: `${width}%`, backgroundColor: regimeColor(run.regime) + 'cc' }}
          />
        );
      })}
    </div>
  );
}

// ─── Regime legend ─────────────────────────────────────────────────────────────

function RegimeLegend({ points }: { points: HistoryPoint[] }) {
  const seen = new Map<string, number>();
  for (const p of points) {
    seen.set(p.regime, (seen.get(p.regime) ?? 0) + 1);
  }
  const total = points.length;
  return (
    <div className="flex flex-wrap gap-3">
      {[...seen.entries()].map(([regime, count]) => (
        <div key={regime} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: regimeColor(regime) }} />
          <span className="text-[11px] text-slate-600">{regimeDisplayName(regime)}</span>
          <span className="text-[10px] text-slate-400">({((count / total) * 100).toFixed(0)}%)</span>
        </div>
      ))}
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

type ChartTab = 'cumulative' | 'excess' | 'sharpe';

function PerformanceChart() {
  const [range, setRange] = useState(24);
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<HistoryPoint | null>(null);
  const [tab, setTab] = useState<ChartTab>('cumulative');

  const load = useCallback(() => {
    setLoading(true);
    const end = new Date();
    const start = new Date(end.getTime() - range * 30 * 24 * 60 * 60 * 1000);
    fetch(`/api/dashboard/macro-engine/history?start=${start.toISOString().slice(0, 10)}&end=${end.toISOString().slice(0, 10)}`)
      .then(r => r.json())
      .then((d: HistoryPayload) => { setData(d); setSelectedPoint(null); })
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const points = data?.points ?? [];

  // Subsample for chart readability (keep every Nth point, always keep first/last)
  const subsample = useMemo(() => {
    if (points.length <= 60) return points;
    const step = Math.ceil(points.length / 60);
    return points.filter((_, i) => i === 0 || i === points.length - 1 || i % step === 0);
  }, [points]);

  const chartData = useMemo(() => subsample.map(p => ({
    date: p.date,
    portfolio: +((p.cumulativePortfolio - 1) * 100).toFixed(2),
    spy: +((p.cumulativeSpy - 1) * 100).toFixed(2),
    excess: +((p.excessReturn * 100).toFixed(2)),
    regime: p.regime,
  })), [subsample]);

  const rollingData = useMemo(() => {
    // Compute rolling stats on subsampled points (window = 12 observations ≈ 3yr)
    return rollingStats(subsample, 12);
  }, [subsample]);

  const finalPt = points[points.length - 1];
  const finalPortfolio = finalPt?.cumulativePortfolio ?? 1;
  const finalSpy = finalPt?.cumulativeSpy ?? 1;
  const totalExcess = finalPortfolio - finalSpy;
  const winRate = points.length > 0
    ? points.filter(p => p.excessReturn > 0).length / points.length
    : null;

  const handleClick = (e: { activePayload?: { payload: { date: string } }[] } | null) => {
    if (!e?.activePayload?.[0]) return;
    const d = e.activePayload[0].payload.date;
    const full = points.find(p => p.date === d) ?? null;
    setSelectedPoint(full);
  };

  const tabBtn = (t: ChartTab, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
        tab === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {icon}{label}
    </button>
  );

  type ChartRow = { date: string; portfolio?: number; spy?: number; excess?: number; rollingSharpe?: number | null };
  const tooltipContent = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as ChartRow;
    const ptFull = points.find(p => p.date === d.date);
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs min-w-[160px]">
        <div className="font-semibold text-slate-700 mb-1.5">{fmtDate(d.date)}</div>
        {tab === 'cumulative' && (
          <div className="space-y-0.5">
            <div className="flex justify-between gap-4"><span className="text-slate-500">Portfolio</span><span className={colorClass(d.portfolio ?? 0, 0.01)}>{(d.portfolio ?? 0) > 0 ? '+' : ''}{d.portfolio}%</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">SPY</span><span className={colorClass(d.spy ?? 0, 0.01)}>{(d.spy ?? 0) > 0 ? '+' : ''}{d.spy}%</span></div>
          </div>
        )}
        {tab === 'excess' && (
          <div className="flex justify-between gap-4"><span className="text-slate-500">Excess</span><span className={colorClass(d.excess ?? 0, 0)}>{pct((d.excess ?? 0) / 100)}</span></div>
        )}
        {tab === 'sharpe' && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Rolling Sharpe</span>
            <span className={colorClass((d.rollingSharpe as number | null | undefined) ?? 0, 0.1)}>{typeof d.rollingSharpe === 'number' ? d.rollingSharpe.toFixed(2) : '—'}</span>
          </div>
        )}
        {ptFull && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[10px]" style={{ color: regimeColor(ptFull.regime) }}>
            {regimeDisplayName(ptFull.regime)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {tabBtn('cumulative', <Activity className="h-3 w-3" />, 'Cumulative')}
          {tabBtn('excess', <BarChart2 className="h-3 w-3" />, 'Excess / Period')}
          {tabBtn('sharpe', <TrendingUp className="h-3 w-3" />, 'Rolling Sharpe')}
        </div>
        <div className="flex gap-1 items-center">
          {RANGE_OPTIONS.map(opt => (
            <button key={opt.label} type="button" onClick={() => setRange(opt.months)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold ${range === opt.months ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {opt.label}
            </button>
          ))}
          <button type="button" onClick={load} className="ml-1 p-1 rounded bg-slate-100 text-slate-400 hover:bg-slate-200">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {points.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Portfolio</div>
            <div className={`text-sm font-bold mt-0.5 ${colorClass(finalPortfolio - 1, 0)}`}>{pct(finalPortfolio - 1)}</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">SPY</div>
            <div className={`text-sm font-bold mt-0.5 ${colorClass(finalSpy - 1, 0)}`}>{pct(finalSpy - 1)}</div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Excess · Win Rate</div>
            <div className={`text-sm font-bold mt-0.5 ${colorClass(totalExcess, 0)}`}>
              {pct(totalExcess)}
              {winRate !== null && <span className="text-[10px] font-normal text-slate-400 ml-1">({(winRate * 100).toFixed(0)}%↑)</span>}
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="h-52 flex items-center justify-center text-sm text-slate-400">Loading...</div>
      ) : chartData.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-sm text-slate-400">No data for this range.</div>
      ) : (
        <>
          {tab === 'cumulative' && (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} onClick={handleClick}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={50} />
                <Tooltip content={tooltipContent} />
                <ReferenceLine y={0} stroke="#e2e8f0" />
                <Line type="monotone" dataKey="portfolio" stroke="#10b981" strokeWidth={2} dot={false} name="Portfolio" />
                <Line type="monotone" dataKey="spy" stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="SPY" />
                <Legend iconType="line" iconSize={12} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {tab === 'excess' && (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} onClick={handleClick}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={50} />
                <Tooltip content={tooltipContent} />
                <ReferenceLine y={0} stroke="#cbd5e1" />
                <Bar dataKey="excess" name="Excess return" radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.excess >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.75} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {tab === 'sharpe' && (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={rollingData} onClick={handleClick}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={tooltipContent} />
                <ReferenceLine y={0} stroke="#cbd5e1" />
                <ReferenceLine y={0.5} stroke="#10b98144" strokeDasharray="4 2" label={{ value: '0.5', position: 'right', fontSize: 9, fill: '#10b981' }} />
                <Line type="monotone" dataKey="rollingSharpe" stroke="#6366f1" strokeWidth={2} dot={false} connectNulls name="Rolling Sharpe (12-period)" />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* Regime strip */}
          <div>
            <RegimeStrip points={subsample} />
            <div className="mt-2">
              <RegimeLegend points={subsample} />
            </div>
          </div>
        </>
      )}

      {/* Click-to-explore: selected date snapshot */}
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
              <div>Portfolio: <strong className={colorClass(selectedPoint.portfolioReturn)}>{pct(selectedPoint.portfolioReturn)}</strong></div>
              <div>SPY: <strong className={colorClass(selectedPoint.spyReturn)}>{pct(selectedPoint.spyReturn)}</strong></div>
              <div>Excess: <strong className={colorClass(selectedPoint.excessReturn, 0.002)}>{pct(selectedPoint.excessReturn)}</strong></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {selectedPoint.rankings.map(r => (
              <div key={r.ticker} className="flex items-center gap-2 text-[12px]">
                <span className="w-4 text-slate-300 font-mono text-[10px]">{r.rank}</span>
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
          <div className="text-[10px] text-slate-400">Click a different point to explore any date. Overweight (green) = model ranked top-half.</div>
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

  const FACTOR_DIMS = [
    { key: 'zGrowth',    label: 'Growth',    desc: 'GDP / PMI momentum',   color: '#10b981' },
    { key: 'zInflation', label: 'Inflation', desc: 'CPI / PPI trend',       color: '#f97316' },
    { key: 'zMonetary',  label: 'Monetary',  desc: 'Rate path (Fed Funds)', color: '#f59e0b' },
    { key: 'zCredit',    label: 'Credit',    desc: 'Spread dynamics',        color: '#ef4444' },
    { key: 'zCarry',     label: 'Momentum',  desc: '6m price vs universe',   color: '#0ea5e9' },
    { key: 'zEarnings',  label: 'Earnings',  desc: 'EPS revision momentum',  color: '#6366f1' },
  ] as const;

  // Factor profile from top overweight signal
  const topSignal = overweight[0] ?? data?.signals[0] ?? null;
  const attribution = topSignal?.factorAttribution ?? {};

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
            Regime-conditional factor model · 14 global ETFs · Walk-forward backtested · 63-day horizon
          </p>
        </div>
        {asOfDate && (
          <div className="text-right text-xs text-slate-400">
            <div>Signals as of</div>
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
              <CardTitle className="text-sm font-semibold">Current Macro Regime</CardTitle>
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
                    4 regimes via k-means on 20yr of macro factor z-scores. Each implies different sector weights.
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
                Z-scores vs 20yr history · From top-ranked signal · Drives regime classification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!topSignal ? (
                <p className="text-sm text-slate-400">Run signals to populate.</p>
              ) : (
                <div className="space-y-2.5">
                  {FACTOR_DIMS.map(({ key, label, desc, color }) => {
                    const val = (attribution[key] as number | undefined) ?? 0;
                    const abs = Math.abs(val);
                    // Scale: ±3 = full bar, ±1.5 = 50%
                    const barPct = Math.min(abs / 3, 1) * 100;
                    const isPos = val >= 0;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="w-[90px] shrink-0">
                          <div className="text-[12px] font-semibold text-slate-700">{label}</div>
                          <div className="text-[10px] text-slate-400 leading-tight">{desc}</div>
                        </div>
                        {/* Dual-sided bar: center = 0, left = negative, right = positive */}
                        <div className="flex-1 relative flex items-center">
                          <div className="w-1/2 h-2 bg-slate-100 rounded-l-full overflow-hidden flex justify-end">
                            {!isPos && (
                              <div
                                className="h-full rounded-l-full"
                                style={{ width: `${barPct}%`, backgroundColor: '#ef4444' }}
                              />
                            )}
                          </div>
                          <div className="w-px h-3 bg-slate-300 shrink-0" />
                          <div className="w-1/2 h-2 bg-slate-100 rounded-r-full overflow-hidden">
                            {isPos && (
                              <div
                                className="h-full rounded-r-full"
                                style={{ width: `${barPct}%`, backgroundColor: color }}
                              />
                            )}
                          </div>
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
            Ranked by regime-conditional conviction · P(outperf) = empirical probability of beating SPY over 6 / 12 months
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
                    ↑ Overweight — Long these ({overweight.length})
                  </div>
                  <div className="space-y-2">
                    {overweight.map(s => (
                      <div key={s.ticker}
                        className="grid gap-3 rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2.5"
                        style={{ gridTemplateColumns: '1.5rem 3.5rem 1fr 9rem 5rem 5rem' }}>
                        <div className="text-[11px] text-slate-400 font-mono self-center">{s.rank}</div>
                        <div className="font-mono font-bold text-slate-900 self-center text-sm">{s.ticker}</div>
                        <div className="self-center">
                          <div className="text-[12px] font-medium text-slate-700">
                            {TICKER_META[s.ticker]?.flag} {TICKER_META[s.ticker]?.name ?? s.ticker}
                          </div>
                          <div className="text-[10px] text-slate-400">{TICKER_META[s.ticker]?.description}</div>
                        </div>
                        <div className="self-center">
                          <div className="text-[10px] text-slate-400 mb-1">Conviction</div>
                          <ConvictionBar value={s.convictionScore} direction={s.direction} />
                        </div>
                        <div className="text-center self-center">
                          {s.prob6m != null && (
                            <div className={`text-[14px] font-bold ${s.prob6m >= 0.6 ? 'text-emerald-700' : s.prob6m <= 0.45 ? 'text-red-500' : 'text-slate-700'}`}>
                              {(s.prob6m * 100).toFixed(0)}%
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400">P(↑6m)</div>
                        </div>
                        <div className="text-center self-center">
                          {s.prob12m != null && (
                            <div className={`text-[14px] font-bold ${s.prob12m >= 0.6 ? 'text-emerald-700' : s.prob12m <= 0.45 ? 'text-red-500' : 'text-slate-700'}`}>
                              {(s.prob12m * 100).toFixed(0)}%
                            </div>
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
                    ↓ Underweight — Avoid / reduce ({underweight.length})
                  </div>
                  <div className="space-y-2">
                    {underweight.map(s => (
                      <div key={s.ticker}
                        className="grid gap-3 rounded-lg border border-red-100 bg-red-50/30 px-3 py-2.5"
                        style={{ gridTemplateColumns: '1.5rem 3.5rem 1fr 9rem 5rem 5rem' }}>
                        <div className="text-[11px] text-slate-400 font-mono self-center">{s.rank}</div>
                        <div className="font-mono font-bold text-slate-600 self-center text-sm">{s.ticker}</div>
                        <div className="self-center">
                          <div className="text-[12px] font-medium text-slate-600">
                            {TICKER_META[s.ticker]?.flag} {TICKER_META[s.ticker]?.name ?? s.ticker}
                          </div>
                          <div className="text-[10px] text-slate-400">{TICKER_META[s.ticker]?.description}</div>
                        </div>
                        <div className="self-center">
                          <div className="text-[10px] text-slate-400 mb-1">Conviction</div>
                          <ConvictionBar value={s.convictionScore} direction={s.direction} />
                        </div>
                        <div className="text-center self-center">
                          {s.prob6m != null && (
                            <div className={`text-[14px] font-bold ${s.prob6m >= 0.6 ? 'text-emerald-700' : s.prob6m <= 0.45 ? 'text-red-500' : 'text-slate-700'}`}>
                              {(s.prob6m * 100).toFixed(0)}%
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400">P(↑6m)</div>
                        </div>
                        <div className="text-center self-center">
                          {s.prob12m != null && (
                            <div className={`text-[14px] font-bold ${s.prob12m >= 0.6 ? 'text-emerald-700' : s.prob12m <= 0.45 ? 'text-red-500' : 'text-slate-700'}`}>
                              {(s.prob12m * 100).toFixed(0)}%
                            </div>
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
            Equal-weight long of top-half ranked ETFs each period vs SPY benchmark · Click any point to explore that date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceChart />
        </CardContent>
      </Card>

      {/* ── Panel: Backtest Metrics ─────────────────────────────────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Backtest Performance</CardTitle>
          <CardDescription className="text-[11px]">
            Walk-forward OOS · {data?.metrics?.windowCount ?? '—'} quarterly windows · 63-day holding periods · Trained on excess returns vs SPY
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
                      Out-of-Sample · {data.metrics.dataStart} → {data.metrics.holdoutStart}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <MetricCard
                        label="Beat-SPY Rate"
                        value={`${(data.metrics.spy.hitRate * 100).toFixed(1)}%`}
                        sub="Periods portfolio beat SPY"
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
                      Holdout · {data.metrics.holdoutStart} → present
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <MetricCard
                        label="Beat-SPY Rate"
                        value={`${(data.metrics.acwi.hitRate * 100).toFixed(1)}%`}
                        sub="Periods portfolio beat SPY"
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
                  <p><strong>Beat-SPY Rate</strong> — fraction of 63-day periods where the equal-weight long portfolio (top-half ranked ETFs) beat SPY. &gt;55% means the ranking is consistently adding value.</p>
                  <p><strong>Sharpe Ratio</strong> — annualized excess return of the long portfolio divided by its volatility. Computed on excess-over-SPY returns so beta is subtracted. &gt;0.3 is good; &gt;0.5 is strong for sector rotation.</p>
                  <p><strong>Walk-forward</strong> — the model trained on excess returns per regime. Each quarterly window was tested strictly OOS. The OOS period is 2007–2022; holdout is 2022–present (model was never trained on this data).</p>
                </div>
              </CollapsibleSection>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Panel: Top Stock Picks ─────────────────────────────────────── */}
      {data?.stocks && data.stocks.length > 0 && (
        <Card hover={false}>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top Stock Picks in Overweight Sectors</CardTitle>
            <CardDescription className="text-[11px]">
              Stocks in overweight ETF sectors · Ranked by O&apos;Neil composite (RS rating, EPS rank, SMR, MA position, institutional trend)
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
                          <span className="text-slate-400">Analyst </span>
                          <span className={`font-semibold ${buyPct >= 0.7 ? 'text-emerald-700' : buyPct >= 0.5 ? 'text-slate-700' : 'text-red-600'}`}>
                            {(buyPct * 100).toFixed(0)}% buy
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
              { title: '1. Data', body: 'Daily OHLCV, FRED macro (FEDFUNDS, CPI, credit spreads), OECD leading indicators, AV earnings revisions. Z-scored vs 20yr rolling history.' },
              { title: '2. Regime Detection', body: 'k-means on 6 macro factor z-scores finds 4 regimes. Centroid template matching ensures stable labels across refits (2008/2020/2022 shocks correctly classified).' },
              { title: '3. Walk-Forward Backtest', body: 'Ridge regression trained on excess returns (ETF − SPY) per regime. 6 factors including 6m cross-sectional price momentum. Expanding training window, quarterly test steps. Never fits on test data.' },
              { title: '4. Signal Scoring', body: "Today's macro z-scores + momentum × regime weights → conviction score. Top-half ETFs = overweight. Empirical decile calibration gives P(outperform SPY) at 6m / 12m." },
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
