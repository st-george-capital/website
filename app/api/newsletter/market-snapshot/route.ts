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
  zScore: number | null;
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

/**
 * Z-score of today's move vs the preceding `window` trading days.
 * dailyChanges: array of daily moves oldest→newest; last element = today's move.
 */
function calcZScore(dailyChanges: number[], window = 20): number | null {
  if (dailyChanges.length < 5) return null;
  const todayChange = dailyChanges[dailyChanges.length - 1];
  // reference distribution: up to the last `window` days BEFORE today
  const lookback = dailyChanges.slice(-Math.min(window + 1, dailyChanges.length), -1);
  if (lookback.length < 4) return null;
  const mean = lookback.reduce((a, b) => a + b, 0) / lookback.length;
  const variance = lookback.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / lookback.length;
  const std = Math.sqrt(variance);
  if (std === 0) return null;
  return (todayChange - mean) / std;
}

// ─── Alpha Vantage: daily close series (equities / ETFs) ─────────────────────
// TIME_SERIES_DAILY replaces GLOBAL_QUOTE — same call count, returns full history.
async function fetchDailySeries(ticker: string, multiplier = 1) {
  try {
    const res = await fetch(
      `${AV_BASE}?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=compact&apikey=${AV_KEY}`
    );
    const data = await res.json();
    if (isAvLimited(data)) {
      console.warn(`AV limited for ${ticker}:`, data.Note ?? data.Information ?? data['Error Message']);
      return null;
    }
    const series = data['Time Series (Daily)'];
    if (!series) return null;
    const dates = Object.keys(series).sort().reverse(); // most recent first
    if (dates.length < 2) return null;

    const latestClose = parseFloat(series[dates[0]]['4. close']);
    const prevClose   = parseFloat(series[dates[1]]['4. close']);
    if (isNaN(latestClose) || isNaN(prevClose)) return null;

    const change = latestClose - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    // Build daily % changes oldest→newest (up to 22 points → 20-day lookback + today)
    const windowDates = dates.slice(0, Math.min(22, dates.length));
    const dailyPctChanges: number[] = [];
    for (let i = windowDates.length - 1; i >= 1; i--) {
      const c = parseFloat(series[windowDates[i - 1]]['4. close']);
      const p = parseFloat(series[windowDates[i]]['4. close']);
      if (!isNaN(c) && !isNaN(p) && p !== 0) {
        dailyPctChanges.push(((c - p) / p) * 100);
      }
    }
    // Last element is today's % change
    const zScore = calcZScore(dailyPctChanges);

    return {
      price: latestClose * multiplier,
      change: change * multiplier,
      changePercent, // % is invariant to the multiplier
      zScore,
    };
  } catch (e) {
    console.error(`fetchDailySeries(${ticker}):`, e);
    return null;
  }
}

// ─── Alpha Vantage: FX spot rate (real-time) ──────────────────────────────────
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

// ─── Alpha Vantage: FX daily history (prev close + z-score reference) ─────────
async function fetchFxHistory(from: string, to: string) {
  try {
    const res = await fetch(
      `${AV_BASE}?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&outputsize=compact&apikey=${AV_KEY}`
    );
    const data = await res.json();
    if (isAvLimited(data)) return null;
    const series = data['Time Series FX (Daily)'];
    if (!series) return null;
    const dates = Object.keys(series).sort().reverse(); // most recent first
    if (dates.length < 2) return null;

    // dates[0] = yesterday's EOD close (used to compute today's intraday change)
    const prevClose = parseFloat(series[dates[0]]['4. close']);

    // Historical close-to-close % changes, oldest→newest (up to 21 entries)
    const windowDates = dates.slice(0, Math.min(22, dates.length));
    const historicalPctChanges: number[] = [];
    for (let i = windowDates.length - 1; i >= 1; i--) {
      const c = parseFloat(series[windowDates[i - 1]]['4. close']);
      const p = parseFloat(series[windowDates[i]]['4. close']);
      if (!isNaN(c) && !isNaN(p) && p !== 0) {
        historicalPctChanges.push(((c - p) / p) * 100);
      }
    }
    // Last element = yesterday's close-to-close % change

    return {
      prevClose: isNaN(prevClose) ? null : prevClose,
      historicalPctChanges,
    };
  } catch (e) {
    console.error(`fetchFxHistory(${from}/${to}):`, e);
    return null;
  }
}

/**
 * Combine real-time price with FX history to produce change + z-score.
 * Today's intraday % change is appended to the historical array so z-score
 * reflects the actual move relative to 20-day historical daily ranges.
 */
function buildFxRow(
  price: number | null,
  history: { prevClose: number | null; historicalPctChanges: number[] } | null
) {
  if (price === null) return null;
  const prev = history?.prevClose ?? null;
  const change = prev !== null ? price - prev : 0;
  const changePercent = prev !== null && prev !== 0 ? (change / prev) * 100 : 0;
  const zScore = history && prev !== null
    ? calcZScore([...history.historicalPctChanges, changePercent])
    : null;
  return { price, change, changePercent, zScore };
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
    // Take up to 22 valid entries (most-recent first) for a 20-day z-score window
    const valid = series.filter(d => d.value && d.value !== '.').slice(0, 22);
    if (valid.length < 1) return null;

    const current = parseFloat(valid[0].value);
    if (isNaN(current)) return null;
    const prev = valid.length > 1 ? parseFloat(valid[1].value) : current;
    const change = isNaN(prev) ? 0 : current - prev;
    const changePercent = !isNaN(prev) && prev !== 0 ? (change / prev) * 100 : 0;

    // Z-score in bps-change space (oldest→newest, last = today)
    const dailyBpsChanges: number[] = [];
    for (let i = valid.length - 1; i >= 1; i--) {
      const c = parseFloat(valid[i - 1].value);
      const p = parseFloat(valid[i].value);
      if (!isNaN(c) && !isNaN(p)) {
        dailyBpsChanges.push((c - p) * 100);
      }
    }
    const zScore = calcZScore(dailyBpsChanges);

    return { price: current, change, changePercent, zScore };
  } catch (e) {
    console.error(`fetchTreasuryYield(${maturity}):`, e);
    return null;
  }
}

// ─── FRED: government bond yields ────────────────────────────────────────────
async function fetchFredYield(seriesId: string) {
  if (!FRED_KEY) {
    console.warn(`FRED_API_KEY not set — skipping ${seriesId}. Add FRED_API_KEY to Vercel env vars (free at fred.stlouisfed.org/docs/api/api_key.html).`);
    return null;
  }
  try {
    // limit=25 gives enough history for a 20-day z-score window
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

    // Z-score in bps-change space (oldest→newest, last = most recent move)
    const dailyBpsChanges: number[] = [];
    for (let i = valid.length - 1; i >= 1; i--) {
      const c = parseFloat(valid[i - 1].value);
      const p = parseFloat(valid[i].value);
      if (!isNaN(c) && !isNaN(p)) {
        dailyBpsChanges.push((c - p) * 100);
      }
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

// ─── Main handler — sequential AV calls to avoid burst throttling ─────────────
export async function GET() {
  // All Alpha Vantage calls run sequentially with 550ms between each.
  // The route-level revalidate=300 means this only executes once per 5 min.

  // ── Equity ETFs: TIME_SERIES_DAILY (5 AV calls, replaces GLOBAL_QUOTE) ──
  // DIA multiplier=100: DIA tracks exactly 1/100th of DJIA (~47,500)
  const [qqq, dia, fez, ewj, ewh] = await sequential([
    () => fetchDailySeries('QQQ'),
    () => fetchDailySeries('DIA', 100),
    () => fetchDailySeries('FEZ'),
    () => fetchDailySeries('EWJ'),
    () => fetchDailySeries('EWH'),
  ], 550);

  // ── FX spot rates (4 AV calls) ───────────────────────────────────────────
  const [rUSDCAD, rEURUSD, rGBPUSD, rUSDJPY] = await sequential([
    () => fetchFxRate('USD', 'CAD'),
    () => fetchFxRate('EUR', 'USD'),
    () => fetchFxRate('GBP', 'USD'),
    () => fetchFxRate('USD', 'JPY'),
  ], 550);

  // ── FX history for prev close + z-score (4 AV calls) ────────────────────
  const [hUSDCAD, hEURUSD, hGBPUSD, hUSDJPY] = await sequential([
    () => fetchFxHistory('USD', 'CAD'),
    () => fetchFxHistory('EUR', 'USD'),
    () => fetchFxHistory('GBP', 'USD'),
    () => fetchFxHistory('USD', 'JPY'),
  ], 550);

  // ── Treasury yields + commodities (5 AV calls) ──────────────────────────
  const [us2y, us10y, gld, slv, vixy] = await sequential([
    () => fetchTreasuryYield('2year'),
    () => fetchTreasuryYield('10year'),
    () => fetchDailySeries('GLD'),
    () => fetchDailySeries('SLV'),
    () => fetchDailySeries('VIXY'),
  ], 550);

  // ── FRED bond yields run in parallel — different API, no AV limits ───────
  const [de10y, jp10y] = await Promise.all([
    fetchFredYield('IRLTLT01DEM156N'),
    fetchFredYield('IRLTLT01JPM156N'),
  ]);

  const rows: MarketRow[] = [
    // Equities
    { name: 'NASDAQ 100 (QQQ)',    ticker: 'QQQ',    ...spread(qqq),                              category: 'equity',     group: 'equities' },
    { name: 'Dow Jones',           ticker: 'DJI',    ...spread(dia),                              category: 'equity',     group: 'equities' },
    { name: 'Euro Stoxx 50 (FEZ)', ticker: 'FEZ',    ...spread(fez),                              category: 'equity',     group: 'equities' },
    // Asia
    { name: 'Nikkei (EWJ)',        ticker: 'EWJ',    ...spread(ewj),                              category: 'equity',     group: 'asia' },
    { name: 'Hang Seng (EWH)',     ticker: 'EWH',    ...spread(ewh),                              category: 'equity',     group: 'asia' },
    // FX
    { name: 'USD / CAD',           ticker: 'USDCAD', ...spread(buildFxRow(rUSDCAD, hUSDCAD)),     category: 'fx',         group: 'fx' },
    { name: 'EUR / USD',           ticker: 'EURUSD', ...spread(buildFxRow(rEURUSD, hEURUSD)),     category: 'fx',         group: 'fx' },
    { name: 'GBP / USD',           ticker: 'GBPUSD', ...spread(buildFxRow(rGBPUSD, hGBPUSD)),    category: 'fx',         group: 'fx' },
    { name: 'USD / JPY',           ticker: 'USDJPY', ...spread(buildFxRow(rUSDJPY, hUSDJPY)),    category: 'fx',         group: 'fx' },
    // Rates
    { name: 'US 2Y Yield',         ticker: 'DGS2',   ...spread(us2y),                             category: 'yield',      group: 'rates' },
    { name: 'US 10Y Yield',        ticker: 'DGS10',  ...spread(us10y),                            category: 'yield',      group: 'rates' },
    { name: 'DE 10Y Bund',         ticker: 'DE10Y',  ...spread(de10y),                            category: 'yield',      group: 'rates' },
    { name: 'JP 10Y JGB',          ticker: 'JP10Y',  ...spread(jp10y),                            category: 'yield',      group: 'rates' },
    // Commodities & Volatility
    { name: 'Gold (GLD)',          ticker: 'GLD',    ...spread(gld),                              category: 'commodity',  group: 'commodities' },
    { name: 'Silver (SLV)',        ticker: 'SLV',    ...spread(slv),                              category: 'commodity',  group: 'commodities' },
    { name: 'VIX (VIXY)',          ticker: 'VIXY',   ...spread(vixy),                             category: 'volatility', group: 'commodities' },
  ];

  return NextResponse.json(rows);
}
