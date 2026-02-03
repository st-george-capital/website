'use client';

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface ValuationBridgeProps {
  pvForecastFCF: number;
  pvTerminalValue: number;
  enterpriseValue: number;
  netDebt: number;
  equityValue: number;
}

export function ValuationBridge({ pvForecastFCF, pvTerminalValue, enterpriseValue, netDebt, equityValue }: ValuationBridgeProps) {
  const data = [
    { name: 'PV of Forecast FCF', value: pvForecastFCF / 1e9, display: `$${(pvForecastFCF / 1e9).toFixed(1)}B` },
    { name: 'PV of Terminal Value', value: pvTerminalValue / 1e9, display: `$${(pvTerminalValue / 1e9).toFixed(1)}B` },
    { name: 'Enterprise Value', value: enterpriseValue / 1e9, display: `$${(enterpriseValue / 1e9).toFixed(1)}B` },
    { name: 'Less: Net Debt', value: -(netDebt / 1e9), display: `-$${(netDebt / 1e9).toFixed(1)}B` },
    { name: 'Equity Value', value: equityValue / 1e9, display: `$${(equityValue / 1e9).toFixed(1)}B` },
  ];

  const colors = ['#3b82f6', '#60a5fa', '#1e40af', '#ef4444', '#10b981'];

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
}

export function RevenueGrowthChart({ years, growthRates, terminalGrowth }: RevenueGrowthChartProps) {
  const data = years.map((year, i) => ({
    year: `Year ${year}`,
    growth: (growthRates[i] * 100).toFixed(1),
    terminalGrowth: (terminalGrowth * 100).toFixed(1),
  }));

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
}

export function EBITMarginChart({ years, margins }: EBITMarginChartProps) {
  const data = years.map((year, i) => ({
    year: `Year ${year}`,
    margin: (margins[i] * 100).toFixed(1),
  }));

  const avgMargin = margins.reduce((sum, m) => sum + m, 0) / margins.length * 100;

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
}

export function SensitivityTable({ baseWACC, baseTerminalGrowth, baseValue, calculateValue }: SensitivityTableProps) {
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
