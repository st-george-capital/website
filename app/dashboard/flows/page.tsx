'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, TrendingUp, TrendingDown, Minus, Activity,
  Loader2, AlertTriangle, Info, BarChart2, DollarSign,
} from 'lucide-react';
import type { FlowsPayload, ETFRow, PairRatio, MacroContext } from '@/app/api/dashboard/flows/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number | null, decimals = 2, suffix = '%'): string {
  if (v === null) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(decimals)}${suffix}`;
}

function fmtPlain(v: number | null, decimals = 2, prefix = '', suffix = ''): string {
  if (v === null) return '—';
  return `${prefix}${v.toFixed(decimals)}${suffix}`;
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
  if (v > 2) return 'bg-emerald-50';
  if (v > 0.5) return 'bg-emerald-50/40';
  if (v > -0.5) return '';
  if (v > -2) return 'bg-red-50/40';
  return 'bg-red-50';
}

function signalDot(score: number) {
  const cls = score === 0 ? 'bg-emerald-400' : score === 1 ? 'bg-yellow-400' : score === 2 ? 'bg-orange-400' : 'bg-red-500';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${cls}`} />;
}

function ZBadge({ z }: { z: number | null }) {
  if (z === null) return <span className="text-gray-300">—</span>;
  const abs = Math.abs(z);
  const cls = abs >= 2
    ? (z > 0 ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold')
    : abs >= 1 ? 'text-gray-500 font-medium' : 'text-gray-300';
  return <span className={cls}>{abs.toFixed(1)}σ</span>;
}

const REGIME_STYLES = {
  'Risk-on':       { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-500' },
  'Neutral':       { bg: 'bg-yellow-50',  border: 'border-yellow-200',  text: 'text-yellow-800',  badge: 'bg-yellow-500'  },
  'Hedging-heavy': { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-800',  badge: 'bg-orange-500'  },
  'Stress':        { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-800',     badge: 'bg-red-600'     },
};

const GROUP_LABELS: Record<ETFRow['group'], string> = {
  us:         'United States & Canada',
  europe:     'Europe',
  asia:       'Asia',
  latam:      'Latin America',
  sector:     'Sectors',
  bonds:      'Bonds / Credit',
  fx:         'FX / Dollar',
  volatility: 'Volatility',
};

const GROUP_ORDER: ETFRow['group'][] = ['us', 'europe', 'asia', 'latam', 'sector', 'bonds', 'fx', 'volatility'];

// ─── Macro Bar ────────────────────────────────────────────────────────────────

function MacroBar({ macro }: { macro: MacroContext }) {
  const items: Array<{ label: string; value: string; sub: string | null; color: string }> = [
    {
      label: 'Fed Funds Rate',
      value: macro.fedFundsRate !== null ? `${macro.fedFundsRate.toFixed(2)}%` : '—',
      sub: null,
      color: 'text-gray-700',
    },
    {
      label: 'US 10Y Yield',
      value: macro.yield10Y !== null ? `${macro.yield10Y.toFixed(2)}%` : '—',
      sub: null,
      color: 'text-gray-700',
    },
    {
      label: 'WTI Crude',
      value: macro.wtiCrude !== null ? `$${macro.wtiCrude.toFixed(2)}` : '—',
      sub: macro.wtiReturn5D !== null ? `${macro.wtiReturn5D > 0 ? '+' : ''}${macro.wtiReturn5D.toFixed(1)}% 5D` : null,
      color: macro.wtiReturn5D !== null
        ? (macro.wtiReturn5D > 2 ? 'text-emerald-600' : macro.wtiReturn5D < -2 ? 'text-red-500' : 'text-gray-700')
        : 'text-gray-700',
    },
    {
      label: 'Bitcoin',
      value: macro.btcUSD !== null ? `$${Math.round(macro.btcUSD).toLocaleString()}` : '—',
      sub: macro.btcReturn5D !== null ? `${macro.btcReturn5D > 0 ? '+' : ''}${macro.btcReturn5D.toFixed(1)}% 5D` : null,
      color: macro.btcReturn5D !== null
        ? (macro.btcReturn5D > 5 ? 'text-emerald-600' : macro.btcReturn5D < -5 ? 'text-red-500' : 'text-gray-700')
        : 'text-gray-700',
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 mb-4 flex flex-wrap items-center gap-x-8 gap-y-2">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold uppercase tracking-wide">
        <DollarSign size={11} />
        Macro
      </div>
      {items.map(item => (
        <div key={item.label} className="flex flex-col">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{item.label}</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
            {item.sub && (
              <span className={`text-[10px] font-medium ${item.color}`}>{item.sub}</span>
            )}
          </div>
        </div>
      ))}
      <span className="text-[10px] text-gray-300 ml-auto">
        Fed &amp; Yield via Alpha Vantage · WTI daily · BTC daily close
      </span>
    </div>
  );
}

// ─── Regime Banner ────────────────────────────────────────────────────────────

function RegimeBanner({ regime }: { regime: FlowsPayload['regime'] }) {
  const s = REGIME_STYLES[regime.label];
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);

  return (
    <div className={`rounded-xl border ${s.bg} ${s.border} p-5 mb-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Activity size={18} className={s.text} />
          <div>
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Risk Regime</span>
            <span className="text-xs text-gray-400 ml-2">— composite of 5 market stress signals</span>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${s.badge}`}>
          {regime.label}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {regime.signals.map(sig => (
          <div key={sig.name} className="bg-white rounded-lg border border-gray-100 p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                {signalDot(sig.score)}
                <span className="text-xs font-semibold text-gray-600">{sig.name}</span>
              </div>
              <button
                onClick={() => setExpandedSignal(expandedSignal === sig.name ? null : sig.name)}
                className="text-gray-300 hover:text-gray-500 transition-colors"
                title="Why this signal?"
              >
                <Info size={11} />
              </button>
            </div>
            <p className="text-lg font-bold text-gray-900 mb-0.5">{sig.value}</p>
            {expandedSignal === sig.name ? (
              <p className="text-xs text-indigo-600 leading-tight">{sig.why}</p>
            ) : (
              <p className="text-xs text-gray-400 leading-tight">{sig.note}</p>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Click <Info size={10} className="inline" /> on any signal card for the reasoning behind it. &nbsp;·&nbsp;
        VIX signal uses VIXY 5D % return — not price (VIXY price ≠ VIX level due to futures roll decay).
      </p>
    </div>
  );
}

// ─── Market Structure Panel ───────────────────────────────────────────────────

interface StructureMetric {
  label: string;
  value: string;
  subtext: string;
  color: string;
  tooltip: string;
}

function interpretBreadth(pct: number | null, total: number): StructureMetric {
  const label = 'Market Breadth';
  const tooltip = '% of tracked ETFs closed up 1D. >65% = broad rally. <35% = broad sell-off. Market up but breadth <40% = narrow move, few names carrying — fragile.';
  if (pct === null) return { label, value: '—', subtext: 'no data', color: 'text-gray-300', tooltip };
  const color = pct > 65 ? 'text-emerald-600' : pct > 50 ? 'text-emerald-500' : pct > 35 ? 'text-yellow-600' : 'text-red-500';
  const subtext = pct > 65 ? `Wide participation (${total} ETFs)` : pct > 50 ? `Majority up (${total} ETFs)` : pct > 35 ? `Narrow / weak (${total} ETFs)` : `Broad sell-off (${total} ETFs)`;
  return { label, value: `${pct.toFixed(0)}% up`, subtext, color, tooltip };
}

function interpretDispersion(d: number | null): StructureMetric {
  const label = 'Sector Dispersion';
  const tooltip = 'Std dev of sector ETF 1D returns. Low = everything moves together = macro/ETF regime. High = sectors diverging = stock-picking / fundamental regime.';
  if (d === null) return { label, value: '—', subtext: 'no data', color: 'text-gray-300', tooltip };
  const color = d > 1.5 ? 'text-emerald-600' : d > 0.8 ? 'text-yellow-600' : 'text-red-500';
  const subtext = d > 1.5 ? 'High — fundamental regime' : d > 0.8 ? 'Moderate — mixed' : 'Low — macro/ETF dominance';
  return { label, value: `±${d.toFixed(2)}%`, subtext, color, tooltip };
}

function interpretCorrelation(c: number | null): StructureMetric {
  const label = 'Sector Corr (20D)';
  const tooltip = 'Average pairwise correlation across sector ETFs over 20 days. >70% = sectors all moving together = macro/ETF dominance. <40% = sectors diverging = individual dynamics.';
  if (c === null) return { label, value: '—', subtext: 'no data', color: 'text-gray-300', tooltip };
  const color = c > 0.70 ? 'text-red-500' : c > 0.50 ? 'text-yellow-600' : 'text-emerald-600';
  const subtext = c > 0.70 ? 'ETF/macro flows dominating' : c > 0.50 ? 'Mixed macro + idiosyncratic' : 'Stock-picking regime';
  return { label, value: `${(c * 100).toFixed(0)}%`, subtext, color, tooltip };
}

function interpretRealizedVol(rv: number | null): StructureMetric {
  const label = 'SPY Realised Vol';
  const tooltip = 'SPY 20-day annualised realised vol (log returns). >25% = stress. 12–18% = normal. Compare to VIXY return: if VIXY is surging but realised is low, fear is priced ahead of actual moves.';
  if (rv === null) return { label, value: '—', subtext: 'no data', color: 'text-gray-300', tooltip };
  const color = rv > 25 ? 'text-red-600' : rv > 18 ? 'text-orange-500' : rv > 12 ? 'text-yellow-600' : 'text-emerald-600';
  const subtext = rv > 25 ? 'Elevated — stress' : rv > 18 ? 'Above normal' : rv > 12 ? 'Normal range' : 'Low-vol regime';
  return { label, value: `${rv.toFixed(1)}%`, subtext, color, tooltip };
}

function interpretDxy(r5D: number | null): StructureMetric {
  const label = 'USD Strength (5D)';
  const tooltip = 'UUP ETF 5D return — proxy for DXY. USD rising = global risk-off or Fed tightening. Negative for EM (Korea, Vietnam, Brazil, Mexico) which borrow in dollars.';
  if (r5D === null) return { label, value: '—', subtext: 'no data', color: 'text-gray-300', tooltip };
  const color = r5D > 0.5 ? 'text-red-500' : r5D > -0.5 ? 'text-gray-500' : 'text-emerald-600';
  const subtext = r5D > 0.5 ? 'Strengthening — EM headwind' : r5D > -0.5 ? 'Stable — neutral' : 'Weakening — EM tailwind';
  return { label, value: fmt(r5D), subtext, color, tooltip };
}

function interpretIG(r5D: number | null): StructureMetric {
  const label = 'IG Credit (5D)';
  const tooltip = 'LQD ETF 5D return — investment grade bonds. If both LQD and HYG sell off, it\'s systemic credit stress. If only HYG falls, it\'s contained junk-bond stress.';
  if (r5D === null) return { label, value: '—', subtext: 'no data', color: 'text-gray-300', tooltip };
  const color = r5D > 0.3 ? 'text-emerald-600' : r5D > -0.3 ? 'text-gray-500' : 'text-red-500';
  const subtext = r5D > 0.3 ? 'IG tightening — credit healthy' : r5D > -0.3 ? 'IG stable' : 'IG widening — systemic stress';
  return { label, value: fmt(r5D), subtext, color, tooltip };
}

function MarketStructurePanel({ structure }: { structure: FlowsPayload['structure'] }) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  const metrics: StructureMetric[] = [
    interpretBreadth(structure.breadthPctUp, structure.breadthTotal),
    interpretDispersion(structure.dispersion1D),
    interpretCorrelation(structure.avgCorrelation20D),
    interpretRealizedVol(structure.realizedVol20D),
    interpretDxy(structure.dxyReturn5D),
    interpretIG(structure.igReturn5D),
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <BarChart2 size={14} className="text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-700">Market Structure — Flow vs Fundamental Regime</h2>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          <strong className="text-gray-500">Low dispersion + high correlation</strong> = macro/ETF flows dominating &nbsp;·&nbsp;
          <strong className="text-gray-500">High dispersion + low correlation</strong> = stock-picking regime &nbsp;·&nbsp;
          Click <Info size={10} className="inline" /> for methodology
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y divide-gray-100">
        {metrics.map(m => (
          <div key={m.label} className="p-4 relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide leading-tight">{m.label}</span>
              <button
                onMouseEnter={() => setTooltip(m.label)}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => setTooltip(tooltip === m.label ? null : m.label)}
                className="text-gray-200 hover:text-gray-400 transition-colors flex-shrink-0 ml-1"
              >
                <Info size={10} />
              </button>
            </div>
            {tooltip === m.label ? (
              <p className="text-[10px] text-indigo-600 leading-tight mt-1">{m.tooltip}</p>
            ) : (
              <>
                <p className={`text-xl font-bold mt-1 ${m.color}`}>{m.value}</p>
                <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{m.subtext}</p>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="px-5 py-2 bg-gray-50/50 border-t border-gray-100">
        <p className="text-[10px] text-gray-400">
          <strong className="text-gray-500">Regime read:</strong> breadth narrow + correlation high + dispersion low → ETF/macro flows dominating (the Goldman 40%+ ETF-volume regime). &nbsp;Dispersion high + correlation falling → fundamental regime, stock/sector selection matters.
        </p>
      </div>
    </div>
  );
}

// ─── ETF Heatmap ─────────────────────────────────────────────────────────────

function ETFHeatmap({ etfs }: { etfs: ETFRow[] }) {
  const grouped: Partial<Record<ETFRow['group'], ETFRow[]>> = {};
  for (const etf of etfs) {
    if (!grouped[etf.group]) grouped[etf.group] = [];
    grouped[etf.group]!.push(etf);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">Where Is Money Going? — ETF Performance</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          <span className="text-emerald-600 font-medium">↑ Green</span> = capital flowing in / outperforming &nbsp;·&nbsp;
          <span className="text-red-500 font-medium">↓ Red</span> = capital flowing out / underperforming &nbsp;·&nbsp;
          3M &amp; 5M from 100-day compact window
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-100 bg-gray-50/50">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">ETF</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Price</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">1D</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">1W</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">1M</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">3M</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">~5M</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide" title="Today's volume / 20-day avg">Vol/Avg ⓘ</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide" title="Z-score vs 20-day history">Z ⓘ</th>
            </tr>
          </thead>
          <tbody>
            {GROUP_ORDER.map(g => {
              const rows = grouped[g];
              if (!rows?.length) return null;
              return (
                <>
                  <tr key={`hdr-${g}`} className="bg-gray-50/70">
                    <td colSpan={9} className="px-4 py-1.5">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{GROUP_LABELS[g]}</span>
                    </td>
                  </tr>
                  {rows.map((etf) => (
                    <tr key={etf.ticker} className={`${returnBg(etf.return1D)} hover:bg-gray-50/60 transition-colors`}>
                      <td className="px-4 py-2 font-semibold text-gray-900 text-xs">{etf.name}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600 text-xs">
                        {etf.price !== null ? `$${etf.price.toFixed(2)}` : '—'}
                      </td>
                      <td className={`px-3 py-2 text-right text-xs font-medium ${returnColor(etf.return1D)}`}>{fmt(etf.return1D)}</td>
                      <td className={`px-3 py-2 text-right text-xs ${returnColor(etf.return5D)}`}>{fmt(etf.return5D)}</td>
                      <td className={`px-3 py-2 text-right text-xs ${returnColor(etf.return20D)}`}>{fmt(etf.return20D)}</td>
                      <td className={`px-3 py-2 text-right text-xs ${returnColor(etf.return63D)}`}>{fmt(etf.return63D)}</td>
                      <td className={`px-3 py-2 text-right text-xs ${returnColor(etf.return95D)}`}>{fmt(etf.return95D)}</td>
                      <td className="px-3 py-2 text-right text-xs">
                        {etf.volumeRatio !== null ? (
                          <span className={etf.volumeRatio > 2 ? 'text-red-600 font-bold' : etf.volumeRatio > 1.5 ? 'text-orange-500 font-semibold' : etf.volumeRatio > 1.2 ? 'text-yellow-600' : 'text-gray-400'}>
                            {etf.volumeRatio.toFixed(2)}×
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right text-xs">
                        <ZBadge z={etf.zScore} />
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

// ─── Pair Ratios ──────────────────────────────────────────────────────────────

const PAIR_GROUP_LABELS: Record<string, string> = {
  Regional: 'Regional vs US',
  Sector:   'Sector / Factor',
  Credit:   'Credit',
  Risk:     'Risk / Safety / Dollar',
};

const PAIR_GROUPS: { label: string; pairs: string[] }[] = [
  { label: 'Regional', pairs: ['Korea vs US', 'Taiwan vs US', 'China vs US', 'Europe vs US', 'LatAm vs US'] },
  { label: 'Sector',   pairs: ['Semis vs Software', 'Cyclicals vs Defensives', 'Financials vs Market', 'Growth vs Value'] },
  { label: 'Credit',   pairs: ['HY vs IG Credit', 'Credit vs Safety'] },
  { label: 'Risk',     pairs: ['Risk vs Safety', 'Dollar vs Equities'] },
];

function PairsTable({ pairs }: { pairs: PairRatio[] }) {
  const pairMap = new Map(pairs.map(p => [p.label, p]));

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">Relative Performance — Pair Ratios</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Each row = Numerator ÷ Denominator. &nbsp;
          <span className="text-emerald-600 font-medium">↑ Rising</span> = numerator outperforming. &nbsp;
          <span className="text-red-500 font-medium">↓ Falling</span> = opposite. &nbsp;
          <strong className="text-gray-500">Z</strong> = how unusual today's ratio move is vs 20-day history. &nbsp;
          1M/5M from 100-day window.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-100 bg-gray-50/50">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Pair</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden xl:table-cell">↑ Bullish means</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Ratio</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">1D</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">5D</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">1M</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">~5M</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide" title="Z-score of today's ratio move">Z ⓘ</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Signal</th>
            </tr>
          </thead>
          <tbody>
            {PAIR_GROUPS.map(g => (
              <>
                <tr key={`ghdr-${g.label}`} className="bg-gray-50/70">
                  <td colSpan={9} className="px-4 py-1.5">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{PAIR_GROUP_LABELS[g.label]}</span>
                  </td>
                </tr>
                {g.pairs.map(pLabel => {
                  const pair = pairMap.get(pLabel);
                  if (!pair) return null;
                  return (
                    <tr key={pair.label} className="hover:bg-gray-50/40 transition-colors border-b border-gray-50">
                      <td className="px-4 py-2">
                        <div className="font-semibold text-gray-900 text-xs">{pair.label}</div>
                        <div className="text-gray-400 text-[10px]">{pair.description}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs hidden xl:table-cell max-w-[200px]">
                        <span className="line-clamp-2">{pair.bullishMeans}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600 text-xs">
                        {pair.ratio !== null ? pair.ratio.toFixed(4) : '—'}
                      </td>
                      <td className={`px-3 py-2 text-right text-xs ${returnColor(pair.trend1D)}`}>{fmt(pair.trend1D)}</td>
                      <td className={`px-3 py-2 text-right text-xs font-medium ${returnColor(pair.trend5D)}`}>{fmt(pair.trend5D)}</td>
                      <td className={`px-3 py-2 text-right text-xs ${returnColor(pair.trend1M)}`}>{fmt(pair.trend1M)}</td>
                      <td className={`px-3 py-2 text-right text-xs ${returnColor(pair.trend5M)}`}>{fmt(pair.trend5M)}</td>
                      <td className="px-3 py-2 text-right text-xs">
                        <ZBadge z={pair.zScore1D} />
                      </td>
                      <td className="px-4 py-2 text-right">
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
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
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
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/dashboard/flows');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setLastFetched(new Date());
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Capital Flows & Positioning</h1>
          <p className="text-sm text-gray-400 mt-1">
            ETF-based proxy for global institutional capital movement, hedging, and regime detection.
            {lastFetched && ` · Updated ${lastFetched.toLocaleTimeString()}`}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-3" />
          <span className="text-sm">Fetching 24 ETFs + macro data — ~15s on first load, cached 5 min after…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700 mb-6">
          <AlertTriangle size={16} />{error}
        </div>
      )}

      {data && (
        <>
          <MacroBar macro={data.macro} />
          <RegimeBanner regime={data.regime} />
          <MarketStructurePanel structure={data.structure} />
          <ETFHeatmap etfs={data.etfs} />
          <PairsTable pairs={data.pairs} />
          <p className="text-xs text-gray-300 text-center mt-2">
            Data via Alpha Vantage · TIME_SERIES_DAILY compact (100 days) · ETFs/prices are proxies · Cached 5 min · Not investment advice
          </p>
        </>
      )}
    </div>
  );
}
