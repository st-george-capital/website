import { prisma } from '@/lib/prisma';
import {
  fetchAlphaVantageBalanceSheet,
  fetchAlphaVantageCashFlow,
  fetchAlphaVantageIncomeStatement,
  fetchAlphaVantageOverview,
  fetchAlphaVantageQuote,
  runAlphaVantageSequential,
} from '@/lib/alpha-vantage';
import { fetchFredSeriesHistory } from '@/lib/g10-rates/fred';
import {
  DEFAULT_SCENARIOS,
  calculateDCF,
  getDefaultInputs,
  normalizeInputsForForecastYears,
  scenarioInputs,
  valuePerShareAt,
  type DCFInputs,
  type DCFOutputs,
} from '@/lib/dcf/model';
import { normalizeTickers } from '@/lib/consigliere/portfolio/data';
import type { ToolContext } from './context';

const DCF_PAGE = '/dashboard/tools/dcf';
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pct = (x: number, nd = 1) => Number((x * 100).toFixed(nd));
const millions = (x: number) => Math.round(x / 1e6);
const money = (x: number) => Number(x.toFixed(2));

/** Alpha Vantage strings → number, or null for "None"/missing (never silently 0). */
function n(v: unknown): number | null {
  if (v === undefined || v === null || v === '' || v === 'None' || v === '-') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function series(reports: Record<string, string>[], ...fields: string[]): (number | null)[] {
  return reports.map((r) => {
    for (const f of fields) {
      const x = n(r[f]);
      if (x !== null) return x;
    }
    return null;
  });
}

async function riskFreeRate(): Promise<{ value: number; source: string }> {
  try {
    const obs = await fetchFredSeriesHistory('DGS10', 10);
    const latest = obs[obs.length - 1];
    if (latest) return { value: latest.value / 100, source: `FRED DGS10 10-year Treasury, ${latest.date}` };
  } catch {
    // fall through to the DCF tool default
  }
  return { value: getDefaultInputs().riskFreeRate, source: 'DCF tool default (FRED unavailable)' };
}

export interface DcfArgs {
  ticker?: string;
  saved_model_id?: string;
  forecast_years?: number;
  revenue_growth?: number | number[];
  ebit_margin?: number | number[];
  capex_pct_revenue?: number;
  da_pct_revenue?: number;
  nwc_pct_revenue_change?: number;
  tax_rate?: number;
  risk_free_rate?: number;
  equity_risk_premium?: number;
  beta?: number;
  cost_of_debt?: number;
  debt_weight?: number;
  terminal_growth?: number;
  exit_multiple?: number;
  terminal_method?: 'perpetual' | 'multiple' | 'both';
  mid_year_convention?: boolean;
}

export type Assumptions = Record<string, { value: number | number[] | string | boolean; source: string }>;

export interface AutoFill {
  inputs: DCFInputs;
  assumptions: Assumptions;
  warnings: string[];
  overview: Record<string, string>;
  statements: { income: Record<string, string>[]; balance: Record<string, string>[]; cashflow: Record<string, string>[] };
}

/** Builds DCF inputs from Alpha Vantage statements the same way the DCF tool's auto-fill does, with sources. */
export async function autoFillInputs(ticker: string): Promise<AutoFill> {
  const [overview, quote, income, balance, cashflow] = await runAlphaVantageSequential([
    () => fetchAlphaVantageOverview(ticker),
    () => fetchAlphaVantageQuote(ticker),
    () => fetchAlphaVantageIncomeStatement(ticker),
    () => fetchAlphaVantageBalanceSheet(ticker),
    () => fetchAlphaVantageCashFlow(ticker),
  ] as const);
  const rf = await riskFreeRate();
  const defaults = getDefaultInputs();
  const warnings: string[] = [];

  const inc = income.annualReports.slice(0, 3);
  const bal = balance.annualReports[0] ?? {};
  const cf = cashflow.annualReports.slice(0, 3);
  if (!inc.length) throw new Error(`Alpha Vantage has no annual income statement for ${ticker}, so a DCF cannot be built (ETFs and funds have none).`);
  const fy = inc[0].fiscalDateEnding;

  const revenue = series(inc, 'totalRevenue');
  const ebit = series(inc, 'ebit', 'operatingIncome');
  const netIncome = series(inc, 'netIncome');
  const da = series(inc, 'depreciationAndAmortization');
  const capex = series(cf, 'capitalExpenditures').map((x) => (x === null ? null : Math.abs(x)));
  const interest = n(inc[0].interestExpense);

  const startingRevenue = revenue[0];
  if (!startingRevenue || startingRevenue <= 0) throw new Error(`No usable revenue for ${ticker} in its latest annual report.`);

  // Newest → oldest, so growth for year i is revenue[i] / revenue[i+1] − 1.
  const growthRates = revenue.slice(0, -1).flatMap((r, i) => (r !== null && revenue[i + 1] ? [r / revenue[i + 1]! - 1] : []));
  const baseGrowth = clamp(avg(growthRates) ?? 0.05, -0.5, 0.5);
  const ratio = (num: (number | null)[], lo: number, hi: number, fallback: number) => {
    const xs = num.flatMap((x, i) => (x !== null && revenue[i] ? [x / revenue[i]!] : []));
    const a = avg(xs);
    return a === null ? fallback : clamp(a, lo, hi);
  };
  const ebitMargin = ratio(ebit, 0.01, 0.5, 0.1);
  const capexPct = ratio(capex, 0.01, 0.3, defaults.capexPercentOfRevenue);
  const daPct = ratio(da.map((x) => (x === null ? null : Math.abs(x))), 0.01, 0.2, defaults.depreciationPercentOfRevenue);
  const taxRates = ebit.flatMap((e, i) => {
    const ni = netIncome[i];
    if (!e || e <= 0 || ni === null) return [];
    const t = 1 - ni / e;
    return t >= 0 && t <= 0.5 ? [t] : [];
  });
  const taxRate = avg(taxRates) ?? 0.25;

  const longTerm = n(bal.longTermDebt) ?? n(bal.longTermDebtNoncurrent) ?? 0;
  const shortTerm = n(bal.shortTermDebt) ?? 0;
  const current = n(bal.currentDebt) ?? n(bal.currentLongTermDebt) ?? 0;
  const totalDebt = n(bal.shortLongTermDebtTotal) ?? longTerm + shortTerm + current;
  const cash = n(bal.cashAndCashEquivalentsAtCarryingValue) ?? n(bal.cashAndShortTermInvestments) ?? 0;

  const shares = n(overview.SharesOutstanding);
  const marketCap = n(overview.MarketCapitalization);
  const beta = n(overview.Beta);
  const evToEbitda = n(overview.EVToEBITDA);
  if (!shares) warnings.push('Shares outstanding missing from Alpha Vantage; the DCF tool default was used, so the per-share value is unreliable.');
  if (beta === null) warnings.push('Beta missing from Alpha Vantage; the DCF tool default of 1.2 was used.');

  const debtWeight = marketCap && marketCap + totalDebt > 0 ? totalDebt / (marketCap + totalDebt) : defaults.targetDebtRatio;
  const impliedCostOfDebt = interest && totalDebt > 0 ? interest / totalDebt : null;
  const costOfDebt =
    impliedCostOfDebt !== null && impliedCostOfDebt >= 0.02 && impliedCostOfDebt <= 0.12 ? impliedCostOfDebt : 0.05 + debtWeight * 0.02;
  const terminalGrowth = clamp(rf.value - 0.01, 0.015, 0.03);
  const exitMultiple = evToEbitda !== null && evToEbitda >= 4 && evToEbitda <= 40 ? evToEbitda : defaults.exitMultiple;
  const growthProfile = [1, 0.9, 0.8, 0.7, 0.6].map((k) => baseGrowth * k);

  const inputs: DCFInputs = {
    ...defaults,
    companyName: overview.Name || ticker,
    ticker,
    currency: overview.Currency || 'USD',
    currentPrice: quote.price,
    sharesOutstanding: shares ?? defaults.sharesOutstanding,
    sharesDiluted: shares ? shares * 1.05 : defaults.sharesDiluted,
    totalDebt,
    cashEquivalents: cash,
    startingRevenue,
    revenueGrowth: growthProfile,
    ebitMargin: Array(5).fill(ebitMargin),
    capexPercentOfRevenue: capexPct,
    depreciationPercentOfRevenue: daPct,
    cashTaxRate: taxRate,
    taxRate,
    riskFreeRate: rf.value,
    beta: beta ?? defaults.beta,
    costOfDebt,
    targetDebtRatio: debtWeight,
    perpetualGrowth: terminalGrowth,
    exitMultiple,
  };

  const yrs = `${inc.length} fiscal year${inc.length === 1 ? '' : 's'} to ${fy}`;
  const assumptions: Assumptions = {
    starting_revenue_musd: { value: millions(startingRevenue), source: `Alpha Vantage INCOME_STATEMENT, fiscal year ending ${fy}` },
    revenue_growth_pct: { value: growthProfile.map((g) => pct(g)), source: `Average growth over ${yrs}, fading 10% a year (DCF tool rule)` },
    ebit_margin_pct: { value: pct(ebitMargin), source: `Average EBIT margin over ${yrs}` },
    capex_pct_revenue: { value: pct(capexPct), source: `Average over ${cf.length} years of Alpha Vantage CASH_FLOW` },
    da_pct_revenue: { value: pct(daPct), source: `Average over ${yrs}` },
    nwc_pct_revenue_change: { value: pct(defaults.nwcChangePercentOfRevenueChange), source: 'DCF tool default' },
    tax_rate_pct: { value: pct(taxRate), source: taxRates.length ? `Effective rate (1 − net income / EBIT) over ${yrs}` : 'DCF tool default' },
    risk_free_rate_pct: { value: pct(rf.value, 2), source: rf.source },
    equity_risk_premium_pct: { value: pct(defaults.equityRiskPremium), source: 'DCF tool default; override with equity_risk_premium' },
    beta: { value: inputs.beta, source: beta !== null ? 'Alpha Vantage OVERVIEW' : 'DCF tool default' },
    cost_of_debt_pct: {
      value: pct(costOfDebt, 2),
      source: costOfDebt === impliedCostOfDebt ? 'Interest expense / total debt' : 'DCF tool rule: 5% + 2% × debt weight',
    },
    debt_weight_pct: { value: pct(debtWeight), source: marketCap ? 'Total debt / (market cap + total debt)' : 'DCF tool default' },
    terminal_growth_pct: { value: pct(terminalGrowth, 2), source: 'Risk-free rate − 1%, kept between 1.5% and 3%' },
    exit_multiple: { value: Number(exitMultiple.toFixed(1)), source: exitMultiple === evToEbitda ? 'Current EV/EBITDA (Alpha Vantage OVERVIEW)' : 'DCF tool default' },
    total_debt_musd: { value: millions(totalDebt), source: `Alpha Vantage BALANCE_SHEET, ${balance.annualReports[0]?.fiscalDateEnding ?? fy}` },
    cash_musd: { value: millions(cash), source: 'Alpha Vantage BALANCE_SHEET' },
    diluted_shares_m: { value: millions(inputs.sharesDiluted), source: shares ? 'Alpha Vantage shares outstanding × 1.05 (DCF tool dilution rule)' : 'DCF tool default' },
    current_price: { value: money(quote.price), source: 'Alpha Vantage GLOBAL_QUOTE' },
  };
  return {
    inputs,
    assumptions,
    warnings,
    overview,
    statements: { income: income.annualReports, balance: balance.annualReports, cashflow: cashflow.annualReports },
  };
}

const AUTOFILL_TTL_MS = 15 * 60_000;
const autoFillCache = new Map<string, { at: number; data: Promise<AutoFill> }>();

/**
 * Auto-fill reused for 15 minutes, so proposing assumptions and then drafting with the member's answers
 * does not spend the Alpha Vantage calls twice. Callers get a copy they may mutate.
 */
export async function autoFillCached(ticker: string): Promise<AutoFill> {
  const hit = autoFillCache.get(ticker);
  if (hit && Date.now() - hit.at < AUTOFILL_TTL_MS) return structuredClone(await hit.data);
  const data = autoFillInputs(ticker);
  autoFillCache.set(ticker, { at: Date.now(), data });
  data.catch(() => autoFillCache.delete(ticker));
  return structuredClone(await data);
}

export interface SavedModelBase {
  id: string;
  name: string;
  ticker: string;
  updatedAt: Date;
  linkedReportId: string | null;
  inputs: DCFInputs;
  assumptions: Assumptions;
  label: string;
}

export async function savedModelInputs(id: string, ctx: ToolContext): Promise<SavedModelBase> {
  const model = await prisma.savedDCFModel.findUnique({
    where: { id },
    select: { id: true, userId: true, name: true, ticker: true, inputs: true, updatedAt: true, report: { select: { id: true } } },
  });
  if (!model || (model.userId !== ctx.userId && ctx.role !== 'admin')) throw new Error('No saved DCF model with that id belongs to you. Call list_my_dcf_models first.');
  const { comps: _comps, ...saved } = model.inputs as unknown as Partial<DCFInputs> & { comps?: unknown };
  const inputs = normalizeInputsForForecastYears({ ...getDefaultInputs(), ...saved });
  const label = `your saved model "${model.name}" (${model.ticker}, updated ${model.updatedAt.toISOString().slice(0, 10)})`;
  return {
    id: model.id,
    name: model.name,
    ticker: model.ticker,
    updatedAt: model.updatedAt,
    linkedReportId: model.report?.id ?? null,
    inputs,
    assumptions: { inputs: { value: 'as saved', source: label } },
    label,
  };
}

const OVERRIDE_KEYS: (keyof DcfArgs)[] = [
  'forecast_years', 'revenue_growth', 'ebit_margin', 'capex_pct_revenue', 'da_pct_revenue', 'nwc_pct_revenue_change', 'tax_rate',
  'risk_free_rate', 'equity_risk_premium', 'beta', 'cost_of_debt', 'debt_weight', 'terminal_growth', 'exit_multiple', 'terminal_method',
  'mid_year_convention',
];
export const hasOverrides = (a: DcfArgs) => OVERRIDE_KEYS.some((k) => a[k] !== undefined);

export function applyOverrides(base: DCFInputs, a: DcfArgs, assumptions: Assumptions): DCFInputs {
  const next = { ...base };
  const years = a.forecast_years ? clamp(Math.round(a.forecast_years), 3, 10) : base.forecastYears;
  next.forecastYears = years;
  const perYear = (v: number | number[]) => (Array.isArray(v) ? v : Array(years).fill(v));
  const set = (key: string, value: number | number[] | string | boolean) => {
    assumptions[key] = { value: typeof value === 'number' && key.endsWith('_pct') ? pct(value, 2) : value, source: 'Your override' };
  };
  if (a.revenue_growth !== undefined) (next.revenueGrowth = perYear(a.revenue_growth)), set('revenue_growth_pct', perYear(a.revenue_growth).map((g) => pct(g)));
  if (a.ebit_margin !== undefined) (next.ebitMargin = perYear(a.ebit_margin)), set('ebit_margin_pct', perYear(a.ebit_margin).map((m) => pct(m)));
  if (a.capex_pct_revenue !== undefined) (next.capexPercentOfRevenue = a.capex_pct_revenue), set('capex_pct_revenue', pct(a.capex_pct_revenue));
  if (a.da_pct_revenue !== undefined) (next.depreciationPercentOfRevenue = a.da_pct_revenue), set('da_pct_revenue', pct(a.da_pct_revenue));
  if (a.nwc_pct_revenue_change !== undefined) (next.nwcChangePercentOfRevenueChange = a.nwc_pct_revenue_change), set('nwc_pct_revenue_change', pct(a.nwc_pct_revenue_change));
  if (a.tax_rate !== undefined) (next.cashTaxRate = next.taxRate = a.tax_rate), set('tax_rate_pct', a.tax_rate);
  if (a.risk_free_rate !== undefined) (next.riskFreeRate = a.risk_free_rate), set('risk_free_rate_pct', a.risk_free_rate);
  if (a.equity_risk_premium !== undefined) (next.equityRiskPremium = a.equity_risk_premium), set('equity_risk_premium_pct', a.equity_risk_premium);
  if (a.beta !== undefined) (next.beta = a.beta), set('beta', a.beta);
  if (a.cost_of_debt !== undefined) (next.costOfDebt = a.cost_of_debt), set('cost_of_debt_pct', a.cost_of_debt);
  if (a.debt_weight !== undefined) (next.targetDebtRatio = a.debt_weight), set('debt_weight_pct', a.debt_weight);
  if (a.terminal_growth !== undefined) (next.perpetualGrowth = a.terminal_growth), set('terminal_growth_pct', a.terminal_growth);
  if (a.exit_multiple !== undefined) (next.exitMultiple = a.exit_multiple), set('exit_multiple', a.exit_multiple);
  if (a.terminal_method !== undefined) (next.terminalMethod = a.terminal_method), set('terminal_method', a.terminal_method);
  if (a.mid_year_convention !== undefined) (next.midYearConvention = a.mid_year_convention), set('mid_year_convention', a.mid_year_convention);
  return normalizeInputsForForecastYears(next);
}

/** Per-share value for a WACC/terminal-growth pair, reusing the base forecast and the same terminal blend as the base case. */
function sensitivity(inputs: DCFInputs, out: DCFOutputs) {
  const price = (w: number, g: number) => {
    const v = valuePerShareAt(inputs, out, w, g);
    return v === null ? null : money(v);
  };
  const waccSteps = [-0.01, 0, 0.01];
  const growthSteps = [-0.005, 0, 0.005];
  return {
    method: `Per share, same terminal method as the base case (${inputs.terminalMethod})`,
    rows_wacc_pct: waccSteps.map((d) => pct(out.wacc + d)),
    columns_terminal_growth_pct: growthSteps.map((d) => pct(inputs.perpetualGrowth + d, 2)),
    values: waccSteps.map((dw) => growthSteps.map((dg) => price(out.wacc + dw, inputs.perpetualGrowth + dg))),
  };
}

/** Spelled out because small models often read a negative upside as "undervalued". */
export function verdict(upside: number) {
  const gap = `${Math.abs(pct(upside))}%`;
  if (Math.abs(upside) < 0.1) return `Model value is within ${gap} of the price: roughly fairly valued on these assumptions.`;
  return upside > 0
    ? `Model value is ${gap} ABOVE the current price: the stock looks UNDERVALUED on these assumptions.`
    : `Model value is ${gap} BELOW the current price: the stock looks OVERVALUED on these assumptions (the market prices in more than this DCF).`;
}

export async function runDcf(args: DcfArgs, ctx: ToolContext) {
  if (!args.ticker && !args.saved_model_id) throw new Error('Pass a ticker, or saved_model_id from list_my_dcf_models.');
  const base = args.saved_model_id
    ? { ...(await savedModelInputs(args.saved_model_id, ctx)), warnings: [] as string[] }
    : await autoFillInputs(normalizeTickers([args.ticker!])[0]);
  const assumptions = base.assumptions;
  const inputs = applyOverrides(base.inputs, args, assumptions);
  const out = calculateDCF(inputs);
  const bull = calculateDCF(scenarioInputs(inputs, DEFAULT_SCENARIOS.bull));
  const bear = calculateDCF(scenarioInputs(inputs, DEFAULT_SCENARIOS.bear));

  const warnings = [...base.warnings];
  if (inputs.terminalMethod !== 'multiple' && out.wacc <= inputs.perpetualGrowth) {
    warnings.push('WACC is at or below terminal growth, so the perpetuity value is meaningless. Lower terminal_growth or raise the discount rate.');
  }
  if (out.freeCashFlow.some((f) => f < 0)) warnings.push('Some forecast free cash flows are negative; the value leans heavily on the terminal year.');
  if (out.terminalValueContribution > 0.8) warnings.push(`Terminal value is ${pct(out.terminalValueContribution, 0)}% of enterprise value, so the result is very sensitive to terminal assumptions.`);

  const firstYear = new Date().getFullYear();
  return {
    company: inputs.companyName,
    ticker: inputs.ticker,
    currency: inputs.currency,
    method: `${inputs.forecastYears}-year unlevered free cash flow DCF, the same model as the SGC DCF Valuation Tool`,
    based_on: 'label' in base ? base.label : 'Alpha Vantage financial statements (auto-filled like the DCF tool)',
    ...('id' in base ? { open_saved_model: `${DCF_PAGE}?model=${base.id}` } : {}),
    intrinsic_value_per_share: money(out.intrinsicValuePerShare),
    current_price: money(inputs.currentPrice),
    upside_pct: pct(out.upsideDownside),
    verdict: verdict(out.upsideDownside),
    scenarios_per_share: {
      bear: money(bear.intrinsicValuePerShare),
      base: money(out.intrinsicValuePerShare),
      bull: money(bull.intrinsicValuePerShare),
      note: 'Bull/bear shift growth ±2 pts, margins ±1.5 pts, discount rate and terminal growth (DCF tool defaults).',
    },
    discount_rate: {
      wacc_pct: pct(out.wacc, 2),
      cost_of_equity_pct: pct(out.costOfEquity, 2),
      after_tax_cost_of_debt_pct: pct(out.afterTaxCostOfDebt, 2),
    },
    valuation_musd: {
      pv_of_forecast_fcf: millions(out.pvOfFcff),
      pv_of_terminal_value: millions(out.pvOfTerminalValue),
      enterprise_value: millions(out.enterpriseValue),
      net_debt: millions(inputs.totalDebt - inputs.cashEquivalents),
      equity_value: millions(out.equityValue),
      terminal_value_share_of_ev_pct: pct(out.terminalValueContribution),
      terminal_method: inputs.terminalMethod === 'both' ? `blend: ${pct(inputs.terminalWeighting, 0)}% perpetuity growth, rest exit multiple` : inputs.terminalMethod,
    },
    forecast_musd: out.revenues.map((r, i) => ({
      year: firstYear + i,
      revenue: millions(r),
      ebit: millions(out.ebit[i]),
      free_cash_flow: millions(out.freeCashFlow[i]),
    })),
    sensitivity: sensitivity(inputs, out),
    assumptions,
    ...(warnings.length ? { warnings } : {}),
    open_tool: DCF_PAGE,
    tip: `Search ${inputs.ticker} in the DCF tool to adjust these inputs and save the model.`,
  };
}

export async function listMyDcfModels({ ticker, limit = 10 }: { ticker?: string; limit?: number }, ctx: ToolContext) {
  const models = await prisma.savedDCFModel.findMany({
    where: { userId: ctx.userId, ...(ticker ? { ticker: { equals: normalizeTickers([ticker])[0], mode: 'insensitive' as const } } : {}) },
    orderBy: { updatedAt: 'desc' },
    take: clamp(limit, 1, 25),
    select: { id: true, name: true, ticker: true, companyName: true, notes: true, updatedAt: true, outputs: true, report: { select: { id: true } } },
  });
  return {
    note: 'Only your own saved models. Re-run one with run_dcf and saved_model_id.',
    models: models.map((m) => {
      const o = (m.outputs ?? {}) as Record<string, any>;
      return {
        id: m.id,
        name: m.name,
        ticker: m.ticker,
        company: m.companyName,
        updated: m.updatedAt.toISOString().slice(0, 10),
        intrinsic_value_per_share: typeof o.intrinsicValuePerShare === 'number' ? money(o.intrinsicValuePerShare) : null,
        upside_pct: typeof o.upsideDownside === 'number' ? pct(o.upsideDownside) : null,
        wacc_pct: typeof o.wacc === 'number' ? pct(o.wacc, 2) : null,
        bear_per_share: typeof o.bear?.intrinsicValuePerShare === 'number' ? money(o.bear.intrinsicValuePerShare) : null,
        bull_per_share: typeof o.bull?.intrinsicValuePerShare === 'number' ? money(o.bull.intrinsicValuePerShare) : null,
        linked_research_report: Boolean(m.report),
        open_link: `${DCF_PAGE}?model=${m.id}`,
        ...(m.notes ? { notes: m.notes.slice(0, 300) } : {}),
      };
    }),
  };
}

const COMPS_FIELDS: [string, string][] = [
  ['market_cap_musd', 'MarketCapitalization'],
  ['ev_to_ebitda', 'EVToEBITDA'],
  ['ev_to_revenue', 'EVToRevenue'],
  ['pe_trailing', 'TrailingPE'],
  ['pe_forward', 'ForwardPE'],
  ['price_to_sales', 'PriceToSalesRatioTTM'],
  ['price_to_book', 'PriceToBookRatio'],
  ['revenue_growth_yoy_pct', 'QuarterlyRevenueGrowthYOY'],
  ['operating_margin_pct', 'OperatingMarginTTM'],
  ['profit_margin_pct', 'ProfitMargin'],
  ['beta', 'Beta'],
];

export async function getComps({ ticker, peers }: { ticker: string; peers: string[] }) {
  const subject = normalizeTickers([ticker])[0];
  const tickers = [subject, ...normalizeTickers(peers).filter((t) => t !== subject)].slice(0, 9);
  if (tickers.length < 2) throw new Error('Pass at least one peer ticker, e.g. peers: ["MSFT","GOOGL"].');
  const overviews = await runAlphaVantageSequential(tickers.map((t) => () => fetchAlphaVantageOverview(t).catch(() => ({}) as Record<string, string>)));
  const rows = tickers.map((t, i) => {
    const o = overviews[i] as Record<string, string>;
    if (!o.Symbol) return { ticker: t, error: 'No fundamentals from Alpha Vantage' };
    const row: Record<string, unknown> = { ticker: t, name: o.Name, subject: t === tickers[0] };
    for (const [key, field] of COMPS_FIELDS) {
      const x = n(o[field]);
      row[key] = x === null ? null : key === 'market_cap_musd' ? millions(x) : key.endsWith('_pct') ? pct(x) : Number(x.toFixed(2));
    }
    return row;
  });
  const median = (key: string) => {
    const xs = rows.filter((r) => !('error' in r) && !(r as any).subject).map((r) => (r as any)[key]).filter((x): x is number => typeof x === 'number').sort((a, b) => a - b);
    if (!xs.length) return null;
    const m = Math.floor(xs.length / 2);
    return xs.length % 2 ? xs[m] : Number(((xs[m - 1] + xs[m]) / 2).toFixed(2));
  };
  return {
    subject: tickers[0],
    source: 'Alpha Vantage OVERVIEW (trailing twelve months)',
    rows,
    peer_medians: Object.fromEntries(COMPS_FIELDS.filter(([k]) => k !== 'market_cap_musd').map(([k]) => [k, median(k)])),
  };
}

export async function getResearchReports({ ticker, limit = 5 }: { ticker?: string; limit?: number }, ctx: ToolContext) {
  const reports = await prisma.equityResearchReport.findMany({
    where: {
      AND: [
        { OR: [{ published: true }, { createdBy: ctx.userId }, { collaborators: { has: ctx.userId } }] },
        ...(ticker ? [{ ticker: { equals: normalizeTickers([ticker])[0], mode: 'insensitive' as const } }] : []),
      ],
    },
    orderBy: { reportDate: 'desc' },
    take: clamp(limit, 1, 10),
    select: {
      id: true, ticker: true, companyName: true, reportDate: true, analysts: true, recommendation: true, coverageStatus: true,
      currentPrice: true, targetPrice: true, impliedUpside: true, timeHorizon: true, currency: true, status: true, published: true,
      showOnWebsite: true, investmentThesis: true, valuationMethod: true, bullCase: true, bearCase: true, keyRisks: true,
      catalystsNearTerm: true, dcfOutputs: true,
    },
  });
  const text = (v: unknown, max: number) => {
    const s = typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v);
    return s.length > max ? `${s.slice(0, max)}…` : s;
  };
  return {
    note: 'Published SGC reports, plus your own and shared drafts.',
    reports: reports.map((r) => {
      const dcf = (r.dcfOutputs ?? {}) as Record<string, any>;
      return {
        report_id: r.id,
        ticker: r.ticker,
        company: r.companyName,
        date: r.reportDate.toISOString().slice(0, 10),
        analysts: r.analysts,
        status: r.published ? 'published' : r.status,
        recommendation: r.recommendation,
        coverage: r.coverageStatus,
        price_at_report: r.currentPrice,
        target_price: r.targetPrice,
        implied_upside_pct: Number((r.impliedUpside * 100).toFixed(1)),
        horizon: r.timeHorizon,
        currency: r.currency,
        valuation_method: r.valuationMethod,
        ...(typeof dcf.intrinsicValuePerShare === 'number' ? { dcf_value_per_share: money(dcf.intrinsicValuePerShare) } : {}),
        thesis: text(r.investmentThesis, 700),
        bull_case: text(r.bullCase, 300),
        bear_case: text(r.bearCase, 300),
        key_risks: text(r.keyRisks, 400),
        near_term_catalysts: text(r.catalystsNearTerm, 300),
        link: r.published && r.showOnWebsite ? `/equity-research/${r.ticker}` : `/dashboard/research/${r.id}/preview`,
      };
    }),
  };
}
