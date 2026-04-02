import { NextRequest, NextResponse } from 'next/server';

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';
const FMP_KEY = process.env.FMP_API_KEY || '';

export interface CompsRow {
  ticker: string;
  name: string;
  isSubject: boolean;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;       // in millions
  evToEBITDA: number | null;
  evToRevenue: number | null;
  peTrailing: number | null;
  peForward: number | null;
  priceToSales: number | null;
  priceToBook: number | null;
  revenueGrowthYoY: number | null; // as decimal, e.g. 0.12 = 12%
  operatingMargin: number | null;  // as decimal
  ebitdaMargin: number | null;     // as decimal (EBITDA / Revenue)
  beta: number | null;
  revenueTTM: number | null;       // in millions
  ebitda: number | null;           // in millions
}

function toNum(v: string | undefined | null): number | null {
  if (!v || v === 'None' || v === '-') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

async function fetchAVOverview(ticker: string): Promise<CompsRow | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${AV_KEY}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();

    // Rate limit
    if (data.Note || data.Information) {
      throw Object.assign(new Error('RATE_LIMIT'), { isRateLimit: true, raw: data.Note || data.Information });
    }

    if (data['Error Message'] || !data.Symbol) return null;

    const revenueTTM = toNum(data.RevenueTTM);
    const ebitda = toNum(data.EBITDA);
    const operatingMargin = toNum(data.OperatingMarginTTM);

    // Approximate EBITDA margin = EBITDA / Revenue
    const ebitdaMargin = revenueTTM && ebitda && revenueTTM !== 0 ? ebitda / revenueTTM : null;

    return {
      ticker: data.Symbol,
      name: data.Name || ticker,
      isSubject: false,
      sector: data.Sector || null,
      industry: data.Industry || null,
      marketCap: toNum(data.MarketCapitalization) !== null ? (toNum(data.MarketCapitalization)! / 1e6) : null,
      evToEBITDA: toNum(data.EVToEBITDA),
      evToRevenue: toNum(data.EVToRevenue),
      peTrailing: toNum(data.TrailingPE) ?? toNum(data.PERatio),
      peForward: toNum(data.ForwardPE),
      priceToSales: toNum(data.PriceToSalesRatioTTM),
      priceToBook: toNum(data.PriceToBookRatio),
      revenueGrowthYoY: toNum(data.QuarterlyRevenueGrowthYOY),
      operatingMargin,
      ebitdaMargin,
      beta: toNum(data.Beta),
      revenueTTM: revenueTTM !== null ? revenueTTM / 1e6 : null,
      ebitda: ebitda !== null ? ebitda / 1e6 : null,
    };
  } catch (err: any) {
    if (err.isRateLimit) throw err;
    return null;
  }
}

async function fetchFMPPeers(ticker: string): Promise<string[]> {
  if (!FMP_KEY) return [];
  try {
    const url = `https://financialmodelingprep.com/api/v4/stock_peers?symbol=${ticker}&apikey=${FMP_KEY}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.peersList) {
      return (data[0].peersList as string[]).slice(0, 8);
    }
    return [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { subject, peers: manualPeers } = await req.json() as { subject: string; peers?: string[] };

    if (!subject) {
      return NextResponse.json({ error: 'subject ticker is required' }, { status: 400 });
    }

    const subjectTicker = subject.toUpperCase();

    // Resolve peers: manual override > FMP auto-fetch > empty
    let peerTickers: string[] = [];
    if (manualPeers && manualPeers.length > 0) {
      peerTickers = manualPeers.map(t => t.toUpperCase()).filter(t => t !== subjectTicker);
    } else {
      peerTickers = await fetchFMPPeers(subjectTicker);
    }

    const allTickers = [subjectTicker, ...peerTickers];

    // Fetch AV OVERVIEW for all tickers in parallel
    const results = await Promise.all(allTickers.map(t => fetchAVOverview(t)));

    const rows: CompsRow[] = results
      .filter((r): r is CompsRow => r !== null)
      .map((r, i) => ({ ...r, isSubject: allTickers[i] === subjectTicker }));

    return NextResponse.json({ rows, peersSource: manualPeers?.length ? 'manual' : (peerTickers.length > 0 ? 'fmp' : 'none') });
  } catch (err: any) {
    if (err.isRateLimit) {
      return NextResponse.json(
        {
          error: 'Alpha Vantage API rate limit reached',
          details: `The free tier allows 25 requests per day (5 per minute). The comps table fetches one request per company — with a subject + 8 peers that's 9 requests. You've hit today's limit. Either upgrade your Alpha Vantage plan or try again tomorrow.`,
          raw: err.raw,
        },
        { status: 429 }
      );
    }
    console.error('Comps error:', err);
    return NextResponse.json({ error: 'Failed to build comps table', details: String(err) }, { status: 500 });
  }
}
