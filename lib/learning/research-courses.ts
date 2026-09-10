import type { QuantCourseSeed } from "./quant-courses";
export const researchCourses: QuantCourseSeed[] = [
  {
    slug: "macro-data-research",
    title: "Macro Data Research: Releases, Curves & Revisions",
    summary:
      "Build an economic briefing from Treasury, inflation and labour data, with correct units, release timing and reproducible snapshots.",
    tags: "Macro, Data engineering",
    lessons: [
      {
        slug: "observation-and-release",
        title: "The Three Clocks in Macro Data",
        content: `## Learning objective
Build a dataset that distinguishes the period being measured from when a researcher could have known the value.

## Three clocks
| Clock | Meaning | Research use |
|---|---|---|
| Observation period | Month or quarter described | Align economic activity |
| Release timestamp | When the number became public | Determine information availability |
| Retrieval timestamp | When your system saved it | Audit your actual evidence |

A payroll observation for January is not information you necessarily possessed on January 31. A current API response can also contain revisions to old periods. Adding an arbitrary one-month lag does not reconstruct the original vintage.

## Build the ledger
Cache the response and record function, parameters without the key, retrieval time, unit, observation date and content hash. Add a release timestamp only when independently verified from the publisher; otherwise record it as unknown. Never substitute an observation date to fill that gap.

## Worked example
A toy January value is first published as 100 and later revised to 103. A model run before the revision may use 100 if the original snapshot proves it was available. Downloading 103 today cannot establish that earlier information set.

**Exercise:** create two small fixture snapshots. Change one old value and add one new month. Write assertions that identify exactly one revision and one new observation. Label these fixtures in your test folder.

**Deliverable:** a schema and revision ledger. Explain why a latest-vintage descriptive chart is valid while a claimed historical real-time forecast needs additional evidence.

[Alpha Vantage economic data](https://www.alphavantage.co/documentation/#cpi)`,
      },
      {
        slug: "macro-transformations",
        title: "Turn Levels into Interpretable Changes",
        content: `## Learning objective
Choose a transformation that matches the economic unit, then verify it with a small calculation.

## Transformation table
| Input | Transformation | Output unit |
|---|---|---|
| CPI index | 100 × (CPI / CPI twelve months earlier − 1) | Percent year over year |
| Unemployment rate | Current rate − prior rate | Percentage points |
| Payroll level | Current level − prior level | The response's employment unit |
| Treasury yields | 100 × (long yield − short yield) | Basis points |

## Worked example
CPI rises from 300 to 312: inflation is 4%. An unemployment rate moving from 3.8% to 4.2% rises by 0.4 percentage points, not 0.4%. A Treasury spread of −0.45 percentage points is −45 basis points.

## Implement the join
Sort by date and join CPI to the same calendar month one year earlier. A positional shift of 12 rows fails if months are missing. Reject duplicate observation months. Preserve a missing denominator as unavailable rather than silently treating it as zero.

\`\`\`python
def year_over_year(current, previous_year):
    if current is None or previous_year is None or previous_year <= 0:
        return None
    return 100 * (current / previous_year - 1)

assert round(year_over_year(312, 300), 8) == 4
\`\`\`

**Exercise:** test a missing month, duplicate month and zero denominator. Construct a table showing raw values beside derived values so a reviewer can audit every unit conversion.

**Deliverable:** three aligned panels for inflation, unemployment change and payroll change. Give each its own labelled axis; do not imply that differently scaled series are directly comparable.

[Official series parameters](https://www.alphavantage.co/documentation/#nonfarm-payroll)`,
      },
      {
        slug: "curve-construction",
        title: "Construct and Interpret a Treasury Curve",
        content: `## Learning objective
Separate yield levels, slopes and changes without confusing any of them with investment returns.

## Request and align
Use TREASURY_YIELD with interval=monthly. Fetch maturity=3month, maturity=2year and maturity=10year separately. Inspect the data root and unit field, parse missing-value markers, and inner-join observation dates. Count excluded rows. Monthly observations do not provide an intramonth executable trading price.

## Worked curve
| Maturity | Toy yield |
|---|---:|
| 3 month | 4.80% |
| 2 year | 4.65% |
| 10 year | 4.20% |

The 10y–2y spread is −45 bp and the 10y–3m spread is −60 bp. These are two distinct measures. Draw a horizontal zero line on the spread chart. An inversion describes a relationship between rates; it does not by itself specify timing, position sizing or a profitable trade.

## Validation
Test identical yields, missing maturities and dates that exist in only one response. Define a consecutive inversion run to stop at missing months. Never connect gaps as though the observation existed.

A yield increase often has an adverse first-order price effect on an existing fixed-rate bond, but calculating a realized bond return requires price, cash-flow and reinvestment information absent from a yield-only series.

**Exercise:** write two paragraphs interpreting the toy curve and list three facts you would need before proposing a bond trade.

**Deliverable:** latest curve, historical spreads, duration-of-inversion table and an interpretation with an explicit distinction between measurement and prediction.

[Treasury parameters](https://www.alphavantage.co/documentation/#treasury-yield)`,
      },
      {
        slug: "monthly-briefing",
        title: "Publish a Briefing Someone Can Audit",
        content: `## Learning objective
Turn calculations into a concise, reproducible macro research product.

## Assemble the evidence
Start with a latest-observation table: series, observation month, value, unit, transformation, release date if verified, retrieval time and source. Use a common chart window but retain the true last observation for each series. Do not forward-fill a stale series and label it current.

## Briefing structure
1. State the most consequential observed change.
2. Explain which second indicator supports or challenges that reading.
3. Separate observations from a proposed mechanism.
4. Name one future release that would change the assessment.

## Worked editorial decision
Inflation slows while payroll growth weakens. A useful note reports both measurements and their dates. It does not declare a recession merely because two plotted lines move down. Alternative explanations, revisions and sample length belong in the assessment.

## Review protocol
A second member recomputes two rows from raw snapshots, checks units and verifies that the chart matches the table. Store their review in a Workshop update. Keep the versioned memo beside the manifest and code, subject to data redistribution terms.

**Exercise:** write a 300-word note from your three panels. Then remove every unsupported causal claim. Add one disagreement between indicators rather than forcing a single narrative.

**Deliverable:** memo, three panels, release ledger, calculation tests and a documented refresh command. Mark unknown release times explicitly. A well-supported inconclusive briefing is preferable to an untestable forecast.

[Alpha Vantage documentation](https://www.alphavantage.co/documentation/)`,
      },
    ],
  },
  {
    slug: "fundamental-data-research",
    title: "Fundamental Data Research: Statements to Evidence",
    summary:
      "Reconcile provider statements, construct cash-quality and resilience measures, and turn a peer screen into a defensible research memo.",
    tags: "Equity, Financial statements",
    lessons: [
      {
        slug: "statement-contract",
        title: "Join Statements Without Inventing Comparability",
        content: `## Learning objective
Create a defensible company-period table before calculating a ratio.

## Data contract
Request INCOME_STATEMENT, BALANCE_SHEET and CASH_FLOW for one symbol first. Inspect annualReports and quarterlyReports separately. Join on symbol, fiscalDateEnding and reportedCurrency; never assume the first row in each response represents the same period. Record the provider retrieval time and preserve the original response privately.

| Type | Example | Alignment issue |
|---|---|---|
| Flow | Annual revenue | Covers a period |
| Stock | Total assets | Measured at a date |
| Ratio | Earnings / average assets | Needs beginning and ending stocks |

Current provider statements may incorporate restatements. A fiscal period end is not a filing publication timestamp. Use the resulting table for current diligence; a historical portfolio test requires evidence of when each version became available.

## Worked example
Company A reports in December and Company B in June. Matching both rows labelled 2025 does not create identical economic windows. Show the fiscal dates beside the comparison and decide whether this mismatch invalidates the question.

**Exercise:** make a fixture with out-of-order records, a missing currency and the string None. Your parser should sort records and quarantine incomplete observations. It must not convert an unavailable field into zero.

**Deliverable:** field dictionary, company-period table and a reconciliation of one company-year to its actual filing. Explain exclusions before presenting a peer rank.

[Income statements](https://www.alphavantage.co/documentation/#income-statement) · [Balance sheets](https://www.alphavantage.co/documentation/#balance-sheet) · [Cash flow](https://www.alphavantage.co/documentation/#cash-flow)`,
      },
      {
        slug: "cash-quality",
        title: "Measure Cash Conversion and Ask Better Questions",
        content: `## Learning objective
Use earnings-to-cash differences to prioritize diligence, with transparent denominators.

## Define the measures
Cash conversion = operating cash flow / net income, for positive net income. A simple cash-flow accrual proxy = (net income − operating cash flow) / average total assets. These are research definitions; they do not replace a detailed accounting reconciliation or establish an anomaly by themselves.

## Worked example
| Input | Toy value |
|---|---:|
| Net income | 120 |
| Operating cash flow | 90 |
| Beginning assets | 1,400 |
| Ending assets | 1,600 |

Average assets are 1,500. Cash conversion is 75%; the proxy is 30 / 1,500 = 2%. Verify that every monetary input uses the same currency and scale.

## Interpretation
Lower cash conversion may reflect working-capital investment rather than lower earnings quality. Acquisitions, stock compensation and changes in tax payments can complicate comparisons. Read the cash-flow discussion before assigning a label. Negative or near-zero earnings make the conversion ratio unstable; show an exception rather than a dramatic rank.

**Exercise:** repeat the calculation with net income −5, then explain why the resulting ratio is unsuitable for the same screen. Write a specific filing question about the difference between earnings and cash.

**Deliverable:** raw-input table, calculated measures, exception flags and one evidence-backed follow-up question per company. Compare a company with its own history before interpreting a cross-company difference.`,
      },
      {
        slug: "reinvestment-and-stress",
        title: "Distinguish Cash Generation from Financial Resilience",
        content: `## Learning objective
Build two complementary views: operating reinvestment and balance-sheet stress.

## Reinvestment
Operating margin = operating income / revenue. Cash after capex = operating cash flow − capital expenditure cash outflow. Check the provider's capex sign against the filing before normalizing; do not apply abs() blindly to an unfamiliar field. Cash after capex is not automatically the unlevered free cash flow needed by a DCF.

## Worked operating case
Revenue 1,000, operating income 180, operating cash flow 160 and capex outflow 70 produce an 18% margin and 90 of cash after capex. Chart the cash bridge from 160 through −70 to 90, with endpoints that reconcile.

## Static resilience case
Operating income 200 and interest expense 40 give a 5x coverage proxy. Reducing operating income by 30% gives 3.5x. Hold the denominator fixed only as a declared simplifying assumption. This exercise does not estimate default probability or future refinancing costs.

## Data checks
Do not sum overlapping debt fields. Reconcile cash definitions. Treat zero or negative interest expense separately. Exclude financial institutions from a generic industrial peer screen unless you redesign its definitions.

**Exercise:** build a base/adverse table and identify one assumption that would make the adverse case too optimistic.

**Deliverable:** reconciled cash bridge, coverage bars, source-field mapping and a limitations paragraph distinguishing a static sensitivity from a forecast.`,
      },
      {
        slug: "research-screen-memo",
        title: "Turn a Screen into a Research Decision",
        content: `## Learning objective
Communicate a small peer comparison without hiding uncertainty behind a composite score.

## Design the exhibit
Use a compact table with company, fiscal date, currency, source timestamp, raw inputs, ratios and exception flags. Right-align numbers, use separators for thousands, and display missing data as unavailable. Use navy and slate consistently; reserve an accent for the comparison under discussion. A source note and unit label belong on every export.

## Decision sequence
Select peers for a stated economic reason. Review accounting comparability. Compare each company's trend before ranking peers. Inspect the most surprising ratio against the filing. Finish with a diligence question, not an automatic buy recommendation.

## Worked review
A company has the strongest cash conversion but the weakest revenue growth. Show both. A single blended score can hide whether its apparent quality comes from reduced investment or improved operations. Present the conflicting evidence and define the next question.

**Exercise:** write a one-page memo with a three-company table, one supporting chart, an excluded-data note and two follow-up checks. Ask a teammate to reproduce a ratio without using your derived table.

**Deliverable:** memo, filing references, reproducible calculation script, data manifest and an explicit retain/reject decision on the usefulness of each measure. Any historical-return claim needs a separate point-in-time design, transaction-cost model and out-of-sample evaluation.`,
      },
    ],
  },
  {
    slug: "empirical-market-research",
    title: "Empirical Market Research: Exposure, FX & Diversification",
    summary:
      "Estimate changing exposures, test transparent FX rules, and evaluate diversification with chronological evidence and meaningful baselines.",
    tags: "Quant, Statistics, Portfolio research",
    lessons: [
      {
        slug: "synchronized-returns",
        title: "Build a Return Panel with a Known Clock",
        content: `## Learning objective
Construct a return panel whose dates, quote conventions and adjustments are explicit.

## Weekly equity and FX inputs
Use TIME_SERIES_WEEKLY_ADJUSTED for equity instruments and FX_WEEKLY for spot pairs. Inspect the actual response before hard-coding a field map. Sort dates ascending, reject duplicates, and remove incomplete weeks. The current FX week can change as new observations arrive.

For equity, calculate returns from adjusted close consistently; do not add dividends again. For EUR/USD, a quote of 1.10 means 1.10 USD per EUR. A rise to 1.12 is approximately +1.818% for EUR in USD terms. The reciprocal return is not exactly the negative of that return.

## Alignment
Calculate each instrument's returns on its own complete sequence, then join shared return periods. A missing week must not turn a two-week return into an observation labelled one week. Record all dropped intervals and counts. An inner join sacrifices coverage but makes the common sample explicit.

**Exercise:** test a duplicated date, a missing week and an inverted FX quote. Write a check showing that a two-period compounded return equals the price ratio over the same interval.

**Deliverable:** synchronized return panel, date-coverage table, quote/adjustment contract and parser tests. Spot FX returns exclude financing and forward points; adjusted equity data does not establish an executable trade at the signal timestamp.

[Weekly adjusted prices](https://www.alphavantage.co/documentation/#weeklyadj) · [Weekly FX](https://www.alphavantage.co/documentation/#fx-weekly)`,
      },
      {
        slug: "rolling-exposure",
        title: "Estimate Beta Without Pretending It Is Constant",
        content: `## Learning objective
Estimate a time-varying exposure and judge it against a simpler baseline.

## Estimator
For a 52-week trailing sample, beta = covariance(asset returns, market-proxy returns) / variance(market-proxy returns). Use the same sample and denominator convention for both quantities. Report the instrument used as a market proxy; an ETF is not the abstract market portfolio.

## Worked check
If asset returns are exactly twice the proxy returns and the proxy variance is nonzero, the estimated beta must be 2. If every proxy return is identical, the estimate is undefined. Do not replace that case with zero beta.

A beta estimated through week t can inform an exposure assessment after t. Predicting week t with a window that contains t leaks the observation into its own prediction. Rolling windows overlap heavily, so adjacent estimates are not independent experiments.

## Compare alternatives
Freeze a trailing window in a training period. Evaluate later prediction errors against beta=1 and an expanding-window estimate on identical dates. Report mean absolute error, large residuals and observation counts. Do not interpret a regression intercept as investable alpha without appropriate return and risk-free conventions.

**Exercise:** build the beta=2 and zero-variance fixtures, then explain one reason a rolling estimate could be less reliable than a fixed estimate.

**Deliverable:** beta chart, residual diagnostic, held-out comparison and a conclusion about stability, including the estimator's limitations.`,
      },
      {
        slug: "rules-and-lags",
        title: "Test a Rule with Costs and a Falsifiable Baseline",
        content: `## Learning objective
Translate a signal into an explicitly timed position series.

## Define the rule before results
For a simple FX study, compute a trailing 12-week spot return and hold a long position only when it is positive. Use complete weeks. Under a full-period lag convention, the position for interval t comes from a signal known before that interval. Record the convention in code and in the memo.

## Toy timing check
A positive signal first observed at the end of week 12 must not earn week 12's return. Construct a fixture with a large jump in that week; if the strategy captures it using the newly calculated signal, the implementation is leaking information.

Turnover is the absolute position change. A 10 bp one-way cost assumption applied to a move from 0 to 1 subtracts 0.001 of capital. A move from 1 to −1 is turnover 2 under this convention. Specify whether quoted costs are one-way or round-trip.

## Evaluation
Compare with always-long and flat baselines on the same dates. Use a chronological holdout and log every attempted window. Gross spot returns still omit financing, forward points and executable spread information, even after a hypothetical turnover-cost adjustment.

**Exercise:** test the timing trap and hand-calculate costs for positions 0, 1, 1, 0.

**Deliverable:** exposure timeline, gross and cost-adjusted spot-return tables, attempted-variant log and an implementation-gap note.`,
      },
      {
        slug: "correlation-and-review",
        title: "Evaluate Diversification under Stress",
        content: `## Learning objective
Explain when a portfolio diversifies less effectively and assess the reliability of that evidence.

## Consistent covariance
Use a shared return sample for the covariance matrix. Pairwise deletion can produce an internally inconsistent matrix because each entry uses different dates. Missing observations are not evidence of zero correlation. Show sample counts and guard against zero-variance instruments.

Portfolio variance is wᵀΣw. For two equally weighted assets with 10% volatility and correlation 1, portfolio volatility is 10%. With correlation 0 it is about 7.07%. These are arithmetic checks, not predicted future risks.

## Stress definition
Choose a trailing volatility measure and select a threshold using only the training segment. Freeze that rule before the holdout. Classifying a week by its own large realized loss is an after-the-fact descriptive grouping, not an information set available before that week.

## Exhibit design
Use a correlation heatmap with a fixed −1 to +1 scale, a rolling portfolio-volatility line and a normal/stress table with counts. Explain overlapping windows and limited stress observations. For weekly rebalancing, show turnover and compare with a stated buy-and-hold allocation.

**Exercise:** verify the two-asset calculations and describe why a visually dramatic heatmap based on five observations deserves caution.

**Deliverable:** notebook or script, three exhibits, calculation tests, holdout results and an independent-review update. A finding that diversification did not weaken is a valid answer.`,
      },
    ],
  },
];
