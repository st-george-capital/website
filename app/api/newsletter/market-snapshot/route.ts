import { NextResponse } from 'next/server';

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

// ─── Alpha Vantage: equity / ETF quote ──────────────────────────────────────
async function fetchQuote(ticker: string) {
  try {
    const res = await fetch(`${AV_BASE}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${AV_KEY}`);
    const data = await res.json();
    const q = data['Global Quote'];
    if (!q?.['05. price']) return null;
    const price = parseFloat(q['05. price']);
    const change = parseFloat(q['09. change'] ?? '0');
    const changePercent = parseFloat((q['10. change percent'] ?? '0%').replace('%', ''));
    if (isNaN(price)) return null;
    return { price, change: isNaN(change) ? 0 : change, changePercent: isNaN(changePercent) ? 0 : changePercent };
  } catch { return null; }
}

// ─── Alpha Vantage: FX exchange rate + FX_DAILY for change ──────────────────
async function fetchFx(from: string, to: string) {
  try {
    const [rateRes, dailyRes] = await Promise.all([
      fetch(`${AV_BASE}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${AV_KEY}`),
      fetch(`${AV_BASE}?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&outputsize=compact&apikey=${AV_KEY}`),
    ]);
    const rateData = await rateRes.json();
    const dailyData = await dailyRes.json();

    const rate = rateData['Realtime Currency Exchange Rate'];
    if (!rate?.['5. Exchange Rate']) return null;
    const price = parseFloat(rate['5. Exchange Rate']);
    if (isNaN(price)) return null;

    const series = dailyData['Time Series FX (Daily)'];
    let change = 0, changePercent = 0;
    if (series) {
      const dates = Object.keys(series).sort().reverse();
      if (dates.length > 1) {
        const prev = parseFloat(series[dates[1]]['4. close']);
        change = price - prev;
        changePercent = prev !== 0 ? (change / prev) * 100 : 0;
      }
    }
    return { price, change, changePercent };
  } catch { return null; }
}

// ─── Alpha Vantage: Treasury yield (US only) ────────────────────────────────
async function fetchTreasuryYield(maturity: '2year' | '10year') {
  try {
    const res = await fetch(
      `${AV_BASE}?function=TREASURY_YIELD&interval=daily&maturity=${maturity}&apikey=${AV_KEY}`
    );
    const data = await res.json();
    const series: { date: string; value: string }[] = data?.data ?? [];
    if (series.length < 2) return null;
    const current = parseFloat(series[0].value);
    const prev = parseFloat(series[1].value);
    if (isNaN(current)) return null;
    const change = isNaN(prev) ? 0 : current - prev;           // in percentage points
    const changePercent = !isNaN(prev) && prev !== 0 ? (change / prev) * 100 : 0;
    return { price: current, change, changePercent };
  } catch { return null; }
}

// ─── FRED: government bond yields (Germany & Japan) ─────────────────────────
async function fetchFredYield(seriesId: string) {
  if (!FRED_KEY) return null;
  try {
    const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&limit=2&sort_order=desc`;
    const res = await fetch(url);
    const data = await res.json();
    const obs: { date: string; value: string }[] = data?.observations ?? [];
    if (obs.length === 0) return null;
    const current = parseFloat(obs[0].value);
    if (isNaN(current)) return null;
    const prev = obs.length > 1 ? parseFloat(obs[1].value) : current;
    const change = isNaN(prev) ? 0 : current - prev;
    const changePercent = !isNaN(prev) && prev !== 0 ? (change / prev) * 100 : 0;
    return { price: current, change, changePercent };
  } catch { return null; }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET() {
  const [
    // Equities
    qqq, dia, fez,
    // Asia
    ewj, ewh,
    // FX
    usdcad, eurusd, gbpusd, usdjpy,
    // Rates
    us2y, us10y, de10y, jp10y,
    // Commodities + Volatility
    gld, slv, vixy,
  ] = await Promise.all([
    // Equities
    fetchQuote('QQQ'),
    fetchQuote('DIA'),
    fetchQuote('FEZ'),
    // Asia
    fetchQuote('EWJ'),
    fetchQuote('EWH'),
    // FX
    fetchFx('USD', 'CAD'),
    fetchFx('EUR', 'USD'),
    fetchFx('GBP', 'USD'),
    fetchFx('USD', 'JPY'),
    // Rates (AV Treasury + FRED for overseas)
    fetchTreasuryYield('2year'),
    fetchTreasuryYield('10year'),
    fetchFredYield('IRLTLT01DEM156N'),  // Germany 10Y (monthly, ECB via FRED)
    fetchFredYield('IRLTLT01JPM156N'),  // Japan 10Y (monthly, via FRED)
    // Commodities & volatility
    fetchQuote('GLD'),
    fetchQuote('SLV'),
    fetchQuote('VIXY'),
  ]);

  const rows: MarketRow[] = [
    // ── Equities ──────────────────────────────────
    { name: 'NASDAQ 100',      ticker: 'QQQ',   ...spread(qqq),  category: 'equity',     group: 'equities' },
    { name: 'Dow Jones',       ticker: 'DIA',   ...spread(dia),  category: 'equity',     group: 'equities' },
    { name: 'Euro Stoxx 50',   ticker: 'FEZ',   ...spread(fez),  category: 'equity',     group: 'equities' },
    // ── Asia ──────────────────────────────────────
    { name: 'Nikkei 225',      ticker: 'EWJ',   ...spread(ewj),  category: 'equity',     group: 'asia' },
    { name: 'Hang Seng',       ticker: 'EWH',   ...spread(ewh),  category: 'equity',     group: 'asia' },
    // ── FX ────────────────────────────────────────
    { name: 'USD / CAD',       ticker: 'USDCAD',...spread(usdcad),category: 'fx',        group: 'fx' },
    { name: 'EUR / USD',       ticker: 'EURUSD',...spread(eurusd),category: 'fx',        group: 'fx' },
    { name: 'GBP / USD',       ticker: 'GBPUSD',...spread(gbpusd),category: 'fx',        group: 'fx' },
    { name: 'USD / JPY',       ticker: 'USDJPY',...spread(usdjpy),category: 'fx',        group: 'fx' },
    // ── Rates ─────────────────────────────────────
    { name: 'US 2Y Yield',     ticker: 'DGS2',  ...spread(us2y),  category: 'yield',     group: 'rates' },
    { name: 'US 10Y Yield',    ticker: 'DGS10', ...spread(us10y), category: 'yield',     group: 'rates' },
    { name: 'DE 10Y Bund',     ticker: 'DE10Y', ...spread(de10y), category: 'yield',     group: 'rates' },
    { name: 'JP 10Y JGB',      ticker: 'JP10Y', ...spread(jp10y), category: 'yield',     group: 'rates' },
    // ── Commodities & Volatility ──────────────────
    { name: 'Gold (GLD)',      ticker: 'GLD',   ...spread(gld),  category: 'commodity',  group: 'commodities' },
    { name: 'Silver (SLV)',    ticker: 'SLV',   ...spread(slv),  category: 'commodity',  group: 'commodities' },
    { name: 'VIX (VIXY)',      ticker: 'VIXY',  ...spread(vixy), category: 'volatility', group: 'commodities' },
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
