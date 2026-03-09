import { NextResponse } from 'next/server';

export const revalidate = 300;

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';
const FRED_KEY = process.env.FRED_API_KEY;
const AV_BASE = 'https://www.alphavantage.co/query';
const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

export interface MarketRow {
  name: string;
  ticker: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  category: 'equity' | 'fx' | 'commodity' | 'yield' | 'volatility';
  group: 'equities' | 'asia' | 'fx' | 'rates' | 'commodities';
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Run AV calls sequentially with a stagger to avoid burst throttling */
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

// ─── Alpha Vantage: equity / ETF quote ──────────────────────────────────────
async function fetchQuote(ticker: string, multiplier = 1) {
  try {
    const res = await fetch(`${AV_BASE}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${AV_KEY}`);
    const data = await res.json();
    if (isAvLimited(data)) {
      console.warn(`AV limited for ${ticker}:`, data.Note ?? data.Information ?? data['Error Message']);
      return null;
    }
    const q = data['Global Quote'];
    if (!q?.['05. price']) return null;
    const price = parseFloat(q['05. price']);
    const change = parseFloat(q['09. change'] ?? '0');
    const changePercent = parseFloat((q['10. change percent'] ?? '0%').replace('%', ''));
    if (isNaN(price)) return null;
    return {
      price: price * multiplier,
      change: (isNaN(change) ? 0 : change) * multiplier,
      changePercent: isNaN(changePercent) ? 0 : changePercent, // % is the same regardless of multiplier
    };
  } catch (e) {
    console.error(`fetchQuote(${ticker}):`, e);
    return null;
  }
}

// ─── Alpha Vantage: FX rate ───────────────────────────────────────────────────
async function fetchFxRate(from: string, to: string) {
  try {
    const res = await fetch(
      `${AV_BASE}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${AV_KEY}`
    );
    const data = await res.json();
    if (isAvLimited(data)) return null;
    const rate = data['Realtime Currency Exchange Rate'];
    if (!rate?.['5. Exchange Rate']) return null;
    const price = parseFloat(rate['5. Exchange Rate']);
    return isNaN(price) ? null : price;
  } catch (e) {
    console.error(`fetchFxRate(${from}/${to}):`, e);
    return null;
  }
}

// ─── Alpha Vantage: FX daily (for previous close) ────────────────────────────
async function fetchFxPrevClose(from: string, to: string) {
  try {
    const res = await fetch(
      `${AV_BASE}?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&outputsize=compact&apikey=${AV_KEY}`
    );
    const data = await res.json();
    if (isAvLimited(data)) return null;
    const series = data['Time Series FX (Daily)'];
    if (!series) return null;
    const dates = Object.keys(series).sort().reverse();
    if (dates.length < 2) return null;
    const prev = parseFloat(series[dates[1]]['4. close']);
    return isNaN(prev) ? null : prev;
  } catch (e) {
    console.error(`fetchFxPrevClose(${from}/${to}):`, e);
    return null;
  }
}

function buildFxRow(price: number | null, prev: number | null) {
  if (price === null) return null;
  const change = prev !== null ? price - prev : 0;
  const changePercent = prev !== null && prev !== 0 ? (change / prev) * 100 : 0;
  return { price, change, changePercent };
}

// ─── Alpha Vantage: US Treasury yield ────────────────────────────────────────
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
    const valid = series.filter(d => d.value && d.value !== '.');
    if (valid.length < 1) return null;
    const current = parseFloat(valid[0].value);
    if (isNaN(current)) return null;
    const prev = valid.length > 1 ? parseFloat(valid[1].value) : current;
    const change = isNaN(prev) ? 0 : current - prev;
    const changePercent = !isNaN(prev) && prev !== 0 ? (change / prev) * 100 : 0;
    return { price: current, change, changePercent };
  } catch (e) {
    console.error(`fetchTreasuryYield(${maturity}):`, e);
    return null;
  }
}

// ─── FRED: government bond yields ────────────────────────────────────────────
async function fetchFredYield(seriesId: string) {
  if (!FRED_KEY) return null;
  try {
    const res = await fetch(
      `${FRED_BASE}?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&limit=2&sort_order=desc`
    );
    const data = await res.json();
    const obs: { date: string; value: string }[] = data?.observations ?? [];
    const valid = obs.filter(o => o.value && o.value !== '.');
    if (valid.length === 0) return null;
    const current = parseFloat(valid[0].value);
    if (isNaN(current)) return null;
    const prev = valid.length > 1 ? parseFloat(valid[1].value) : current;
    const change = isNaN(prev) ? 0 : current - prev;
    const changePercent = !isNaN(prev) && prev !== 0 ? (change / prev) * 100 : 0;
    return { price: current, change, changePercent };
  } catch (e) {
    console.error(`fetchFredYield(${seriesId}):`, e);
    return null;
  }
}

function spread(q: { price: number; change: number; changePercent: number } | null) {
  return { price: q?.price ?? null, change: q?.change ?? null, changePercent: q?.changePercent ?? null };
}

// ─── Main handler — sequential AV calls to avoid burst throttling ─────────────
export async function GET() {
  // All Alpha Vantage calls run sequentially with 400ms between each.
  // The route-level revalidate=300 means this only executes once per 5 min,
  // so the ~8s total fetch time is not felt by users after the first load.

  // ── Equity ETFs (5 AV calls) ────────────────────────────────────────────
  // DIA multiplier=100: DIA is designed to track exactly 1/100th of DJIA
  const [qqq, dia, fez, ewj, ewh] = await sequential([
    () => fetchQuote('QQQ'),
    () => fetchQuote('DIA', 100),  // ×100 → approximate DJIA level (~47,500)
    () => fetchQuote('FEZ'),
    () => fetchQuote('EWJ'),
    () => fetchQuote('EWH'),
  ]);

  // ── FX spot rates (4 AV calls) ───────────────────────────────────────────
  const [rUSDCAD, rEURUSD, rGBPUSD, rUSDJPY] = await sequential([
    () => fetchFxRate('USD', 'CAD'),
    () => fetchFxRate('EUR', 'USD'),
    () => fetchFxRate('GBP', 'USD'),
    () => fetchFxRate('USD', 'JPY'),
  ]);

  // ── FX previous closes for change (4 AV calls) ──────────────────────────
  const [pUSDCAD, pEURUSD, pGBPUSD, pUSDJPY] = await sequential([
    () => fetchFxPrevClose('USD', 'CAD'),
    () => fetchFxPrevClose('EUR', 'USD'),
    () => fetchFxPrevClose('GBP', 'USD'),
    () => fetchFxPrevClose('USD', 'JPY'),
  ]);

  // ── Treasury yields + commodities (5 AV calls) ──────────────────────────
  const [us2y, us10y, gld, slv, vixy] = await sequential([
    () => fetchTreasuryYield('2year'),
    () => fetchTreasuryYield('10year'),
    () => fetchQuote('GLD'),
    () => fetchQuote('SLV'),
    () => fetchQuote('VIXY'),
  ]);

  // ── FRED bond yields run in parallel — different API, no AV limits ───────
  const [de10y, jp10y] = await Promise.all([
    fetchFredYield('IRLTLT01DEM156N'),
    fetchFredYield('IRLTLT01JPM156N'),
  ]);

  const rows: MarketRow[] = [
    // Equities
    { name: 'NASDAQ 100 (QQQ)',   ticker: 'QQQ',    ...spread(qqq),                          category: 'equity',     group: 'equities' },
    { name: 'Dow Jones',          ticker: 'DJI',    ...spread(dia),                          category: 'equity',     group: 'equities' },
    { name: 'Euro Stoxx 50 (FEZ)',ticker: 'FEZ',    ...spread(fez),                          category: 'equity',     group: 'equities' },
    // Asia
    { name: 'Nikkei (EWJ)',       ticker: 'EWJ',    ...spread(ewj),                          category: 'equity',     group: 'asia' },
    { name: 'Hang Seng (EWH)',    ticker: 'EWH',    ...spread(ewh),                          category: 'equity',     group: 'asia' },
    // FX
    { name: 'USD / CAD',          ticker: 'USDCAD', ...spread(buildFxRow(rUSDCAD, pUSDCAD)), category: 'fx',         group: 'fx' },
    { name: 'EUR / USD',          ticker: 'EURUSD', ...spread(buildFxRow(rEURUSD, pEURUSD)), category: 'fx',         group: 'fx' },
    { name: 'GBP / USD',          ticker: 'GBPUSD', ...spread(buildFxRow(rGBPUSD, pGBPUSD)), category: 'fx',        group: 'fx' },
    { name: 'USD / JPY',          ticker: 'USDJPY', ...spread(buildFxRow(rUSDJPY, pUSDJPY)), category: 'fx',        group: 'fx' },
    // Rates
    { name: 'US 2Y Yield',        ticker: 'DGS2',   ...spread(us2y),                         category: 'yield',      group: 'rates' },
    { name: 'US 10Y Yield',       ticker: 'DGS10',  ...spread(us10y),                        category: 'yield',      group: 'rates' },
    { name: 'DE 10Y Bund',        ticker: 'DE10Y',  ...spread(de10y),                        category: 'yield',      group: 'rates' },
    { name: 'JP 10Y JGB',         ticker: 'JP10Y',  ...spread(jp10y),                        category: 'yield',      group: 'rates' },
    // Commodities & Volatility
    { name: 'Gold (GLD)',         ticker: 'GLD',    ...spread(gld),                          category: 'commodity',  group: 'commodities' },
    { name: 'Silver (SLV)',       ticker: 'SLV',    ...spread(slv),                          category: 'commodity',  group: 'commodities' },
    { name: 'VIX (VIXY)',         ticker: 'VIXY',   ...spread(vixy),                         category: 'volatility', group: 'commodities' },
  ];

  return NextResponse.json(rows);
}
