import { ResearchPriceChart } from './ResearchPriceChart';
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
  const normalized = range.replace(/[–—]/g, '-');
  const explicitMatch = normalized.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);

  let low: number;
  let high: number;

  if (explicitMatch) {
    low = Number(explicitMatch[1]);
    high = Number(explicitMatch[2]);
  } else {
    const matches = normalized.match(/\d+(?:\.\d+)?/g);
    if (!matches || matches.length < 2) return null;
    low = Number(matches[0]);
    high = Number(matches[1]);
  }

  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  return { low, high };
}

function normalizeChartData(points: PricePoint[]) {
  return [...points]
    .filter((point) => point?.date && Number.isFinite(new Date(point.date).getTime()) && Number.isFinite(point?.close))
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    .slice(-252);
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
    <div className="snapshot-metric border-b border-slate-200 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-2 text-xl font-medium ${accentClassName}`}>{value}</div>
      {sublabel ? <div className="mt-1 text-xs text-slate-500">{sublabel}</div> : null}
    </div>
  );
}

export function ResearchMarketSnapshotSection({ report }: { report: MarketSnapshotReport }) {
  const hasEPS = !!report.epsTableMarkdown;
  const chartData = normalizeChartData((report.priceHistory || report.dcfInputs?.priceHistory || []) as PricePoint[]);
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
    <div className="research-snapshot research-sheet space-y-6">
      <div className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
        {report.priceDate ? <SnapshotMetric label="Date of Price" value={report.priceDate} /> : null}
        {report.fiftyTwoWeekRange ? <SnapshotMetric label="52-Week Range" value={report.fiftyTwoWeekRange} /> : null}
        {report.marketCap != null ? <SnapshotMetric label="Market Cap" value={formatCompactCurrencyFromMillions(report.marketCap)} /> : null}
        {report.fiscalYearEnd ? <SnapshotMetric label="Fiscal Year End" value={report.fiscalYearEnd} /> : null}
        {report.sharesOutstanding != null ? <SnapshotMetric label="Shares O/S" value={formatCompactSharesFromMillions(report.sharesOutstanding)} /> : null}
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
            accentClassName="text-slate-700"
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
        <div className="grid gap-8">
          {hasEPS && (
            <section className="border-t border-slate-300 bg-white pt-5">
              <div className="border-b border-slate-200 pb-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Recent EPS Trend</div>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">Recent Reported EPS</h3>
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
            </section>
          )}

          {hasChart && (
            <section className="border-t border-slate-300 bg-white pt-5">
              <div className="border-b border-slate-200 pb-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Price Performance</div>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">Share price performance</h3>
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

                  <div className="mt-5 bg-white">
                    <ResearchPriceChart points={chartData} />
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
