import { z, type ZodTypeAny } from 'zod';
import { formatZodError, lenient, toJsonSchema, type JsonSchema } from './schema';
import {
  FILTER_OPS,
  TABLE_NAMES,
  describeTables,
  getFundPortfolio,
  getMacroRegime,
  queryTable,
  summarizeTable,
} from './database';
import {
  getCompanyOverview,
  getEarningsHistory,
  getFredSeries,
  getPriceHistory,
  getStockQuote,
  searchFredSeries,
  searchTicker,
} from './markets';
import { getComps, getResearchReports, listMyDcfModels, runDcf } from './valuation';
import {
  getEarningsCallSummary,
  getEarningsEstimates,
  getEarningsReactions,
  getInsiderActivity,
  getInstitutionalHoldings,
  getNewsSentiment,
  getOptionsPositioning,
} from './research';
import { getG10Rates, getLatestCvarRun, getMacroOutlook, getTradeSignalsSummary } from './dashboards';
import type { ToolContext } from './context';
import { draftResearchReport, editResearchReport } from './drafting';
import { RECOMMENDATIONS } from '@/lib/consigliere/report-draft';
import { analyzePortfolio, compareMethods, getSectors, optimizePortfolio, METHODS } from '@/lib/consigliere/portfolio/tools';
import { COV_METHODS } from '@/lib/consigliere/portfolio/risk';
import type { ConsigliereToolGroup, ConsigliereToolSpec } from '@/lib/consigliere/types';

interface ConsigliereTool {
  name: string;
  group: ConsigliereToolGroup;
  description: string;
  schema: z.AnyZodObject;
  run: (args: any, ctx: ToolContext) => Promise<unknown>;
}

const opt = lenient.optional;
const lenientBoolean = z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean());
const ticker = z.string().describe('Ticker symbol, e.g. AAPL');
const decimal = (description: string, min = 0, max = 1) =>
  opt(lenient.number(z.number().min(min).max(max))).describe(description);
/** One value for every forecast year, or a list with one value per year. */
const perYear = (description: string, min: number, max: number) =>
  opt(
    z.preprocess(
      (v) => (typeof v === 'number' || (typeof v === 'string' && !v.trim().startsWith('[')) ? [v] : v),
      lenient.array(lenient.number(z.number().min(min).max(max)))
    )
  ).describe(description);

const dcfOverrides = {
  forecast_years: opt(lenient.number(z.number().int().min(3).max(10))).describe('Forecast years, default 5'),
  revenue_growth: perYear('Annual revenue growth as a decimal (0.08 = 8%), one number for all years or one per year', -0.5, 1),
  ebit_margin: perYear('EBIT margin as a decimal, one number or one per year', -0.5, 0.8),
  capex_pct_revenue: decimal('Capex as a share of revenue (decimal)', 0, 0.6),
  tax_rate: decimal('Tax rate (decimal)', 0, 0.5),
  risk_free_rate: decimal('Risk-free rate (decimal)', 0, 0.15),
  equity_risk_premium: decimal('Equity risk premium (decimal)', 0, 0.15),
  beta: opt(lenient.number(z.number().min(0).max(4))).describe('Equity beta'),
  terminal_growth: decimal('Perpetual growth after the forecast (decimal)', -0.02, 0.06),
  exit_multiple: opt(lenient.number(z.number().min(1).max(60))).describe('Terminal EV/EBITDA multiple'),
  terminal_method: opt(z.enum(['perpetual', 'multiple', 'both'])).describe('Terminal value: perpetual growth, exit multiple, or both'),
};

const level = z.preprocess((v) => {
  const s = String(v ?? '').toLowerCase();
  return s.startsWith('h') ? 'high' : s.startsWith('l') ? 'low' : 'medium';
}, z.enum(['low', 'medium', 'high']));
const clipped = (max: number) => z.preprocess((v) => (typeof v === 'string' ? v.slice(0, max) : v ?? ''), z.string());
/** Small models often send a plain sentence where an object is expected; accept both. */
const thesisPoint = z.preprocess(
  (v) => (typeof v === 'string' ? { claim: v } : v),
  z.object({
    title: opt(clipped(300)).describe('Short heading'),
    claim: clipped(4000).describe('The claim'),
    driver: opt(clipped(4000)).describe('What drives it, only if the notes say'),
    mispricing: opt(clipped(4000)).describe('Why the market misprices it, only if the notes say'),
  })
);
const catalystItem = z.preprocess(
  (v) => (typeof v === 'string' ? { event: v } : v),
  z.object({
    event: clipped(1000).describe('The event'),
    mechanism: opt(clipped(4000)).describe('How it moves the stock'),
    probability: opt(level).describe('low | medium | high'),
    timeframe: opt(clipped(200)).describe('e.g. "Q1 2027"'),
  })
);
const riskItem = z.preprocess(
  (v) => (typeof v === 'string' ? { title: v } : v),
  z.object({
    title: clipped(300).describe('The risk'),
    description: opt(clipped(4000)),
    impact: opt(level).describe('low | medium | high'),
    mitigation: opt(clipped(4000)).describe('Only if the user gave one'),
  })
);

const filterSchema = z.object({
  field: z.string().describe('Column name from list_sgc_tables'),
  op: z.enum(FILTER_OPS).describe('equals | not | contains | starts_with | gt | gte | lt | lte | in | has'),
  value: z.any().describe('Value to compare. Dates as YYYY-MM-DD. For "in", a list.'),
});
const filters = opt(lenient.array(filterSchema)).describe('Optional filters, all must match.');
const table = z.enum(TABLE_NAMES).describe('Table name');
const covMethod = opt(z.enum(COV_METHODS)).describe('Covariance estimator. Default ledoit_wolf.');
const method = z.enum(METHODS);

const TOOLS: ConsigliereTool[] = [
  {
    name: 'get_fund_portfolio',
    group: 'sgc_data',
    description: 'The SGC fund\'s current holdings with shares, cost, latest price, market value, weight and unrealized P&L, plus the latest portfolio snapshot. Use for any question about what the fund owns.',
    schema: z.object({}),
    run: () => getFundPortfolio(),
  },
  {
    name: 'list_sgc_tables',
    group: 'sgc_data',
    description: 'Lists SGC database tables Consigliere can read, with their columns. Call this before query_sgc_table if unsure which table or column to use.',
    schema: z.object({ table: opt(table).describe('Optional: describe only this table') }),
    run: (a) => Promise.resolve(describeTables(a.table)),
  },
  {
    name: 'query_sgc_table',
    group: 'sgc_data',
    description: `Read rows from an SGC database table (read-only). Tables: ${TABLE_NAMES.join(', ')}.`,
    schema: z.object({
      table,
      filters,
      fields: opt(lenient.array(z.string())).describe('Optional subset of columns to return'),
      order_by: opt(z.string()).describe('Column to sort by; default is the table\'s natural order (usually newest first)'),
      order: opt(z.enum(['asc', 'desc'])).describe('Sort direction'),
      limit: opt(lenient.number(z.number().int().min(1).max(200))).describe('Max rows, default 25'),
    }),
    run: queryTable,
  },
  {
    name: 'summarize_sgc_table',
    group: 'sgc_data',
    description: 'Count, sum, average, min or max of a column in an SGC table, optionally grouped by another column (e.g. total realizedPnL by ticker in transactions).',
    schema: z.object({
      table,
      metric: z.enum(['count', 'sum', 'avg', 'min', 'max']),
      field: opt(z.string()).describe('Numeric column (not needed for count)'),
      group_by: opt(z.string()).describe('Optional column to group by'),
      filters,
    }),
    run: summarizeTable,
  },
  {
    name: 'get_macro_regime',
    group: 'macro',
    description: 'Current macro regime from the SGC Macro Allocation Engine, the latest top overweight/underweight country and sector ETF signals, and next-regime probabilities.',
    schema: z.object({}),
    run: () => getMacroRegime(),
  },
  {
    name: 'get_fred_series',
    group: 'macro',
    description: 'Latest observations of a FRED economic series with title, units, and change vs the previous and year-ago observation (percent-unit series change in points; index series like CPI give percent change, which is the inflation rate). Common ids: CPIAUCSL (CPI), PCEPILFE (core PCE), UNRATE, PAYEMS, FEDFUNDS, DGS2, DGS10, T10Y2Y, GDPC1, BAMLH0A0HYM2 (HY spread).',
    schema: z.object({
      series_id: z.string().describe('FRED series id, e.g. UNRATE'),
      observations: opt(lenient.number(z.number().int().min(2).max(120))).describe('How many latest observations, default 24'),
    }),
    run: getFredSeries,
  },
  {
    name: 'search_fred_series',
    group: 'macro',
    description: 'Find FRED series ids by keywords (e.g. "euro area inflation", "housing starts").',
    schema: z.object({ query: z.string(), limit: opt(lenient.number(z.number().int().min(1).max(20))) }),
    run: searchFredSeries,
  },
  {
    name: 'get_macro_outlook',
    group: 'macro',
    description: "SGC Macro Allocation Engine outlook: chance the current regime persists over 1, 3, 6 and 12 months, the top-ranked stocks in overweight sectors, and the engine's backtest record vs SPY.",
    schema: z.object({}),
    run: () => getMacroOutlook(),
  },
  {
    name: 'get_g10_rates',
    group: 'macro',
    description: 'SGC G10 Rates Monitor: policy rate, 2-year and 10-year yields, curve shape, and the hikes/cuts the front end is pricing for each G10 country (FRED).',
    schema: z.object({ country: opt(z.string()).describe('Optional country name or code, e.g. "Japan" or "JP"; default all') }),
    run: getG10Rates,
  },
  {
    name: 'get_trade_signals',
    group: 'macro',
    description: 'SGC Trade Shift Radar: latest aggregated trade-flow shift signals (supply-chain moves, sourcing substitution, theme accelerations) with severity and affected market themes.',
    schema: z.object({
      country: opt(z.string()).describe('Optional source country filter'),
      theme: opt(z.string()).describe('Optional theme key filter'),
      query: opt(z.string()).describe('Optional keyword search'),
      limit: opt(lenient.number(z.number().int().min(1).max(15))).describe('Default 8'),
    }),
    run: getTradeSignalsSummary,
  },
  {
    name: 'get_stock_quote',
    group: 'markets',
    description: 'Latest price, daily change and volume for a ticker (Alpha Vantage).',
    schema: z.object({ ticker }),
    run: getStockQuote,
  },
  {
    name: 'get_company_overview',
    group: 'markets',
    description: 'Company fundamentals: sector, market cap, P/E, forward P/E, margins, ROE, growth, beta, analyst target, 52-week range (Alpha Vantage).',
    schema: z.object({ ticker }),
    run: getCompanyOverview,
  },
  {
    name: 'get_news_sentiment',
    group: 'markets',
    description: 'News sentiment for a ticker using the SGC Sentiment Tool method: relevance-weighted score, label, bullish/bearish article counts, top headlines and the price move over the window.',
    schema: z.object({ ticker, days: opt(lenient.number(z.number().int().min(1).max(30))).describe('Window: 3, 7 or 30 days. Default 7') }),
    run: getNewsSentiment,
  },
  {
    name: 'get_earnings_history',
    group: 'markets',
    description: 'Quarterly reported vs estimated EPS and surprise %, plus annual EPS (Alpha Vantage).',
    schema: z.object({ ticker, quarters: opt(lenient.number(z.number().int().min(1).max(20))).describe('Quarters to return, default 8') }),
    run: getEarningsHistory,
  },
  {
    name: 'search_ticker',
    group: 'markets',
    description: 'Look up ticker symbols by company name.',
    schema: z.object({ query: z.string().describe('Company name or partial ticker') }),
    run: searchTicker,
  },
  {
    name: 'get_price_history',
    group: 'markets',
    description: 'Adjusted price history summary for a ticker over a period: total return, volatility, max drawdown, high/low and sampled closes.',
    schema: z.object({ ticker, period: opt(z.enum(['1m', '3m', '6m', '1y', '3y', '5y', '10y'])).describe('Default 1y') }),
    run: getPriceHistory,
  },
  {
    name: 'run_dcf',
    group: 'research',
    description:
      'Run the SGC DCF Valuation Tool: intrinsic value per share, upside vs price, bear/base/bull, WACC, a WACC x terminal-growth sensitivity grid and every assumption with its source. Auto-fills from the latest financial statements and the 10-year Treasury yield; pass overrides for any assumption, or saved_model_id to rerun one of your saved models. Use for any valuation, fair value or price target question.',
    schema: z.object({
      ticker: opt(z.string()).describe('Ticker to value, e.g. AAPL'),
      saved_model_id: opt(z.string()).describe('Id from list_my_dcf_models, instead of ticker'),
      ...dcfOverrides,
      capex_pct_revenue: decimal('Capex as a share of revenue (decimal)'),
      da_pct_revenue: decimal('Depreciation & amortization as a share of revenue (decimal)'),
      nwc_pct_revenue_change: decimal('Net working capital investment as a share of the revenue change (decimal)', -1, 1),
      tax_rate: decimal('Tax rate (decimal)', 0, 0.5),
      risk_free_rate: decimal('Risk-free rate (decimal)', 0, 0.2),
      cost_of_debt: decimal('Pre-tax cost of debt (decimal)', 0, 0.3),
      debt_weight: decimal('Debt share of capital, D/(D+E) (decimal)', 0, 0.95),
      terminal_method: opt(z.enum(['perpetual', 'multiple', 'both'])).describe('Terminal value method; default both (50/50 perpetual growth and exit multiple, like the DCF tool)'),
      mid_year_convention: opt(z.boolean()).describe('Discount cash flows at mid-year'),
    }),
    run: runDcf,
  },
  {
    name: 'draft_research_report',
    group: 'research',
    description:
      'Start a draft SGC equity research report for a ticker, in two steps. Step 1: call with just the ticker (and any notes); it returns proposed DCF assumptions to ask the user about, and drafts nothing. Step 2: after the user answers, call again with assumptions_confirmed=true plus only the assumptions they changed, or with saved_model_id if they want one of their saved DCF models. Step 2 runs the DCF, comps, EPS history, price performance and news sentiment and fills every data section. Write qualitative sections ONLY from the notes the user pasted; leave a section out rather than inventing facts. Nothing is saved until the user clicks Save in the chat.',
    schema: z.object({
      ticker,
      assumptions_confirmed: opt(lenientBoolean).describe('true only after the user has answered the assumption questions (or said to use the proposed ones)'),
      saved_model_id: opt(z.string()).describe("Use this saved DCF model instead of asking, when the user says to use their saved DCF (ids come from step 1's saved_models or list_my_dcf_models)"),
      recommendation: opt(z.enum(RECOMMENDATIONS)).describe("Only the user's own rating if they gave one; otherwise leave it out and it is set from the upside to target (buy above +10%, sell below -10%, else hold)"),
      target_price: opt(lenient.number(z.number().gt(0))).describe("The user's price target if they gave one; default the DCF value"),
      peers: opt(lenient.tickers()).describe("3-6 comparable company tickers, e.g. ['MSFT','GOOGL']"),
      ...dcfOverrides,
      investment_thesis: opt(lenient.array(thesisPoint)).describe('2-4 thesis points taken from the notes (not risks or catalysts)'),
      business_model: opt(z.string()).describe('Markdown: how the company makes money, from the notes'),
      industry_analysis: opt(z.string()).describe('Markdown: industry and competitive landscape, from the notes'),
      economic_moat: opt(z.string()).describe('Markdown: durable advantages, from the notes'),
      valuation_commentary: opt(z.string()).describe(
        "Only if the notes discuss valuation: the user's valuation view. Do not state prices, multiples or upside; the DCF results and tables are added automatically"
      ),
      catalysts_near_term: opt(lenient.array(catalystItem)).describe('Catalysts in the next 6 months, from the notes'),
      catalysts_medium_term: opt(lenient.array(catalystItem)).describe('Catalysts in 6-24 months, from the notes'),
      key_risks: opt(lenient.array(riskItem)).describe(
        'Every risk the notes mention (e.g. after "Risk:"), one item each; leave mitigation out unless the notes give one. Put risks here even if they also shape the bear case'
      ),
      bull_case: opt(z.string()).describe('Markdown bull case narrative from the notes; DCF bull values are added automatically'),
      bear_case: opt(z.string()).describe('Markdown bear case narrative from the notes; DCF bear values are added automatically'),
      conclusion: opt(z.string()).describe('Short concluding paragraph from the notes. Do not claim upside or cite prices: you have not seen the DCF result yet'),
    }),
    run: draftResearchReport,
  },
  {
    name: 'edit_research_report',
    group: 'research',
    description:
      "Change one of the user's existing DRAFT research reports, for the user to review and save. Only pass what the user asked to change. Text is added below the existing section unless the user explicitly asked to rewrite or replace it. Thesis points, catalysts and risks are only ever added, never removed. It cannot delete reports or edit published ones. Nothing changes until the user clicks Save changes; the previous version is kept in the report history.",
    schema: z.object({
      report_id: opt(z.string()).describe('Report id from get_research_reports or an earlier draft; otherwise pass ticker'),
      ticker: opt(z.string()).describe("Ticker of the user's draft to edit (their most recent draft for it)"),
      replace_text: opt(lenientBoolean).describe('true ONLY if the user explicitly asked to rewrite or replace a section; default adds text below'),
      recommendation: opt(z.enum(RECOMMENDATIONS)).describe('New rating, only if the user asked'),
      target_price: opt(lenient.number(z.number().gt(0))).describe('New price target, only if the user asked'),
      business_model: opt(z.string()).describe('Markdown to add to the business model section'),
      industry_analysis: opt(z.string()).describe('Markdown to add to the industry analysis'),
      economic_moat: opt(z.string()).describe('Markdown to add to the economic moat section'),
      valuation_commentary: opt(z.string()).describe('Markdown added below the valuation tables (never replaces them)'),
      bull_case: opt(z.string()).describe('Markdown to add to the bull case'),
      bear_case: opt(z.string()).describe('Markdown to add to the bear case'),
      conclusion: opt(z.string()).describe('Markdown to add to the conclusion'),
      add_thesis_points: opt(lenient.array(thesisPoint)).describe('New thesis points to add'),
      add_catalysts_near_term: opt(lenient.array(catalystItem)).describe('New catalysts in the next 6 months'),
      add_catalysts_medium_term: opt(lenient.array(catalystItem)).describe('New catalysts in 6-24 months'),
      add_key_risks: opt(lenient.array(riskItem)).describe('New risks to add'),
    }),
    run: editResearchReport,
  },
  {
    name: 'list_my_dcf_models',
    group: 'research',
    description: "The signed-in member's own saved DCF models (name, ticker, value per share, upside, WACC, bear/bull, id). Pass an id to run_dcf as saved_model_id to rerun one.",
    schema: z.object({
      ticker: opt(z.string()).describe('Only models for this ticker'),
      limit: opt(lenient.number(z.number().int().min(1).max(25))).describe('Default 10'),
    }),
    run: listMyDcfModels,
  },
  {
    name: 'get_comps',
    group: 'research',
    description: 'Trading comparables: P/E, forward P/E, EV/EBITDA, EV/revenue, P/S, P/B, growth, margins and beta for a company and its peers, with peer medians.',
    schema: z.object({
      ticker,
      peers: lenient.tickers().describe("2-8 peer tickers, e.g. ['MSFT','GOOGL','META']"),
    }),
    run: getComps,
  },
  {
    name: 'get_research_reports',
    group: 'research',
    description: "SGC equity research reports: published reports plus the member's own drafts, with rating, price target, thesis summary and link.",
    schema: z.object({
      ticker: opt(z.string()).describe('Only reports on this ticker'),
      limit: opt(lenient.number(z.number().int().min(1).max(15))).describe('Default 5'),
    }),
    run: getResearchReports,
  },
  {
    name: 'get_earnings_reactions',
    group: 'research',
    description: 'Equity Positioning earnings view: EPS beat/miss history with the stock\'s 5- and 20-day reaction, beat rate, and estimate revision momentum.',
    schema: z.object({ ticker, quarters: opt(lenient.number(z.number().int().min(1).max(12))).describe('Default 8') }),
    run: getEarningsReactions,
  },
  {
    name: 'get_options_positioning',
    group: 'research',
    description: 'Equity Positioning options view: put/call ratios, at-the-money implied volatility, put skew, positioning bias and unusual contracts. Needs a premium Alpha Vantage key.',
    schema: z.object({ ticker }),
    run: getOptionsPositioning,
  },
  {
    name: 'get_insider_activity',
    group: 'research',
    description: 'Recent insider buys and sells for a ticker with a summary (Supplementary Tools).',
    schema: z.object({ ticker, limit: opt(lenient.number(z.number().int().min(1).max(20))).describe('Transactions to list, default 10') }),
    run: getInsiderActivity,
  },
  {
    name: 'get_earnings_estimates',
    group: 'research',
    description: 'Analyst EPS and revenue estimates for upcoming quarters and years, analyst counts and 30-day revision direction (Supplementary Tools).',
    schema: z.object({ ticker }),
    run: getEarningsEstimates,
  },
  {
    name: 'get_earnings_call_summary',
    group: 'research',
    description: 'Earnings call transcript summary: management tone, key topics, notable quotes and short excerpts (Supplementary Tools). Defaults to the latest quarter.',
    schema: z.object({ ticker, quarter: opt(z.string()).describe('Quarter like 2026Q2; default latest') }),
    run: getEarningsCallSummary,
  },
  {
    name: 'get_institutional_holdings',
    group: 'research',
    description: 'Institutional ownership: holder count, ownership %, largest holders and biggest buyers/sellers (Supplementary Tools). May need a premium Alpha Vantage key.',
    schema: z.object({ ticker }),
    run: getInstitutionalHoldings,
  },
  {
    name: 'analyze_portfolio',
    group: 'portfolio',
    description: 'Risk report for an existing portfolio: volatility, each position\'s share of risk, diversification, historical drawdown/Sharpe of the fixed weights, most correlated pairs.',
    schema: z.object({
      weights: lenient.record(lenient.number()).describe("Ticker -> weight, e.g. {'AAPL': 0.3, 'MSFT': 0.7}. Normalized to sum to 1."),
      lookback_years: opt(lenient.number(z.number().gt(0).max(15))).describe('Years of daily history, default 3'),
      covariance_method: covMethod,
      include_sectors: opt(z.boolean()).describe('Also report sector weights and sector risk'),
    }),
    run: analyzePortfolio,
  },
  {
    name: 'optimize_portfolio',
    group: 'portfolio',
    description: 'Build target weights with a construction method (min_variance, mean_variance, risk_parity, hrp, black_litterman, equal_weight, inverse_vol) under position/sector/turnover/volatility constraints. Returns weights, risk contributions, trades and binding constraints.',
    schema: z.object({
      tickers: lenient.tickers().describe("Investable universe, e.g. ['AAPL','MSFT','JPM','XOM']"),
      method: opt(method).describe('Default min_variance. min_variance/mean_variance/black_litterman enforce constraints; the others are heuristics.'),
      covariance_method: covMethod,
      lookback_years: opt(lenient.number(z.number().gt(0).max(15))).describe('Years of history, default 3'),
      max_weight: decimal('Max weight per asset as a decimal (0.1 = 10%)'),
      min_weight: decimal('Min weight per asset as a decimal'),
      sector_caps: opt(lenient.record(lenient.number())).describe("Max weight per sector, e.g. {'Technology': 0.3}. Sectors auto-detected."),
      sector_map: opt(lenient.record(z.string())).describe('Optional ticker -> sector override'),
      current_weights: opt(lenient.record(lenient.number())).describe('Current holdings ticker -> weight. Enables trades and max_turnover.'),
      max_turnover: decimal('Max sum of |weight changes| vs current_weights (0.1 = 10%)', 0, 2),
      target_vol: decimal('Max annualized volatility (0.12 = 12%)'),
      risk_aversion: opt(lenient.number(z.number().gt(0))).describe('For mean_variance/black_litterman, default 2.5'),
      expected_returns: opt(lenient.record(lenient.number())).describe('Annual expected returns for mean_variance; default trailing mean'),
      views: opt(
        lenient.array(
          z.object({
            asset: z.string().describe('Ticker the view is about'),
            expected_return: lenient.number().describe('Annual return as decimal; if relative_to is set, the outperformance'),
            confidence: opt(lenient.number(z.number().min(0.01).max(0.99))).describe('0.25 low, 0.5 medium, 0.75 high'),
            relative_to: opt(z.string()).describe("Optional ticker for 'asset beats relative_to'"),
          })
        )
      ).describe('Black-Litterman views'),
      market_weights: opt(lenient.record(lenient.number())).describe('Black-Litterman prior weights; default equal weight'),
    }),
    run: optimizePortfolio,
  },
  {
    name: 'compare_methods',
    group: 'portfolio',
    description: 'Out-of-sample walk-forward backtest of several construction methods on one universe, net of transaction costs: return, volatility, Sharpe, max drawdown, turnover.',
    schema: z.object({
      tickers: lenient.tickers().describe("Universe, e.g. ['SPY','TLT','GLD','QQQ']"),
      methods: opt(lenient.array(method)).describe('Methods to compare; default all except black_litterman'),
      start: opt(z.string()).describe('Data start date YYYY-MM-DD, default 2015-01-01'),
      lookback_days: opt(lenient.number(z.number().int().min(60).max(2520))).describe('Estimation window, default 252'),
      rebalance: opt(z.enum(['W', 'M', 'Q'])).describe('Rebalance frequency, default M'),
      cost_bps: opt(lenient.number(z.number().min(0))).describe('Cost per unit turnover in bps, default 10'),
      covariance_method: covMethod,
      max_weight: decimal('Max weight per asset (constrained methods only)'),
    }),
    run: compareMethods,
  },
  {
    name: 'get_sectors',
    group: 'portfolio',
    description: 'Sector of each ticker (fund tagging first, then Alpha Vantage).',
    schema: z.object({ tickers: lenient.tickers() }),
    run: getSectors,
  },
  {
    name: 'get_latest_cvar_run',
    group: 'portfolio',
    description: "Latest saved run of the SGC CVaR Portfolio Optimizer on the fund: expected CVaR vs benchmark, target weights, sector/region weights, suggested trades and stress tests.",
    schema: z.object({}),
    run: () => getLatestCvarRun(),
  },
];

const BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

export function consigliereToolSpecs(): ConsigliereToolSpec[] {
  return TOOLS.map((t) => ({
    group: t.group,
    type: 'function',
    function: { name: t.name, description: t.description, parameters: toJsonSchema(t.schema as ZodTypeAny) as JsonSchema },
  }));
}

const BURST = /burst pattern|spreading out your API requests/i;

export type ToolOutcome = { ok: true; result: unknown } | { ok: false; error: string };

export async function runConsigliereTool(name: string, rawArgs: unknown, ctx: ToolContext): Promise<ToolOutcome> {
  const tool = BY_NAME.get(name);
  if (!tool) return { ok: false, error: `Unknown tool '${name}'. Available: ${TOOLS.map((t) => t.name).join(', ')}` };
  const parsed = tool.schema.safeParse(rawArgs ?? {});
  if (!parsed.success) return { ok: false, error: `Invalid arguments: ${formatZodError(parsed.error)}` };
  try {
    try {
      return { ok: true, result: await tool.run(parsed.data, ctx) };
    } catch (err) {
      // Alpha Vantage rejects bursts across all callers of the shared key; one spaced retry usually clears it.
      if (!(err instanceof Error && BURST.test(err.message))) throw err;
      await new Promise((resolve) => setTimeout(resolve, 2500));
      return { ok: true, result: await tool.run(parsed.data, ctx) };
    }
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2021') {
      console.error(`[consigliere] ${name}: table missing in this database`);
      return { ok: false, error: `The data behind ${name} has not been set up in this SGC database yet, so it cannot answer this. Tell the user.` };
    }
    if (err instanceof Error && err.name.startsWith('Prisma')) {
      console.error(`[consigliere] ${name} database error:`, err.message);
      return { ok: false, error: 'The database query failed. Try simpler filters or another table.' };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
