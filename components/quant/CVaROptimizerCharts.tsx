'use client';

// Chart subcomponents for the CVaR Optimizer tool page's Results tab (Section 9 of the
// plan). Split out from the page per the plan's file-summary note ("Chart subcomponents
// for the Results tab ... if it gets large"). recharts only — the sole charting lib in
// this repo (see app/dashboard/tools/dcf/page.tsx's DCFCharts and
// components/portfolio/PortfolioChart.tsx for the conventions this mirrors).

import { chartTheme, chartTooltipStyle } from '@/lib/chart-theme';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';

const SLATE = chartTheme.secondary;
const NAVY = chartTheme.primary;
const AMBER = chartTheme.secondary;
const EMERALD = chartTheme.positive;
const ROSE = chartTheme.negative;

function pct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
}

// ── Target vs Current weights bar chart ─────────────────────────────────────────────

export interface WeightComparisonRow {
  ticker: string;
  current: number;
  target: number;
}

export function WeightComparisonChart({ data }: { data: WeightComparisonRow[] }) {
  const chartData = data.map((d) => ({ ...d, current: d.current * 100, target: d.target * 100 }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 28)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid stroke={chartTheme.grid} horizontal={false} />
        <XAxis axisLine={false} tickLine={false} type="number" unit="%" tick={{ fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} type="category" dataKey="ticker" width={64} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v.toFixed(2)}%`} />
        <Legend />
        <Bar dataKey="current" name="Current Weight" fill={SLATE} radius={[0, 3, 3, 0]} />
        <Bar dataKey="target" name="Target Weight" fill={NAVY} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Factor exposure comparison bar chart ────────────────────────────────────────────

export interface FactorComparisonRow {
  factor: string;
  portfolio: number | null;
}

export function FactorExposureChart({ data }: { data: FactorComparisonRow[] }) {
  const chartData = data.map((d) => ({ factor: d.factor, portfolio: d.portfolio ?? 0, missing: d.portfolio === null }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid stroke={chartTheme.grid} vertical={false} />
        <XAxis axisLine={false} tickLine={false} dataKey="factor" tick={{ fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} label={{ value: 'Weighted z-score', angle: -90, position: 'insideLeft', fontSize: 10 }} />
        <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => v.toFixed(3)} />
        <Bar dataKey="portfolio" name="Portfolio-level factor exposure" radius={[3, 3, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.portfolio >= 0 ? EMERALD : ROSE} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Sector / region allocation pie chart ────────────────────────────────────────────

export function AllocationPieChart({ data, title }: { data: Record<string, number>; title: string }) {
  const chartData = Object.entries(data)
    .filter(([, v]) => v > 0.0001)
    .map(([name, value]) => ({ name, value: value * 100 }))
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return <div className="text-sm text-muted-foreground py-8 text-center">No {title.toLowerCase()} data yet.</div>;
  }

  return (
    <div className="allocation-bars" role="img" aria-label={`${title} allocation`}>
      {chartData.map(row => <div className="allocation-bar-row" key={row.name}>
        <div><span>{row.name}</span><strong>{row.value.toFixed(1)}%</strong></div>
        <div className="allocation-bar-track"><span style={{ width: `${row.value}%`, background: chartTheme.primary }} /></div>
      </div>)}
    </div>
  );
}

// ── CVaR comparison (portfolio vs benchmark) ────────────────────────────────────────

export function CVaRComparisonChart({ portfolioCVaR, benchmarkCVaR }: { portfolioCVaR: number | null; benchmarkCVaR: number | null }) {
  const data = [
    { name: 'Target Portfolio', cvar: portfolioCVaR !== null ? portfolioCVaR * 100 : 0, missing: portfolioCVaR === null },
    { name: 'URTH (MSCI World proxy)', cvar: benchmarkCVaR !== null ? benchmarkCVaR * 100 : 0, missing: benchmarkCVaR === null },
  ];
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid stroke={chartTheme.grid} horizontal={false} />
        <XAxis axisLine={false} tickLine={false} type="number" unit="%" tick={{ fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v.toFixed(2)}%`} />
        <Bar dataKey="cvar" name="CVaR (95%, 20d horizon)" radius={[0, 3, 3, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={i === 0 ? NAVY : SLATE} fillOpacity={entry.missing ? 0.3 : 1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Stress test results bar chart ───────────────────────────────────────────────────

export interface StressTestChartRow {
  label: string;
  portfolio: number | null;
  benchmark: number | null;
}

export function StressTestChart({ data }: { data: StressTestChartRow[] }) {
  const chartData = data.map((d) => ({
    label: d.label,
    portfolio: d.portfolio !== null ? d.portfolio * 100 : null,
    benchmark: d.benchmark !== null ? d.benchmark * 100 : null,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid stroke={chartTheme.grid} vertical={false} />
        <XAxis axisLine={false} tickLine={false} dataKey="label" tick={{ fontSize: 10 }} />
        <YAxis axisLine={false} tickLine={false} unit="%" tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v.toFixed(2)}%`} />
        <Legend />
        <Bar dataKey="portfolio" name="Target Portfolio" fill={NAVY} radius={[3, 3, 0, 0]} />
        <Bar dataKey="benchmark" name="URTH" fill={AMBER} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export { pct };
