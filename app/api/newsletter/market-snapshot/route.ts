import { NextResponse } from 'next/server';

// Cache this route for 5 minutes at the edge to avoid hammering the APIs on every preview refresh
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

function isAvLimited(data: any): boolean {
  return !!(data?.Note || data?.Information || data?.['Error Message']);
}

// ─── Alpha Vantage: equity / ETF quote ──────────────────────────────────────
async function fetchQuote(ticker: string) {
  try {
    const res = await fetch(`${AV_BASE}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${AV_KEY}`, {
      next: { revalidate: 300 },
    });
    const data = await res.json();
    if (isAvLimited(data)) {
      console.warn(`AV limited for GLOBAL_QUOTE ${ticker}:`, data.Note || data.Information || data['Error Message']);
      return null;
    }
    const q = data['Global Quote'];
    if (!q?.['05. price']) return null;
    const price = parseFloat(q['05. price']);
    const change = parseFloat(q['09. change'] ?? '0');
    const changePercent = parseFloat((q['10. change percent'] ?? '0%').replace('%', ''));
    if (isNaN(price)) return null;
    return { price, change: isNaN(change) ? 0 : change, changePercent: isNaN(changePercent) ? 0 : changePercent };
  } catch (e) {
    console.error(`fetchQuote(${ticker}) error:`, e);
    return null;
  }
}

// ─── Alpha Vantage: FX exchange rate + optional FX_DAILY for change ──────────
async function fetchFx(from: string, to: string) {
  try {
    // Always get the current rate first
    const rateRes = await fetch(
      `${AV_BASE}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${AV_KEY}`,
      { next: { revalidate: 300 } }
    );
    const rateData = await rateRes.json();
    if (isAvLimited(rateData)) {
      console.warn(`AV limited for FX rate ${from}/${to}`);
      return null;
    }
    const rate = rateData['Realtime Currency Exchange Rate'];
    if (!rate?.['5. Exchange Rate']) return null;
    const price = parseFloat(rate['5. Exchange Rate']);
    if (isNaN(price)) return null;

    // Separately try FX_DAILY for change — if it fails, still return the price
    let change = 0, changePercent = 0;
    try {
      const dailyRes = await fetch(
        `${AV_BASE}?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&outputsize=compact&apikey=${AV_KEY}`,
        { next: { revalidate: 300 } }
      );
      const dailyData = await dailyRes.json();
      if (!isAvLimited(dailyData)) {
        const series = dailyData['Time Series FX (Daily)'];
        if (series) {
          const dates = Object.keys(series).sort().reverse();
          if (dates.length > 1) {
            const prev = parseFloat(series[dates[1]]['4. close']);
            if (!isNaN(prev) && prev !== 0) {
              change = price - prev;
              changePercent = (change / prev) * 100;
            }
          }
        }
      }
    } catch {
      // Change data unavailable — price is still valid
    }

    return { price, change, changePercent };
  } catch (e) {
    console.error(`fetchFx(${from}/${to}) error:`, e);
    return null;
  }
}

// ─── Alpha Vantage: US Treasury yield ────────────────────────────────────────
async function fetchTreasuryYield(maturity: '2year' | '10year') {
  try {
    const res = await fetch(
      `${AV_BASE}?function=TREASURY_YIELD&interval=daily&maturity=${maturity}&apikey=${AV_KEY}`,
      { next: { revalidate: 300 } }
    );
    const data = await res.json();
    if (isAvLimited(data)) {
      console.warn(`AV limited for TREASURY_YIELD ${maturity}`);
      return null;
    }
    const series: { date: string; value: string }[] = data?.data ?? [];
    // Skip entries with '.' as value (missing data points from AV)
    const valid = series.filter(d => d.value && d.value !== '.');
    if (valid.length < 1) return null;
    const current = parseFloat(valid[0].value);
    if (isNaN(current)) return null;
    const prev = valid.length > 1 ? parseFloat(valid[1].value) : current;
    const change = isNaN(prev) ? 0 : current - prev;
    const changePercent = !isNaN(prev) && prev !== 0 ? (change / prev) * 100 : 0;
    return { price: current, change, changePercent };
  } catch (e) {
    console.error(`fetchTreasuryYield(${maturity}) error:`, e);
    return null;
  }
}

// ─── FRED: government bond yields (Germany & Japan) ─────────────────────────
async function fetchFredYield(seriesId: string) {
  if (!FRED_KEY) return null;
  try {
    const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&limit=2&sort_order=desc`;
    const res = await fetch(url, { next: { revalidate: 3600 } }); // FRED is monthly, cache longer
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
    console.error(`fetchFredYield(${seriesId}) error:`, e);
    return null;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET() {
  // Use Promise.allSettled so a single failure never blocks others
  const results = await Promise.allSettled([
    fetchQuote('QQQ'),   // 0 NASDAQ 100
    fetchQuote('DIA'),   // 1 Dow Jones
    fetchQuote('FEZ'),   // 2 Euro Stoxx 50
    fetchQuote('EWJ'),   // 3 Nikkei 225
    fetchQuote('EWH'),   // 4 Hang Seng
    fetchFx('USD', 'CAD'),  // 5
    fetchFx('EUR', 'USD'),  // 6
    fetchFx('GBP', 'USD'),  // 7
    fetchFx('USD', 'JPY'),  // 8
    fetchTreasuryYield('2year'),   // 9
    fetchTreasuryYield('10year'),  // 10
    fetchFredYield('IRLTLT01DEM156N'),  // 11 DE 10Y
    fetchFredYield('IRLTLT01JPM156N'),  // 12 JP 10Y
    fetchQuote('GLD'),   // 13 Gold
    fetchQuote('SLV'),   // 14 Silver
    fetchQuote('VIXY'),  // 15 VIX proxy
  ]);

  // Extract values — a rejected or null result maps to all-null fields
  const vals = results.map(r => r.status === 'fulfilled' ? r.value : null);

  const rows: MarketRow[] = [
    { name: 'NASDAQ 100',    ticker: 'QQQ',    ...spread(vals[0]),  category: 'equity',     group: 'equities' },
    { name: 'Dow Jones',     ticker: 'DIA',    ...spread(vals[1]),  category: 'equity',     group: 'equities' },
    { name: 'Euro Stoxx 50', ticker: 'FEZ',    ...spread(vals[2]),  category: 'equity',     group: 'equities' },
    { name: 'Nikkei 225',    ticker: 'EWJ',    ...spread(vals[3]),  category: 'equity',     group: 'asia' },
    { name: 'Hang Seng',     ticker: 'EWH',    ...spread(vals[4]),  category: 'equity',     group: 'asia' },
    { name: 'USD / CAD',     ticker: 'USDCAD', ...spread(vals[5]),  category: 'fx',         group: 'fx' },
    { name: 'EUR / USD',     ticker: 'EURUSD', ...spread(vals[6]),  category: 'fx',         group: 'fx' },
    { name: 'GBP / USD',     ticker: 'GBPUSD', ...spread(vals[7]),  category: 'fx',         group: 'fx' },
    { name: 'USD / JPY',     ticker: 'USDJPY', ...spread(vals[8]),  category: 'fx',         group: 'fx' },
    { name: 'US 2Y Yield',   ticker: 'DGS2',   ...spread(vals[9]),  category: 'yield',      group: 'rates' },
    { name: 'US 10Y Yield',  ticker: 'DGS10',  ...spread(vals[10]), category: 'yield',      group: 'rates' },
    { name: 'DE 10Y Bund',   ticker: 'DE10Y',  ...spread(vals[11]), category: 'yield',      group: 'rates' },
    { name: 'JP 10Y JGB',    ticker: 'JP10Y',  ...spread(vals[12]), category: 'yield',      group: 'rates' },
    { name: 'Gold (GLD)',    ticker: 'GLD',    ...spread(vals[13]), category: 'commodity',  group: 'commodities' },
    { name: 'Silver (SLV)',  ticker: 'SLV',    ...spread(vals[14]), category: 'commodity',  group: 'commodities' },
    { name: 'VIX (VIXY)',    ticker: 'VIXY',   ...spread(vals[15]), category: 'volatility', group: 'commodities' },
  ];

  return NextResponse.json(rows);
}

function spread(q: { price: number; change: number; changePercent: number } | null) {
  return {
    price: q?.price ?? null,
    change: q?.change ?? null,
    changePercent: q?.changePercent ?? null,
  };
}
