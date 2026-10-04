import {
  ALPHA_VANTAGE_STAGGER_MS,
  delay,
  fetchAlphaVantageDailyHistory,
  fetchAlphaVantageEarningsHistory,
  fetchAlphaVantageNewsSentiment,
  fetchAlphaVantageOverview,
  type DailyPrice,
} from '@/lib/alpha-vantage';
import { compsRowFromOverview, fetchFmpPeers, type CompsRow } from '@/lib/comps';
import { calculateDCF, outputsWithScenarios, type DCFInputs, type DCFOutputsWithScenarios } from '@/lib/dcf/model';
import { prisma } from '@/lib/prisma';
import { buildEpsTableMarkdown, buildScenarioCases, buildValuationMarkdown } from '@/lib/research/dcf-report';
import { buildPriceContext, buildSentimentPayload, buildTimeFrom, normalizeSentimentArticles } from '@/lib/sentiment';
import { normalizeTickers } from '@/lib/consigliere/portfolio/data';
import { applyOverrides, autoFillCached, hasOverrides, savedModelInputs, verdict, type DcfArgs, type SavedModelBase } from '@/lib/consigliere/tools/valuation';
import type { ToolContext } from '@/lib/consigliere/tools/context';

export const RECOMMENDATIONS = ['buy', 'hold', 'sell', 'overweight', 'neutral', 'underweight'] as const;
export type Recommendation = (typeof RECOMMENDATIONS)[number];
type Level = 'low' | 'medium' | 'high';

export interface ThesisBullet { title: string; claim: string; driver: string; mispricing: string }
export interface Catalyst { event: string; mechanism: string; probability: Level; timeframe: string }
export interface Risk { title: string; description: string; impact: Level; mitigation: string }

/** Sections the model writes from the member's notes; everything numeric comes from the tools. */
export interface WrittenSections {
  investment_thesis?: ThesisBullet[];
  business_model?: string;
  industry_analysis?: string;
  economic_moat?: string;
  valuation_commentary?: string;
  catalysts_near_term?: Catalyst[];
  catalysts_medium_term?: Catalyst[];
  key_risks?: Risk[];
  bull_case?: string;
  bear_case?: string;
  conclusion?: string;
}

export interface DraftArgs extends WrittenSections, Omit<DcfArgs, 'ticker'> {
  ticker: string;
  recommendation?: Recommendation;
  target_price?: number;
  peers?: string[];
}

export interface PricePerformance {
  absYTD?: number; abs1m?: number; abs3m?: number; abs12m?: number;
  relYTD?: number; rel1m?: number; rel3m?: number; rel12m?: number;
}

/** Everything needed to create the SavedDCFModel and EquityResearchReport. Saved only after the member confirms. */
export interface ReportDraft {
  version: 1;
  dcfModel: {
    /** Set when the member chose an unlinked saved model as-is: the report links to it and nothing new is created. */
    existingId?: string;
    name: string;
    notes: string;
    inputs: DCFInputs & { comps?: CompsRow[] };
    financialData: Record<string, unknown>;
  };
  report: {
    companyName: string;
    ticker: string;
    exchange: string;
    sector: string;
    industry: string;
    coverageStatus: 'initiation';
    recommendation: Recommendation;
    targetPrice: number;
    timeHorizon: string;
    currency: string;
    investmentThesis: ThesisBullet[];
    businessModel: string;
    economicMoat: string | null;
    industryAnalysis: string;
    competitivePosition: { source: 'dcf_comps'; rows: CompsRow[]; updatedAt: string } | null;
    catalystsNearTerm: Catalyst[];
    catalystsMediumTerm: Catalyst[];
    valuationMethod: 'dcf';
    valuationAnalysis: string;
    bullCase: string | null;
    bearCase: string;
    keyRisks: Risk[];
    concludingSection: string | null;
    priceDate: string;
    fiftyTwoWeekRange: string | null;
    marketCap: number | null;
    sharesOutstanding: number | null;
    fiscalYearEnd: string | null;
    dataSource: string;
    epsTableMarkdown: string | null;
    performanceMetrics: PricePerformance | null;
    peRatio: number | null;
    forwardPE: number | null;
    forwardPEConsensus: number | null;
    dividendYield: number | null;
    priceHistory: DailyPrice[] | null;
    sentimentSnapshot: Record<string, unknown> | null;
  };
}

const REVIEW_NOTE = '> **Drafted by Consigliere** from your notes and SGC tool data. Check it before publishing.\n\n';
export const reviewed = (text: string | undefined) => (text?.trim() ? `${REVIEW_NOTE}${text.trim()}` : '');
const n = (v: unknown) => {
  if (v === undefined || v === null || v === '' || v === 'None' || v === '-') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};
const round = (x: number | null, nd = 2) => (x === null || !Number.isFinite(x) ? null : Number(x.toFixed(nd)));
const titleCase = (s: string | undefined) => (s ? s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()) : '');

function closeOnOrBefore(asc: DailyPrice[], date: string) {
  for (let i = asc.length - 1; i >= 0; i -= 1) if (asc[i].date <= date) return asc[i].close;
  return null;
}

/** Absolute and S&P 500 (SPY) relative returns in percent, like the report snapshot expects. */
function pricePerformance(asc: DailyPrice[], spyAsc: DailyPrice[] | null): PricePerformance | null {
  if (asc.length < 2) return null;
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const marks = {
    YTD: iso(new Date(today.getFullYear(), 0, 1)),
    '1m': iso(new Date(today.getTime() - 30 * 864e5)),
    '3m': iso(new Date(today.getTime() - 90 * 864e5)),
    '12m': iso(new Date(today.getTime() - 365 * 864e5)),
  };
  const ret = (series: DailyPrice[], date: string) => {
    const start = closeOnOrBefore(series, date);
    const end = series[series.length - 1]?.close;
    return start && end ? ((end - start) / start) * 100 : null;
  };
  const out: PricePerformance = {};
  for (const [key, date] of Object.entries(marks) as [keyof typeof marks, string][]) {
    const abs = ret(asc, date);
    const market = spyAsc ? ret(spyAsc, date) : null;
    if (abs !== null) out[`abs${key}` as keyof PricePerformance] = round(abs, 1)!;
    if (abs !== null && market !== null) out[`rel${key}` as keyof PricePerformance] = round(abs - market, 1)!;
  }
  return out;
}

/** SGC's default when the member gives no rating: buy above +10% upside to target, sell below -10%, otherwise hold. */
export const RATING_BAND = 0.1;
export function defaultRating(targetPrice: number, currentPrice: number): Recommendation {
  if (!(currentPrice > 0) || !(targetPrice > 0)) return 'hold';
  const upside = (targetPrice - currentPrice) / currentPrice;
  return upside > RATING_BAND ? 'buy' : upside < -RATING_BAND ? 'sell' : 'hold';
}

async function safely<T>(task: () => Promise<T>, warnings: string[], what: string): Promise<T | null> {
  try {
    return await task();
  } catch (err) {
    warnings.push(`${what} unavailable: ${err instanceof Error ? err.message.slice(0, 160) : String(err)}`);
    return null;
  }
}

const pctText = (x: number, nd = 1) => `${(x * 100).toFixed(nd)}%`;

function assumptionsUsed(i: DCFInputs) {
  return {
    revenue_growth: i.revenueGrowth.map((g) => pctText(g)).join(', '),
    ebit_margin: i.ebitMargin.map((m) => pctText(m)).join(', '),
    capex_pct_revenue: pctText(i.capexPercentOfRevenue),
    tax_rate: pctText(i.taxRate),
    beta: i.beta.toFixed(2),
    equity_risk_premium: pctText(i.equityRiskPremium),
    risk_free_rate: pctText(i.riskFreeRate, 2),
    terminal_growth: pctText(i.perpetualGrowth, 2),
    exit_multiple: `${i.exitMultiple.toFixed(1)}x ${i.exitMultipleMetric.toUpperCase()}`,
    terminal_method: i.terminalMethod,
  };
}

/**
 * Step one of a report: the auto-filled DCF assumptions with their sources, a preview value, and the member's
 * saved models for the ticker, so the model can ask before anything is drafted.
 */
export async function proposeDcfAssumptions(tickerArg: string, ctx: ToolContext) {
  const ticker = normalizeTickers([tickerArg])[0];
  const base = await autoFillCached(ticker);
  const i = base.inputs;
  const a = base.assumptions;
  const p = pctText;
  const src = (key: string, fallback = 'DCF tool default') => a[key]?.source ?? fallback;
  const preview = calculateDCF(i);
  const savedModels = await prisma.savedDCFModel.findMany({
    where: { userId: ctx.userId, ticker: { equals: ticker, mode: 'insensitive' } },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: { id: true, name: true, updatedAt: true, outputs: true, report: { select: { id: true } } },
  });

  return {
    company: i.companyName,
    ticker,
    current_price: round(i.currentPrice),
    assumptions_to_confirm: [
      { argument: 'revenue_growth', proposed: i.revenueGrowth.map((g) => p(g)).join(', '), source: src('revenue_growth_pct'), question: `Revenue growth for each of the ${i.forecastYears} forecast years?` },
      { argument: 'ebit_margin', proposed: p(i.ebitMargin[0]), source: src('ebit_margin_pct'), question: 'EBIT (operating) margin?' },
      { argument: 'capex_pct_revenue', proposed: p(i.capexPercentOfRevenue), source: src('capex_pct_revenue'), question: 'Capex as a share of revenue?' },
      { argument: 'tax_rate', proposed: p(i.taxRate), source: src('tax_rate_pct'), question: 'Tax rate?' },
      { argument: 'beta', proposed: i.beta.toFixed(2), source: src('beta'), question: 'Beta?' },
      { argument: 'equity_risk_premium', proposed: p(i.equityRiskPremium), source: src('equity_risk_premium_pct'), question: 'Equity risk premium?' },
      { argument: 'risk_free_rate', proposed: p(i.riskFreeRate, 2), source: src('risk_free_rate_pct'), question: 'Risk-free rate (usually keep the live 10-year yield)?' },
      { argument: 'terminal_growth', proposed: p(i.perpetualGrowth, 2), source: src('terminal_growth_pct'), question: 'Long-run growth after the forecast?' },
      { argument: 'exit_multiple', proposed: `${i.exitMultiple.toFixed(1)}x EV/EBITDA`, source: src('exit_multiple'), question: 'Exit multiple?' },
      { argument: 'terminal_method', proposed: i.terminalMethod, source: 'DCF tool default', question: 'Terminal value method: perpetuity growth, exit multiple, or both?' },
    ],
    preview_with_proposed: {
      value_per_share: round(preview.intrinsicValuePerShare),
      upside_pct: round(preview.upsideDownside * 100, 1),
      wacc_pct: round(preview.wacc * 100),
    },
    saved_models: savedModels.map((m) => {
      const o = (m.outputs ?? {}) as { intrinsicValuePerShare?: number };
      const value = typeof o.intrinsicValuePerShare === 'number' ? o.intrinsicValuePerShare : null;
      return {
        saved_model_id: m.id,
        name: m.name,
        updated: m.updatedAt.toISOString().slice(0, 10),
        value_per_share: value == null ? null : round(value),
        upside_vs_live_price_pct: value == null || !(i.currentPrice > 0) ? null : round((value / i.currentPrice - 1) * 100, 1),
        linked_to_a_report: Boolean(m.report),
        open_link: `/dashboard/tools/dcf?model=${m.id}`,
      };
    }),
    ...(base.warnings.length ? { warnings: base.warnings } : {}),
  };
}

/** Runs the SGC tools for a ticker and assembles a draft DCF model and research report (nothing is written). */
export async function buildReportDraft(args: DraftArgs, ctx: ToolContext) {
  const ticker = normalizeTickers([args.ticker])[0];
  const base = await autoFillCached(ticker);
  const warnings = [...base.warnings];

  let saved: SavedModelBase | null = null;
  let existingModelId: string | undefined;
  if (args.saved_model_id) {
    saved = await savedModelInputs(args.saved_model_id, ctx);
    if (saved.ticker.toUpperCase() !== ticker) throw new Error(`Saved model "${saved.name}" is for ${saved.ticker}, not ${ticker}.`);
    const livePrice = base.inputs.currentPrice;
    if (livePrice > 0 && Math.abs(saved.inputs.currentPrice / livePrice - 1) > 0.05) {
      warnings.push(
        `Your saved model uses a price of $${saved.inputs.currentPrice.toFixed(2)} (saved ${saved.updatedAt.toISOString().slice(0, 10)}); the live price is $${livePrice.toFixed(2)}. Upside is measured from the saved price.`
      );
    }
    if (hasOverrides(args)) {
      warnings.push(`Your changes are applied to a copy of "${saved.name}"; the saved model itself is not changed.`);
    } else if (saved.linkedReportId) {
      warnings.push(`"${saved.name}" is already linked to another report, so a copy is saved with this one; the original is not changed.`);
    } else {
      existingModelId = saved.id;
    }
  }
  const inputs = applyOverrides(saved ? saved.inputs : base.inputs, args, saved ? saved.assumptions : base.assumptions);
  const outputs: DCFOutputsWithScenarios = outputsWithScenarios(inputs);
  const o = base.overview;
  if (/bank|insurance|capital markets|credit services|asset management|mortgage/i.test(`${o.Industry ?? ''}`) || /financial/i.test(`${o.Sector ?? ''}`)) {
    warnings.push(
      `${ticker} is a financial company. A free-cash-flow DCF treats its loans and deposits like operating items, so the DCF value is only a rough guide; consider P/B, P/E or a dividend discount view in the write-up.`
    );
  }

  await delay(ALPHA_VANTAGE_STAGGER_MS);
  const earnings = await safely(() => fetchAlphaVantageEarningsHistory(ticker), warnings, 'EPS history');
  await delay(ALPHA_VANTAGE_STAGGER_MS);
  const history = (await safely(() => fetchAlphaVantageDailyHistory(ticker, 'full'), warnings, 'Price history')) ?? [];
  await delay(ALPHA_VANTAGE_STAGGER_MS);
  const spy = await safely(() => fetchAlphaVantageDailyHistory('SPY', 'full'), warnings, 'S&P 500 (SPY) history for relative performance');
  await delay(ALPHA_VANTAGE_STAGGER_MS);
  const news = await safely(
    () => fetchAlphaVantageNewsSentiment({ tickers: ticker, timeFrom: buildTimeFrom(7), sort: 'LATEST', limit: 40 }),
    warnings,
    'News sentiment'
  );

  let sentimentSnapshot: Record<string, unknown> | null = null;
  if (news) {
    const articles = normalizeSentimentArticles(news, ticker);
    const entity = { query: ticker, keyword: null, symbol: ticker, companyName: inputs.companyName, articles, usedTickerFilter: true, usedKeywordFilter: false };
    const first = buildSentimentPayload({ ...entity, priceContext: null });
    const priceContext = buildPriceContext(inputs.currentPrice, null, history.length ? history : null, first.snapshot.overallSentimentLabel);
    sentimentSnapshot = { ...buildSentimentPayload({ ...entity, priceContext }), pulledAt: new Date().toISOString(), horizonDays: 7 };
  }

  const peerTickers = (args.peers?.length ? normalizeTickers(args.peers) : await fetchFmpPeers(ticker)).filter((t) => t !== ticker).slice(0, 6);
  const comps: CompsRow[] = [];
  const subjectRow = compsRowFromOverview(o, ticker);
  if (subjectRow) comps.push({ ...subjectRow, isSubject: true });
  for (const peer of peerTickers) {
    await delay(ALPHA_VANTAGE_STAGGER_MS);
    const row = await safely(async () => compsRowFromOverview(await fetchAlphaVantageOverview(peer), peer), warnings, `Comps for ${peer}`);
    if (row) comps.push(row);
    else if (!warnings.some((w) => w.startsWith(`Comps for ${peer}`))) warnings.push(`Comps for ${peer} skipped: Alpha Vantage has no company overview for it.`);
  }
  if (!peerTickers.length) warnings.push('No peers given and no FMP key for automatic peers, so the comps table only has the company itself. Pass peers to fill it.');

  const quarterlyEPS = (earnings?.quarterlyEarnings ?? [])
    .filter((q) => q.reportedEPS !== null)
    .slice(0, 12)
    .map((q) => ({ fiscalDateEnding: q.fiscalDateEnding, reportedEPS: String(q.reportedEPS) }));
  const performance = pricePerformance(history, spy);
  const priceHistory = history.slice(-260).reverse();
  const shares = inputs.sharesOutstanding;
  const dilutedEPSTTM = n(o.DilutedEPSTTM);
  const forwardPE = dilutedEPSTTM && dilutedEPSTTM > 0 ? round(inputs.currentPrice / (dilutedEPSTTM * (1 + inputs.revenueGrowth[0]))) : null;
  const week52High = n(o['52WeekHigh']);
  const week52Low = n(o['52WeekLow']);
  const peRatio = n(o.PERatio);
  const forwardPEConsensus = n(o.ForwardPE);
  const dividendYield = n(o.DividendYield);

  const inc = [...base.statements.income].reverse();
  const bal = [...base.statements.balance].reverse();
  const cf = [...base.statements.cashflow].reverse();
  const col = (rows: Record<string, string>[], ...fields: string[]) => rows.map((r) => fields.reduce<number | null>((v, f) => v ?? n(r[f]), null) ?? 0);
  const financialData: Record<string, unknown> = {
    periods: inc.map((r) => r.fiscalDateEnding),
    revenue: col(inc, 'totalRevenue'),
    ebit: col(inc, 'ebit', 'operatingIncome'),
    ebitda: col(inc, 'ebitda'),
    netIncome: col(inc, 'netIncome'),
    totalAssets: col(bal, 'totalAssets'),
    totalLiabilities: col(bal, 'totalLiabilities'),
    shareholdersEquity: col(bal, 'totalShareholderEquity'),
    cashAndEquivalents: col(bal, 'cashAndCashEquivalentsAtCarryingValue', 'cashAndShortTermInvestments'),
    totalDebt: col(bal, 'shortLongTermDebtTotal', 'longTermDebt'),
    capex: col(cf, 'capitalExpenditures').map(Math.abs),
    depreciation: col(inc, 'depreciationAndAmortization'),
    workingCapital: bal.map((r) => (n(r.totalCurrentAssets) ?? 0) - (n(r.totalCurrentLiabilities) ?? 0)),
    currentAssets: col(bal, 'totalCurrentAssets'),
    currentLiabilities: col(bal, 'totalCurrentLiabilities'),
    companyName: inputs.companyName,
    ticker,
    sector: titleCase(o.Sector),
    industry: titleCase(o.Industry),
    fiscalYearEnd: o.FiscalYearEnd || undefined,
    week52High: week52High ?? undefined,
    week52Low: week52Low ?? undefined,
    sharesOutstanding: shares,
    peRatio: peRatio ?? undefined,
    forwardPE: forwardPE ?? undefined,
    forwardPEConsensus: forwardPEConsensus ?? undefined,
    dividendYield: dividendYield !== null ? dividendYield * 100 : undefined,
    dilutedEPSTTM: dilutedEPSTTM ?? undefined,
    quarterlyEPS,
    pricePerformance: performance ?? undefined,
    priceHistory,
  };

  const modelForReport = { companyName: inputs.companyName, inputs, outputs };
  const scenarios = buildScenarioCases(modelForReport);
  const commentary = args.valuation_commentary?.trim();
  const today = new Date();
  const dcfInputs = { ...inputs, ...(comps.length > 1 ? { comps } : {}) };
  const targetPrice = round(args.target_price ?? outputs.intrinsicValuePerShare) ?? 0;

  const draft: ReportDraft = {
    version: 1,
    dcfModel: {
      ...(existingModelId ? { existingId: existingModelId } : {}),
      name: saved && !existingModelId ? `${saved.name} (copy, ${today.toISOString().slice(0, 10)})` : saved ? saved.name : `${ticker} DCF (Consigliere, ${today.toISOString().slice(0, 10)})`,
      notes: saved
        ? `Based on ${saved.label}${hasOverrides(args) ? ' with changes agreed in Consigliere' : ''}.`
        : 'Auto-filled by Consigliere from Alpha Vantage statements and FRED DGS10, with assumptions agreed in the chat. Review them before relying on it.',
      inputs: dcfInputs,
      financialData,
    },
    report: {
      companyName: inputs.companyName,
      ticker,
      exchange: o.Exchange || '',
      sector: titleCase(o.Sector),
      industry: titleCase(o.Industry),
      coverageStatus: 'initiation',
      recommendation: args.recommendation ?? defaultRating(targetPrice, inputs.currentPrice),
      targetPrice,
      timeHorizon: '12 months',
      currency: inputs.currency,
      investmentThesis: args.investment_thesis ?? [],
      businessModel: reviewed(args.business_model),
      economicMoat: reviewed(args.economic_moat) || null,
      industryAnalysis: reviewed(args.industry_analysis),
      competitivePosition: comps.length ? { source: 'dcf_comps', rows: comps, updatedAt: today.toISOString() } : null,
      catalystsNearTerm: args.catalysts_near_term ?? [],
      catalystsMediumTerm: args.catalysts_medium_term ?? [],
      valuationMethod: 'dcf',
      valuationAnalysis: `${commentary ? `${reviewed(commentary)}\n\n` : ''}${buildValuationMarkdown(modelForReport)}`,
      bullCase: [reviewed(args.bull_case), scenarios?.bullCase].filter(Boolean).join('\n\n') || null,
      bearCase: [reviewed(args.bear_case), scenarios?.bearCase].filter(Boolean).join('\n\n'),
      keyRisks: args.key_risks ?? [],
      concludingSection: reviewed(args.conclusion) || null,
      priceDate: today.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' }).replace(',', ''),
      fiftyTwoWeekRange: week52High && week52Low ? `${week52Low.toFixed(2)}-${week52High.toFixed(2)}` : null,
      marketCap: shares ? round((inputs.currentPrice * shares) / 1e6) : null,
      sharesOutstanding: shares ? round(shares / 1e6) : null,
      fiscalYearEnd: o.FiscalYearEnd || null,
      dataSource: 'Alpha Vantage API, FRED; drafted with SGC Consigliere',
      epsTableMarkdown: buildEpsTableMarkdown(quarterlyEPS) || null,
      performanceMetrics: performance,
      peRatio,
      forwardPE,
      forwardPEConsensus,
      dividendYield: dividendYield !== null ? round(dividendYield * 100) : null,
      priceHistory: priceHistory.length ? priceHistory : null,
      sentimentSnapshot,
    },
  };

  const { recommendation } = draft.report;
  const price = inputs.currentPrice;
  if (price > 0 && targetPrice > 0) {
    const bullish = ['buy', 'overweight'].includes(recommendation);
    const bearish = ['sell', 'underweight'].includes(recommendation);
    if ((bullish && targetPrice < price) || (bearish && targetPrice > price)) {
      warnings.push(
        `Rating "${recommendation}" conflicts with the target price ${targetPrice} vs current price ${round(price)}` +
          (args.target_price === undefined ? ' (the target defaulted to the DCF value). Pass target_price or change the rating.' : '.')
      );
    }
  }

  const written: [keyof WrittenSections, string][] = [
    ['investment_thesis', 'Investment thesis'],
    ['business_model', 'Business model'],
    ['industry_analysis', 'Industry analysis'],
    ['economic_moat', 'Economic moat'],
    ['catalysts_near_term', 'Near-term catalysts'],
    ['catalysts_medium_term', 'Medium-term catalysts'],
    ['key_risks', 'Key risks'],
    ['bull_case', 'Bull case narrative'],
    ['bear_case', 'Bear case narrative'],
    ['conclusion', 'Conclusion'],
  ];
  const has = (k: keyof WrittenSections) => {
    const v = args[k];
    return Array.isArray(v) ? v.length > 0 : Boolean(v && String(v).trim());
  };
  const fromTools = [
    existingModelId ? `Your saved DCF model "${saved!.name}" (linked, not changed) and valuation analysis` : 'DCF model (opens in the DCF tool) and valuation analysis',
    'Bull/bear scenario values',
    'Company snapshot (price, market cap, 52-week range, P/E, dividend yield)',
    ...(quarterlyEPS.length ? ['EPS table'] : []),
    ...(priceHistory.length ? ['Price chart and performance vs S&P 500'] : []),
    ...(comps.length > 1 ? [`Comparable companies (${comps.length - 1} peers)`] : []),
    ...(sentimentSnapshot ? ['News sentiment snapshot'] : []),
    ...(!args.recommendation && price > 0
      ? [`Rating "${recommendation}" from ${round(((targetPrice - price) / price) * 100, 1)}% upside to target (buy above +10%, sell below -10%)`]
      : []),
  ];

  const summary = {
    company: inputs.companyName,
    ticker,
    intrinsic_value_per_share: round(outputs.intrinsicValuePerShare),
    bear_per_share: round(outputs.bear.intrinsicValuePerShare),
    bull_per_share: round(outputs.bull.intrinsicValuePerShare),
    current_price: round(inputs.currentPrice),
    upside_pct: round(outputs.upsideDownside * 100, 1),
    verdict: verdict(outputs.upsideDownside),
    wacc_pct: round(outputs.wacc * 100),
    assumptions_used: assumptionsUsed(inputs),
    recommendation: draft.report.recommendation,
    target_price: draft.report.targetPrice,
    filled_from_tools: fromTools,
    drafted_from_notes: written.filter(([k]) => has(k)).map(([, label]) => label),
    left_empty: written.filter(([k]) => !has(k)).map(([, label]) => label),
    warnings: warnings.length ? warnings : undefined,
  };
  return { draft, summary };
}
