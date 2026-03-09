import { NextResponse } from 'next/server';

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'GJV339TR2PPUSN9B';
const BASE = 'https://www.alphavantage.co/query';

export interface MarketRow {
  name: string;
  ticker: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  category: 'equity' | 'fx' | 'commodity';
}

// ETF proxies for indices — all supported by GLOBAL_QUOTE
const EQUITY_TICKERS: { ticker: string; name: string; category: 'equity' | 'commodity' }[] = [
  { ticker: 'QQQ',  name: 'NASDAQ (QQQ)',    category: 'equity' },
  { ticker: 'DIA',  name: 'Dow Jones (DIA)', category: 'equity' },
  { ticker: 'FEZ',  name: 'Euro Stoxx 50',   category: 'equity' },
  { ticker: 'EWJ',  name: 'Nikkei (EWJ)',    category: 'equity' },
  { ticker: 'EWH',  name: 'Hang Seng (EWH)', category: 'equity' },
  { ticker: 'GLD',  name: 'Gold (GLD)',       category: 'commodity' },
  { ticker: 'SLV',  name: 'Silver (SLV)',     category: 'commodity' },
];

async function fetchQuote(ticker: string): Promise<{ price: number; change: number; changePercent: number } | null> {
  try {
    const url = `${BASE}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${AV_KEY}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();
    const q = data['Global Quote'];
    if (!q || !q['05. price']) return null;

    const price = parseFloat(q['05. price']);
    const change = parseFloat(q['09. change']);
    const cpStr: string = q['10. change percent'] ?? '0%';
    const changePercent = parseFloat(cpStr.replace('%', ''));

    if (isNaN(price)) return null;
    return { price, change: isNaN(change) ? 0 : change, changePercent: isNaN(changePercent) ? 0 : changePercent };
  } catch {
    return null;
  }
}

async function fetchFxRate(fromCurrency: string, toCurrency: string): Promise<{ price: number; change: number; changePercent: number } | null> {
  try {
    const url = `${BASE}?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${AV_KEY}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();
    const rate = data['Realtime Currency Exchange Rate'];
    if (!rate || !rate['5. Exchange Rate']) return null;

    const price = parseFloat(rate['5. Exchange Rate']);
    if (isNaN(price)) return null;

    // AV's CURRENCY_EXCHANGE_RATE doesn't return change directly — use FX_DAILY to get prev close
    const dailyUrl = `${BASE}?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&outputsize=compact&apikey=${AV_KEY}`;
    const dailyRes = await fetch(dailyUrl, { next: { revalidate: 300 } });
    const dailyData = await dailyRes.json();
    const series = dailyData['Time Series FX (Daily)'];
    if (!series) return { price, change: 0, changePercent: 0 };

    const dates = Object.keys(series).sort().reverse();
    const prevClose = dates.length > 1 ? parseFloat(series[dates[1]]['4. close']) : price;
    const change = price - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    return { price, change, changePercent };
  } catch {
    return null;
  }
}

export async function GET() {
  // Fire all requests in parallel — 75 calls/min on paid plan is plenty
  const [equityResults, fxResult] = await Promise.all([
    Promise.all(EQUITY_TICKERS.map(t => fetchQuote(t.ticker))),
    fetchFxRate('USD', 'CAD'),
  ]);

  const rows: MarketRow[] = [];

  EQUITY_TICKERS.forEach((t, i) => {
    const q = equityResults[i];
    rows.push({
      name: t.name,
      ticker: t.ticker,
      price: q?.price ?? null,
      change: q?.change ?? null,
      changePercent: q?.changePercent ?? null,
      category: t.category,
    });
  });

  // Insert USD/CAD after the equity block
  rows.splice(3, 0, {
    name: 'USD / CAD',
    ticker: 'USDCAD',
    price: fxResult?.price ?? null,
    change: fxResult?.change ?? null,
    changePercent: fxResult?.changePercent ?? null,
    category: 'fx',
  });

  return NextResponse.json(rows);
}
