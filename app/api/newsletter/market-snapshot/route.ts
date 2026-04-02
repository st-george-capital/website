import { NextResponse } from 'next/server';

export const revalidate = 300;

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';
const FRED_KEY = process.env.FRED_API_KEY;
const AV_BASE = 'https://www.alphavantage.co/query';
const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

export interface MarketRow {
  name: string;
  ticker: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  zScore: number | null;
  category: 'equity' | 'fx' | 'commodity' | 'yield' | 'volatility';
  group: 'equities' | 'asia' | 'fx' | 'rates' | 'commodities';
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sequential<T>(
  fns: Array<() => Promise<T | null>>,
  staggerMs = 400
): Promise<Array<T | null>> {
  const results: Array<T | null> = [];
  for (const fn of fns) {
    results.push(await fn());
    await delay(staggerMs);
  }
  return results;
}

function isAvLimited(data: any): boolean {
  return !!(data?.Note || data?.Information || data?.['Error Message']);
}

function calcZScore(dailyChanges: number[], window = 20): number | null {
  if (dailyChanges.length < 5) return null;
  const todayChange = dailyChanges[dailyChanges.length - 1];
  const lookback = dailyChanges.slice(-Math.min(window + 1, dailyChanges.length), -1);
  if (lookback.length < 4) return null;
  const mean = lookback.reduce((a, b) => a + b, 0) / lookback.length;
  const variance = lookback.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lookback.length;
  const std = Math.sqrt(variance);
  if (std === 0) return null;
  return (todayChange - mean) / std;
}

/**
 * Yahoo Finance v8 chart — daily % change vs prior **session** close.
 *
 * Do NOT use `meta.chartPreviousClose` as a fallback for `previousClose`.
 * `chartPreviousClose` is the anchor for the chart *range* (often ~1 month back),
 * so (regularMarketPrice - chartPreviousClose) looks like a huge "daily" move and
 * breaks z-scores vs real daily volatility.
 */
async function fetchYahoo(symbol: string) {
  try {
    const url = `${YF_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=3mo&includePrePost=false`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SGC-Newsletter/1.0)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      console.warn(`Yahoo Finance HTTP ${res.status} for ${symbol}`);
      return null;
    }
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta ?? {};
    const quote = result.indicators?.quote?.[0];
    const closes: (number | null)[] = quote?.close ?? [];
    if (!closes.length) return null;

    const validIdx: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      const c = closes[i];
      if (c != null && !isNaN(c)) validIdx.push(i);
    }
    if (validIdx.length < 2) return null;

    const lastI = validIdx[validIdx.length - 1];
    const prevI = validIdx[validIdx.length - 2];
    const lastCloseBar = closes[lastI]!;
    const prevBarClose = closes[prevI]!;

    const live =
      typeof meta.regularMarketPrice === 'number' && !isNaN(meta.regularMarketPrice)
        ? meta.regularMarketPrice
        : lastCloseBar;

    let prevClose: number;
    if (typeof meta.previousClose === 'number' && !isNaN(meta.previousClose)) {
      prevClose = meta.previousClose;
    } else {
      prevClose = prevBarClose;
    }

    const price = live;
    const change = price - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    // Daily % history: consecutive closes, then today's move = same as display
    const dailyPcts: number[] = [];
    for (let j = 1; j < validIdx.length - 1; j++) {
      const p = closes[validIdx[j - 1]]!;
      const c = closes[validIdx[j]]!;
      if (p !== 0) dailyPcts.push(((c - p) / p) * 100);
    }
    dailyPcts.push(changePercent);

    const zScore = calcZScore(dailyPcts);

    return { price, change, changePercent, zScore };
  } catch (e) {
    console.error(`fetchYahoo(${symbol}):`, e);
    return null;
  }
}

async function fetchTreasuryYield(maturity: '2year' | '10year') {
  try {
    const res = await fetch(
      `${AV_BASE}?function=TREASURY_YIELD&interval=daily&maturity=${maturity}&apikey=${AV_KEY}`
    );
    const data = await res.json();
    if (isAvLimited(data)) {
      console.warn(`AV limited for TREASURY_YIELD ${maturity}`);
      return null;
    }
    const series: { date: string; value: string }[] = data?.data ?? [];
    const valid = series.filter(d => d.value && d.value !== '.').slice(0, 22);
    if (valid.length < 1) return null;

    const current = parseFloat(valid[0].value);
    if (isNaN(current)) return null;
    const prev = valid.length > 1 ? parseFloat(valid[1].value) : current;
    const change = isNaN(prev) ? 0 : current - prev;
    const changePercent = !isNaN(prev) && prev !== 0 ? (change / prev) * 100 : 0;

    const dailyBpsChanges: number[] = [];
    for (let i = valid.length - 1; i >= 1; i--) {
      const c = parseFloat(valid[i - 1].value);
      const p = parseFloat(valid[i].value);
      if (!isNaN(c) && !isNaN(p)) dailyBpsChanges.push((c - p) * 100);
    }
    const zScore = calcZScore(dailyBpsChanges);

    return { price: current, change, changePercent, zScore };
  } catch (e) {
    console.error(`fetchTreasuryYield(${maturity}):`, e);
    return null;
  }
}

async function fetchFredYield(seriesId: string) {
  if (!FRED_KEY) {
    console.warn(`FRED_API_KEY not set — skipping ${seriesId}`);
    return null;
  }
  try {
    const res = await fetch(
      `${FRED_BASE}?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&limit=25&sort_order=desc`
    );
    const data = await res.json();
    if (data?.error_code || data?.error_message) {
      console.warn(`FRED error for ${seriesId}:`, data.error_message);
      return null;
    }
    const obs: { date: string; value: string }[] = data?.observations ?? [];
    const valid = obs.filter(o => o.value && o.value !== '.').slice(0, 22);
    if (valid.length === 0) return null;

    const current = parseFloat(valid[0].value);
    if (isNaN(current)) return null;
    const prev = valid.length > 1 ? parseFloat(valid[1].value) : current;
    const change = isNaN(prev) ? 0 : current - prev;
    const changePercent = !isNaN(prev) && prev !== 0 ? (change / prev) * 100 : 0;

    const dailyBpsChanges: number[] = [];
    for (let i = valid.length - 1; i >= 1; i--) {
      const c = parseFloat(valid[i - 1].value);
      const p = parseFloat(valid[i].value);
      if (!isNaN(c) && !isNaN(p)) dailyBpsChanges.push((c - p) * 100);
    }
    const zScore = calcZScore(dailyBpsChanges);

    return { price: current, change, changePercent, zScore };
  } catch (e) {
    console.error(`fetchFredYield(${seriesId}):`, e);
    return null;
  }
}

type QuoteData = { price: number; change: number; changePercent: number; zScore?: number | null } | null;
function spread(q: QuoteData) {
  return {
    price: q?.price ?? null,
    change: q?.change ?? null,
    changePercent: q?.changePercent ?? null,
    zScore: q?.zScore ?? null,
  };
}

export async function GET() {
  const yfResults = await Promise.allSettled([
    fetchYahoo('^NDX'),
    fetchYahoo('^DJI'),
    fetchYahoo('^STOXX50E'),
    fetchYahoo('^N225'),
    fetchYahoo('^HSI'),
    fetchYahoo('EURUSD=X'),
    fetchYahoo('GBPUSD=X'),
    fetchYahoo('USDJPY=X'),
    fetchYahoo('USDCAD=X'),
    fetchYahoo('GC=F'),
    fetchYahoo('SI=F'),
    fetchYahoo('CL=F'),
    fetchYahoo('^VIX'),
  ]);

  const [ndx, dji, stoxx, nikkei, hsi, eurusd, gbpusd, usdjpy, usdcad, gold, silver, oil, vix] =
    yfResults.map(r => (r.status === 'fulfilled' ? r.value : null));

  const [us2y, us10y] = await sequential(
    [() => fetchTreasuryYield('2year'), () => fetchTreasuryYield('10year')],
    550
  );

  const [de10y, jp10y] = await Promise.all([
    fetchFredYield('IRLTLT01DEM156N'),
    fetchFredYield('IRLTLT01JPM156N'),
  ]);

  const rows: MarketRow[] = [
    { name: 'NASDAQ 100', ticker: '^NDX', ...spread(ndx), category: 'equity', group: 'equities' },
    { name: 'Dow Jones', ticker: '^DJI', ...spread(dji), category: 'equity', group: 'equities' },
    { name: 'Euro Stoxx 50', ticker: '^STOXX50E', ...spread(stoxx), category: 'equity', group: 'equities' },
    { name: 'Nikkei 225', ticker: '^N225', ...spread(nikkei), category: 'equity', group: 'asia' },
    { name: 'Hang Seng', ticker: '^HSI', ...spread(hsi), category: 'equity', group: 'asia' },
    { name: 'EUR / USD', ticker: 'EURUSD', ...spread(eurusd), category: 'fx', group: 'fx' },
    { name: 'GBP / USD', ticker: 'GBPUSD', ...spread(gbpusd), category: 'fx', group: 'fx' },
    { name: 'USD / JPY', ticker: 'USDJPY', ...spread(usdjpy), category: 'fx', group: 'fx' },
    { name: 'USD / CAD', ticker: 'USDCAD', ...spread(usdcad), category: 'fx', group: 'fx' },
    { name: 'US 2Y Yield', ticker: 'DGS2', ...spread(us2y), category: 'yield', group: 'rates' },
    { name: 'US 10Y Yield', ticker: 'DGS10', ...spread(us10y), category: 'yield', group: 'rates' },
    { name: 'DE 10Y Bund', ticker: 'DE10Y', ...spread(de10y), category: 'yield', group: 'rates' },
    { name: 'JP 10Y JGB', ticker: 'JP10Y', ...spread(jp10y), category: 'yield', group: 'rates' },
    { name: 'Gold', ticker: 'GC=F', ...spread(gold), category: 'commodity', group: 'commodities' },
    { name: 'Silver', ticker: 'SI=F', ...spread(silver), category: 'commodity', group: 'commodities' },
    { name: 'WTI Crude Oil', ticker: 'CL=F', ...spread(oil), category: 'commodity', group: 'commodities' },
    { name: 'VIX', ticker: '^VIX', ...spread(vix), category: 'volatility', group: 'commodities' },
  ];

  return NextResponse.json(rows);
}
