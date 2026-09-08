interface HeaderReport {
  companyName: string;
  ticker: string;
  exchange: string;
  recommendation: string;
  targetPrice: number;
  currentPrice: number;
  impliedUpside: number;
  analysts: string[];
  sector: string;
  industry: string;
  reportDate: string | Date;
}

export function ResearchReportHeader({ report }: { report: HeaderReport }) {
  return (
    <header className="research-masthead" style={{ background: '#f4f7fb', color: '#172f50' }}>
      <div className="research-masthead-label"><span>ST. GEORGE CAPITAL</span><span>EQUITY RESEARCH</span></div>
      <div className="research-masthead-main">
        <div>
          <p className="research-masthead-sector">{report.sector} / {report.industry}</p>
          <h1 style={{ color: '#172f50' }}>{report.companyName}</h1>
          <p className="research-masthead-ticker">{report.ticker} <span>/ {report.exchange}</span></p>
        </div>
        <div className="research-rating"><span>Recommendation</span><strong>{report.recommendation}</strong></div>
      </div>
      <dl className="research-masthead-metrics">
        <div><dt>Current price</dt><dd>${report.currentPrice.toFixed(2)}</dd></div>
        <div><dt>Price target</dt><dd>${report.targetPrice.toFixed(2)}</dd></div>
        <div><dt>Implied {report.impliedUpside < 0 ? 'downside' : 'upside'}</dt><dd>{report.impliedUpside > 0 ? '+' : ''}{(report.impliedUpside * 100).toFixed(1)}<span>%</span></dd></div>
      </dl>
      <div className="research-masthead-byline"><span>{report.analysts.join(' / ')}</span><time>{new Date(report.reportDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</time></div>
    </header>
  );
}
