'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus, Activity, Loader2, AlertTriangle, Info, BarChart2 } from 'lucide-react';
import type { FlowsPayload, ETFRow, PairRatio, MarketStructure } from '@/app/api/dashboard/flows/route';

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
        <strong>Note:</strong> VIX signal uses VIXY % return (not price) — VIXY price decays over time from futures roll costs and does not equal the VIX index level.
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
  const tooltip = 'What % of tracked ETFs closed up today. High breadth = broad rally / broad sell-off. Low breadth (market up but <40% of ETFs up) = a few names carrying the move — fragile.';
  if (pct === null) return { label, value: '—', subtext: 'no data', color: 'text-gray-300', tooltip };
  const color = pct > 65 ? 'text-emerald-600' : pct > 50 ? 'text-emerald-500' : pct > 35 ? 'text-yellow-600' : 'text-red-500';
  const subtext = pct > 65 ? 'Broad rally — wide participation' : pct > 50 ? 'Majority up — mild breadth' : pct > 35 ? 'Minority up — narrow / weak' : 'Broad sell-off / de-risking';
  return { label, value: `${pct.toFixed(0)}% up`, subtext: `${subtext} (${total} ETFs)`, color, tooltip };
}

function interpretDispersion(d: number | null): StructureMetric {
  const label = 'Sector Dispersion';
  const tooltip = 'Std dev of sector ETF 1D returns. Low dispersion = everything moving together = macro/ETF flows dominating. High dispersion = sectors diverging = stock-picking / fundamental regime.';
  if (d === null) return { label, value: '—', subtext: 'no data', color: 'text-gray-300', tooltip };
  const color = d > 1.5 ? 'text-emerald-600' : d > 0.8 ? 'text-yellow-600' : 'text-red-500';
  const subtext = d > 1.5 ? 'High — fundamental / stock-picking regime' : d > 0.8 ? 'Moderate — mixed environment' : 'Low — macro/ETF flows dominating, everything moves together';
  return { label, value: `±${d.toFixed(2)}%`, subtext, color, tooltip };
}

function interpretCorrelation(c: number | null): StructureMetric {
  const label = 'Avg Sector Corr (20D)';
  const tooltip = 'Average pairwise correlation across sector ETFs over 20 trading days. High (>0.70) = sectors all moving together = macro/ETF dominance. Low (<0.40) = sectors diverging = individual name/sector dynamics.';
  if (c === null) return { label, value: '—', subtext: 'no data', color: 'text-gray-300', tooltip };
  const pct = c * 100;
  const color = c > 0.70 ? 'text-red-500' : c > 0.50 ? 'text-yellow-600' : 'text-emerald-600';
  const subtext = c > 0.70 ? 'High — ETF/macro flows dominating tape' : c > 0.50 ? 'Moderate — mixed macro + idiosyncratic' : 'Low — stock-picking regime, macro fading';
  return { label, value: `${pct.toFixed(0)}%`, subtext, color, tooltip };
}

function interpretRealizedVol(rv: number | null): StructureMetric {
  const label = 'SPY Realised Vol (20D)';
  const tooltip = 'SPY annualised 20-day realised volatility using log returns. Compare to VIXY return: if VIXY is surging but realised vol is low, the market is pricing fear ahead of actual moves (expensive implied vol). If realised is high but VIXY falling, hedges are cheap.';
  if (rv === null) return { label, value: '—', subtext: 'no data', color: 'text-gray-300', tooltip };
  const color = rv > 25 ? 'text-red-600' : rv > 18 ? 'text-orange-500' : rv > 12 ? 'text-yellow-600' : 'text-emerald-600';
  const subtext = rv > 25 ? 'Elevated — stress / de-risking in progress' : rv > 18 ? 'Above-normal — cautious environment' : rv > 12 ? 'Normal range' : 'Low — calm, low-vol regime';
  return { label, value: `${rv.toFixed(1)}%`, subtext, color, tooltip };
}

function interpretDxy(r5D: number | null): StructureMetric {
  const label = 'USD Strength (UUP 5D)';
  const tooltip = 'UUP is the DXY proxy ETF. USD strengthening = global risk-off or Fed tightening expectations. Strong USD is a headwind for EM (Korea, Vietnam, Brazil, Mexico) which borrow in dollars and export in local currency.';
  if (r5D === null) return { label, value: '—', subtext: 'no data', color: 'text-gray-300', tooltip };
  const color = r5D > 0.5 ? 'text-red-500' : r5D > -0.5 ? 'text-gray-500' : 'text-emerald-600';
  const subtext = r5D > 0.5 ? 'USD strengthening — headwind for EM, risk-off signal' : r5D > -0.5 ? 'USD stable — neutral for EM flows' : 'USD weakening — tailwind for EM, risk-on signal';
  return { label, value: fmt(r5D), subtext, color, tooltip };
}

function interpretIG(r5D: number | null): StructureMetric {
  const label = 'IG Credit (LQD 5D)';
  const tooltip = 'Investment grade bond ETF. IG moves slower than HY but confirms systemic stress. If both LQD and HYG are falling, it\'s broad credit stress, not just junk-bond worry. If only HYG falls but LQD holds, it\'s contained high-yield stress.';
  if (r5D === null) return { label, value: '—', subtext: 'no data', color: 'text-gray-300', tooltip };
  const color = r5D > 0.3 ? 'text-emerald-600' : r5D > -0.3 ? 'text-gray-500' : 'text-red-500';
  const subtext = r5D > 0.3 ? 'IG tightening — institutional credit healthy' : r5D > -0.3 ? 'IG stable — credit neutral' : 'IG widening — systemic stress building';
  return { label, value: fmt(r5D), subtext, color, tooltip };
}

function MarketStructurePanel({ structure }: { structure: MarketStructure }) {
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
          <strong className="text-gray-500">High dispersion + low correlation</strong> = fundamental / stock-picking regime &nbsp;·&nbsp;
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
      <div className="px-5 py-2.5 bg-gray-50/50 border-t border-gray-100">
        <p className="text-[10px] text-gray-400">
          <strong className="text-gray-500">Regime read:</strong>&nbsp;
          When breadth is narrow + correlation is high + dispersion is low → ETF/macro flows are dominating and individual stock picking is unrewarding. That is when the 40%+ ETF-volume stat typically shows up. &nbsp;·&nbsp;
          When dispersion is high + correlation is falling → fundamental regime, stock/sector selection matters more.
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
          Color intensity reflects magnitude of move
        </p>
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
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide" title="Today's volume / 20-day avg volume. >1.5× = unusually active.">Vol/Avg ⓘ</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide" title="Z-score of today's % move vs 20-day history. 2σ+ = statistically significant.">Z ⓘ</th>
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
                  {rows.map((etf) => (
                    <tr key={etf.ticker} className={`${returnBg(etf.return1D)} hover:bg-gray-50/60 transition-colors`}>
                      <td className="px-5 py-2.5">
                        <span className="font-semibold text-gray-900 text-xs">{etf.name}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-600 text-xs">
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
                          <span className={etf.volumeRatio > 2 ? 'text-red-600 font-bold' : etf.volumeRatio > 1.5 ? 'text-orange-500 font-semibold' : etf.volumeRatio > 1.2 ? 'text-yellow-600' : 'text-gray-400'}>
                            {etf.volumeRatio.toFixed(2)}×
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-2.5 text-right text-xs">
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
  'Regional': 'Regional vs US',
  'Sector':   'Sector / Factor',
  'Credit':   'Credit',
  'Risk':     'Risk / Safety / Dollar',
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
          <span className="text-emerald-600 font-medium">↑ Rising ratio</span> = numerator outperforming — see "Bullish means" column for what that implies. &nbsp;
          <span className="text-red-500 font-medium">↓ Falling ratio</span> = the opposite trade. &nbsp;
          <strong className="text-gray-500">Z</strong> = how unusual today's ratio move is vs its own 20-day history.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-100 bg-gray-50/50">
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Pair</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">↑ Bullish means</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Ratio</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">1D Δ</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">5D Δ</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide" title="Z-score of today's ratio move vs 20-day history">Z ⓘ</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Signal</th>
            </tr>
          </thead>
          <tbody>
            {PAIR_GROUPS.map(g => (
              <>
                <tr key={`ghdr-${g.label}`} className="bg-gray-50/70">
                  <td colSpan={7} className="px-5 py-1.5">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{PAIR_GROUP_LABELS[g.label]}</span>
                  </td>
                </tr>
                {g.pairs.map(pLabel => {
                  const pair = pairMap.get(pLabel);
                  if (!pair) return null;
                  return (
                    <tr key={pair.label} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-5 py-2.5">
                        <div className="font-semibold text-gray-900 text-xs">{pair.label}</div>
                        <div className="text-gray-400 text-[10px]">{pair.description}</div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs hidden lg:table-cell max-w-xs">
                        {pair.bullishMeans}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-600 text-xs">
                        {pair.ratio !== null ? pair.ratio.toFixed(4) : '—'}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-xs ${returnColor(pair.trend1D)}`}>
                        {fmt(pair.trend1D)}
                      </td>
                      <td className={`px-4 py-2.5 text-right text-xs font-medium ${returnColor(pair.trend5D)}`}>
                        {fmt(pair.trend5D)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs">
                        <ZBadge z={pair.zScore1D} />
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
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Capital Flows & Positioning</h1>
          <p className="text-sm text-gray-400 mt-1">
            ETF-based proxy for global institutional capital movement and hedging activity.
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
          <span className="text-sm">Fetching 24 ETFs sequentially — ~14s on first load, cached 5 min after…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700 mb-6">
          <AlertTriangle size={16} />{error}
        </div>
      )}

      {data && (
        <>
          <RegimeBanner regime={data.regime} />
          <MarketStructurePanel structure={data.structure} />
          <ETFHeatmap etfs={data.etfs} />
          <PairsTable pairs={data.pairs} />
          <p className="text-xs text-gray-300 text-center mt-2">
            Data via Alpha Vantage · TIME_SERIES_DAILY · ETFs are proxies only · Cached 5 min · Not investment advice
          </p>
        </>
      )}
    </div>
  );
}
