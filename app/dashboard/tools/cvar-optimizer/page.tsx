'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldAlert,
  RefreshCw,
  Play,
  Settings2,
  LayoutDashboard,
  LineChart as LineChartIcon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Info,
  FlaskConical,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  WeightComparisonChart,
  FactorExposureChart,
  AllocationPieChart,
  CVaRComparisonChart,
  StressTestChart,
  pct,
} from '@/components/quant/CVaROptimizerCharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortfolioHolding {
  ticker: string;
  sector: string | null;
  region: string | null;
  currentValue: number | null;
  weight: number;
}

interface PortfolioSummaryResponse {
  holdings: PortfolioHolding[];
  summary: { totalValue: number; positionCount: number; lastUpdated: string };
}

interface ConstraintBand { min: number; max: number }
interface FactorTilt { target: number }

interface ConstraintSet {
  id: string;
  name: string;
  isActive: boolean;
  sectorLimits: Record<string, ConstraintBand>;
  regionLimits: Record<string, ConstraintBand>;
  factorTilts: Record<string, FactorTilt>;
  maxSinglePositionWeight: number;
  turnoverLimit: number | null;
  cvarConfidence: number;
  cvarHorizonDays: number;
  createdAt: string;
}

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

interface StressTestResult {
  window: { key: string; label: string; from: string; to: string; description: string };
  portfolioReturn: number | null;
  benchmarkReturn: number | null;
  holdingsCovered: number;
  holdingsTotal: number;
  coverageNote: string;
}

interface SavedOptimizationRun {
  id: string;
  status: string;
  asOfDate: string;
  createdAt: string;
  targetWeights: Record<string, number>;
  expectedCVaR: number;
  benchmarkCVaR: number | null;
  factorExposures: Record<string, number | null>;
  sectorWeights: Record<string, number>;
  regionWeights: Record<string, number>;
  suggestedTrades: SuggestedTrade[];
  stressTestResults: StressTestResult[] | null;
  diagnostics: { warnings?: string[]; message?: string } | null;
}

interface FactorExposureRow {
  ticker: string;
  value: number | null;
  growth: number | null;
  momentum: number | null;
  quality: number | null;
  volatility: number | null;
  size: number | null;
  dataComplete: boolean;
}

type Tab = 'overview' | 'constraints' | 'run' | 'results' | 'sandbox';

interface SandboxTickerRow {
  ticker: string;
  shares: number;
  sector: string | null;
  region: string | null;
}

interface SandboxRun {
  id: string;
  label: string;
  status: string;
  tickers: SandboxTickerRow[];
  targetWeights: Record<string, number>;
  expectedCVaR: number | null;
  benchmarkCVaR: number | null;
  factorExposures: Record<string, number | null> | null;
  sectorWeights: Record<string, number> | null;
  regionWeights: Record<string, number> | null;
  stressTestResults: StressTestResult[] | null;
  diagnostics: { warnings?: string[]; message?: string } | null;
  createdAt: string;
}

const FACTOR_LABELS: Record<string, string> = {
  value: 'Value', growth: 'Growth', momentum: 'Momentum', quality: 'Quality', volatility: 'Low-Vol', size: 'Size',
};

export default function CVaROptimizerPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [portfolio, setPortfolio] = useState<PortfolioSummaryResponse | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);

  const [constraintSets, setConstraintSets] = useState<ConstraintSet[]>([]);
  const [constraintsLoading, setConstraintsLoading] = useState(true);

  const [factorExposures, setFactorExposures] = useState<FactorExposureRow[]>([]);
  const [factorsLoading, setFactorsLoading] = useState(true);

  const [backfilling, setBackfilling] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null);
  const [computingFactors, setComputingFactors] = useState(false);

  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [latestRun, setLatestRun] = useState<SavedOptimizationRun | null>(null);
  const [latestRunLoading, setLatestRunLoading] = useState(true);

  const fetchPortfolio = useCallback(async () => {
    setPortfolioLoading(true);
    try {
      const res = await fetch('/api/portfolio/summary');
      if (res.ok) setPortfolio(await res.json());
    } catch (e) {
      console.error('Failed to fetch portfolio summary:', e);
    } finally {
      setPortfolioLoading(false);
    }
  }, []);

  const fetchConstraints = useCallback(async () => {
    setConstraintsLoading(true);
    try {
      const res = await fetch('/api/tools/cvar-optimizer/constraints');
      if (res.ok) {
        const data = await res.json();
        setConstraintSets(data.constraintSets ?? []);
      }
    } catch (e) {
      console.error('Failed to fetch constraint sets:', e);
    } finally {
      setConstraintsLoading(false);
    }
  }, []);

  const fetchFactors = useCallback(async () => {
    setFactorsLoading(true);
    try {
      const res = await fetch('/api/tools/cvar-optimizer/factors');
      if (res.ok) {
        const data = await res.json();
        setFactorExposures(data.exposures ?? []);
      }
    } catch (e) {
      console.error('Failed to fetch factor exposures:', e);
    } finally {
      setFactorsLoading(false);
    }
  }, []);

  const fetchLatestRun = useCallback(async () => {
    setLatestRunLoading(true);
    try {
      const res = await fetch('/api/tools/cvar-optimizer/latest');
      if (res.ok) {
        const data = await res.json();
        setLatestRun(data.run ?? null);
      }
    } catch (e) {
      console.error('Failed to fetch latest optimization run:', e);
    } finally {
      setLatestRunLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
    fetchConstraints();
    fetchFactors();
    fetchLatestRun();
  }, [fetchPortfolio, fetchConstraints, fetchFactors, fetchLatestRun]);

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillMessage(null);
    try {
      const res = await fetch('/api/tools/cvar-optimizer/backfill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) {
        setBackfillMessage(data.error || 'Backfill failed.');
      } else {
        setBackfillMessage(`Backfilled ${data.summary.ok}/${data.summary.total} tickers (${data.summary.totalRowsWritten} rows written).`);
      }
    } catch (e) {
      setBackfillMessage('Backfill request failed.');
      console.error(e);
    } finally {
      setBackfilling(false);
    }
  };

  const handleComputeFactors = async () => {
    setComputingFactors(true);
    try {
      const res = await fetch('/api/tools/cvar-optimizer/factors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (res.ok) {
        await fetchFactors();
      }
    } catch (e) {
      console.error('Failed to compute factors:', e);
    } finally {
      setComputingFactors(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setRunError(null);
    try {
      const activeSet = constraintSets.find((c) => c.isActive);
      const res = await fetch('/api/tools/cvar-optimizer/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ constraintSetId: activeSet?.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRunError(data.error || 'Optimization run failed.');
      } else if (data.status !== 'completed') {
        setRunError(data.diagnostics?.message || `Run finished with status "${data.status}".`);
        await fetchLatestRun();
      } else {
        await fetchLatestRun();
        setActiveTab('results');
      }
    } catch (e) {
      setRunError('Optimization run request failed.');
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  const sectorBreakdown: Record<string, number> = {};
  const regionBreakdown: Record<string, number> = {};
  if (portfolio) {
    for (const h of portfolio.holdings) {
      const w = (h.weight ?? 0) / 100;
      if (h.sector) sectorBreakdown[h.sector] = (sectorBreakdown[h.sector] ?? 0) + w;
      if (h.region) regionBreakdown[h.region] = (regionBreakdown[h.region] ?? 0) + w;
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'constraints', label: 'Constraints', icon: Settings2 },
    { id: 'run', label: 'Run Optimization', icon: Play },
    { id: 'results', label: 'Results', icon: LineChartIcon },
    { id: 'sandbox', label: 'Sandbox', icon: FlaskConical },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">CVaR Portfolio Optimizer</h1>
          <p className="text-muted-foreground">
            Baseline late-cycle / recessionary regime tilt — CVaR minimization with sector, region, and factor constraints.
          </p>
        </div>
        <Link href="/reports/regime-thesis">
          <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-100">
            <FileText className="w-4 h-4 mr-2" />
            Methodology Report
          </Button>
        </Link>
      </div>

      {/* Persistent disclaimer banner (plan Section 9, item 5) */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">
          This model applies a manually-configured regime view. It does not detect market regimes.
          Recommendations require manual review — no trades are auto-executed.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Portfolio</CardTitle>
                  <CardDescription>
                    {portfolio ? `${portfolio.summary.positionCount} positions, $${portfolio.summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} total value` : 'Loading...'}
                  </CardDescription>
                </div>
                {isAdmin && (
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100" onClick={handleBackfill} disabled={backfilling}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${backfilling ? 'animate-spin' : ''}`} />
                        {backfilling ? 'Refreshing...' : 'Refresh price data'}
                      </Button>
                      <Button size="sm" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100" onClick={handleComputeFactors} disabled={computingFactors}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${computingFactors ? 'animate-spin' : ''}`} />
                        {computingFactors ? 'Computing...' : 'Recompute factors'}
                      </Button>
                    </div>
                    {backfillMessage && <p className="text-xs text-muted-foreground">{backfillMessage}</p>}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {portfolioLoading ? (
                <p className="text-sm text-muted-foreground">Loading portfolio...</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Sector Breakdown</h4>
                    <AllocationPieChart data={sectorBreakdown} title="Sector" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Region Breakdown</h4>
                    <AllocationPieChart data={regionBreakdown} title="Region" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Factor Exposures (Latest Computed)</CardTitle>
              <CardDescription>
                Cross-sectional z-scores within the current holdings universe — see the methodology report for the full caveat on this scoping.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {factorsLoading ? (
                <p className="text-sm text-muted-foreground">Loading factor exposures...</p>
              ) : factorExposures.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No factor exposures computed yet. {isAdmin && 'Click "Recompute factors" above to run the factor pipeline.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground uppercase border-b">
                        <th className="py-2 pr-4">Ticker</th>
                        {Object.values(FACTOR_LABELS).map((l) => (
                          <th key={l} className="py-2 pr-4 text-right">{l}</th>
                        ))}
                        <th className="py-2 pr-4 text-right">Complete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {factorExposures.map((row) => (
                        <tr key={row.ticker} className="border-b border-gray-100">
                          <td className="py-2 pr-4 font-medium">{row.ticker}</td>
                          {(['value', 'growth', 'momentum', 'quality', 'volatility', 'size'] as const).map((f) => (
                            <td key={f} className="py-2 pr-4 text-right tabular-nums">
                              {row[f] !== null ? row[f]!.toFixed(2) : '—'}
                            </td>
                          ))}
                          <td className="py-2 pr-4 text-right">
                            {row.dataComplete ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-500 inline" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Constraints tab ──────────────────────────────────────────────── */}
      {activeTab === 'constraints' && (
        <ConstraintsTab
          constraintSets={constraintSets}
          loading={constraintsLoading}
          isAdmin={isAdmin}
          onRefresh={fetchConstraints}
        />
      )}

      {/* ── Run Optimization tab ─────────────────────────────────────────── */}
      {activeTab === 'run' && (
        <Card>
          <CardHeader>
            <CardTitle>Run Optimization</CardTitle>
            <CardDescription>
              Solves the CVaR-minimizing linear program against current holdings under the active constraint set.
              Requires price history and factor exposures to already be up to date (see Overview tab).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isAdmin ? (
              <p className="text-sm text-muted-foreground">Only admins can run the optimizer. Contact an admin to trigger a new run.</p>
            ) : (
              <>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
                  <p className="font-medium mb-1">Active constraint set</p>
                  <p className="text-muted-foreground">
                    {constraintSets.find((c) => c.isActive)?.name ?? 'No active constraint set — create one on the Constraints tab first.'}
                  </p>
                </div>
                <Button onClick={handleRun} disabled={running || !constraintSets.some((c) => c.isActive)}>
                  <Play className="w-4 h-4 mr-2" />
                  {running ? 'Running (this can take a minute)...' : 'Run Optimization'}
                </Button>
                {runError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{runError}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Results tab ──────────────────────────────────────────────────── */}
      {activeTab === 'results' && (
        <ResultsTab
          run={latestRun}
          loading={latestRunLoading}
          currentHoldings={portfolio?.holdings ?? []}
        />
      )}

      {/* ── Sandbox tab ───────────────────────────────────────────────────── */}
      {activeTab === 'sandbox' && <SandboxTab constraintSets={constraintSets} />}
    </div>
  );
}

// ─── Constraints tab ────────────────────────────────────────────────────────────

// Mirrors scripts/seed-cvar-constraint-set.js exactly — the "Late-Cycle Defensive
// Baseline" set (~57.5% US target, defensive sector floors, Quality/low-Vol factor
// floors). Kept in sync manually; the script remains the source of truth for anyone
// seeding via a direct DB connection instead of the UI.
const BASELINE_CONSTRAINT_SET = {
  name: 'Late-Cycle Defensive Baseline',
  isActive: true,
  regionLimits: {
    US: { min: 0.55, max: 0.60 },
    Europe: { min: 0.20, max: 0.30 },
    Japan: { min: 0.05, max: 0.15 },
    APAC_Other: { min: 0, max: 0.10 },
  },
  sectorLimits: {
    'Consumer Staples': { min: 0.10, max: 0.30 },
    'Utilities': { min: 0.05, max: 0.20 },
    'Health Care': { min: 0.10, max: 0.30 },
    'Information Technology': { min: 0, max: 0.30 },
    'Financials': { min: 0, max: 0.25 },
    'Energy': { min: 0, max: 0.15 },
    'Industrials': { min: 0, max: 0.20 },
    'Materials': { min: 0, max: 0.15 },
    'Consumer Discretionary': { min: 0, max: 0.20 },
    'Communication Services': { min: 0, max: 0.15 },
  },
  factorTilts: {
    quality: { target: 0.25 },
    volatility: { target: 0.25 },
  },
  maxSinglePositionWeight: 0.15,
  turnoverLimit: null,
  cvarConfidence: 0.95,
  cvarHorizonDays: 20,
};

function ConstraintsTab({
  constraintSets,
  loading,
  isAdmin,
  onRefresh,
}: {
  constraintSets: ConstraintSet[];
  loading: boolean;
  isAdmin: boolean;
  onRefresh: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const active = constraintSets.find((c) => c.isActive) ?? constraintSets[0] ?? null;

  const handleSeedBaseline = async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      const res = await fetch('/api/tools/cvar-optimizer/constraints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(BASELINE_CONSTRAINT_SET),
      });
      const data = await res.json();
      if (!res.ok) {
        setSeedError(data.error || 'Failed to seed baseline constraint set.');
      } else {
        onRefresh();
      }
    } catch (e) {
      setSeedError('Request failed.');
      console.error(e);
    } finally {
      setSeeding(false);
    }
  };

  const [maxPos, setMaxPos] = useState(active?.maxSinglePositionWeight ?? 0.15);
  const [confidence, setConfidence] = useState(active?.cvarConfidence ?? 0.95);
  const [horizon, setHorizon] = useState(active?.cvarHorizonDays ?? 20);

  useEffect(() => {
    if (active) {
      setMaxPos(active.maxSinglePositionWeight);
      setConfidence(active.cvarConfidence);
      setHorizon(active.cvarHorizonDays);
    }
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveScalars = async () => {
    if (!active) return;
    setSaving(true);
    try {
      await fetch('/api/tools/cvar-optimizer/constraints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: active.id,
          maxSinglePositionWeight: maxPos,
          cvarConfidence: confidence,
          cvarHorizonDays: horizon,
        }),
      });
      onRefresh();
    } catch (e) {
      console.error('Failed to save constraint set:', e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading constraint sets...</p>;
  }

  if (!active) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            No constraint sets found yet.
          </p>
          {isAdmin ? (
            <>
              <Button size="sm" onClick={handleSeedBaseline} disabled={seeding}>
                {seeding ? 'Seeding...' : 'Seed Baseline Constraint Set'}
              </Button>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Creates the &quot;Late-Cycle Defensive Baseline&quot; set (~57.5% US target, defensive sector
                floors, Quality/low-Vol factor floors) — the same values as{' '}
                <code className="px-1 py-0.5 bg-gray-100 rounded">scripts/seed-cvar-constraint-set.js</code>,
                for anyone who only has UI access and not a direct database connection.
              </p>
              {seedError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 max-w-md mx-auto text-left">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{seedError}</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Ask an admin to seed a baseline constraint set.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{active.name}</CardTitle>
              <CardDescription>Active constraint set — viewable by all authenticated users, editable by admins only.</CardDescription>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase block mb-1">Max Single Position</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={maxPos}
                disabled={!isAdmin}
                onChange={(e) => setMaxPos(parseFloat(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase block mb-1">CVaR Confidence</label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                max="0.999"
                value={confidence}
                disabled={!isAdmin}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase block mb-1">CVaR Horizon (days)</label>
              <input
                type="number"
                step="1"
                min="1"
                value={horizon}
                disabled={!isAdmin}
                onChange={(e) => setHorizon(parseInt(e.target.value, 10))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={handleSaveScalars} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}

          <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
            <div>
              <h4 className="text-sm font-semibold mb-2">Region Limits</h4>
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(active.regionLimits).map(([region, band]) => (
                    <tr key={region} className="border-b border-gray-100">
                      <td className="py-1.5">{region}</td>
                      <td className="py-1.5 text-right tabular-nums text-muted-foreground">{pct(band.min)} – {pct(band.max)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Sector Limits</h4>
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(active.sectorLimits).map(([sector, band]) => (
                    <tr key={sector} className="border-b border-gray-100">
                      <td className="py-1.5">{sector}</td>
                      <td className="py-1.5 text-right tabular-nums text-muted-foreground">{pct(band.min)} – {pct(band.max)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Factor Tilts (floors)</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(active.factorTilts).map(([factor, tilt]) => (
                <Badge key={factor} variant="secondary">
                  {FACTOR_LABELS[factor] ?? factor} ≥ {tilt.target.toFixed(2)}
                </Badge>
              ))}
            </div>
          </div>

          {!isAdmin && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Sector/region band and factor-tilt editing requires admin access. Contact an admin to request a change.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Results tab ────────────────────────────────────────────────────────────────

function ResultsTab({
  run,
  loading,
  currentHoldings,
}: {
  run: SavedOptimizationRun | null;
  loading: boolean;
  currentHoldings: PortfolioHolding[];
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading latest run...</p>;
  }

  if (!run) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No optimization run yet. Go to the &quot;Run Optimization&quot; tab to produce one.</p>
        </CardContent>
      </Card>
    );
  }

  const weightComparison = Object.entries(run.targetWeights).map(([ticker, target]) => {
    const current = currentHoldings.find((h) => h.ticker === ticker);
    return { ticker, current: (current?.weight ?? 0) / 100, target };
  });

  const factorComparisonData = Object.entries(FACTOR_LABELS).map(([key, label]) => ({
    factor: label,
    portfolio: run.factorExposures?.[key] ?? null,
  }));

  const stressChartData = (run.stressTestResults ?? []).map((st) => ({
    label: st.window.label,
    portfolio: st.portfolioReturn,
    benchmark: st.benchmarkReturn,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Run Date</p>
              <p className="text-sm font-semibold">{new Date(run.asOfDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Status</p>
              <Badge variant={run.status === 'completed' ? 'default' : 'destructive'}>{run.status}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Expected CVaR</p>
              <p className="text-sm font-semibold">{pct(run.expectedCVaR, 2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Benchmark (URTH) CVaR</p>
              <p className="text-sm font-semibold">{run.benchmarkCVaR !== null ? pct(run.benchmarkCVaR, 2) : '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target vs Current Weights</CardTitle>
        </CardHeader>
        <CardContent>
          <WeightComparisonChart data={weightComparison} />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Factor Exposure vs Benchmark</CardTitle>
            <CardDescription>Portfolio-weighted-average cross-sectional z-score per factor.</CardDescription>
          </CardHeader>
          <CardContent>
            <FactorExposureChart data={factorComparisonData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CVaR Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <CVaRComparisonChart portfolioCVaR={run.expectedCVaR} benchmarkCVaR={run.benchmarkCVaR} />
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sector Allocation (Target)</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationPieChart data={run.sectorWeights} title="Sector" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Region Allocation (Target)</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationPieChart data={run.regionWeights} title="Region" />
          </CardContent>
        </Card>
      </div>

      {run.stressTestResults && run.stressTestResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Stress Test Results</CardTitle>
            <CardDescription>Target portfolio vs URTH, realized return over historical crisis windows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <StressTestChart data={stressChartData} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase border-b">
                    <th className="py-2 pr-4">Window</th>
                    <th className="py-2 pr-4 text-right">Portfolio</th>
                    <th className="py-2 pr-4 text-right">URTH</th>
                    <th className="py-2 pr-4">Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {run.stressTestResults.map((st) => (
                    <tr key={st.window.key} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium">{st.window.label}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{st.portfolioReturn !== null ? pct(st.portfolioReturn, 1) : '—'}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{st.benchmarkReturn !== null ? pct(st.benchmarkReturn, 1) : '—'}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{st.holdingsCovered}/{st.holdingsTotal} covered</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Suggested Trades</CardTitle>
          <CardDescription>Recommendation only — no trades are auto-executed. Enter manually via the Holdings page.</CardDescription>
        </CardHeader>
        <CardContent>
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
                {run.suggestedTrades.map((t) => (
                  <tr key={t.ticker} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-medium">{t.ticker}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={t.action === 'BUY' ? 'default' : t.action === 'SELL' ? 'destructive' : 'secondary'}>{t.action}</Badge>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{t.currentShares.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{t.targetShares.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{t.deltaShares >= 0 ? '+' : ''}{t.deltaShares.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{t.deltaDollars >= 0 ? '+' : ''}${t.deltaDollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground max-w-xs">{t.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Link href="/reports/regime-thesis">
          <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
            <FileText className="w-4 h-4 mr-2" />
            View Full Methodology Report
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Sandbox tab ────────────────────────────────────────────────────────────────
//
// Runs the same CVaR/factor/stress-test pipeline against a user-typed, ad-hoc ticker
// list — no dependency on real fund Holding records. Results are saved as
// SavedSandboxRun, a model kept entirely separate from SavedOptimizationRun so a
// sandbox test can never be mistaken for a real recommendation, and is never used as
// input to the regime-thesis report (that report's fund-portfolio sections require a
// real run against actual holdings — see plan Section 8, Sections 8-9 of the report).

const EMPTY_ROW: SandboxTickerRow = { ticker: '', shares: 0, sector: null, region: null };

const COMMON_SECTORS = [
  'Information Technology', 'Health Care', 'Financials', 'Consumer Staples',
  'Consumer Discretionary', 'Industrials', 'Energy', 'Utilities', 'Materials',
  'Communication Services', 'Real Estate',
];
const COMMON_REGIONS = ['US', 'Europe', 'Japan', 'APAC_Other'];

function SandboxTab({ constraintSets }: { constraintSets: ConstraintSet[] }) {
  const [label, setLabel] = useState('');
  const [rows, setRows] = useState<SandboxTickerRow[]>([{ ...EMPTY_ROW }, { ...EMPTY_ROW }, { ...EMPTY_ROW }]);
  const [selectedConstraintSetId, setSelectedConstraintSetId] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SandboxRun | null>(null);

  const updateRow = (index: number, patch: Partial<SandboxTickerRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/tools/cvar-optimizer/sandbox/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label || undefined,
          tickers: rows,
          constraintSetId: selectedConstraintSetId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sandbox run failed.');
      } else if (data.status !== 'completed') {
        setError(data.diagnostics?.message || `Run finished with status "${data.status}".`);
        setResult(data);
      } else {
        setResult(data);
      }
    } catch (e) {
      setError('Sandbox run request failed.');
      console.error(e);
    } finally {
      setRunning(false);
    }
  };

  const weightComparison = result
    ? Object.entries(result.targetWeights).map(([ticker, target]) => ({ ticker, current: 0, target }))
    : [];
  const factorComparisonData = result
    ? Object.entries(FACTOR_LABELS).map(([key, lbl]) => ({ factor: lbl, portfolio: result.factorExposures?.[key] ?? null }))
    : [];
  const stressChartData = (result?.stressTestResults ?? []).map((st) => ({
    label: st.window.label, portfolio: st.portfolioReturn, benchmark: st.benchmarkReturn,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <FlaskConical className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900">
          Test the model against any tickers you choose — not the fund&apos;s real holdings. Results are saved
          separately as scratch runs and are never used as fund recommendations or fed into the methodology report.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custom Portfolio</CardTitle>
          <CardDescription>Enter tickers and share counts, optionally with sector/region for constraint checking.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase block mb-1">Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Test basket A"
              className="w-full sm:w-80 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase border-b">
                  <th className="py-2 pr-3">Ticker</th>
                  <th className="py-2 pr-3">Shares</th>
                  <th className="py-2 pr-3">Sector (optional)</th>
                  <th className="py-2 pr-3">Region (optional)</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-3">
                      <input
                        type="text"
                        value={row.ticker}
                        onChange={(e) => updateRow(i, { ticker: e.target.value.toUpperCase() })}
                        placeholder="AAPL"
                        className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={row.shares || ''}
                        onChange={(e) => updateRow(i, { shares: parseFloat(e.target.value) || 0 })}
                        placeholder="100"
                        className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        value={row.sector ?? ''}
                        onChange={(e) => updateRow(i, { sector: e.target.value || null })}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">—</option>
                        {COMMON_SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        value={row.region ?? ''}
                        onChange={(e) => updateRow(i, { region: e.target.value || null })}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">—</option>
                        {COMMON_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="py-2">
                      <button onClick={() => removeRow(i)} className="text-gray-400 hover:text-red-600" aria-label="Remove row">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button size="sm" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100" onClick={addRow}>
            <Plus className="w-4 h-4 mr-2" />
            Add ticker
          </Button>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase block mb-1">Constraint set (optional)</label>
            <select
              value={selectedConstraintSetId}
              onChange={(e) => setSelectedConstraintSetId(e.target.value)}
              className="w-full sm:w-80 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Use loose defaults (no saved constraint set)</option>
              {constraintSets.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.isActive ? ' (active)' : ''}</option>
              ))}
            </select>
          </div>

          <Button onClick={handleRun} disabled={running}>
            <Play className="w-4 h-4 mr-2" />
            {running ? 'Running (fetches price history + runs the optimizer — can take a minute)...' : 'Run Sandbox Optimization'}
          </Button>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {result && result.status === 'completed' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Portfolio</p>
                  <p className="text-sm font-semibold">{result.label}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Status</p>
                  <Badge variant="default">{result.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Expected CVaR</p>
                  <p className="text-sm font-semibold">{result.expectedCVaR !== null ? pct(result.expectedCVaR, 2) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Benchmark (URTH) CVaR</p>
                  <p className="text-sm font-semibold">{result.benchmarkCVaR !== null ? pct(result.benchmarkCVaR, 2) : '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Model-Optimal Weights</CardTitle>
              <CardDescription>&quot;Current&quot; shown as 0% — sandbox portfolios have no live fund weight to compare against.</CardDescription>
            </CardHeader>
            <CardContent>
              <WeightComparisonChart data={weightComparison} />
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Factor Exposure</CardTitle></CardHeader>
              <CardContent><FactorExposureChart data={factorComparisonData} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>CVaR Comparison</CardTitle></CardHeader>
              <CardContent><CVaRComparisonChart portfolioCVaR={result.expectedCVaR} benchmarkCVaR={result.benchmarkCVaR} /></CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Sector Allocation</CardTitle></CardHeader>
              <CardContent><AllocationPieChart data={result.sectorWeights ?? {}} title="Sector" /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Region Allocation</CardTitle></CardHeader>
              <CardContent><AllocationPieChart data={result.regionWeights ?? {}} title="Region" /></CardContent>
            </Card>
          </div>

          {result.stressTestResults && result.stressTestResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Stress Test Results</CardTitle>
                <CardDescription>Sandbox portfolio vs URTH, realized return over historical crisis windows.</CardDescription>
              </CardHeader>
              <CardContent>
                <StressTestChart data={stressChartData} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
