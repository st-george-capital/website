import {
  fetchAlphaVantageEarningsHistory,
  fetchAlphaVantageOverview,
  fetchAlphaVantageQuote,
  fetchAlphaVantageSymbolSearch,
} from '@/lib/alpha-vantage';
import { fetchFredSeriesHistory } from '@/lib/g10-rates/fred';
import { loadPrices, normalizeTickers } from '@/lib/consigliere/portfolio/data';
import { TRADING_DAYS, maxDrawdown } from '@/lib/consigliere/portfolio/risk';

const FRED_API = 'https://api.stlouisfed.org/fred';

const num = (v: string | undefined) => {
  if (v === undefined || v === 'None' || v === '-' || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
};
const round = (x: number, nd = 4) => Number(x.toFixed(nd));

function oneTicker(ticker: string): string {
  return normalizeTickers([ticker])[0];
}

export async function getStockQuote({ ticker }: { ticker: string }) {
  const t = oneTicker(ticker);
  const q = await fetchAlphaVantageQuote(t);
  return { ticker: t, ...q, source: 'Alpha Vantage GLOBAL_QUOTE' };
}

const OVERVIEW_FIELDS = [
  'Name', 'AssetType', 'Exchange', 'Currency', 'Sector', 'Industry', 'MarketCapitalization', 'PERatio', 'ForwardPE',
  'PEGRatio', 'PriceToBookRatio', 'EVToEBITDA', 'EPS', 'DividendYield', 'ProfitMargin', 'OperatingMarginTTM',
  'ReturnOnEquityTTM', 'RevenueTTM', 'QuarterlyRevenueGrowthYOY', 'QuarterlyEarningsGrowthYOY', 'AnalystTargetPrice',
  'Beta', '52WeekHigh', '52WeekLow', '50DayMovingAverage', '200DayMovingAverage', 'LatestQuarter',
];

export async function getCompanyOverview({ ticker }: { ticker: string }) {
  const t = oneTicker(ticker);
  const info = await fetchAlphaVantageOverview(t);
  if (!info || !info.Symbol) {
    return { ticker: t, error: `No company fundamentals for ${t} (ETFs and some non-US listings have none).` };
  }
  const out: Record<string, unknown> = { ticker: t };
  for (const f of OVERVIEW_FIELDS) out[f] = num(info[f]);
  out.Description = (info.Description ?? '').slice(0, 600);
  return out;
}

export async function getEarningsHistory({ ticker, quarters = 8 }: { ticker: string; quarters?: number }) {
  const t = oneTicker(ticker);
  const data = await fetchAlphaVantageEarningsHistory(t);
  return {
    ticker: t,
    quarterly: data.quarterlyEarnings.slice(0, Math.min(Math.max(quarters, 1), 20)),
    annual: data.annualEarnings.slice(0, 5),
  };
}

export async function searchTicker({ query }: { query: string }) {
  const matches = await fetchAlphaVantageSymbolSearch(query);
  return { query, matches: matches.slice(0, 8).map(({ symbol, name, type, region, currency, matchScore }) => ({ symbol, name, type, region, currency, matchScore })) };
}

const PERIOD_DAYS: Record<string, number> = { '1m': 31, '3m': 92, '6m': 183, '1y': 366, '3y': 1096, '5y': 1827, '10y': 3653 };

export async function getPriceHistory({ ticker, period = '1y' }: { ticker: string; period?: string }) {
  const t = oneTicker(ticker);
  const days = PERIOD_DAYS[period];
  if (!days) throw new Error(`period must be one of ${Object.keys(PERIOD_DAYS).join(', ')}.`);
  const start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { dates, prices, sources } = await loadPrices([t], start);
  const closes = prices.map((p) => p[0]);
  if (closes.length < 2) throw new Error(`Not enough price history for ${t}.`);
  const rets = closes.slice(1).map((c, i) => c / closes[i] - 1);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1));
  const step = Math.max(1, Math.floor(closes.length / 12));
  const sampled = dates.flatMap((d, i) => (i % step === 0 || i === dates.length - 1 ? [{ date: d, adj_close: round(closes[i], 2) }] : []));
  const hi = Math.max(...closes);
  const lo = Math.min(...closes);
  return {
    ticker: t,
    period,
    source: sources[t],
    first: { date: dates[0], adj_close: round(closes[0], 2) },
    last: { date: dates[dates.length - 1], adj_close: round(closes[closes.length - 1], 2) },
    total_return: round(closes[closes.length - 1] / closes[0] - 1),
    annualized_volatility: round(sd * Math.sqrt(TRADING_DAYS)),
    max_drawdown: round(maxDrawdown(rets)),
    high: { date: dates[closes.indexOf(hi)], adj_close: round(hi, 2) },
    low: { date: dates[closes.indexOf(lo)], adj_close: round(lo, 2) },
    sampled_closes: sampled,
    note: 'Prices are split/dividend adjusted, so returns include dividends.',
  };
}

async function fredJson(path: string, params: Record<string, string>) {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error('FRED_API_KEY is not configured on the server.');
  const url = new URL(`${FRED_API}/${path}`);
  Object.entries({ ...params, api_key: apiKey, file_type: 'json' }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error_message) throw new Error(`FRED ${path} failed: ${data?.error_message ?? res.status}`);
  return data;
}

export async function getFredSeries({ series_id, observations = 24 }: { series_id: string; observations?: number }) {
  const id = series_id.trim().toUpperCase();
  const [meta, obs] = await Promise.all([
    fredJson('series', { series_id: id }),
    fetchFredSeriesHistory(id, Math.min(Math.max(observations, 2), 120)),
  ]);
  const s = meta?.seriess?.[0] ?? {};
  const latest = obs[obs.length - 1];
  const prev = obs[obs.length - 2];
  const yearAgo = latest ? await fredObservationOnOrBefore(id, `${Number(latest.date.slice(0, 4)) - 1}${latest.date.slice(4)}`) : null;
  // A yield or rate quoted in percent changes by points; % change of a percent confuses small models.
  const percentUnits = /percent/i.test(s.units ?? '') && !/change/i.test(s.units ?? '');
  const change = (from: { value: number }) =>
    percentUnits
      ? { points: round(latest.value - from.value, 3) }
      : { absolute: round(latest.value - from.value), percent: from.value ? round((latest.value / from.value - 1) * 100, 2) : null };
  return {
    series_id: id,
    title: s.title,
    units: s.units,
    frequency: s.frequency,
    seasonal_adjustment: s.seasonal_adjustment_short,
    last_updated: s.last_updated,
    latest,
    ...(prev ? { previous: prev, change_from_previous: change(prev) } : {}),
    ...(yearAgo ? { year_ago: yearAgo, change_vs_year_ago: change(yearAgo) } : {}),
    observations: obs,
  };
}

async function fredObservationOnOrBefore(seriesId: string, date: string): Promise<{ date: string; value: number } | null> {
  const data = await fredJson('series/observations', { series_id: seriesId, observation_end: date, sort_order: 'desc', limit: '10' });
  const hit = (data.observations ?? []).find((o: { value: string }) => o.value !== '.');
  return hit ? { date: hit.date, value: Number(hit.value) } : null;
}

export async function searchFredSeries({ query, limit = 8 }: { query: string; limit?: number }) {
  const data = await fredJson('series/search', {
    search_text: query,
    limit: String(Math.min(Math.max(limit, 1), 20)),
    order_by: 'popularity',
    sort_order: 'desc',
  });
  return {
    query,
    results: (data.seriess ?? []).map((s: Record<string, string>) => ({
      series_id: s.id,
      title: s.title,
      units: s.units_short,
      frequency: s.frequency_short,
      seasonal_adjustment: s.seasonal_adjustment_short,
      observation_end: s.observation_end,
    })),
  };
}
