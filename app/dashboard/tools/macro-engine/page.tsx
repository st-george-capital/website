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
import type { HistoryPayload, HistoryPoint, RegimeAttribution, RegimeRun } from '@/app/api/dashboard/macro-engine/history/route';
import type { RecommendationPayload } from '@/app/api/dashboard/macro-engine/recommendation/route';

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

/**
 * Rolling Sharpe over last N active (non-gated) observations of an excess return series.
 * Gated days are excluded so credit-stress flats don't pollute the rolling metric.
 */
function rollingStats(
  points: HistoryPoint[],
  window = 12,
  mode: 'net' | 'gross' = 'net',
): { date: string; rollingSharpe: number | null; excess: number }[] {
  // Periods-per-year implied by the engine's 21-day forward horizon.
  const PPY = 252 / 21;
  return points.map((p, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1).filter(s => !s.gated);
    let rollingSharpe: number | null = null;
    if (slice.length >= 4) {
      const xs = slice.map(s => (mode === 'gross' ? s.excessReturnGross : s.excessReturnNet));
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
      const std = Math.sqrt(variance);
      if (std > 0) {
        rollingSharpe = +(mean / std * Math.sqrt(PPY)).toFixed(3);
      }
    }
    const excessRaw = mode === 'gross' ? p.excessReturnGross : p.excessReturnNet;
    return {
      date: p.date,
      rollingSharpe,
      excess: +((excessRaw * 100).toFixed(2)),
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
type ReturnMode = 'net' | 'gross';

function PerformanceChart() {
  const [range, setRange] = useState(48);
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<HistoryPoint | null>(null);
  const [tab, setTab] = useState<ChartTab>('cumulative');
  const [mode, setMode] = useState<ReturnMode>('net');

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

  const chartData = useMemo(() => subsample.map(p => {
    const cumPortfolio = mode === 'gross' ? p.cumulativePortfolioGross : p.cumulativePortfolioNet;
    const excess       = mode === 'gross' ? p.excessReturnGross         : p.excessReturnNet;
    return {
      date: p.date,
      portfolio: +((cumPortfolio - 1) * 100).toFixed(2),
      spy:       +((p.cumulativeSpy - 1) * 100).toFixed(2),
      excess:    +(excess * 100).toFixed(2),
      regime:    p.regime,
      gated:     p.gated,
    };
  }), [subsample, mode]);

  const rollingData = useMemo(() => rollingStats(subsample, 12, mode), [subsample, mode]);

  const finalPt = points[points.length - 1];
  const finalPortfolio = mode === 'gross'
    ? (finalPt?.cumulativePortfolioGross ?? 1)
    : (finalPt?.cumulativePortfolioNet   ?? 1);
  const finalSpy = finalPt?.cumulativeSpy ?? 1;
  const totalExcess = finalPortfolio - finalSpy;
  // Win rate over active (non-gated) points only — gated days are 0 by construction
  // and shouldn't count for or against the strategy's hit rate.
  const activePoints = points.filter(p => !p.gated);
  const winRate = activePoints.length > 0
    ? activePoints.filter(p => (mode === 'gross' ? p.excessReturnGross : p.excessReturnNet) > 0).length / activePoints.length
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

  type ChartRow = { date: string; portfolio?: number; spy?: number; excess?: number; rollingSharpe?: number | null; gated?: boolean };
  const tooltipContent = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as ChartRow;
    const ptFull = points.find(p => p.date === d.date);
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs min-w-[160px]">
        <div className="font-semibold text-slate-700 mb-1.5">{fmtDate(d.date)}</div>
        {tab === 'cumulative' && (
          <div className="space-y-0.5">
            <div className="flex justify-between gap-4"><span className="text-slate-500">Portfolio {mode === 'gross' ? '(gross)' : '(net)'}</span><span className={colorClass(d.portfolio ?? 0, 0.01)}>{(d.portfolio ?? 0) > 0 ? '+' : ''}{d.portfolio}%</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-500">SPY</span><span className={colorClass(d.spy ?? 0, 0.01)}>{(d.spy ?? 0) > 0 ? '+' : ''}{d.spy}%</span></div>
          </div>
        )}
        {tab === 'excess' && (
          <div className="flex justify-between gap-4"><span className="text-slate-500">Excess {mode === 'gross' ? '(gross)' : '(net)'}</span><span className={colorClass(d.excess ?? 0, 0)}>{pct((d.excess ?? 0) / 100)}</span></div>
        )}
        {tab === 'sharpe' && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Rolling Sharpe</span>
            <span className={colorClass((d.rollingSharpe as number | null | undefined) ?? 0, 0.1)}>{typeof d.rollingSharpe === 'number' ? d.rollingSharpe.toFixed(2) : '—'}</span>
          </div>
        )}
        {ptFull && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[10px] flex items-center justify-between gap-2" style={{ color: regimeColor(ptFull.regime) }}>
            <span>{regimeDisplayName(ptFull.regime)}</span>
            {ptFull.gated && <span className="rounded bg-red-100 text-red-700 px-1 py-0.5 text-[9px] font-semibold">FLAT</span>}
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
          <div className="flex bg-slate-100 rounded overflow-hidden mr-1">
            <button
              type="button"
              onClick={() => setMode('net')}
              title={data?.config
                ? `After ${data.config.transactionCostBps}bps one-way transaction costs`
                : 'After transaction costs'}
              className={`px-2 py-1 text-[11px] font-semibold ${mode === 'net' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              Net
            </button>
            <button
              type="button"
              onClick={() => setMode('gross')}
              title="Before transaction costs"
              className={`px-2 py-1 text-[11px] font-semibold ${mode === 'gross' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              Gross
            </button>
          </div>
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
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Portfolio {mode === 'gross' ? '(Gross)' : '(Net)'}
            </div>
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
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sharpe (Holdout)</div>
            <div className={`text-sm font-bold mt-0.5 ${colorClass(
              (mode === 'gross' ? (data?.summary.sharpeGross ?? 0) : (data?.summary.sharpeNet ?? 0)) - 0.3,
              0,
            )}`}>
              {(mode === 'gross' ? data?.summary.sharpeGross : data?.summary.sharpeNet)?.toFixed(2) ?? '—'}
              {data && (
                <span className="text-[10px] font-normal text-slate-400 ml-1">
                  · {data.summary.nGated} flat
                </span>
              )}
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
                {selectedPoint.gated && <span className="ml-2 rounded bg-red-100 text-red-700 px-1.5 py-0.5 text-[10px] font-semibold">CREDIT-GATE FLAT</span>}
                {!selectedPoint.gated && (
                  <span className="ml-2 text-slate-400">
                    · size {(selectedPoint.finalSize * 100).toFixed(0)}% · turnover {(selectedPoint.turnover * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <div>Portfolio: <strong className={colorClass(
                mode === 'gross' ? selectedPoint.portfolioReturnGross : selectedPoint.portfolioReturnNet
              )}>{pct(mode === 'gross' ? selectedPoint.portfolioReturnGross : selectedPoint.portfolioReturnNet)}</strong></div>
              <div>SPY: <strong className={colorClass(selectedPoint.spyReturn)}>{pct(selectedPoint.spyReturn)}</strong></div>
              <div>Excess: <strong className={colorClass(
                mode === 'gross' ? selectedPoint.excessReturnGross : selectedPoint.excessReturnNet, 0.002
              )}>{pct(mode === 'gross' ? selectedPoint.excessReturnGross : selectedPoint.excessReturnNet)}</strong></div>
            </div>
          </div>
          {selectedPoint.basket.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {selectedPoint.basket.map((r, i) => (
                <div key={r.ticker} className="flex items-center gap-2 text-[12px]">
                  <span className="w-4 text-slate-300 font-mono text-[10px]">{i + 1}</span>
                  <span className="w-10 font-mono font-bold text-emerald-700">{r.ticker}</span>
                  <span className="text-slate-400 truncate">
                    {TICKER_META[r.ticker]?.flag} {TICKER_META[r.ticker]?.name ?? ''}
                  </span>
                  <span className="ml-auto text-slate-400 font-mono text-[10px]">{(r.weight * 100).toFixed(0)}%</span>
                  <span className="w-10 text-right text-slate-300 font-mono text-[10px]">{r.score.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded bg-white border border-slate-100 px-3 py-2 text-[11px] text-slate-500">
              Portfolio was flat on this day (credit-stress regime gated exposure to 0%).
            </div>
          )}
          <div className="text-[10px] text-slate-400">Click a different point to explore any date. Green tickers are in the long basket (top quartile by 12-month momentum).</div>
        </div>
      )}
    </div>
  );
}

// ─── Today's Trades card ──────────────────────────────────────────────────────

/**
 * Shows the model's current positioning — the freshest basket from the
 * holdout replay — so "what signals says right now" and "what the equity
 * chart was built from" are guaranteed to match. Consumes the last point
 * in /api/dashboard/macro-engine/history, which is produced by the same
 * backtest scoring path used for OOS / holdout metrics.
 */
function TodaysTradesCard() {
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pull a narrow window so the handoff is cheap; the server's cache serves
    // the full replay once warm either way.
    const end   = new Date();
    const start = new Date(end.getTime() - 400 * 24 * 60 * 60 * 1000);
    fetch(`/api/dashboard/macro-engine/history?start=${start.toISOString().slice(0, 10)}&end=${end.toISOString().slice(0, 10)}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: HistoryPayload) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-400 py-4">Replaying holdout…</div>;
  if (error)   return <div className="text-sm text-red-600 py-4">Live replay failed: {error}</div>;
  if (!data || data.points.length === 0) return <div className="text-sm text-slate-400 py-4">No live replay data.</div>;

  const last = data.points[data.points.length - 1];
  const rColor = regimeColor(last.regime);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ backgroundColor: rColor + '22', color: rColor }}
            >
              {regimeDisplayName(last.regime)}
            </div>
            {last.gated && (
              <div className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-xs font-bold">
                CREDIT-GATE FLAT
              </div>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            As of {fmtDate(last.date)} · size {(last.finalSize * 100).toFixed(0)}% ·
            {' '}transaction cost {data.config.transactionCostBps}bps/side
          </div>
        </div>
        <div className="flex gap-2 text-[11px]">
          <div className="rounded border border-slate-200 px-2.5 py-1.5 bg-white min-w-[88px]">
            <div className="text-slate-400">Holdout Sharpe (Net)</div>
            <div className={`text-base font-bold ${colorClass(data.summary.sharpeNet - 0.3, 0)}`}>
              {data.summary.sharpeNet.toFixed(2)}
            </div>
          </div>
          <div className="rounded border border-slate-200 px-2.5 py-1.5 bg-white min-w-[88px]">
            <div className="text-slate-400">Gross</div>
            <div className="text-base font-bold text-slate-700">{data.summary.sharpeGross.toFixed(2)}</div>
          </div>
          <div className="rounded border border-slate-200 px-2.5 py-1.5 bg-white min-w-[88px]">
            <div className="text-slate-400">Cost Drag (ann.)</div>
            <div className="text-base font-bold text-slate-700">{data.summary.annualizedCostBps.toFixed(0)}bps</div>
          </div>
        </div>
      </div>

      {last.basket.length === 0 ? (
        <div className="rounded-lg border border-red-100 bg-red-50/30 px-4 py-6 text-center">
          <div className="text-sm font-semibold text-red-700">Portfolio is flat</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Credit-stress regime is active — exposure gated to 0% until the macro regime shifts.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {last.basket.map((b, i) => (
            <div key={b.ticker}
              className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2">
              <div className="w-4 text-[11px] text-slate-400 font-mono">{i + 1}</div>
              <div className="w-12 font-mono font-bold text-slate-900 text-sm">{b.ticker}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-slate-700 truncate">
                  {TICKER_META[b.ticker]?.flag} {TICKER_META[b.ticker]?.name ?? b.ticker}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{TICKER_META[b.ticker]?.description}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold text-emerald-700 font-mono">{(b.weight * 100).toFixed(0)}%</div>
                <div className="text-[10px] text-slate-400 font-mono">z {b.score.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-[10px] text-slate-400">
        Today&apos;s basket is the equal-weight long of the top {Math.round(data.config.longFraction * 100)}% of the
        universe by 12-month cross-sectional momentum (same ranker driving the {data.summary.nActive}-period
        holdout replay, {(data.summary.activeFraction * 100).toFixed(0)}% active).
      </div>
    </div>
  );
}

// ─── Conviction-weighted recommendation card (Chunk 12) ──────────────────────

/**
 * Chunk 12: conviction-weighted, sector/country-capped basket. Sits on top
 * of the same replay that drives TodaysTradesCard, but post-processes the
 * equal-weight basket into actionable target weights the user can trade
 * directly. Shows the delta vs the previous rebalance so it's clear what
 * actually needs to change.
 *
 * Important honesty note rendered in the UI: the backtest Sharpe was
 * validated equal-weighted. Conviction weighting is a display overlay on
 * the live signal — not a re-backtested strategy.
 */
function ConvictionRecommendationCard() {
  const [data, setData]       = useState<RecommendationPayload | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/macro-engine/recommendation')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: RecommendationPayload) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-400 py-4">Computing conviction weights…</div>;
  if (error)   return <div className="text-sm text-red-600 py-4">Recommendation failed: {error}</div>;
  if (!data)   return <div className="text-sm text-slate-400 py-4">No recommendation available.</div>;

  if (data.gated || data.conviction.basket.length === 0) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50/30 px-4 py-6 text-center">
        <div className="text-sm font-semibold text-red-700">Go to cash</div>
        <div className="text-[11px] text-slate-500 mt-1">
          Credit-stress regime active (as of {fmtDate(data.asOfDate)}) — no positions recommended.
        </div>
      </div>
    );
  }

  const maxConv = Math.max(...data.conviction.basket.map(b => b.convWeight));

  const deltaRows = data.positionDelta.filter(d => d.action !== 'HOLD');
  const sectorEntries  = Object.entries(data.conviction.exposures.bySector).sort((a, b) => b[1] - a[1]);
  const countryEntries = Object.entries(data.conviction.exposures.byCountry).sort((a, b) => b[1] - a[1]);

  const actionColor: Record<string, string> = {
    NEW:  'bg-blue-100  text-blue-700',
    BUY:  'bg-emerald-100 text-emerald-700',
    SELL: 'bg-amber-100 text-amber-700',
    EXIT: 'bg-red-100   text-red-700',
    HOLD: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] text-slate-400">
            Regime <span className="font-semibold" style={{ color: regimeColor(data.regime) }}>{regimeDisplayName(data.regime)}</span>
            {' '}· Final size <span className="font-semibold text-slate-700">{(data.finalSize * 100).toFixed(0)}%</span>
            {' '}· As of {fmtDate(data.asOfDate)}
          </div>
          <div className="text-[10px] text-amber-700 mt-1">
            Conviction overlay — backtest Sharpe was validated equal-weighted. This is display-only.
          </div>
        </div>
        {data.conviction.trimmed && (
          <div className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-[10px] font-bold">
            CAP BINDING
          </div>
        )}
      </div>

      {/* ── Target basket w/ conviction bars ─────────────────────────────── */}
      <div>
        <div className="text-[11px] text-slate-500 font-semibold mb-2">Target weights (conviction-scaled · rank-proportional)</div>
        <div className="space-y-1">
          {data.conviction.basket.map((b, i) => (
            <div key={b.ticker} className="flex items-center gap-2">
              <div className="w-4 text-[10px] text-slate-400 font-mono">{i + 1}</div>
              <div className="w-12 font-mono font-bold text-slate-900 text-xs">{b.ticker}</div>
              <div className="flex-1 text-[11px] text-slate-600 truncate">
                {TICKER_META[b.ticker]?.flag} {TICKER_META[b.ticker]?.name ?? b.name}
                {b.capReason && <span className="ml-1 text-amber-700 text-[10px]">({b.capReason})</span>}
              </div>
              <div className="flex-1 max-w-[200px] h-2 bg-slate-100 rounded overflow-hidden">
                <div className="h-full bg-indigo-500"
                     style={{ width: `${(b.convWeight / maxConv) * 100}%` }} />
              </div>
              <div className="w-14 text-right text-[11px] font-mono font-bold text-indigo-700">
                {(b.convWeight * 100).toFixed(1)}%
              </div>
              <div className="w-14 text-right text-[10px] font-mono text-slate-400">
                eq {(b.equalWeight * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Exposure breakdowns ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sectorEntries.length > 0 && (
          <div>
            <div className="text-[11px] text-slate-500 font-semibold mb-2">
              Sector exposure (cap {(data.conviction.maxPerSector * 100).toFixed(0)}%)
            </div>
            <div className="space-y-1">
              {sectorEntries.map(([s, w]) => (
                <div key={s} className="flex items-center gap-2 text-[11px]">
                  <div className="w-32 truncate text-slate-700">{s}</div>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded overflow-hidden">
                    <div className="h-full bg-slate-500"
                         style={{ width: `${(w / data.conviction.maxPerSector) * 100}%` }} />
                  </div>
                  <div className="w-12 text-right font-mono text-slate-700">{(w * 100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {countryEntries.length > 0 && (
          <div>
            <div className="text-[11px] text-slate-500 font-semibold mb-2">
              Country exposure (cap {(data.conviction.maxPerCountry * 100).toFixed(0)}%)
            </div>
            <div className="space-y-1">
              {countryEntries.map(([c, w]) => (
                <div key={c} className="flex items-center gap-2 text-[11px]">
                  <div className="w-32 truncate text-slate-700">{c}</div>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded overflow-hidden">
                    <div className="h-full bg-slate-500"
                         style={{ width: `${(w / data.conviction.maxPerCountry) * 100}%` }} />
                  </div>
                  <div className="w-12 text-right font-mono text-slate-700">{(w * 100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Position delta vs previous rebalance ─────────────────────────── */}
      <div>
        <div className="text-[11px] text-slate-500 font-semibold mb-2">
          Trades vs {data.prevDate ? fmtDate(data.prevDate) : 'cash'} (changes &gt; 1% of NAV)
        </div>
        {deltaRows.length === 0 ? (
          <div className="text-[11px] text-slate-400">No changes — basket held flat vs prior rebalance.</div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {deltaRows.map(d => (
              <div key={d.ticker} className="flex items-center gap-3 px-3 py-1.5 text-[11px] bg-white">
                <div className={`inline-flex justify-center w-12 rounded px-1.5 py-0.5 text-[10px] font-bold ${actionColor[d.action] ?? ''}`}>
                  {d.action}
                </div>
                <div className="w-14 font-mono font-bold text-slate-900">{d.ticker}</div>
                <div className="flex-1 text-slate-600 truncate">{d.name}</div>
                <div className="w-16 text-right font-mono text-slate-500">{(d.prevWeight * 100).toFixed(1)}%</div>
                <div className="w-4 text-center text-slate-300">→</div>
                <div className="w-16 text-right font-mono font-semibold text-slate-800">{(d.currWeight * 100).toFixed(1)}%</div>
                <div className={`w-16 text-right font-mono font-bold ${d.deltaWeight > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {d.deltaWeight > 0 ? '+' : ''}{(d.deltaWeight * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Regime Outlook card (Markov n-step forecast) ─────────────────────────────

/**
 * Regime Outlook card — shows the probability distribution over the k regimes
 * n trading days ahead, conditional on today's regime. Powered by the
 * full-sample 1-day transition matrix in `regime_transitions` exponentiated
 * to the selected horizon. A heuristic diagnostic line surfaces whether the
 * current regime is "sticky" (stay-prob > 50% at 21d) or transitioning.
 *
 * Caveats (kept in a footnote, not hidden from the user):
 *   • Transition matrix is computed from the entire training sample so this
 *     is a stationary Markov forecast — it does NOT condition on current
 *     macro state beyond the current regime label.
 *   • Confidence (regime_labels.confidence) is inverse-distance from the
 *     centroid; a low value suggests the regime is near a boundary and the
 *     forecast should be treated as less reliable.
 */
type RegimeForecastUi = {
  fitId: string;
  asOfDate: string;
  currentRegime: string;
  currentConfidence: number | null;
  regimes: string[];
  horizons: Array<{
    days: number;
    probs: Array<{ regime: string; prob: number }>;
    stayProb: number;
    mostLikelyExit: { regime: string; prob: number } | null;
  }>;
};

function RegimeOutlookCard() {
  const [data, setData] = useState<RegimeForecastUi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState<number>(21);

  useEffect(() => {
    fetch('/api/dashboard/macro-engine/forecast')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: RegimeForecastUi) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-400 py-4">Computing forecast…</div>;
  if (error)   return <div className="text-sm text-red-600 py-4">Forecast failed: {error}</div>;
  if (!data)   return <div className="text-sm text-slate-400 py-4">No forecast available.</div>;

  const selected = data.horizons.find(h => h.days === horizon) ?? data.horizons[0];
  const rowsSorted = [...selected.probs].sort((a, b) => b.prob - a.prob);

  const conf = data.currentConfidence ?? 0;
  const sticky = selected.stayProb > 0.5;
  const lowConf = conf < 0.5;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ backgroundColor: regimeColor(data.currentRegime) + '22', color: regimeColor(data.currentRegime) }}
            >
              {regimeDisplayName(data.currentRegime)}
            </div>
            <span className="text-[11px] text-slate-400">as of {fmtDate(data.asOfDate.slice(0, 10))}</span>
          </div>
          {data.currentConfidence != null && (
            <div className="text-[11px] text-slate-500 mt-1">
              Classifier confidence: <span className={`font-semibold font-mono ${lowConf ? 'text-amber-600' : 'text-slate-700'}`}>
                {(conf * 100).toFixed(0)}%
              </span>
              {lowConf && <span className="text-amber-600 ml-1">· near boundary — treat forecast as indicative</span>}
            </div>
          )}
        </div>
        <div className="flex gap-1 text-[11px]">
          {data.horizons.map(h => (
            <button
              key={h.days}
              type="button"
              onClick={() => setHorizon(h.days)}
              className={`px-2.5 py-1 rounded border font-mono transition-colors ${
                horizon === h.days
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {h.days}d
            </button>
          ))}
        </div>
      </div>

      <div
        className={`rounded-lg border px-3 py-2.5 text-[11px] flex items-start gap-2 ${
          sticky ? 'bg-emerald-50/40 border-emerald-100 text-emerald-800'
                 : 'bg-amber-50/40 border-amber-100 text-amber-800'
        }`}
      >
        <Activity className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <div>
          {sticky ? (
            <>
              Sticky — {(selected.stayProb * 100).toFixed(0)}% chance of staying in{' '}
              <span className="font-semibold">{regimeDisplayName(data.currentRegime)}</span> over the next {horizon} trading days.
            </>
          ) : (
            <>
              Transitioning — only {(selected.stayProb * 100).toFixed(0)}% chance of staying in{' '}
              <span className="font-semibold">{regimeDisplayName(data.currentRegime)}</span> over {horizon} days.
              {selected.mostLikelyExit && (
                <> Most likely exit: <span className="font-semibold">{regimeDisplayName(selected.mostLikelyExit.regime)}</span>{' '}
                  ({(selected.mostLikelyExit.prob * 100).toFixed(0)}%).</>
              )}
            </>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {rowsSorted.map(row => {
          const barPct = Math.min(row.prob, 1) * 100;
          const isCurrent = row.regime === data.currentRegime;
          const color = regimeColor(row.regime);
          return (
            <div key={row.regime} className="flex items-center gap-3">
              <div className="w-[160px] shrink-0 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <div className={`text-[12px] ${isCurrent ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                  {regimeDisplayName(row.regime)}
                </div>
                {isCurrent && <span className="text-[9px] font-mono text-slate-400">NOW</span>}
              </div>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${barPct}%`, backgroundColor: color }}
                />
              </div>
              <div className="w-14 text-right text-[11px] font-mono font-semibold text-slate-700">
                {(row.prob * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-slate-400 leading-relaxed">
        Probabilities are the {horizon}-step marginal of the full-sample Markov transition matrix
        conditional on today&apos;s regime. Horizons: 21d ≈ 1 rebalance, 63d ≈ 3mo, 126d ≈ 6mo, 252d ≈ 12mo.
        Stationary distribution is reached by ~63–126d — longer horizons reflect long-run regime frequency,
        not tactical timing.
      </div>
    </div>
  );
}

// ─── Regime Timeline panel (Gantt-style history of regime runs) ───────────────

/**
 * Browse the holdout as a sequence of regime runs rather than a single equity
 * curve. The horizontal Gantt bar is the full holdout window; each segment is
 * a contiguous regime run with width proportional to its duration. Clicking a
 * segment (or a table row) reveals per-run stats and the top 5 ticker
 * contributors — a quick way to answer "what did the model do last time we
 * were in Regime-X?".
 *
 * Net/Gross toggle flips the shown metrics between pre- and post-cost numbers.
 * Sharpe is null for runs with fewer than 4 active days (noise guard).
 */
function RegimeTimelinePanel() {
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ReturnMode>('net');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<'date' | 'sharpe' | 'cum' | 'duration'>('date');

  useEffect(() => {
    fetch('/api/dashboard/macro-engine/history')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: HistoryPayload) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-400 py-4">Loading regime history…</div>;
  if (error)   return <div className="text-sm text-red-600 py-4">Timeline failed: {error}</div>;
  if (!data || data.runs.length === 0) return <div className="text-sm text-slate-400 py-4">No regime runs.</div>;

  const runs = data.runs;

  // Total span in days for the Gantt bar (runs.nDays approximates calendar days).
  const totalDays = runs.reduce((a, r) => a + r.nDays, 0);

  const fmtShort = (iso: string) => fmtDateShort(iso.length === 10 ? iso : iso.slice(0, 10));

  const cumPct = (run: RegimeRun) => (mode === 'gross' ? run.cumReturnGross : run.cumReturnNet) - 1;
  const sharpeOf = (run: RegimeRun) => (mode === 'gross' ? run.sharpeGross : run.sharpeNet);

  const sortedIdx = [...runs.map((_, i) => i)].sort((a, b) => {
    const A = runs[a]; const B = runs[b];
    if (sortKey === 'sharpe') return (sharpeOf(B) ?? -99) - (sharpeOf(A) ?? -99);
    if (sortKey === 'cum')    return cumPct(B) - cumPct(A);
    if (sortKey === 'duration') return B.nDays - A.nDays;
    return a - b;
  });

  const selected = selectedIdx != null ? runs[selectedIdx] : null;

  return (
    <div className="space-y-5">
      {/* Header controls */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">{runs.length}</span> regime runs ·{' '}
          <span className="font-semibold text-slate-700">{totalDays}</span> days ·{' '}
          {fmtShort(runs[0].startDate)} → {fmtShort(runs[runs.length - 1].endDate)}
        </div>
        <div className="flex gap-2 text-[11px]">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button type="button"
              onClick={() => setMode('net')}
              className={`px-2 py-1 rounded-md font-mono transition-colors ${
                mode === 'net' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}>Net</button>
            <button type="button"
              onClick={() => setMode('gross')}
              className={`px-2 py-1 rounded-md font-mono transition-colors ${
                mode === 'gross' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}>Gross</button>
          </div>
        </div>
      </div>

      {/* Gantt strip */}
      <div>
        <div className="flex w-full h-8 rounded overflow-hidden border border-slate-200">
          {runs.map((run, i) => {
            const widthPct = (run.nDays / totalDays) * 100;
            const color = regimeColor(run.regime);
            const isSel = selectedIdx === i;
            return (
              <button
                type="button"
                key={`${run.regime}-${run.startDate}`}
                onClick={() => setSelectedIdx(isSel ? null : i)}
                title={`${regimeDisplayName(run.regime)} · ${fmtShort(run.startDate)}–${fmtShort(run.endDate)} · ${run.nDays}d`}
                className="relative transition-opacity hover:opacity-100 focus:outline-none"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: color,
                  opacity: isSel ? 1 : (selectedIdx == null ? 0.9 : 0.35),
                  borderRight: '1px solid rgba(255,255,255,0.4)',
                }}
              />
            );
          })}
        </div>
        {/* Date ticks — show year boundaries */}
        <DateAxis runs={runs} totalDays={totalDays} />
      </div>

      {/* Selected run detail */}
      {selected && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: regimeColor(selected.regime) + '44',
            backgroundColor: regimeColor(selected.regime) + '08',
          }}
        >
          <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
            <div>
              <div
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={{ backgroundColor: regimeColor(selected.regime) + '22', color: regimeColor(selected.regime) }}
              >
                {regimeDisplayName(selected.regime)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {fmtShort(selected.startDate)} → {fmtShort(selected.endDate)} ·{' '}
                <span className="font-semibold text-slate-700">{selected.nDays}d</span> ·{' '}
                {selected.nActive} active · {selected.nGated} gated
                {selected.avgConfidence != null && (
                  <> · avg conf {(selected.avgConfidence * 100).toFixed(0)}%</>
                )}
              </div>
            </div>
            <button type="button" onClick={() => setSelectedIdx(null)}
              className="text-[11px] text-slate-400 hover:text-slate-700">Close</button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <StatTile
              label={`Sharpe (${mode})`}
              value={sharpeOf(selected) != null ? sharpeOf(selected)!.toFixed(2) : '—'}
              tone={sharpeOf(selected) ?? 0}
            />
            <StatTile
              label={`Cum return (${mode})`}
              value={pct(cumPct(selected))}
              tone={cumPct(selected)}
            />
            <StatTile
              label="vs SPY"
              value={pct(
                (mode === 'gross' ? selected.cumReturnGross : selected.cumReturnNet) - selected.cumSpy
              )}
              tone={(mode === 'gross' ? selected.cumReturnGross : selected.cumReturnNet) - selected.cumSpy}
            />
            <StatTile
              label="Hit rate"
              value={selected.hitRate != null ? `${(selected.hitRate * 100).toFixed(0)}%` : '—'}
              tone={(selected.hitRate ?? 0.5) - 0.5}
            />
          </div>

          {selected.topContributors.length > 0 ? (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
                Top Contributors (weight × return × size, summed across run)
              </div>
              <div className="space-y-1">
                {selected.topContributors.map((c) => (
                  <div key={c.ticker} className="flex items-center gap-3 text-[11px]">
                    <div className="w-14 font-mono font-bold text-slate-800">{c.ticker}</div>
                    <div className="flex-1 text-slate-500 truncate">
                      {TICKER_META[c.ticker]?.flag} {TICKER_META[c.ticker]?.name ?? c.ticker}
                    </div>
                    <div className="w-16 text-right text-slate-400 font-mono">{c.appearances}d</div>
                    <div className={`w-16 text-right font-mono font-semibold ${colorClass(c.contribution, 0)}`}>
                      {pct(c.contribution)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500">
              All days gated — portfolio was flat, no contributors.
            </div>
          )}
        </div>
      )}

      {/* Runs table */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            Runs (click any row)
          </div>
          <div className="flex gap-1 text-[10px]">
            {(['date', 'duration', 'sharpe', 'cum'] as const).map(k => (
              <button key={k} type="button" onClick={() => setSortKey(k)}
                className={`px-2 py-0.5 rounded border font-mono ${
                  sortKey === k ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >Sort by {k}</button>
            ))}
          </div>
        </div>
        <div className="rounded border border-slate-200 overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-2 py-1.5 font-semibold">#</th>
                <th className="px-2 py-1.5 font-semibold">Regime</th>
                <th className="px-2 py-1.5 font-semibold">Start</th>
                <th className="px-2 py-1.5 font-semibold">End</th>
                <th className="px-2 py-1.5 text-right font-semibold">Days</th>
                <th className="px-2 py-1.5 text-right font-semibold">Sharpe</th>
                <th className="px-2 py-1.5 text-right font-semibold">Cum ret</th>
                <th className="px-2 py-1.5 text-right font-semibold">vs SPY</th>
                <th className="px-2 py-1.5 text-right font-semibold">Hit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedIdx.map((i) => {
                const run = runs[i];
                const sh = sharpeOf(run);
                const cr = cumPct(run);
                const cSpy = run.cumSpy - 1;
                const vsSpy = cr - cSpy;
                const isSel = selectedIdx === i;
                return (
                  <tr key={`${run.regime}-${run.startDate}`}
                    onClick={() => setSelectedIdx(isSel ? null : i)}
                    className={`cursor-pointer transition-colors ${
                      isSel ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-2 py-1.5 text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: regimeColor(run.regime) }} />
                        <span className="text-slate-700">{regimeDisplayName(run.regime)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 font-mono text-slate-500">{fmtShort(run.startDate)}</td>
                    <td className="px-2 py-1.5 font-mono text-slate-500">{fmtShort(run.endDate)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-slate-700">
                      {run.nDays}
                      {run.nGated > 0 && (
                        <span className="text-red-500 text-[9px] ml-0.5">({run.nGated}g)</span>
                      )}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-mono font-semibold ${sh != null ? colorClass(sh) : 'text-slate-300'}`}>
                      {sh != null ? sh.toFixed(2) : '—'}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-mono ${colorClass(cr)}`}>
                      {pct(cr)}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-mono ${colorClass(vsSpy)}`}>
                      {pct(vsSpy)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-slate-600">
                      {run.hitRate != null ? `${(run.hitRate * 100).toFixed(0)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[10px] text-slate-400 leading-relaxed">
        Each row is one contiguous stint in a regime. Cum ret compounds per-day basket returns on
        active days only (gated days contribute 0). &quot;vs SPY&quot; subtracts the same-window SPY
        return. Sharpe annualizes using PPY = 252/21 so numbers are comparable to the main backtest.
      </div>
    </div>
  );
}

/** Small number tile used inside the selected-run detail panel. */
function StatTile({ label, value, tone }: { label: string; value: string; tone: number }) {
  return (
    <div className="rounded border border-slate-200 bg-white px-2.5 py-1.5">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className={`text-base font-bold font-mono ${colorClass(tone)}`}>{value}</div>
    </div>
  );
}

/**
 * Thin date axis under the Gantt bar. Marks each year boundary visible in the
 * run sequence, positioned proportionally to its cumulative day-offset.
 */
function DateAxis({ runs, totalDays }: { runs: RegimeRun[]; totalDays: number }) {
  const ticks: Array<{ label: string; leftPct: number }> = [];
  let offset = 0;
  let lastYear = '';
  for (const run of runs) {
    const yr = run.startDate.slice(0, 4);
    if (yr !== lastYear) {
      ticks.push({ label: yr, leftPct: (offset / totalDays) * 100 });
      lastYear = yr;
    }
    offset += run.nDays;
  }
  return (
    <div className="relative h-4 mt-1">
      {ticks.map((t) => (
        <div key={t.label}
          className="absolute top-0 text-[9px] font-mono text-slate-400"
          style={{ left: `${t.leftPct}%`, transform: 'translateX(-50%)' }}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}

// ─── Backtest Metrics panel (with Net/Gross toggle) ───────────────────────────

/**
 * Dashboard card that surfaces the canonical OOS / Holdout Sharpe numbers
 * from the latest persisted `BacktestRun`. Net vs Gross toggle flips
 * between post-cost (`sharpeAnn`) and pre-cost (`sharpeAnnGross`) Sharpe
 * so the user can see the cost drag directly. Turnover + annualized cost
 * drag are shown as small diagnostic lines under the metric cards.
 */
function BacktestMetricsPanel({ metrics }: { metrics: NonNullable<MacroEnginePayload['metrics']> }) {
  const [mode, setMode] = useState<ReturnMode>('net');

  const hasGross = metrics.oos?.sharpeAnnGross != null || metrics.holdout?.sharpeAnnGross != null;
  const sharpe = (row: { sharpeAnn: number; sharpeAnnGross: number | null } | null) =>
    row == null ? null : (mode === 'gross' ? (row.sharpeAnnGross ?? row.sharpeAnn) : row.sharpeAnn);

  const tc = metrics.transactionCostBps ?? null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-[11px] text-slate-400">
          Walk-forward · {metrics.windowCount} monthly windows · 21-day holding periods · Excess vs SPY ·
          {tc != null ? ` ${mode === 'gross' ? 'gross of' : `net of ${tc}bps`} costs` : ''}
        </div>
        {hasGross && (
          <div className="flex bg-slate-100 rounded overflow-hidden">
            <button
              type="button"
              onClick={() => setMode('net')}
              title={tc != null ? `After ${tc}bps one-way transaction costs` : 'After transaction costs'}
              className={`px-2.5 py-1 text-[11px] font-semibold ${mode === 'net' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              Net
            </button>
            <button
              type="button"
              onClick={() => setMode('gross')}
              title="Before transaction costs"
              className={`px-2.5 py-1 text-[11px] font-semibold ${mode === 'gross' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              Gross
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {metrics.oos && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Out-of-Sample · {metrics.dataStart} → {metrics.holdoutStart}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                label="Beat-SPY Rate"
                value={`${(metrics.oos.hitRate * 100).toFixed(1)}%`}
                sub="Active periods portfolio beat SPY"
                good={metrics.oos.hitRate >= 0.55}
              />
              <MetricCard
                label={`Sharpe (${mode === 'gross' ? 'Gross' : 'Net'}, Ann.)`}
                value={sharpe(metrics.oos)?.toFixed(2) ?? '—'}
                sub="Excess / vol, active periods only"
                good={(sharpe(metrics.oos) ?? 0) >= 0.3 ? true : (sharpe(metrics.oos) ?? 0) < 0 ? false : null}
              />
            </div>
            {(metrics.oos.avgTurnover != null || metrics.oos.annualizedCostBps != null) && (
              <div className="text-[10px] text-slate-400 flex gap-4">
                {metrics.oos.avgTurnover != null && (
                  <span>turnover {(metrics.oos.avgTurnover * 100).toFixed(1)}%/period</span>
                )}
                {metrics.oos.annualizedCostBps != null && (
                  <span>cost drag {metrics.oos.annualizedCostBps.toFixed(1)}bps/yr</span>
                )}
              </div>
            )}
          </div>
        )}
        {metrics.holdout && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Holdout · {metrics.holdoutStart} → present
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                label="Beat-SPY Rate"
                value={`${(metrics.holdout.hitRate * 100).toFixed(1)}%`}
                sub="Active periods portfolio beat SPY"
                good={metrics.holdout.hitRate >= 0.55}
              />
              <MetricCard
                label={`Sharpe (${mode === 'gross' ? 'Gross' : 'Net'}, Ann.)`}
                value={sharpe(metrics.holdout)?.toFixed(2) ?? '—'}
                sub="Excess / vol, active periods only"
                good={(sharpe(metrics.holdout) ?? 0) >= 0.3 ? true : (sharpe(metrics.holdout) ?? 0) < 0 ? false : null}
              />
            </div>
            {(metrics.holdout.avgTurnover != null || metrics.holdout.annualizedCostBps != null) && (
              <div className="text-[10px] text-slate-400 flex gap-4">
                {metrics.holdout.avgTurnover != null && (
                  <span>turnover {(metrics.holdout.avgTurnover * 100).toFixed(1)}%/period</span>
                )}
                {metrics.holdout.annualizedCostBps != null && (
                  <span>cost drag {metrics.holdout.annualizedCostBps.toFixed(1)}bps/yr</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <CollapsibleSection title="What these numbers mean">
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 space-y-2 text-[12px] text-slate-600">
          <p><strong>Beat-SPY Rate</strong> — fraction of 21-day (monthly) periods where the equal-weight long portfolio (top 25% ranked ETFs by 12-month cross-sectional momentum) beat SPY. &gt;55% means the ranking is consistently adding value.</p>
          <p><strong>Sharpe Ratio</strong> — annualized excess return / vol, computed on active periods only. Credit-gated flat days are excluded from both numerator and denominator (an honest "on-when-active" Sharpe, not a zero-polluted one). The Net / Gross toggle flips between post- and pre-transaction-cost series; at 5 bps/side the cost drag works out to ~10 bps/yr OOS and ~7 bps/yr holdout.</p>
          <p><strong>Walk-forward</strong> — the model ranks the 17-ETF universe monthly by zCarry (12-month momentum) and longs the top 25%, gated flat during credit-stress regimes (6-regime k-means system). Each monthly window was evaluated strictly OOS. The OOS period is 2007–2022; holdout is 2022–present (never seen during design).</p>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ─── Regime Attribution panel ─────────────────────────────────────────────────

/**
 * Decomposes the holdout alpha by regime: how much time we spent in each
 * regime, how often we were gated flat in it, and the conditional Sharpe /
 * alpha share. Useful for answering "which macro environment does this
 * strategy actually make money in?" and spotting if any single regime is
 * carrying the whole number.
 *
 * Gated regimes show up as "100% gated / 0% alpha share" — that's the
 * correct behavior (the credit gate is designed to make them zero).
 */
function RegimeAttributionPanel() {
  const [byRegime, setByRegime] = useState<RegimeAttribution[] | null>(null);
  const [asOf,     setAsOf]     = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [mode,     setMode]     = useState<ReturnMode>('net');

  useEffect(() => {
    fetch('/api/dashboard/macro-engine/history')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: HistoryPayload) => { setByRegime(d.byRegime); setAsOf(d.asOfDate); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)           return <div className="text-sm text-slate-400 py-4">Computing attribution…</div>;
  if (error)             return <div className="text-sm text-red-600 py-4">Attribution failed: {error}</div>;
  if (!byRegime?.length) return <div className="text-sm text-slate-400 py-4">No attribution data.</div>;

  const sharpe = (r: RegimeAttribution) => mode === 'gross' ? r.sharpeGross : r.sharpeNet;
  const alphaShare = (r: RegimeAttribution) => mode === 'gross' ? r.alphaShareGross : r.alphaShareNet;
  const cumReturn = (r: RegimeAttribution) => mode === 'gross' ? r.cumReturnGross : r.cumReturnNet;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-[11px] text-slate-400">
          Per-regime Sharpe, hit rate, and alpha share over the live holdout replay
          {asOf ? ` (through ${fmtDate(asOf)})` : ''}.
        </div>
        <div className="flex bg-slate-100 rounded overflow-hidden">
          <button
            type="button"
            onClick={() => setMode('net')}
            className={`px-2.5 py-1 text-[11px] font-semibold ${mode === 'net' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            Net
          </button>
          <button
            type="button"
            onClick={() => setMode('gross')}
            className={`px-2.5 py-1 text-[11px] font-semibold ${mode === 'gross' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            Gross
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <th className="py-2 text-left">Regime</th>
              <th className="py-2 text-right">% of time</th>
              <th className="py-2 text-right">Active / Gated</th>
              <th className="py-2 text-right">Sharpe</th>
              <th className="py-2 text-right">Hit Rate</th>
              <th className="py-2 text-right">Turnover</th>
              <th className="py-2 text-right">Cum Return</th>
              <th className="py-2 text-right">α share</th>
            </tr>
          </thead>
          <tbody>
            {byRegime.map(r => {
              const sh    = sharpe(r);
              const hr    = r.hitRate;
              const cumPf = cumReturn(r);
              const share = alphaShare(r);
              // Visual hint for "all-gated" regimes: these are the credit-stress
              // labels the model is designed to avoid; they should have 0% active.
              const allGated = r.nActive === 0;
              return (
                <tr key={r.regime} className="border-b border-slate-100 last:border-b-0">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: regimeColor(r.regime) }} />
                      <span className="font-medium text-slate-700">{regimeDisplayName(r.regime)}</span>
                      {allGated && <span className="rounded bg-red-100 text-red-700 px-1.5 py-0.5 text-[9px] font-bold">GATED</span>}
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-600">
                    {(r.shareOfTime * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-500 text-[11px]">
                    {r.nActive} / {r.nGated}
                  </td>
                  <td className={`py-2.5 text-right font-mono font-semibold ${
                    sh == null ? 'text-slate-300' : colorClass(sh - 0.3, 0)
                  }`}>
                    {sh == null ? '—' : sh.toFixed(2)}
                  </td>
                  <td className={`py-2.5 text-right font-mono ${
                    hr == null ? 'text-slate-300' : colorClass((hr ?? 0.5) - 0.5, 0.05)
                  }`}>
                    {hr == null ? '—' : `${(hr * 100).toFixed(0)}%`}
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-500">
                    {allGated ? '—' : `${(r.avgTurnover * 100).toFixed(0)}%`}
                  </td>
                  <td className={`py-2.5 text-right font-mono ${colorClass(cumPf - 1, 0)}`}>
                    {pct(cumPf - 1)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-600">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(100, share * 100)}%`, backgroundColor: regimeColor(r.regime) }}
                        />
                      </div>
                      <span className="w-10 text-right">{(share * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] text-slate-400 leading-relaxed">
        <strong>Alpha share</strong> is the fraction of total |excess return| delivered in each regime —
        a regime with 40% share has driven 40% of the strategy&apos;s signal (positive or negative).
        Credit-stress regimes show up gated (0 active days, 0 share) by design. Sharpe uses only a regime&apos;s
        active days and is nulled below 4 observations. <strong>Cum return</strong> compounds overlapping
        21-day forward returns (the engine samples daily) so the absolute magnitude is inflated relative to a
        tradeable curve — use the <em>relative</em> split across regimes, not the raw percentages.
      </div>
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
            Regime-gated cross-sectional momentum · 17 global ETFs · Walk-forward backtested · 21-day (monthly) horizon
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
                    6 regimes via k-means on 20yr of macro factor z-scores. Credit-stress regimes gate the portfolio flat; other regimes drive cross-sectional momentum ranking.
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

      {/* ── Panel: Regime Outlook (Markov forecast) ─────────────────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Regime Outlook · Markov Forecast</CardTitle>
          <CardDescription className="text-[11px]">
            n-step-ahead probability of each regime conditional on today · 21d = one rebalance period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegimeOutlookCard />
        </CardContent>
      </Card>

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

      {/* ── Panel: Today's Trades (live holdout replay) ─────────────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Today&apos;s Trades · Live Model Replay</CardTitle>
          <CardDescription className="text-[11px]">
            Current-day basket produced by replaying the backtest engine day-by-day from 2022-01-01 · Same scoring path as Holdout Sharpe below · Net of transaction costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TodaysTradesCard />
        </CardContent>
      </Card>

      {/* ── Panel: Conviction-weighted recommendation (Chunk 12) ─────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Recommended Basket · Conviction-Weighted</CardTitle>
          <CardDescription className="text-[11px]">
            Rank-proportional sizing with sector/country caps · Backtest validated equal-weighted, this card is a forward-looking display overlay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConvictionRecommendationCard />
        </CardContent>
      </Card>

      {/* ── Panel: Historical Performance + Explorer ──────────────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Historical Performance · Holdout Equity</CardTitle>
          <CardDescription className="text-[11px]">
            Live model replay from 2022-01-01 · Equal-weight long of top-25% ETFs by 12-month momentum, credit-gate flats honored · Net toggle includes transaction costs · Click any point to explore that date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceChart />
        </CardContent>
      </Card>

      {/* ── Panel: Backtest Metrics (with net/gross toggle) ──────────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Backtest Performance</CardTitle>
          <CardDescription className="text-[11px]">
            Walk-forward OOS · Excess returns vs SPY, credit-gate flat days excluded · Toggle Net / Gross to see transaction-cost impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.metrics ? (
            <p className="text-sm text-slate-400">No backtest metrics. Run <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded">npm run backtest:run</code>.</p>
          ) : (
            <BacktestMetricsPanel metrics={data.metrics} />
          )}
        </CardContent>
      </Card>

      {/* ── Panel: Regime Attribution ──────────────────────────────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Regime Attribution · Holdout</CardTitle>
          <CardDescription className="text-[11px]">
            Where the holdout alpha came from — Sharpe, hit rate, and α share by macro regime over the live replay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegimeAttributionPanel />
        </CardContent>
      </Card>

      {/* ── Panel: Regime Timeline (Gantt + per-run drilldown) ───────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Regime Timeline · Holdout History</CardTitle>
          <CardDescription className="text-[11px]">
            Every contiguous regime stint since 2022-01-01 · Click any segment or row to inspect stats + top contributors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegimeTimelinePanel />
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
              { title: '2. Regime Detection', body: 'k-means on 6 macro factor z-scores finds 6 regimes. Credit-stress regimes gate the model flat (no exposure). Centroid template matching keeps labels stable across refits (2008 / 2020 / 2022 shocks classified consistently).' },
              { title: '3. Walk-Forward Backtest', body: 'Cross-sectional 12-month momentum ranker, gated flat during credit-stress regimes, sized by regime confidence. Expanding training window, monthly test steps, 21-day forward horizon. Hard holdout boundary at 2022-01-01; holdout data never touched during design.' },
              { title: '4. Signal Scoring', body: "Today's zCarry rankings drive conviction; top 25% of the universe = overweight, scaled by regime confidence. Empirical decile calibration on OOS data gives P(outperform SPY) at 6m / 12m." },
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
