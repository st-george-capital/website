'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart,
  RefreshCw,
  Wallet,
  Award,
  AlertTriangle,
  MessageSquare,
  Users,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { TradeModal } from '@/components/portfolio/TradeModal';
import { TradeHistory } from '@/components/portfolio/TradeHistory';
import { PortfolioChart } from '@/components/portfolio/PortfolioChart';

interface EnrichedHolding {
  id: string;
  ticker: string;
  apiTicker: string | null;
  exchange: string;
  assetType: string;
  quantity: number;
  costBasis: number | null;
  entryDate: string;
  notes: string | null;
  sector: string | null;
  region: string | null;
  strategyTag: string | null;
  visible: boolean;
  currentPrice: number | null;
  priceChange: number | null;
  priceChangePercent: number | null;
  currentValue: number | null;
  totalCost: number | null;
  gainLoss: number | null;
  gainLossPercent: number | null;
  weight: number;
}

interface PortfolioSummary {
  totalValue: number;
  stocksValue: number;
  cashBalance: number;
  initialCash: number;
  totalCostBasis: number;
  totalPnL: number;
  totalPnLPercent: number;
  totalReturn: number;
  realizedPnL: number;
  bestPerformer: { ticker: string; percent: number | null } | null;
  worstPerformer: { ticker: string; percent: number | null } | null;
  positionCount: number;
  lastUpdated: string;
}

interface CommitteeVote {
  id: string;
  userId: string;
  userName: string;
  vote: string;
  conviction: number;
  comment: string | null;
  objections: string | null;
  createdAt: string;
}

interface CommitteeDecision {
  id: string;
  meetingDate: string;
  finalDecision: string;
  averageConviction: number | null;
  keyObjections: string | null;
  summary: string | null;
  votes: CommitteeVote[];
}

interface CommitteeData {
  holding: {
    id: string;
    ticker: string;
    assetType: string;
    strategyTag: string | null;
  };
  decisions: CommitteeDecision[];
}

export default function HoldingsPage() {
  const { data: session } = useSession();
  const [holdings, setHoldings] = useState<EnrichedHolding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeRefreshKey, setTradeRefreshKey] = useState(0);
  const [selectedHoldingId, setSelectedHoldingId] = useState<string>('');
  const [committeeData, setCommitteeData] = useState<CommitteeData | null>(null);
  const [committeeLoading, setCommitteeLoading] = useState(false);
  const [committeeSaving, setCommitteeSaving] = useState(false);
  const [newDecisionForm, setNewDecisionForm] = useState({
    meetingDate: new Date().toISOString().split('T')[0],
    finalDecision: 'pending',
    summary: '',
    keyObjections: '',
  });
  const [voteForm, setVoteForm] = useState({
    vote: 'approve',
    conviction: 7,
    comment: '',
    objections: '',
  });
  const [finalizeForm, setFinalizeForm] = useState({
    finalDecision: 'approve',
    summary: '',
    keyObjections: '',
  });

  const isAdmin = session?.user?.role === 'admin';

  const fetchPortfolio = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const response = await fetch('/api/portfolio/summary');
      if (response.ok) {
        const data = await response.json();
        setHoldings(data.holdings);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(() => fetchPortfolio(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPortfolio]);

  useEffect(() => {
    if (!selectedHoldingId && holdings.length > 0) {
      setSelectedHoldingId(holdings[0].id);
    }
  }, [holdings, selectedHoldingId]);

  useEffect(() => {
    if (!selectedHoldingId) return;
    fetchCommittee(selectedHoldingId);
  }, [selectedHoldingId]);

  useEffect(() => {
    if (committeeData) {
      hydrateCommitteeForms(committeeData);
    }
  }, [committeeData, session?.user?.id]);

  const hydrateCommitteeForms = (data: CommitteeData) => {
    const latestDecision = data.decisions[0];
    const existingVote = latestDecision?.votes.find((vote) => vote.userId === session?.user?.id);

    setVoteForm({
      vote: existingVote?.vote || 'approve',
      conviction: existingVote?.conviction || 7,
      comment: existingVote?.comment || '',
      objections: existingVote?.objections || '',
    });

    setFinalizeForm({
      finalDecision: latestDecision?.finalDecision || 'approve',
      summary: latestDecision?.summary || '',
      keyObjections: latestDecision?.keyObjections || '',
    });
  };

  const fetchCommittee = async (holdingId: string) => {
    setCommitteeLoading(true);
    try {
      const response = await fetch(`/api/holdings/${holdingId}/committee`);
      if (!response.ok) {
        setCommitteeData(null);
        return;
      }

      const data: CommitteeData = await response.json();
      setCommitteeData(data);
      hydrateCommitteeForms(data);
    } catch (error) {
      console.error('Failed to fetch committee data:', error);
      setCommitteeData(null);
    } finally {
      setCommitteeLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holding?')) return;

    try {
      const res = await fetch(`/api/holdings/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchPortfolio();
        alert('Holding deleted successfully!');
      } else {
        alert('Failed to delete holding');
      }
    } catch (error) {
      console.error('Error deleting holding:', error);
      alert('Failed to delete holding');
    }
  };

  const handleTradeComplete = () => {
    fetchPortfolio();
    setTradeRefreshKey((k) => k + 1);
  };

  const handleCreateDecision = async () => {
    if (!selectedHoldingId) return;

    setCommitteeSaving(true);
    try {
      const response = await fetch(`/api/holdings/${selectedHoldingId}/committee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createDecision',
          ...newDecisionForm,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to create committee review');
        return;
      }

      setNewDecisionForm({
        meetingDate: new Date().toISOString().split('T')[0],
        finalDecision: 'pending',
        summary: '',
        keyObjections: '',
      });
      await fetchCommittee(selectedHoldingId);
    } catch (error) {
      console.error('Failed to create committee review:', error);
      alert('Failed to create committee review');
    } finally {
      setCommitteeSaving(false);
    }
  };

  const handleSaveVote = async () => {
    if (!selectedHoldingId || !committeeData?.decisions[0]) return;

    setCommitteeSaving(true);
    try {
      const response = await fetch(`/api/holdings/${selectedHoldingId}/committee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'saveVote',
          decisionId: committeeData.decisions[0].id,
          ...voteForm,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to save your vote');
        return;
      }

      await fetchCommittee(selectedHoldingId);
    } catch (error) {
      console.error('Failed to save vote:', error);
      alert('Failed to save your vote');
    } finally {
      setCommitteeSaving(false);
    }
  };

  const handleFinalizeDecision = async () => {
    if (!selectedHoldingId || !committeeData?.decisions[0]) return;

    setCommitteeSaving(true);
    try {
      const response = await fetch(`/api/holdings/${selectedHoldingId}/committee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'finalizeDecision',
          decisionId: committeeData.decisions[0].id,
          ...finalizeForm,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to finalize decision');
        return;
      }

      await fetchCommittee(selectedHoldingId);
    } catch (error) {
      console.error('Failed to finalize decision:', error);
      alert('Failed to finalize decision');
    } finally {
      setCommitteeSaving(false);
    }
  };

  const latestDecision = committeeData?.decisions[0] || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Portfolio Holdings</h1>
            <p className="text-muted-foreground">
              {summary?.positionCount || 0} positions
              {summary?.lastUpdated && (
                <> &middot; Updated {new Date(summary.lastUpdated).toLocaleTimeString()}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => fetchPortfolio(true)}
              disabled={refreshing}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {isAdmin && (
              <Button
                onClick={() => setShowTradeModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Trade
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards - 2 rows of 3 */}
        {summary && (
          <div className="space-y-4">
            {/* Row 1: Value cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Total Portfolio Value */}
              <Card hover={false}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(summary.totalValue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stocks: {formatCurrency(summary.stocksValue)} + Cash: {formatCurrency(summary.cashBalance)}
                  </p>
                </CardContent>
              </Card>

              {/* Stocks Value */}
              <Card hover={false}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-gray-600" />
                    </div>
                    <p className="text-sm text-muted-foreground">Total Cost Basis</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(summary.totalCostBasis)}
                  </p>
                </CardContent>
              </Card>

              {/* Cash Balance */}
              <Card hover={false}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-sm text-muted-foreground">Cash Balance</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(summary.cashBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((summary.cashBalance / summary.totalValue) * 100).toFixed(1)}% of portfolio
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Row 2: Performance cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Unrealized P&L */}
              <Card hover={false}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        summary.totalPnL >= 0 ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      {summary.totalPnL >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">Unrealized P&L</p>
                  </div>
                  <p
                    className={`text-2xl font-bold ${
                      summary.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(summary.totalPnL)}
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      summary.totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatPercent(summary.totalPnLPercent)}
                  </p>
                </CardContent>
              </Card>

              {/* Best Performer */}
              <Card hover={false}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-sm text-muted-foreground">Best Performer</p>
                  </div>
                  {summary.bestPerformer ? (
                    <>
                      <p className="text-2xl font-bold">{summary.bestPerformer.ticker}</p>
                      <p className="text-sm font-medium text-green-600">
                        {summary.bestPerformer.percent !== null
                          ? formatPercent(summary.bestPerformer.percent)
                          : '--'}
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-muted-foreground">--</p>
                  )}
                </CardContent>
              </Card>

              {/* Worst Performer */}
              <Card hover={false}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-sm text-muted-foreground">Worst Performer</p>
                  </div>
                  {summary.worstPerformer ? (
                    <>
                      <p className="text-2xl font-bold">{summary.worstPerformer.ticker}</p>
                      <p className="text-sm font-medium text-red-600">
                        {summary.worstPerformer.percent !== null
                          ? formatPercent(summary.worstPerformer.percent)
                          : '--'}
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-muted-foreground">--</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Portfolio Timeline Chart */}
        <PortfolioChart isAdmin={isAdmin} refreshKey={tradeRefreshKey} />

        {/* Holdings Table */}
        <Card hover={false}>
          <CardHeader>
            <CardTitle>Active Positions</CardTitle>
            <CardDescription>All current portfolio holdings with live market data</CardDescription>
          </CardHeader>
          <CardContent>
            {holdings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No holdings yet. Record a trade or import a position to get started.
                </p>
                {isAdmin && (
                  <Button onClick={() => setShowTradeModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Trade
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 font-semibold">Ticker</th>
                      <th className="pb-3 font-semibold">Type</th>
                      <th className="pb-3 font-semibold text-right">Shares</th>
                      <th className="pb-3 font-semibold text-right">Avg Cost</th>
                      <th className="pb-3 font-semibold text-right">Price</th>
                      <th className="pb-3 font-semibold text-right">Day Chg%</th>
                      <th className="pb-3 font-semibold text-right">Value</th>
                      <th className="pb-3 font-semibold text-right">Gain/Loss</th>
                      <th className="pb-3 font-semibold text-right">G/L %</th>
                      <th className="pb-3 font-semibold text-right">Weight</th>
                      {isAdmin && <th className="pb-3 font-semibold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((holding) => (
                      <tr key={holding.id} className="border-b border-border">
                        <td className="py-4">
                          <span className="font-bold">{holding.ticker}</span>
                          {holding.exchange !== 'US' && (
                            <span className="ml-1 text-xs text-gray-400">
                              {holding.exchange}
                            </span>
                          )}
                        </td>
                        <td className="py-4">
                          <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                            {holding.assetType}
                          </span>
                        </td>
                        <td className="py-4 text-right">{holding.quantity.toLocaleString()}</td>
                        <td className="py-4 text-right">
                          {holding.costBasis !== null ? formatCurrency(holding.costBasis) : '--'}
                        </td>
                        <td className="py-4 text-right font-medium">
                          {holding.currentPrice !== null
                            ? formatCurrency(holding.currentPrice)
                            : '--'}
                        </td>
                        <td className="py-4 text-right">
                          {holding.priceChangePercent !== null ? (
                            <span
                              className={`inline-flex items-center gap-1 font-medium ${
                                holding.priceChangePercent >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {holding.priceChangePercent >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {formatPercent(holding.priceChangePercent)}
                            </span>
                          ) : (
                            '--'
                          )}
                        </td>
                        <td className="py-4 text-right font-semibold">
                          {holding.currentValue !== null
                            ? formatCurrency(holding.currentValue)
                            : '--'}
                        </td>
                        <td className="py-4 text-right">
                          {holding.gainLoss !== null ? (
                            <span
                              className={`font-medium ${
                                holding.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {formatCurrency(holding.gainLoss)}
                            </span>
                          ) : (
                            '--'
                          )}
                        </td>
                        <td className="py-4 text-right">
                          {holding.gainLossPercent !== null ? (
                            <span
                              className={`font-medium ${
                                holding.gainLossPercent >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {formatPercent(holding.gainLossPercent)}
                            </span>
                          ) : (
                            '--'
                          )}
                        </td>
                        <td className="py-4 text-right">
                          {holding.weight > 0 ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-sm font-medium">
                                {holding.weight.toFixed(1)}%
                              </span>
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min(holding.weight, 100)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            '--'
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-4 text-right">
                            <button
                              onClick={() => handleDelete(holding.id)}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card hover={false}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <CardTitle>Investment Committee</CardTitle>
                <CardDescription>
                  Formal vote tracking, conviction scoring, objections, and final decisions for each holding
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {holdings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add holdings to start tracking committee reviews.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium mb-2">Selected Holding</label>
                    <select
                      value={selectedHoldingId}
                      onChange={(e) => setSelectedHoldingId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                    >
                      {holdings.map((holding) => (
                        <option key={holding.id} value={holding.id}>
                          {holding.ticker} • {holding.assetType}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => selectedHoldingId && fetchCommittee(selectedHoldingId)}
                    disabled={committeeLoading || !selectedHoldingId}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Refresh Committee
                  </Button>
                </div>

                {committeeLoading ? (
                  <p className="text-sm text-muted-foreground">Loading committee history...</p>
                ) : (
                  <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="space-y-4">
                      <div className="rounded-lg border border-gray-200 bg-slate-50/70 p-4">
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {committeeData?.holding.ticker || 'Selected holding'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {committeeData?.holding.assetType}
                              {committeeData?.holding.strategyTag && ` • ${committeeData.holding.strategyTag}`}
                            </p>
                          </div>
                          {latestDecision && (
                            <span className="px-3 py-1 text-xs rounded-full bg-white border border-gray-200 text-gray-700 capitalize">
                              {latestDecision.finalDecision}
                            </span>
                          )}
                        </div>

                        {!latestDecision ? (
                          <p className="text-sm text-muted-foreground">
                            No committee review has been started for this holding yet.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-lg bg-white border border-gray-200 p-3">
                              <div className="text-xs text-muted-foreground mb-1">Latest Meeting</div>
                              <div className="font-semibold">
                                {new Date(latestDecision.meetingDate).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="rounded-lg bg-white border border-gray-200 p-3">
                              <div className="text-xs text-muted-foreground mb-1">Votes Cast</div>
                              <div className="font-semibold">{latestDecision.votes.length}</div>
                            </div>
                            <div className="rounded-lg bg-white border border-gray-200 p-3">
                              <div className="text-xs text-muted-foreground mb-1">Avg Conviction</div>
                              <div className="font-semibold">
                                {latestDecision.averageConviction ? latestDecision.averageConviction.toFixed(1) : '--'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {latestDecision && (
                        <div className="rounded-lg border border-gray-200 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="w-4 h-4 text-primary" />
                            <h3 className="font-semibold">Current Review</h3>
                          </div>
                          {latestDecision.summary && (
                            <p className="text-sm mb-3">{latestDecision.summary}</p>
                          )}
                          {latestDecision.keyObjections && (
                            <p className="text-sm mb-4">
                              <span className="font-medium">Key objections:</span> {latestDecision.keyObjections}
                            </p>
                          )}
                          <div className="space-y-3">
                            {latestDecision.votes.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No votes submitted yet.</p>
                            ) : (
                              latestDecision.votes.map((vote) => (
                                <div key={vote.id} className="rounded-lg border border-gray-200 bg-slate-50 px-4 py-3">
                                  <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="font-medium">{vote.userName}</div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-1 text-xs rounded-full bg-white border border-gray-200 capitalize">
                                        {vote.vote}
                                      </span>
                                      <span className="px-2 py-1 text-xs rounded-full bg-white border border-gray-200">
                                        Conviction {vote.conviction}/10
                                      </span>
                                    </div>
                                  </div>
                                  {vote.comment && (
                                    <p className="text-sm mb-2">
                                      <span className="font-medium">Comment:</span> {vote.comment}
                                    </p>
                                  )}
                                  {vote.objections && (
                                    <p className="text-sm">
                                      <span className="font-medium">Objections:</span> {vote.objections}
                                    </p>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {committeeData?.decisions && committeeData.decisions.length > 1 && (
                        <div className="rounded-lg border border-gray-200 p-4">
                          <h3 className="font-semibold mb-3">Past Committee Decisions</h3>
                          <div className="space-y-3">
                            {committeeData.decisions.slice(1).map((decision) => (
                              <div key={decision.id} className="rounded-lg border border-gray-200 px-4 py-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <div className="font-medium">
                                      {new Date(decision.meetingDate).toLocaleDateString()}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {decision.votes.length} vote{decision.votes.length === 1 ? '' : 's'}
                                      {decision.averageConviction ? ` • ${decision.averageConviction.toFixed(1)} avg conviction` : ''}
                                    </div>
                                  </div>
                                  <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700 capitalize">
                                    {decision.finalDecision}
                                  </span>
                                </div>
                                {decision.summary && (
                                  <p className="text-sm mt-2">{decision.summary}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {isAdmin && (
                        <div className="rounded-lg border border-gray-200 p-4">
                          <h3 className="font-semibold mb-3">Start New Review</h3>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium mb-2">Meeting Date</label>
                              <input
                                type="date"
                                value={newDecisionForm.meetingDate}
                                onChange={(e) => setNewDecisionForm((prev) => ({ ...prev, meetingDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Initial Decision Status</label>
                              <select
                                value={newDecisionForm.finalDecision}
                                onChange={(e) => setNewDecisionForm((prev) => ({ ...prev, finalDecision: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                              >
                                <option value="pending">Pending</option>
                                <option value="approve">Approve</option>
                                <option value="watchlist">Watchlist</option>
                                <option value="pass">Pass</option>
                                <option value="reject">Reject</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Summary</label>
                              <textarea
                                value={newDecisionForm.summary}
                                onChange={(e) => setNewDecisionForm((prev) => ({ ...prev, summary: e.target.value }))}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                                placeholder="Capture the agenda or framing for this review."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Key Objections</label>
                              <textarea
                                value={newDecisionForm.keyObjections}
                                onChange={(e) => setNewDecisionForm((prev) => ({ ...prev, keyObjections: e.target.value }))}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                                placeholder="List the biggest open objections before voting begins."
                              />
                            </div>
                            <Button onClick={handleCreateDecision} disabled={committeeSaving || !selectedHoldingId}>
                              {committeeSaving ? 'Saving...' : 'Create Committee Review'}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="font-semibold mb-3">Cast Your Vote</h3>
                        {!latestDecision ? (
                          <p className="text-sm text-muted-foreground">
                            Wait for an admin to create a committee review for this holding.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium mb-2">Vote</label>
                              <select
                                value={voteForm.vote}
                                onChange={(e) => setVoteForm((prev) => ({ ...prev, vote: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                              >
                                <option value="approve">Approve</option>
                                <option value="watchlist">Watchlist</option>
                                <option value="pass">Pass</option>
                                <option value="reject">Reject</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Conviction ({voteForm.conviction}/10)</label>
                              <input
                                type="range"
                                min={1}
                                max={10}
                                value={voteForm.conviction}
                                onChange={(e) => setVoteForm((prev) => ({ ...prev, conviction: Number(e.target.value) }))}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Comment</label>
                              <textarea
                                value={voteForm.comment}
                                onChange={(e) => setVoteForm((prev) => ({ ...prev, comment: e.target.value }))}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                                placeholder="Summarize why you landed on this vote."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Objections</label>
                              <textarea
                                value={voteForm.objections}
                                onChange={(e) => setVoteForm((prev) => ({ ...prev, objections: e.target.value }))}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                                placeholder="Call out the risks or missing work that keep you from higher conviction."
                              />
                            </div>
                            <Button onClick={handleSaveVote} disabled={committeeSaving}>
                              {committeeSaving ? 'Saving...' : 'Save My Vote'}
                            </Button>
                          </div>
                        )}
                      </div>

                      {isAdmin && latestDecision && (
                        <div className="rounded-lg border border-gray-200 p-4">
                          <h3 className="font-semibold mb-3">Finalize Decision</h3>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium mb-2">Final Decision</label>
                              <select
                                value={finalizeForm.finalDecision}
                                onChange={(e) => setFinalizeForm((prev) => ({ ...prev, finalDecision: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                              >
                                <option value="pending">Pending</option>
                                <option value="approve">Approve</option>
                                <option value="watchlist">Watchlist</option>
                                <option value="pass">Pass</option>
                                <option value="reject">Reject</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Decision Record</label>
                              <textarea
                                value={finalizeForm.summary}
                                onChange={(e) => setFinalizeForm((prev) => ({ ...prev, summary: e.target.value }))}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                                placeholder="Document why the committee landed where it did."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Key Objections</label>
                              <textarea
                                value={finalizeForm.keyObjections}
                                onChange={(e) => setFinalizeForm((prev) => ({ ...prev, keyObjections: e.target.value }))}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none"
                                placeholder="Summarize the main objections that shaped the final decision."
                              />
                            </div>
                            <Button onClick={handleFinalizeDecision} disabled={committeeSaving}>
                              {committeeSaving ? 'Saving...' : 'Finalize Committee Decision'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Asset Breakdown */}
        {holdings.length > 0 && (
          <Card hover={false}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Portfolio Breakdown</CardTitle>
                  <CardDescription>Distribution by asset type</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Cash allocation */}
                {summary && summary.cashBalance > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Cash</span>
                      <span className="text-primary font-semibold">
                        {((summary.cashBalance / summary.totalValue) * 100).toFixed(1)}% ({formatCurrency(summary.cashBalance)})
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${(summary.cashBalance / summary.totalValue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                {Array.from(new Set(holdings.map((h) => h.assetType))).map((type) => {
                  const typeHoldings = holdings.filter((h) => h.assetType === type);
                  const typeValue = typeHoldings.reduce(
                    (sum, h) => sum + (h.currentValue ?? (h.costBasis ? h.quantity * h.costBasis : 0)),
                    0
                  );
                  const totalValue = summary?.totalValue || 1;
                  const percentage = totalValue > 0 ? (typeValue / totalValue) * 100 : 0;

                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{type}</span>
                        <span className="text-primary font-semibold">
                          {percentage.toFixed(1)}% ({formatCurrency(typeValue)})
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trade History */}
        <TradeHistory refreshKey={tradeRefreshKey} />
      </div>

      {/* Trade Modal */}
      <TradeModal
        isOpen={showTradeModal}
        onClose={() => setShowTradeModal(false)}
        onTradeComplete={handleTradeComplete}
        existingTickers={holdings.map((h) => h.ticker)}
        cashBalance={summary?.cashBalance || 0}
      />

    </>
  );
}
