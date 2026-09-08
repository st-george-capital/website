type Point = { date: string; close: number };
export function ResearchPriceChart({ points }: { points: Point[] }) {
  const data = points.filter(p => Number.isFinite(p.close) && Number.isFinite(Date.parse(p.date))).sort((a,b) => Date.parse(a.date) - Date.parse(b.date)).slice(-252);
  if (!data.length) return <p className="text-sm text-slate-500">Price history is unavailable.</p>;
  const first = data[0], last = data[data.length - 1];
  const low = Math.min(...data.map(p => p.close)), high = Math.max(...data.map(p => p.close));
  const pad = Math.max((high - low) * .15, 1), min = low - pad, max = high + pad;
  const x = (p: Point) => 60 + (Date.parse(p.date) - Date.parse(first.date)) / Math.max(Date.parse(last.date) - Date.parse(first.date), 1) * 648;
  const y = (value: number) => 236 - (value - min) / (max - min) * 196;
  const date = (value: string) => new Date(value).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  const ticks = Array.from(new Set([0, Math.floor((data.length - 1) / 3), Math.floor((data.length - 1) * 2 / 3), data.length - 1]));
  return (
    <svg viewBox="0 0 800 286" className="research-price-chart" role="img" aria-label={`Closing share price in dollars from ${date(first.date)} to ${date(last.date)}. Latest close $${last.close.toFixed(2)}.`} style={{ width: '100%', height: 'auto', background: '#fff', fontFamily: 'Arial, sans-serif' }}>
      <text x="60" y="18" fill="#64748b" fontSize="10" letterSpacing="1.2">CLOSING PRICE / $</text>
      {[0,1,2,3,4].map(i => { const value = min + (max - min) * i / 4; return <g key={i}><line x1="60" x2="708" y1={y(value)} y2={y(value)} stroke="#e5eaf1" /><text x="48" y={y(value) + 4} textAnchor="end" fontSize="11" fill="#64748b">{value.toFixed(1)}</text></g>; })}
      <polyline points={data.map(p => `${x(p)},${y(p.close)}`).join(' ')} fill="none" stroke="#214a79" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(last.close)} r="3" fill="#214a79" />
      <line x1={x(last) + 5} x2="722" y1={y(last.close)} y2={y(last.close)} stroke="#214a79" />
      <text x="730" y={y(last.close) + 4} fill="#172f50" fontSize="12" fontWeight="600">{last.close.toFixed(2)}</text>
      {ticks.map(i => <text key={i} x={x(data[i])} y="264" textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fill="#64748b" fontSize="11">{date(data[i].date)}</text>)}
    </svg>
  );
}
