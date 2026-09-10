const number = (v: number, digits = 2) => Number.isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }) : '—';

export function ScenarioRange({ bear, base, bull, current, currency }: { bear: number; base: number; bull: number; current: number; currency: string }) {
  const rows = [{ label: 'Bear case', value: bear }, { label: 'Base case', value: base }, { label: 'Bull case', value: bull }];
  const values = [bear, base, bull, current].filter(Number.isFinite);
  const low = Math.min(...values), high = Math.max(...values);
  const pad = Math.max((high - low) * .12, Math.abs(high) * .02, 1);
  const position = (value: number) => Number.isFinite(value) ? ((value - low + pad) / (high - low + 2 * pad)) * 100 : 50;
  return <div className="dcf-scenario-range">
    <div className="dcf-figure-caption"><span>Implied value per share · {currency}</span><span>Market price <strong>{number(current)}</strong></span></div>
    {rows.map(({ label, value }) => <div className="dcf-range-row" key={label}>
      <span>{label}</span><div className="dcf-range-track"><span className="dcf-range-connector" style={{ left: `${Math.min(position(value), position(current))}%`, width: `${Math.abs(position(value) - position(current))}%` }}/><span className="dcf-market-marker" style={{ left: `${position(current)}%` }}/><span className={`dcf-range-marker ${label === 'Base case' ? 'is-base' : ''}`} style={{ left: `${position(value)}%` }}/></div><strong>{number(value)}</strong>
    </div>)}
    <div className="dcf-figure-footnote">Solid markers: scenario value · Dashed reference: current market price</div>
  </div>;
}

type BridgeInputs = { currency: string; totalDebt: number; cashEquivalents: number; preferredEquity: number; minorityInterest: number; nonOperatingAssets: number };
type BridgeOutputs = { pvOfFcff: number; pvOfTerminalValue: number; enterpriseValue: number; equityValue: number; intrinsicValuePerShare: number };
export function DCFDriverBridge({ inputs, outputs }: { inputs: BridgeInputs; outputs: BridgeOutputs }) {
  const steps = [
    { label: 'Forecast cash flows', value: outputs.pvOfFcff },
    { label: 'Terminal value', value: outputs.pvOfTerminalValue },
    { label: 'Enterprise value', value: outputs.enterpriseValue, total: true },
    { label: inputs.totalDebt >= inputs.cashEquivalents ? 'Less: net debt' : 'Add: net cash', value: inputs.cashEquivalents - inputs.totalDebt },
    ...[{ label: 'Preferred equity', value: -inputs.preferredEquity }, { label: 'Minority interest', value: -inputs.minorityInterest }, { label: 'Non-operating assets', value: inputs.nonOperatingAssets }].filter(s => s.value !== 0),
    { label: 'Equity value', value: outputs.equityValue, total: true },
  ];
  let running = 0;
  const bars = steps.map(s => { const start = s.total ? 0 : running; running = s.total ? s.value : running + s.value; return { ...s, start, end: running }; });
  const points = bars.flatMap(b => [b.start, b.end]).filter(Number.isFinite);
  const min = Math.min(0, ...points), max = Math.max(0, ...points);
  const position = (v: number) => 100 * (v - min) / (max - min || 1);
  return <div className="dcf-driver-bridge">
    <div className="dcf-bridge-heading"><div><span className="dcf-figure-caption">Present value · {inputs.currency} millions</span><p>From operating assets to shareholder value</p></div><div className="dcf-bridge-result"><span>Intrinsic value / share</span><strong>{number(outputs.intrinsicValuePerShare)} <small>{inputs.currency}</small></strong></div></div>
    <div className="dcf-bridge-waterfall" role="figure" aria-label="Valuation bridge in millions">
      <div className="dcf-bridge-columns"><span>Value component</span><span>Contribution to value</span><span>{inputs.currency} M</span></div>
      {bars.map(b => <div key={b.label} className={`dcf-bridge-row ${b.total ? 'is-total' : ''}`}>
        <span className="dcf-bridge-label">{b.label}</span>
        <div className="dcf-bridge-track" aria-hidden="true">
          <span className="dcf-bridge-zero" style={{ left: `${position(0)}%` }}/>
          <span className={`dcf-bridge-bar ${b.value < 0 ? 'is-deduction' : ''}`} style={{ left: `${Math.min(position(b.start), position(b.end))}%`, width: `${Math.abs(position(b.end) - position(b.start))}%` }}/>
        </div>
        <strong>{!b.total && b.value > 0 ? '+' : ''}{number(b.value / 1e6, 1)}</strong>
      </div>)}
    </div>
    <div className="dcf-figure-footnote">Blue bars add value; pale bars deduct value. Navy bars show totals. Forecast cash flows + terminal value = enterprise value; financing adjustments then give equity value.</div>
    {outputs.enterpriseValue > 0 && outputs.pvOfTerminalValue / outputs.enterpriseValue > .7 && <p className="dcf-figure-footnote"><strong>Terminal value concentration:</strong> {number(outputs.pvOfTerminalValue / outputs.enterpriseValue * 100, 1)}% of enterprise value. Review the long-term assumptions alongside the explicit forecast.</p>}
  </div>;
}
