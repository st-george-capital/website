'use client';

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

type VisualVariant = 'default' | 'document';

interface ValuationBridgeProps {
  pvForecastFCF: number;
  pvTerminalValue: number;
  enterpriseValue: number;
  netDebt: number;
  equityValue: number;
  variant?: VisualVariant;
}

function formatBillions(value: number) {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(1)}B`;
}

function DocumentBarFigure({
  title,
  subtitle,
  data,
  color,
}: {
  title: string;
  subtitle: string;
  data: Array<{ label: string; value: number }>;
  color: string;
}) {
  const width = 560;
  const height = 180;
  const leftPad = 42;
  const rightPad = 12;
  const topPad = 18;
  const bottomPad = 44;
  const chartHeight = height - topPad - bottomPad;
  const maxValue = Math.max(...data.map((item) => Math.max(0, item.value)), 0.1);
  const barWidth = Math.max(26, Math.floor((width - leftPad - rightPad) / Math.max(data.length, 1) - 14));
  const gap = 14;

  return (
    <div className="border border-slate-300 bg-white p-4">
      <div className="font-sans text-[10px] font-semibold uppercase text-slate-500">{title}</div>
      <div className="mt-1 text-[11px] text-slate-600">{subtitle}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full h-auto" role="img" aria-label={title}>
        <line x1={leftPad} y1={height - bottomPad} x2={width - rightPad} y2={height - bottomPad} stroke="#cbd5e1" strokeWidth="1" />
        <line x1={leftPad} y1={topPad} x2={leftPad} y2={height - bottomPad} stroke="#cbd5e1" strokeWidth="1" />
        {data.map((item, index) => {
          const x = leftPad + index * (barWidth + gap) + gap;
          const barHeight = (Math.max(0, item.value) / maxValue) * chartHeight;
          const y = height - bottomPad - barHeight;
          return (
            <g key={item.label}>
              <rect x={x} y={y} width={barWidth} height={barHeight} fill={color} rx="2" />
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="10" fill="#0f172a" fontFamily="Helvetica, Arial, sans-serif">
                {item.value.toFixed(1)}%
              </text>
              <text x={x + barWidth / 2} y={height - 22} textAnchor="middle" fontSize="9" fill="#475569" fontFamily="Helvetica, Arial, sans-serif">
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DocumentLineFigure({
  title,
  subtitle,
  data,
  seriesColor,
  terminalColor,
}: {
  title: string;
  subtitle: string;
  data: Array<{ label: string; primary: number; secondary?: number }>;
  seriesColor: string;
  terminalColor?: string;
}) {
  const width = 560;
  const height = 220;
  const leftPad = 42;
  const rightPad = 14;
  const topPad = 18;
  const bottomPad = 42;
  const values = data.flatMap((item) => [item.primary, item.secondary].filter((value): value is number => typeof value === 'number'));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(maxValue - minValue, 1);
  const plotWidth = width - leftPad - rightPad;
  const plotHeight = height - topPad - bottomPad;
  const toPoint = (value: number, index: number) => {
    const x = leftPad + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
    const y = topPad + ((maxValue - value) / range) * plotHeight;
    return { x, y };
  };
  const primaryPoints = data.map((item, index) => toPoint(item.primary, index));
  const secondaryPoints = data.map((item, index) => item.secondary == null ? null : toPoint(item.secondary, index));

  return (
    <div className="border border-slate-300 bg-white p-4">
      <div className="font-sans text-[10px] font-semibold uppercase text-slate-500">{title}</div>
      <div className="mt-1 text-[11px] text-slate-600">{subtitle}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full h-auto" role="img" aria-label={title}>
        <line x1={leftPad} y1={height - bottomPad} x2={width - rightPad} y2={height - bottomPad} stroke="#cbd5e1" strokeWidth="1" />
        <line x1={leftPad} y1={topPad} x2={leftPad} y2={height - bottomPad} stroke="#cbd5e1" strokeWidth="1" />
        {Array.from({ length: 4 }).map((_, index) => {
          const y = topPad + (plotHeight / 3) * index;
          const value = maxValue - (range / 3) * index;
          return (
            <g key={index}>
              <line x1={leftPad} y1={y} x2={width - rightPad} y2={y} stroke="#e2e8f0" strokeDasharray="3 4" />
              <text x={leftPad - 8} y={y + 4} textAnchor="end" fontSize="9" fill="#64748b" fontFamily="Helvetica, Arial, sans-serif">
                {value.toFixed(1)}%
              </text>
            </g>
          );
        })}
        <polyline
          fill="none"
          stroke={seriesColor}
          strokeWidth="2.5"
          points={primaryPoints.map((point) => `${point.x},${point.y}`).join(' ')}
        />
        {terminalColor && secondaryPoints.every(Boolean) && (
          <polyline
            fill="none"
            stroke={terminalColor}
            strokeWidth="1.8"
            strokeDasharray="5 4"
            points={secondaryPoints.map((point) => `${point!.x},${point!.y}`).join(' ')}
          />
        )}
        {primaryPoints.map((point, index) => (
          <g key={data[index].label}>
            <circle cx={point.x} cy={point.y} r="3.5" fill={seriesColor} />
            <text x={point.x} y={height - 20} textAnchor="middle" fontSize="9" fill="#475569" fontFamily="Helvetica, Arial, sans-serif">
              {data[index].label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function ValuationBridge({ pvForecastFCF, pvTerminalValue, enterpriseValue, netDebt, equityValue, variant = 'default' }: ValuationBridgeProps) {
  const data = [
    { name: 'PV of Forecast FCF', value: pvForecastFCF / 1e9, display: `$${(pvForecastFCF / 1e9).toFixed(1)}B` },
    { name: 'PV of Terminal Value', value: pvTerminalValue / 1e9, display: `$${(pvTerminalValue / 1e9).toFixed(1)}B` },
    { name: 'Enterprise Value', value: enterpriseValue / 1e9, display: `$${(enterpriseValue / 1e9).toFixed(1)}B` },
    { name: 'Less: Net Debt', value: -(netDebt / 1e9), display: `-$${(netDebt / 1e9).toFixed(1)}B` },
    { name: 'Equity Value', value: equityValue / 1e9, display: `$${(equityValue / 1e9).toFixed(1)}B` },
  ];

  const colors = ['#3b82f6', '#60a5fa', '#1e40af', '#ef4444', '#10b981'];

  if (variant === 'document') {
    return (
      <div className="avoid-break border border-slate-300 bg-white p-5">
        <div className="font-sans text-[10px] font-semibold uppercase text-slate-500">Valuation Bridge</div>
        <div className="mt-1 text-[11px] text-slate-600">Figure 2. Bridge from forecast free cash flow to equity value.</div>
        <div className="mt-4 space-y-2">
          {data.map((item, index) => (
            <div key={item.name} className="grid grid-cols-[1.6fr_0.7fr_2.1fr] items-center gap-3">
              <div className="font-sans text-[10px] text-slate-700">{item.name}</div>
              <div className={`font-sans text-[11px] font-semibold ${item.value < 0 ? 'text-red-700' : 'text-slate-900'}`}>
                {formatBillions(item.value)}
              </div>
              <div className="h-3 bg-slate-100">
                <div
                  className="h-3"
                  style={{
                    width: `${Math.max((Math.abs(item.value) / Math.max(...data.map((entry) => Math.abs(entry.value)))) * 100, 6)}%`,
                    backgroundColor: colors[index],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="font-bold text-lg mb-4 text-gray-900">Valuation Bridge</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" height={80} />
          <YAxis tick={{ fontSize: 12 }} label={{ value: 'Value ($B)', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value) => `$${Number(value).toFixed(1)}B`} />
          <Bar dataKey="value" label={{ position: 'top', formatter: (value: number) => `$${value.toFixed(1)}B` }}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface RevenueGrowthChartProps {
  years: number[];
  growthRates: number[];
  terminalGrowth: number;
  variant?: VisualVariant;
}

export function RevenueGrowthChart({ years, growthRates, terminalGrowth, variant = 'default' }: RevenueGrowthChartProps) {
  const data = years.map((year, i) => ({
    year: `Year ${year}`,
    growth: (growthRates[i] * 100).toFixed(1),
    terminalGrowth: (terminalGrowth * 100).toFixed(1),
  }));

  if (variant === 'document') {
    const figureData = years.map((year, index) => ({
      label: `Y${year}`,
      primary: growthRates[index] * 100,
      secondary: terminalGrowth * 100,
    }));

    return (
      <DocumentLineFigure
        title="Revenue Growth Trajectory"
        subtitle={`Figure 3. Growth moderates from ${(growthRates[0] * 100).toFixed(1)}% to ${(growthRates[growthRates.length - 1] * 100).toFixed(1)}% and converges toward the ${(terminalGrowth * 100).toFixed(1)}% terminal rate.`}
        data={figureData}
        seriesColor="#1d4ed8"
        terminalColor="#94a3b8"
      />
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="font-bold text-lg mb-4 text-gray-900">Revenue Growth Trajectory</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} label={{ value: 'Growth Rate (%)', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
          <Line type="monotone" dataKey="growth" stroke="#3b82f6" strokeWidth={3} name="Forecast Growth" dot={{ r: 5 }} />
          <Line type="monotone" dataKey="terminalGrowth" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Terminal Growth" />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-600 mt-2">
        Growth moderates from {(growthRates[0] * 100).toFixed(1)}% to {(growthRates[growthRates.length - 1] * 100).toFixed(1)}% as company matures, converging to long-term {(terminalGrowth * 100).toFixed(1)}% terminal rate.
      </p>
    </div>
  );
}

interface EBITMarginChartProps {
  years: number[];
  margins: number[];
  variant?: VisualVariant;
}

export function EBITMarginChart({ years, margins, variant = 'default' }: EBITMarginChartProps) {
  const data = years.map((year, i) => ({
    year: `Year ${year}`,
    margin: (margins[i] * 100).toFixed(1),
  }));

  const avgMargin = margins.reduce((sum, m) => sum + m, 0) / margins.length * 100;

  if (variant === 'document') {
    const figureData = years.map((year, index) => ({
      label: `Y${year}`,
      value: margins[index] * 100,
    }));

    return (
      <DocumentBarFigure
        title="EBIT Margin Forecast"
        subtitle={`Figure 4. EBIT margin averages ${avgMargin.toFixed(1)}% across the forecast period.`}
        data={figureData}
        color="#0f766e"
      />
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="font-bold text-lg mb-4 text-gray-900">EBIT Margin Forecast</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} label={{ value: 'EBIT Margin (%)', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value) => `${value}%`} />
          <Bar dataKey="margin" fill="#10b981" label={{ position: 'top', formatter: (value: number) => `${value}%` }} />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-600 mt-2">
        EBIT margins average {avgMargin.toFixed(1)}% across forecast period, reflecting {margins[0] === margins[margins.length - 1] ? 'stable' : 'expanding'} operational efficiency.
      </p>
    </div>
  );
}

interface SensitivityTableProps {
  baseWACC: number;
  baseTerminalGrowth: number;
  baseValue: number;
  calculateValue: (wacc: number, termGrowth: number) => number;
  variant?: VisualVariant;
}

export function SensitivityTable({ baseWACC, baseTerminalGrowth, baseValue, calculateValue, variant = 'default' }: SensitivityTableProps) {
  const waccRange = [-0.01, -0.005, 0, 0.005, 0.01];
  const growthRange = [-0.01, -0.005, 0, 0.005, 0.01];

  const getColor = (value: number) => {
    const diff = (value / baseValue - 1) * 100;
    if (diff > 15) return 'bg-green-100 text-green-900';
    if (diff > 5) return 'bg-green-50 text-green-800';
    if (diff < -15) return 'bg-red-100 text-red-900';
    if (diff < -5) return 'bg-red-50 text-red-800';
    return 'bg-blue-50 text-blue-900';
  };

  if (variant === 'document') {
    return (
      <div className="avoid-break border border-slate-300 bg-white p-5">
        <div className="font-sans text-[10px] font-semibold uppercase text-slate-500">Sensitivity Analysis</div>
        <p className="mt-1 text-[11px] text-slate-600">
          Figure 5. Equity value per share across WACC and terminal growth assumptions (base case: ${baseValue.toFixed(2)}).
        </p>
        <div className="mt-4 overflow-hidden border border-slate-300">
          <table className="w-full table-fixed border-collapse font-sans text-[10px] text-slate-900">
            <colgroup>
              <col style={{ width: '18%' }} />
              {growthRange.map((g) => (
                <col key={g} style={{ width: '16.4%' }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="border border-slate-300 bg-slate-100 px-2 py-2 text-left text-[9px] font-semibold uppercase text-slate-600">WACC / Growth</th>
                {growthRange.map((g) => (
                  <th key={g} className="border border-slate-300 bg-slate-50 px-2 py-2 text-center text-[9px] font-semibold uppercase text-slate-600">
                    {((baseTerminalGrowth + g) * 100).toFixed(1)}%
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {waccRange.map((w) => {
                const testWACC = baseWACC + w;
                return (
                  <tr key={w}>
                    <td className="border border-slate-300 bg-slate-50 px-2 py-2 text-center font-semibold">
                      {(testWACC * 100).toFixed(2)}%
                    </td>
                    {growthRange.map((g) => {
                      const testGrowth = baseTerminalGrowth + g;
                      const value = calculateValue(testWACC, testGrowth);
                      const isBase = w === 0 && g === 0;
                      return (
                        <td
                          key={g}
                          className={`border border-slate-300 px-2 py-2 text-center font-medium ${
                            isBase ? 'bg-slate-900 text-white' : getColor(value)
                          }`}
                        >
                          ${value.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[9px] text-slate-500">
          The shaded center cell marks the base case. Adjacent cells frame reasonable upside and downside from discount-rate and terminal-growth changes.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="font-bold text-lg mb-4 text-gray-900">Sensitivity Analysis: Intrinsic Value per Share</h3>
      <p className="text-sm text-gray-600 mb-4">
        Impact of changes in WACC and terminal growth rate on valuation (base case: ${baseValue.toFixed(2)})
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 px-3 py-2 bg-gray-100 text-left font-semibold">WACC ↓ / Growth →</th>
              {growthRange.map((g) => (
                <th key={g} className="border border-gray-300 px-3 py-2 bg-blue-50 text-center font-semibold">
                  {((baseTerminalGrowth + g) * 100).toFixed(1)}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {waccRange.map((w) => {
              const testWACC = baseWACC + w;
              return (
                <tr key={w}>
                  <td className="border border-gray-300 px-3 py-2 bg-blue-50 font-semibold text-center">
                    {(testWACC * 100).toFixed(2)}%
                  </td>
                  {growthRange.map((g) => {
                    const testGrowth = baseTerminalGrowth + g;
                    const value = calculateValue(testWACC, testGrowth);
                    const isBase = w === 0 && g === 0;
                    return (
                      <td
                        key={g}
                        className={`border border-gray-300 px-3 py-2 text-center font-medium ${
                          isBase ? 'bg-blue-100 text-blue-900 font-bold' : getColor(value)
                        }`}
                      >
                        ${value.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-600 mt-3">
        <span className="font-semibold">Blue cell</span> indicates base case valuation. 
        <span className="text-green-700 ml-2">Green</span> = upside scenarios, 
        <span className="text-red-700 ml-2">Red</span> = downside scenarios.
      </p>
    </div>
  );
}
