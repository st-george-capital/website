export type OverviewMetric = {
  id: string;
  name: string;
  value: number | null;
  change: number | null;
  unit: "index" | "yield";
  asOf: string | null;
  source: string;
};
export function latestObservation(
  points: { date: string; value: number }[],
  unit: "index" | "yield",
) {
  const valid = points
    .filter(
      (p) => Number.isFinite(p.value) && Number.isFinite(Date.parse(p.date)),
    )
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const last = valid.at(-1),
    previous = valid.at(-2);
  return {
    value: last?.value ?? null,
    change:
      last && previous
        ? unit === "yield"
          ? (last.value - previous.value) * 100
          : previous.value !== 0
            ? (last.value / previous.value - 1) * 100
            : null
        : null,
    asOf: last?.date ?? null,
  };
}
async function json(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "SGC-Market-Overview/1.0",
      Accept: "application/json",
    },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Market provider unavailable");
  return response.json();
}
async function index(
  id: string,
  name: string,
  symbol: string,
): Promise<OverviewMetric> {
  const metric: OverviewMetric = {
    id,
    name,
    unit: "index",
    value: null,
    change: null,
    asOf: null,
    source: "Yahoo Finance",
  };
  try {
    const data = await json(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d&includePrePost=false`,
    );
    const result = data?.chart?.result?.[0];
    const closes = result?.indicators?.quote?.[0]?.close || [];
    const points = (result?.timestamp || []).flatMap(
      (timestamp: number, i: number) =>
        typeof closes[i] === "number"
          ? [
              {
                date: new Date(timestamp * 1000).toISOString(),
                value: closes[i],
              },
            ]
          : [],
    );
    return { ...metric, ...latestObservation(points, "index") };
  } catch {
    return metric;
  }
}
async function treasury(): Promise<OverviewMetric> {
  const metric: OverviewMetric = {
    id: "us10y",
    name: "U.S. 10Y Treasury",
    unit: "yield",
    value: null,
    change: null,
    asOf: null,
    source: "FRED · DGS10",
  };
  if (process.env.FRED_API_KEY) {
    try {
      const data = await json(
        `https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=${encodeURIComponent(process.env.FRED_API_KEY)}&file_type=json&limit=10&sort_order=desc`,
      );
      const latest = latestObservation(
        (data.observations || []).map((p: { date: string; value: string }) => ({
          date: p.date,
          value: parseFloat(p.value),
        })),
        "yield",
      );
      if (latest.value != null) return { ...metric, ...latest };
    } catch {
      /* Try the alternative Treasury feed. */
    }
  }
  if (process.env.ALPHA_VANTAGE_API_KEY) {
    try {
      const data = await json(
        `https://www.alphavantage.co/query?function=TREASURY_YIELD&interval=daily&maturity=10year&apikey=${encodeURIComponent(process.env.ALPHA_VANTAGE_API_KEY)}`,
      );
      const latest = latestObservation(
        (data.data || [])
          .slice(0, 10)
          .map((p: { date: string; value: string }) => ({
            date: p.date,
            value: parseFloat(p.value),
          })),
        "yield",
      );
      if (latest.value != null)
        return {
          ...metric,
          ...latest,
          source: "Alpha Vantage · Treasury yield",
        };
    } catch {
      /* Unavailable is displayed without substituting an estimated yield. */
    }
  }
  return metric;
}
export async function getMarketOverview() {
  return Promise.all([
    treasury(),
    index("sp500", "S&P 500", "^GSPC"),
    index("nasdaq", "Nasdaq Composite", "^IXIC"),
    index("russell2000", "Russell 2000", "^RUT"),
  ]);
}
