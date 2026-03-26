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
  return <span className={cls}>{z > 0 ? '+' : ''}{z.toFixed(1)}σ</span>;
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
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Ratio</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">1D</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">5D</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">1M</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">~4.5M</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide" title="Z-score of today's ratio move vs 20D history">Z ⓘ</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Signal</th>
            </tr>
          </thead>
          <tbody>
            {PAIR_GROUPS.map(g => (
              <>
                <tr key={`ghdr-${g.label}`} className="bg-gray-50/70">
                  <td colSpan={8} className="px-4 py-1.5">
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

// ─── Explanations Tab ─────────────────────────────────────────────────────────

function ExplanationsTab() {
  const SH = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200 uppercase tracking-wide">{children}</h2>
  );
  const SubH = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xs font-semibold text-gray-800 mt-5 mb-1.5">{children}</h3>
  );
  const P = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs text-gray-600 leading-relaxed mb-2">{children}</p>
  );
  const Tag = ({ up }: { up: boolean }) => (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
      {up ? '↑ Rising' : '↓ Falling'}
    </span>
  );

  const PAIRS: {
    label: string;
    ratio: string;
    what: string;
    up: string;
    down: string;
    why: string;
  }[] = [
    {
      label: 'Korea vs US', ratio: 'EWY / SPY',
      what: 'Korean equities relative to the S&P 500.',
      up: 'Korean stocks are outperforming US. Korea is a pure-play on the global manufacturing cycle and semiconductor demand — rising EWY/SPY means the hardware/export cycle is healthy and institutional Asia longs are working.',
      down: 'Korea lagging the US. Usually signals softening global demand, semiconductor oversupply, or a risk-off rotation out of EM. Watch Korea as an early-warning for the broader cyclical trade.',
      why: 'Korea\'s economy is ~80% export-driven with heavy semiconductor concentration (Samsung, SK Hynix). It moves before global PMIs because order books shift faster than published data.',
    },
    {
      label: 'Taiwan vs US', ratio: 'EWT / SPY',
      what: 'Taiwanese equities relative to the S&P 500.',
      up: 'Taiwan (primarily TSMC, ~60% of EWT) outperforming. The AI hardware and advanced fab cycle is intact — data center capex is flowing through to chip orders.',
      down: 'TSMC/hardware trade unwinding. Could mean AI capex slowdown, geopolitical premium rising (China tension), or a rotation away from hardware toward software.',
      why: 'TSMC makes chips for Apple, Nvidia, AMD, and most AI accelerators. EWT is one of the most concentrated single-stock exposures in a liquid ETF — it is essentially a levered Nvidia/AI-hardware proxy.',
    },
    {
      label: 'China vs US', ratio: 'FXI / SPY',
      what: 'Chinese H-shares (Hong Kong-listed mainland companies) vs the S&P 500.',
      up: 'Capital rotating into China. Stimulus narrative gaining traction, RMB stable, or a valuation-driven EM rotation. Often driven by policy announcements from Beijing.',
      down: 'Capital leaving China equities. Regulatory risk, USD strength (which pressures CNY), weak domestic consumption, or property sector stress weighing on sentiment.',
      why: 'FXI is the most liquid China equity proxy in US markets. Note: it tracks H-shares (offshore), not onshore A-shares — it reflects foreign investor sentiment toward China more than domestic flows.',
    },
    {
      label: 'Europe vs US', ratio: 'EZU / SPY',
      what: 'Eurozone equities (banks, industrials, energy) vs the US (tech-heavy).',
      up: 'Capital rotating from expensive US tech into value-heavy Europe. Common when US tech valuations stretch or when European banks benefit from higher rates.',
      down: 'US tech dominance reasserting, or European-specific risks: energy price spike, ECB policy tightening, or political risk (elections, fiscal stress in peripheral countries).',
      why: 'Europe is a "value" market vs the US "growth" market. When the US/EU divergence widens, it usually reflects a shift in global growth expectations or monetary policy divergence.',
    },
    {
      label: 'LatAm vs US', ratio: 'EWZ / SPY',
      what: 'Latin America (primarily Brazil, ~60% of EWZ) vs the S&P 500.',
      up: 'Commodity cycle strong, BRL/MXN stable, or EM risk appetite broad. Brazil outperforms when oil, iron ore, and agricultural commodities are rising.',
      down: 'USD strengthening (expensive dollar = hard for Brazil which borrows in USD), commodity down-cycle, or Brazil-specific fiscal/political concerns.',
      why: 'Brazil is a commodity supercycle proxy. LatAm as a whole has high sensitivity to the USD — when the dollar rallies strongly, EM debt burdens rise and capital flows out.',
    },
    {
      label: 'Semis vs Software', ratio: 'SOXX / IGV',
      what: 'Semiconductor ETF vs software ETF — hardware vs software within the tech complex.',
      up: 'Semis leading software. The AI hardware buildout (chips, servers, networking) is dominating. Korea/Taiwan institutional longs are working — the capex cycle is in the "pick and shovel" phase.',
      down: 'Software winning. Could mean the AI narrative is shifting from infrastructure to applications (Salesforce, ServiceNow, Adobe) — or semis entering a cyclical down-period after a supply surge.',
      why: 'Goldman calls this the "AI trade pair." Semis are cyclical — they over-earn during buildouts and crater during oversupply. When this pair falls, Korea/Taiwan longs typically follow within weeks.',
    },
    {
      label: 'Cyclicals vs Defensives', ratio: 'XLY / XLP',
      what: 'Consumer discretionary (Amazon, Tesla, Homebuilders) vs consumer staples (P&G, Costco, Walmart).',
      up: 'Risk appetite healthy. Consumers spending on wants (cars, vacations, luxury) not just needs. Institutions expect economic expansion to continue.',
      down: 'Recession hedging. Investors rotating into "you have to buy it regardless" names. This move tends to front-run economic slowdowns by 3–6 months.',
      why: 'The oldest risk-on/off rotation in equities. Defensives don\'t generate growth — they generate consistency. When money moves there, it\'s a vote of no-confidence in the cycle.',
    },
    {
      label: 'Financials vs Market', ratio: 'XLF / SPY',
      what: 'Bank and financial stocks vs the broad S&P 500.',
      up: 'Banks outperforming. Means: yield curve steepening (banks earn on the spread), credit demand rising, or leverage appetite increasing. A leading indicator for healthy credit conditions.',
      down: 'Banks lagging. Could mean yield curve flattening/inverting (compresses bank margins), rising loan losses, or regulatory risk. Financials typically lead into and out of recessions.',
      why: 'Banks are the plumbing of the economy — when they\'re stressed, credit availability tightens for everyone. When they\'re expanding, leverage and growth follow.',
    },
    {
      label: 'Growth vs Value', ratio: 'QQQ / SPY',
      what: 'NASDAQ-100 (mega-cap tech: Nvidia, Apple, Microsoft, Meta) vs S&P 500 (broader 500 companies).',
      up: 'Growth premium expanding. Conditions favor long-duration assets: inflation expectations low, real rates not too high, liquidity ample, and mega-cap earnings outlook strong.',
      down: 'Value rotation. Happens when real rates rise (makes future earnings worth less today), when tech earnings disappoint, or when "boring" sectors (energy, financials) are outperforming.',
      why: 'The most-tracked relative performance pair in US markets. QQQ/SPY rising = the "multiple expansion" trade; falling = the "multiple compression" trade.',
    },
    {
      label: 'HY vs IG Credit', ratio: 'HYG / LQD',
      what: 'High-yield (junk) bonds vs investment-grade bonds — risk appetite within fixed income.',
      up: 'Credit risk appetite healthy. Investors buying riskier bonds over safer ones — spreads tightening. Risk-on signal from the bond market.',
      down: 'Flight to quality within credit. Investors selling junk and moving to IG. Often precedes equity stress by 1–2 weeks because credit markets price risk faster.',
      why: 'Institutions feel stress in credit before equities react. HYG/LQD falling has historically been one of the earliest leading indicators of equity drawdowns.',
    },
    {
      label: 'Credit vs Safety', ratio: 'HYG / TLT',
      what: 'High-yield bonds vs 20+ year US Treasury bonds — crosses asset classes entirely.',
      up: 'Broad risk-on. Credit preferred over the ultimate safe haven (long-duration Treasuries). Typical of bull market / easing cycle conditions.',
      down: 'Flight to safety. Investors selling credit risk and buying duration. This is one of the most reliable stress signals — both credit quality AND duration are being bid simultaneously.',
      why: 'Crosses the equity/bond divide. When both credit and duration are bid (ratio falls), it usually means something systemic: recession fear, financial system stress, or geopolitical shock.',
    },
    {
      label: 'Risk vs Safety', ratio: 'SPY / TLT',
      what: 'S&P 500 vs 20+ year US Treasuries — the classic risk-on vs risk-off pair.',
      up: 'Equities outperforming bonds. Growth/risk narrative winning. Typical of early-to-mid expansion phase.',
      down: 'Flight to bonds. Classic risk-off: recession fears, credit stress, or geopolitical shock causing capital to rotate from equities into the "safest" asset on earth.',
      why: 'The foundational risk-on/off ratio. Every portfolio manager watches this. When it breaks lower sharply, it triggers systematic de-risking across quant strategies.',
    },
    {
      label: 'Dollar vs Equities', ratio: 'UUP / SPY',
      what: 'USD strength (UUP = DXY proxy) vs the S&P 500. This pair is INVERTED — rising is bearish.',
      up: 'USD strengthening vs equities. BEARISH signal. Dollar is a safe haven — when it outperforms equities, institutions are rotating to cash/dollar assets. Particularly bad for EM countries with dollar-denominated debt (Korea, Brazil, Indonesia, Turkey).',
      down: 'Equities outperforming the dollar. BULLISH signal. Risk appetite healthy, capital deployed in equities rather than held in cash, EM currency tailwind.',
      why: 'The signal is inverted here because a rising dollar typically compresses risk assets globally: it tightens global financial conditions, increases the real cost of dollar-denominated debt for EM borrowers, and signals risk-off.',
    },
  ];

  const ETF_COLUMNS: { col: string; what: string; read: string }[] = [
    { col: '1D', what: '1-day % return — yesterday\'s close to today\'s close.', read: 'Green = capital flowing in today. Red = selling pressure today. Use for intraday context, not trend.' },
    { col: '1W (5D)', what: '5 trading day return — approximately 1 calendar week.', read: 'Short-term momentum. Regime signals use 5D. If 1D and 5D are both red, short-term trend is negative.' },
    { col: '1M (20D)', what: '20 trading day return — approximately 1 calendar month.', read: 'Medium-term trend. If positive here but 1D negative, the trend is intact with a day of weakness.' },
    { col: '3M (63D)', what: '63 trading day return — approximately 3 calendar months.', read: 'Intermediate trend. Aligns with a typical quarterly earnings cycle.' },
    { col: '~4.5M (95D)', what: '95 trading day return — approximately 4.5 months. Maximum window from the 100-day compact data pull.', read: 'Longer context within the available data window. Shows whether a trend is multi-month or just recent.' },
    { col: 'Vol/Avg', what: 'Today\'s volume divided by 20-day average volume for this ETF.', read: '1.0× = normal. >1.5× = elevated (institutions hedging or taking a position). >2× = extreme — a macro event or a forced rebalance is driving the move.' },
    { col: 'Z', what: 'Z-score of today\'s 1-day % return vs the past 20 days of daily returns.', read: '0σ = completely normal move. ±1σ = mildly unusual. ±2σ = statistically extreme — happens ~5% of the time. Sign matters: +2σ is an unusually strong up day, −2σ is an unusually sharp sell-off.' },
  ];

  const REGIME_SIGNALS: { name: string; what: string; scoring: string }[] = [
    {
      name: 'VIX (VIXY return)',
      what: 'VIXY is an ETF that tracks short-term VIX futures. We use its 5-day % RETURN, not its price level. VIXY constantly loses value from futures roll costs (contango decay) — its absolute price is meaningless as a stress gauge.',
      scoring: 'Negative 5D return = vol collapsing → score 0 (risk-on). Slight positive = some hedging → 1. Rising +5–15% = stress building → 2. Surging >15% = macro hedging dominant → 3.',
    },
    {
      name: 'Semis vs Software',
      what: 'The 5D return of the SOXX/IGV ratio. When semis underperform software, the most crowded institutional trade (long Korea, Taiwan, AI hardware) is unwinding. This pair leads Korea/Taiwan equity performance.',
      scoring: 'Semis leading significantly (>+1.5% 5D) → score 0. Mixed → 1. Software dominating by >1.5% → 2.',
    },
    {
      name: 'Cyclicals vs Defensives',
      what: 'The 5D return of XLY/XLP. When defensives take the lead, large institutions are rotating to recession-resistant positions — a vote of no-confidence in the economic cycle.',
      scoring: 'Cyclicals leading (>+1% 5D) → score 0. Mild edge either way → 1. Defensives dominating (>−1% 5D) → 2.',
    },
    {
      name: 'HYG Credit',
      what: 'HYG (high-yield bond ETF) 5-day return. Credit markets price stress before equities — institutions feel it in junk spreads 1–2 weeks before it shows in stock prices.',
      scoring: 'HYG rising (+0.5% 5D) → score 0. Neutral → 1. Spreads widening (−0.5 to −1.5%) → 2. Significant credit stress (< −1.5%) → 3.',
    },
    {
      name: 'ETF Volume Spike',
      what: 'Average volume ratio across all tracked ETFs (today vs 20-day average), excluding VIXY. Goldman research: ETFs normally represent ~30% of total US tape volume. When that spikes above ~40%, institutions are using ETFs for macro hedging rather than individual stock selection.',
      scoring: '<1.2× normal → score 0. 1.2–1.5× → 1. 1.5–2× high, macro hedging likely → 2. >2× extreme → 3.',
    },
  ];

  const MACRO_ITEMS: { label: string; what: string; up: string; down: string }[] = [
    {
      label: 'Fed Funds Rate',
      what: 'The overnight interest rate set by the US Federal Reserve — the most important price in global finance. It sets the floor for all other interest rates.',
      up: 'Fed is tightening: borrowing is more expensive, growth assets (tech, long bonds, EM) face headwinds. Higher for longer = multiple compression.',
      down: 'Fed is easing: cheaper money = easier credit conditions = supports risk assets, especially long-duration (tech) and EM.',
    },
    {
      label: 'US 10-Year Yield',
      what: 'The yield on 10-year US Treasury bonds — the global risk-free rate and discount rate for virtually every asset on earth.',
      up: 'Rising 10Y = either growth/inflation expectations rising (good initially, harmful if sustained) OR a flight FROM bonds (scary). At 5%+, it competes directly with equities for capital.',
      down: 'Falling 10Y = flight to safety (recession/stress fear) OR Fed cutting cycle beginning. Good for long-duration assets (tech, growth), bad if driven by recession fear.',
    },
    {
      label: 'WTI Crude',
      what: 'West Texas Intermediate oil price — the US benchmark for crude oil. Both an economic activity signal and an inflation input.',
      up: 'Demand-driven rise = global growth healthy. Supply-driven rise (OPEC cuts, geopolitical disruption) = stagflation risk. Energy-exporting EM (Brazil, Saudi) benefits; energy-importing EM (India, Turkey) suffers.',
      down: 'Demand-driven fall = global slowdown warning. Supply glut (US shale surge) = disinflationary. Generally negative for EM commodity exporters.',
    },
    {
      label: 'Bitcoin',
      what: 'The largest cryptocurrency by market cap. Treated here as a risk appetite / liquidity barometer rather than a currency. BTC has shown high correlation with the NASDAQ during risk-off periods.',
      up: 'Rising BTC = speculative risk appetite healthy, liquidity ample, retail/crypto-native capital active. Sometimes leads risk-on moves in equities by a few days.',
      down: 'Falling BTC = speculative risk appetite deteriorating. Can also signal institutional de-leveraging or a regulatory event. Watch correlation with QQQ during stress.',
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-10 max-w-5xl">

      {/* Overview */}
      <section>
        <SH>How to Use This Dashboard</SH>
        <P>
          This dashboard tracks <strong>where institutional capital is moving</strong> across global
          equity markets in near real-time using ETF price data. It is not a prediction engine — it
          is a <em>positioning diagnostic</em>: what is happening right now, and what does the pattern
          of flows historically imply about market conditions?
        </P>
        <P>
          All data comes from Alpha Vantage (TIME_SERIES_DAILY, compact 100-day window). ETFs are
          proxies — they track the thing, not the thing itself. Cached every 5 minutes. Typically
          reflects the previous trading day&apos;s close (1-day data delay).
        </P>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 leading-relaxed">
          <strong>30-second read:</strong> Start with the Risk Regime score (top of dashboard).
          Then check Pair Ratios for where capital is rotating. Market Structure tells you whether
          it&apos;s a macro-driven tape (everything moving together) or a stock-picker&apos;s market
          (sectors diverging). The ETF Heatmap shows the raw returns behind all of it.
        </div>
      </section>

      {/* Macro Bar */}
      <section>
        <SH>Macro Context Bar</SH>
        <P>The four macro anchors that every professional investor checks before reading any flow data.</P>
        <div className="space-y-3">
          {MACRO_ITEMS.map(item => (
            <div key={item.label} className="border border-gray-100 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-800 mb-1">{item.label}</div>
              <P>{item.what}</P>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <div className="bg-emerald-50 rounded-lg px-3 py-2">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">↑ Rising</span>
                  <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">{item.up}</p>
                </div>
                <div className="bg-red-50 rounded-lg px-3 py-2">
                  <span className="text-[10px] font-bold text-red-700 uppercase">↓ Falling</span>
                  <p className="text-[11px] text-red-800 mt-0.5 leading-relaxed">{item.down}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Risk Regime */}
      <section>
        <SH>Risk Regime</SH>
        <P>
          A composite score built from 5 independent stress signals. Each signal scores 0–3
          (0 = bullish, 3 = maximum stress). They are summed: 0–3 = Risk-on, 4–5 = Neutral,
          6–8 = Hedging-heavy, 9–15 = Stress. No weighting — each signal has equal vote.
        </P>
        <P>
          The regime is directional context, not a trading signal. A{' '}
          <span className="text-emerald-700 font-semibold">Risk-on</span> regime doesn&apos;t mean
          buy everything; it means the macro backdrop is not actively fighting you.{' '}
          <span className="text-red-700 font-semibold">Stress</span> means multiple signals are
          simultaneously flashing institutional risk aversion.
        </P>
        <div className="space-y-4 mt-3">
          {REGIME_SIGNALS.map(sig => (
            <div key={sig.name} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 text-xs font-semibold text-gray-800">{sig.name}</div>
              <div className="px-4 py-3 space-y-2">
                <P>{sig.what}</P>
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-[11px] text-gray-600">
                  <strong>Scoring: </strong>{sig.scoring}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Market Structure */}
      <section>
        <SH>Market Structure Metrics</SH>
        <P>
          These six metrics together answer: <em>Is this a macro tape or a fundamental tape?</em>{' '}
          When correlations are high and dispersion is low, a single macro headline can move
          everything simultaneously — individual stock or country selection barely matters.
          When dispersion is high and correlation is low, fundamentals reassert themselves.
        </P>

        {[
          {
            name: 'Market Breadth',
            what: '% of tracked ETFs that closed up on the day.',
            read: [
              { label: '>65% up', color: 'text-emerald-700', desc: 'Wide participation — the move is broad-based and healthy.' },
              { label: '50–65% up', color: 'text-green-700', desc: 'Majority rising but not overwhelming.' },
              { label: '35–50% up', color: 'text-yellow-700', desc: 'Narrow advance — only a few groups leading. Fragile if the index is up.' },
              { label: '<35% up', color: 'text-red-700', desc: 'Broad sell-off across asset classes.' },
            ],
            note: 'If the S&P 500 is up on the day but ETF breadth is below 40%, it means a small number of mega-cap names are carrying the whole index — not a sustainable move.',
          },
          {
            name: 'Sector Dispersion',
            what: 'Standard deviation of 1-day returns across sector ETFs (XLE, XLV, XLF, XLY, XLP, SOXX, IGV).',
            read: [
              { label: '>1.5% σ', color: 'text-emerald-700', desc: 'Sectors diverging sharply — fundamental/earnings-driven. Stock and sector selection matters.' },
              { label: '0.8–1.5% σ', color: 'text-yellow-700', desc: 'Moderate — mixed macro and idiosyncratic drivers.' },
              { label: '<0.8% σ', color: 'text-red-700', desc: 'Everything moving together — macro headline or ETF-flow dominated tape.' },
            ],
            note: null,
          },
          {
            name: 'Sector Correlation (20D)',
            what: 'Average pairwise Pearson correlation between all sector ETFs over the past 20 trading days.',
            read: [
              { label: '>70%', color: 'text-red-700', desc: 'Macro/ETF dominance — a single rate move or risk event is driving all sectors together.' },
              { label: '40–70%', color: 'text-yellow-700', desc: 'Mixed — some macro, some sector-specific.' },
              { label: '<40%', color: 'text-emerald-700', desc: 'Stock-picker\'s market — sector fundamentals driving divergent returns.' },
            ],
            note: 'High correlation + low dispersion = the same signal from two angles: macro flows are running the show.',
          },
          {
            name: 'SPY Realized Vol (20D)',
            what: 'SPY\'s annualized realized volatility calculated from 20 days of log returns. Standard = how much SPY actually moved, not how much the market fears it will move.',
            read: [
              { label: '<12%', color: 'text-emerald-700', desc: 'Low-vol regime. Options cheap, carry strategies working.' },
              { label: '12–18%', color: 'text-yellow-700', desc: 'Normal historical range for SPY.' },
              { label: '18–25%', color: 'text-orange-700', desc: 'Above normal — some stress in realized moves.' },
              { label: '>25%', color: 'text-red-700', desc: 'Stress regime. Systematic strategies de-lever, options expensive.' },
            ],
            note: 'Compare to VIXY return: if VIXY is surging but realized vol is still low, the market is pricing fear ahead of actual volatility occurring — a possible overreaction.',
          },
          {
            name: 'USD Strength (5D)',
            what: 'UUP ETF 5-day return — a liquid proxy for the DXY (US Dollar Index).',
            read: [
              { label: '>+0.5%', color: 'text-red-700', desc: 'Dollar strengthening — EM headwind. Countries with USD-denominated debt see higher real debt burdens.' },
              { label: '−0.5 to +0.5%', color: 'text-gray-600', desc: 'Dollar stable — neutral for EM and risk assets.' },
              { label: '<−0.5%', color: 'text-emerald-700', desc: 'Dollar weakening — EM tailwind, commodity prices supported, global financial conditions loosening.' },
            ],
            note: 'The DXY is ~57% EUR. A weak dollar is one of the most consistent tailwinds for EM equity outperformance. Rising dollar = tightening global financial conditions.',
          },
          {
            name: 'IG Credit (5D)',
            what: 'LQD ETF 5-day return — investment-grade corporate bonds. Paired with HYG to diagnose whether stress is isolated or systemic.',
            read: [
              { label: '>+0.3%', color: 'text-emerald-700', desc: 'IG tightening — broad credit health is strong.' },
              { label: '−0.3 to +0.3%', color: 'text-gray-600', desc: 'IG stable.' },
              { label: '<−0.3%', color: 'text-red-700', desc: 'IG widening — systemic credit stress. If HYG is also falling, this is a red flag.' },
            ],
            note: 'Key diagnostic: HYG down + LQD stable = junk-only stress, probably contained. HYG down + LQD down = systemic credit stress — the entire credit market is repricing risk.',
          },
        ].map(m => (
          <div key={m.name} className="border border-gray-200 rounded-xl overflow-hidden mt-4">
            <div className="px-4 py-2.5 bg-gray-50 text-xs font-semibold text-gray-800">{m.name}</div>
            <div className="px-4 py-3">
              <P>{m.what}</P>
              <div className="space-y-1 my-2">
                {m.read.map(r => (
                  <div key={r.label} className="flex items-start gap-2">
                    <span className={`text-[10px] font-mono font-bold w-20 flex-shrink-0 ${r.color}`}>{r.label}</span>
                    <span className="text-[11px] text-gray-600">{r.desc}</span>
                  </div>
                ))}
              </div>
              {m.note && <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1.5 mt-2">{m.note}</p>}
            </div>
          </div>
        ))}
      </section>

      {/* ETF Table columns */}
      <section>
        <SH>ETF Performance Table — Column Guide</SH>
        <P>
          The heatmap shows {24} ETFs grouped by geography and asset class. Green = capital flowing
          in / price rising. Red = capital leaving / price falling. Use multiple time horizons together
          — a single red day in a green 1M trend is noise; red across all columns is a trend.
        </P>
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-wide">
                <th className="px-3 py-2 text-left font-semibold">Column</th>
                <th className="px-3 py-2 text-left font-semibold">What it is</th>
                <th className="px-3 py-2 text-left font-semibold">How to read it</th>
              </tr>
            </thead>
            <tbody>
              {ETF_COLUMNS.map(c => (
                <tr key={c.col} className="border-t border-gray-50">
                  <td className="px-3 py-2 font-mono font-bold text-gray-700 whitespace-nowrap">{c.col}</td>
                  <td className="px-3 py-2 text-gray-600">{c.what}</td>
                  <td className="px-3 py-2 text-gray-600">{c.read}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pair Ratios */}
      <section>
        <SH>Pair Ratios — Full Glossary</SH>
        <P>
          Each pair is Numerator ÷ Denominator. When the ratio rises, the numerator is
          outperforming. Trend columns (1D, 5D, 1M, ~4.5M) show % change in the ratio itself —
          not either ETF in isolation. The Signal label (bullish/bearish/neutral) is driven by the
          5D trend and is relative to what that direction means for that specific pair.
        </P>
        <P>
          The Z-score shows how unusual today&apos;s single-day ratio move is vs the past 20 days.
          A ±2σ move happens roughly 5% of the time — statistically significant, worth noting.
        </P>
        <div className="space-y-4 mt-3">
          {PAIRS.map(pair => (
            <div key={pair.label} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-800">{pair.label}</span>
                <span className="text-[10px] font-mono text-gray-400">{pair.ratio}</span>
              </div>
              <div className="px-4 py-3 space-y-2">
                <P>{pair.what}</P>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-emerald-50 rounded-lg px-3 py-2">
                    <Tag up={pair.label !== 'Dollar vs Equities'} />
                    <p className="text-[11px] text-emerald-900 mt-1 leading-relaxed">{pair.up}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg px-3 py-2">
                    <Tag up={pair.label === 'Dollar vs Equities'} />
                    <p className="text-[11px] text-red-900 mt-1 leading-relaxed">{pair.down}</p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 italic leading-relaxed">{pair.why}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FlowsDashboard() {
  const [data, setData] = useState<FlowsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'explanations'>('dashboard');

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

      {/* Tab switcher — shown even while loading so user can read explanations */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-2">
        {(['dashboard', 'explanations'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-xs px-4 py-1.5 rounded-md font-medium transition-colors ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'dashboard' ? '📊 Dashboard' : '📖 Explanations'}
          </button>
        ))}
      </div>

      {activeTab === 'explanations' && <ExplanationsTab />}

      {activeTab === 'dashboard' && data && (
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
