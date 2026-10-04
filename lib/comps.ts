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

/** Maps an Alpha Vantage OVERVIEW response to a comps table row, or null when the symbol has no fundamentals. */
export function compsRowFromOverview(data: Record<string, string>, ticker: string): CompsRow | null {
  if (!data?.Symbol) return null;
  const revenueTTM = toNum(data.RevenueTTM);
  const ebitda = toNum(data.EBITDA);
  const marketCap = toNum(data.MarketCapitalization);
  return {
    ticker: data.Symbol,
    name: data.Name || ticker,
    isSubject: false,
    sector: data.Sector || null,
    industry: data.Industry || null,
    marketCap: marketCap !== null ? marketCap / 1e6 : null,
    evToEBITDA: toNum(data.EVToEBITDA),
    evToRevenue: toNum(data.EVToRevenue),
    peTrailing: toNum(data.TrailingPE) ?? toNum(data.PERatio),
    peForward: toNum(data.ForwardPE),
    priceToSales: toNum(data.PriceToSalesRatioTTM),
    priceToBook: toNum(data.PriceToBookRatio),
    revenueGrowthYoY: toNum(data.QuarterlyRevenueGrowthYOY),
    operatingMargin: toNum(data.OperatingMarginTTM),
    ebitdaMargin: revenueTTM && ebitda && revenueTTM !== 0 ? ebitda / revenueTTM : null,
    beta: toNum(data.Beta),
    revenueTTM: revenueTTM !== null ? revenueTTM / 1e6 : null,
    ebitda: ebitda !== null ? ebitda / 1e6 : null,
  };
}

/** Peer tickers from Financial Modeling Prep, or [] when no FMP key is configured. */
export async function fetchFmpPeers(ticker: string): Promise<string[]> {
  const key = process.env.FMP_API_KEY || '';
  if (!key) return [];
  try {
    const url = `https://financialmodelingprep.com/api/v4/stock_peers?symbol=${encodeURIComponent(ticker)}&apikey=${key}`;
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
