export type FmpMoverQuote = {
  ticker: string;
  name: string;
  marketCap: number;
  price: number | null;
  changeAmount: number | null;
  changePercentage: number | null;
  volume: number | null;
};

type FmpQuote = {
  symbol?: string;
  name?: string;
  price?: number;
  changePercentage?: number;
  changesPercentage?: number;
  change?: number;
  volume?: number;
  marketCap?: number;
};

type YahooChartMeta = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const FMP_STABLE = "https://financialmodelingprep.com/stable";
const YAHOO_CONCURRENCY = 3;
const CACHE_MS = 600_000;
export const FMP_STAGGER_MS = 1200;
export const YAHOO_STAGGER_MS = 250;
export const LARGE_CAP_MARKET_CAP_FLOOR = 5_000_000_000;

// S&P 100 — a $5B+ universe we can quote on the current FMP plan (single-symbol only).
export const LARGE_CAP_UNIVERSE = [
  "AAPL", "ABBV", "ABT", "ACN", "ADBE", "AIG", "AMD", "AMGN", "AMT", "AMZN",
  "AVGO", "AXP", "BA", "BAC", "BK", "BKNG", "BLK", "BMY", "BRK-B", "C",
  "CAT", "CHTR", "CL", "CMCSA", "COF", "COP", "COST", "CRM", "CSCO", "CVS",
  "CVX", "DE", "DHR", "DIS", "DUK", "EMR", "EXC", "F", "FDX", "GD",
  "GE", "GILD", "GM", "GOOG", "GOOGL", "GS", "HD", "HON", "IBM", "INTC",
  "INTU", "ISRG", "JNJ", "JPM", "KO", "LIN", "LLY", "LMT", "LOW", "MA",
  "MCD", "MDT", "MET", "META", "MMM", "MO", "MRK", "MS", "MSFT", "NEE",
  "NFLX", "NKE", "NVDA", "ORCL", "PEP", "PFE", "PG", "PM", "QCOM", "RTX",
  "SBUX", "SCHW", "SO", "SPG", "T", "TGT", "TMO", "TMUS", "TSLA", "TXN",
  "UNH", "UNP", "UPS", "USB", "V", "VZ", "WFC", "WMT", "XOM",
];

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
  staggerMs = 0,
) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        if (index > 0 && staggerMs > 0) await delay(staggerMs);
        results[index] = await fn(items[index]);
      }
    }),
  );
  return results;
}

export function quoteToMover(row: FmpQuote): FmpMoverQuote | null {
  const ticker = typeof row.symbol === "string" ? row.symbol.trim() : "";
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const marketCap = Number(row.marketCap);
  if (!ticker || !name || !Number.isFinite(marketCap) || marketCap <= 0)
    return null;
  const changePercentage = Number(row.changePercentage ?? row.changesPercentage);
  return {
    ticker,
    name,
    marketCap,
    price: Number.isFinite(Number(row.price)) ? Number(row.price) : null,
    changeAmount: Number.isFinite(Number(row.change)) ? Number(row.change) : null,
    changePercentage: Number.isFinite(changePercentage) ? changePercentage : null,
    volume: Number.isFinite(Number(row.volume)) ? Number(row.volume) : null,
  };
}

export function yahooChartToMover(meta: YahooChartMeta): FmpMoverQuote | null {
  const ticker =
    typeof meta.symbol === "string" ? meta.symbol.trim().toUpperCase() : "";
  const name = [meta.shortName, meta.longName]
    .find((value) => typeof value === "string" && value.trim())
    ?.trim();
  if (!ticker || !name) return null;
  const liveCap = Number(meta.marketCap);
  const price = Number(meta.regularMarketPrice);
  const previous = Number(meta.chartPreviousClose);
  const changePercentage = Number(meta.regularMarketChangePercent);
  return {
    ticker,
    name,
    marketCap:
      Number.isFinite(liveCap) && liveCap > 0
        ? liveCap
        : LARGE_CAP_MARKET_CAP_FLOOR,
    price: Number.isFinite(price) ? price : null,
    changeAmount:
      Number.isFinite(price) && Number.isFinite(previous)
        ? price - previous
        : null,
    changePercentage: Number.isFinite(changePercentage)
      ? changePercentage
      : null,
    volume: Number.isFinite(Number(meta.regularMarketVolume))
      ? Number(meta.regularMarketVolume)
      : null,
  };
}

async function fetchJson(
  url: string,
  headers?: Record<string, string>,
) {
  const response = await fetch(url, {
    cache: "no-store",
    headers,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Quote request failed (${response.status})`);
  return response.json();
}

async function fetchOneQuote(ticker: string, key: string) {
  const data = await fetchJson(
    `${FMP_STABLE}/quote?symbol=${encodeURIComponent(ticker)}&apikey=${key}`,
  );
  const row = Array.isArray(data) ? data[0] : data;
  return quoteToMover(row as FmpQuote);
}

async function fetchYahooQuote(ticker: string) {
  const data = await fetchJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d&includePrePost=false`,
    {
      "User-Agent": "SGC-Market-Overview/1.0",
      Accept: "application/json",
    },
  );
  return yahooChartToMover(data?.chart?.result?.[0]?.meta as YahooChartMeta);
}

function remember(profiles: Map<string, FmpMoverQuote>) {
  quoteMemory = {
    at: Date.now(),
    map: new Map([...(quoteMemory?.map || []), ...profiles]),
  };
}

let quoteMemory: { at: number; map: Map<string, FmpMoverQuote> } | undefined;
let skipFmpUntil = 0;

export async function fetchFmpQuotes(tickers: string[]) {
  const key = process.env.FMP_API_KEY;
  const unique = [
    ...new Set(tickers.map((ticker) => ticker.trim().toUpperCase()).filter(Boolean)),
  ];
  const profiles = new Map<string, FmpMoverQuote>();
  if (unique.length === 0) return profiles;

  if (quoteMemory && Date.now() - quoteMemory.at < CACHE_MS) {
    for (const ticker of unique) {
      const cached = quoteMemory.map.get(ticker);
      if (cached) profiles.set(ticker, cached);
    }
  }

  const missing = () => unique.filter((ticker) => !profiles.has(ticker));

  const yahooMissing = missing();
  if (yahooMissing.length > 0) {
    const quotes = await mapPool(
      yahooMissing,
      YAHOO_CONCURRENCY,
      async (ticker) => {
        try {
          return await fetchYahooQuote(ticker);
        } catch {
          return null;
        }
      },
      YAHOO_STAGGER_MS,
    );
    for (const mover of quotes) {
      if (mover) profiles.set(mover.ticker.toUpperCase(), mover);
    }
  }

  const fmpTargets = missing().slice(0, 25);
  if (key && Date.now() >= skipFmpUntil && fmpTargets.length > 0) {
    let blocked = false;
    const quotes = await mapPool(
      fmpTargets,
      1,
      async (ticker) => {
        if (blocked) return null;
        try {
          return await fetchOneQuote(ticker, key);
        } catch (error) {
          if (String(error).includes("(429)")) {
            blocked = true;
            skipFmpUntil = Date.now() + CACHE_MS;
          }
          return null;
        }
      },
      FMP_STAGGER_MS,
    );
    for (const mover of quotes) {
      if (mover) profiles.set(mover.ticker.toUpperCase(), mover);
    }
  }

  remember(profiles);
  return profiles;
}

export async function fetchFmpLargeCapMovers(
  minMarketCap: number,
): Promise<FmpMoverQuote[]> {
  const quotes = await fetchFmpQuotes(LARGE_CAP_UNIVERSE);
  return [...quotes.values()].filter((row) => row.marketCap >= minMarketCap);
}
