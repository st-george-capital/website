import { prisma } from '@/lib/prisma';

type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'string[]' | 'json';

interface TableSpec {
  /** Prisma client delegate name */
  model: string;
  description: string;
  /** Only these columns are ever selected. Personal data (emails, user ids, resumes, votes) is deliberately absent. */
  fields: Record<string, FieldType>;
  /** Fixed nested selects exposed as extra read-only columns. */
  relations?: Record<string, object>;
  /** Always applied, e.g. hide drafts. */
  baseWhere?: Record<string, unknown>;
  defaultOrder: [string, 'asc' | 'desc'];
}

export const SGC_TABLES: Record<string, TableSpec> = {
  holdings: {
    model: 'holding',
    description: 'Current fund positions (visible holdings). quantity = shares; costBasis = average cost per share.',
    fields: { ticker: 'string', apiTicker: 'string', assetType: 'string', quantity: 'number', costBasis: 'number', entryDate: 'date', sector: 'string', region: 'string', strategyTag: 'string', exchange: 'string', notes: 'string' },
    baseWhere: { visible: true },
    defaultOrder: ['ticker', 'asc'],
  },
  transactions: {
    model: 'transaction',
    description: 'Fund trade log: buys/sells with price, fees, realized P&L and position before/after.',
    fields: { ticker: 'string', type: 'string', quantity: 'number', price: 'number', fees: 'number', date: 'date', realizedPnL: 'number', avgCostAtTrade: 'number', positionBefore: 'number', positionAfter: 'number', cashBefore: 'number', cashAfter: 'number', exchange: 'string', notes: 'string' },
    defaultOrder: ['date', 'desc'],
  },
  portfolio_snapshots: {
    model: 'portfolioSnapshot',
    description: 'Daily fund value history: total value, stocks value, cash, cost basis, realized P&L.',
    fields: { date: 'date', portfolioValue: 'number', stocksValue: 'number', cashBalance: 'number', totalCostBasis: 'number', realizedPnL: 'number', positionCount: 'number' },
    defaultOrder: ['date', 'desc'],
  },
  market_quotes: {
    model: 'marketData',
    description: 'Cached latest quotes for tickers the site tracks.',
    fields: { ticker: 'string', price: 'number', change: 'number', changePercent: 'number', volume: 'number', lastUpdated: 'date' },
    defaultOrder: ['ticker', 'asc'],
  },
  committee_decisions: {
    model: 'holdingCommitteeDecision',
    description: 'Investment committee decisions on holdings: final decision, average conviction, objections, summary.',
    fields: { meetingDate: 'date', finalDecision: 'string', averageConviction: 'number', keyObjections: 'string', summary: 'string' },
    relations: { holding: { select: { ticker: true } } },
    defaultOrder: ['meetingDate', 'desc'],
  },
  investment_pitches: {
    model: 'investmentPitch',
    description: 'Stock pitches presented by members: company, sector, date, description.',
    fields: { title: 'string', company: 'string', sector: 'string', subcategory: 'string', pitchDate: 'date', description: 'string', published: 'boolean' },
    defaultOrder: ['pitchDate', 'desc'],
  },
  research_reports: {
    model: 'equityResearchReport',
    description: 'Published equity research reports: recommendation, current/target price, upside, thesis, bull/bear case, risks. For your own drafts use get_research_reports.',
    fields: { companyName: 'string', ticker: 'string', sector: 'string', industry: 'string', reportDate: 'date', analysts: 'string[]', recommendation: 'string', currentPrice: 'number', targetPrice: 'number', impliedUpside: 'number', timeHorizon: 'string', status: 'string', published: 'boolean', valuationMethod: 'string', investmentThesis: 'json', bullCase: 'string', bearCase: 'string', keyRisks: 'json', catalystsNearTerm: 'json', marketCap: 'number', peRatio: 'number', forwardPE: 'number' },
    baseWhere: { published: true },
    defaultOrder: ['reportDate', 'desc'],
  },
  investments: {
    model: 'investment',
    description: 'Published fund investment write-ups: thesis, entry price, targets, exit price, active flag.',
    fields: { type: 'string', title: 'string', company: 'string', ticker: 'string', year: 'string', season: 'string', thesis: 'string', entryDate: 'date', priceAtEntry: 'number', initialTarget: 'number', currentTarget: 'number', exitPrice: 'number', active: 'boolean', published: 'boolean', tags: 'string' },
    defaultOrder: ['entryDate', 'desc'],
  },
  strategy_documents: {
    model: 'strategyDocument',
    description: 'Fund strategy documents and outlooks with executive summaries.',
    fields: { type: 'string', title: 'string', year: 'string', executiveSummary: 'string', industries: 'string', sectors: 'string', published: 'boolean', publishDate: 'date' },
    defaultOrder: ['publishDate', 'desc'],
  },
  articles: {
    model: 'article',
    description: 'Published SGC articles: title, excerpt, author, division, tags.',
    fields: { title: 'string', slug: 'string', excerpt: 'string', author: 'string', division: 'string', tags: 'string', featured: 'boolean', publishedAt: 'date' },
    baseWhere: { published: true },
    defaultOrder: ['publishedAt', 'desc'],
  },
  calendar_events: {
    model: 'calendarEvent',
    description: 'Club calendar: meetings, deadlines and events.',
    fields: { title: 'string', description: 'string', startDate: 'date', endDate: 'date', allDay: 'boolean', location: 'string', category: 'string', subcategory: 'string', priority: 'string', status: 'string', tags: 'string[]' },
    defaultOrder: ['startDate', 'desc'],
  },
  weekly_content: {
    model: 'weeklyContent',
    description: 'Weekly club content by term and week.',
    fields: { title: 'string', category: 'string', year: 'string', season: 'string', week: 'number', description: 'string', published: 'boolean', publishDate: 'date' },
    defaultOrder: ['publishDate', 'desc'],
  },
  team_members: {
    model: 'teamMember',
    description: 'Public team roster: name, title, division, program, year, executive/alumni flags.',
    fields: { name: 'string', title: 'string', role: 'string', division: 'string', program: 'string', year: 'string', isExecutive: 'boolean', isAlumni: 'boolean' },
    defaultOrder: ['order', 'asc'],
  },
  job_postings: {
    model: 'jobPosting',
    description: 'Open club roles: team, deadline, requirements.',
    fields: { title: 'string', team: 'string', description: 'string', requirements: 'string', roleTag: 'string', endDate: 'date', published: 'boolean' },
    defaultOrder: ['endDate', 'desc'],
  },
  macro_regimes: {
    model: 'regimeLabel',
    description: 'Macro Allocation Engine regime label per date (e.g. expansion, late-cycle) with confidence.',
    fields: { date: 'date', regimeLabel: 'string', labelIndex: 'number', confidence: 'number' },
    defaultOrder: ['date', 'desc'],
  },
  regime_transitions: {
    model: 'regimeTransition',
    description: 'Estimated probabilities of moving from one macro regime to another over 1/63/126/252 trading days.',
    fields: { fromLabel: 'string', toLabel: 'string', prob1Day: 'number', prob63Day: 'number', prob126Day: 'number', prob252Day: 'number', computedAt: 'date' },
    defaultOrder: ['computedAt', 'desc'],
  },
  allocation_signals: {
    model: 'allocationSignal',
    description: 'Macro engine country/sector ETF signals per run date: direction (overweight/underweight/neutral), score, rank, 6m/12m outperformance probability.',
    fields: { runDate: 'date', ticker: 'string', etfTicker: 'string', direction: 'string', score: 'number', convictionScore: 'number', rank: 'number', regimeLabel: 'string', prob6m: 'number', prob12m: 'number' },
    defaultOrder: ['runDate', 'desc'],
  },
  stock_screen: {
    model: 'stockScreenResult',
    description: 'Macro engine single-stock screen per run date: composite score, relative strength, EPS rank, moving-average position, revisions.',
    fields: { runDate: 'date', ticker: 'string', sectorEtf: 'string', compositeScore: 'number', rsRating: 'number', epsRankProxy: 'number', smrProxy: 'string', dma50Position: 'number', dma200Position: 'number', institutionalSponsorshipTrend: 'number', earningsRevisionMomentum: 'number', analystConsensus: 'json' },
    defaultOrder: ['runDate', 'desc'],
  },
  backtest_metrics: {
    model: 'backtestMetric',
    description: 'Macro engine out-of-sample backtest results: hit rate, annualized Sharpe, max drawdown per window/benchmark.',
    fields: { window: 'string', benchmark: 'string', hitRate: 'number', sharpeAnn: 'number', maxDrawdown: 'number', startDate: 'string', endDate: 'string', nPeriods: 'number', createdAt: 'date' },
    defaultOrder: ['createdAt', 'desc'],
  },
  macro_series: {
    model: 'macroSeriesVintage',
    description: 'Stored FRED/ALFRED macro observations with vintage dates. Filter by seriesId (e.g. CPIAUCSL, UNRATE).',
    fields: { seriesId: 'string', observationDate: 'date', realtimeStart: 'date', realtimeEnd: 'date', value: 'number' },
    defaultOrder: ['observationDate', 'desc'],
  },
  daily_prices: {
    model: 'ohlcvDaily',
    description: 'Stored daily OHLCV for the macro-engine ETF universe. adjClose is split/dividend adjusted. Filter by ticker.',
    fields: { ticker: 'string', date: 'date', open: 'number', high: 'number', low: 'number', close: 'number', adjClose: 'number', volume: 'number' },
    defaultOrder: ['date', 'desc'],
  },
  earnings_revisions: {
    model: 'earningsRevision',
    description: 'Analyst EPS/revenue estimates by symbol and date.',
    fields: { symbol: 'string', date: 'date', estimatedEpsLow: 'number', estimatedEpsHigh: 'number', estimatedEpsAvg: 'number', estimatedRevAvg: 'number', numAnalystsEps: 'number' },
    defaultOrder: ['date', 'desc'],
  },
  oecd_leading_indicators: {
    model: 'oecdLeadingIndicator',
    description: 'OECD composite leading indicator by country and month.',
    fields: { country: 'string', period: 'date', cliValue: 'number', seriesId: 'string' },
    defaultOrder: ['period', 'desc'],
  },
  trade_signals: {
    model: 'tradeSignal',
    description: 'Trade Shift Radar signals from shipment data: type, severity, route/theme, score and explanation.',
    fields: { signalWeek: 'date', signalType: 'string', status: 'string', severityBucket: 'string', sourceCountry: 'string', direction: 'string', hs6: 'string', routeKey: 'string', themeKey: 'string', themeLabel: 'string', signalScore: 'number', yoyDelta: 'number', materialityValue: 'number', explanation: 'string', marketTags: 'string[]' },
    defaultOrder: ['signalWeek', 'desc'],
  },
  trade_themes: {
    model: 'tradeThemeMap',
    description: 'Mapping of HS6 product codes to investable trade themes and market tags.',
    fields: { hs6: 'string', hs4: 'string', themeKey: 'string', themeLabel: 'string', marketTags: 'string[]', notes: 'string' },
    defaultOrder: ['themeKey', 'asc'],
  },
  cvar_optimizer_runs: {
    model: 'savedOptimizationRun',
    description: 'CVaR optimizer runs on fund holdings: target weights, expected CVaR vs benchmark, sector/region weights, suggested trades.',
    fields: { asOfDate: 'date', status: 'string', targetWeights: 'json', expectedCVaR: 'number', expectedReturn: 'number', benchmarkCVaR: 'number', sectorWeights: 'json', regionWeights: 'json', suggestedTrades: 'json', notes: 'string', createdAt: 'date' },
    defaultOrder: ['createdAt', 'desc'],
  },
  cvar_constraint_sets: {
    model: 'optimizationConstraintSet',
    description: 'CVaR optimizer constraint sets: sector/region limits, factor tilts, max position, turnover, CVaR confidence.',
    fields: { name: 'string', isActive: 'boolean', sectorLimits: 'json', regionLimits: 'json', factorTilts: 'json', maxSinglePositionWeight: 'number', turnoverLimit: 'number', cvarConfidence: 'number', cvarHorizonDays: 'number', updatedAt: 'date' },
    defaultOrder: ['updatedAt', 'desc'],
  },
  factor_exposures: {
    model: 'factorExposure',
    description: 'Per-ticker factor scores (value, growth, momentum, quality, low-volatility, size) by date.',
    fields: { ticker: 'string', asOfDate: 'date', value: 'number', growth: 'number', momentum: 'number', quality: 'number', volatility: 'number', size: 'number', dataComplete: 'boolean' },
    defaultOrder: ['asOfDate', 'desc'],
  },
  learning_courses: {
    model: 'learningCourse',
    description: 'Published SGC learning courses.',
    fields: { title: 'string', slug: 'string', summary: 'string', tags: 'string', order: 'number' },
    baseWhere: { published: true },
    defaultOrder: ['order', 'asc'],
  },
  interview_questions: {
    model: 'communityInterviewQuestion',
    description: 'Approved interview bank questions with answers, by role, type, difficulty and firm.',
    fields: { question: 'string', answer: 'string', role: 'string', subcategory: 'string', questionType: 'string', difficulty: 'string', company: 'string', firmType: 'string', topicTags: 'string[]' },
    baseWhere: { approved: true },
    defaultOrder: ['role', 'asc'],
  },
  workshop_projects: {
    model: 'workshopProject',
    description: 'Member research workshop projects: summary, hypothesis, status, tags.',
    fields: { title: 'string', summary: 'string', hypothesis: 'string', status: 'string', tags: 'string[]', githubUrl: 'string', updatedAt: 'date' },
    defaultOrder: ['updatedAt', 'desc'],
  },
};

export const TABLE_NAMES = Object.keys(SGC_TABLES) as [string, ...string[]];
export const FILTER_OPS = ['equals', 'not', 'contains', 'starts_with', 'gt', 'gte', 'lt', 'lte', 'in', 'has'] as const;
export type FilterOp = (typeof FILTER_OPS)[number];

export interface Filter {
  field: string;
  op: FilterOp;
  value: unknown;
}

const MAX_STRING = 1200;
const MAX_JSON = 2500;
const RESULT_BUDGET = 14000;

function delegate(model: string) {
  const d = (prisma as unknown as Record<string, unknown>)[model];
  if (!d) throw new Error(`Table model '${model}' is not available.`);
  return d as {
    findMany: (args: object) => Promise<Record<string, unknown>[]>;
    count: (args: object) => Promise<number>;
    aggregate: (args: object) => Promise<Record<string, Record<string, unknown>>>;
    groupBy: (args: object) => Promise<Record<string, unknown>[]>;
  };
}

function spec(table: string): TableSpec {
  const s = SGC_TABLES[table];
  if (!s) throw new Error(`Unknown table '${table}'. Available: ${TABLE_NAMES.join(', ')}.`);
  return s;
}

/**
 * Small models guess column names ("date", "pitch_date", "Ticker"). Accept the exact name, a
 * case/underscore-insensitive match, or the single column that contains the guess.
 */
function resolveField(s: TableSpec, name: string, { relations = false } = {}): string {
  const names = [...Object.keys(s.fields), ...(relations ? Object.keys(s.relations ?? {}) : [])];
  if (names.includes(name)) return name;
  const norm = (v: string) => v.toLowerCase().replace(/[_\s-]/g, '');
  const target = norm(name);
  const exact = names.find((n) => norm(n) === target);
  if (exact) return exact;
  const partial = target ? names.filter((n) => norm(n).includes(target)) : [];
  if (partial.length === 1) return partial[0];
  const hint = partial.length > 1 ? ` Did you mean one of ${partial.join(', ')}?` : '';
  throw new Error(`Unknown field '${name}'.${hint} Fields: ${names.join(', ')}.`);
}

function coerce(type: FieldType, value: unknown, field: string): unknown {
  if (Array.isArray(value)) return value.map((v) => coerce(type === 'string[]' ? 'string' : type, v, field));
  if (type === 'number') {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error(`Filter on '${field}' needs a number, got ${JSON.stringify(value)}.`);
    return n;
  }
  if (type === 'date') {
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) throw new Error(`Filter on '${field}' needs a date like 2026-01-31, got ${JSON.stringify(value)}.`);
    return d;
  }
  if (type === 'boolean') return value === true || value === 'true' || value === 1;
  return String(value);
}

function buildWhere(s: TableSpec, filters: Filter[] = []): Record<string, unknown> {
  const and: Record<string, unknown>[] = s.baseWhere ? [s.baseWhere] : [];
  for (const raw of filters) {
    const f = { ...raw, field: resolveField(s, raw.field) };
    const type = s.fields[f.field];
    if (type === 'json') throw new Error(`Field '${f.field}' is JSON and cannot be filtered.`);
    let clause: unknown;
    switch (f.op) {
      case 'equals':
        clause = type === 'string' ? { equals: coerce(type, f.value, f.field), mode: 'insensitive' } : coerce(type, f.value, f.field);
        break;
      case 'not':
        clause = { not: coerce(type, f.value, f.field) };
        break;
      case 'contains':
      case 'starts_with':
        if (type !== 'string') throw new Error(`'${f.op}' only works on text fields; '${f.field}' is ${type}.`);
        clause = { [f.op === 'contains' ? 'contains' : 'startsWith']: String(f.value), mode: 'insensitive' };
        break;
      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte':
        if (type !== 'number' && type !== 'date') throw new Error(`'${f.op}' only works on number/date fields; '${f.field}' is ${type}.`);
        clause = { [f.op]: coerce(type, f.value, f.field) };
        break;
      case 'in': {
        const values = Array.isArray(f.value) ? f.value : String(f.value).split(',').map((v) => v.trim());
        clause =
          type === 'string[]'
            ? { hasSome: values.map(String) }
            : { in: coerce(type, values, f.field) };
        break;
      }
      case 'has':
        if (type !== 'string[]') throw new Error(`'has' only works on list fields; '${f.field}' is ${type}.`);
        clause = { has: String(f.value) };
        break;
      default:
        throw new Error(`Unknown filter op '${String(f.op)}'. Use one of ${FILTER_OPS.join(', ')}.`);
    }
    and.push({ [f.field]: clause });
  }
  return and.length ? { AND: and } : {};
}

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) {
    const iso = value.toISOString();
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso.slice(0, 16).replace('T', ' ');
  }
  if (typeof value === 'number') return Number.isInteger(value) ? value : Number(value.toPrecision(8));
  if (typeof value === 'string') return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[truncated]` : value;
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    const json = JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? Number(v) : v));
    if (json.length > MAX_JSON) return `${json.slice(0, MAX_JSON)}…[truncated]`;
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serialize(v)]));
  }
  return value;
}

/** Keeps tool output inside a small model's context window. */
function fitRows(rows: unknown[]): { rows: unknown[]; dropped: number } {
  const kept: unknown[] = [];
  let size = 0;
  for (const row of rows) {
    const len = JSON.stringify(row).length;
    if (kept.length > 0 && size + len > RESULT_BUDGET) break;
    kept.push(row);
    size += len;
  }
  return { rows: kept, dropped: rows.length - kept.length };
}

export function describeTables(table?: string) {
  const entries = table ? [[table, spec(table)] as const] : Object.entries(SGC_TABLES);
  return Object.fromEntries(
    entries.map(([name, s]) => [
      name,
      {
        description: s.description,
        fields: Object.entries(s.fields)
          .map(([f, t]) => `${f} (${t})`)
          .concat(Object.keys(s.relations ?? {}).map((r) => `${r} (related)`))
          .join(', '),
        default_order: `${s.defaultOrder[0]} ${s.defaultOrder[1]}`,
      },
    ])
  );
}

export interface QueryArgs {
  table: string;
  filters?: Filter[];
  fields?: string[];
  order_by?: string;
  order?: 'asc' | 'desc';
  limit?: number;
}

export async function queryTable(args: QueryArgs) {
  const s = spec(args.table);
  const requested = args.fields?.length
    ? args.fields.map((f) => resolveField(s, f, { relations: true }))
    : [...Object.keys(s.fields), ...Object.keys(s.relations ?? {})];
  const select = Object.fromEntries(requested.map((f) => [f, s.relations?.[f] ?? true]));

  const orderField = args.order_by ? resolveField(s, args.order_by) : s.defaultOrder[0];
  const where = buildWhere(s, args.filters);
  const limit = Math.min(Math.max(Math.floor(args.limit ?? 25), 1), 200);
  const db = delegate(s.model);
  const [rows, total] = await Promise.all([
    db.findMany({ where, select, orderBy: { [orderField]: args.order ?? s.defaultOrder[1] }, take: limit }),
    db.count({ where }),
  ]);
  const fitted = fitRows(rows.map((row) => serialize(row)));
  return {
    table: args.table,
    total_matching_rows: total,
    returned: fitted.rows.length,
    rows: fitted.rows,
    ...(fitted.dropped || total > fitted.rows.length
      ? { note: `Showing ${fitted.rows.length} of ${total} matching rows. Narrow with filters, fewer fields, or summarize_sgc_table for totals.` }
      : {}),
  };
}

export interface SummarizeArgs {
  table: string;
  metric: 'count' | 'sum' | 'avg' | 'min' | 'max';
  field?: string;
  group_by?: string;
  filters?: Filter[];
}

export async function summarizeTable(input: SummarizeArgs) {
  const s = spec(input.table);
  const args = {
    ...input,
    field: input.field && input.metric !== 'count' ? resolveField(s, input.field) : undefined,
    group_by: input.group_by ? resolveField(s, input.group_by) : undefined,
  };
  const where = buildWhere(s, args.filters);
  const db = delegate(s.model);
  const metricKey = { count: '_count', sum: '_sum', avg: '_avg', min: '_min', max: '_max' }[args.metric];

  if (args.metric !== 'count') {
    if (!args.field) throw new Error(`metric '${args.metric}' needs a field.`);
    const type = s.fields[args.field];
    if (type !== 'number' && !(type === 'date' && (args.metric === 'min' || args.metric === 'max'))) {
      throw new Error(`Field '${args.field}' must be numeric for ${args.metric}.`);
    }
  }
  const metricSelect = args.metric === 'count' ? { _all: true } : { [args.field!]: true };

  if (args.group_by) {
    const gtype = s.fields[args.group_by];
    if (!gtype || gtype === 'json' || gtype === 'string[]') throw new Error(`Cannot group by '${args.group_by}'.`);
    const groups = await db.groupBy({ by: [args.group_by], where, [metricKey]: metricSelect });
    const keyOf = (g: Record<string, unknown>) =>
      args.metric === 'count' ? (g._count as Record<string, number>)._all : (g[metricKey] as Record<string, unknown>)[args.field!];
    const rows = groups
      .map((g) => ({ [args.group_by!]: serialize(g[args.group_by!]), [args.metric]: serialize(keyOf(g)) }))
      .sort((a, b) => Number(b[args.metric] ?? 0) - Number(a[args.metric] ?? 0))
      .slice(0, 100);
    return { table: args.table, metric: args.metric, field: args.field ?? null, group_by: args.group_by, groups: rows };
  }

  const agg = await db.aggregate({ where, [metricKey]: metricSelect });
  const value = args.metric === 'count' ? agg._count?._all : agg[metricKey]?.[args.field!];
  return { table: args.table, metric: args.metric, field: args.field ?? null, value: serialize(value) };
}

export async function getFundPortfolio() {
  const [holdings, snapshot] = await Promise.all([
    prisma.holding.findMany({
      where: { visible: true },
      select: { ticker: true, apiTicker: true, assetType: true, quantity: true, costBasis: true, sector: true, region: true },
      orderBy: { ticker: 'asc' },
    }),
    prisma.portfolioSnapshot.findFirst({ orderBy: { date: 'desc' } }),
  ]);
  const quoteTickers = holdings.map((h) => h.apiTicker || h.ticker);
  const quotes = await prisma.marketData.findMany({
    where: { ticker: { in: quoteTickers } },
    select: { ticker: true, price: true, changePercent: true, lastUpdated: true },
  });
  const quoteBy = new Map(quotes.map((q) => [q.ticker, q]));

  const positions = holdings.map((h) => {
    const q = quoteBy.get(h.apiTicker || h.ticker);
    const marketValue = q ? q.price * h.quantity : null;
    const cost = h.costBasis != null ? h.costBasis * h.quantity : null;
    return {
      ticker: h.ticker,
      assetType: h.assetType,
      sector: h.sector,
      region: h.region,
      shares: h.quantity,
      avg_cost: h.costBasis,
      last_price: q?.price ?? null,
      day_change_pct: q?.changePercent ?? null,
      market_value: marketValue,
      unrealized_pnl: marketValue != null && cost != null ? marketValue - cost : null,
      quote_as_of: q ? serialize(q.lastUpdated) : null,
    };
  });
  const invested = positions.reduce((s, p) => s + (p.market_value ?? 0), 0);
  return {
    positions: positions.map((p) => ({
      ...p,
      weight_of_priced_holdings: p.market_value != null && invested > 0 ? Number((p.market_value / invested).toFixed(4)) : null,
    })),
    priced_holdings_value: Number(invested.toFixed(2)),
    unpriced_tickers: positions.filter((p) => p.last_price == null).map((p) => p.ticker),
    latest_snapshot: snapshot ? serialize(snapshot) : null,
    note: 'Prices come from the site quote cache (market_quotes); weights exclude cash and unpriced holdings.',
  };
}

export async function getMacroRegime() {
  const latest = await prisma.regimeLabel.findFirst({ orderBy: { date: 'desc' } });
  const latestRun = await prisma.allocationSignal.findFirst({ orderBy: { runDate: 'desc' }, select: { runDate: true } });
  const signals = latestRun
    ? await prisma.allocationSignal.findMany({
        where: { runDate: latestRun.runDate },
        select: { ticker: true, etfTicker: true, direction: true, score: true, convictionScore: true, rank: true, prob6m: true, prob12m: true },
        orderBy: { rank: 'asc' },
      })
    : [];
  const transitions = latest
    ? await prisma.regimeTransition.findMany({
        where: { fromLabel: latest.regimeLabel, fitId: latest.fitId },
        select: { toLabel: true, prob63Day: true, prob126Day: true, prob252Day: true },
        orderBy: { prob63Day: 'desc' },
        take: 6,
      })
    : [];
  return {
    regime: latest ? { label: latest.regimeLabel, as_of: serialize(latest.date), confidence: latest.confidence } : null,
    signals_run_date: latestRun ? serialize(latestRun.runDate) : null,
    overweight: signals.filter((s) => s.direction === 'overweight').slice(0, 8).map(serialize),
    underweight: signals.filter((s) => s.direction === 'underweight').slice(0, 8).map(serialize),
    next_regime_probabilities: transitions.map(serialize),
  };
}
