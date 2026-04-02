import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarketSnapshotReport {
  priceDate?: string | null;
  fiftyTwoWeekRange?: string | null;
  marketCap?: number | null;
  sharesOutstanding?: number | null;
  fiscalYearEnd?: string | null;
  priceTargetEndDate?: string | null;
  dataSource?: string | null;
  peRatio?: number | null;
  forwardPE?: number | null;
  forwardPEConsensus?: number | null;
  dividendYield?: number | null;
  priceChartImageUrl?: string | null;
  showPriceChart?: boolean;
  priceHistory?: Array<{ date: string; close: number }> | null;
  epsTableMarkdown?: string | null;
  dcfInputs?: any;
}

interface PricePoint {
  date: string;
  close: number;
}

function formatCompactCurrencyFromMillions(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}tn`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}bn`;
  return `$${value.toFixed(0)}m`;
}

function formatCompactSharesFromMillions(value: number) {
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}bn`;
  return `${value.toFixed(1)}m`;
}

function formatChartDate(value?: string) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return value ?? '';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function parseFiftyTwoWeekRange(range?: string | null) {
  if (!range) return null;
  const matches = range.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) return null;
  const low = Number(matches[0]);
  const high = Number(matches[1]);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  return { low, high };
}

function parseEpsMarkdownTable(content?: string | null) {
  if (!content) return [];

  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const dataLines = lines.filter((line) => line.startsWith('|'));
  if (dataLines.length < 3) return [];

  return dataLines
    .slice(2)
    .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean))
    .filter((cells) => cells.length >= 2)
    .map((cells) => ({
      quarter: cells[0],
      eps: cells[1],
    }))
    .filter((row) => row.quarter && row.eps);
}

function SnapshotMetric({
  label,
  value,
  sublabel,
  accentClassName = 'text-slate-950',
}: {
  label: string;
  value: string;
  sublabel?: string | null;
  accentClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-2 text-xl font-bold ${accentClassName}`}>{value}</div>
      {sublabel ? <div className="mt-1 text-xs text-slate-500">{sublabel}</div> : null}
    </div>
  );
}

export function ResearchMarketSnapshotSection({ report }: { report: MarketSnapshotReport }) {
  const hasEPS = !!report.epsTableMarkdown;
  const chartData = ((report.priceHistory || report.dcfInputs?.priceHistory || []) as PricePoint[]).slice(0, 100);
  const hasChart = report.showPriceChart !== false && (chartData.length > 0 || !!report.priceChartImageUrl);
  const epsRows = parseEpsMarkdownTable(report.epsTableMarkdown).slice(0, 8);
  const leftRows = epsRows.slice(0, Math.ceil(epsRows.length / 2));
  const rightRows = epsRows.slice(Math.ceil(epsRows.length / 2));
  const rowCount = Math.max(leftRows.length, rightRows.length);
  const range = parseFiftyTwoWeekRange(report.fiftyTwoWeekRange);

  const prices = chartData.map((point: PricePoint) => point.close);
  const startPrice = chartData[0]?.close ?? null;
  const endPrice = chartData[chartData.length - 1]?.close ?? null;
  const absoluteHigh = prices.length ? Math.max(...prices, range?.high ?? Number.NEGATIVE_INFINITY) : (range?.high ?? null);
  const absoluteLow = prices.length ? Math.min(...prices, range?.low ?? Number.POSITIVE_INFINITY) : (range?.low ?? null);
  const minPrice = absoluteLow ?? 0;
  const maxPrice = absoluteHigh ?? 1;
  const paddedRange = Math.max((maxPrice - minPrice) * 1.18, 1);
  const paddedMin = Math.max(0, minPrice - paddedRange * 0.08);
  const paddedMax = paddedMin + paddedRange;
  const toY = (price: number) => 210 - ((price - paddedMin) / Math.max(paddedMax - paddedMin, 1)) * 170;
  const priceChange = startPrice && endPrice ? ((endPrice - startPrice) / startPrice) * 100 : null;
  const gridMarkers = [0, 1, 2, 3].map((index) => paddedMin + ((paddedMax - paddedMin) / 3) * index);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {report.priceDate ? <SnapshotMetric label="Date of Price" value={report.priceDate} /> : null}
        {report.fiftyTwoWeekRange ? <SnapshotMetric label="52-Week Range" value={report.fiftyTwoWeekRange} /> : null}
        {report.marketCap != null ? <SnapshotMetric label="Market Cap" value={formatCompactCurrencyFromMillions(report.marketCap)} sublabel="Converted from report market-cap inputs" /> : null}
        {report.fiscalYearEnd ? <SnapshotMetric label="Fiscal Year End" value={report.fiscalYearEnd} /> : null}
        {report.sharesOutstanding != null ? <SnapshotMetric label="Shares O/S" value={formatCompactSharesFromMillions(report.sharesOutstanding)} sublabel="Shares outstanding" /> : null}
        {report.peRatio != null || report.dcfInputs?.peRatio != null ? (
          <SnapshotMetric label="P/E Ratio" value={`${(report.peRatio ?? report.dcfInputs?.peRatio).toFixed(2)}x`} />
        ) : null}
        {report.forwardPE != null || report.dcfInputs?.forwardPE != null ? (
          <SnapshotMetric
            label="Forward P/E (DCF)"
            value={`${(report.forwardPE ?? report.dcfInputs?.forwardPE).toFixed(2)}x`}
            sublabel="Our projection"
            accentClassName="text-blue-700"
          />
        ) : null}
        {report.forwardPEConsensus != null ? (
          <SnapshotMetric
            label="Forward P/E (Consensus)"
            value={`${report.forwardPEConsensus.toFixed(2)}x`}
            sublabel="Analyst estimates"
            accentClassName="text-violet-700"
          />
        ) : null}
        {report.dividendYield != null ? (
          <SnapshotMetric label="Dividend Yield" value={`${report.dividendYield.toFixed(2)}%`} />
        ) : null}
        {report.priceTargetEndDate ? <SnapshotMetric label="Price Target End Date" value={report.priceTargetEndDate} /> : null}
      </div>

      {report.dataSource ? (
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Source: {report.dataSource}</p>
      ) : null}

      {(hasEPS || hasChart) && (
        <div className="grid gap-5 xl:grid-cols-[0.84fr_1.16fr]">
          {hasEPS && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="border-b border-slate-200 pb-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Recent EPS Trend</div>
                <h3 className="mt-2 text-2xl font-bold text-slate-950">Recent Reported EPS</h3>
              </div>

              {epsRows.length ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full table-fixed text-sm">
                    <colgroup>
                      <col style={{ width: '26%' }} />
                      <col style={{ width: '24%' }} />
                      <col style={{ width: '26%' }} />
                      <col style={{ width: '24%' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Quarter</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">EPS</th>
                        <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Quarter</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">EPS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: rowCount }).map((_, index) => {
                        const left = leftRows[index];
                        const right = rightRows[index];
                        return (
                          <tr key={index} className="border-t border-slate-100">
                            <td className="px-3 py-2.5 font-medium text-slate-700">{left?.quarter ?? ''}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-slate-950">{left?.eps ?? ''}</td>
                            <td className="px-3 py-2.5 font-medium text-slate-700">{right?.quarter ?? ''}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-slate-950">{right?.eps ?? ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-4 prose prose-sm max-w-none text-slate-700 [&_table]:w-full [&_table]:border-collapse [&_table]:rounded-lg [&_th]:border-b [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.12em] [&_th]:text-slate-500 [&_td]:border-b [&_td]:border-slate-100 [&_td]:px-3 [&_td]:py-2.5">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {report.epsTableMarkdown!}
                  </ReactMarkdown>
                </div>
              )}

              <div className="mt-3 text-xs text-slate-500">
                Compact trailing earnings exhibit aligned to the report’s market context.
              </div>
            </section>
          )}

          {hasChart && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="border-b border-slate-200 pb-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Price Performance</div>
                <h3 className="mt-2 text-2xl font-bold text-slate-950">Recent Share Price Trend</h3>
              </div>

              {report.priceChartImageUrl && !chartData.length ? (
                <img src={report.priceChartImageUrl} alt="Price Chart" className="mt-4 w-full rounded-xl border border-slate-200" />
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Start</div>
                      <div className="mt-1 text-lg font-bold text-slate-900">{startPrice != null ? `$${startPrice.toFixed(2)}` : '—'}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">End</div>
                      <div className="mt-1 text-lg font-bold text-slate-900">{endPrice != null ? `$${endPrice.toFixed(2)}` : '—'}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Period Move</div>
                      <div className={`mt-1 text-lg font-bold ${priceChange != null && priceChange >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {priceChange != null ? `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%` : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <svg viewBox="0 0 840 280" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                      {chartData.length ? (
                        <>
                          {gridMarkers.map((marker, index) => {
                            const y = toY(marker);
                            return (
                              <g key={index}>
                                <line x1="54" y1={y} x2="808" y2={y} stroke="#dbe4f0" strokeWidth="1" />
                                <text x="44" y={y + 4} textAnchor="end" fontSize="11" fill="#64748b">
                                  ${marker.toFixed(0)}
                                </text>
                              </g>
                            );
                          })}
                          {range?.high != null && (
                            <>
                              <line x1="54" y1={toY(range.high)} x2="808" y2={toY(range.high)} stroke="#cbd5e1" strokeDasharray="5 5" />
                              <text x="808" y={toY(range.high) - 8} textAnchor="end" fontSize="11" fill="#475569">52W High ${range.high.toFixed(2)}</text>
                            </>
                          )}
                          {range?.low != null && (
                            <>
                              <line x1="54" y1={toY(range.low)} x2="808" y2={toY(range.low)} stroke="#cbd5e1" strokeDasharray="5 5" />
                              <text x="808" y={toY(range.low) - 8} textAnchor="end" fontSize="11" fill="#475569">52W Low ${range.low.toFixed(2)}</text>
                            </>
                          )}
                          {(() => {
                            const points = chartData.map((point: PricePoint, index: number) => {
                              const x = (chartData.length > 1 ? index / (chartData.length - 1) : 0) * 754 + 54;
                              return `${x},${toY(point.close)}`;
                            }).join(' ');
                            const areaPoints = `${points} 808,228 54,228`;

                            return (
                              <>
                                <polygon points={areaPoints} fill="rgba(15, 23, 42, 0.06)" />
                                <polyline
                                  points={points}
                                  fill="none"
                                  stroke="#0f172a"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle cx="54" cy={toY(startPrice || 0)} r="4" fill="#0f172a" />
                                <circle cx="808" cy={toY(endPrice || 0)} r="4" fill="#0f172a" />
                              </>
                            );
                          })()}
                          <text x="54" y="248" textAnchor="start" fontSize="11" fill="#64748b">
                            {formatChartDate(chartData[0]?.date)}
                          </text>
                          <text x="808" y="248" textAnchor="end" fontSize="11" fill="#64748b">
                            {formatChartDate(chartData[chartData.length - 1]?.date)}
                          </text>
                        </>
                      ) : null}
                    </svg>
                  </div>
                </>
              )}

              <div className="mt-3 text-xs text-slate-500">
                Institutional-style price exhibit using the report’s saved trading history and range inputs.
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
