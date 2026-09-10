import type { Workshop } from "./curriculum";
export const researchWorkshops: Record<string, Workshop> = {
  "macro-data-research": {
    track: "Macro",
    level: "Applied",
    projectTemplate: "yield-curve-monitor",
    title: "Build a release-aware macro briefing",
    prerequisites: "Percentage arithmetic and the Macro Investing course.",
    intro:
      "Develop a small research question into a reproducible project, with transparent calculations and independent review.",
    lab: "process",
    outcomes: [
      "Define the three observation/release/retrieval clocks.",
      "Transform index levels and rates with correct units.",
      "Publish an auditable briefing with a revision ledger.",
    ],
    steps: [
      {
        title: "Contract",
        detail:
          "Record series, unit, parameters and all three clocks. Leave unknown release timestamps blank.",
      },
      {
        title: "Calculate",
        detail:
          "Align calendar periods, compute inflation and spreads, and test missing values and unit conversions.",
      },
      {
        title: "Review",
        detail:
          "Recompute a table row from the archived response and challenge a causal claim in the memo.",
      },
    ],
    brief:
      "Two monthly Treasury yields are 4.20% (10y) and 4.65% (2y). CPI rises from 300 to 312. Calculate the slope and inflation; explain whether the observation dates establish trade availability.",
    solution:
      "The slope is −45 basis points. Year-over-year inflation is 4% if 300 is the same month one year earlier. Observation dates do not establish release availability; verify publication timestamps or keep the analysis descriptive.",
    deliverable:
      "A versioned research memo, source manifest, calculation tests and the exhibits specified in the linked project starter.",
    rubric: [
      "Raw observations reconcile with every worked calculation.",
      "Units, timing, exclusions and data access are documented.",
      "A teammate can reproduce the result and inspect the limitations.",
    ],
    quiz: [
      {
        prompt:
          "Which date determines whether a macro observation could enter a historical signal?",
        choices: [
          "The observation month alone.",
          "A verified public release timestamp for the available vintage.",
          "The date printed at the start of the chart.",
        ],
        answer: 1,
        explanation:
          "A current revised value and its observation month do not recreate the historical information set.",
      },
    ],
    sources: [
      {
        title: "Alpha Vantage: treasury yield",
        url: "https://www.alphavantage.co/documentation/#treasury-yield",
      },
      {
        title: "Alpha Vantage: cpi",
        url: "https://www.alphavantage.co/documentation/#cpi",
      },
      {
        title: "Alpha Vantage: nonfarm payroll",
        url: "https://www.alphavantage.co/documentation/#nonfarm-payroll",
      },
    ],
  },
  "fundamental-data-research": {
    track: "Equity",
    level: "Applied",
    projectTemplate: "earnings-quality-screen",
    title: "Reconcile a cash-quality comparison",
    prerequisites:
      "Financial statement basics and Equity Investing Fundamentals.",
    intro:
      "Develop a small research question into a reproducible project, with transparent calculations and independent review.",
    lab: "process",
    outcomes: [
      "Join statements by company, period and currency.",
      "Reconcile cash conversion and reinvestment measures.",
      "Write a diligence memo with comparable inputs.",
    ],
    steps: [
      {
        title: "Align",
        detail:
          "Match fiscal dates and currencies. Separate annual flows from period-end stocks and check the filing.",
      },
      {
        title: "Calculate",
        detail:
          "Show all raw inputs and denominators; mark missing and unstable ratios as exceptions.",
      },
      {
        title: "Challenge",
        detail:
          "Explain working capital or accounting differences before treating a ratio as evidence of quality.",
      },
    ],
    brief:
      "Net income is 120, operating cash flow is 90, beginning assets are 1,400 and ending assets are 1,600. Compute cash conversion and the defined cash-flow accrual proxy. What if net income is negative?",
    solution:
      "Average assets are 1,500. Cash conversion is 75%; the accrual proxy is (120 − 90) / 1,500 = 2%. Negative earnings need a separate explanation; do not rank the conversion ratio with positive-earnings peers.",
    deliverable:
      "A versioned research memo, source manifest, calculation tests and the exhibits specified in the linked project starter.",
    rubric: [
      "Raw observations reconcile with every worked calculation.",
      "Units, timing, exclusions and data access are documented.",
      "A teammate can reproduce the result and inspect the limitations.",
    ],
    quiz: [
      {
        prompt:
          "A cash-flow field is the string None. What should the parser do?",
        choices: [
          "Replace it with zero.",
          "Remove the entire company without a note.",
          "Preserve it as unavailable and flag calculations that require it.",
        ],
        answer: 2,
        explanation:
          "Missing information is not evidence of zero cash flow. Silent substitution distorts ratios.",
      },
    ],
    sources: [
      {
        title: "Alpha Vantage: income statement",
        url: "https://www.alphavantage.co/documentation/#income-statement",
      },
      {
        title: "Alpha Vantage: balance sheet",
        url: "https://www.alphavantage.co/documentation/#balance-sheet",
      },
      {
        title: "Alpha Vantage: cash flow",
        url: "https://www.alphavantage.co/documentation/#cash-flow",
      },
    ],
  },
  "empirical-market-research": {
    track: "Quant",
    level: "Applied",
    projectTemplate: "rolling-beta-audit",
    title: "Test exposure with a frozen information clock",
    prerequisites: "Quant Data Foundations and Backtesting Without Leakage.",
    intro:
      "Develop a small research question into a reproducible project, with transparent calculations and independent review.",
    lab: "process",
    outcomes: [
      "Build synchronized complete-week return panels.",
      "Evaluate rolling exposure against a fixed baseline.",
      "Audit cost, timing and diversification assumptions.",
    ],
    steps: [
      {
        title: "Synchronize",
        detail:
          "Check weekly completeness, quote orientation and adjusted-close conventions before joining returns.",
      },
      {
        title: "Estimate",
        detail:
          "Fit trailing exposure on earlier observations; guard against zero variance and inadequate samples.",
      },
      {
        title: "Evaluate",
        detail:
          "Compare held-out errors with beta=1, publish residuals, and explain overlap dependence.",
      },
    ],
    brief:
      "A fixture has asset returns equal to twice nonconstant market returns. What beta should it produce? Can the window including week t predict that same week?",
    solution:
      "Beta is 2 because covariance is twice market variance. A window including week t must not be used as a before-t prediction. Freeze the estimation window before each held-out observation.",
    deliverable:
      "A versioned research memo, source manifest, calculation tests and the exhibits specified in the linked project starter.",
    rubric: [
      "Raw observations reconcile with every worked calculation.",
      "Units, timing, exclusions and data access are documented.",
      "A teammate can reproduce the result and inspect the limitations.",
    ],
    quiz: [
      {
        prompt:
          "A newly calculated end-of-week signal earns that same week’s jump. What is wrong?",
        choices: [
          "Nothing: the calculation used a weekly close.",
          "The signal is using information unavailable before the return interval.",
          "The cost assumption is necessarily too high.",
        ],
        answer: 1,
        explanation:
          "Knowing the closing observation does not let a new position capture the preceding interval.",
      },
    ],
    sources: [
      {
        title: "Alpha Vantage: weeklyadj",
        url: "https://www.alphavantage.co/documentation/#weeklyadj",
      },
      {
        title: "Alpha Vantage: fx weekly",
        url: "https://www.alphavantage.co/documentation/#fx-weekly",
      },
    ],
  },
};
