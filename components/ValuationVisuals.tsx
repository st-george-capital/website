'use client';


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
  const maxValue = Math.max(0, ...data.map(item => item.value));
  const minValue = Math.min(0, ...data.map(item => item.value));
  const span = Math.max(maxValue - minValue, .1);
  const toY = (value: number) => topPad + (maxValue - value) / span * chartHeight;
  const slot = (width - leftPad - rightPad) / Math.max(data.length, 1);
  const barWidth = slot * .55;

  return (
    <div className="report-figure research-figure">
      <div className="report-subhead">{title}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full h-auto" role="img" aria-label={title}>
        <line x1={leftPad} y1={height - bottomPad} x2={width - rightPad} y2={height - bottomPad} stroke="#cbd5e1" strokeWidth="1" />
        <line x1={leftPad} y1={topPad} x2={leftPad} y2={height - bottomPad} stroke="#cbd5e1" strokeWidth="1" />
        {Array.from({ length: 3 }).map((_, index) => {
          const y = topPad + (chartHeight / 2) * index;
          return <line key={index} x1={leftPad} y1={y} x2={width - rightPad} y2={y} stroke="#e5eaf1" />;
        })}
        {data.map((item, index) => {
          const x = leftPad + index * slot + (slot - barWidth) / 2;
          const barHeight = Math.abs(toY(item.value) - toY(0));
          const y = Math.min(toY(item.value), toY(0));
          return (
            <g key={item.label}>
              <rect x={x} y={y} width={barWidth} height={barHeight} fill={color} rx="2" />
              <text x={x + barWidth / 2} y={item.value < 0 ? toY(item.value) + 12 : y - 6} textAnchor="middle" fontSize="12" fill="#0f172a" fontFamily="Helvetica, Arial, sans-serif">
                {item.value.toFixed(1)}%
              </text>
              <text x={x + barWidth / 2} y={height - 22} textAnchor="middle" fontSize="11" fill="#475569" fontFamily="Helvetica, Arial, sans-serif">
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="report-caption">{subtitle}</div>
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
  const padding = Math.max((Math.max(...values) - Math.min(...values)) * .15, .5);
  const minValue = Math.min(...values) - padding;
  const maxValue = Math.max(...values) + padding;
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
    <div className="report-figure research-figure">
      <div className="report-subhead">{title}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full h-auto" role="img" aria-label={title}>
        <line x1={leftPad} y1={height - bottomPad} x2={width - rightPad} y2={height - bottomPad} stroke="#cbd5e1" strokeWidth="1" />
        <line x1={leftPad} y1={topPad} x2={leftPad} y2={height - bottomPad} stroke="#cbd5e1" strokeWidth="1" />
        {Array.from({ length: 4 }).map((_, index) => {
          const y = topPad + (plotHeight / 3) * index;
          const value = maxValue - (range / 3) * index;
          return (
            <g key={index}>
              <line x1={leftPad} y1={y} x2={width - rightPad} y2={y} stroke="#e5eaf1" />
              <text x={leftPad - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#64748b" fontFamily="Helvetica, Arial, sans-serif">
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
            {index === primaryPoints.length - 1 && <text x={point.x} y={point.y - 10} textAnchor="end" fontSize="12" fill={seriesColor}>{data[index].primary.toFixed(1)}%</text>}
            <text x={point.x} y={height - 20} textAnchor="middle" fontSize="11" fill="#475569" fontFamily="Helvetica, Arial, sans-serif">
              {data[index].label}
            </text>
          </g>
        ))}
      </svg>
      <div className="report-caption">{subtitle}</div>
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

  const colors = ['#7189aa', '#a2b1c5', '#172f50', '#9b6570', '#1e3a8a'];

  const steps = [
    { label: 'Forecast FCF', start: 0, end: pvForecastFCF / 1e9 },
    { label: 'Terminal value', start: pvForecastFCF / 1e9, end: enterpriseValue / 1e9 },
    { label: 'Enterprise value', start: 0, end: enterpriseValue / 1e9 },
    { label: netDebt < 0 ? 'Net cash' : 'Net debt', start: enterpriseValue / 1e9, end: equityValue / 1e9 },
    { label: 'Equity value', start: 0, end: equityValue / 1e9 },
  ];
  const low = Math.min(0, ...steps.flatMap(step => [step.start, step.end]));
  const high = Math.max(0, ...steps.flatMap(step => [step.start, step.end]));
  const span = Math.max(high - low, 1);
  const y = (value: number) => 224 - ((value - low) / span) * 166;
  return (
    <figure className="research-figure bg-white p-6 border">
      <figcaption className="mb-5"><h3>Enterprise to equity value</h3><p className="text-xs text-slate-500 mt-1">Discounted cash flow contributions · $bn</p></figcaption>
      <svg viewBox="0 0 760 290" className="w-full" role="img" aria-label="Valuation waterfall, in billions of dollars">
        {[0, 1, 2, 3].map(index => {
          const value = low + span * index / 3;
          return <g key={index}><line x1="60" x2="744" y1={y(value)} y2={y(value)} stroke="#e5eaf0" /><text x="48" y={y(value) + 4} textAnchor="end" fontSize="11" fill="#64748b">{value.toFixed(1)}</text></g>;
        })}
        {steps.map((step, index) => {
          const x = 82 + index * 134;
          const value = index === 1 ? pvTerminalValue / 1e9 : index === 3 ? -netDebt / 1e9 : step.end;
          return <g key={step.label}>
            <rect x={x} y={Math.min(y(step.start), y(step.end))} width="78" height={Math.max(Math.abs(y(step.end) - y(step.start)), 1)} fill={colors[index]} />
            {index < 4 && <line x1={x + 78} x2={x + 134} y1={y(step.end)} y2={y(step.end)} stroke="#a2b1c5" strokeDasharray="3 3" />}
            <text x={x + 39} y={Math.min(y(step.start), y(step.end)) - 10} textAnchor="middle" fontSize="12" fill="#172f50">{formatBillions(value)}</text>
            <text x={x + 39} y="252" textAnchor="middle" fontSize="11" fill="#475569">{step.label}</text>
          </g>;
        })}
      </svg>
    </figure>
  );
}

interface RevenueGrowthChartProps {
  years: number[];
  growthRates: number[];
  terminalGrowth: number;
  variant?: VisualVariant;
}

export function RevenueGrowthChart({ years, growthRates, terminalGrowth }: RevenueGrowthChartProps) {
  return <DocumentLineFigure
    title="Revenue growth / forecast"
    subtitle={`Solid: forecast growth. Dashed: terminal assumption (${(terminalGrowth * 100).toFixed(1)}%).`}
    data={years.map((year, i) => ({ label: `Y${year}`, primary: growthRates[i] * 100, secondary: terminalGrowth * 100 }))}
    seriesColor="#214a79" terminalColor="#a2b1c5"
  />;
}

interface EBITMarginChartProps {
  years: number[];
  margins: number[];
  variant?: VisualVariant;
}

export function EBITMarginChart({ years, margins }: EBITMarginChartProps) {
  return <DocumentBarFigure title="Operating margin / forecast"
    subtitle="EBIT as a percentage of revenue across the forecast period."
    data={years.map((year, i) => ({ label: `Y${year}`, value: margins[i] * 100 }))}
    color="#7189aa"
  />;
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
    if (diff > 15) return 'bg-blue-100 text-slate-900';
    if (diff > 5) return 'bg-blue-50 text-slate-900';
    if (diff < -15) return 'bg-slate-200 text-slate-900';
    if (diff < -5) return 'bg-slate-100 text-slate-900';
    return 'bg-slate-50 text-slate-900';
  };

  if (variant === 'document') {
    return (
      <div className="report-figure research-figure">
        <div className="report-subhead">Sensitivity Analysis</div>
        <div className="mt-4 overflow-hidden">
          <table className="w-full table-fixed border-collapse font-sans text-[10px] text-slate-900">
            <colgroup>
              <col style={{ width: '18%' }} />
              {growthRange.map((g) => (
                <col key={g} style={{ width: '16.4%' }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="border-y border-slate-300 bg-slate-50 px-2 py-2 text-left text-[9px] font-semibold uppercase text-slate-600">WACC / Growth</th>
                {growthRange.map((g) => (
                  <th key={g} className="border-y border-slate-300 bg-slate-50 px-2 py-2 text-center text-[9px] font-semibold uppercase text-slate-600">
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
                    <td className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-center font-semibold">
                      {(testWACC * 100).toFixed(2)}%
                    </td>
                    {growthRange.map((g) => {
                      const testGrowth = baseTerminalGrowth + g;
                      const value = calculateValue(testWACC, testGrowth);
                      const isBase = w === 0 && g === 0;
                      return (
                        <td
                          key={g}
                          className={`border-b border-slate-200 px-2 py-2 text-center font-medium ${
                            isBase ? 'bg-[#0b1f3a] text-white' : getColor(value)
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
        <p className="report-caption">Figure 5. Equity value per share across WACC and terminal growth assumptions (base case: ${baseValue.toFixed(2)}). The shaded center cell marks the base case.</p>
      </div>
    );
  }

  return (
    <div className="research-figure bg-white p-6 border">
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
                          isBase ? 'bg-[#172f50] text-white font-bold' : getColor(value)
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
