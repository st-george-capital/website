'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus, Activity, Loader2, AlertTriangle } from 'lucide-react';
import type { FlowsPayload, ETFRow, PairRatio, RegimeSignal } from '@/app/api/dashboard/flows/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number | null, decimals = 2, suffix = '%'): string {
  if (v === null) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(decimals)}${suffix}`;
}

function returnColor(v: number | null): string {
  if (v === null) return 'text-gray-300';
  if (v > 1.5) return 'text-emerald-600 font-semibold';
  if (v > 0.3) return 'text-emerald-500';
  if (v > -0.3) return 'text-gray-500';
  if (v > -1.5) return 'text-red-500';
  return 'text-red-600 font-semibold';
}

function returnBg(v: number | null): string {
  if (v === null) return '';
  if (v > 2) return 'bg-emerald-100';
  if (v > 0.5) return 'bg-emerald-50';
  if (v > -0.5) return '';
  if (v > -2) return 'bg-red-50';
  return 'bg-red-100';
}

function signalDot(score: number): JSX.Element {
  const cls = score === 0
    ? 'bg-emerald-400'
    : score === 1
    ? 'bg-yellow-400'
    : score === 2
    ? 'bg-orange-400'
    : 'bg-red-500';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls} mr-2 flex-shrink-0`} />;
}

const REGIME_STYLES = {
  'Risk-on':       { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-800',  badge: 'bg-emerald-500'  },
  'Neutral':       { bg: 'bg-yellow-50',   border: 'border-yellow-200',  text: 'text-yellow-800',   badge: 'bg-yellow-500'   },
  'Hedging-heavy': { bg: 'bg-orange-50',   border: 'border-orange-200',  text: 'text-orange-800',   badge: 'bg-orange-500'   },
  'Stress':        { bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-800',      badge: 'bg-red-600'      },
};

const GROUP_LABELS: Record<ETFRow['group'], string> = {
  us: 'United States',
  asia: 'Asia',
  sector: 'Sectors',
  bonds: 'Bonds / Credit',
  volatility: 'Volatility',
};

const GROUP_ORDER: ETFRow['group'][] = ['us', 'asia', 'sector', 'bonds', 'volatility'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function RegimeBanner({ regime }: { regime: FlowsPayload['regime'] }) {
  const s = REGIME_STYLES[regime.label];
  return (
    <div className={`rounded-xl border ${s.bg} ${s.border} p-5 mb-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Activity size={18} className={s.text} />
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Risk Regime</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${s.badge}`}>
          {regime.label}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {regime.signals.map(sig => (
          <div key={sig.name} className="bg-white rounded-lg border border-gray-100 p-3">
            <div className="flex items-center mb-1">
              {signalDot(sig.score)}
              <span className="text-xs font-semibold text-gray-600">{sig.name}</span>
            </div>
            <p className="text-lg font-bold text-gray-900 mb-0.5">{sig.value}</p>
            <p className="text-xs text-gray-400 leading-tight">{sig.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ETFHeatmap({ etfs }: { etfs: ETFRow[] }) {
  const grouped: Partial<Record<ETFRow['group'], ETFRow[]>> = {};
  for (const etf of etfs) {
    if (!grouped[etf.group]) grouped[etf.group] = [];
    grouped[etf.group]!.push(etf);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">1. Where Is Money Going? — ETF Performance</h2>
        <p className="text-xs text-gray-400 mt-0.5">Color intensity = magnitude of move. Green = inflows / outperformance.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-100 bg-gray-50/50">
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">ETF</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Price</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">1D</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">1W</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">1M</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Vol/Avg</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Z</th>
            </tr>
          </thead>
          <tbody>
            {GROUP_ORDER.map(g => {
              const rows = grouped[g];
              if (!rows?.length) return null;
              return (
                <>
                  <tr key={`hdr-${g}`} className="bg-gray-50/70">
                    <td colSpan={7} className="px-5 py-1.5">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{GROUP_LABELS[g]}</span>
                    </td>
                  </tr>
                  {rows.map((etf, i) => (
                    <tr key={etf.ticker} className={`${returnBg(etf.return1D)} ${i % 2 === 1 ? 'bg-opacity-50' : ''} hover:bg-gray-50/60 transition-colors`}>
                      <td className="px-5 py-2.5">
                        <div className="font-semibold text-gray-900 text-xs">{etf.name}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-700 text-xs">
                        {etf.price !== null ? `$${etf.price.toFixed(2)}` : '—'}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-xs font-medium ${returnColor(etf.return1D)}`}>
                        {fmt(etf.return1D)}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-xs ${returnColor(etf.return5D)}`}>
                        {fmt(etf.return5D)}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-xs ${returnColor(etf.return20D)}`}>
                        {fmt(etf.return20D)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs">
                        {etf.volumeRatio !== null ? (
                          <span className={etf.volumeRatio > 1.5 ? 'text-orange-600 font-semibold' : etf.volumeRatio > 1.2 ? 'text-yellow-600' : 'text-gray-400'}>
                            {etf.volumeRatio.toFixed(2)}×
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-2.5 text-right text-xs">
                        {etf.zScore !== null ? (
                          <span className={Math.abs(etf.zScore) >= 2 ? (etf.zScore > 0 ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold') : Math.abs(etf.zScore) >= 1 ? 'text-gray-600' : 'text-gray-300'}>
                            {Math.abs(etf.zScore).toFixed(1)}σ
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PairsTable({ pairs }: { pairs: PairRatio[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">3. Relative Performance — Pair Ratios</h2>
        <p className="text-xs text-gray-400 mt-0.5">Rising ratio = numerator outperforming denominator. 5D trend shows direction of pressure.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-100 bg-gray-50/50">
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Pair</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Tracks</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Ratio</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">1D Δ</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">5D Δ</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Signal</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair, i) => (
              <tr key={pair.label} className={i % 2 === 0 ? '' : 'bg-gray-50/40'}>
                <td className="px-5 py-2.5 font-semibold text-gray-900 text-xs">{pair.label}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs">{pair.description}</td>
                <td className="px-4 py-2.5 text-right font-mono text-gray-700 text-xs">
                  {pair.ratio !== null ? pair.ratio.toFixed(4) : '—'}
                </td>
                <td className={`px-4 py-2.5 text-right text-xs ${returnColor(pair.trend1D)}`}>
                  {fmt(pair.trend1D)}
                </td>
                <td className={`px-4 py-2.5 text-right text-xs font-medium ${returnColor(pair.trend5D)}`}>
                  {fmt(pair.trend5D)}
                </td>
                <td className="px-5 py-2.5 text-right">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    pair.signal === 'bullish' ? 'bg-emerald-50 text-emerald-700' :
                    pair.signal === 'bearish' ? 'bg-red-50 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {pair.signal === 'bullish' ? <TrendingUp size={10} /> : pair.signal === 'bearish' ? <TrendingDown size={10} /> : <Minus size={10} />}
                    {pair.signal}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InterpretationCard({ lines }: { lines: string[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Trade Interpretation</h2>
      <div className="space-y-2.5">
        {lines.map((line, i) => (
          <p key={i} className="text-sm text-gray-600 leading-relaxed border-l-2 border-indigo-100 pl-3">{line}</p>
        ))}
      </div>
      <p className="text-xs text-gray-300 mt-4">Rule-based inference from ETF price/volume signals. Not investment advice.</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FlowsDashboard() {
  const [data, setData] = useState<FlowsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/flows');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: FlowsPayload = await res.json();
      setData(json);
      setLastFetched(new Date());
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Capital Flows & Positioning</h1>
          <p className="text-sm text-gray-400 mt-1">
            ETF-based proxy for where institutional capital is moving and how investors are hedging.
            {lastFetched && ` · Updated ${lastFetched.toLocaleTimeString()}`}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-3" />
          <span className="text-sm">Fetching 15 ETFs sequentially — takes ~10s on first load, cached 5 min after…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700 mb-6">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Regime Banner */}
          <RegimeBanner regime={data.regime} />

          {/* Two-column layout for Q2 and interpretation on larger screens */}
          <div className="grid grid-cols-1 gap-6 mb-0">
            {/* Q1: ETF Heatmap */}
            <ETFHeatmap etfs={data.etfs} />

            {/* Q3: Pairs */}
            <PairsTable pairs={data.pairs} />

            {/* Interpretation */}
            <InterpretationCard lines={data.interpretation} />
          </div>

          <p className="text-xs text-gray-300 text-center mt-4">
            Data via Alpha Vantage · TIME_SERIES_DAILY · ETFs are proxies only · Cached 5 min
          </p>
        </>
      )}
    </div>
  );
}
