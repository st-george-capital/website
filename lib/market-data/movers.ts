import { unstable_cache } from "next/cache";
import {
  fetchAlphaVantageTopGainersLosers,
  type AlphaVantageMoverEntry,
  type AlphaVantageTopMoversResponse,
} from "@/lib/alpha-vantage";

export const MIN_MOVER_MARKET_CAP = 1_000_000_000;
export type MoverCompany = { name: string; marketCap: number };
const groups = ["mostActivelyTraded", "topGainers", "topLosers"] as const;

export function parseMoverCompany(
  data: Record<string, unknown>,
  ticker: string,
): MoverCompany | null {
  const marketCap = Number(data.MarketCapitalization);
  const name = typeof data.Name === "string" ? data.Name.trim() : "";
  // Do not compare unknown currencies with a USD threshold or show unmatched profiles.
  if (
    data.Symbol !== ticker ||
    data.Currency !== "USD" ||
    !name ||
    !Number.isFinite(marketCap) ||
    marketCap <= 0
  )
    return null;
  return { name, marketCap };
}

const company = unstable_cache(
  async (ticker: string) => {
    const key = process.env.ALPHA_VANTAGE_API_KEY;
    if (!key) throw new Error("Market data is not configured");
    const params = new URLSearchParams({
      function: "OVERVIEW",
      symbol: ticker,
      apikey: key,
    });
    const response = await fetch(
      `https://www.alphavantage.co/query?${params}`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) throw new Error("Company data unavailable");
    const data = await response.json();
    if (data.Note || data.Information || data["Error Message"])
      throw new Error("Company data unavailable");
    return parseMoverCompany(data, ticker);
  },
  ["dashboard-mover-company-v1"],
  { revalidate: 86400 },
);

export async function filterMarketMovers(
  movers: AlphaVantageTopMoversResponse,
  lookup: (ticker: string) => Promise<MoverCompany | null>,
  budgetMs = 20000,
) {
  const tickers = [
    ...new Set(
      groups
        .flatMap((group) => movers[group].map((row) => row.ticker))
        .filter(Boolean),
    ),
  ];
  const profiles = new Map<string, MoverCompany | null>();
  let cursor = 0,
    unavailable = 0;
  const deadline = Date.now() + budgetMs;
  // Bound cold-cache work; unknown companies never bypass the cap filter.
  await Promise.all(
    Array.from({ length: Math.min(4, tickers.length) }, async () => {
      while (cursor < tickers.length && Date.now() < deadline) {
        const ticker = tickers[cursor++];
        try {
          const profile = await lookup(ticker);
          profiles.set(ticker, profile);
          if (!profile) unavailable++;
        } catch {
          unavailable++;
        }
      }
    }),
  );
  unavailable += tickers.length - cursor;
  const eligible = (rows: AlphaVantageMoverEntry[]) =>
    rows.flatMap((row) => {
      const profile = profiles.get(row.ticker);
      return profile &&
        Number.isFinite(profile.marketCap) &&
        profile.marketCap >= MIN_MOVER_MARKET_CAP &&
        profile.name.trim()
        ? [{ ...row, ...profile }]
        : [];
    });
  return {
    ...movers,
    mostActivelyTraded: eligible(movers.mostActivelyTraded),
    topGainers: eligible(movers.topGainers),
    topLosers: eligible(movers.topLosers),
    minMarketCap: MIN_MOVER_MARKET_CAP,
    coverageIncomplete: unavailable > 0,
  };
}

const cachedMovers = unstable_cache(
  async () =>
    filterMarketMovers(await fetchAlphaVantageTopGainersLosers(), company),
  ["dashboard-cap-filtered-movers-v1"],
  { revalidate: 300 },
);
let pending: ReturnType<typeof cachedMovers> | undefined;
export function getDashboardMarketMovers() {
  if (!pending)
    pending = cachedMovers().finally(() => {
      pending = undefined;
    });
  return pending;
}
