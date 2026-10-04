import { prisma } from '@/lib/prisma';
import { ALPHA_VANTAGE_STAGGER_MS, delay, fetchAlphaVantageOverview, fetchAlphaVantageSymbolSearch } from '@/lib/alpha-vantage';
import { fetchFullOhlcv } from '@/lib/macro-engine/providers/alpha-vantage';

export interface ReturnsFrame {
  tickers: string[];
  dates: string[];
  /** rows = dates, columns = tickers, simple daily returns */
  values: number[][];
}

type Series = Array<[string, number]>;

const LIVE_TTL_MS = 12 * 3600 * 1000;
const liveCache = new Map<string, { at: number; series: Series }>();
const sectorCache = new Map<string, string>();

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;

export function normalizeTickers(tickers: Iterable<string>): string[] {
  const out = Array.from(new Set(Array.from(tickers, (t) => (t ?? '').trim().toUpperCase()).filter(Boolean))).sort();
  if (!out.length) throw new Error('At least one ticker is required.');
  if (out.length > 40) throw new Error(`Too many tickers (${out.length}); use 40 or fewer.`);
  const bad = out.filter((t) => !/^[A-Z0-9.\-^=]{1,15}$/.test(t));
  if (bad.length) throw new Error(`Invalid ticker symbols: ${bad.join(', ')}.`);
  return out;
}

async function fromDatabase(ticker: string, start: string): Promise<Series> {
  const rows = await prisma.ohlcvDaily.findMany({
    where: { ticker, date: { gte: new Date(`${start}T00:00:00Z`) } },
    select: { date: true, adjClose: true },
    orderBy: { date: 'asc' },
  });
  return rows.filter((r) => Number.isFinite(r.adjClose) && r.adjClose > 0).map((r) => [ymd(r.date), r.adjClose]);
}

async function fromAlphaVantage(ticker: string): Promise<Series> {
  const cached = liveCache.get(ticker);
  if (cached && Date.now() - cached.at < LIVE_TTL_MS) return cached.series;
  let rows;
  for (let attempt = 0; ; attempt += 1) {
    try {
      rows = await fetchFullOhlcv(ticker);
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/invalid api call/i.test(msg)) throw new Error(`No price data for ${ticker}. Check the ticker symbol.`);
      if (attempt === 0 && /rate limit|frequency|per minute/i.test(msg)) {
        await delay(2000);
        continue;
      }
      throw new Error(`Price download failed for ${ticker}: ${msg}`);
    }
  }
  const series: Series = rows
    .filter((r) => Number.isFinite(r.adjClose) && r.adjClose > 0)
    .map((r) => [ymd(r.date), r.adjClose] as [string, number])
    .sort((a, b) => a[0].localeCompare(b[0]));
  liveCache.set(ticker, { at: Date.now(), series });
  return series;
}

/**
 * Split/dividend-adjusted closes. Uses the macro engine's ohlcv_daily table when it covers the
 * window and is current; otherwise downloads TIME_SERIES_DAILY_ADJUSTED from Alpha Vantage.
 */
export async function loadPrices(tickers: string[], start: string): Promise<{ dates: string[]; prices: number[][]; sources: Record<string, string> }> {
  const today = ymd(new Date());
  const seriesByTicker = new Map<string, Series>();
  const sources: Record<string, string> = {};
  let liveCalls = 0;

  for (const ticker of tickers) {
    const db = await fromDatabase(ticker, start);
    const dbCurrent = db.length > 0 && daysBetween(db[db.length - 1][0], today) <= 6 && daysBetween(start, db[0][0]) <= 10;
    if (dbCurrent) {
      seriesByTicker.set(ticker, db);
      sources[ticker] = 'sgc_database';
      continue;
    }
    if (liveCalls > 0 && !liveCache.has(ticker)) await delay(800);
    liveCalls += 1;
    try {
      seriesByTicker.set(ticker, (await fromAlphaVantage(ticker)).filter(([d]) => d >= start));
      sources[ticker] = 'alpha_vantage';
    } catch (err) {
      if (!db.length) throw err;
      seriesByTicker.set(ticker, db);
      sources[ticker] = `sgc_database (stale, last ${db[db.length - 1][0]}; live download failed: ${err instanceof Error ? err.message : err})`;
    }
  }

  const missing = tickers.filter((t) => !seriesByTicker.get(t)?.length);
  if (missing.length) throw new Error(`No price data for: ${missing.join(', ')}. Check the ticker symbols.`);

  const maps = tickers.map((t) => new Map(seriesByTicker.get(t)!));
  const dates = seriesByTicker
    .get(tickers[0])!
    .map(([d]) => d)
    .filter((d) => maps.every((m) => m.has(d)));
  return { dates, prices: dates.map((d) => maps.map((m) => m.get(d)!)), sources };
}

export async function loadReturns(tickers: string[], start: string): Promise<ReturnsFrame & { sources: Record<string, string> }> {
  const { dates, prices, sources } = await loadPrices(tickers, start);
  const values: number[][] = [];
  for (let i = 1; i < prices.length; i += 1) values.push(prices[i].map((p, j) => p / prices[i - 1][j] - 1));
  return { tickers, dates: dates.slice(1), values, sources };
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Sector per ticker: the fund's own Holding.sector first, then Alpha Vantage OVERVIEW; 'Unknown' otherwise. */
export async function loadSectors(tickers: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const holdings = await prisma.holding.findMany({
    where: { OR: [{ ticker: { in: tickers } }, { apiTicker: { in: tickers } }] },
    select: { ticker: true, apiTicker: true, sector: true },
  });
  for (const h of holdings) {
    if (!h.sector) continue;
    for (const key of [h.ticker, h.apiTicker]) if (key && tickers.includes(key)) out[key] = h.sector;
  }

  let calls = 0;
  for (const t of tickers) {
    if (out[t]) continue;
    if (sectorCache.has(t)) {
      out[t] = sectorCache.get(t)!;
      continue;
    }
    if (calls > 0) await delay(ALPHA_VANTAGE_STAGGER_MS);
    calls += 1;
    let sector = 'Unknown';
    try {
      const info = await fetchAlphaVantageOverview(t);
      if (info.Sector && info.Sector !== 'None') sector = titleCase(info.Sector);
      else if ((info.AssetType ?? '').toUpperCase().includes('ETF')) sector = 'ETF';
      else if (!info.Symbol) {
        const matches = await fetchAlphaVantageSymbolSearch(t);
        if (matches.some((m) => m.symbol === t && m.type.toUpperCase() === 'ETF')) sector = 'ETF';
      }
      sectorCache.set(t, sector);
    } catch {
      // Not cached, so a rate-limited lookup is retried next time.
    }
    out[t] = sector;
  }
  return Object.fromEntries(tickers.map((t) => [t, out[t] ?? 'Unknown']));
}
