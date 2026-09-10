import { researchTemplates } from "./research-templates";
export interface ProjectTemplate {
  resources?: { label: string; url: string }[];
  sourceIds?: string[];
  id: string;
  title: string;
  summary: string;
  hypothesis: string;
  plan: string;
  tags: string[];
  course: string;
  level: string;
  data: string;
  milestones: string[];
}
export const projectTemplates: ProjectTemplate[] = [
  {
    id: "data-quality",
    title: "Build a market-data quality monitor",
    summary:
      "Create a small, reproducible price dataset and catch the defects that can invalidate a backtest.",
    level: "Start here",
    course: "quant-data-foundations",
    tags: ["Data engineering", "Alpha Vantage"],
    data: "TIME_SERIES_WEEKLY_ADJUSTED; verify entitlement and available history before choosing the universe.",
    hypothesis:
      "A documented set of freshness, duplicate-date and corporate-action checks can identify data problems before they enter a research result.",
    plan: `## Research question
Which defects change the result of a simple return calculation?

## Data contract
Start with three liquid instruments. Save raw responses, retrieval timestamps, function names and symbol mappings. Keep the API key in an environment variable. Never commit it or paste it into an update.

## Method
Normalize dates and numeric types. Test duplicate dates, missing bars, zero prices and unusual returns. Keep an exception ledger instead of silently dropping rows.

## Baseline and validation
Inject a duplicate date and a split-like jump into a separate test fixture. The checks should detect them without modifying the raw source. Distinguish a genuine large return from a known adjustment issue.

## Deliverable
Versioned dataset manifest, ingestion script, automated tests and a short data-quality report. No claim of trading performance is needed.`,
    milestones: [
      "Define symbols and the data contract",
      "Cache and normalize one complete response",
      "Add defect fixtures and automated checks",
      "Publish a reproducible quality report",
    ],
  },
  {
    id: "momentum",
    title: "Test a weekly momentum baseline",
    summary:
      "Measure a simple trend rule against buy-and-hold after timing, turnover and costs.",
    level: "Foundation",
    course: "backtesting-without-leakage",
    tags: ["Time series", "Backtesting"],
    data: "TIME_SERIES_WEEKLY_ADJUSTED; use the adjusted series consistently and document the return convention.",
    hypothesis:
      "A lagged trend rule changes drawdown characteristics enough to justify its turnover relative to a passive benchmark; higher return is a question, not an assumption.",
    plan: `## Signal
Start with one instrument and a fixed trailing 12-week return. The signal at week t can use observations only through t.

## Execution
Trade at a documented executable point after the signal. If only closing data are available, use a close-to-close convention with a full-period lag and discuss the delay.

## Evaluation
Compare against buy-and-hold over the identical window. Report net return, volatility, maximum drawdown, exposure and turnover. Use several explicitly stated cost assumptions.

## Validation
Keep the last chronological segment untouched until the rule and parameters are frozen. Log all attempted variants. Do not optimize on the holdout.

## Stop criterion
If any improvement disappears after plausible costs or is concentrated in a single period, report that result and reject the original claim.`,
    milestones: [
      "Write the timing convention",
      "Implement passive and lagged-signal baselines",
      "Add turnover and cost accounting",
      "Freeze the rule and evaluate the holdout",
    ],
  },
  {
    id: "vol-target",
    title: "Study volatility targeting",
    summary:
      "Compare fixed exposure with a lagged risk-scaling rule and explain the path-dependent trade-offs.",
    level: "Intermediate",
    course: "portfolio-risk-lab",
    tags: ["Risk", "Portfolio construction"],
    data: "Adjusted weekly or daily prices, depending on plan; do not mix frequencies when annualizing.",
    hypothesis:
      "Scaling exposure using lagged realized volatility can stabilize risk, but may reduce returns and increase trading costs during abrupt reversals.",
    plan: `## Model
Estimate trailing volatility, then set next-period weight to target volatility divided by the estimate. Use an explicit leverage cap and a volatility floor.

## Benchmarks
Compare with a constant-weight position and a passive benchmark using identical dates, return definitions and financing assumptions.

## Stress tests
Evaluate a sudden selloff, a sharp rebound and a low-volatility period followed by a shock. Report the effect of estimation windows without cherry-picking the best result.

## Outputs
Exposure chart, net equity curves, turnover, drawdown and realized-risk tracking error. Explain whether the risk benefit survives costs.`,
    milestones: [
      "Specify the volatility estimator and annualization",
      "Build exposure with a one-period lag",
      "Model leverage, cash and turnover costs",
      "Compare stress windows and explain failures",
    ],
  },
  {
    id: "earnings-event",
    title: "Run a disciplined earnings event study",
    summary:
      "Estimate post-announcement returns while respecting timestamps, overlapping events and benchmark exposure.",
    level: "Intermediate",
    course: "statistical-research-foundations",
    tags: ["Event studies", "Equities"],
    data: "EARNINGS plus adjusted prices. Report dates alone may not identify announcement time; source the timing or restrict the design.",
    hypothesis:
      "A pre-specified earnings-surprise grouping is associated with a subsequent return difference after controlling for a market benchmark.",
    plan: `## Event definition
Specify the information available at the event timestamp. Do not assume an earnings report date proves that the announcement happened before the open.

## Design
Pre-register the surprise buckets, event window and benchmark. Exclude or separately analyze ambiguous timing and overlapping events.

## Inference
Report sample sizes, dispersion and confidence intervals. Account for dependence across events sharing a date or issuer. Compare the economic size of the effect with costs.

## Limitation
A provider's current historical fundamentals may contain revisions. Document whether the data are point-in-time before making an investable-performance claim.`,
    milestones: [
      "Audit event availability and timing",
      "Freeze event windows and exclusions",
      "Calculate benchmark-adjusted returns",
      "Report uncertainty and point-in-time limitations",
    ],
  },
  {
    id: "news-timing",
    title: "Audit the timing of a news signal",
    summary:
      "Test whether an apparent sentiment effect survives a strict information-availability audit.",
    level: "Advanced",
    course: "backtesting-without-leakage",
    tags: ["News", "Data integrity"],
    data: "NEWS_SENTIMENT with time_published, ticker relevance and sentiment scores; archive retrieval times and coverage.",
    hypothesis:
      "Any measured relation between a news score and future returns should survive removing information published after the decision time and duplicate syndicated stories.",
    plan: `## Collection
Store publication and retrieval timestamps, article identifiers, ticker relevance and raw scores. Keep licensing and redistribution rules with the dataset manifest.

## Features
Aggregate only articles known before the signal cut-off. De-duplicate repeated coverage and freeze the aggregation rule.

## Baselines
Compare with lagged return and a no-news control. A provider's score is a feature, not a calibrated return forecast.

## Validation
Run a deliberately leaky version as a diagnostic alongside the valid version. Explain the gap. Do not present the leaky result as performance.

## Deliverable
A timing audit and event study with reproducible exclusions, uncertainty and a clear account of data limitations.`,
    milestones: [
      "Define the information cut-off",
      "Archive and deduplicate the news sample",
      "Construct timestamp-valid features",
      "Compare controls and write the leakage audit",
    ],
  },
  {
    id: "pairs",
    title: "Investigate a pairs-trading hypothesis",
    summary:
      "Separate correlation, stable relative pricing and an executable spread strategy.",
    level: "Advanced",
    course: "statistical-research-foundations",
    tags: ["Statistical arbitrage", "Validation"],
    data: "Consistently adjusted price histories; borrow availability and shorting costs require additional sources.",
    hypothesis:
      "An economically related pair has a stable relationship in training data that remains useful in a later period after hedging, borrow and transaction costs.",
    plan: `## Selection
Define the economic relationship before inspecting the best-performing pair. Record the full candidate set to expose selection bias.

## Training
Estimate the hedge ratio and any mean-reversion model only on the training period. Correlation by itself does not establish stationarity or cointegration.

## Out-of-sample design
Freeze entry, exit and stop rules. Use rolling refits only at pre-defined dates with past data. Account for gross exposure, short-leg borrow costs and corporate actions.

## Rejection rule
Reject the trading interpretation if the relationship is unstable, the spread does not revert out of sample, or executable costs erase the effect. A negative result is a valid project outcome.`,
    milestones: [
      "Define a justified candidate set",
      "Fit and diagnose the training relationship",
      "Implement dated refits and execution costs",
      "Evaluate stability and write a rejection or continuation memo",
    ],
  },
  ...researchTemplates,
];
export const alphaVantageDocs = "https://www.alphavantage.co/documentation/";
