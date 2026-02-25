'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import {
  Plus,
  Trash2,
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface EnrichedHolding {
  id: string;
  ticker: string;
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
  totalCostBasis: number;
  totalPnL: number;
  totalPnLPercent: number;
  positionCount: number;
  lastUpdated: string;
}

export default function HoldingsPage() {
  const { data: session } = useSession();
  const [holdings, setHoldings] = useState<EnrichedHolding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    ticker: '',
    assetType: 'Equity',
    quantity: '',
    costBasis: '',
    entryDate: new Date().toISOString().split('T')[0],
    notes: '',
    sector: '',
    region: '',
    strategyTag: '',
    visible: true,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: formData.ticker.toUpperCase(),
          assetType: formData.assetType,
          quantity: parseFloat(formData.quantity),
          costBasis: formData.costBasis ? parseFloat(formData.costBasis) : null,
          entryDate: formData.entryDate,
          notes: formData.notes || null,
          sector: formData.sector || null,
          region: formData.region || null,
          strategyTag: formData.strategyTag || null,
          visible: formData.visible,
        }),
      });

      if (res.ok) {
        alert('Holding added successfully!');
        setShowAddModal(false);
        setFormData({
          ticker: '',
          assetType: 'Equity',
          quantity: '',
          costBasis: '',
          entryDate: new Date().toISOString().split('T')[0],
          notes: '',
          sector: '',
          region: '',
          strategyTag: '',
          visible: true,
        });
        fetchPortfolio();
      } else {
        const error = await res.json();
        alert(`Failed to add holding: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding holding:', error);
      alert('Failed to add holding');
    } finally {
      setSaving(false);
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
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {isAdmin && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Holding
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Total Portfolio Value */}
            <Card hover={false}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">Total Market Value</p>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary.totalValue)}
                </p>
              </CardContent>
            </Card>

            {/* Total Cost Basis */}
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

            {/* Total P&L */}
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
                  <p className="text-sm text-muted-foreground">Total P&L</p>
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
          </div>
        )}

        {/* Holdings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Active Positions</CardTitle>
            <CardDescription>All current portfolio holdings with live market data</CardDescription>
          </CardHeader>
          <CardContent>
            {holdings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No holdings yet. Add your first position to get started.
                </p>
                {isAdmin && (
                  <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Holding
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
                        <td className="py-4 font-bold">{holding.ticker}</td>
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

        {/* Asset Breakdown */}
        {holdings.length > 0 && (
          <Card>
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
      </div>

      {/* Add Holding Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Add New Holding</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Ticker */}
              <div>
                <label className="block text-sm font-medium mb-2">Ticker Symbol *</label>
                <input
                  type="text"
                  value={formData.ticker}
                  onChange={(e) =>
                    setFormData({ ...formData, ticker: e.target.value.toUpperCase() })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="AAPL"
                />
              </div>

              {/* Asset Type & Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Asset Type *</label>
                  <select
                    value={formData.assetType}
                    onChange={(e) => setFormData({ ...formData, assetType: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Equity">Equity</option>
                    <option value="ETF">ETF</option>
                    <option value="Commodity">Commodity</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="100"
                  />
                </div>
              </div>

              {/* Cost Basis & Entry Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Cost Basis (per unit)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costBasis}
                    onChange={(e) => setFormData({ ...formData, costBasis: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="150.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Entry Date *</label>
                  <input
                    type="date"
                    value={formData.entryDate}
                    onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Sector & Region */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Sector</label>
                  <input
                    type="text"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Technology"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Region</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="North America"
                  />
                </div>
              </div>

              {/* Strategy Tag */}
              <div>
                <label className="block text-sm font-medium mb-2">Strategy Tag</label>
                <input
                  type="text"
                  value={formData.strategyTag}
                  onChange={(e) => setFormData({ ...formData, strategyTag: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Growth, Value, Momentum, etc."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">Investment Thesis / Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Why we invested in this position..."
                />
              </div>

              {/* Visibility */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="visible"
                  checked={formData.visible}
                  onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="visible" className="text-sm font-medium">
                  Make this holding visible to the public
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Adding...' : 'Add Holding'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
