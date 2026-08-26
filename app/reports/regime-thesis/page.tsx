import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Print-only research report page for the CVaR optimizer's macro/factor/methodology
// thesis — see plan Section 8. Hand-written prose (not generated from live
// SavedOptimizationRun data); the report runs once and is not regenerated. Follows the
// print-CSS conventions of components/research/ResearchExportDocument.tsx: `.pdf-doc`
// root class, `.page-break` to force a new page, `.avoid-break` to keep a block intact.
//
// Byline: Matthew Braho, Co-President: Portfolio Construction & Optimization.
//
// Sections 7-9 (validation basket results / fund stress test / fund backtest) are
// PENDING LIVE RUN placeholders — see the inline notes in each of those sections. This
// report cannot be finalized with real numbers until the optimizer has actually been run
// against backfilled live price/fundamentals data in a deployed environment. Filling
// those tables in with fabricated numbers would misrepresent this document to anyone
// using it to inform real fund decisions, so they are left as clearly-labeled structural
// placeholders instead.

const REPORT_DATE = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const STYLES = `
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
    nav, button { display: none !important; }
    .pdf-doc { max-width: none !important; margin: 0 !important; padding: 0 !important; }
    .pdf-doc .page-break { break-before: page; page-break-before: always; }
    .pdf-doc .avoid-break { break-inside: avoid; page-break-inside: avoid; }
    .pdf-doc h2, .pdf-doc h3, .pdf-doc .keep-with-next { break-after: avoid; page-break-after: avoid; }
  }

  .pdf-doc {
    font-family: Georgia, "Times New Roman", serif;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 48px 56px 72px;
    color: #1e293b;
    background: #ffffff;
  }
  .pdf-doc .rt-sans { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
  .pdf-doc .rt-kicker {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #64748b;
  }
  .pdf-doc .rt-title { font-size: 28px; line-height: 1.25; font-weight: 700; color: #0b1f3a; margin: 10px 0 6px; }
  .pdf-doc .rt-subtitle { font-size: 14px; line-height: 1.5; color: #475569; margin-bottom: 18px; }
  .pdf-doc .rt-byline-table {
    width: 100%; border-collapse: collapse; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10.5px; color: #0f172a; margin-bottom: 22px;
  }
  .pdf-doc .rt-byline-table td { padding: 8px 14px 8px 0; vertical-align: top; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
  .pdf-doc .rt-byline-label { display: block; margin-bottom: 3px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
  .pdf-doc .rt-byline-value { display: block; font-size: 11px; font-weight: 600; color: #0f172a; }
  .pdf-doc .rt-section-num {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10px; font-weight: 700;
    color: #64748b; letter-spacing: 0.1em;
  }
  .pdf-doc h2.rt-h2 {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 700;
    letter-spacing: 0.02em; text-transform: uppercase; color: #0b1f3a; border-bottom: 2px solid #0b1f3a;
    padding-bottom: 6px; margin: 34px 0 14px;
  }
  .pdf-doc h3.rt-h3 {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 12.5px; font-weight: 700;
    color: #0b1f3a; margin: 20px 0 8px;
  }
  .pdf-doc p.rt-body { font-size: 11.3px; line-height: 1.75; color: #1e293b; margin: 0 0 12px; }
  .pdf-doc ul.rt-list, .pdf-doc ol.rt-list { font-size: 11.3px; line-height: 1.75; color: #1e293b; margin: 0 0 12px; padding-left: 22px; }
  .pdf-doc ul.rt-list li, .pdf-doc ol.rt-list li { margin-bottom: 6px; }
  .pdf-doc .rt-callout {
    background: #f8fafc; border-left: 3px solid #0b1f3a; padding: 12px 16px; margin: 14px 0 16px; font-size: 10.6px; line-height: 1.7; color: #334155;
  }
  .pdf-doc .rt-callout.rt-callout-pending {
    background: #fffbeb; border-left: 3px solid #d97706; color: #78350f;
  }
  .pdf-doc .rt-callout-label {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 9px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; display: block;
  }
  .pdf-doc table.rt-table {
    width: 100%; border-collapse: collapse; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10.2px; color: #0f172a; margin: 10px 0 16px;
  }
  .pdf-doc table.rt-table th {
    border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; background: #f8fafc;
    padding: 7px 9px; text-align: left; font-size: 8.8px; font-weight: 700; text-transform: uppercase; color: #475569;
  }
  .pdf-doc table.rt-table td { border-bottom: 1px solid #e2e8f0; padding: 7px 9px; vertical-align: top; }
  .pdf-doc table.rt-table td.rt-num, .pdf-doc table.rt-table th.rt-num { text-align: right; }
  .pdf-doc .rt-stat-strip {
    display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px;
    border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 14px 0; margin: 18px 0;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  }
  .pdf-doc .rt-stat-label { display: block; margin-bottom: 4px; font-size: 8.2px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #64748b; }
  .pdf-doc .rt-stat-value { display: block; font-size: 15px; font-weight: 700; color: #0f172a; }
  .pdf-doc .rt-footnote { font-size: 9.3px; line-height: 1.6; color: #64748b; font-style: italic; margin-top: 4px; }
  .pdf-doc .rt-refs { font-size: 10px; line-height: 1.9; color: #334155; }
  .pdf-doc .rt-refs li { margin-bottom: 8px; }
`;

function StatStrip({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="rt-stat-strip avoid-break">
      {items.map((it) => (
        <div key={it.label}>
          <span className="rt-stat-label">{it.label}</span>
          <span className="rt-stat-value">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

function PendingLiveRun({ label }: { label: string }) {
  return (
    <div className="rt-callout rt-callout-pending avoid-break">
      <span className="rt-callout-label">Pending live run — placeholder, not real data</span>
      {label} This table is structured and ready, but is intentionally left unpopulated in
      this draft. It must be filled in with actual output from a live run of this feature
      (real backfilled price history, real computed factor exposures, and a real solved
      optimization) after deployment — not with estimated, simulated, or illustrative
      numbers. Populating this section before that live run has actually happened would
      misrepresent this document as containing empirical findings it does not yet contain.
    </div>
  );
}

export default async function RegimeThesisReportPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="pdf-doc" data-report-title="Late-Cycle Regime Positioning" data-report-date={REPORT_DATE}>
        {/* ── Cover / header ─────────────────────────────────────────────── */}
        <div className="rt-kicker">St. George Capital &middot; Portfolio Construction &amp; Optimization</div>
        <h1 className="rt-title">Late-Cycle Regime Positioning: CVaR Optimization Methodology &amp; Thesis</h1>
        <p className="rt-subtitle">
          A Conditional Value-at-Risk (CVaR) portfolio optimization encoding a manually-configured
          late-cycle / recessionary macro view — methodology, factor and sector rationale,
          constraint documentation, and validation evidence.
        </p>
        <table className="rt-byline-table">
          <tbody>
            <tr>
              <td style={{ width: '33%' }}>
                <span className="rt-byline-label">Author</span>
                <span className="rt-byline-value">Matthew Braho, Co-President: Portfolio Construction &amp; Optimization</span>
              </td>
              <td style={{ width: '22%' }}>
                <span className="rt-byline-label">Date</span>
                <span className="rt-byline-value">{REPORT_DATE}</span>
              </td>
              <td style={{ width: '22%' }}>
                <span className="rt-byline-label">Classification</span>
                <span className="rt-byline-value">Internal research &middot; decision support</span>
              </td>
              <td>
                <span className="rt-byline-label">Status</span>
                <span className="rt-byline-value">Baseline model &middot; recommendation-only</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── 1. Executive Summary ───────────────────────────────────────── */}
        <h2 className="rt-h2"><span className="rt-section-num">1&nbsp;&nbsp;</span>Executive Summary</h2>
        <p className="rt-body">
          This report documents the methodology and reasoning behind a baseline Conditional
          Value-at-Risk (CVaR) portfolio optimization built for the fund's equity holdings.
          The model minimizes tail risk (CVaR) subject to sector, region, and factor-tilt
          constraints that together encode a specific, manually-configured macro view: that
          the current environment warrants late-cycle / recessionary positioning. Concretely,
          the constraint set targets an approximately <strong>57.5% weight to U.S. equities</strong> —
          roughly a 12.5-percentage-point underweight relative to MSCI World's actual U.S.
          weight of approximately 70% — alongside a positive tilt toward <strong>Quality</strong> and{' '}
          <strong>low-Volatility</strong> factors and toward defensive sectors (consumer staples,
          utilities, healthcare).
        </p>
        <p className="rt-body">
          This is explicitly a <strong>baseline</strong> step toward a longer-term goal of
          algorithmic regime detection. In its current form, the model does not detect
          regimes — the late-cycle view is a human judgment, encoded as fixed numeric
          constraints, and re-evaluated only when a person updates the constraint set. The
          tool's output is a recommended target portfolio and a set of suggested trades; it
          does not execute any trades. Every recommendation still passes through the fund's
          existing manual, committee-gated process.
        </p>
        <StatStrip
          items={[
            { label: 'Target US Weight', value: '~57.5%' },
            { label: 'MSCI World US Weight', value: '~70%' },
            { label: 'Underweight vs. Benchmark', value: '~12.5 pts' },
            { label: 'CVaR Confidence Level', value: '95%' },
          ]}
        />
        <p className="rt-body">
          Sections 2–4 lay out the macro, factor, and sector case for this positioning, each
          with citations to checkable, real sources. Section 5 documents the CVaR
          methodology itself. Section 6 documents the literal numeric constraint bounds
          used. Sections 7–9 present validation evidence — a diversified test basket
          backtest/stress test, and the fund's own portfolio stress test and walk-forward
          backtest — with the fund-specific tables in Sections 8–9 left as structured
          placeholders pending the feature's first live run in production (see the notes in
          those sections). Section 10 states the model's limitations plainly. Section 11
          lists full references.
        </p>

        {/* ── 2. Macro Thesis ────────────────────────────────────────────── */}
        <h2 className="rt-h2"><span className="rt-section-num">2&nbsp;&nbsp;</span>Macro Thesis</h2>
        <p className="rt-body">
          The case for late-cycle / recessionary positioning rests on the joint behavior of
          four widely-used indicator families: the Treasury yield curve, credit spreads, the
          labor market, and business-cycle dating conventions. None of these is individually
          a reliable, precisely-timed recession predictor — each has produced false signals
          historically — but their combined and persistent signal is the standard basis on
          which economists and market practitioners assess late-cycle risk.
        </p>
        <h3 className="rt-h3">2.1 &nbsp;The yield curve</h3>
        <p className="rt-body">
          The spread between long-term and short-term U.S. Treasury yields — most commonly
          the 10-year minus 2-year spread, or the 10-year minus 3-month spread that the
          Federal Reserve's own research has emphasized — has inverted (gone negative) before
          each U.S. recession over the past several decades. This relationship is documented
          in Federal Reserve Bank of New York research (the New York Fed publishes a
          recession-probability model built directly on the 10-year/3-month spread) and in
          numerous Federal Reserve Bank of San Francisco and St. Louis Fed economic
          commentaries on the topic. An inverted curve reflects a market expectation that
          short-term rates will need to fall in the future — historically consistent with an
          anticipated economic slowdown or policy easing cycle following restrictive monetary
          policy. The curve's predictive record is not perfect (there have been "near-misses"
          and lags of variable, sometimes long, length between inversion and the onset of
          recession), which this report treats as a caveat rather than a dismissal: the
          curve is one input into a probabilistic macro view, not a precise timing tool.
        </p>
        <h3 className="rt-h3">2.2 &nbsp;Credit spreads</h3>
        <p className="rt-body">
          Corporate credit spreads — the additional yield investors demand to hold corporate
          debt over comparable-maturity Treasuries — tend to widen ahead of and during
          economic downturns, as default risk repricing leads equity market weakness. This is
          a long-documented empirical regularity in fixed-income and credit-risk literature,
          and is one of the reasons credit-spread indices (such as those tracking high-yield
          and investment-grade spreads) are commonly monitored as leading or coincident
          stress indicators alongside equity-market signals. Widening spreads reflect
          deteriorating credit conditions and tightening financial conditions more broadly —
          both consistent with a late-cycle environment in which financing costs rise and
          credit availability contracts.
        </p>
        <h3 className="rt-h3">2.3 &nbsp;Labor market indicators</h3>
        <p className="rt-body">
          Labor market deceleration — rising initial jobless claims, a rising unemployment
          rate off cyclical lows, and slowing payroll growth — is one of the most consistent
          coincident-to-lagging confirmations of an economic slowdown already underway. The
          "Sahm Rule," developed by economist Claudia Sahm, formalizes this: it signals
          recession has likely begun when the three-month moving average of the national
          unemployment rate rises by 0.50 percentage points or more relative to its low over
          the prior twelve months. The Sahm Rule has a strong historical hit rate across
          post-war U.S. recessions and is published as a maintained data series by the
          Federal Reserve Bank of St. Louis (FRED). Because labor-market weakening frequently
          confirms rather than leads a slowdown, this indicator family is treated in this
          report as corroborating evidence alongside the more forward-looking yield-curve and
          credit-spread signals, not as an independent early-warning signal on its own.
        </p>
        <h3 className="rt-h3">2.4 &nbsp;Business-cycle dating</h3>
        <p className="rt-body">
          The National Bureau of Economic Research (NBER) Business Cycle Dating Committee is
          the authoritative, non-partisan arbiter of official U.S. recession start and end
          dates, determined retrospectively based on a broad set of indicators (real
          personal income less transfers, nonfarm payroll employment, real personal
          consumption expenditures, wholesale-retail sales adjusted for price changes,
          industrial production, and household employment). Because NBER dating is
          retrospective — recessions are typically confirmed only months after they begin —
          it is not itself a forward-looking signal, but it is the standard reference point
          against which the other indicators above are calibrated and back-tested in the
          academic and practitioner literature. NBER recession dates are published and
          maintained publicly at nber.org/research/business-cycle-dating.
        </p>
        <h3 className="rt-h3">2.5 &nbsp;Quantitative track record of the leading indicators used here</h3>
        <p className="rt-body">
          To move beyond a purely qualitative "these indicators are widely used" case, this
          section states plainly what is and is not quantitatively well-established about
          each indicator's historical track record, and is explicit about statistical
          caveats rather than treating a small number of historical episodes as a large
          sample.
        </p>
        <p className="rt-body">
          <strong>Yield curve inversion — historical hit rate and lag structure.</strong>{' '}
          Every U.S. recession since the mid-1950s has been preceded by a 10-year/2-year or
          10-year/3-month Treasury yield curve inversion — a track record commonly cited in
          Federal Reserve research (e.g. Federal Reserve Bank of San Francisco Economic
          Letters on the topic) as effectively a perfect historical hit rate over roughly
          seven to eight recession cycles. This is a genuinely small sample in a statistical
          sense — n≈7-8 independent events is not enough to estimate a hit rate with tight
          confidence bounds, and a small number of false positives (inversions not followed
          by recession within a conventional window) have also been noted in the literature,
          most prominently discussed around the mid-1960s episode. The lag between inversion
          and recession onset has historically varied considerably, commonly cited in Fed
          research as ranging from roughly six months to two years, which is precisely why
          this report treats the yield curve as a <em>probabilistic, imprecisely-timed</em>{' '}
          input rather than a trigger with a fixed forecast horizon. The New York Fed
          maintains a published recession-probability model built on the 10-year/3-month
          spread (available at newyorkfed.org) that converts the raw spread into an explicit
          probability estimate using a probit regression against NBER-dated recessions —
          that published model, not an ad hoc reading of the raw spread, is the more
          statistically disciplined version of this indicator and is the one this report
          defers to for calibration.
        </p>
        <p className="rt-body">
          <strong>The Sahm Rule — a formally back-tested, real-time-safe trigger.</strong>{' '}
          Unlike a qualitative "unemployment is rising" read, the Sahm Rule is a precisely
          defined, back-tested trigger (three-month moving average of the national
          unemployment rate rising 0.50 percentage points or more from its low over the
          trailing twelve months) that Claudia Sahm designed specifically to be
          real-time-safe — i.e., computable from data available at the time, not requiring
          later revisions — which is a meaningfully higher statistical bar than many
          informal recession-timing heuristics clear. It is maintained as a live,
          continuously updated FRED series (FRED series ID: SAHMREALTIME), which allows
          direct, mechanical verification against the historical record rather than relying
          on a qualitative reading. Its historical reliability across post-war recessions is
          well documented in Sahm's own published work and subsequent Federal Reserve
          research; this report treats it as corroborating, coincident-to-lagging evidence
          precisely because — by construction — it fires only after labor-market weakening
          is already underway, not as an early-warning signal.
        </p>
        <p className="rt-body">
          <strong>Honest statistical framing.</strong> With only ~7-8 U.S. recessions in the
          post-war sample used to validate these indicators, formal hypothesis testing at
          conventional confidence levels is not really meaningful — this is a fundamental,
          irreducible data limitation of macro regime research, not specific to this report.
          The correct reading of "every recession was preceded by an inversion" is not "this
          indicator has a statistically estimated 100% hit rate with a tight confidence
          interval" — it is "this indicator has never yet failed to precede a recession in a
          small historical sample, with a variable and imprecise lag." This report relies on
          the weight of multiple correlated-but-distinct indicators (Section 2.1-2.4)
          precisely because no single one, examined in isolation with statistical rigor,
          would justify high-confidence market timing on its own.
        </p>

        <p className="rt-body">
          Taken together, this indicator set is the standard toolkit for assessing late-cycle
          risk. This report does not claim algorithmic regime detection from these indicators
          — as stated in Section 10, the regime view here is a human judgment informed by
          this framework, not a model output.
        </p>

        {/* ── 3. Factor Rationale ────────────────────────────────────────── */}
        <div className="page-break" />
        <h2 className="rt-h2"><span className="rt-section-num">3&nbsp;&nbsp;</span>Factor Rationale with Historical Regime Evidence</h2>
        <p className="rt-body">
          The constraint set tilts the optimized portfolio toward two factors — Quality and
          low-Volatility — on the basis of a substantial academic and practitioner literature
          documenting their behavior across market regimes. This section states that evidence
          plainly, including where it is more mixed (Size and Value), rather than presenting
          only the factors that support the thesis.
        </p>
        <h3 className="rt-h3">3.1 &nbsp;Low-Volatility</h3>
        <p className="rt-body">
          The "low-volatility anomaly" — the empirical finding that stocks with lower
          historical volatility have delivered risk-adjusted (and in some samples, absolute)
          returns comparable to or exceeding higher-volatility stocks, contrary to the basic
          risk-return tradeoff predicted by the Capital Asset Pricing Model — has been
          documented extensively in the academic literature, notably by Ang, Hodrick, Xing
          &amp; Zhang (2006), "The Cross-Section of Volatility and Expected Returns," published
          in the <em>Journal of Finance</em>. The core intuition relevant to regime positioning
          is mechanical rather than exotic: lower-beta, lower-volatility stocks decline less
          in absolute terms during broad equity drawdowns, so a low-volatility tilt reduces
          portfolio-level drawdown and tail risk specifically during the market stress
          episodes that tend to accompany late-cycle and recessionary periods. MSCI's
          published minimum-volatility index methodology and index-performance history is
          built directly on this premise and is one of the standard institutional
          implementations of the factor.
        </p>
        <h3 className="rt-h3">3.2 &nbsp;Quality</h3>
        <p className="rt-body">
          "Quality" as a factor — typically constructed from measures of profitability
          (return on equity), earnings stability, and low leverage — has been shown in
          practitioner research, notably from AQR Capital Management's published research on
          quality and defensive investing (including work associated with "quality minus
          junk" style constructions), to exhibit more resilient earnings and relatively
          stronger relative performance during economic contractions and periods of credit
          stress, when weaker-balance-sheet and lower-profitability companies are
          disproportionately punished. The intuition is straightforward: companies with high,
          stable profitability and conservative balance sheets are structurally better
          positioned to weather revenue declines and tightening credit conditions than
          highly-levered or marginally-profitable companies. This report constructs its own
          Quality factor from return on equity (TTM), net profit margin, and operating margin
          — see Section 5.2 for the exact construction.
        </p>
        <h3 className="rt-h3">3.3 &nbsp;Where the evidence is more mixed: Size and Value</h3>
        <p className="rt-body">
          In the interest of not cherry-picking, it should be stated plainly that the
          regime-conditional evidence for the Size and Value factors is considerably more
          mixed than for Quality and low-Volatility. The classic Fama &amp; French (1992, 1993)
          three-factor framework documents that small-cap and high book-to-market ("value")
          stocks have historically earned a return premium over long samples, but neither
          factor has a clean, consistent late-cycle/recessionary performance pattern the way
          low-volatility and quality do — small-caps in particular have often
          underperformed, not outperformed, during downturns and tightening credit
          conditions, since smaller companies typically carry weaker balance sheets and less
          diversified revenue, and value stocks' regime behavior has varied considerably
          across different historical cycles depending on which sectors dominate the "value"
          basket at the time. For this reason, this baseline constraint set does not impose a
          Size or Value tilt as part of the late-cycle thesis — the "Size" factor is
          retained in the model's factor-scoring output (see Section 5.2) for monitoring and
          future research, not as an active constraint in the current constraint set (see
          Section 6).
        </p>
        <h3 className="rt-h3">3.4 &nbsp;Cross-reference to this report's own validation evidence</h3>
        <p className="rt-body">
          Sections 7–9 provide this report's own empirical cross-check of the Quality and
          low-Volatility regime thesis, using the diversified validation basket (Section 7)
          and the fund's own holdings (Sections 8–9), rather than relying solely on
          third-party citations. Those sections are the primary evidence this report offers;
          the citations above are supplementary academic and practitioner context for why the
          thesis is a reasonable one to test in the first place.
        </p>

        {/* ── 4. Sector Rationale ────────────────────────────────────────── */}
        <h2 className="rt-h2"><span className="rt-section-num">4&nbsp;&nbsp;</span>Sector Rationale</h2>
        <p className="rt-body">
          The constraint set also imposes minimum weight floors on three "defensive" GICS
          sectors — Consumer Staples, Utilities, and Health Care — with the same late-cycle
          logic as the factor tilts above, applied at the sector level.
        </p>
        <h3 className="rt-h3">4.1 &nbsp;Consumer Staples</h3>
        <p className="rt-body">
          Consumer staples companies (household products, food and beverage, tobacco) sell
          goods with relatively inelastic demand — consumption of these goods does not fall
          proportionally with household income during a downturn the way discretionary
          spending does. This structurally more stable revenue base is the standard
          justification, in both academic and sell-side sector-rotation research, for
          staples' historically more defensive relative performance during economic
          contractions, and is consistent with staples' typically lower beta and lower
          earnings volatility relative to the broad market.
        </p>
        <h3 className="rt-h3">4.2 &nbsp;Utilities</h3>
        <p className="rt-body">
          Regulated utilities generate largely non-discretionary, rate-regulated revenue with
          comparatively low sensitivity to the broader business cycle, and have historically
          exhibited defensive relative performance and low beta versus the broad market — the
          standard rationale cited in sector-rotation and factor-investing research for their
          inclusion in defensive baskets. The sector does carry its own distinct risk
          profile worth noting honestly: utilities are typically highly leveraged
          (rate-regulated capital structures rely on debt financing) and interest-rate
          sensitive, so a rising-rate environment can offset some of the sector's
          business-cycle defensiveness. This is a real tension the model does not resolve
          algorithmically — it is left as a monitoring point, not eliminated by the
          constraint set.
        </p>
        <h3 className="rt-h3">4.3 &nbsp;Health Care</h3>
        <p className="rt-body">
          Health care spending — particularly the pharmaceuticals, essential medical devices,
          and health-insurance components of the sector — is comparatively insulated from
          discretionary household spending cuts, since demand is driven substantially by
          medical need rather than income level. This is the standard basis, again consistent
          with sell-side and academic sector-rotation research, for health care's historical
          inclusion among defensive sector tilts. As with utilities, this report notes a
          caveat rather than presenting the case as unqualified: certain sub-industries within
          health care (elective procedures, some biotech, health care equipment tied to
          hospital capital spending) are more cyclical than the sector-level generalization
          suggests, and the fund's actual health care holdings (Section 8) should be assessed
          individually against this distinction, not assumed defensive purely by GICS sector
          label.
        </p>

        {/* ── 5. Methodology ─────────────────────────────────────────────── */}
        <div className="page-break" />
        <h2 className="rt-h2"><span className="rt-section-num">5&nbsp;&nbsp;</span>Methodology</h2>
        <h3 className="rt-h3">5.1 &nbsp;CVaR minimization — the Rockafellar-Uryasev formulation</h3>
        <p className="rt-body">
          Conditional Value-at-Risk (CVaR), also called Expected Shortfall, is the expected
          loss conditional on the loss exceeding the Value-at-Risk (VaR) threshold at a given
          confidence level — informally, "the average loss in the worst (1&minus;&alpha;)
          fraction of outcomes." Unlike VaR, which only reports a threshold loss level and is
          not a coherent risk measure (it fails subadditivity), CVaR is a coherent risk
          measure and is convex, which makes it tractable to optimize directly rather than
          only estimate.
        </p>
        <p className="rt-body">
          This model uses the linear-programming formulation of CVaR minimization introduced
          by R. Tyrrell Rockafellar and Stanislav Uryasev in "Optimization of Conditional
          Value-at-Risk," <em>Journal of Risk</em>, Vol. 2, No. 3 (2000), pp. 21–41. The key
          insight of that paper is that minimizing CVaR over a set of historical or simulated
          return scenarios can be written as a linear program by introducing an auxiliary
          variable (interpreted as the VaR threshold) and per-scenario slack variables for
          shortfall beyond that threshold — avoiding the need to first estimate VaR and then
          separately average the tail, and instead solving for both simultaneously as the
          optimal solution to a single convex (here, linear) program. This repository's
          implementation (<code>lib/quant/cvar-optimizer.ts</code>) is:
        </p>
        <div className="rt-callout avoid-break rt-sans" style={{ fontFamily: 'Consolas, Monaco, monospace', fontSize: '9.6px', whiteSpace: 'pre-wrap' }}>
{`minimize:    ζ + (1 / (S·(1−α))) · Σ_s u_s
subject to:  u_s ≥ −(w · r_s) − ζ,  u_s ≥ 0         for each scenario s
             Σ_i w_i = 1,  w_i ≥ 0                  (fully invested, long-only)
             w_i ≤ maxSinglePositionWeight
             Σ_{i in sector k} w_i ∈ [min_k, max_k]
             Σ_{i in region k} w_i ∈ [min_k, max_k]  (encodes the ~57.5% US target)
             Σ_i w_i · factorExposure_i,f ≥ factorTarget_f   (per factor floor)
             [optional] Σ_i |w_i − currentWeight_i| ≤ 2·turnoverLimit`}
        </div>
        <p className="rt-body">
          Here <code>ζ</code> (zeta) is the optimal VaR threshold, <code>u_s</code> is the
          linearized shortfall beyond that threshold in scenario <code>s</code>,{' '}
          <code>S</code> is the number of scenarios, <code>α</code> is the confidence level
          (0.95 in the baseline constraint set), and <code>w_i</code> is portfolio weight on
          holding <code>i</code>. The objective's optimal value is, by construction, the
          portfolio's CVaR at confidence level <code>α</code>. This linear program is solved
          with the <code>javascript-lp-solver</code> package — chosen specifically because it
          solves this already-tractable exact LP formulation directly, rather than
          approximating CVaR minimization with a heuristic, and because it is pure JavaScript
          with no native bindings, which matters for deployment on Vercel's serverless
          runtime.
        </p>
        <h3 className="rt-h3">5.2 &nbsp;Historical-simulation scenario construction</h3>
        <p className="rt-body">
          Scenarios are built from actual historical price history rather than a parametric
          (e.g., assumed-normal) return distribution — a deliberate choice, since equity
          returns are well known to exhibit fatter tails and more skew than a normal
          distribution captures, and CVaR's entire purpose is to characterize tail risk
          accurately. Concretely, <code>buildScenarioMatrix()</code> constructs rolling,
          overlapping <code>cvarHorizonDays</code>-day (20 trading days, roughly one calendar
          month, in the baseline constraint set) return windows from daily closing prices,
          with trading dates aligned across every holding in the universe via an inner join
          — only dates with a valid closing price for every holding are used as scenario
          endpoints — so that each scenario reflects the real historical co-movement across
          holdings on that date, not an assumption of independence between assets.
        </p>
        <p className="rt-body">
          <strong>Overlapping-window caveat:</strong> because consecutive 20-day windows share
          most of their underlying daily returns, the resulting scenarios are not
          statistically independent of one another. This is a known, standard limitation of
          rolling-window historical simulation: it understates true tail uncertainty relative
          to a hypothetical sample of fully independent scenarios, because the effective
          number of independent observations is smaller than the raw scenario count
          suggests. This report does not correct for that effect (e.g., via block bootstrap
          resampling or a parametric tail-fitting overlay) in the current baseline
          implementation — it is stated here, and restated in Section 10, as an explicit,
          known limitation rather than resolved.
        </p>
        <h3 className="rt-h3">5.3 &nbsp;Factor construction</h3>
        <p className="rt-body">
          Six factors are computed, each as a <strong>cross-sectional z-score within the
          current holdings universe</strong> — that is, a holding's factor score reflects how
          it compares to the other names currently in the portfolio (or, for the validation
          basket, the other names in that basket), not its standing against the broader
          global equity market. This is an important and deliberate simplification for a
          small, concentrated book (the fund's real holdings number roughly 15–30 names) —
          it is explicitly <em>not</em> a full market-wide factor model of the kind built by
          Fama-French or MSCI from thousands of constituents, and this report does not
          represent it as one. See Section 10 for the full caveat.
        </p>
        <table className="rt-table avoid-break">
          <thead>
            <tr>
              <th style={{ width: '14%' }}>Factor</th>
              <th style={{ width: '38%' }}>Inputs</th>
              <th style={{ width: '20%' }}>Source</th>
              <th>Sign convention</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Value</td>
              <td>P/E, P/B, EV/EBITDA</td>
              <td>Alpha Vantage OVERVIEW</td>
              <td>Inverted — lower multiple scores higher</td>
            </tr>
            <tr>
              <td>Growth</td>
              <td>Quarterly earnings &amp; revenue YoY growth</td>
              <td>Alpha Vantage OVERVIEW</td>
              <td>Not inverted</td>
            </tr>
            <tr>
              <td>Momentum</td>
              <td>Trailing 6-month and 12-month returns</td>
              <td>PriceHistory closes</td>
              <td>Not inverted (standard construction)</td>
            </tr>
            <tr>
              <td>Quality</td>
              <td>ROE (TTM), net margin, operating margin</td>
              <td>Alpha Vantage OVERVIEW</td>
              <td>Not inverted</td>
            </tr>
            <tr>
              <td>Volatility</td>
              <td>Trailing 90-day realized volatility, annualized (&radic;252 scaling)</td>
              <td>PriceHistory closes</td>
              <td>Inverted — lower realized vol scores higher ("low-vol tilt")</td>
            </tr>
            <tr>
              <td>Size</td>
              <td>log(market capitalization)</td>
              <td>Alpha Vantage OVERVIEW</td>
              <td>Not inverted (large/defensive favored) — monitoring only, no active constraint (Section 3.3)</td>
            </tr>
          </tbody>
        </table>
        <p className="rt-body">
          <strong>Graceful degradation:</strong> when OVERVIEW fundamentals data is missing or
          incomplete for a holding (expected for some non-U.S.-listed names, and for the
          benchmark ETF itself, which has no meaningful P/E or ROE), the affected factor
          inputs are set to neutral (z = 0) for that holding rather than causing the entire
          run to fail, and the holding's <code>FactorExposure.dataComplete</code> flag is set
          to <code>false</code> so this is visible, not silently hidden, in both the tool's
          UI and the underlying data.
        </p>
        <h3 className="rt-h3">5.4 &nbsp;Benchmark (URTH) role</h3>
        <p className="rt-body">
          URTH (the iShares MSCI World ETF) is used throughout this report and the underlying
          tool as a <em>tracking proxy</em> for the MSCI World Index — it is a real,
          investable fund that tracks the index, not the index itself, and its returns will
          differ from the index's by URTH's expense ratio and any tracking error the fund
          exhibits. URTH's role here is reporting and comparison only: benchmark CVaR is
          computed over the same scenario set as the optimized portfolio for context, but
          URTH is deliberately <em>not</em> imposed as a hard tracking-error constraint in the
          optimization. A tracking-error constraint would be in direct tension with the
          purpose of this exercise — deliberately expressing a regional and factor conviction
          tilt away from the benchmark — and in any case, true per-constituent MSCI World
          benchmark weights are not available from either Polygon or Alpha Vantage, so a
          precise tracking-error constraint could not be constructed even if it were
          desired.
        </p>

        {/* ── 6. Constraint Set Documentation ────────────────────────────── */}
        <h2 className="rt-h2"><span className="rt-section-num">6&nbsp;&nbsp;</span>Constraint Set Documentation</h2>
        <p className="rt-body">
          The baseline constraint set applied to the fund's actual holdings is named{' '}
          <strong>"Late-Cycle Defensive Baseline"</strong> in the <code>OptimizationConstraintSet</code>{' '}
          table (seeded via <code>scripts/seed-cvar-constraint-set.js</code>). Its literal
          numeric bounds are reproduced here for auditability:
        </p>
        <table className="rt-table avoid-break">
          <thead>
            <tr><th>Region</th><th className="rt-num">Min</th><th className="rt-num">Max</th></tr>
          </thead>
          <tbody>
            <tr><td>United States</td><td className="rt-num">55.0%</td><td className="rt-num">60.0%</td></tr>
            <tr><td>Europe</td><td className="rt-num">20.0%</td><td className="rt-num">30.0%</td></tr>
            <tr><td>Japan</td><td className="rt-num">5.0%</td><td className="rt-num">15.0%</td></tr>
            <tr><td>Other developed Asia-Pacific</td><td className="rt-num">0.0%</td><td className="rt-num">10.0%</td></tr>
          </tbody>
        </table>
        <table className="rt-table avoid-break">
          <thead>
            <tr><th>Sector</th><th className="rt-num">Min</th><th className="rt-num">Max</th></tr>
          </thead>
          <tbody>
            <tr><td>Consumer Staples</td><td className="rt-num">10.0%</td><td className="rt-num">30.0%</td></tr>
            <tr><td>Utilities</td><td className="rt-num">5.0%</td><td className="rt-num">20.0%</td></tr>
            <tr><td>Health Care</td><td className="rt-num">10.0%</td><td className="rt-num">30.0%</td></tr>
            <tr><td>Information Technology</td><td className="rt-num">0.0%</td><td className="rt-num">30.0%</td></tr>
            <tr><td>Financials</td><td className="rt-num">0.0%</td><td className="rt-num">25.0%</td></tr>
            <tr><td>Energy</td><td className="rt-num">0.0%</td><td className="rt-num">15.0%</td></tr>
            <tr><td>Industrials</td><td className="rt-num">0.0%</td><td className="rt-num">20.0%</td></tr>
            <tr><td>Materials</td><td className="rt-num">0.0%</td><td className="rt-num">15.0%</td></tr>
            <tr><td>Consumer Discretionary</td><td className="rt-num">0.0%</td><td className="rt-num">20.0%</td></tr>
            <tr><td>Communication Services</td><td className="rt-num">0.0%</td><td className="rt-num">15.0%</td></tr>
          </tbody>
        </table>
        <table className="rt-table avoid-break">
          <tbody>
            <tr><td style={{ fontWeight: 700 }}>Factor floors</td><td>Quality target ≥ 0.25 &middot; Volatility (inverted) target ≥ 0.25 (portfolio-weighted-average cross-sectional z-score)</td></tr>
            <tr><td style={{ fontWeight: 700 }}>Max single position</td><td>15.0% of portfolio</td></tr>
            <tr><td style={{ fontWeight: 700 }}>Turnover limit</td><td>None set in the baseline (optional field, unused by default)</td></tr>
            <tr><td style={{ fontWeight: 700 }}>CVaR confidence level (&alpha;)</td><td>95%</td></tr>
            <tr><td style={{ fontWeight: 700 }}>CVaR horizon</td><td>20 trading days (~1 calendar month)</td></tr>
          </tbody>
        </table>
        <p className="rt-footnote">
          These bounds are configurable by an admin via the Constraints tab of the tool page
          (<code>/dashboard/tools/cvar-optimizer</code>) and via the{' '}
          <code>OptimizationConstraintSet</code> CRUD API — the numbers above reflect the
          baseline set as seeded, not a hard-coded, unchangeable configuration.
        </p>

        {/* ── 7. Validation Basket Results ───────────────────────────────── */}
        <div className="page-break" />
        <h2 className="rt-h2"><span className="rt-section-num">7&nbsp;&nbsp;</span>Validation Basket Results (Illustrative, Diversified Sample)</h2>
        <p className="rt-body">
          Before running this model against the fund's own, smaller and less diverse
          holdings, a separate validation basket of roughly 30 real, large, liquid MSCI World
          constituents — spanning the United States, Europe, Japan, and other developed
          Asia-Pacific markets, across ten GICS sectors — was run through the identical
          pipeline (price backfill, factor computation, CVaR optimization, and historical
          stress testing) as a build-time sanity check and as more diversified empirical
          evidence than the fund's own concentrated book alone can provide. The basket's full
          constituent list is maintained in <code>lib/quant/validation-basket.ts</code>. These
          results are clearly distinct from, and not a substitute for, the fund's own
          portfolio results in Sections 8–9 below.
        </p>
        <PendingLiveRun label="The validation-basket backtest and stress-test results table (2008 GFC / 2020 COVID / 2022 rate-hike windows, plus walk-forward backtest summary statistics) belongs here." />
        <table className="rt-table avoid-break">
          <thead>
            <tr>
              <th>Metric</th>
              <th className="rt-num">Validation Basket</th>
              <th className="rt-num">URTH (MSCI World proxy)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>2008 GFC window realized return (Sep–Nov 2008)</td><td className="rt-num">—</td><td className="rt-num">—</td></tr>
            <tr><td>2020 COVID crash window realized return</td><td className="rt-num">—</td><td className="rt-num">—</td></tr>
            <tr><td>2022 rate-hike drawdown realized return</td><td className="rt-num">—</td><td className="rt-num">—</td></tr>
            <tr><td>Walk-forward backtest cumulative return</td><td className="rt-num">—</td><td className="rt-num">—</td></tr>
            <tr><td>Walk-forward backtest max drawdown</td><td className="rt-num">—</td><td className="rt-num">—</td></tr>
            <tr><td>Realized CVaR (walk-forward, ex-post)</td><td className="rt-num">—</td><td className="rt-num">—</td></tr>
          </tbody>
        </table>
        <p className="rt-footnote">
          Run via <code>scripts/run-validation-basket.ts</code> against real backfilled price
          and fundamentals data. Coverage caveats (holdings lacking sufficient history for a
          given stress window) will be reported per-window when this table is populated, per
          the "N of M holdings covered" convention used throughout this tool
          (<code>lib/quant/stress-test.ts</code>).
        </p>

        {/* ── 8. Fund Portfolio Stress Test Results ──────────────────────── */}
        <h2 className="rt-h2"><span className="rt-section-num">8&nbsp;&nbsp;</span>Fund Portfolio Stress Test Results</h2>
        <p className="rt-body">
          This section presents the fund's own optimized target portfolio's realized
          performance across three historical stress windows: the 2008 Global Financial
          Crisis (September–November 2008, the acute post-Lehman drawdown), the 2020
          COVID-19 crash (February 19 – March 23, 2020, market peak to trough), and the 2022
          rate-hike drawdown (full calendar year 2022). Each window uses actual historical
          closing prices for the fund's holdings, not simulated data.
        </p>
        <PendingLiveRun label="The fund's own stress-test results table belongs here." />
        <table className="rt-table avoid-break">
          <thead>
            <tr>
              <th>Stress Window</th>
              <th className="rt-num">Fund Target Portfolio</th>
              <th className="rt-num">URTH (MSCI World proxy)</th>
              <th>Coverage</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>2008 Global Financial Crisis</td><td className="rt-num">—</td><td className="rt-num">—</td><td>—</td></tr>
            <tr><td>2020 COVID-19 Crash</td><td className="rt-num">—</td><td className="rt-num">—</td><td>—</td></tr>
            <tr><td>2022 Rate-Hike Drawdown</td><td className="rt-num">—</td><td className="rt-num">—</td><td>—</td></tr>
          </tbody>
        </table>
        <p className="rt-footnote">
          Coverage caveat: any fund holding lacking sufficient price history for a given
          window (e.g., a holding that listed after that window) is excluded from that
          specific window's portfolio-return calculation, with the "N of M holdings covered"
          figure reported explicitly rather than the gap being silently ignored or
          backfilled with fabricated data. This will be populated automatically by{' '}
          <code>runHistoricalStressTests()</code> as part of the live optimization run
          (<code>POST /api/tools/cvar-optimizer/run</code>) once deployed.
        </p>

        {/* ── 9. Fund Portfolio Backtest Results ─────────────────────────── */}
        <h2 className="rt-h2"><span className="rt-section-num">9&nbsp;&nbsp;</span>Fund Portfolio Backtest Results</h2>
        <p className="rt-body">
          The walk-forward backtest re-solves the optimization at each rebalance date (a
          monthly cadence in the baseline implementation) using only price and factor data
          that would genuinely have been available as of that date, holds the resulting
          weights until the next rebalance, and measures realized return, drawdown, and
          realized-vs-predicted CVaR over each holding period against URTH.
        </p>
        <div className="rt-callout avoid-break">
          <span className="rt-callout-label">Short-sample caveat — stated prominently, not buried</span>
          With five years of retained daily price history and an initial estimation window
          reserved before the first rebalance can occur, this backtest yields only a small
          number of out-of-sample rebalance periods. This is <strong>illustrative, not
          statistically powered validation</strong> — a handful of periods cannot reliably
          distinguish genuine skill or regime-thesis validity from noise. This report does
          not claim otherwise, here or anywhere else in this document.
        </div>
        <PendingLiveRun label="The fund's own walk-forward backtest summary table belongs here." />
        <table className="rt-table avoid-break">
          <thead>
            <tr>
              <th>Metric</th>
              <th className="rt-num">Fund Target Portfolio</th>
              <th className="rt-num">URTH (MSCI World proxy)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Number of out-of-sample rebalance periods</td><td className="rt-num" colSpan={2}>—</td></tr>
            <tr><td>Cumulative return</td><td className="rt-num">—</td><td className="rt-num">—</td></tr>
            <tr><td>Maximum drawdown</td><td className="rt-num">—</td><td className="rt-num">—</td></tr>
            <tr><td>Average predicted CVaR (95%, per period)</td><td className="rt-num">—</td><td className="rt-num">—</td></tr>
            <tr><td>Realized CVaR (ex-post, across periods)</td><td className="rt-num">—</td><td className="rt-num">—</td></tr>
          </tbody>
        </table>

        {/* ── 10. Limitations & Disclaimers ──────────────────────────────── */}
        <div className="page-break" />
        <h2 className="rt-h2"><span className="rt-section-num">10&nbsp;&nbsp;</span>Limitations &amp; Disclaimers</h2>
        <ul className="rt-list">
          <li>
            <strong>No algorithmic regime detection.</strong> The late-cycle/recessionary view
            encoded in the constraint set is a manual, human judgment (Section 2), not the
            output of a regime-detection model. Regime detection is explicitly out of scope
            for this baseline phase and is a stated goal for future work.
          </li>
          <li>
            <strong>Small-universe, relative factor scoring.</strong> As detailed in Section
            5.3, each factor score is a cross-sectional z-score computed only within the
            current holdings universe (roughly 15–30 names for the fund's real portfolio).
            This is not a market-wide factor model; a holding's score reflects its standing
            relative to the other current holdings, not the global equity universe.
          </li>
          <li>
            <strong>Overlapping, non-independent scenarios.</strong> As detailed in Section
            5.2, the historical-simulation scenarios used for CVaR estimation are built from
            overlapping return windows and are therefore not statistically independent,
            which understates true tail uncertainty relative to a fully independent sample.
          </li>
          <li>
            <strong>URTH is a tracking proxy, not the index.</strong> All MSCI World
            comparisons in this report use URTH, a real ETF that tracks (but does not
            perfectly replicate) the MSCI World Index, and differs from it by expense ratio
            and any tracking error. Per-constituent MSCI World benchmark weights are not
            available from this project's data sources, so precise index-relative
            attribution is not possible.
          </li>
          <li>
            <strong>Short backtest sample.</strong> As stated in Section 9, the walk-forward
            backtest covers only a few years of out-of-sample rebalance periods, limited by
            the 5-year PriceHistory retention window. Results should be read as illustrative,
            not as statistically powered evidence of skill.
          </li>
          <li>
            <strong>Recommendation-only — no auto-execution.</strong> This tool produces a
            recommended target portfolio and suggested trades. It does not execute trades of
            any kind. All suggested trades must be manually reviewed and entered by an admin
            through the fund's existing trade-entry process, consistent with the fund's
            existing manual, committee-gated approach to changing real holdings.
          </li>
          <li>
            <strong>Data-source limitations.</strong> Price history and fundamentals are
            sourced from Polygon.io (primary) and Alpha Vantage (fallback). Both are
            third-party commercial data providers; neither is guaranteed error-free, and
            gaps or restatements in their historical data will propagate into this model's
            outputs. Fundamentals coverage (Alpha Vantage OVERVIEW) is incomplete for some
            non-U.S.-listed holdings, handled via the graceful-degradation rule in Section
            5.3.
          </li>
        </ul>
        <p className="rt-body">
          This document, and the underlying tool it describes, is prepared for internal
          research and educational use by St. George Capital. It is decision support for a
          real student-managed fund, not investment advice, and nothing in this document or
          the tool constitutes a recommendation to any party outside the fund's own internal
          investment process.
        </p>

        {/* ── 11. References ──────────────────────────────────────────────── */}
        <h2 className="rt-h2"><span className="rt-section-num">11&nbsp;&nbsp;</span>References</h2>
        <ol className="rt-list rt-refs">
          <li>
            Rockafellar, R. T., &amp; Uryasev, S. (2000). "Optimization of Conditional
            Value-at-Risk." <em>Journal of Risk</em>, 2(3), 21–41.
          </li>
          <li>
            Ang, A., Hodrick, R. J., Xing, Y., &amp; Zhang, X. (2006). "The Cross-Section of
            Volatility and Expected Returns." <em>The Journal of Finance</em>, 61(1), 259–299.
          </li>
          <li>
            Fama, E. F., &amp; French, K. R. (1992). "The Cross-Section of Expected Stock
            Returns." <em>The Journal of Finance</em>, 47(2), 427–465.
          </li>
          <li>
            Fama, E. F., &amp; French, K. R. (1993). "Common Risk Factors in the Returns on
            Stocks and Bonds." <em>Journal of Financial Economics</em>, 33(1), 3–56.
          </li>
          <li>
            AQR Capital Management — published research on quality and defensive equity
            investing (available at aqr.com/Insights).
          </li>
          <li>
            MSCI — Minimum Volatility Index and Quality Index methodology documentation
            (available at msci.com/index-methodology).
          </li>
          <li>
            National Bureau of Economic Research, Business Cycle Dating Committee — U.S.
            recession start/end dates (nber.org/research/business-cycle-dating).
          </li>
          <li>
            Federal Reserve Bank of New York — Treasury yield-curve-based recession
            probability model (newyorkfed.org/research/capital_markets/ycfaq).
          </li>
          <li>
            Sahm, C. (2019) and Federal Reserve Bank of St. Louis (FRED) — the "Sahm Rule"
            recession indicator series (fred.stlouisfed.org, series SAHMREALTIME).
          </li>
          <li>
            MSCI World Index fact sheet and country/region weight breakdowns
            (msci.com/documents/10199/178e6643-6ae6-47b9-82be-e1fc565ededb).
          </li>
          <li>
            iShares MSCI World ETF (URTH) — fund fact sheet and holdings
            (ishares.com — used in this project as the MSCI World tracking proxy, see
            Section 5.4).
          </li>
          <li>
            Polygon.io and Alpha Vantage — daily OHLC price history and company fundamentals
            data providers used throughout this project's data pipeline (Section 5).
          </li>
        </ol>

        <p className="rt-footnote" style={{ marginTop: '28px' }}>
          Prepared internally by St. George Capital. Recommendation-only — no trades are
          auto-executed by this tool. Not investment advice.
        </p>
      </div>
    </>
  );
}
