'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { Plus, Edit, Trash2, X } from 'lucide-react';

interface Holding {
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
}

export default function HoldingsPage() {
  const { data: session } = useSession();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchHoldings();
  }, []);

  const fetchHoldings = async () => {
    try {
      const response = await fetch('/api/holdings');
      const data = await response.json();
      setHoldings(data);
    } catch (error) {
      console.error('Failed to fetch holdings:', error);
    } finally {
      setLoading(false);
    }
  };

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
        fetchHoldings();
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
        setHoldings(holdings.filter((h) => h.id !== id));
        alert('Holding deleted successfully!');
      } else {
        alert('Failed to delete holding');
      }
    } catch (error) {
      console.error('Error deleting holding:', error);
      alert('Failed to delete holding');
    }
  };

  const totalValue = holdings.reduce((sum, h) => {
    return sum + (h.costBasis ? h.quantity * h.costBasis : 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading holdings...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Portfolio Holdings</h1>
            <p className="text-muted-foreground">
              {holdings.length} positions • Est. Total: ${totalValue.toLocaleString()}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Holding
            </Button>
          )}
        </div>

        {/* Holdings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Active Positions</CardTitle>
            <CardDescription>All current portfolio holdings</CardDescription>
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
                      <th className="pb-3 font-semibold">Asset Type</th>
                      <th className="pb-3 font-semibold text-right">Quantity</th>
                      <th className="pb-3 font-semibold text-right">Cost Basis</th>
                      <th className="pb-3 font-semibold text-right">Total Cost</th>
                      <th className="pb-3 font-semibold">Sector</th>
                      <th className="pb-3 font-semibold">Entry Date</th>
                      <th className="pb-3 font-semibold">Visibility</th>
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
                          {holding.costBasis ? `$${holding.costBasis.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-4 text-right font-semibold">
                          {holding.costBasis
                            ? `$${(holding.quantity * holding.costBasis).toLocaleString()}`
                            : '-'}
                        </td>
                        <td className="py-4">{holding.sector || '-'}</td>
                        <td className="py-4">
                          {new Date(holding.entryDate).toLocaleDateString()}
                        </td>
                        <td className="py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              holding.visible
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {holding.visible ? 'Public' : 'Private'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleDelete(holding.id)}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
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
              <CardTitle>Portfolio Breakdown</CardTitle>
              <CardDescription>Distribution by asset type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from(new Set(holdings.map((h) => h.assetType))).map((type) => {
                  const typeHoldings = holdings.filter((h) => h.assetType === type);
                  const typeValue = typeHoldings.reduce(
                    (sum, h) => sum + (h.costBasis ? h.quantity * h.costBasis : 0),
                    0
                  );
                  const percentage = totalValue > 0 ? (typeValue / totalValue) * 100 : 0;

                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{type}</span>
                        <span className="text-primary font-semibold">
                          {percentage.toFixed(1)}% (${typeValue.toLocaleString()})
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
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
