'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { LineChart, Camera, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface Snapshot {
  date: string;
  portfolioValue: number;
  stocksValue: number;
  cashBalance: number;
}

interface BenchmarkPoint {
  date: string;
  close: number;
}

interface PortfolioChartProps {
  isAdmin: boolean;
  refreshKey: number;
}

export function PortfolioChart({ isAdmin, refreshKey }: PortfolioChartProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [benchmark, setBenchmark] = useState<BenchmarkPoint[]>([]);
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [showPercent, setShowPercent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [takingSnapshot, setTakingSnapshot] = useState(false);
  const [days, setDays] = useState(90);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/portfolio/snapshots?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots);
      }
    } catch (error) {
      console.error('Failed to fetch snapshots:', error);
    } finally {
      setLoading(false);
    }
  }, [days]);

  const fetchBenchmark = useCallback(async () => {
    try {
      const res = await fetch(`/api/portfolio/benchmark?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setBenchmark(data.benchmark);
      }
    } catch (error) {
      console.error('Failed to fetch benchmark:', error);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  useEffect(() => {
    if (showBenchmark && benchmark.length === 0) {
      fetchBenchmark();
    }
  }, [showBenchmark, benchmark.length, fetchBenchmark]);

  const handleTakeSnapshot = async () => {
    setTakingSnapshot(true);
    try {
      const res = await fetch('/api/portfolio/snapshots', { method: 'POST' });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to take snapshot:', error);
    } finally {
      setTakingSnapshot(false);
    }
  };

  // Build chart data by merging snapshots with benchmark
  const chartData = snapshots.map((s) => {
    const dateStr =
      typeof s.date === 'string'
        ? s.date.split('T')[0]
        : new Date(s.date).toISOString().split('T')[0];

    const baseValue = snapshots.length > 0 ? snapshots[0].portfolioValue : 1;
    const portfolioPercent =
      baseValue > 0
        ? ((s.portfolioValue - baseValue) / baseValue) * 100
        : 0;

    const point: Record<string, string | number> = {
      date: dateStr,
      portfolio: showPercent ? parseFloat(portfolioPercent.toFixed(2)) : s.portfolioValue,
    };

    if (showBenchmark) {
      const benchPoint = benchmark.find((b) => b.date === dateStr);
      if (benchPoint) {
        const baseBench = benchmark.length > 0 ? benchmark[0].close : 1;
        const benchPercent =
          baseBench > 0
            ? ((benchPoint.close - baseBench) / baseBench) * 100
            : 0;
        point.spy = showPercent ? parseFloat(benchPercent.toFixed(2)) : benchPoint.close;
      }
    }

    return point;
  });

  const formatYAxis = (value: number) => {
    if (showPercent) return `${value.toFixed(1)}%`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatTooltipValue = (value: number) => {
    if (showPercent) return `${value.toFixed(2)}%`;
    return formatCurrency(value);
  };

  return (
    <Card hover={false}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <LineChart className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle>Portfolio Value Over Time</CardTitle>
              <CardDescription>
                {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} recorded
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
            </select>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showPercent}
                onChange={(e) => setShowPercent(e.target.checked)}
                className="w-4 h-4"
              />
              % Change
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showBenchmark}
                onChange={(e) => setShowBenchmark(e.target.checked)}
                className="w-4 h-4"
              />
              SPY Benchmark
            </label>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTakeSnapshot}
                disabled={takingSnapshot}
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                <Camera className={`w-4 h-4 mr-1 ${takingSnapshot ? 'animate-pulse' : ''}`} />
                Snapshot
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <TrendingUp className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-muted-foreground mb-2">
              No snapshots yet.
            </p>
            {isAdmin && (
              <p className="text-sm text-muted-foreground">
                Click &quot;Snapshot&quot; to start tracking portfolio value over time.
              </p>
            )}
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(d: string) => {
                    const date = new Date(d);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatYAxis}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatTooltipValue(value),
                    name === 'portfolio' ? 'Portfolio' : 'SPY',
                  ]}
                  labelFormatter={(label: string) =>
                    new Date(label).toLocaleDateString()
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="portfolio"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  name="Portfolio"
                />
                {showBenchmark && (
                  <Line
                    type="monotone"
                    dataKey="spy"
                    stroke="#9ca3af"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="SPY"
                  />
                )}
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
