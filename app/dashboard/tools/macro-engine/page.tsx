'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/card';
import type { MacroEnginePayload } from '@/app/api/dashboard/macro-engine/route';

// ─── Helper components ─────────────────────────────────────────────────────────

function RegimeBadge({ label }: { label: string }) {
  const classes =
    label === 'risk-off'
      ? 'bg-red-100 text-red-800 border border-red-200'
      : label === 'growth'
      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
      : label === 'inflation'
      ? 'bg-amber-100 text-amber-800 border border-amber-200'
      : 'bg-slate-100 text-slate-700 border border-slate-200';
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${classes}`}
    >
      {label}
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
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${classes}`}
    >
      {direction}
    </span>
  );
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
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-bold text-slate-950">{value}</div>
      {subtext && <div className="mt-1 text-xs text-slate-500">{subtext}</div>}
    </div>
  );
}

function FactorBar({ label, val }: { label: string; val: number }) {
  const capped = Math.min(Math.abs(val), 1);
  const isPositive = val >= 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 text-[11px] text-slate-500 shrink-0">{label}</div>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}
          style={{ width: `${capped * 100}%` }}
        />
      </div>
      <div className="w-10 text-right text-[11px] text-slate-500">
        {val.toFixed(2)}
      </div>
    </div>
  );
}

// ─── Factor dimension config ───────────────────────────────────────────────────

const FACTOR_DIMS = [
  'zGrowth',
  'zInflation',
  'zMonetary',
  'zCredit',
  'zCarry',
  'zEarnings',
] as const;

const FACTOR_LABELS: Record<string, string> = {
  zGrowth: 'Growth',
  zInflation: 'Inflation',
  zMonetary: 'Monetary',
  zCredit: 'Credit',
  zCarry: 'Carry',
  zEarnings: 'Earnings',
};

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

  // ─── Guard: loading ────────────────────────────────────────────────────────

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-sm text-slate-500">
          Loading Macro Allocation Engine...
        </div>
      </div>
    );
  }

  // ─── Guard: visitor ────────────────────────────────────────────────────────

  if ((session?.user as { role?: string })?.role === 'visitor') {
    return (
      <div className="space-y-6">
        <BackLink />
        <Card hover={false}>
          <CardHeader>
            <CardTitle>Macro Allocation Engine</CardTitle>
            <CardDescription>
              Visitor accounts cannot access live research tools. Contact an
              admin if you need member access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ─── Guard: error ──────────────────────────────────────────────────────────

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

  // ─── Main render ───────────────────────────────────────────────────────────

  // Factor attribution from first signal (all signals share the same regime run)
  const attribution = data?.signals[0]?.factorAttribution ?? {};

  // Latest run date for allocation table subtitle
  const runDateFormatted =
    data?.signals[0] !== undefined && 'runDate' in data.signals[0]
      ? String((data.signals[0] as { runDate?: unknown }).runDate)
      : null;

  return (
    <div className="space-y-8">
      {/* Back link */}
      <BackLink />

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-primary" />
          Macro Allocation Engine
        </h1>
        <p className="text-muted-foreground mt-1">
          Current regime · Ranked allocation signals · Backtest credibility ·
          Single-stock picks
        </p>
      </div>

      {/* ── Panel 1: Regime (DASH-01) ─────────────────────────────────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle>Current Macro Regime</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.regime ? (
            <p className="text-sm text-slate-500">
              No regime data available. Run{' '}
              <code className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded">
                npm run signals:run
              </code>{' '}
              to populate.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Regime badge row */}
              <div className="flex flex-wrap items-center gap-4">
                <RegimeBadge label={data.regime.regimeLabel} />
                <span className="text-sm text-slate-600">
                  Since{' '}
                  {new Date(data.regime.startDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                {data.regime.avgDurationDays !== null && (
                  <span className="text-sm text-slate-500">
                    Avg duration: ~{Math.round(data.regime.avgDurationDays)} days
                  </span>
                )}
                {data.regime.confidence !== null && (
                  <span className="text-sm text-slate-500">
                    Confidence:{' '}
                    {(data.regime.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              {/* Factor profile */}
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Factor Profile
                </div>
                {data.signals.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Factor scores available after signals run.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-w-sm">
                    {FACTOR_DIMS.map((dim) => (
                      <FactorBar
                        key={dim}
                        label={FACTOR_LABELS[dim]}
                        val={attribution[dim] ?? 0}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Panel 2: Allocation Table (DASH-02) ──────────────────────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle>Allocation Signals</CardTitle>
          {runDateFormatted && (
            <CardDescription>
              Ranked by conviction · Latest run: {runDateFormatted}
            </CardDescription>
          )}
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Rank', 'Ticker', 'Direction', 'Conviction', 'ETF', 'P(6m)', 'P(12m)'].map(
                      (h) => (
                        <th
                          key={h}
                          className="py-2 pr-4 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.signals.map((s) => (
                    <tr
                      key={`${s.ticker}-${s.rank}`}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-2 pr-4 text-slate-400">{s.rank}</td>
                      <td className="py-2 pr-4 font-mono font-semibold text-slate-900">
                        {s.ticker}
                      </td>
                      <td className="py-2 pr-4">
                        <DirectionPill direction={s.direction} />
                      </td>
                      <td className="py-2 pr-4 text-slate-700">
                        {(s.convictionScore * 100).toFixed(0)}%
                      </td>
                      <td className="py-2 pr-4 font-mono text-slate-500">
                        {s.etfTicker}
                      </td>
                      <td className="py-2 pr-4 text-slate-600">
                        {s.prob6m !== null
                          ? `${(s.prob6m * 100).toFixed(0)}%`
                          : '—'}
                      </td>
                      <td className="py-2 pr-4 text-slate-600">
                        {s.prob12m !== null
                          ? `${(s.prob12m * 100).toFixed(0)}%`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Panel 3: Backtest Stats (DASH-03) ────────────────────────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle>Out-of-Sample Backtest Statistics</CardTitle>
          <CardDescription>
            Walk-forward OOS metrics · Holdout:{' '}
            {data?.metrics?.holdoutStart ?? '—'} onwards
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
              <div className="grid grid-cols-2 gap-4">
                {/* SPY column */}
                <div className="space-y-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    vs SPY
                  </div>
                  {data.metrics.spy ? (
                    <div className="space-y-2">
                      <StatCard
                        label="Hit Rate"
                        value={`${(data.metrics.spy.hitRate * 100).toFixed(1)}%`}
                      />
                      <StatCard
                        label="Sharpe (Ann.)"
                        value={data.metrics.spy.sharpeAnn.toFixed(2)}
                      />
                      <StatCard
                        label="Max Drawdown"
                        value={`${(data.metrics.spy.maxDrawdown * 100).toFixed(1)}%`}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No SPY metrics.</p>
                  )}
                </div>

                {/* ACWI column */}
                <div className="space-y-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    vs ACWI
                  </div>
                  {data.metrics.acwi ? (
                    <div className="space-y-2">
                      <StatCard
                        label="Hit Rate"
                        value={`${(data.metrics.acwi.hitRate * 100).toFixed(1)}%`}
                      />
                      <StatCard
                        label="Sharpe (Ann.)"
                        value={data.metrics.acwi.sharpeAnn.toFixed(2)}
                      />
                      <StatCard
                        label="Max Drawdown"
                        value={`${(data.metrics.acwi.maxDrawdown * 100).toFixed(1)}%`}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No ACWI metrics.</p>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-400">
                {data.metrics.windowCount} walk-forward windows · Data from{' '}
                {data.metrics.dataStart}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Panel 4: Single-Stock Picks (DASH-04) ────────────────────────── */}
      <Card hover={false}>
        <CardHeader>
          <CardTitle>Top Stock Picks</CardTitle>
          <CardDescription>
            Filtered to overweight sectors · Ranked by O&apos;Neil composite score
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.stocks.length ? (
            <p className="text-sm text-slate-500">
              No stock picks available. Overweight sectors may be empty or
              signals haven&apos;t run.
            </p>
          ) : (
            <div>
              {data.stocks.map((s, i) => {
                const consensus = s.analystConsensus as
                  | Record<string, number | string>
                  | null
                  | undefined;
                const buyCount =
                  consensus !== null && consensus !== undefined
                    ? ((consensus.strongBuy as number) ?? 0) +
                      ((consensus.buy as number) ?? 0)
                    : null;
                const sellCount =
                  consensus !== null && consensus !== undefined
                    ? ((consensus.sell as number) ?? 0) +
                      ((consensus.strongSell as number) ?? 0)
                    : null;

                return (
                  <div key={s.ticker}>
                    {i > 0 && <div className="border-b border-slate-100 my-2" />}
                    <div className="py-2 space-y-1.5">
                      {/* Ticker + sector badge + composite score */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">
                          {s.ticker}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                          {s.sectorEtf}
                        </span>
                        <span className="text-xs text-slate-500">
                          Composite:{' '}
                          {(s.compositeScore * 100).toFixed(0)}
                        </span>
                      </div>

                      {/* Key metrics row */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span>RS: {s.rsRating?.toFixed(0) ?? '—'}</span>
                        <span>
                          EPS Rank:{' '}
                          {s.epsRankProxy !== null
                            ? (s.epsRankProxy * 100).toFixed(0)
                            : '—'}
                        </span>
                        <span>SMR: {s.smrProxy ?? '—'}</span>
                        <span>
                          DMA50:{' '}
                          {s.dma50Position !== null
                            ? (s.dma50Position > 0 ? '↑' : '↓') + ' 50d'
                            : '—'}
                        </span>
                        <span>
                          DMA200:{' '}
                          {s.dma200Position !== null
                            ? (s.dma200Position > 0 ? '↑' : '↓') + ' 200d'
                            : '—'}
                        </span>
                      </div>

                      {/* Analyst consensus */}
                      {consensus !== null && consensus !== undefined && (
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="text-emerald-700">
                            Buy: {buyCount}
                          </span>
                          <span className="text-red-700">
                            Sell: {sellCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
