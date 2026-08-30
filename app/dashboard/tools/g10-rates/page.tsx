'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CollapsibleCard, ToolAtAGlance } from '@/components/tool-digest';
import { ToolReadingGuide } from '@/components/tool-reading-guide';
import { getToolReadingGuide } from '@/lib/tool-reading-guides';
import type { G10CountryRates, G10RatesPayload } from '@/app/api/dashboard/g10-rates/route';

function formatRate(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(2)}%`;
}

function formatBps(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(0)} bps`;
}

function easingLabel(signal: G10CountryRates['easingSignal']) {
  switch (signal) {
    case 'pricing_cuts':
      return { text: 'Pricing cuts', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'pricing_hikes':
      return { text: 'Pricing hikes', className: 'bg-red-100 text-red-800 border-red-200' };
    case 'neutral':
      return { text: 'Neutral', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    default:
      return { text: 'N/A', className: 'bg-slate-50 text-slate-500 border-slate-200' };
  }
}

function curveLabel(regime: G10CountryRates['curveRegime']) {
  switch (regime) {
    case 'inverted':
      return { text: 'Inverted', className: 'text-red-700' };
    case 'steep':
      return { text: 'Steep', className: 'text-emerald-700' };
    case 'flat':
      return { text: 'Flat', className: 'text-slate-600' };
    default:
      return { text: '—', className: 'text-slate-400' };
  }
}

function ChangeCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-slate-400">—</span>;
  const Icon = value > 2 ? ArrowUpRight : value < -2 ? ArrowDownRight : Minus;
  const tone = value > 2 ? 'text-red-600' : value < -2 ? 'text-emerald-600' : 'text-slate-500';
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {formatBps(value)}
    </span>
  );
}

export default function G10RatesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<G10RatesPayload | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/dashboard/g10-rates');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load G10 rates');
      }
      setPayload(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load G10 rates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    loadData();
  }, [session, status, router, loadData]);

  const guide = getToolReadingGuide('g10-rates');

  const sortedCountries = useMemo(
    () => [...(payload?.countries ?? [])].sort((left, right) => left.name.localeCompare(right.name)),
    [payload?.countries]
  );

  if (status === 'loading' || (loading && !payload)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Loading G10 rates…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/dashboard/tools"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to tools
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">G10 Rates Monitor</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Spot policy rates, short-end yields, and 10-year curves across G10 — with a rough read on
            who is pricing cuts vs hikes. Free FRED data; not futures-implied meeting odds.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading} className="shrink-0">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {guide ? <ToolReadingGuide guide={guide} defaultOpen={false} compact /> : null}

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">Could not load rates</div>
            <p className="mt-1">{error}</p>
            {error.includes('FRED_API_KEY') ? (
              <p className="mt-2 text-xs text-red-700">
                Add a free key at{' '}
                <a
                  href="https://fred.stlouisfed.org/docs/api/api_key.html"
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  fred.stlouisfed.org
                </a>{' '}
                and set <code className="rounded bg-red-100 px-1">FRED_API_KEY</code> in your environment.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {payload ? (
        <>
          <ToolAtAGlance
            headline={payload.digest.headline}
            bullets={payload.digest.bullets}
            footnote={payload.digest.footnote}
          />

          <Card hover={false}>
            <CardHeader>
              <CardTitle className="text-xl">G10 Rates Table</CardTitle>
              <CardDescription>
                Updated {new Date(payload.generatedAt).toLocaleString()} · Source: FRED / OECD via St. Louis Fed
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Country</th>
                    <th className="px-3 py-3">Policy</th>
                    <th className="px-3 py-3">Short</th>
                    <th className="px-3 py-3">10Y</th>
                    <th className="px-3 py-3">10Y − Short</th>
                    <th className="px-3 py-3">Short − Policy</th>
                    <th className="px-3 py-3">~Cuts priced</th>
                    <th className="px-3 py-3">1M Δ short</th>
                    <th className="px-3 py-3">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCountries.map((country) => {
                    const easing = easingLabel(country.easingSignal);
                    const curve = curveLabel(country.curveRegime);
                    return (
                      <tr key={country.code} className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-900">
                            {country.flag} {country.code}
                          </div>
                          <div className="text-xs text-slate-500">{country.centralBank}</div>
                          {country.notes ? (
                            <div className="mt-1 max-w-[180px] text-[10px] leading-snug text-slate-400">
                              {country.notes}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 font-medium">{formatRate(country.policyRate)}</td>
                        <td className="px-3 py-3">
                          <div className="font-medium">{formatRate(country.shortYield)}</div>
                          <div className="text-[10px] text-slate-400">{country.shortLabel}</div>
                        </td>
                        <td className="px-3 py-3 font-medium">{formatRate(country.longYield)}</td>
                        <td className={`px-3 py-3 font-medium ${curve.className}`}>
                          {country.spreads.curveSlope != null
                            ? `${country.spreads.curveSlope >= 0 ? '+' : ''}${country.spreads.curveSlope.toFixed(2)}%`
                            : '—'}
                          <div className="text-[10px]">{curve.text}</div>
                        </td>
                        <td className="px-3 py-3 font-medium">
                          {country.spreads.frontEndVsPolicy != null
                            ? `${country.spreads.frontEndVsPolicy >= 0 ? '+' : ''}${country.spreads.frontEndVsPolicy.toFixed(2)}%`
                            : '—'}
                        </td>
                        <td className="px-3 py-3 font-medium">
                          {country.spreads.approximateCutsBps != null
                            ? `~${country.spreads.approximateCutsBps.toFixed(0)} bps`
                            : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <ChangeCell value={country.changes.short1mBps} />
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${easing.className}`}
                          >
                            {easing.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedCountries.map((country) => (
              <div
                key={`card-${country.code}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold text-slate-900">
                    {country.flag} {country.name}
                  </div>
                  {country.easingSignal === 'pricing_cuts' ? (
                    <TrendingDown className="h-5 w-5 text-emerald-600" />
                  ) : country.easingSignal === 'pricing_hikes' ? (
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 px-2 py-2">
                    <div className="text-[10px] uppercase text-slate-500">Policy</div>
                    <div className="mt-1 font-semibold">{formatRate(country.policyRate)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-2 py-2">
                    <div className="text-[10px] uppercase text-slate-500">{country.shortLabel}</div>
                    <div className="mt-1 font-semibold">{formatRate(country.shortYield)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-2 py-2">
                    <div className="text-[10px] uppercase text-slate-500">10Y</div>
                    <div className="mt-1 font-semibold">{formatRate(country.longYield)}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    1W short: {formatBps(country.changes.short1wBps)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    1M short: {formatBps(country.changes.short1mBps)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    1M 10Y: {formatBps(country.changes.long1mBps)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <CollapsibleCard
            title="What this does NOT include"
            description="Important limits of the free data stack"
            defaultOpen={false}
          >
            <ul className="space-y-2 text-sm leading-relaxed text-slate-600">
              <li>• No meeting-by-meeting cut/hike probabilities (needs Fed funds / Euribor futures or OIS).</li>
              <li>• Non-US short ends use OECD call-money or 3M bill proxies where 2Y is unavailable on FRED.</li>
              <li>• “~Cuts priced” = policy rate minus short yield — a directional proxy, not a path forecast.</li>
              <li>• Alpha Vantage premium only adds US treasury maturities; G10 coverage here is FRED-only.</li>
            </ul>
            {payload.warnings.length > 0 ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                {payload.warnings.join(' ')}
              </div>
            ) : null}
          </CollapsibleCard>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">Next step: </span>
            Cross-check country tilts in the{' '}
            <Link href="/dashboard/tools/macro-engine" className="font-medium text-sky-700 underline">
              Macro Allocation Engine
            </Link>{' '}
            or risk-on/risk-off context in{' '}
            <Link href="/dashboard/flows" className="font-medium text-sky-700 underline">
              Capital Flows
            </Link>
            .
          </div>
        </>
      ) : null}
    </div>
  );
}
