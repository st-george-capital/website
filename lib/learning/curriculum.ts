import { quantWorkshops } from "./quant-workshops";
export type LabKind =
  "options" | "valuation" | "bonds" | "fx" | "execution" | "regime" | "process";
export interface Workshop {
  projectTemplate?: string;
  track: string;
  level: string;
  prerequisites: string;
  title: string;
  intro: string;
  outcomes: string[];
  lab: LabKind;
  steps: { title: string; detail: string }[];
  brief: string;
  solution: string;
  deliverable: string;
  rubric: string[];
  quiz: {
    prompt: string;
    choices: string[];
    answer: number;
    explanation: string;
  }[];
  sources?: { title: string; url: string }[];
}
export const curriculum: Record<string, Workshop> = {
  ...quantWorkshops,
  "options-foundations": {
    track: "Markets",
    level: "Foundation",
    prerequisites: "Percentages and basic profit-and-loss arithmetic.",
    title: "Separate a good forecast from a profitable option",
    lab: "options",
    intro:
      "Follow one contract from premium paid to expiry. Distinguish the stock direction, option payoff, and actual profit before considering a trade.",
    outcomes: [
      "Calculate payoff, profit and break-even separately.",
      "Explain which party has a right and which has an obligation.",
      "Size a position using a loss budget and contract multiplier.",
    ],
    steps: [
      {
        title: "Specify the contract",
        detail:
          "For the example, use one standard equity call covering 100 shares, a $100 strike, and a $5 premium per share. Adjusted contracts and index options can have different deliverables or settlement.",
      },
      {
        title: "Separate payoff from profit",
        detail:
          "At $110 on expiry, intrinsic value is $10 per share. Subtract the $5 premium: profit is $500 for one contract, before fees. At $103, the stock rose but the call still loses $200.",
      },
      {
        title: "Stress the obligation",
        detail:
          "A long call can lose the entire premium. An uncovered short call has potentially unlimited loss. A covered call still carries most of the underlying stock’s downside; premium is not free yield.",
      },
    ],
    brief:
      "You have a $50,000 portfolio and a maximum $500 loss budget for an option purchase. The call costs $5 per share and covers 100 shares. How many contracts fit the budget? What happens if the stock closes at $103 or $110 at expiry?",
    solution:
      "One contract uses the full $500 premium budget. At $103, payoff is $300 and profit is −$200. At $110, payoff is $1,000 and profit is +$500. Break-even is $105. These are expiry outcomes; before expiry, time value and volatility also affect the price. Fees reduce returns.",
    deliverable:
      "A three-row expiry scenario table, a break-even calculation, and a sentence explaining why a correct directional view can still lose money.",
    rubric: [
      "Premium is deducted once, and the 100-share multiplier is applied once.",
      "Payoff is never negative for the purchased option; profit can be.",
      "The loss budget uses premium at risk, not stock notional.",
    ],
    quiz: [
      {
        prompt:
          "A $100-strike call costs $5. At expiry the stock is $103. What is profit per share?",
        choices: ["+$3", "−$2", "+$8"],
        answer: 1,
        explanation:
          "Payoff is max(103 − 100, 0) = $3. Subtract the $5 premium to get −$2.",
      },
      {
        prompt: "Which statement about a covered call is correct?",
        choices: [
          "The stock’s downside disappears.",
          "It caps upside and retains substantial stock downside.",
          "Its premium guarantees a positive return.",
        ],
        answer: 1,
        explanation:
          "The call premium provides only a limited cushion against a decline in the shares.",
      },
    ],
    sources: [
      {
        title: "OIC · Options basics",
        url: "https://www.optionseducation.org/optionsoverview/options-basics",
      },
      {
        title: "OIC · Covered calls",
        url: "https://www.optionseducation.org/strategies/all-strategies/covered-call-buy-write",
      },
    ],
  },
  "equity-investing-fundamentals": {
    track: "Research",
    level: "Foundation",
    prerequisites: "Basic percentages; no accounting background required.",
    title: "Turn operating assumptions into a valuation",
    lab: "valuation",
    intro:
      "Build an auditable path from revenue to cash flow to equity value. The point is to expose what must be true for the valuation to hold.",
    outcomes: [
      "Connect earnings, reinvestment and free cash flow.",
      "Reconcile enterprise value with equity value.",
      "Identify the assumption driving the largest valuation change.",
    ],
    steps: [
      {
        title: "Start with economics",
        detail:
          "Revenue of $1,000m and a 20% operating margin produce $200m of EBIT. At a 25% tax rate, after-tax operating profit is $150m.",
      },
      {
        title: "Account for reinvestment",
        detail:
          "Add $30m depreciation, subtract $50m capital expenditure and $10m incremental working capital. Free cash flow to the firm is $120m.",
      },
      {
        title: "Separate value from conviction",
        detail:
          "At 10% WACC and 3% perpetual growth, a simplified steady-state enterprise value is $120m × 1.03 / (0.10 − 0.03) = $1,765.7m. This is a terminal-style illustration, not a complete multi-year DCF.",
      },
    ],
    brief:
      "Use the operating assumptions above, $300m debt, $50m cash and 50m shares. Estimate equity value and price per share. Then raise WACC to 11% without changing the business.",
    solution:
      "Net debt is $250m. The base equity value is $1,515.7m, or $30.31 per share. At 11% WACC, enterprise value is $1,545m and equity value is $1,295m, or $25.90 per share. A one-percentage-point change in the discount rate reduces the indicated price by about 14.6%.",
    deliverable:
      "A one-page valuation with assumptions, cash-flow reconciliation, net-debt bridge and one sensitivity.",
    rubric: [
      "Uses firm cash flow with WACC.",
      "Subtracts debt and adds cash.",
      "Describes the steady-state limitation and tests the valuation.",
    ],
    quiz: [
      {
        prompt:
          "Which adjustment converts enterprise value toward equity value?",
        choices: ["Add net debt.", "Subtract net debt.", "Multiply by shares."],
        answer: 1,
        explanation:
          "Debt holders have a claim ahead of equity; excess cash increases value attributable to shareholders.",
      },
      {
        prompt: "Why does higher capex reduce current free cash flow?",
        choices: [
          "It is a cash reinvestment.",
          "It always lowers reported revenue.",
          "It changes the share count.",
        ],
        answer: 0,
        explanation:
          "Capital expenditure consumes cash even though it is not fully expensed in current-period earnings.",
      },
    ],
  },
  "fixed-income-bonds": {
    track: "Markets",
    level: "Foundation",
    prerequisites: "Present value and percentage changes.",
    title: "Price a bond and explain its rate exposure",
    lab: "bonds",
    intro:
      "Work from promised cash flows to price, then compare an exact repricing with a duration estimate.",
    outcomes: [
      "Price annual coupon cash flows.",
      "Distinguish coupon rate from yield to maturity.",
      "Use duration as an approximation rather than a guarantee.",
    ],
    steps: [
      {
        title: "Map cash flows",
        detail:
          "A five-year, $1,000 face-value bond with a 5% annual coupon pays $50 each year and returns principal at maturity.",
      },
      {
        title: "Discount consistently",
        detail:
          "With a 5% annual yield the price is $1,000. At a 6% yield, discount all five coupons and principal at 6%; price falls to about $957.88.",
      },
      {
        title: "Explain model limits",
        detail:
          "Modified duration estimates the local price sensitivity to yield. Convexity matters for larger changes; credit, liquidity and embedded options can move prices independently.",
      },
    ],
    brief:
      "Reprice the bond from 5% to 6% yield. Compare the percentage change with a modified-duration estimate using duration 4.33 years.",
    solution:
      "Exact price is approximately $957.88, a −4.21% move. The first-order duration estimate is −4.33 × 0.01 = −4.33%. The difference reflects curvature. The example assumes annual coupons, unchanged credit quality and no call option.",
    deliverable:
      "A cash-flow schedule, exact price calculation and a short explanation of the duration approximation error.",
    rubric: [
      "Discounts principal as well as coupons.",
      "Converts 100 basis points to 0.01.",
      "Names at least one risk not captured by duration.",
    ],
    quiz: [
      {
        prompt:
          "If yields rise, what happens to a fixed-rate bond’s price, all else equal?",
        choices: ["It rises.", "It falls.", "Its coupon rate resets."],
        answer: 1,
        explanation:
          "Existing fixed payments become less attractive relative to newly available yields.",
      },
      {
        prompt:
          "A duration of 6 and a 50bp yield rise imply roughly what price change?",
        choices: ["−3%", "−300%", "+3%"],
        answer: 0,
        explanation: "−6 × 0.005 = −0.03, or −3%, before convexity.",
      },
    ],
    sources: [
      {
        title: "FINRA · Duration and interest-rate risk",
        url: "https://www.finra.org/investors/alerts/duration-what-interest-rate-hike-could-do-your-bond-portfolio",
      },
    ],
  },
  "foreign-exchange-fx": {
    track: "Markets",
    level: "Foundation",
    prerequisites: "Ratios, percentages and currency notation.",
    title: "Measure currency exposure before forecasting it",
    lab: "fx",
    intro:
      "Follow a foreign-currency asset back into the investor’s home currency. A positive local return can become a loss after conversion.",
    outcomes: [
      "Read a base/quote currency pair correctly.",
      "Translate foreign-asset returns into home-currency returns.",
      "Separate interest carry from spot-currency risk.",
    ],
    steps: [
      {
        title: "Define the quote",
        detail:
          "EUR/USD = 1.10 means one euro buys 1.10 US dollars. A fall to 1.045 means the euro has depreciated 5% against the dollar.",
      },
      {
        title: "Combine returns",
        detail:
          "For an unhedged USD investor, home return = (1 + EUR asset return) × (ending EUR/USD ÷ starting EUR/USD) − 1.",
      },
      {
        title: "Separate the hedge",
        detail:
          "A forward hedge changes currency exposure and introduces pricing, cash-flow and counterparty considerations. An interest-rate differential is not a guaranteed excess return.",
      },
    ],
    brief:
      "A USD investor buys a EUR asset at EUR/USD 1.10. The asset returns 4% in EUR and the euro falls 5% versus USD. Calculate the USD return and explain why simply adding the returns is approximate.",
    solution:
      "(1.04 × 0.95) − 1 = −1.2%. Adding 4% and −5% gives −1%; the missing −0.2% is the interaction term. A USD 10,000 unhedged investment becomes USD 9,880 before costs.",
    deliverable:
      "A currency-labelled return bridge and a comparison of hedged versus unhedged exposure, without assuming the hedge is free.",
    rubric: [
      "Names the investor’s home currency.",
      "Uses the correct quote direction.",
      "Includes the cross-product of returns.",
    ],
    quiz: [
      {
        prompt:
          "EUR/USD rises from 1.10 to 1.155. Which currency strengthened?",
        choices: ["EUR", "USD", "Neither"],
        answer: 0,
        explanation: "One euro now buys 5% more dollars.",
      },
      {
        prompt: "Does positive interest carry eliminate FX risk?",
        choices: [
          "Yes.",
          "No; an adverse spot move can exceed the carry.",
          "Only for a one-year holding period.",
        ],
        answer: 1,
        explanation:
          "Carry and exchange-rate changes are separate components of return.",
      },
    ],
    sources: [
      {
        title: "BIS · April 2025 FX turnover survey",
        url: "https://www.bis.org/publications/202509-commentary-otc-derivatives",
      },
    ],
  },
  "trading-market-mechanics": {
    track: "Markets",
    level: "Foundation",
    prerequisites: "Weighted averages and trade notional.",
    title: "Execute against a finite order book",
    lab: "execution",
    intro:
      "See why a quoted price is not necessarily the price available for your whole order.",
    outcomes: [
      "Calculate volume-weighted execution price.",
      "Distinguish spread cost from market impact.",
      "Explain the fill-risk trade-off of a limit order.",
    ],
    steps: [
      {
        title: "Read available depth",
        detail:
          "The example ask book offers 100 shares at $100.01, 200 at $100.03 and 300 at $100.06. Depth is finite and can change before execution.",
      },
      {
        title: "Walk the book",
        detail:
          "A 250-share market buy consumes 100 shares at the first level and 150 at the second. VWAP is (100 × 100.01 + 150 × 100.03) / 250 = $100.022.",
      },
      {
        title: "Benchmark execution",
        detail:
          "Against a $100 arrival midpoint, the cost is $0.022 per share, or 2.2bp. A $100.01 limit avoids higher prices but may fill only 100 shares—or fewer if available liquidity changes.",
      },
    ],
    brief:
      "Buy 250 shares from the example book. Calculate total spend, VWAP and cost relative to a $100 midpoint. Describe what changes if the order is limited to $100.01.",
    solution:
      "Spend is $25,005.50; VWAP is $100.022. Arrival-price shortfall is $5.50, or 2.2bp on $25,000. At the stated snapshot, a $100.01 limit can fill 100 shares; the remainder waits or is cancelled depending on the order instruction.",
    deliverable:
      "An execution plan naming urgency, order type, price limit, expected fill and an evaluation benchmark.",
    rubric: [
      "Uses share-weighted prices.",
      "States that displayed liquidity is a snapshot.",
      "Balances price protection against completion risk.",
    ],
    quiz: [
      {
        prompt: "A market order guarantees which of these?",
        choices: [
          "The displayed best price for all shares.",
          "Neither a fixed price nor an unconditional fill in every market state.",
          "No slippage.",
        ],
        answer: 1,
        explanation:
          "Market orders prioritize execution, but available liquidity, halts and venue rules still matter.",
      },
      {
        prompt: "What is the main trade-off of a passive limit order?",
        choices: [
          "Better price control but uncertain fill.",
          "Guaranteed full execution.",
          "No opportunity cost.",
        ],
        answer: 0,
        explanation:
          "The market can move away while the order remains unfilled.",
      },
    ],
  },
  "macro-investing": {
    track: "Markets",
    level: "Intermediate",
    prerequisites: "Basic bonds, equities and inflation concepts.",
    title: "Build a conditional macro view",
    lab: "regime",
    intro:
      "Replace a single forecast with scenarios, transmission channels and observable invalidation criteria.",
    outcomes: [
      "Separate a data level from a surprise versus expectations.",
      "Map growth and inflation shocks into conditional asset exposures.",
      "Define what would invalidate a macro view.",
    ],
    steps: [
      {
        title: "State the surprise",
        detail:
          "“Inflation is high” describes a level. “Services inflation is falling faster than the market expects” is a potentially differentiated view. The relevant comparison is with expectations at the trade date.",
      },
      {
        title: "Trace transmission",
        detail:
          "A disinflation surprise can reduce expected policy rates, support bond prices and lower discount rates. Weak growth or wider credit spreads can offset those benefits for equities.",
      },
      {
        title: "Set a reversal test",
        detail:
          "Track wage growth, service prices and policy communication. Specify a threshold and review date before entering a position; correlations and policy responses can change.",
      },
    ],
    brief:
      "Inflation slows while activity surveys weaken. Propose a base case and an adverse case for a long-duration position, then identify two observations that could overturn the idea.",
    solution:
      "Base: lower expected inflation and policy rates support duration. Adverse: term premium rises because of supply or fiscal concerns even as inflation slows. A renewed rise in underlying inflation or a persistent rise in long yields despite lower policy expectations challenges the transmission story.",
    deliverable:
      "A one-page scenario map with a catalyst calendar, instrument choice, risk budget and review triggers.",
    rubric: [
      "Separates observed facts from forecasts.",
      "Explains the transmission channel.",
      "Includes a plausible loss scenario and a measurable review rule.",
    ],
    quiz: [
      {
        prompt: "A favourable macro outcome guarantees a trade profit when…",
        choices: [
          "It was forecast correctly.",
          "It is already priced in.",
          "It never guarantees profit on its own.",
        ],
        answer: 2,
        explanation:
          "Returns depend on the difference from expectations, instrument choice, timing and risk premia.",
      },
      {
        prompt: "Which is the more useful invalidation rule?",
        choices: [
          "“Exit if the story changes.”",
          "“Review after two consecutive upside inflation surprises and a rise in expected policy rates.”",
          "“Hold until profitable.”",
        ],
        answer: 1,
        explanation:
          "A specific observation and review condition can be assessed before losses encourage rationalization.",
      },
    ],
  },
  "sgc-stock-selection-framework": {
    track: "Research",
    level: "Applied",
    prerequisites:
      "Complete the course lessons or bring equivalent background.",
    title: "From a screen to a falsifiable thesis",
    intro:
      "A low multiple is a starting point. Build a chain from an economic mechanism to cash flows, then ask what evidence could disprove it.",
    outcomes: [
      "Turn a screen result into an investigation.",
      "Distinguish variant perception from a company description.",
      "Link evidence to a model driver.",
    ],
    lab: "process",
    steps: [
      {
        title: "Screen",
        detail:
          "Two firms trade at 12× earnings. Firm A converts 90% of earnings to cash; Firm B converts 50%. That difference is a research question, not an automatic buy signal.",
      },
      {
        title: "Investigate",
        detail:
          "Inspect receivables, deferred revenue, capex and acquisition effects. Compare at least three years before labelling the conversion gap structural.",
      },
      {
        title: "Underwrite",
        detail:
          "Suppose Firm A can retain customers at a lower service cost. Model the cost change, date the evidence and specify the retention outcome that would contradict the thesis.",
      },
    ],
    brief:
      "A company has 1,000 customers paying $10,000 annually. You forecast 5% more customers and a 2% price increase. Quantify revenue growth, then name the evidence needed for each assumption.",
    solution:
      "Revenue rises from $10m to 1,050 × $10,200 = $10.71m, or 7.1%. Customer growth needs acquisition and churn evidence; price growth needs renewal or contract evidence. The 0.1% interaction matters. A screen does not establish either assumption.",
    deliverable:
      "A research log separating facts, interpretations, model assumptions and disconfirming evidence.",
    rubric: [
      "Shows the arithmetic and labels assumptions.",
      "Connects evidence to a decision.",
      "States the main limitation and a disconfirming observation.",
    ],
    quiz: [
      {
        prompt: "Which is a differentiated thesis?",
        choices: [
          "The company is a market leader.",
          "Renewal data imply lower churn than the model assumes, lifting next-year revenue.",
          "The share price recently fell.",
        ],
        answer: 1,
        explanation:
          "The second statement identifies evidence, a disagreement and a financial mechanism.",
      },
    ],
  },
  "writing-sgc-equity-research-report": {
    track: "Research",
    level: "Applied",
    prerequisites:
      "Complete the course lessons or bring equivalent background.",
    title: "Write a report that a reviewer can audit",
    intro:
      "Make each important claim traceable to evidence, an assumption and a valuation consequence. Treat the report as a decision document.",
    outcomes: [
      "Separate facts, estimates and recommendations.",
      "Tie the narrative to valuation assumptions.",
      "Write a catalyst with a date and a measurable test.",
    ],
    lab: "process",
    steps: [
      {
        title: "Claim",
        detail:
          "Weak: “Margins will improve.” Stronger: “The mix shift raises gross margin by 100bp if the new product reaches 20% of revenue.” This is a hypothesis until supported.",
      },
      {
        title: "Evidence",
        detail:
          "Attach the reporting period, definition and source to mix and margin figures. Adjust comparisons for acquisitions and changes in segment reporting.",
      },
      {
        title: "Valuation",
        detail:
          "Carry the margin assumption through tax, reinvestment and cash flow. Do not change a target price without updating the assumptions that support it.",
      },
    ],
    brief:
      "Revenue is $2bn. Your thesis assumes a 100bp EBIT margin improvement at a 25% tax rate. Calculate the incremental after-tax operating profit, then explain why it is not automatically incremental free cash flow.",
    solution:
      "Incremental EBIT is $20m; after-tax operating profit rises $15m. Additional capex or working capital can consume some of that gain. State the implementation cost, ramp period and evidence that the improvement is repeatable.",
    deliverable:
      "A two-page initiation brief: thesis, evidence table, model bridge, catalyst calendar and a bear-case challenge.",
    rubric: [
      "Shows the arithmetic and labels assumptions.",
      "Connects evidence to a decision.",
      "States the main limitation and a disconfirming observation.",
    ],
    quiz: [
      {
        prompt: "Which item makes a catalyst useful?",
        choices: [
          "A dated event and an observable result that tests the thesis.",
          "A large addressable market.",
          "An optimistic target price.",
        ],
        answer: 0,
        explanation:
          "A catalyst should identify when and how uncertainty may resolve, not merely repeat the opportunity.",
      },
    ],
  },
  "five-minute-sgc-pitch": {
    track: "Communication",
    level: "Applied",
    prerequisites:
      "Complete the course lessons or bring equivalent background.",
    title: "Deliver a complete decision in five minutes",
    intro:
      "Choose the few facts that change the investment decision. Rehearse a clear thesis and a credible downside response.",
    outcomes: [
      "Allocate time to thesis, evidence, valuation and risk.",
      "Use numbers that support a causal argument.",
      "Answer a challenge without inventing certainty.",
    ],
    lab: "process",
    steps: [
      {
        title: "Opening · 30 seconds",
        detail:
          "State the company, view, valuation horizon and the specific assumption you think the market has wrong. Label all example prices as assumptions.",
      },
      {
        title: "Evidence · 150 seconds",
        detail:
          "Use two pillars at 75 seconds each. For each: make one claim, cite one observable fact, explain one financial consequence.",
      },
      {
        title: "Decision · 120 seconds",
        detail:
          "Spend 60 seconds on valuation and 60 on catalysts, downside and the condition that changes your mind. Leave deeper detail for questions.",
      },
    ],
    brief:
      "Your rehearsal lasts seven minutes. It contains a 90-second company history and six unconnected valuation multiples. Cut it to five minutes without removing the bear case.",
    solution:
      "Reduce history to the operating context needed for the thesis, ideally 20–30 seconds. Keep the most relevant valuation anchor and one cross-check. Use the saved time to state the driver, a dated catalyst and the loss scenario. A shorter pitch is better only if it preserves the decision logic.",
    deliverable:
      "A timed five-minute script plus three 30-second answers: “What is priced in?”, “What breaks the thesis?” and “Why this instrument?”",
    rubric: [
      "Shows the arithmetic and labels assumptions.",
      "Connects evidence to a decision.",
      "States the main limitation and a disconfirming observation.",
    ],
    quiz: [
      {
        prompt: "What should you do when asked for a figure you cannot verify?",
        choices: [
          "Invent a plausible range.",
          "State the limit of your knowledge, explain the implication and commit to checking the source.",
          "Repeat the target price.",
        ],
        answer: 1,
        explanation:
          "A precise boundary around uncertainty is more useful than unsupported confidence.",
      },
    ],
  },
  "writing-sgc-our-take": {
    track: "Research",
    level: "Applied",
    prerequisites:
      "Complete the course lessons or bring equivalent background.",
    title: "Turn a macro headline into a testable argument",
    intro:
      "A thematic piece should explain a mechanism and its limits. Strong writing lets readers distinguish evidence from interpretation.",
    outcomes: [
      "Frame an answerable research question.",
      "Identify the unit, period and counterfactual for each statistic.",
      "Explain what would change the conclusion.",
    ],
    lab: "process",
    steps: [
      {
        title: "Question",
        detail:
          "Replace “Private credit is growing” with “Does the funding structure make losses more likely to propagate during a liquidity shock?” The second question has a mechanism to investigate.",
      },
      {
        title: "Evidence",
        detail:
          "Compare like-for-like measures. Assets under management, outstanding loans and annual origination are different quantities; growth in one does not establish growth in another.",
      },
      {
        title: "Counterargument",
        detail:
          "Test whether locked-up capital reduces run risk even if valuation marks adjust slowly. Acknowledge this channel before judging the overall vulnerability.",
      },
    ],
    brief:
      "A chart shows a lending market growing from $500bn to $1tn in five years. Draft a factual sentence and a separate interpretive sentence. Calculate annualized growth.",
    solution:
      "Fact: the measured stock doubled over five years, assuming consistent coverage and definitions. CAGR = 2^(1/5) − 1 ≈ 14.9%. Interpretation: the expansion may increase the importance of the market to financing, but the chart alone does not establish systemic risk or poor underwriting.",
    deliverable:
      "A 600-word memo with a research question, mechanism diagram, source ledger and strongest counterargument.",
    rubric: [
      "Shows the arithmetic and labels assumptions.",
      "Connects evidence to a decision.",
      "States the main limitation and a disconfirming observation.",
    ],
    quiz: [
      {
        prompt: "Which claim is supported by a stock of assets doubling?",
        choices: [
          "Default risk doubled.",
          "The measured stock doubled, subject to consistent definitions.",
          "Annual lending doubled every year.",
        ],
        answer: 1,
        explanation:
          "A level comparison does not by itself establish a flow, a causal mechanism or a risk outcome.",
      },
    ],
  },
  "writing-sgc-investment-strategy": {
    track: "Portfolio",
    level: "Applied",
    prerequisites:
      "Complete the course lessons or bring equivalent background.",
    title: "Convert a view into a bounded risk budget",
    intro:
      "A strategy needs an instrument, exposure, loss scenario and review rule. A good macro story alone does not supply any of them.",
    outcomes: [
      "Translate a thesis into an instrument-specific exposure.",
      "Size from a loss budget rather than conviction alone.",
      "Define a monitoring and exit process.",
    ],
    lab: "process",
    steps: [
      {
        title: "View",
        detail:
          "Specify the surprise you expect and the horizon. Identify which instrument expresses it with the fewest unwanted exposures.",
      },
      {
        title: "Size",
        detail:
          "For a $1m portfolio and a 0.5% stress-loss budget, allowable loss is $5,000. If the instrument loses 4% in your stress, a $125,000 position uses that budget before costs.",
      },
      {
        title: "Monitor",
        detail:
          "Track the thesis evidence, exposure and liquidity separately. A stop instruction does not guarantee a fill at the stop price; stress a gap beyond it.",
      },
    ],
    brief:
      "The $125,000 position can gap down 7% rather than the planned 4%. Recalculate the portfolio loss and the size that would preserve the $5,000 stress budget.",
    solution:
      "At 7%, loss is $8,750, or 0.875% of the portfolio. To keep the same stress budget, size at $5,000 / 0.07 ≈ $71,429. This is scenario sizing, not a guarantee that losses cannot exceed the budget.",
    deliverable:
      "An implementation sheet with notional, exposures, stress P&L, liquidity assumptions and explicit review dates.",
    rubric: [
      "Shows the arithmetic and labels assumptions.",
      "Connects evidence to a decision.",
      "States the main limitation and a disconfirming observation.",
    ],
    quiz: [
      {
        prompt: "What does a stop-loss order guarantee?",
        choices: [
          "The maximum possible loss.",
          "A fixed execution price in a gap.",
          "Neither of those.",
        ],
        answer: 2,
        explanation:
          "The execution price can differ materially when markets gap or liquidity disappears.",
      },
    ],
  },
  "sales-and-trading-primer": {
    track: "Careers",
    level: "Applied",
    prerequisites:
      "Complete the course lessons or bring equivalent background.",
    title: "Explain a client trade and the desk’s residual risk",
    intro:
      "Follow a client request from quotation to execution, hedge and P&L explanation. Focus on risk transfer and service quality.",
    outcomes: [
      "Distinguish client needs from the desk’s inventory preference.",
      "Calculate spread capture and mark-to-market P&L.",
      "Identify execution and hedge risks.",
    ],
    lab: "process",
    steps: [
      {
        title: "Client objective",
        detail:
          "A client needs to sell 1,000 shares promptly. Clarify size, urgency, benchmark and any price constraint before discussing the execution.",
      },
      {
        title: "Desk execution",
        detail:
          "The desk buys 1,000 shares at $99.98 and later sells at $100.01. Gross spread capture is $30 before fees, hedging costs and other expenses.",
      },
      {
        title: "Residual risk",
        detail:
          "If the shares are marked at $99.90 before the sale, inventory is down $80 from purchase cost. Quoting a spread does not make the position riskless.",
      },
    ],
    brief:
      "You buy 1,000 shares at $99.98, sell 600 at $100.01 and mark the remaining 400 at $99.90. Explain realized and unrealized P&L.",
    solution:
      "Realized P&L is 600 × $0.03 = $18. Unrealized P&L is 400 × −$0.08 = −$32. Total is −$14 before costs. The completed sales earned a spread but the residual inventory lost more.",
    deliverable:
      "A 90-second morning-call idea stating the client need, proposed instrument, key risk and next observable catalyst.",
    rubric: [
      "Shows the arithmetic and labels assumptions.",
      "Connects evidence to a decision.",
      "States the main limitation and a disconfirming observation.",
    ],
    quiz: [
      {
        prompt:
          "A desk captures a spread on one fill. Is the day necessarily profitable?",
        choices: [
          "Yes.",
          "No; inventory moves, hedges and costs can outweigh it.",
          "Only if the client is institutional.",
        ],
        answer: 1,
        explanation:
          "Transaction-level spread is only one contributor to total desk P&L.",
      },
    ],
  },
  "finance-for-engineers": {
    track: "Careers",
    level: "Applied",
    prerequisites:
      "Complete the course lessons or bring equivalent background.",
    title: "Translate a technical project into a financial decision",
    intro:
      "Keep the technical rigor, but explain the economic problem, measurement choices and limits in language a reviewer can assess.",
    outcomes: [
      "Connect a technical method to a business decision.",
      "Separate backtest results from deployable performance.",
      "Explain failure modes and validation in plain language.",
    ],
    lab: "process",
    steps: [
      {
        title: "Decision",
        detail:
          "Begin with the choice your project supports: allocate risk, forecast demand or reduce execution cost. Do not open with a list of libraries.",
      },
      {
        title: "Validation",
        detail:
          "Separate training, tuning and evaluation periods. For financial time series, preserve time order and prevent features from using future information.",
      },
      {
        title: "Economics",
        detail:
          "A strategy earns 8% gross with 300% annual one-way turnover. At 20bp per traded dollar, estimated cost is 0.6% of capital; net is 7.4% before financing and other costs.",
      },
    ],
    brief:
      "Your model beats a baseline in-sample but not in a later holdout. Write a three-sentence interview explanation that is honest and still demonstrates good judgment.",
    solution:
      "“I tested whether the signal improved the allocation decision relative to a simple baseline. The in-sample improvement did not persist in a later time period, so I did not treat it as deployable alpha. I then checked leakage, parameter stability and costs, and documented the conditions under which the model failed.” The result is a validation finding, not a performance claim.",
    deliverable:
      "A two-minute project explanation and a one-page validation note with baseline, time split, costs and limitations.",
    rubric: [
      "Shows the arithmetic and labels assumptions.",
      "Connects evidence to a decision.",
      "States the main limitation and a disconfirming observation.",
    ],
    quiz: [
      {
        prompt:
          "Which validation is most informative for a time-dependent trading signal?",
        choices: [
          "Randomly shuffle every observation.",
          "Choose the best model on the final holdout.",
          "Use time-ordered evaluation and keep the final holdout out of tuning.",
        ],
        answer: 2,
        explanation:
          "Temporal separation reduces leakage and keeps the final evaluation from becoming another tuning set.",
      },
    ],
  },
};
