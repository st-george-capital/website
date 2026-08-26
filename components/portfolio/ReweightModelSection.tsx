'use client';

// "Re-weight based on model" section for the Holdings dashboard — see plan Section 10.
// Extracted as its own file (rather than inlined into the already-large ~1100-line
// app/dashboard/holdings/page.tsx), consistent with how TradeModal/TradeHistory/
// PortfolioChart are already separate imports on that page.
//
// Read-only: no trade execution here. Fetches GET /api/tools/cvar-optimizer/latest on
// mount, which recomputes the "current" side server-side on each call so the
// current-vs-target comparison stays live even if the saved run's own snapshot is stale.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Badge } from '@/components/ui/badge';
import { Gauge, ArrowRight, RefreshCw } from 'lucide-react';

interface SuggestedTrade {
  ticker: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  currentShares: number;
  targetShares: number;
  deltaShares: number;
  deltaDollars: number;
  currentWeight: number;
  targetWeight: number;
  rationale: string;
}

interface LatestRunResponse {
  run: {
    id: string;
    asOfDate: string;
    createdAt: string;
    status: string;
    expectedCVaR: number;
    benchmarkCVaR: number | null;
    constraintSetName: string | null;
  } | null;
  suggestedTrades?: SuggestedTrade[];
  currentPortfolioValue?: number;
  pricesAsOf?: string;
}

function pct(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

export function ReweightModelSection() {
  const [data, setData] = useState<LatestRunResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tools/cvar-optimizer/latest');
      if (!res.ok) {
        setError('Failed to load the latest optimization run.');
        return;
      }
      setData(await res.json());
    } catch (e) {
      console.error('Failed to fetch latest CVaR optimization run:', e);
      setError('Failed to load the latest optimization run.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  const run = data?.run ?? null;
  const trades = (data?.suggestedTrades ?? []).filter((t) => t.action !== 'HOLD');

  return (
    <Card hover={false}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Gauge className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <CardTitle>Re-weight Based on Model</CardTitle>
              <CardDescription>
                Suggested trades from the CVaR optimizer&apos;s latest run — recommendation only, no trades are auto-executed.
              </CardDescription>
            </div>
          </div>
          <button
            onClick={fetchLatest}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !data && <p className="text-sm text-muted-foreground">Loading...</p>}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && !run && (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">No optimization run yet.</p>
            <Link
              href="/dashboard/tools/cvar-optimizer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Go to the CVaR Optimizer tool <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {run && (
          <>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Expected CVaR: </span>
                <span className="font-semibold">{pct(run.expectedCVaR)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Benchmark (URTH) CVaR: </span>
                <span className="font-semibold">{run.benchmarkCVaR !== null ? pct(run.benchmarkCVaR) : '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Run: </span>
                <span className="font-semibold">{timeAgo(run.asOfDate)}</span>
              </div>
              {run.constraintSetName && (
                <Badge variant="secondary">{run.constraintSetName}</Badge>
              )}
            </div>

            {trades.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No material buy/sell trades suggested — current holdings are already close to the model&apos;s target weights.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground uppercase border-b">
                      <th className="py-2 pr-4">Ticker</th>
                      <th className="py-2 pr-4">Action</th>
                      <th className="py-2 pr-4 text-right">Current Shares</th>
                      <th className="py-2 pr-4 text-right">Target Shares</th>
                      <th className="py-2 pr-4 text-right">&Delta; Shares</th>
                      <th className="py-2 pr-4 text-right">&Delta; $</th>
                      <th className="py-2 pr-4">Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t) => (
                      <tr key={t.ticker} className="border-b border-gray-100">
                        <td className="py-2 pr-4 font-medium">{t.ticker}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={t.action === 'BUY' ? 'default' : 'destructive'}>{t.action}</Badge>
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">{t.currentShares.toFixed(2)}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{t.targetShares.toFixed(2)}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{t.deltaShares >= 0 ? '+' : ''}{t.deltaShares.toFixed(2)}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {t.deltaDollars >= 0 ? '+' : ''}${t.deltaDollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground max-w-xs">{t.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-2">
              <Link
                href="/dashboard/tools/cvar-optimizer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                View full optimization results <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
