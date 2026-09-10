import type { Workshop } from "./curriculum";
export const quantWorkshops: Record<string, Workshop> = {
  "quant-data-foundations": {
    track: "Quant",
    level: "Foundation",
    prerequisites: "Basic Python syntax and percentage arithmetic.",
    title: "Audit a small market-data pipeline",
    intro:
      "Turn raw provider data into an accountable research input. Work from a data contract to tests, then hand the result to another member.",
    lab: "process",
    projectTemplate: "data-quality",
    outcomes: [
      "Define a timestamped, adjustment-aware dataset.",
      "Cache API results and detect invalid responses.",
      "Build tests and a reproducible data manifest.",
    ],
    steps: [
      {
        title: "Contract",
        detail:
          "Choose three instruments and one frequency. Record source, currency, price field, timezone and retrieval time before calculating a return.",
      },
      {
        title: "Validate",
        detail:
          "Inject a duplicate date and a zero price into a test fixture. Stop calculations on invalid records and preserve the original data.",
      },
      {
        title: "Reproduce",
        detail:
          "A teammate should be able to rerun validation using a documented environment and the same archived dataset version.",
      },
    ],
    brief:
      "Your source reports prices 100, 104 and 101.92. A teammate adds the two period returns and reports +2%. Recalculate the wealth change and describe a test that catches the error.",
    solution:
      "The returns are +4% and −2%. Multiplying 1.04 × 0.98 gives 1.0192, or +1.92%. Test that compounded period returns equal final price divided by first price minus one for a series without intervening distributions.",
    deliverable:
      "An ingestion script, raw-data manifest, validation tests and a short exception ledger.",
    rubric: [
      "No API keys in files, URLs or outputs committed to Git.",
      "Adjustment and timezone conventions are explicit.",
      "A second member can reproduce row counts and returns.",
    ],
    quiz: [
      {
        prompt:
          "An HTTP 200 response contains an Information message and no time series. What should ingestion do?",
        choices: [
          "Cache it as an empty dataset.",
          "Reject it as a data response and explain the access or limit issue.",
          "Replace prices with zeros.",
        ],
        answer: 1,
        explanation:
          "Transport success is not dataset validity. Silent empty data can create false research conclusions.",
      },
    ],
    sources: [
      {
        title: "Alpha Vantage documentation",
        url: "https://www.alphavantage.co/documentation/",
      },
      {
        title: "Alpha Vantage plan limits",
        url: "https://www.alphavantage.co/premium/",
      },
    ],
  },
  "statistical-research-foundations": {
    track: "Quant",
    level: "Foundation",
    prerequisites: "Means, standard deviations and basic probability.",
    title: "Write an evidence standard before running the test",
    intro:
      "Define what would count as support, failure and uncertainty. A negative result is useful when the experiment is well designed.",
    lab: "process",
    projectTemplate: "earnings-event",
    outcomes: [
      "Distinguish an estimated effect from a tradable claim.",
      "Account for dependence and repeated testing.",
      "Pre-specify an event study and a meaningful baseline.",
    ],
    steps: [
      {
        title: "Claim",
        detail:
          "Specify the event, observation window, baseline and primary metric. Freeze the timing rule before examining the most attractive result.",
      },
      {
        title: "Uncertainty",
        detail:
          "A sample mean of 0.10% with independent-observation standard error 0.10% has a rough 95% normal interval of −0.096% to +0.296%.",
      },
      {
        title: "Selection",
        detail:
          "Twenty independent 5% tests produce at least one false positive with probability 1 − 0.95^20 ≈ 64.2%. Record the full search process.",
      },
    ],
    brief:
      "You test 20 variants and report only the one with the highest Sharpe ratio. What information does a reviewer need before interpreting it?",
    solution:
      "The complete candidate set, selection rule, information timing, dependence assumptions, cost model and evaluation period. The selected statistic is influenced by the search. Freeze a specification and evaluate genuinely later evidence; do not relabel a repeatedly inspected sample as untouched.",
    deliverable:
      "A pre-analysis plan and an experiment ledger, followed by a result with an uncertainty estimate.",
    rubric: [
      "Defines the unit of observation.",
      "Records all attempted variants.",
      "Separates development evidence from final evaluation.",
    ],
    quiz: [
      {
        prompt:
          "Duplicating every observation doubles the rows. What happens to independent information?",
        choices: ["It doubles.", "It stays the same.", "It quadruples."],
        answer: 1,
        explanation:
          "Copies do not create independent evidence. A naive standard error can become misleadingly small.",
      },
    ],
  },
  "backtesting-without-leakage": {
    track: "Quant",
    level: "Applied",
    prerequisites:
      "The market-data and statistical foundations courses, or equivalent experience.",
    title: "Catch a deliberately leaky backtest",
    intro:
      "Compare the information a rule actually had with the information a backtest accidentally gives it.",
    lab: "process",
    projectTemplate: "momentum",
    outcomes: [
      "Align observations, signals and executable returns.",
      "Calculate turnover costs and compounded wealth.",
      "Produce a frozen out-of-sample evaluation and risk report.",
    ],
    steps: [
      {
        title: "Observe",
        detail:
          "A signal based on this week’s completed return becomes available after that observation. It cannot choose whether to hold during the return it just observed.",
      },
      {
        title: "Execute",
        detail:
          "Use the position established under your explicit next-period execution convention. Subtract costs on the traded notional.",
      },
      {
        title: "Evaluate",
        detail:
          "Compare with a passive baseline on the same dates. Report losses, exposure and sensitivity to costs, not only the best metric.",
      },
    ],
    brief:
      "Returns are +2%, −1%, +3%, −2%. A rule invests after a positive period. Compare same-period weights with lagged weights, starting flat and ignoring costs.",
    solution:
      "Same-period weights select the two positive returns and avoid the losses: an invalid hindsight result. Lagged weights are [0, 1, 0, 1], giving [0%, −1%, 0%, −2%]. Compounded wealth is 0.99 × 0.98 = 0.9702, a −2.98% result before costs.",
    deliverable:
      "A timing unit test, gross/net wealth curves, a passive benchmark and an honest rejection or continuation memo.",
    rubric: [
      "Signals cannot see the return they are applied to.",
      "Costs use an explicit turnover convention.",
      "The holdout was not used to tune the final rule.",
    ],
    quiz: [
      {
        prompt:
          "You change a parameter after seeing the final test result. That period is now…",
        choices: [
          "Still untouched.",
          "Part of the development evidence.",
          "A guaranteed validation set.",
        ],
        answer: 1,
        explanation:
          "The test influenced the choice. Fresh confirmation requires evidence not used in that choice.",
      },
    ],
  },
  "portfolio-risk-lab": {
    track: "Quant",
    level: "Applied",
    prerequisites: "Returns, volatility and basic algebra.",
    title: "Challenge a portfolio’s risk assumptions",
    intro:
      "Use transparent arithmetic to test whether a proposed exposure fits its risk budget, then stress the assumptions behind that budget.",
    lab: "process",
    projectTemplate: "vol-target",
    outcomes: [
      "Calculate two-asset portfolio volatility.",
      "Build a lagged and capped volatility-targeting rule.",
      "Explain drawdown, tail estimates and scenario sizing.",
    ],
    steps: [
      {
        title: "Diversify",
        detail:
          "Equal weights in assets with 20% and 10% volatility give about 11.18% portfolio volatility at zero correlation, but 15% at correlation one.",
      },
      {
        title: "Scale",
        detail:
          "A 10% volatility target and a 20% estimate imply 50% exposure. Low estimated volatility can increase exposure, so cap leverage and floor the estimate.",
      },
      {
        title: "Stress",
        detail:
          "A $125,000 position loses $5,000 at a 4% decline but $8,750 at a 7% gap. A scenario budget does not bound every possible loss.",
      },
    ],
    brief:
      "Your sample’s ten loss observations are −2, −1, 0, 0, 1, 1, 2, 3, 5 and 8 percentage points. Under a worst-two-observation convention, estimate the worst-20% tail average and state two limitations.",
    solution:
      "The average is (8 + 5) / 2 = 6.5%. Ten observations give a highly unstable tail estimate; the sample may omit important future shocks. Declare the finite-sample convention and supplement it with explicit scenarios rather than treating 6.5% as a maximum loss.",
    deliverable:
      "A risk sheet with correlation sensitivity, exposure limits, historical drawdown and two forward-looking stress scenarios.",
    rubric: [
      "Uses consistent frequency and decimal units.",
      "Risk estimates use only lagged information.",
      "Distinguishes an estimate from a guarantee.",
    ],
    quiz: [
      {
        prompt:
          "A low volatility estimate implies very high target exposure. What belongs in the rule?",
        choices: [
          "Unlimited leverage.",
          "An explicit leverage cap and volatility floor.",
          "The following period’s volatility.",
        ],
        answer: 1,
        explanation:
          "Caps and floors constrain unstable scaling; future observations would introduce leakage.",
      },
    ],
  },
};
