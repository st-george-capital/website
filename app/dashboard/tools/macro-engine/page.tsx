'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import type { MacroEnginePayload } from '@/app/api/dashboard/macro-engine/route';

// ─── Regime color mapping ──────────────────────────────────────────────────────
// New labels follow "Regime-{idx}-{factor}" format.
// Color is derived from the factor suffix.

function regimeColors(label: string): {
  badge: string;
  border: string;
  bg: string;
  text: string;
  dot: string;
} {
  const lower = label.toLowerCase();
  if (lower.includes('credit') || lower.includes('risk'))
    return {
      badge: 'bg-red-100 text-red-800 border border-red-200',
      border: 'border-red-200',
      bg: 'bg-red-50',
      text: 'text-red-800',
      dot: 'bg-red-500',
    };
  if (lower.includes('monetary') || lower.includes('inflation'))
    return {
      badge: 'bg-amber-100 text-amber-800 border border-amber-200',
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      dot: 'bg-amber-500',
    };
  if (lower.includes('growth') || lower.includes('earnings'))
    return {
      badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      border: 'border-emerald-200',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      dot: 'bg-emerald-500',
    };
  if (lower.includes('carry'))
    return {
      badge: 'bg-blue-100 text-blue-800 border border-blue-200',
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      dot: 'bg-blue-500',
    };
  return {
    badge: 'bg-slate-100 text-slate-700 border border-slate-200',
    border: 'border-slate-200',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
  };
}

// Human-readable regime name (strip "Regime-{idx}-" prefix)
function regimeDisplayName(label: string): string {
  const match = label.match(/^Regime-\d+-(.+)$/);
  if (!match) return label;
  const factor = match[1];
  const MAP: Record<string, string> = {
    zCredit: 'Credit-Driven',
    zMonetary: 'Monetary-Driven',
    zGrowth: 'Growth-Driven',
    zInflation: 'Inflation-Driven',
    zEarnings: 'Earnings-Driven',
    zCarry: 'Carry-Driven',
    neutral: 'Neutral',
  };
  return MAP[factor] ?? factor;
}

// ─── Helper components ─────────────────────────────────────────────────────────

function RegimeBadge({ label }: { label: string }) {
  const { badge } = regimeColors(label);
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${badge}`}>
      {regimeDisplayName(label)}
    </span>
  );
}

function DirectionPill({ direction }: { direction: string }) {
  const classes =
    direction === 'overweight'
      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
      : direction === 'underweight'
      ? 'bg-red-100 text-red-800 border border-red-200'
      : 'bg-slate-100 text-slate-700 border border-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${classes}`}>
      {direction}
    </span>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  color,
}: {
  label: string;
  value: string;
  subtext?: string;
  color?: 'green' | 'red' | 'neutral';
}) {
  const valueClass =
    color === 'green'
      ? 'text-emerald-700'
      : color === 'red'
      ? 'text-red-700'
      : 'text-slate-950';
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-2 text-xl font-bold ${valueClass}`}>{value}</div>
      {subtext && <div className="mt-1 text-xs text-slate-500">{subtext}</div>}
    </div>
  );
}

function ConvictionBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct > 66 ? 'bg-emerald-500' : pct > 33 ? 'bg-amber-400' : 'bg-slate-300';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-8 text-right text-[11px] text-slate-500">{pct}%</div>
    </div>
  );
}

function FactorBubble({ label, val }: { label: string; val: number }) {
  const isPos = val >= 0;
  const abs = Math.abs(val);
  const intensity = Math.min(abs, 2) / 2; // normalize to [0,1] capped at z=2
  const sizeClass =
    intensity > 0.66
      ? 'text-[13px] font-bold'
      : intensity > 0.33
      ? 'text-[12px] font-semibold'
      : 'text-[11px] font-medium text-slate-400';
  const colorClass = isPos ? 'text-emerald-700' : 'text-red-700';
  return (
    <div className="flex flex-col items-center gap-0.5 px-2">
      <span className={`${sizeClass} ${abs > 0.1 ? colorClass : 'text-slate-400'}`}>
        {val > 0 ? '+' : ''}{val.toFixed(2)}
      </span>
      <span className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ─── Factor dimension config ───────────────────────────────────────────────────

const FACTOR_DIMS = [
  { key: 'zGrowth', label: 'Growth', description: 'GDP momentum, PMI' },
  { key: 'zInflation', label: 'Inflation', description: 'CPI, PPI trends' },
  { key: 'zMonetary', label: 'Monetary', description: 'Fed Funds rate path' },
  { key: 'zCredit', label: 'Credit', description: 'Spread compression/widening' },
  { key: 'zCarry', label: 'Carry', description: 'Rate differential vs USD' },
  { key: 'zEarnings', label: 'Earnings', description: 'EPS revision momentum' },
] as const;

// ─── Back link ─────────────────────────────────────────────────────────────────

const BackLink = () => (
  <Link
    href="/dashboard/tools"
    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
  >
    <ArrowLeft className="h-4 w-4" />
    Back to tools
  </Link>
);

// ─── Collapsible section ───────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {title}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

// ─── Page component ────────────────────────────────────────────────────────────

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
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
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
            <CardDescription>
              Visitor accounts cannot access live research tools. Contact an admin if you need
              member access.
            </CardDescription>
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
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Derived values ────────────────────────────────────────────────────────

  const asOfDate = data?.asOfDate
    ? new Date(data.asOfDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const regime = data?.regime ?? null;
  const regimeColors_ = regime ? regimeColors(regime.regimeLabel) : null;

  const overweightSignals = data?.signals.filter((s) => s.direction === 'overweight') ?? [];
  const underweightSignals = data?.signals.filter((s) => s.direction === 'underweight') ?? [];

  // Factor attribution: use the top-ranked overweight signal if available, else first signal
  const attributionSignal =
    overweightSignals[0] ?? data?.signals[0] ?? null;
  const attribution = attributionSignal?.factorAttribution ?? {};

  // Backtest metrics color helpers
  function sharpeColor(v: number): 'green' | 'red' | 'neutral' {
    if (v >= 0.5) return 'green';
    if (v < 0) return 'red';
    return 'neutral';
  }
  function hitRateColor(v: number): 'green' | 'red' | 'neutral' {
    if (v >= 0.55) return 'green';
    if (v < 0.45) return 'red';
    return 'neutral';
  }
  function drawdownColor(v: number): 'green' | 'red' | 'neutral' {
    if (v >= -0.1) return 'green';
    if (v <= -0.3) return 'red';
    return 'neutral';
  }

  return (
    <div className="space-y-8">
      <BackLink />

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            Macro Allocation Engine
          </h1>
          <p className="text-muted-foreground mt-1">
            Regime-conditional factor model · Walk-forward backtested · 12 global ETFs
          </p>
        </div>
        {asOfDate && (
          <div className="text-right text-xs text-slate-500">
            <div className="font-semibold">Last run</div>
            <div>{asOfDate}</div>
          </div>
        )}
      </div>

      {/* ── Row 1: Regime + Factor Profile ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Regime panel — 2/5 */}
        <div className="lg:col-span-2">
          <Card hover={false} className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Current Macro Regime</CardTitle>
              <CardDescription>
                Identified via k-means clustering on 6 macro factors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!regime ? (
                <p className="text-sm text-slate-500">
                  No regime data. Run{' '}
                  <code className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded">
                    npm run signals:run
                  </code>
                  .
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Regime badge */}
                  <div className={`rounded-xl border p-4 ${regimeColors_?.border ?? ''} ${regimeColors_?.bg ?? ''}`}>
                    <RegimeBadge label={regime.regimeLabel} />
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Active since</span>
                        <span className="font-medium text-slate-800">
                          {new Date(regime.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {regime.avgDurationDays !== null && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Avg regime duration</span>
                          <span className="font-medium text-slate-800">
                            ~{Math.round(regime.avgDurationDays)} days
                          </span>
                        </div>
                      )}
                      {regime.confidence !== null && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Cluster confidence</span>
                          <span className="font-medium text-slate-800">
                            {(regime.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* What this means */}
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                    <div className="flex items-start gap-2">
                      <Info className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        The model identified <strong>4 distinct macro regimes</strong> in historical data.
                        Each regime implies different factor weights for ranking ETF outperformance.
                        The current regime drives the allocation signals below.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Factor profile — 3/5 */}
        <div className="lg:col-span-3">
          <Card hover={false} className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Regime Factor Profile</CardTitle>
              <CardDescription>
                Factor z-scores driving the current regime classification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!attributionSignal ? (
                <p className="text-sm text-slate-500">Factor scores available after signals run.</p>
              ) : (
                <div className="space-y-4">
                  {/* Factor bubbles — visual overview */}
                  <div className="flex flex-wrap gap-1 justify-around border border-slate-100 rounded-xl p-4 bg-slate-50">
                    {FACTOR_DIMS.map(({ key, label }) => (
                      <FactorBubble
                        key={key}
                        label={label}
                        val={attribution[key] ?? 0}
                      />
                    ))}
                  </div>

                  {/* Factor detail table */}
                  <div className="space-y-2">
                    {FACTOR_DIMS.map(({ key, label, description }) => {
                      const val = attribution[key] ?? 0;
                      const abs = Math.abs(val);
                      const barWidth = Math.min(abs / 2, 1) * 100; // cap at z=2
                      const isPos = val >= 0;
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <div className="w-20 shrink-0">
                            <div className="text-[12px] font-medium text-slate-700">{label}</div>
                            <div className="text-[10px] text-slate-400">{description}</div>
                          </div>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isPos ? 'bg-emerald-400' : 'bg-red-400'}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <div className={`w-12 text-right text-[11px] font-mono ${isPos ? 'text-emerald-700' : 'text-red-700'}`}>
                            {val > 0 ? '+' : ''}{val.toFixed(2)}σ
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-start gap-2 mt-1">
                    <Info className="h-3 w-3 text-slate-300 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-slate-400">
                      Values are z-scores relative to 20-year history. Positive = above trend, negative = below trend.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Panel 2: Allocation Signals ────────────────────────────────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle>Allocation Signals</CardTitle>
          <CardDescription>
            12 global ETFs ranked by regime-conditional conviction score · Higher = stronger outperformance expectation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.signals.length ? (
            <p className="text-sm text-slate-500">
              No signals yet. Run{' '}
              <code className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded">
                npm run signals:run
              </code>
              .
            </p>
          ) : (
            <div className="space-y-4">
              {/* Split into overweight / underweight */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Overweight */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                      ↑ Overweight
                    </span>
                    <span className="text-[11px] text-slate-400">{overweightSignals.length} sectors</span>
                  </div>
                  <div className="space-y-2">
                    {overweightSignals.map((s) => (
                      <div
                        key={s.ticker}
                        className="flex items-center gap-3 rounded-lg border border-slate-100 bg-emerald-50/40 px-3 py-2.5"
                      >
                        <div className="w-6 text-[11px] text-slate-400 font-mono">{s.rank}</div>
                        <div className="w-12 font-mono font-bold text-sm text-slate-900">{s.ticker}</div>
                        <div className="flex-1">
                          <ConvictionBar value={s.convictionScore} />
                        </div>
                        <div className="text-right shrink-0">
                          {s.prob6m !== null && (
                            <div className="text-[11px] text-slate-600">
                              P(↑6m): <span className="font-semibold">{(s.prob6m * 100).toFixed(0)}%</span>
                            </div>
                          )}
                          {s.prob12m !== null && (
                            <div className="text-[11px] text-slate-400">
                              P(↑12m): {(s.prob12m * 100).toFixed(0)}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {overweightSignals.length === 0 && (
                      <p className="text-xs text-slate-400">No overweight signals.</p>
                    )}
                  </div>
                </div>

                {/* Underweight */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 border border-red-200">
                      ↓ Underweight
                    </span>
                    <span className="text-[11px] text-slate-400">{underweightSignals.length} sectors</span>
                  </div>
                  <div className="space-y-2">
                    {underweightSignals.map((s) => (
                      <div
                        key={s.ticker}
                        className="flex items-center gap-3 rounded-lg border border-slate-100 bg-red-50/40 px-3 py-2.5"
                      >
                        <div className="w-6 text-[11px] text-slate-400 font-mono">{s.rank}</div>
                        <div className="w-12 font-mono font-bold text-sm text-slate-900">{s.ticker}</div>
                        <div className="flex-1">
                          <ConvictionBar value={s.convictionScore} />
                        </div>
                        <div className="text-right shrink-0">
                          {s.prob6m !== null && (
                            <div className="text-[11px] text-slate-600">
                              P(↑6m): <span className="font-semibold">{(s.prob6m * 100).toFixed(0)}%</span>
                            </div>
                          )}
                          {s.prob12m !== null && (
                            <div className="text-[11px] text-slate-400">
                              P(↑12m): {(s.prob12m * 100).toFixed(0)}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {underweightSignals.length === 0 && (
                      <p className="text-xs text-slate-400">No underweight signals.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Full table toggle */}
              <CollapsibleSection title="View full signal table">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['Rank', 'Ticker', 'Direction', 'Conviction', 'ETF', 'P(outperf 6m)', 'P(outperf 12m)'].map((h) => (
                          <th
                            key={h}
                            className="py-2 pr-4 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.signals.map((s) => (
                        <tr key={`${s.ticker}-${s.rank}`} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 pr-4 text-slate-400">{s.rank}</td>
                          <td className="py-2 pr-4 font-mono font-semibold text-slate-900">{s.ticker}</td>
                          <td className="py-2 pr-4">
                            <DirectionPill direction={s.direction} />
                          </td>
                          <td className="py-2 pr-4 text-slate-700">{(s.convictionScore * 100).toFixed(0)}%</td>
                          <td className="py-2 pr-4 font-mono text-slate-500">{s.etfTicker}</td>
                          <td className="py-2 pr-4 text-slate-600">
                            {s.prob6m !== null ? `${(s.prob6m * 100).toFixed(0)}%` : '—'}
                          </td>
                          <td className="py-2 pr-4 text-slate-600">
                            {s.prob12m !== null ? `${(s.prob12m * 100).toFixed(0)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleSection>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Panel 3: Backtest Statistics ─────────────────────────────────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle>Model Performance</CardTitle>
          <CardDescription>
            Walk-forward out-of-sample backtest · 3-month holding periods ·{' '}
            {data?.metrics ? `${data.metrics.windowCount} windows tested` : 'Run backtest to populate'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.metrics ? (
            <p className="text-sm text-slate-500">
              Backtest metrics not available. Run{' '}
              <code className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded">
                npm run backtest:run
              </code>
              .
            </p>
          ) : (
            <div className="space-y-6">
              {/* Metric grid */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* OOS vs SPY */}
                {data.metrics.spy && (
                  <div className="space-y-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Out-of-Sample ({data.metrics.dataStart} – {data.metrics.holdoutStart})
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <MetricCard
                        label="Hit Rate"
                        value={`${(data.metrics.spy.hitRate * 100).toFixed(1)}%`}
                        subtext="Direction accuracy vs SPY"
                        color={hitRateColor(data.metrics.spy.hitRate)}
                      />
                      <MetricCard
                        label="Sharpe (Ann.)"
                        value={data.metrics.spy.sharpeAnn.toFixed(2)}
                        subtext="Excess return / vol"
                        color={sharpeColor(data.metrics.spy.sharpeAnn)}
                      />
                    </div>
                  </div>
                )}

                {/* Holdout (post-2022) */}
                {data.metrics.acwi && (
                  <div className="space-y-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Holdout ({data.metrics.holdoutStart} onward)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <MetricCard
                        label="Hit Rate"
                        value={`${(data.metrics.acwi.hitRate * 100).toFixed(1)}%`}
                        subtext="Direction accuracy vs SPY"
                        color={hitRateColor(data.metrics.acwi.hitRate)}
                      />
                      <MetricCard
                        label="Sharpe (Ann.)"
                        value={data.metrics.acwi.sharpeAnn.toFixed(2)}
                        subtext="Excess return / vol"
                        color={sharpeColor(data.metrics.acwi.sharpeAnn)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Methodology explainer */}
              <CollapsibleSection title="What these metrics mean">
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 space-y-2 text-[12px] text-slate-600 leading-relaxed">
                  <p>
                    <strong>Hit Rate</strong> — how often the model correctly predicts whether an ETF will
                    outperform SPY over the next 3 months. &gt;55% is meaningful; &lt;50% means the signal is
                    worse than random.
                  </p>
                  <p>
                    <strong>Sharpe Ratio</strong> — annualized excess return divided by its volatility.
                    Positive = the model adds value on average. Negative = on average, following the model
                    underperforms the benchmark. &gt;0.5 is considered good.
                  </p>
                  <p>
                    <strong>Max Drawdown</strong> — worst cumulative loss from peak in the excess return
                    series. Shown as % (negative is a loss). The excess return series measures how the
                    model's picks perform <em>relative to SPY</em>, not in absolute terms.
                  </p>
                  <p>
                    <strong>Walk-forward methodology</strong> — the model was never fitted on future data.
                    Each {data.metrics.windowCount}-window test used only data available at that point in time,
                    starting from {data.metrics.dataStart}.
                  </p>
                </div>
              </CollapsibleSection>

              <div className="text-xs text-slate-400">
                {data.metrics.windowCount} walk-forward windows · Training data from {data.metrics.dataStart} ·
                Holdout from {data.metrics.holdoutStart}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Panel 4: Single-Stock Picks ───────────────────────────────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle>Top Stock Picks</CardTitle>
          <CardDescription>
            Stocks in overweight sectors · Ranked by O&apos;Neil composite score (RS, EPS rank, SMR, moving averages)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.stocks.length ? (
            <p className="text-sm text-slate-500">
              {overweightSignals.length === 0
                ? 'No overweight sectors — no stock picks generated.'
                : 'No stock picks available. Run signals:run to populate.'}
            </p>
          ) : (
            <div className="space-y-1">
              {data.stocks.map((s, i) => {
                const consensus = s.analystConsensus as Record<string, number | string> | null | undefined;
                const buyCount =
                  consensus != null
                    ? ((consensus.strongBuy as number) ?? 0) + ((consensus.buy as number) ?? 0)
                    : null;
                const sellCount =
                  consensus != null
                    ? ((consensus.sell as number) ?? 0) + ((consensus.strongSell as number) ?? 0)
                    : null;
                const totalAnalysts =
                  consensus != null
                    ? ((consensus.strongBuy as number) ?? 0) +
                      ((consensus.buy as number) ?? 0) +
                      ((consensus.hold as number) ?? 0) +
                      ((consensus.sell as number) ?? 0) +
                      ((consensus.strongSell as number) ?? 0)
                    : 0;
                const buyPct = totalAnalysts > 0 && buyCount !== null ? buyCount / totalAnalysts : null;

                return (
                  <div key={s.ticker}>
                    {i > 0 && <div className="border-b border-slate-100 my-1" />}
                    <div className="py-3 flex flex-wrap items-start gap-x-6 gap-y-2">
                      {/* Ticker + sector */}
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <span className="font-mono font-bold text-base text-slate-900">{s.ticker}</span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                          {s.sectorEtf}
                        </span>
                      </div>

                      {/* O'Neil metrics */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                        <div>
                          <span className="text-slate-400">RS Rating </span>
                          <span className={`font-semibold ${(s.rsRating ?? 0) >= 80 ? 'text-emerald-700' : (s.rsRating ?? 0) >= 60 ? 'text-slate-700' : 'text-red-600'}`}>
                            {s.rsRating?.toFixed(0) ?? '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">EPS Rank </span>
                          <span className={`font-semibold ${(s.epsRankProxy ?? 0) >= 0.8 ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {s.epsRankProxy !== null ? (s.epsRankProxy * 100).toFixed(0) : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">SMR </span>
                          <span className={`font-semibold ${s.smrProxy === 'A' || s.smrProxy === 'B' ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {s.smrProxy ?? '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">50d </span>
                          <span className={`font-semibold ${(s.dma50Position ?? 0) > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {s.dma50Position !== null ? ((s.dma50Position ?? 0) > 0 ? '↑ above' : '↓ below') : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">200d </span>
                          <span className={`font-semibold ${(s.dma200Position ?? 0) > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {s.dma200Position !== null ? ((s.dma200Position ?? 0) > 0 ? '↑ above' : '↓ below') : '—'}
                          </span>
                        </div>
                        {buyPct !== null && (
                          <div>
                            <span className="text-slate-400">Analyst Buy% </span>
                            <span className={`font-semibold ${buyPct >= 0.7 ? 'text-emerald-700' : buyPct >= 0.5 ? 'text-slate-700' : 'text-red-600'}`}>
                              {(buyPct * 100).toFixed(0)}%
                            </span>
                            <span className="text-slate-400"> ({totalAnalysts} analysts)</span>
                          </div>
                        )}
                      </div>

                      {/* Composite score */}
                      <div className="ml-auto text-right">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wide">Score</div>
                        <div className="text-lg font-bold text-slate-900">
                          {(s.compositeScore * 100).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Methodology footer ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
        <CollapsibleSection title="How the Macro Allocation Engine works">
          <div className="space-y-3 text-[12px] text-slate-600 leading-relaxed mt-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <div className="font-semibold text-slate-700">1. Data ingestion</div>
                <p>Daily: OHLCV prices, FRED macro series (FEDFUNDS, CPI, credit spreads), OECD leading indicators, Alpha Vantage earnings.</p>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-slate-700">2. Regime classification</div>
                <p>k-means clustering on 6 z-scored macro factors identifies 4 distinct regimes. Labels are stable across re-fits via template matching.</p>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-slate-700">3. Walk-forward backtest</div>
                <p>Ridge regression fitted on rolling 3-year windows predicts ETF outperformance. Each test window is fully out-of-sample.</p>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-slate-700">4. Signal scoring</div>
                <p>Today's factor z-scores × regime-specific weights = conviction score. Empirical calibration maps scores to outperformance probabilities.</p>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
