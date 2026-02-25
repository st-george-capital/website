'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { X, Info } from 'lucide-react';
import { EXCHANGES } from '@/lib/exchange';
import { formatCurrency } from '@/lib/utils';

type TradeMode = 'BUY' | 'SELL' | 'IMPORT';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTradeComplete: () => void;
  existingTickers: string[];
  cashBalance: number;
}

const MODE_DESCRIPTIONS: Record<TradeMode, string> = {
  BUY: 'Purchase shares — deducts from cash balance, creates or adds to an existing position.',
  SELL: 'Sell shares — adds to cash balance, reduces or closes a position. Realized P&L is calculated automatically.',
  IMPORT: 'Import an existing position without affecting cash. Use this to set up your portfolio with positions acquired outside this system.',
};

export function TradeModal({
  isOpen,
  onClose,
  onTradeComplete,
  existingTickers,
  cashBalance,
}: TradeModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<TradeMode>('BUY');
  const [formData, setFormData] = useState({
    ticker: '',
    quantity: '',
    price: '',
    date: new Date().toISOString().split('T')[0],
    exchange: 'US',
    assetType: 'Equity',
    sector: '',
    region: '',
    strategyTag: '',
    notes: '',
  });

  if (!isOpen) return null;

  const quantity = parseFloat(formData.quantity) || 0;
  const price = parseFloat(formData.price) || 0;
  const totalCost = quantity * price;

  const cashImpact = mode === 'BUY' ? -totalCost : mode === 'SELL' ? totalCost : 0;
  const cashAfter = cashBalance + cashImpact;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (mode === 'IMPORT') {
        // Import uses the holdings API directly — no cash impact, no trade record
        const res = await fetch('/api/holdings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticker: formData.ticker.toUpperCase(),
            assetType: formData.assetType,
            quantity: parseFloat(formData.quantity),
            costBasis: formData.price ? parseFloat(formData.price) : null,
            entryDate: formData.date,
            exchange: formData.exchange,
            sector: formData.sector || null,
            region: formData.region || null,
            strategyTag: formData.strategyTag || null,
            notes: formData.notes || null,
            visible: true,
          }),
        });

        if (res.ok) {
          onTradeComplete();
          handleClose();
        } else {
          const data = await res.json();
          setError(data.error || 'Failed to import position');
        }
      } else {
        // BUY or SELL uses the trades API — affects cash, creates audit trail
        const res = await fetch('/api/trades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticker: formData.ticker.toUpperCase(),
            action: mode,
            quantity: parseFloat(formData.quantity),
            price: parseFloat(formData.price),
            date: formData.date,
            exchange: formData.exchange,
            assetType: formData.assetType,
            sector: formData.sector || null,
            region: formData.region || null,
            strategyTag: formData.strategyTag || null,
            notes: formData.notes || null,
          }),
        });

        if (res.ok) {
          onTradeComplete();
          handleClose();
        } else {
          const data = await res.json();
          setError(data.error || 'Failed to execute trade');
        }
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
    setError(null);
    setFormData({
      ticker: '',
      quantity: '',
      price: '',
      date: new Date().toISOString().split('T')[0],
      exchange: 'US',
      assetType: 'Equity',
      sector: '',
      region: '',
      strategyTag: '',
      notes: '',
    });
    setMode('BUY');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {mode === 'IMPORT' ? 'Import Position' : 'Record Trade'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Mode Selector */}
          <div>
            <label className="block text-sm font-medium mb-2">What do you want to do?</label>
            <div className="flex gap-2">
              {(['BUY', 'SELL', 'IMPORT'] as TradeMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                    mode === m
                      ? m === 'BUY'
                        ? 'bg-green-600 text-white'
                        : m === 'SELL'
                          ? 'bg-red-600 text-white'
                          : 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m === 'IMPORT' ? 'Import' : m}
                </button>
              ))}
            </div>
            <div className="flex items-start gap-2 mt-2 p-2.5 bg-gray-50 rounded-lg">
              <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-500">{MODE_DESCRIPTIONS[mode]}</p>
            </div>
          </div>

          {/* Ticker & Exchange */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Ticker *</label>
              <input
                type="text"
                value={formData.ticker}
                onChange={(e) =>
                  setFormData({ ...formData, ticker: e.target.value.toUpperCase() })
                }
                required
                list="existing-tickers"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="AAPL"
              />
              <datalist id="existing-tickers">
                {existingTickers.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Exchange</label>
              <select
                value={formData.exchange}
                onChange={(e) =>
                  setFormData({ ...formData, exchange: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {EXCHANGES.map((ex) => (
                  <option key={ex.value} value={ex.value}>
                    {ex.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {mode === 'IMPORT' ? 'Shares Held *' : 'Quantity *'}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {mode === 'IMPORT' ? 'Avg Cost Basis *' : 'Price per Share *'}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="150.00"
              />
            </div>
          </div>

          {/* Date & Asset Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {mode === 'IMPORT' ? 'Original Entry Date' : 'Trade Date *'}
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {mode !== 'SELL' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Asset Type
                </label>
                <select
                  value={formData.assetType}
                  onChange={(e) =>
                    setFormData({ ...formData, assetType: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Equity">Equity</option>
                  <option value="ETF">ETF</option>
                  <option value="Commodity">Commodity</option>
                  <option value="Crypto">Crypto</option>
                </select>
              </div>
            )}
          </div>

          {/* Sector & Region — only for BUY/IMPORT of new tickers */}
          {mode !== 'SELL' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Sector</label>
                <input
                  type="text"
                  value={formData.sector}
                  onChange={(e) =>
                    setFormData({ ...formData, sector: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Technology"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Region</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) =>
                    setFormData({ ...formData, region: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="North America"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={
                mode === 'IMPORT'
                  ? 'e.g., Position migrated from previous system'
                  : 'Trade rationale...'
              }
            />
          </div>

          {/* Trade Summary */}
          {quantity > 0 && price > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {mode === 'IMPORT' ? 'Position Value' : 'Total Cost'}
                </span>
                <span className="font-semibold">{formatCurrency(totalCost)}</span>
              </div>
              {mode !== 'IMPORT' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cash Before</span>
                    <span className="font-medium">{formatCurrency(cashBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cash Impact</span>
                    <span
                      className={`font-medium ${
                        cashImpact > 0 ? 'text-green-600' : cashImpact < 0 ? 'text-red-600' : ''
                      }`}
                    >
                      {cashImpact >= 0 ? '+' : ''}{formatCurrency(cashImpact)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Cash After</span>
                    <span
                      className={`font-bold ${
                        cashAfter < 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(cashAfter)}
                    </span>
                  </div>
                  {mode === 'BUY' && cashAfter < 0 && (
                    <p className="text-red-600 text-xs mt-1">
                      Insufficient cash for this trade
                    </p>
                  )}
                </>
              )}
              {mode === 'IMPORT' && (
                <p className="text-blue-600 text-xs mt-1">
                  This import will not affect your cash balance.
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                saving ||
                (mode === 'BUY' && cashAfter < 0)
              }
              className={
                mode === 'BUY'
                  ? 'bg-green-600 hover:bg-green-700'
                  : mode === 'SELL'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
              }
            >
              {saving
                ? 'Processing...'
                : mode === 'IMPORT'
                  ? `Import ${formData.ticker || 'Position'}`
                  : `${mode} ${formData.ticker || 'Stock'}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
