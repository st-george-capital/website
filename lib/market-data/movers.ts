import {
  fetchAlphaVantageTopGainersLosers,
  type AlphaVantageMoverEntry,
  type AlphaVantageTopMoversResponse,
} from "@/lib/alpha-vantage";
import {
  fetchFmpQuotes,
  LARGE_CAP_UNIVERSE,
} from "@/lib/market-data/fmp-quotes";

export const MIN_MOVER_MARKET_CAP = 5_000_000_000;
export const MOVER_LIST_SIZE = 10;
export type MoverCompany = { name: string; marketCap: number };
export type FilteredMover = AlphaVantageMoverEntry & MoverCompany;
const groups = ["mostActivelyTraded", "topGainers", "topLosers"] as const;

export function parseMoverCompany(
  data: Record<string, unknown>,
  ticker: string,
): MoverCompany | null {
  const marketCap = Number(data.MarketCapitalization);
  const name = typeof data.Name === "string" ? data.Name.trim() : "";
  const symbol =
    typeof data.Symbol === "string" ? data.Symbol.trim().toUpperCase() : "";
  const currency =
    typeof data.Currency === "string" ? data.Currency.trim().toUpperCase() : "";
  // Missing currency is treated as USD; do not compare CAD/other FX to a USD cap.
  if (
    symbol !== ticker.trim().toUpperCase() ||
    (currency && currency !== "USD") ||
    !name ||
    !Number.isFinite(marketCap) ||
    marketCap <= 0
  )
    return null;
  return { name, marketCap };
}

export function fillMoverList(
  primary: FilteredMover[],
  pool: FilteredMover[],
  compare: (a: FilteredMover, b: FilteredMover) => number,
  limit = MOVER_LIST_SIZE,
) {
  const seen = new Set(primary.map((row) => row.ticker.toUpperCase()));
  const extra = pool
    .filter(
      (row) =>
        Number.isFinite(row.marketCap) &&
        row.marketCap >= MIN_MOVER_MARKET_CAP &&
        row.name.trim() &&
        !seen.has(row.ticker.toUpperCase()),
    )
    .sort(compare);
  return [...primary, ...extra].slice(0, limit);
}

export function shouldCacheFilteredMovers(result: {
  mostActivelyTraded: unknown[];
  topGainers: unknown[];
  topLosers: unknown[];
  coverageIncomplete?: boolean;
}) {
  const count =
    result.mostActivelyTraded.length +
    result.topGainers.length +
    result.topLosers.length;
  return count > 0 || !result.coverageIncomplete;
}

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
  const eligible = (rows: AlphaVantageMoverEntry[]): FilteredMover[] =>
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

function byVolume(a: FilteredMover, b: FilteredMover) {
  return (b.volume || 0) - (a.volume || 0);
}
function byGain(a: FilteredMover, b: FilteredMover) {
  return (b.changePercentage || 0) - (a.changePercentage || 0);
}
function byLoss(a: FilteredMover, b: FilteredMover) {
  return (a.changePercentage || 0) - (b.changePercentage || 0);
}

async function buildDashboardMarketMovers() {
  let lastUpdated: string | null = null;
  let metadata: string | null = null;
  try {
    const movers = await fetchAlphaVantageTopGainersLosers();
    lastUpdated = movers.lastUpdated;
    metadata = movers.metadata;
  } catch {
    // Large-cap quotes still populate the lists if the session feed is down.
  }

  const fmpQuotes = await fetchFmpQuotes(LARGE_CAP_UNIVERSE);
  const pool = [...fmpQuotes.values()].filter(
    (row) => row.marketCap >= MIN_MOVER_MARKET_CAP,
  ) as FilteredMover[];
  const result = {
    metadata,
    lastUpdated,
    minMarketCap: MIN_MOVER_MARKET_CAP,
    mostActivelyTraded: fillMoverList([], pool, byVolume),
    topGainers: fillMoverList(
      [],
      pool.filter((row) => (row.changePercentage || 0) > 0),
      byGain,
    ),
    topLosers: fillMoverList(
      [],
      pool.filter((row) => (row.changePercentage || 0) < 0),
      byLoss,
    ),
  };
  return {
    ...result,
    coverageIncomplete: groups.some((group) => result[group].length === 0),
  };
}

type MoversResult = Awaited<ReturnType<typeof buildDashboardMarketMovers>>;
const CACHE_VERSION = "5b-sp100-v2";
let memory: { version: string; value: MoversResult; at: number } | undefined;
let pending: Promise<MoversResult> | undefined;
const CACHE_MS = 600_000;

export function getDashboardMarketMovers() {
  if (memory && memory.version === CACHE_VERSION && Date.now() - memory.at < CACHE_MS)
    return Promise.resolve(memory.value);
  if (!pending) {
    pending = buildDashboardMarketMovers()
      .then((value) => {
        if (shouldCacheFilteredMovers(value))
          memory = { version: CACHE_VERSION, value, at: Date.now() };
        return value;
      })
      .finally(() => {
        pending = undefined;
      });
  }
  return pending;
}
