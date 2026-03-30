import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { InstitutionalValuationSection } from '@/components/InstitutionalValuationSection';
import sgcLogo from '@/images/exec team/logo/sgc_logo.png';

export interface ResearchExportReport {
  id: string;
  companyName: string;
  ticker: string;
  exchange: string;
  sector: string;
  industry: string;
  reportDate: string;
  analysts: string[];
  coverageStatus: string;
  recommendation: string;
  currentPrice: number;
  targetPrice: number;
  impliedUpside: number;
  timeHorizon: string;
  currency: string;
  priceDate?: string | null;
  fiftyTwoWeekRange?: string | null;
  marketCap?: number | null;
  sharesOutstanding?: number | null;
  fiscalYearEnd?: string | null;
  priceTargetEndDate?: string | null;
  performanceMetrics?: {
    absYTD?: number; abs1m?: number; abs3m?: number; abs12m?: number;
    relYTD?: number; rel1m?: number; rel3m?: number; rel12m?: number;
  } | null;
  epsTableMarkdown?: string | null;
  dataSource?: string | null;
  peRatio?: number | null;
  forwardPE?: number | null;
  forwardPEConsensus?: number | null;
  dividendYield?: number | null;
  priceChartImageUrl?: string | null;
  showPriceChart?: boolean;
  priceHistory?: Array<{ date: string; close: number }> | null;
  dcfInputs?: any;
  dcfOutputs?: any;
  investmentThesis: Array<{
    title?: string;
    claim: string;
    driver: string;
    mispricing: string;
  }>;
  concludingSection?: string | null;
  businessModel: string;
  unitEconomics?: string;
  economicMoat?: string;
  industryAnalysis: string;
  competitivePosition?: { source: string; rows: any[]; updatedAt: string } | null;
  catalystsNearTerm: Array<{
    event: string;
    mechanism: string;
    probability: string;
    timeframe: string;
  }>;
  catalystsMediumTerm: Array<{
    event: string;
    mechanism: string;
    probability: string;
    timeframe: string;
  }>;
  valuationAnalysis: string;
  bearCase: string;
  bullCase?: string | null;
  bullBearJustification?: string | null;
  aiStrategies?: string | null;
  keyRisks: Array<{
    title: string;
    description: string;
    impact: string;
    mitigation: string;
  }>;
  esgFactors?: string;
  published: boolean;
  status: string;
}

const PDF_MARKDOWN_CLASSNAME = 'report-markdown';

const EXPORT_DOCUMENT_STYLES = `
  @media print {
    @page {
      size: letter;
      margin: 0.75in 0.75in 0.85in;
    }

    body {
      background: #ffffff !important;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    nav,
    button {
      display: none !important;
    }

    .pdf-doc {
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .pdf-doc .page-break {
      break-before: page;
      page-break-before: always;
    }

    .pdf-doc .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .pdf-doc h2,
    .pdf-doc h3,
    .pdf-doc .keep-with-next {
      break-after: avoid;
      page-break-after: avoid;
    }
  }

  .pdf-doc {
    font-family: Georgia, "Times New Roman", serif;
  }

  .pdf-doc .report-sans {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  }

  .pdf-doc .report-kicker {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 8.8px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #64748b;
  }

  .pdf-doc .report-section-title {
    margin-bottom: 14px;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.35;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #0b1f3a;
  }

  .pdf-doc .report-section-label {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.35;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #0b1f3a;
  }

  .pdf-doc .report-subhead {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #475569;
  }

  .pdf-doc .report-subsection-title {
    display: block;
    margin-bottom: 12px;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.35;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: #0b1f3a;
  }

  .pdf-doc .report-lead {
    font-size: 11.6px;
    line-height: 1.85;
    color: #1e293b;
  }

  .pdf-doc .report-meta-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10.5px;
    color: #0f172a;
  }

  .pdf-doc .report-meta-table td {
    padding: 8px 14px 8px 0;
    vertical-align: top;
    border-bottom: 1px solid #e2e8f0;
  }

  .pdf-doc .report-meta-table td:last-child {
    padding-right: 0;
  }

  .pdf-doc .report-meta-label {
    display: block;
    margin-bottom: 3px;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    color: #64748b;
  }

  .pdf-doc .report-meta-value {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: #0f172a;
  }

  .pdf-doc .report-stat-strip {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
    border-top: 1px solid #cbd5e1;
    border-bottom: 1px solid #cbd5e1;
    padding: 12px 0;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  }

  .pdf-doc .report-stat {
    min-width: 0;
  }

  .pdf-doc .report-stat-label {
    display: block;
    margin-bottom: 4px;
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #64748b;
  }

  .pdf-doc .report-stat-value {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
  }

  .pdf-doc .report-two-col {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 22px;
    align-items: start;
  }

  .pdf-doc .report-valuation-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.28fr) minmax(0, 0.92fr);
    gap: 22px;
    align-items: start;
  }

  .pdf-doc .report-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10.5px;
    color: #0f172a;
  }

  .pdf-doc .report-table th {
    border-top: 1px solid #cbd5e1;
    border-bottom: 1px solid #cbd5e1;
    background: #f8fafc;
    padding: 7px 10px;
    text-align: left;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    color: #475569;
  }

  .pdf-doc .report-table td {
    border-bottom: 1px solid #e2e8f0;
    padding: 7px 10px;
    vertical-align: top;
  }

  .pdf-doc .report-table thead {
    display: table-header-group;
  }

  .pdf-doc .report-table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .pdf-doc .report-table .num {
    text-align: right;
    white-space: nowrap;
  }

  .pdf-doc .report-caption {
    margin-top: 8px;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 9px;
    color: #64748b;
  }

  .pdf-doc .report-figure {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .pdf-doc .report-rule {
    height: 1px;
    background: #cbd5e1;
  }

  .pdf-doc .report-markdown {
    font-size: 11.15px;
    line-height: 1.8;
    color: #1f2937;
  }

  .pdf-doc .report-markdown h2,
  .pdf-doc .report-markdown h3,
  .pdf-doc .report-markdown h4 {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #0b1f3a;
    break-after: avoid;
    page-break-after: avoid;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .pdf-doc .report-markdown h2 {
    margin: 24px 0 12px;
    font-size: 13px;
    line-height: 1.35;
    font-weight: 700;
  }

  .pdf-doc .report-markdown h3 {
    margin: 22px 0 11px;
    font-size: 13px;
    line-height: 1.35;
    font-weight: 700;
  }

  .pdf-doc .report-markdown h4 {
    margin: 18px 0 10px;
    font-size: 11px;
    font-weight: 700;
    color: #0b1f3a;
  }

  .pdf-doc .report-markdown p {
    margin: 10px 0;
    padding-left: 6px;
    color: #1f2937;
  }

  .pdf-doc .report-markdown strong {
    color: #020617;
  }

  .pdf-doc .report-markdown ul,
  .pdf-doc .report-markdown ol {
    margin: 10px 0 10px 22px;
    padding-left: 0;
  }

  .pdf-doc .report-markdown ul {
    list-style: disc;
  }

  .pdf-doc .report-markdown ol {
    list-style: decimal;
  }

  .pdf-doc .report-markdown li {
    margin: 6px 0;
    padding-left: 2px;
  }

  .pdf-doc .report-markdown li::marker {
    color: #334155;
  }

  .pdf-doc .report-markdown table {
    width: 100%;
    margin: 16px 0;
    border-collapse: collapse;
    table-layout: fixed;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10.5px;
    color: #0f172a;
  }

  .pdf-doc .report-markdown thead {
    border-top: 1px solid #cbd5e1;
    border-bottom: 1px solid #cbd5e1;
  }

  .pdf-doc .report-markdown th {
    border-bottom: 1px solid #cbd5e1;
    background: #f8fafc;
    padding: 8px 10px;
    text-align: left;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    color: #475569;
  }

  .pdf-doc .report-markdown td {
    border-bottom: 1px solid #e2e8f0;
    padding: 8px 10px;
    vertical-align: top;
  }

  .pdf-doc .report-markdown blockquote {
    margin: 14px 0;
    border-left: 2px solid #cbd5e1;
    padding-left: 14px;
    color: #475569;
  }

  .pdf-doc .report-markdown img {
    display: block;
    max-width: 100%;
    margin: 16px auto;
    border-radius: 4px;
  }
`;

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="report-section-label mb-3">
      {children}
    </div>
  );
}

function SummaryMetricRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <>
      <span className="report-meta-label">{label}</span>
      <span className="report-meta-value">{value}</span>
    </>
  );
}

function formatPercent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatMoney(value: number, digits = 2) {
  return `$${value.toFixed(digits)}`;
}

function hasAnyTimeframe(
  catalysts: Array<{ timeframe?: string | null }>
) {
  return catalysts.some((catalyst) => Boolean(catalyst.timeframe?.trim()));
}

function formatChartDate(value?: string) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return value ?? '';
  return parsed.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
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

function PdfSection({
  number,
  title,
  children,
  pageBreak = false,
}: {
  number: string;
  title: string;
  children: ReactNode;
  pageBreak?: boolean;
}) {
  return (
    <section className={`${pageBreak ? 'page-break' : ''} report-section pt-6`}>
      <div className="report-rule mb-5" />
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <h2 className="report-section-title font-serif">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function PdfMarkdown({ content }: { content?: string | null }) {
  if (!content) {
    return <p className="text-[11.5px] text-slate-500">Not provided.</p>;
  }

  return (
    <div className={PDF_MARKDOWN_CLASSNAME}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {normalizeStructuredSectionMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}

function normalizeStructuredSectionMarkdown(content?: string | null) {
  if (!content) return '';

  const cleanedContent = content
    .replace(/Adjust narrative and add justification below\.?/gi, '')
    .replace(/\n{3,}/g, '\n\n');

  const lines = cleanedContent.split('\n');
  let inCodeFence = false;
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence;
      output.push(line);
      continue;
    }

    if (!trimmed || inCodeFence) {
      output.push(line);
      continue;
    }

    const normalizedListLine = trimmed
      .replace(/^[•●◦▪▪‣]\s*/, '- ')
      .replace(/^(\d+)\)\s+/, '$1. ');

    if (/^(#{1,6}\s|\* |- |\d+\. |\| |>)/.test(normalizedListLine)) {
      const prevOutput = output[output.length - 1]?.trim() ?? '';
      if (prevOutput && !/^(#{1,6}\s|\* |- |\d+\. |\| |>)/.test(prevOutput)) {
        output.push('');
      }
      output.push(normalizedListLine);
      continue;
    }

    if (trimmed.endsWith(':')) {
      output.push(line);
      continue;
    }

    const prev = lines[index - 1]?.trim() ?? '';
    const next = lines[index + 1]?.trim() ?? '';
    const wordCount = trimmed.split(/\s+/).length;
    const looksLikeSectionLabel =
      wordCount <= 5 &&
      trimmed.length <= 48 &&
      /^[A-Z0-9][A-Za-z0-9/&,\-() ]+$/.test(trimmed) &&
      !/[.!?]$/.test(trimmed);

    if (!looksLikeSectionLabel || (!prev && !next)) {
      output.push(line);
      continue;
    }

    output.push(`### ${trimmed}`);
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n');
}

function normalizeScenarioMarkdown(content?: string | null, label?: 'Bull Case' | 'Bear Case') {
  if (!content) return '';

  return normalizeStructuredSectionMarkdown(content)
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (!label) return true;
      return !new RegExp(`^#{1,6}\\s*${label}(\\s*\\(|\\b)`, 'i').test(trimmed);
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseEpsMarkdownTable(content?: string | null) {
  if (!content) return [];

  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const dataLines = lines.filter((line) => line.startsWith('|'));
  if (dataLines.length < 3) return [];

  const rows = dataLines
    .slice(2)
    .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean))
    .filter((cells) => cells.length >= 2)
    .map((cells) => ({
      quarter: cells[0],
      eps: cells[1],
    }))
    .filter((row) => row.quarter && row.eps);

  return rows;
}

function markdownToPlainText(content?: string | null) {
  if (!content) return '';
  return content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]\(([^)]*)\)/g, '$1')
    .replace(/[#>*_`~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getRecommendationColor(rec: string) {
  switch (rec.toLowerCase()) {
    case 'buy': return 'bg-green-600 text-white';
    case 'sell': return 'bg-red-600 text-white';
    case 'overweight': return 'bg-green-600 text-white';
    case 'underweight': return 'bg-red-600 text-white';
    case 'neutral': return 'bg-gray-600 text-white';
    case 'hold': return 'bg-gray-600 text-white';
    default: return 'bg-gray-600 text-white';
  }
}

function getImpactBadge(impact: string) {
  const colors = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-orange-100 text-orange-800',
    high: 'bg-red-100 text-red-800',
  };
  return colors[impact as keyof typeof colors] || 'bg-gray-100 text-gray-800';
}

function CatalystTable({
  label,
  catalysts,
}: {
  label: string;
  catalysts: Array<{
    event: string;
    mechanism: string;
    probability: string;
    timeframe: string;
  }>;
}) {
  const showTimeframe = hasAnyTimeframe(catalysts);

  return (
    <div className="report-table-wrap">
      <SectionLabel>{label}</SectionLabel>
      <table className="report-table">
        <colgroup>
          <col style={{ width: showTimeframe ? '24%' : '28%' }} />
          {showTimeframe && <col style={{ width: '16%' }} />}
          <col style={{ width: '14%' }} />
          <col style={{ width: showTimeframe ? '46%' : '58%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Event</th>
            {showTimeframe && <th>Timeframe</th>}
            <th>Probability</th>
            <th>Mechanism</th>
          </tr>
        </thead>
        <tbody>
          {catalysts.map((catalyst, index) => (
            <tr key={index}>
              <td className="font-medium">{catalyst.event}</td>
              {showTimeframe && <td>{catalyst.timeframe || '—'}</td>}
              <td className="capitalize">{catalyst.probability}</td>
              <td>{catalyst.mechanism}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResearchExportDocument({
  report,
  logoSrc = sgcLogo.src,
}: {
  report: ResearchExportReport;
  logoSrc?: string;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: EXPORT_DOCUMENT_STYLES }} />

      <div
        className="pdf-doc mx-auto max-w-[8.15in] bg-white px-10 py-8 text-slate-900"
        data-company-name={report.companyName}
        data-ticker={report.ticker}
        data-report-date={new Date(report.reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
      >
        <header className="min-h-[9.4in] flex flex-col justify-between">
          <div>
            <div className="-mx-10 border-b border-slate-300 bg-[#0b1f3a] px-10 py-5 text-white">
              <div className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-4">
                  <img
                    src={logoSrc}
                    alt="St. George Capital"
                    width={120}
                    height={120}
                    className="h-auto w-[82px]"
                  />
                  <div>
                    <div className="report-sans text-[15px] font-semibold tracking-[0.08em] text-white">
                      St. George Capital
                    </div>
                    <div className="report-sans mt-1 text-[9.5px] uppercase tracking-[0.24em] text-slate-200">
                      Canada's Premier Investment Research Student Group
                    </div>
                  </div>
                </div>
                <div className="report-sans text-right text-[11px] uppercase tracking-[0.22em] text-slate-200">
                  Equity Research
                </div>
              </div>
              <div className="mt-4 h-px bg-white/20" />
            </div>

            <div className="mt-14 grid grid-cols-[1.45fr_0.75fr] gap-10">
              <div>
                <div className="report-kicker">Initiation of Coverage</div>
                <h1 className="mt-5 max-w-4xl font-serif text-[58px] leading-[0.96] text-slate-950">
                  {report.companyName}
                </h1>
                <div className="report-sans mt-5 text-[14px] font-medium uppercase tracking-[0.16em] text-slate-600">
                  {report.ticker} · {report.exchange}
                </div>
                <div className="mt-8 grid grid-cols-2 gap-6 border-t border-slate-300 pt-5">
                  <div>
                    <div className="report-subhead">Report Date</div>
                    <div className="mt-2 text-[11.5px] text-slate-800">
                      {new Date(report.reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                  <div>
                    <div className="report-subhead">Coverage Status</div>
                    <div className="mt-2 text-[11.5px] capitalize text-slate-800">{report.coverageStatus}</div>
                  </div>
                </div>
              </div>

              <div className="self-start border border-slate-200 bg-slate-50 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="report-kicker !text-[8px]">Rating Snapshot</div>
                    <div className={`report-sans mt-3 inline-flex rounded-sm px-3 py-1.5 text-sm font-semibold ${getRecommendationColor(report.recommendation)}`}>
                      {report.recommendation.toUpperCase()}
                    </div>
                  </div>
                  <div className="report-sans text-right text-[9px] uppercase tracking-[0.14em] text-slate-500">
                    {report.timeHorizon}
                  </div>
                </div>
                <table className="report-meta-table mt-5">
                  <tbody>
                    <tr>
                      <td><SummaryMetricRow label="Current Price" value={formatMoney(report.currentPrice)} /></td>
                      <td><SummaryMetricRow label="Target Price" value={formatMoney(report.targetPrice)} /></td>
                    </tr>
                    <tr>
                      <td><SummaryMetricRow label="Upside / Downside" value={<span className={report.impliedUpside >= 0 ? 'text-emerald-700' : 'text-red-700'}>{formatPercent(report.impliedUpside)}</span>} /></td>
                      <td><SummaryMetricRow label="Sector" value={report.sector} /></td>
                    </tr>
                    <tr>
                      <td><SummaryMetricRow label="Industry" value={report.industry} /></td>
                      <td><SummaryMetricRow label="Analysts" value={report.analysts.join(', ')} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-14 grid grid-cols-[1.2fr_0.8fr] gap-10">
              <div>
                <SectionLabel>Top Thesis Themes</SectionLabel>
                <div className="mt-4 space-y-3">
                  {report.investmentThesis.slice(0, 3).map((bullet, index) => (
                    <div key={index} className="border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                      <div className="report-sans text-[11.25px] font-semibold uppercase tracking-[0.04em] text-[#0b1f3a]">
                        {bullet.title ? markdownToPlainText(bullet.title) : `Thesis ${index + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel>Coverage Context</SectionLabel>
                <p className="mt-4 text-[11.35px] leading-7 text-slate-800">
                  We initiate coverage with a {report.recommendation.toUpperCase()} recommendation based on our assessment of
                  intrinsic value, competitive positioning, and the timing of catalysts expected to influence the next {report.timeHorizon}.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-300 pt-5">
            <div className="grid grid-cols-2 gap-6 text-[11px]">
              <div>
                <div className="report-sans uppercase text-slate-500">Analysts</div>
                <div className="mt-1 font-medium text-slate-900">{report.analysts.join(', ')}</div>
              </div>
              <div className="text-right">
                <div className="report-sans uppercase text-slate-500">Coverage</div>
                <div className="mt-1 font-medium capitalize text-slate-900">{report.coverageStatus}</div>
              </div>
            </div>
          </div>
        </header>

        <PdfSection number="1" title="Executive Summary" pageBreak>
          <div className="space-y-8">
            <div className="keep-with-next">
              <SectionLabel>Recommendation Overview</SectionLabel>
              <p className="report-lead">
                {report.companyName} is rated <span className="font-semibold">{report.recommendation.toUpperCase()}</span> with a
                target price of <span className="font-semibold">{formatMoney(report.targetPrice)}</span>, implying{' '}
                <span className="font-semibold">{formatPercent(report.impliedUpside)}</span> relative to the current trading
                price of <span className="font-semibold">{formatMoney(report.currentPrice)}</span> over a{' '}
                <span className="font-semibold">{report.timeHorizon}</span> horizon.
              </p>
            </div>

            <div className="report-stat-strip avoid-break">
              <div className="report-stat">
                <span className="report-stat-label">Recommendation</span>
                <span className="report-stat-value">{report.recommendation.toUpperCase()}</span>
              </div>
              <div className="report-stat">
                <span className="report-stat-label">Current Price</span>
                <span className="report-stat-value">{formatMoney(report.currentPrice)}</span>
              </div>
              <div className="report-stat">
                <span className="report-stat-label">Target Price</span>
                <span className="report-stat-value">{formatMoney(report.targetPrice)}</span>
              </div>
              <div className="report-stat">
                <span className="report-stat-label">Upside / Downside</span>
                <span className={`report-stat-value ${report.impliedUpside >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatPercent(report.impliedUpside)}</span>
              </div>
              <div className="report-stat">
                <span className="report-stat-label">Horizon</span>
                <span className="report-stat-value">{report.timeHorizon}</span>
              </div>
            </div>

            <div className="space-y-4">
              {report.investmentThesis.map((bullet, index) => (
                <section key={index}>
                  <h3 className="report-subsection-title keep-with-next font-serif">
                    {bullet.title ? markdownToPlainText(bullet.title) : `Investment Thesis ${index + 1}`}
                  </h3>
                  <div className="mt-2 text-[11.5px] leading-7 text-slate-800">
                    <PdfMarkdown content={bullet.claim} />
                  </div>
                  <div className="mt-2 text-[11.4px] leading-7 text-slate-800">
                    <span className="report-subhead mr-2">Primary Driver:</span>
                    <span>{markdownToPlainText(bullet.driver || '—')}</span>
                  </div>
                  <div className="mt-1 text-[11.4px] leading-7 text-slate-800">
                    <span className="report-subhead mr-2">Market Mispricing:</span>
                    <span>{markdownToPlainText(bullet.mispricing || '—')}</span>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </PdfSection>

        <PdfSection number="2" title="Company Snapshot & Price Performance" pageBreak>
          <table className="report-meta-table">
            <tbody>
              <tr>
                {report.priceDate && <td><SummaryMetricRow label="Date of Price" value={report.priceDate} /></td>}
                {report.fiftyTwoWeekRange && <td><SummaryMetricRow label="52-Week Range" value={report.fiftyTwoWeekRange} /></td>}
                {report.marketCap != null && <td><SummaryMetricRow label="Market Cap" value={`$${report.marketCap.toLocaleString()} mn`} /></td>}
              </tr>
              <tr>
                {report.sharesOutstanding != null && <td><SummaryMetricRow label="Shares O/S" value={`${report.sharesOutstanding.toLocaleString()} mn`} /></td>}
                {report.fiscalYearEnd && <td><SummaryMetricRow label="Fiscal Year End" value={report.fiscalYearEnd} /></td>}
                {report.priceTargetEndDate && <td><SummaryMetricRow label="Price Target End Date" value={report.priceTargetEndDate} /></td>}
              </tr>
              <tr>
                {(report.peRatio != null || report.dcfInputs?.peRatio != null) && <td><SummaryMetricRow label="P/E" value={`${(report.peRatio ?? report.dcfInputs?.peRatio).toFixed(2)}x`} /></td>}
                {(report.forwardPE != null || report.dcfInputs?.forwardPE != null) && <td><SummaryMetricRow label="Forward P/E" value={`${(report.forwardPE ?? report.dcfInputs?.forwardPE).toFixed(2)}x`} /></td>}
                {report.dividendYield != null && <td><SummaryMetricRow label="Dividend Yield" value={`${report.dividendYield.toFixed(2)}%`} /></td>}
              </tr>
            </tbody>
          </table>

          {report.dataSource && (
            <div className="mt-3 text-[10px] text-slate-500">Source: {report.dataSource}</div>
          )}

          {((report.priceHistory && report.priceHistory.length > 0) || report.priceChartImageUrl || report.epsTableMarkdown) && (
            <div className="mt-8 report-two-col">
              {report.epsTableMarkdown && (
                <div>
                  <SectionLabel>Recent Reported EPS Trend</SectionLabel>
                  {(() => {
                    const epsRows = parseEpsMarkdownTable(report.epsTableMarkdown);
                    if (!epsRows.length) {
                      return <PdfMarkdown content={report.epsTableMarkdown} />;
                    }

                    const midpoint = Math.ceil(epsRows.length / 2);
                    const leftRows = epsRows.slice(0, midpoint);
                    const rightRows = epsRows.slice(midpoint);
                    const rowCount = Math.max(leftRows.length, rightRows.length);

                    return (
                      <table className="report-table">
                        <colgroup>
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '22%' }} />
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '22%' }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>Quarter</th>
                            <th className="num">EPS</th>
                            <th>Quarter</th>
                            <th className="num">EPS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: rowCount }).map((_, index) => {
                            const left = leftRows[index];
                            const right = rightRows[index];
                            return (
                              <tr key={index}>
                                <td>{left?.quarter ?? ''}</td>
                                <td className="num">{left?.eps ?? ''}</td>
                                <td>{right?.quarter ?? ''}</td>
                                <td className="num">{right?.eps ?? ''}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                  <div className="report-caption">Trailing quarterly earnings progression based on the report inputs.</div>
                </div>
              )}
              {(report.priceHistory && report.priceHistory.length > 0) || report.priceChartImageUrl ? (
                <div className="report-figure">
                  <SectionLabel>Price Performance</SectionLabel>
                  {report.priceChartImageUrl && !(report.priceHistory && report.priceHistory.length > 0) ? (
                    <img src={report.priceChartImageUrl} alt="Price Chart" className="w-full h-auto" />
                  ) : (
                    <svg viewBox="0 0 800 220" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                      {(() => {
                        const chartData = (report.priceHistory || report.dcfInputs?.priceHistory || []).slice(0, 100);
                        if (!chartData.length) return null;
                        const prices = chartData.map((point: any) => point.close);
                        const maxPrice = Math.max(...prices);
                        const minPrice = Math.min(...prices);
                        const range = Math.max(maxPrice - minPrice, 1);
                        const parsedRange = parseFiftyTwoWeekRange(report.fiftyTwoWeekRange);
                        const highMarker = parsedRange?.high ?? maxPrice;
                        const lowMarker = parsedRange?.low ?? minPrice;
                        const toY = (price: number) => 188 - ((price - minPrice) / range) * 150;
                        const startPoint = chartData[0];
                        const endPoint = chartData[chartData.length - 1];
                        const points = chartData.map((point: any, index: number) => {
                          const x = (chartData.length > 1 ? index / (chartData.length - 1) : 0) * 760 + 20;
                          const y = toY(point.close);
                          return `${x},${y}`;
                        }).join(' ');
                        return (
                          <>
                            {[highMarker, (highMarker + lowMarker) / 2, lowMarker].map((marker, index) => {
                              const y = toY(marker);
                              return (
                                <g key={index}>
                                  <line x1="20" y1={y} x2="780" y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray={index === 1 ? '0' : '4 5'} />
                                  <text x="12" y={y + 4} textAnchor="end" fontSize="10" fill="#64748b" fontFamily="Helvetica, Arial, sans-serif">
                                    ${marker.toFixed(0)}
                                  </text>
                                </g>
                              );
                            })}
                            <polyline points={points} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="20" cy={toY(startPoint.close)} r="3.8" fill="#0f172a" />
                            <circle cx="780" cy={toY(endPoint.close)} r="3.8" fill="#0f172a" />
                            <text x="20" y="206" textAnchor="start" fontSize="10" fill="#64748b" fontFamily="Helvetica, Arial, sans-serif">
                              {formatChartDate(startPoint.date)}
                            </text>
                            <text x="780" y="206" textAnchor="end" fontSize="10" fill="#64748b" fontFamily="Helvetica, Arial, sans-serif">
                              {formatChartDate(endPoint.date)}
                            </text>
                            <text x="28" y={toY(startPoint.close) - 8} fontSize="10" fill="#0f172a" fontFamily="Helvetica, Arial, sans-serif">
                              Start ${startPoint.close.toFixed(2)}
                            </text>
                            <text x="772" y={toY(endPoint.close) - 8} textAnchor="end" fontSize="10" fill="#0f172a" fontFamily="Helvetica, Arial, sans-serif">
                              End ${endPoint.close.toFixed(2)}
                            </text>
                          </>
                        );
                      })()}
                    </svg>
                  )}
                  <div className="report-caption">Figure 1. Recent share-price trend with start and end markers, framed against the available trading range.</div>
                </div>
              ) : null}
            </div>
          )}
        </PdfSection>

        <PdfSection number="3" title="Business Model & Economics">
          <div className="space-y-6">
            <div>
              <SectionLabel>How the Company Makes Money</SectionLabel>
              <PdfMarkdown content={report.businessModel} />
            </div>
            {report.unitEconomics && (
              <div>
                <SectionLabel>Unit Economics</SectionLabel>
                <PdfMarkdown content={report.unitEconomics} />
              </div>
            )}
            {report.economicMoat && (
              <div>
                <SectionLabel>Economic Moat</SectionLabel>
                <PdfMarkdown content={report.economicMoat} />
              </div>
            )}
          </div>
        </PdfSection>

        <PdfSection number="4" title="Industry & Competitive Landscape">
          <PdfMarkdown content={report.industryAnalysis} />
        </PdfSection>

        <PdfSection number="5" title="Catalysts & Timeline">
          <div className="space-y-6">
            {report.catalystsNearTerm.length > 0 && (
              <CatalystTable label="Near-Term Catalysts" catalysts={report.catalystsNearTerm} />
            )}
            {report.catalystsMediumTerm.length > 0 && (
              <CatalystTable label="Medium-Term Catalysts" catalysts={report.catalystsMediumTerm} />
            )}
          </div>
        </PdfSection>

        <PdfSection number="6" title="Valuation Analysis" pageBreak>
          <div className="space-y-6">
            <div className="keep-with-next">
              <SectionLabel>Valuation Framework</SectionLabel>
              <p className="report-lead">
                Our valuation framework combines relative market context with a discounted cash flow assessment to anchor target
                price conviction, frame the key operating assumptions, and test fair value against the core discount-rate and
                terminal-growth sensitivities.
              </p>
            </div>

            <div>
              <InstitutionalValuationSection
                dcfData={report.dcfInputs && report.dcfOutputs ? {
                  inputs: report.dcfInputs as any,
                  outputs: report.dcfOutputs as any,
                  companyName: report.companyName,
                } : null}
                comparables={report.competitivePosition ?? null}
                valuationText={report.valuationAnalysis || 'Not provided'}
                variant="document"
              />
            </div>
          </div>
        </PdfSection>

        <PdfSection number="7" title="Scenario Analysis">
          {report.bullCase ? (
            <table className="report-table avoid-break">
              <colgroup>
                <col style={{ width: '50%' }} />
                <col style={{ width: '50%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Bull Case</th>
                  <th>Bear Case</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><PdfMarkdown content={normalizeScenarioMarkdown(report.bullCase, 'Bull Case')} /></td>
                  <td><PdfMarkdown content={normalizeScenarioMarkdown(report.bearCase, 'Bear Case')} /></td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="avoid-break">
              <h3 className="report-subsection-title keep-with-next font-serif">Bear Case</h3>
              <div>
                <PdfMarkdown content={normalizeScenarioMarkdown(report.bearCase, 'Bear Case')} />
              </div>
            </div>
          )}
          {report.bullBearJustification && (
            <div className="mt-6">
              <SectionLabel>Scenario Framing</SectionLabel>
              <PdfMarkdown content={report.bullBearJustification} />
            </div>
          )}
        </PdfSection>

        {report.keyRisks.length > 0 && (
          <PdfSection number="8" title="Key Risks">
            <ol className="space-y-4">
              {report.keyRisks.map((risk, index) => (
                <li key={index} className="avoid-break list-none border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="report-subsection-title keep-with-next font-serif !mb-1">
                      {index + 1}. {risk.title}
                    </h3>
                    <span className={`report-sans rounded px-2 py-1 text-[10px] font-semibold uppercase ${getImpactBadge(risk.impact)}`}>
                      {risk.impact} impact
                    </span>
                  </div>
                  <div className="mt-2">
                    <PdfMarkdown content={risk.description} />
                  </div>
                  {risk.mitigation && (
                    <div className="mt-2">
                      <PdfMarkdown content={`**Mitigation:** ${risk.mitigation}`} />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </PdfSection>
        )}

        {report.aiStrategies && (
          <PdfSection number="9" title="AI & Data Strategy">
            <PdfMarkdown content={report.aiStrategies} />
          </PdfSection>
        )}

        {report.esgFactors && (
          <PdfSection number="10" title="ESG & Governance">
            <PdfMarkdown content={report.esgFactors} />
          </PdfSection>
        )}

        {report.concludingSection && (
          <PdfSection number="11" title="Conclusion">
            <PdfMarkdown content={report.concludingSection} />
          </PdfSection>
        )}

        <section className="mt-10 border-t border-slate-300 pt-4">
          <div className="report-sans text-[10px] font-semibold uppercase text-slate-500">Important Disclosures</div>
          <p className="mt-3 text-[10.5px] leading-5 text-slate-600">
            This report has been prepared by St. George Capital for educational purposes only. It does not constitute
            investment advice or a solicitation to buy or sell securities. St. George Capital and its members may hold
            positions in the securities discussed. Past performance does not guarantee future results. Investors should
            conduct their own due diligence and consult with qualified financial advisors before making investment decisions.
          </p>
          <div className="mt-3 text-[10px] text-slate-500">
            Report status: <span className="font-semibold capitalize text-slate-700">{report.status}</span>
            {report.published && <span className="ml-2 text-emerald-700">• Published</span>}
          </div>
        </section>
      </div>
    </>
  );
}
