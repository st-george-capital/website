'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Trade {
  id: string;
  ticker: string;
  type: string;
  quantity: number;
  price: number;
  date: string;
  exchange: string;
  notes: string | null;
  positionBefore: number;
  positionAfter: number;
  cashBefore: number;
  cashAfter: number;
  realizedPnL: number | null;
  avgCostAtTrade: number | null;
}

interface TradeHistoryProps {
  refreshKey: number;
}

export function TradeHistory({ refreshKey }: TradeHistoryProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch(`/api/trades?page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setTrades(data.trades);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades, refreshKey]);

  if (loading) {
    return (
      <Card hover={false}>
        <CardContent className="p-5">
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card hover={false}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <History className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <CardTitle>Trade History</CardTitle>
            <CardDescription>
              {total} total trade{total !== 1 ? 's' : ''} recorded
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No trades recorded yet. Use &quot;Record Trade&quot; to log buy/sell
              transactions.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Ticker</th>
                    <th className="pb-3 font-semibold">Action</th>
                    <th className="pb-3 font-semibold text-right">Qty</th>
                    <th className="pb-3 font-semibold text-right">Price</th>
                    <th className="pb-3 font-semibold text-right">Total</th>
                    <th className="pb-3 font-semibold text-right">Cash After</th>
                    <th className="pb-3 font-semibold text-right">Realized P&L</th>
                    <th className="pb-3 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade.id} className="border-b border-border">
                      <td className="py-3 text-sm">
                        {new Date(trade.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 font-bold">{trade.ticker}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            trade.type === 'BUY'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {trade.type}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {trade.quantity.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        {formatCurrency(trade.price)}
                      </td>
                      <td className="py-3 text-right font-medium">
                        {formatCurrency(trade.quantity * trade.price)}
                      </td>
                      <td className="py-3 text-right">
                        {formatCurrency(trade.cashAfter)}
                      </td>
                      <td className="py-3 text-right">
                        {trade.realizedPnL !== null ? (
                          <span
                            className={`font-medium ${
                              trade.realizedPnL >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(trade.realizedPnL)}
                          </span>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                      <td className="py-3 text-sm text-gray-500 max-w-[150px] truncate">
                        {trade.notes || '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
