export const alphaVantageSources = {
  treasury: {
    function: "TREASURY_YIELD",
    params: {
      interval: "monthly",
      maturity: "10year",
    },
    root: "data",
    url: "https://www.alphavantage.co/documentation/#treasury-yield",
    checkedAt: "2026-09-10",
    caveat:
      "Percent yield; compare identical dates and maturities. This is a yield series, not a bond total-return series.",
    demoCheck: "Expected data root received",
  },
  cpi: {
    function: "CPI",
    params: {
      interval: "monthly",
    },
    root: "data",
    url: "https://www.alphavantage.co/documentation/#cpi",
    checkedAt: "2026-09-10",
    caveat:
      "Index level; compute inflation from ratios. Observation months are not release timestamps; current history is not a vintage archive.",
    demoCheck: "Expected data root received",
  },
  unemployment: {
    function: "UNEMPLOYMENT",
    params: {},
    root: "data",
    url: "https://www.alphavantage.co/documentation/#unemployment",
    checkedAt: "2026-09-10",
    caveat:
      "Monthly rate; preserve reported units and revisions. Do not assign availability to the observation date.",
    demoCheck: "Demo returned Information; member-key access not tested",
  },
  payroll: {
    function: "NONFARM_PAYROLL",
    params: {},
    root: "data",
    url: "https://www.alphavantage.co/documentation/#nonfarm-payroll",
    checkedAt: "2026-09-10",
    caveat:
      "Monthly employment level; compute changes after checking the unit field. Current values can contain revisions.",
    demoCheck: "Demo returned Information; member-key access not tested",
  },
  income: {
    function: "INCOME_STATEMENT",
    params: {
      symbol: "IBM",
    },
    root: "annualReports",
    url: "https://www.alphavantage.co/documentation/#income-statement",
    checkedAt: "2026-09-10",
    caveat:
      "Join by fiscalDateEnding and reportedCurrency, not row position. Fiscal dates are not publication dates.",
    demoCheck: "Demo returned Information; member-key access not tested",
  },
  balance: {
    function: "BALANCE_SHEET",
    params: {
      symbol: "IBM",
    },
    root: "annualReports",
    url: "https://www.alphavantage.co/documentation/#balance-sheet",
    checkedAt: "2026-09-10",
    caveat:
      "Balance-sheet stocks require period-end alignment; use average assets when comparing annual flows.",
    demoCheck: "Demo returned Information; member-key access not tested",
  },
  cash: {
    function: "CASH_FLOW",
    params: {
      symbol: "IBM",
    },
    root: "annualReports",
    url: "https://www.alphavantage.co/documentation/#cash-flow",
    checkedAt: "2026-09-10",
    caveat:
      "Check capital-expenditure sign against the filing; missing strings are not zeros. Current statements may be restated.",
    demoCheck: "Demo returned Information; member-key access not tested",
  },
  weekly: {
    function: "TIME_SERIES_WEEKLY_ADJUSTED",
    params: {
      symbol: "IBM",
    },
    root: "Weekly Adjusted Time Series",
    url: "https://www.alphavantage.co/documentation/#weeklyadj",
    checkedAt: "2026-09-10",
    caveat:
      "Use adjusted close consistently; do not add dividends again. Drop incomplete weeks and document historical coverage for each symbol.",
    demoCheck: "Demo returned Information; member-key access not tested",
  },
  fx: {
    function: "FX_WEEKLY",
    params: {
      from_symbol: "EUR",
      to_symbol: "USD",
    },
    root: "Time Series FX (Weekly)",
    url: "https://www.alphavantage.co/documentation/#fx-weekly",
    checkedAt: "2026-09-10",
    caveat:
      "Quote is USD per EUR for this pair. Exclude the current partial week. Spot changes exclude financing and trading costs.",
    demoCheck: "Demo returned Information; member-key access not tested",
  },
};
