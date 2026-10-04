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
  getNewsSentiment,
  getPriceHistory,
  getStockQuote,
  searchFredSeries,
  searchTicker,
} from './markets';
import { analyzePortfolio, compareMethods, getSectors, optimizePortfolio, METHODS } from '@/lib/consigliere/portfolio/tools';
import { COV_METHODS } from '@/lib/consigliere/portfolio/risk';
import type { ConsigliereToolGroup, ConsigliereToolSpec } from '@/lib/consigliere/types';

interface ConsigliereTool {
  name: string;
  group: ConsigliereToolGroup;
  description: string;
  schema: z.AnyZodObject;
  run: (args: any) => Promise<unknown>;
}

const opt = lenient.optional;
const ticker = z.string().describe('Ticker symbol, e.g. AAPL');
const decimal = (description: string, min = 0, max = 1) =>
  opt(lenient.number(z.number().min(min).max(max))).describe(description);

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
    description: 'Recent news headlines about a ticker with Alpha Vantage sentiment labels and an average sentiment score.',
    schema: z.object({ ticker, limit: opt(lenient.number(z.number().int().min(1).max(15))).describe('Articles to return, default 8') }),
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
];

const BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

export function consigliereToolSpecs(): ConsigliereToolSpec[] {
  return TOOLS.map((t) => ({
    group: t.group,
    type: 'function',
    function: { name: t.name, description: t.description, parameters: toJsonSchema(t.schema as ZodTypeAny) as JsonSchema },
  }));
}

export type ToolOutcome = { ok: true; result: unknown } | { ok: false; error: string };

export async function runConsigliereTool(name: string, rawArgs: unknown): Promise<ToolOutcome> {
  const tool = BY_NAME.get(name);
  if (!tool) return { ok: false, error: `Unknown tool '${name}'. Available: ${TOOLS.map((t) => t.name).join(', ')}` };
  const parsed = tool.schema.safeParse(rawArgs ?? {});
  if (!parsed.success) return { ok: false, error: `Invalid arguments: ${formatZodError(parsed.error)}` };
  try {
    return { ok: true, result: await tool.run(parsed.data) };
  } catch (err) {
    if (err instanceof Error && err.name.startsWith('Prisma')) {
      console.error(`[consigliere] ${name} database error:`, err.message);
      return { ok: false, error: 'The database query failed. Try simpler filters or another table.' };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
