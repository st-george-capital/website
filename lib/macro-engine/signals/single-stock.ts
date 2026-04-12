/**
 * O'Neil-style single-stock screener for proxy equities in overweight sectors.
 *
 * Computes RS Proxy (universe-relative), DMA positions, institutional sponsorship
 * trend proxy, and earnings revision momentum for each proxy equity in overweight
 * sectors. Results are written to StockScreenResult.
 *
 * NOTE: rsRating in this module is a "RS Proxy (universe-relative)" — it is NOT the
 * official IBD Relative Strength Rating. It is ranked only within the proxy equity
 * list using a published weighted-ROC formula from the CAN SLIM community.
 *
 * smrProxy is null in Plan 03 — it will be populated in Plan 04 via FMP income
 * statement data once StockScreenResult rows exist.
 */

import { prismaDirectUrl } from '../db';

/**
 * Hard-coded sector ETF → proxy equity ticker map.
 * Only 6 sectors have proxy lists. Other sector ETFs (XLP, XLU, XLRE, XLB, XLC)
 * return empty for stock screening purposes.
 */
export const EQUITY_PROXY_MAP: Record<string, string[]> = {
  XLK: ['AAPL', 'MSFT', 'NVDA', 'AVGO', 'META'],
  XLF: ['JPM', 'BAC', 'WFC', 'MS', 'GS'],
  XLE: ['XOM', 'CVX', 'COP', 'SLB', 'PSX'],
  XLV: ['LLY', 'UNH', 'JNJ', 'ABBV', 'MRK'],
  XLI: ['GE', 'CAT', 'RTX', 'HON', 'UNP'],
  XLY: ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE'],
};

/**
 * Screened equity result for one proxy ticker.
 *
 * rsRating: RS Proxy (universe-relative) on 1–99 scale.
 *   Computed from weighted ROC formula — NOT the official IBD RS Rating.
 *   Ranked only within the 30-ticker proxy list.
 *
 * smrProxy: null in Plan 03. Plan 04 will populate via FMP income statement.
 */
export interface ScreenedEquity {
  ticker: string;
  sectorEtf: string;
  /** RS Proxy (universe-relative proxy) — 1–99. Not the official IBD RS Rating. */
  rsRating: number | null;
  /** EPS growth percentile rank vs proxy peers, 0–99 */
  epsRankProxy: number | null;
  /** Revenue/margin trend grade "A"–"E". null in Plan 03; Plan 04 populates via FMP. */
  smrProxy: string | null;
  /** (close / MA50) - 1 */
  dma50Position: number | null;
  /** (close / MA100) - 1 */
  dma100Position: number | null;
  /** (close / MA200) - 1 */
  dma200Position: number | null;
  /** (avg_vol_30d_recent / avg_vol_30d_year_ago) - 1 */
  institutionalSponsorshipTrend: number | null;
  /** zEarnings from FactorFeatureMatrix — latest available */
  earningsRevisionMomentum: number | null;
  /** Weighted composite of available non-null fields (0–1 scale) */
  compositeScore: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface OhlcvRow {
  ticker: string;
  date: Date;
  adjClose: number;
  volume: bigint;
}

/**
 * Compute Rate of Change (ROC) for a given number of trading days back.
 * Returns null if there are fewer than `days` rows in the history.
 */
function roc(prices: number[], days: number): number | null {
  if (prices.length <= days) return null;
  const current = prices[prices.length - 1];
  const prior = prices[prices.length - 1 - days];
  if (prior === 0) return null;
  return (current - prior) / prior;
}

/**
 * Compute percentile rank (0–1) of a value among all values.
 * Ties use average rank (consistent with pandas default).
 */
function percentileRank(values: number[], target: number): number {
  if (values.length === 0) return 0;
  const below = values.filter((v) => v < target).length;
  const equal = values.filter((v) => v === target).length;
  // Average rank approach: (below + 0.5 * equal) / total
  return (below + 0.5 * equal) / values.length;
}

/**
 * Clamp a value to [min, max] and normalize to [0, 1] within that range.
 */
function clampNorm(value: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(max, value));
  return (clamped - min) / (max - min);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Screen proxy equities for overweight sectors.
 *
 * Returns an empty array if:
 *   - overweightSectors is empty
 *   - None of the overweight sectors have entries in EQUITY_PROXY_MAP
 *
 * Does NOT throw on missing OHLCV data — individual metrics return null.
 */
export async function screenEquities(
  overweightSectors: string[],
  asOfDate: Date,
): Promise<ScreenedEquity[]> {
  if (overweightSectors.length === 0) {
    console.log('screenEquities: no overweight sectors — returning empty array');
    return [];
  }

  // Collect all proxy tickers for overweight sectors
  const sectorTickerPairs: { sectorEtf: string; ticker: string }[] = [];
  for (const sector of overweightSectors) {
    const tickers = EQUITY_PROXY_MAP[sector];
    if (!tickers) continue; // sector not in map (XLP, XLU, etc.)
    for (const ticker of tickers) {
      sectorTickerPairs.push({ sectorEtf: sector, ticker });
    }
  }

  if (sectorTickerPairs.length === 0) {
    console.log('screenEquities: overweight sectors have no proxy equities — returning empty array');
    return [];
  }

  const allTickers = [...new Set(sectorTickerPairs.map((p) => p.ticker))];
  const sectorMap = new Map(sectorTickerPairs.map((p) => [p.ticker, p.sectorEtf]));

  console.log(
    `screenEquities: screening ${allTickers.length} proxy equities for sectors: ${overweightSectors.join(', ')}`,
  );

  // ── 1. Fetch OHLCV data ────────────────────────────────────────────────────

  // Fetch 420 calendar days (~300 trading days) so ROC(252 trading days) is computable.
  // ROC(252) needs 252 price points; 420 calendar days provides ~290 trading days.
  const ohlcvRows = await prismaDirectUrl.$queryRaw<OhlcvRow[]>`
    SELECT ticker, date, "adjClose", volume
    FROM ohlcv_daily
    WHERE ticker = ANY(${allTickers})
      AND date >= (CURRENT_DATE - INTERVAL '420 days')
    ORDER BY ticker, date ASC
  `;

  // Group by ticker
  const ohlcvByTicker = new Map<string, OhlcvRow[]>();
  for (const row of ohlcvRows) {
    const arr = ohlcvByTicker.get(row.ticker) ?? [];
    arr.push(row);
    ohlcvByTicker.set(row.ticker, arr);
  }

  // ── 2. Compute RS scores for all tickers ──────────────────────────────────

  const rsScores = new Map<string, number | null>();

  for (const ticker of allTickers) {
    const rows = ohlcvByTicker.get(ticker) ?? [];
    const prices = rows.map((r) => r.adjClose);

    const roc63 = roc(prices, 63);
    const roc126 = roc(prices, 126);
    const roc189 = roc(prices, 189);
    const roc252 = roc(prices, 252);

    if (roc63 === null || roc126 === null || roc189 === null || roc252 === null) {
      rsScores.set(ticker, null);
    } else {
      const score = 0.4 * roc63 + 0.2 * roc126 + 0.2 * roc189 + 0.2 * roc252;
      rsScores.set(ticker, score);
    }
  }

  // Rank non-null RS scores within proxy list (universe-relative)
  const nonNullRsEntries = allTickers
    .map((t) => ({ ticker: t, score: rsScores.get(t) }))
    .filter((e): e is { ticker: string; score: number } => e.score !== null && e.score !== undefined);

  const rsScoreValues = nonNullRsEntries.map((e) => e.score);
  const rsRatingMap = new Map<string, number | null>();

  for (const ticker of allTickers) {
    const score = rsScores.get(ticker);
    if (score === null || score === undefined) {
      rsRatingMap.set(ticker, null);
    } else {
      const pct = percentileRank(rsScoreValues, score);
      // Scale to 1–99 (RS Proxy — universe-relative within proxy list ONLY)
      rsRatingMap.set(ticker, Math.round(pct * 99) || 1);
    }
  }

  // ── 3. Compute EPS rank proxy ──────────────────────────────────────────────

  // Query EarningsRevision for each ticker — we need earliest and latest estimatedEpsAvg
  const epsGrowthMap = new Map<string, number | null>();

  for (const ticker of allTickers) {
    try {
      const latest = await prismaDirectUrl.earningsRevision.findFirst({
        where: { symbol: ticker },
        orderBy: { date: 'desc' },
        select: { estimatedEpsAvg: true, date: true },
      });

      const threeYearsAgo = new Date(asOfDate);
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

      const oldest = await prismaDirectUrl.earningsRevision.findFirst({
        where: {
          symbol: ticker,
          date: { lte: threeYearsAgo },
        },
        orderBy: { date: 'desc' },
        select: { estimatedEpsAvg: true },
      });

      if (
        latest?.estimatedEpsAvg != null &&
        oldest?.estimatedEpsAvg != null &&
        oldest.estimatedEpsAvg !== 0
      ) {
        const growth =
          (latest.estimatedEpsAvg - oldest.estimatedEpsAvg) / Math.abs(oldest.estimatedEpsAvg);
        epsGrowthMap.set(ticker, growth);
      } else {
        epsGrowthMap.set(ticker, null);
      }
    } catch {
      epsGrowthMap.set(ticker, null);
    }
  }

  // Rank EPS growth among proxy peers
  const nonNullEpsEntries = allTickers
    .map((t) => ({ ticker: t, growth: epsGrowthMap.get(t) }))
    .filter((e): e is { ticker: string; growth: number } => e.growth !== null && e.growth !== undefined);

  const epsGrowthValues = nonNullEpsEntries.map((e) => e.growth);
  const epsRankMap = new Map<string, number | null>();

  for (const ticker of allTickers) {
    const growth = epsGrowthMap.get(ticker);
    if (growth === null || growth === undefined) {
      epsRankMap.set(ticker, null);
    } else {
      const pct = percentileRank(epsGrowthValues, growth);
      epsRankMap.set(ticker, Math.round(pct * 99) || 1);
    }
  }

  // ── 4. Fetch earningsRevisionMomentum (zEarnings from FactorFeatureMatrix) ─

  const zEarningsMap = new Map<string, number | null>();

  for (const ticker of allTickers) {
    try {
      const row = await prismaDirectUrl.$queryRaw<{ z_earnings: number | null }[]>`
        SELECT "zEarnings" AS z_earnings
        FROM factor_feature_matrix
        WHERE ticker = ${ticker}
        ORDER BY "featureDate" DESC
        LIMIT 1
      `;
      zEarningsMap.set(ticker, row[0]?.z_earnings ?? null);
    } catch {
      zEarningsMap.set(ticker, null);
    }
  }

  // ── 5. Build ScreenedEquity results ───────────────────────────────────────

  const results: ScreenedEquity[] = [];

  for (const ticker of allTickers) {
    const sectorEtf = sectorMap.get(ticker)!;
    const rows = ohlcvByTicker.get(ticker) ?? [];
    const prices = rows.map((r) => r.adjClose);
    const volumes = rows.map((r) => Number(r.volume));

    // DMA positions
    let dma50Position: number | null = null;
    let dma100Position: number | null = null;
    let dma200Position: number | null = null;

    if (prices.length >= 50) {
      const latestClose = prices[prices.length - 1];
      const ma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / 50;
      dma50Position = ma50 !== 0 ? latestClose / ma50 - 1 : null;
    }
    if (prices.length >= 100) {
      const latestClose = prices[prices.length - 1];
      const ma100 = prices.slice(-100).reduce((a, b) => a + b, 0) / 100;
      dma100Position = ma100 !== 0 ? latestClose / ma100 - 1 : null;
    }
    if (prices.length >= 200) {
      const latestClose = prices[prices.length - 1];
      const ma200 = prices.slice(-200).reduce((a, b) => a + b, 0) / 200;
      dma200Position = ma200 !== 0 ? latestClose / ma200 - 1 : null;
    }

    // Institutional sponsorship trend proxy
    // Compare recent 30-day avg volume vs 30-day avg volume from 1 year ago
    let institutionalSponsorshipTrend: number | null = null;
    if (volumes.length >= 60) {
      // Need at least 60 rows (30 recent + 30 from ~year ago)
      const recent30 = volumes.slice(-30);
      const avgRecent = recent30.reduce((a, b) => a + b, 0) / 30;

      // Approximate 1 year ago = ~252 trading days back (or end of available data)
      // We have at most 300 days of data; year-ago window starts ~252 days from the end
      const yearAgoStartIdx = Math.max(0, volumes.length - 282);
      const yearAgoEndIdx = Math.max(0, volumes.length - 252);
      if (yearAgoEndIdx - yearAgoStartIdx >= 30) {
        const yearAgo30 = volumes.slice(yearAgoStartIdx, yearAgoStartIdx + 30);
        const avgYearAgo = yearAgo30.reduce((a, b) => a + b, 0) / 30;
        institutionalSponsorshipTrend =
          avgYearAgo !== 0 ? avgRecent / avgYearAgo - 1 : null;
      }
    }

    const rsRating = rsRatingMap.get(ticker) ?? null;
    const epsRankProxy = epsRankMap.get(ticker) ?? null;
    const earningsRevisionMomentum = zEarningsMap.get(ticker) ?? null;

    // ── Composite score ─────────────────────────────────────────────────────
    // Weights: rsRating(0.25), epsRankProxy(0.20), dma50Position(0.15),
    //          institutionalSponsorshipTrend(0.15), earningsRevisionMomentum(0.25)
    // smrProxy excluded in Plan 03 (null).
    // All inputs normalized to [0,1]; missing fields excluded, weights renormalized.

    const components: { value: number; weight: number }[] = [];

    if (rsRating !== null) {
      components.push({ value: rsRating / 99, weight: 0.25 });
    }
    if (epsRankProxy !== null) {
      components.push({ value: epsRankProxy / 99, weight: 0.20 });
    }
    if (dma50Position !== null) {
      components.push({ value: clampNorm(dma50Position, -0.3, 0.3), weight: 0.15 });
    }
    if (institutionalSponsorshipTrend !== null) {
      components.push({ value: clampNorm(institutionalSponsorshipTrend, -0.5, 0.5), weight: 0.15 });
    }
    if (earningsRevisionMomentum !== null) {
      components.push({ value: clampNorm(earningsRevisionMomentum, -3, 3), weight: 0.25 });
    }

    let compositeScore = 0.5; // neutral default when no data available
    if (components.length > 0) {
      const totalWeight = components.reduce((s, c) => s + c.weight, 0);
      compositeScore = components.reduce((s, c) => s + (c.value * c.weight) / totalWeight, 0);
    }

    results.push({
      ticker,
      sectorEtf,
      rsRating,
      epsRankProxy,
      smrProxy: null, // Plan 04 will populate this via FMP income statement
      dma50Position,
      dma100Position,
      dma200Position,
      institutionalSponsorshipTrend,
      earningsRevisionMomentum,
      compositeScore,
    });
  }

  console.log(`screenEquities: computed results for ${results.length} proxy equities`);

  return results;
}
