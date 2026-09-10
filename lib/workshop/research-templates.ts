import type { ProjectTemplate } from "./templates";
export const researchTemplates: ProjectTemplate[] = [
  {
    id: "yield-curve-monitor",
    title: "Map the Treasury curve and its turning points",
    summary:
      "Can a small set of curve measures describe rate regimes without treating inversion as a trading signal?",
    hypothesis:
      "Can a small set of curve measures describe rate regimes without treating inversion as a trading signal?",
    course: "macro-data-research",
    level: "Applied Macro",
    tags: ["Macro", "Alpha Vantage"],
    data: "TREASURY_YIELD. Documentation checked 10 Sep 2026; test your key before expanding the universe.",
    plan: `## Research question
Can a small set of curve measures describe rate regimes without treating inversion as a trading signal?

## Data sources and first request
- \`TREASURY_YIELD\`: interval=monthly, maturity=10year. Expected JSON root: \`data\`. Percent yield; compare identical dates and maturities. This is a yield series, not a bond total-return series.

Send server-side requests to \`https://www.alphavantage.co/query\` with \`function\`, the parameters above, and \`apikey\` from \`ALPHA_VANTAGE_API_KEY\`. Never include the key in a committed URL or browser bundle. Start with one response per endpoint; verify your account access before a batch. Preserve the raw response privately with a retrieval timestamp, parameter manifest excluding the key, and content hash.

## Access and validation gate
These endpoint names and parameters were checked against official documentation on 2026-09-10. Demo responses confirmed Treasury and CPI data roots; the other demo requests returned an Information message. This does not verify your key's entitlement. An HTTP 200 containing Information, Note or Error Message is not a dataset. Validate the required root, numeric values, units and dates; stop with a useful error on invalid payloads. Check current plan limits, cache responses, and use bounded retries rather than repeated blocked requests. Use a small, clearly labelled fixture for parser development if access is unavailable; never report fixture output as market evidence.

## Build sequence
Request monthly 3month, 2year and 10year maturities separately. Inner-join dates and report how many observations were excluded. Convert the 10y–2y and 10y–3m differences from percentage points into basis points by multiplying by 100. Define inversion as a negative spread; count consecutive months without bridging a missing observation.

## Worked check and evaluation
If 10y is 4.20% and 2y is 4.65%, the spread is −45 bp. Check this by hand. Compare the two spread definitions and a simple level-only description. Use the earliest available common period for development and a later period to test your calculations; do not optimize inversion thresholds on outcomes.

## Deliverables and visuals
A three-maturity curve chart, a spread chart with a zero reference, an inversion-duration table and a two-page interpretation. Use consistent axes and distinguish changes in yield from bond returns.

## Team handoff
Assign data ingestion, analysis and independent review to named collaborators. Keep decisions and blockers in Updates. Store code in the linked repository; record the environment, data manifest, run command, attempted variants and limitations in its README. Do not redistribute provider data unless the applicable terms allow it.

## Completion criteria
A teammate can reproduce calculations from the same permitted dataset; hand-calculated checks pass; charts show units, dates and sources; the conclusion answers the question even if no useful effect is found.

## Source links
[TREASURY_YIELD documentation](https://www.alphavantage.co/documentation/#treasury-yield)`,
    resources: [
      {
        label: "TREASURY_YIELD documentation",
        url: "https://www.alphavantage.co/documentation/#treasury-yield",
      },
    ],
    sourceIds: ["treasury"],
    milestones: [
      "Verify endpoint access and archive the data contract",
      "Build and test the transformations",
      "Produce the baseline and diagnostic visuals",
      "Complete independent review and publish the research memo",
    ],
  },
  {
    id: "inflation-labour-monitor",
    title: "Build an inflation and labour-market briefing",
    summary:
      "Can three transparent indicators produce a useful monthly economic briefing with an explicit freshness ledger?",
    hypothesis:
      "Can three transparent indicators produce a useful monthly economic briefing with an explicit freshness ledger?",
    course: "macro-data-research",
    level: "Applied Macro",
    tags: ["Macro", "Alpha Vantage"],
    data: "CPI; UNEMPLOYMENT; NONFARM_PAYROLL. Documentation checked 10 Sep 2026; test your key before expanding the universe.",
    plan: `## Research question
Can three transparent indicators produce a useful monthly economic briefing with an explicit freshness ledger?

## Data sources and first request
- \`CPI\`: interval=monthly. Expected JSON root: \`data\`. Index level; compute inflation from ratios. Observation months are not release timestamps; current history is not a vintage archive.
- \`UNEMPLOYMENT\`: no additional series parameters. Expected JSON root: \`data\`. Monthly rate; preserve reported units and revisions. Do not assign availability to the observation date.
- \`NONFARM_PAYROLL\`: no additional series parameters. Expected JSON root: \`data\`. Monthly employment level; compute changes after checking the unit field. Current values can contain revisions.

Send server-side requests to \`https://www.alphavantage.co/query\` with \`function\`, the parameters above, and \`apikey\` from \`ALPHA_VANTAGE_API_KEY\`. Never include the key in a committed URL or browser bundle. Start with one response per endpoint; verify your account access before a batch. Preserve the raw response privately with a retrieval timestamp, parameter manifest excluding the key, and content hash.

## Access and validation gate
These endpoint names and parameters were checked against official documentation on 2026-09-10. Demo responses confirmed Treasury and CPI data roots; the other demo requests returned an Information message. This does not verify your key's entitlement. An HTTP 200 containing Information, Note or Error Message is not a dataset. Validate the required root, numeric values, units and dates; stop with a useful error on invalid payloads. Check current plan limits, cache responses, and use bounded retries rather than repeated blocked requests. Use a small, clearly labelled fixture for parser development if access is unavailable; never report fixture output as market evidence.

## Build sequence
Cache each series once. Calculate CPI year-over-year change using the same calendar month one year earlier, unemployment change in percentage points, and the three-month average of monthly payroll changes. Record observation period, retrieval timestamp and independently verified release date separately. Keep the first version descriptive; do not present a current revised history as a real-time forecast.

## Worked check and evaluation
CPI 312 versus 300 implies 4% inflation; unemployment 4.2 versus 3.8 is +0.4 percentage points. Verify the payroll unit from the response before labelling jobs or thousands of jobs. Test missing months and compare each three-month measure with its single-month counterpart. Leave missing values visible.

## Deliverables and visuals
Three aligned small-multiple charts, a latest-observation table with units and freshness, a release ledger and a 300-word briefing explaining one disagreement between indicators.

## Team handoff
Assign data ingestion, analysis and independent review to named collaborators. Keep decisions and blockers in Updates. Store code in the linked repository; record the environment, data manifest, run command, attempted variants and limitations in its README. Do not redistribute provider data unless the applicable terms allow it.

## Completion criteria
A teammate can reproduce calculations from the same permitted dataset; hand-calculated checks pass; charts show units, dates and sources; the conclusion answers the question even if no useful effect is found.

## Source links
[CPI documentation](https://www.alphavantage.co/documentation/#cpi)
[UNEMPLOYMENT documentation](https://www.alphavantage.co/documentation/#unemployment)
[NONFARM_PAYROLL documentation](https://www.alphavantage.co/documentation/#nonfarm-payroll)`,
    resources: [
      {
        label: "CPI documentation",
        url: "https://www.alphavantage.co/documentation/#cpi",
      },
      {
        label: "UNEMPLOYMENT documentation",
        url: "https://www.alphavantage.co/documentation/#unemployment",
      },
      {
        label: "NONFARM_PAYROLL documentation",
        url: "https://www.alphavantage.co/documentation/#nonfarm-payroll",
      },
    ],
    sourceIds: ["cpi", "unemployment", "payroll"],
    milestones: [
      "Verify endpoint access and archive the data contract",
      "Build and test the transformations",
      "Produce the baseline and diagnostic visuals",
      "Complete independent review and publish the research memo",
    ],
  },
  {
    id: "macro-release-ledger",
    title: "Measure how a macro dataset changes over time",
    summary:
      "Which changes in successive snapshots are new observations, revisions, or ingestion mistakes?",
    hypothesis:
      "Which changes in successive snapshots are new observations, revisions, or ingestion mistakes?",
    course: "macro-data-research",
    level: "Applied Macro",
    tags: ["Macro", "Alpha Vantage"],
    data: "CPI; NONFARM_PAYROLL. Documentation checked 10 Sep 2026; test your key before expanding the universe.",
    plan: `## Research question
Which changes in successive snapshots are new observations, revisions, or ingestion mistakes?

## Data sources and first request
- \`CPI\`: interval=monthly. Expected JSON root: \`data\`. Index level; compute inflation from ratios. Observation months are not release timestamps; current history is not a vintage archive.
- \`NONFARM_PAYROLL\`: no additional series parameters. Expected JSON root: \`data\`. Monthly employment level; compute changes after checking the unit field. Current values can contain revisions.

Send server-side requests to \`https://www.alphavantage.co/query\` with \`function\`, the parameters above, and \`apikey\` from \`ALPHA_VANTAGE_API_KEY\`. Never include the key in a committed URL or browser bundle. Start with one response per endpoint; verify your account access before a batch. Preserve the raw response privately with a retrieval timestamp, parameter manifest excluding the key, and content hash.

## Access and validation gate
These endpoint names and parameters were checked against official documentation on 2026-09-10. Demo responses confirmed Treasury and CPI data roots; the other demo requests returned an Information message. This does not verify your key's entitlement. An HTTP 200 containing Information, Note or Error Message is not a dataset. Validate the required root, numeric values, units and dates; stop with a useful error on invalid payloads. Check current plan limits, cache responses, and use bounded retries rather than repeated blocked requests. Use a small, clearly labelled fixture for parser development if access is unavailable; never report fixture output as market evidence.

## Build sequence
Start collecting immutable snapshots on a documented schedule within your quota. Compare observations by date, never array index. Categorize new periods, changed values and disappeared observations. Preserve both versions and hashes. Do not invent old vintages: begin the research clock at the first snapshot actually archived.

## Worked check and evaluation
Use a small labelled fixture to test one new month, one revised old month and one missing row. A revision must not appear as a new economic period. Compare a latest-vintage view against the first-observed view only where you have both snapshots. Report the short archive length as a limitation.

## Deliverables and visuals
A snapshot manifest, revision ledger, diff tests and a visual showing original and revised values. Add a future research plan for a forecast comparison once enough genuine snapshots exist.

## Team handoff
Assign data ingestion, analysis and independent review to named collaborators. Keep decisions and blockers in Updates. Store code in the linked repository; record the environment, data manifest, run command, attempted variants and limitations in its README. Do not redistribute provider data unless the applicable terms allow it.

## Completion criteria
A teammate can reproduce calculations from the same permitted dataset; hand-calculated checks pass; charts show units, dates and sources; the conclusion answers the question even if no useful effect is found.

## Source links
[CPI documentation](https://www.alphavantage.co/documentation/#cpi)
[NONFARM_PAYROLL documentation](https://www.alphavantage.co/documentation/#nonfarm-payroll)`,
    resources: [
      {
        label: "CPI documentation",
        url: "https://www.alphavantage.co/documentation/#cpi",
      },
      {
        label: "NONFARM_PAYROLL documentation",
        url: "https://www.alphavantage.co/documentation/#nonfarm-payroll",
      },
    ],
    sourceIds: ["cpi", "payroll"],
    milestones: [
      "Verify endpoint access and archive the data contract",
      "Build and test the transformations",
      "Produce the baseline and diagnostic visuals",
      "Complete independent review and publish the research memo",
    ],
  },
  {
    id: "earnings-quality-screen",
    title: "Separate accounting earnings from cash generation",
    summary:
      "Do large earnings-to-cash gaps identify questions that deserve closer company research?",
    hypothesis:
      "Do large earnings-to-cash gaps identify questions that deserve closer company research?",
    course: "fundamental-data-research",
    level: "Applied Equity",
    tags: ["Equity", "Alpha Vantage"],
    data: "INCOME_STATEMENT; BALANCE_SHEET; CASH_FLOW. Documentation checked 10 Sep 2026; test your key before expanding the universe.",
    plan: `## Research question
Do large earnings-to-cash gaps identify questions that deserve closer company research?

## Data sources and first request
- \`INCOME_STATEMENT\`: symbol=IBM. Expected JSON root: \`annualReports\`. Join by fiscalDateEnding and reportedCurrency, not row position. Fiscal dates are not publication dates.
- \`BALANCE_SHEET\`: symbol=IBM. Expected JSON root: \`annualReports\`. Balance-sheet stocks require period-end alignment; use average assets when comparing annual flows.
- \`CASH_FLOW\`: symbol=IBM. Expected JSON root: \`annualReports\`. Check capital-expenditure sign against the filing; missing strings are not zeros. Current statements may be restated.

Send server-side requests to \`https://www.alphavantage.co/query\` with \`function\`, the parameters above, and \`apikey\` from \`ALPHA_VANTAGE_API_KEY\`. Never include the key in a committed URL or browser bundle. Start with one response per endpoint; verify your account access before a batch. Preserve the raw response privately with a retrieval timestamp, parameter manifest excluding the key, and content hash.

## Access and validation gate
These endpoint names and parameters were checked against official documentation on 2026-09-10. Demo responses confirmed Treasury and CPI data roots; the other demo requests returned an Information message. This does not verify your key's entitlement. An HTTP 200 containing Information, Note or Error Message is not a dataset. Validate the required root, numeric values, units and dates; stop with a useful error on invalid payloads. Check current plan limits, cache responses, and use bounded retries rather than repeated blocked requests. Use a small, clearly labelled fixture for parser development if access is unavailable; never report fixture output as market evidence.

## Build sequence
Start with three non-financial companies in one industry. Request all three statements for each company, budget nine calls, and use annual records initially. Align fiscal year ends and currencies. Reconcile netIncome between sources and operatingCashflow against the filing. Compute cash conversion as operating cash flow divided by net income only when net income is positive. Define the cash-flow accrual proxy as (net income − operating cash flow) / average total assets.

## Worked check and evaluation
Net income 120, cash flow 90 and average assets 1,500 give 75% cash conversion and a 2% accrual proxy. Show each denominator. Explain working capital, acquisitions and stock compensation before interpreting differences. Compare each company with its own previous years as well as peers. This is a current diligence screen, not proof of an historical anomaly.

## Deliverables and visuals
A peer table with source dates, cash-versus-earnings bars and one question per company backed by a filing citation. Include a reject/retain log for questionable fields.

## Team handoff
Assign data ingestion, analysis and independent review to named collaborators. Keep decisions and blockers in Updates. Store code in the linked repository; record the environment, data manifest, run command, attempted variants and limitations in its README. Do not redistribute provider data unless the applicable terms allow it.

## Completion criteria
A teammate can reproduce calculations from the same permitted dataset; hand-calculated checks pass; charts show units, dates and sources; the conclusion answers the question even if no useful effect is found.

## Source links
[INCOME_STATEMENT documentation](https://www.alphavantage.co/documentation/#income-statement)
[BALANCE_SHEET documentation](https://www.alphavantage.co/documentation/#balance-sheet)
[CASH_FLOW documentation](https://www.alphavantage.co/documentation/#cash-flow)`,
    resources: [
      {
        label: "INCOME_STATEMENT documentation",
        url: "https://www.alphavantage.co/documentation/#income-statement",
      },
      {
        label: "BALANCE_SHEET documentation",
        url: "https://www.alphavantage.co/documentation/#balance-sheet",
      },
      {
        label: "CASH_FLOW documentation",
        url: "https://www.alphavantage.co/documentation/#cash-flow",
      },
    ],
    sourceIds: ["income", "balance", "cash"],
    milestones: [
      "Verify endpoint access and archive the data contract",
      "Build and test the transformations",
      "Produce the baseline and diagnostic visuals",
      "Complete independent review and publish the research memo",
    ],
  },
  {
    id: "margin-reinvestment-map",
    title: "Explain growth through margins and reinvestment",
    summary:
      "Which companies turn revenue growth into operating profit and cash after capital expenditure?",
    hypothesis:
      "Which companies turn revenue growth into operating profit and cash after capital expenditure?",
    course: "fundamental-data-research",
    level: "Applied Equity",
    tags: ["Equity", "Alpha Vantage"],
    data: "INCOME_STATEMENT; CASH_FLOW. Documentation checked 10 Sep 2026; test your key before expanding the universe.",
    plan: `## Research question
Which companies turn revenue growth into operating profit and cash after capital expenditure?

## Data sources and first request
- \`INCOME_STATEMENT\`: symbol=IBM. Expected JSON root: \`annualReports\`. Join by fiscalDateEnding and reportedCurrency, not row position. Fiscal dates are not publication dates.
- \`CASH_FLOW\`: symbol=IBM. Expected JSON root: \`annualReports\`. Check capital-expenditure sign against the filing; missing strings are not zeros. Current statements may be restated.

Send server-side requests to \`https://www.alphavantage.co/query\` with \`function\`, the parameters above, and \`apikey\` from \`ALPHA_VANTAGE_API_KEY\`. Never include the key in a committed URL or browser bundle. Start with one response per endpoint; verify your account access before a batch. Preserve the raw response privately with a retrieval timestamp, parameter manifest excluding the key, and content hash.

## Access and validation gate
These endpoint names and parameters were checked against official documentation on 2026-09-10. Demo responses confirmed Treasury and CPI data roots; the other demo requests returned an Information message. This does not verify your key's entitlement. An HTTP 200 containing Information, Note or Error Message is not a dataset. Validate the required root, numeric values, units and dates; stop with a useful error on invalid payloads. Check current plan limits, cache responses, and use bounded retries rather than repeated blocked requests. Use a small, clearly labelled fixture for parser development if access is unavailable; never report fixture output as market evidence.

## Build sequence
Use three peers and at least three comparable annual periods if available. Map totalRevenue, operatingIncome, operatingCashflow and capitalExpenditures from inspected responses. Confirm capex signs in filings; normalize to a positive cash outflow only after that check. Compute operating margin, cash flow less capex, and capex/revenue. Keep this cash-flow measure distinct from unlevered DCF free cash flow.

## Worked check and evaluation
Revenue 1,000, operating income 180, operating cash flow 160 and capex outflow 70 imply an 18% operating margin and 90 of cash after capex. Test negative revenue, missing capex and fiscal-year mismatches. Compare margin and reinvestment trends separately; a single composite rank can conceal the reason for a change.

## Deliverables and visuals
A margin-versus-capex-intensity scatter, a revenue-to-operating-profit table, and a cash-flow bridge with reconciled start/end values. Write a short interpretation of investment versus deterioration.

## Team handoff
Assign data ingestion, analysis and independent review to named collaborators. Keep decisions and blockers in Updates. Store code in the linked repository; record the environment, data manifest, run command, attempted variants and limitations in its README. Do not redistribute provider data unless the applicable terms allow it.

## Completion criteria
A teammate can reproduce calculations from the same permitted dataset; hand-calculated checks pass; charts show units, dates and sources; the conclusion answers the question even if no useful effect is found.

## Source links
[INCOME_STATEMENT documentation](https://www.alphavantage.co/documentation/#income-statement)
[CASH_FLOW documentation](https://www.alphavantage.co/documentation/#cash-flow)`,
    resources: [
      {
        label: "INCOME_STATEMENT documentation",
        url: "https://www.alphavantage.co/documentation/#income-statement",
      },
      {
        label: "CASH_FLOW documentation",
        url: "https://www.alphavantage.co/documentation/#cash-flow",
      },
    ],
    sourceIds: ["income", "cash"],
    milestones: [
      "Verify endpoint access and archive the data contract",
      "Build and test the transformations",
      "Produce the baseline and diagnostic visuals",
      "Complete independent review and publish the research memo",
    ],
  },
  {
    id: "balance-sheet-resilience",
    title: "Build a balance-sheet resilience review",
    summary:
      "Which peers retain liquidity and interest coverage under a clearly stated operating stress?",
    hypothesis:
      "Which peers retain liquidity and interest coverage under a clearly stated operating stress?",
    course: "fundamental-data-research",
    level: "Applied Equity",
    tags: ["Equity", "Alpha Vantage"],
    data: "INCOME_STATEMENT; BALANCE_SHEET; CASH_FLOW. Documentation checked 10 Sep 2026; test your key before expanding the universe.",
    plan: `## Research question
Which peers retain liquidity and interest coverage under a clearly stated operating stress?

## Data sources and first request
- \`INCOME_STATEMENT\`: symbol=IBM. Expected JSON root: \`annualReports\`. Join by fiscalDateEnding and reportedCurrency, not row position. Fiscal dates are not publication dates.
- \`BALANCE_SHEET\`: symbol=IBM. Expected JSON root: \`annualReports\`. Balance-sheet stocks require period-end alignment; use average assets when comparing annual flows.
- \`CASH_FLOW\`: symbol=IBM. Expected JSON root: \`annualReports\`. Check capital-expenditure sign against the filing; missing strings are not zeros. Current statements may be restated.

Send server-side requests to \`https://www.alphavantage.co/query\` with \`function\`, the parameters above, and \`apikey\` from \`ALPHA_VANTAGE_API_KEY\`. Never include the key in a committed URL or browser bundle. Start with one response per endpoint; verify your account access before a batch. Preserve the raw response privately with a retrieval timestamp, parameter manifest excluding the key, and content hash.

## Access and validation gate
These endpoint names and parameters were checked against official documentation on 2026-09-10. Demo responses confirmed Treasury and CPI data roots; the other demo requests returned an Information message. This does not verify your key's entitlement. An HTTP 200 containing Information, Note or Error Message is not a dataset. Validate the required root, numeric values, units and dates; stop with a useful error on invalid payloads. Check current plan limits, cache responses, and use bounded retries rather than repeated blocked requests. Use a small, clearly labelled fixture for parser development if access is unavailable; never report fixture output as market evidence.

## Build sequence
Choose three non-financial peers. Inspect current assets, current liabilities, cash and cash equivalents, short/long debt fields, operating income and interest expense. Check whether debt fields overlap before summing. Reconcile net debt to the filing. Compute current ratio and an operating-income/interest-expense proxy only where denominators are meaningful.

## Worked check and evaluation
Operating income 200 and positive interest expense 40 imply 5x coverage; a 30% operating-income reduction gives 3.5x. This is a static scenario, not a forecast of default probability. Zero or negative interest expense needs a separate explanation, not an infinite score. Compare stress outcomes with the unshocked company and flag accounting differences.

## Deliverables and visuals
A liquidity table, debt reconciliation, base/stress coverage bars and a watchlist memo. Each watch item must include a follow-up question and the evidence that would remove it.

## Team handoff
Assign data ingestion, analysis and independent review to named collaborators. Keep decisions and blockers in Updates. Store code in the linked repository; record the environment, data manifest, run command, attempted variants and limitations in its README. Do not redistribute provider data unless the applicable terms allow it.

## Completion criteria
A teammate can reproduce calculations from the same permitted dataset; hand-calculated checks pass; charts show units, dates and sources; the conclusion answers the question even if no useful effect is found.

## Source links
[INCOME_STATEMENT documentation](https://www.alphavantage.co/documentation/#income-statement)
[BALANCE_SHEET documentation](https://www.alphavantage.co/documentation/#balance-sheet)
[CASH_FLOW documentation](https://www.alphavantage.co/documentation/#cash-flow)`,
    resources: [
      {
        label: "INCOME_STATEMENT documentation",
        url: "https://www.alphavantage.co/documentation/#income-statement",
      },
      {
        label: "BALANCE_SHEET documentation",
        url: "https://www.alphavantage.co/documentation/#balance-sheet",
      },
      {
        label: "CASH_FLOW documentation",
        url: "https://www.alphavantage.co/documentation/#cash-flow",
      },
    ],
    sourceIds: ["income", "balance", "cash"],
    milestones: [
      "Verify endpoint access and archive the data contract",
      "Build and test the transformations",
      "Produce the baseline and diagnostic visuals",
      "Complete independent review and publish the research memo",
    ],
  },
  {
    id: "rolling-beta-audit",
    title: "Track how market exposure changes",
    summary:
      "Does a fixed market beta describe exposure as well as a rolling estimate?",
    hypothesis:
      "Does a fixed market beta describe exposure as well as a rolling estimate?",
    course: "empirical-market-research",
    level: "Applied Quant",
    tags: ["Quant", "Alpha Vantage"],
    data: "TIME_SERIES_WEEKLY_ADJUSTED. Documentation checked 10 Sep 2026; test your key before expanding the universe.",
    plan: `## Research question
Does a fixed market beta describe exposure as well as a rolling estimate?

## Data sources and first request
- \`TIME_SERIES_WEEKLY_ADJUSTED\`: symbol=IBM. Expected JSON root: \`Weekly Adjusted Time Series\`. Use adjusted close consistently; do not add dividends again. Drop incomplete weeks and document historical coverage for each symbol.

Send server-side requests to \`https://www.alphavantage.co/query\` with \`function\`, the parameters above, and \`apikey\` from \`ALPHA_VANTAGE_API_KEY\`. Never include the key in a committed URL or browser bundle. Start with one response per endpoint; verify your account access before a batch. Preserve the raw response privately with a retrieval timestamp, parameter manifest excluding the key, and content hash.

## Access and validation gate
These endpoint names and parameters were checked against official documentation on 2026-09-10. Demo responses confirmed Treasury and CPI data roots; the other demo requests returned an Information message. This does not verify your key's entitlement. An HTTP 200 containing Information, Note or Error Message is not a dataset. Validate the required root, numeric values, units and dates; stop with a useful error on invalid payloads. Check current plan limits, cache responses, and use bounded retries rather than repeated blocked requests. Use a small, clearly labelled fixture for parser development if access is unavailable; never report fixture output as market evidence.

## Build sequence
Use two equity instruments plus a stated broad-market ETF proxy after checking symbol access. Sort complete weekly adjusted closes, align shared dates and compute simple returns. Fit a trailing 52-week beta as covariance(asset, proxy)/variance(proxy), with consistent sample conventions. Use it only for predictions after the estimation window. Do not call the regression intercept alpha without a risk-free convention and inference.

## Worked check and evaluation
Create a fixture where asset returns are exactly twice proxy returns; beta must be 2. Guard against zero variance and fewer than 52 observations. Compare next-period errors against beta=1 and an expanding-window estimate. Use a chronological holdout, show overlap dependence and avoid describing confidence intervals as independent weekly evidence.

## Deliverables and visuals
A rolling-beta line with observation counts, a residual diagnostic and a held-out error table. Publish dates, code, price conventions and a conclusion about stability rather than a performance claim.

## Team handoff
Assign data ingestion, analysis and independent review to named collaborators. Keep decisions and blockers in Updates. Store code in the linked repository; record the environment, data manifest, run command, attempted variants and limitations in its README. Do not redistribute provider data unless the applicable terms allow it.

## Completion criteria
A teammate can reproduce calculations from the same permitted dataset; hand-calculated checks pass; charts show units, dates and sources; the conclusion answers the question even if no useful effect is found.

## Source links
[TIME_SERIES_WEEKLY_ADJUSTED documentation](https://www.alphavantage.co/documentation/#weeklyadj)`,
    resources: [
      {
        label: "TIME_SERIES_WEEKLY_ADJUSTED documentation",
        url: "https://www.alphavantage.co/documentation/#weeklyadj",
      },
    ],
    sourceIds: ["weekly"],
    milestones: [
      "Verify endpoint access and archive the data contract",
      "Build and test the transformations",
      "Produce the baseline and diagnostic visuals",
      "Complete independent review and publish the research memo",
    ],
  },
  {
    id: "fx-trend-comparison",
    title: "Compare a spot-FX trend rule across pairs",
    summary:
      "Does a fixed lagged trend rule behave consistently across two spot currency pairs?",
    hypothesis:
      "Does a fixed lagged trend rule behave consistently across two spot currency pairs?",
    course: "empirical-market-research",
    level: "Applied Quant",
    tags: ["Quant", "Alpha Vantage"],
    data: "FX_WEEKLY. Documentation checked 10 Sep 2026; test your key before expanding the universe.",
    plan: `## Research question
Does a fixed lagged trend rule behave consistently across two spot currency pairs?

## Data sources and first request
- \`FX_WEEKLY\`: from_symbol=EUR, to_symbol=USD. Expected JSON root: \`Time Series FX (Weekly)\`. Quote is USD per EUR for this pair. Exclude the current partial week. Spot changes exclude financing and trading costs.

Send server-side requests to \`https://www.alphavantage.co/query\` with \`function\`, the parameters above, and \`apikey\` from \`ALPHA_VANTAGE_API_KEY\`. Never include the key in a committed URL or browser bundle. Start with one response per endpoint; verify your account access before a batch. Preserve the raw response privately with a retrieval timestamp, parameter manifest excluding the key, and content hash.

## Access and validation gate
These endpoint names and parameters were checked against official documentation on 2026-09-10. Demo responses confirmed Treasury and CPI data roots; the other demo requests returned an Information message. This does not verify your key's entitlement. An HTTP 200 containing Information, Note or Error Message is not a dataset. Validate the required root, numeric values, units and dates; stop with a useful error on invalid payloads. Check current plan limits, cache responses, and use bounded retries rather than repeated blocked requests. Use a small, clearly labelled fixture for parser development if access is unavailable; never report fixture output as market evidence.

## Build sequence
Start with EUR/USD and GBP/USD if accessible. Verify quote orientation, discard partial weeks, and compute a trailing 12-week spot return. Freeze a long/flat rule before inspecting results. Apply the signal with a full-period lag under a stated close-to-close convention. Cache the two pair requests and align dates explicitly.

## Worked check and evaluation
A quote moving from 1.10 to 1.12 gives about +1.818% for the base currency. Test the reciprocal convention independently. Compare gross spot exposure with always-long and flat baselines, then run explicit turnover-cost sensitivities. Spot returns omit deposit interest, financing and forward points, so they are not an executable carry-inclusive strategy return.

## Deliverables and visuals
A pair-by-pair exposure timeline, gross spot-return paths, turnover and cost-sensitivity tables, and an implementation-gaps memo. Freeze the rule before evaluating the second pair.

## Team handoff
Assign data ingestion, analysis and independent review to named collaborators. Keep decisions and blockers in Updates. Store code in the linked repository; record the environment, data manifest, run command, attempted variants and limitations in its README. Do not redistribute provider data unless the applicable terms allow it.

## Completion criteria
A teammate can reproduce calculations from the same permitted dataset; hand-calculated checks pass; charts show units, dates and sources; the conclusion answers the question even if no useful effect is found.

## Source links
[FX_WEEKLY documentation](https://www.alphavantage.co/documentation/#fx-weekly)`,
    resources: [
      {
        label: "FX_WEEKLY documentation",
        url: "https://www.alphavantage.co/documentation/#fx-weekly",
      },
    ],
    sourceIds: ["fx"],
    milestones: [
      "Verify endpoint access and archive the data contract",
      "Build and test the transformations",
      "Produce the baseline and diagnostic visuals",
      "Complete independent review and publish the research memo",
    ],
  },
  {
    id: "diversification-stress-map",
    title: "Find when diversification weakens",
    summary:
      "How much does the benefit of a fixed equal-weight basket change in high-volatility periods?",
    hypothesis:
      "How much does the benefit of a fixed equal-weight basket change in high-volatility periods?",
    course: "empirical-market-research",
    level: "Applied Quant",
    tags: ["Quant", "Alpha Vantage"],
    data: "TIME_SERIES_WEEKLY_ADJUSTED. Documentation checked 10 Sep 2026; test your key before expanding the universe.",
    plan: `## Research question
How much does the benefit of a fixed equal-weight basket change in high-volatility periods?

## Data sources and first request
- \`TIME_SERIES_WEEKLY_ADJUSTED\`: symbol=IBM. Expected JSON root: \`Weekly Adjusted Time Series\`. Use adjusted close consistently; do not add dividends again. Drop incomplete weeks and document historical coverage for each symbol.

Send server-side requests to \`https://www.alphavantage.co/query\` with \`function\`, the parameters above, and \`apikey\` from \`ALPHA_VANTAGE_API_KEY\`. Never include the key in a committed URL or browser bundle. Start with one response per endpoint; verify your account access before a batch. Preserve the raw response privately with a retrieval timestamp, parameter manifest excluding the key, and content hash.

## Access and validation gate
These endpoint names and parameters were checked against official documentation on 2026-09-10. Demo responses confirmed Treasury and CPI data roots; the other demo requests returned an Information message. This does not verify your key's entitlement. An HTTP 200 containing Information, Note or Error Message is not a dataset. Validate the required root, numeric values, units and dates; stop with a useful error on invalid payloads. Check current plan limits, cache responses, and use bounded retries rather than repeated blocked requests. Use a small, clearly labelled fixture for parser development if access is unavailable; never report fixture output as market evidence.

## Build sequence
Choose three liquid ETFs with different stated exposures, verify data access, and archive their descriptions. Compute complete weekly adjusted returns on common dates. Use trailing 26-week correlations and a fixed equal-weight basket rebalanced weekly. Define high-volatility observations using only trailing information and a threshold selected in the training segment.

## Worked check and evaluation
Check a perfect-correlation fixture and a zero-variance fixture. Compare portfolio volatility with the weighted average of individual volatilities, and inspect rolling versus full-window correlation. Never replace missing pairwise data with zero correlation. Show turnover and several cost assumptions for the rebalanced portfolio; compare with a documented buy-and-hold allocation.

## Deliverables and visuals
A consistently scaled correlation heatmap, rolling portfolio-volatility chart and normal/stress comparison table. Include sample counts, a chronological holdout and a discussion of concentration during stress.

## Team handoff
Assign data ingestion, analysis and independent review to named collaborators. Keep decisions and blockers in Updates. Store code in the linked repository; record the environment, data manifest, run command, attempted variants and limitations in its README. Do not redistribute provider data unless the applicable terms allow it.

## Completion criteria
A teammate can reproduce calculations from the same permitted dataset; hand-calculated checks pass; charts show units, dates and sources; the conclusion answers the question even if no useful effect is found.

## Source links
[TIME_SERIES_WEEKLY_ADJUSTED documentation](https://www.alphavantage.co/documentation/#weeklyadj)`,
    resources: [
      {
        label: "TIME_SERIES_WEEKLY_ADJUSTED documentation",
        url: "https://www.alphavantage.co/documentation/#weeklyadj",
      },
    ],
    sourceIds: ["weekly"],
    milestones: [
      "Verify endpoint access and archive the data contract",
      "Build and test the transformations",
      "Produce the baseline and diagnostic visuals",
      "Complete independent review and publish the research memo",
    ],
  },
];
