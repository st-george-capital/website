// Factor exposure methodology for the CVaR optimizer.
//
// IMPORTANT SCOPING NOTE (also stated in the research report and the tool page UI):
// each factor here is a CROSS-SECTIONAL Z-SCORE computed *within the current holdings
// universe* (the fund's ~15-30 names, or the diverse validation basket when run against
// that instead). This is a simplification appropriate for a small, concentrated book —
// it is explicitly NOT a market-wide factor model of the kind Fama-French or MSCI build
// from thousands of constituents. A stock's "Quality" score here means "high quality
// relative to the other names currently held," not relative to the global equity
// universe. See report Section 5/10 for the full caveat.

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sequential } from '@/lib/market-data/rate-limit';

export interface RawFundamentals {
  peRatio: number | null;
  pegRatio: number | null;
  priceToBookRatio: number | null;
  evToEBITDA: number | null;
  returnOnEquityTTM: number | null;
  profitMargin: number | null;
  operatingMarginTTM: number | null;
  quarterlyEarningsGrowthYOY: number | null;
  quarterlyRevenueGrowthYOY: number | null;
  marketCapitalization: number | null;
}

export interface FactorScores {
  ticker: string;
  value: number | null;
  growth: number | null;
  momentum: number | null;
  quality: number | null;
  volatility: number | null;
  size: number | null;
  rawInputs: RawFundamentals & { return6M: number | null; return12M: number | null; realizedVol90D: number | null };
  dataComplete: boolean;
}

const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';

/**
 * Fetches the same OVERVIEW fields already parsed by the DCF tool's overview route
 * (app/api/alpha-vantage/overview/[ticker]/route.ts) — kept as a direct Alpha Vantage
 * call here (rather than an internal fetch to that route) since this runs server-side
 * from a lib function, not a browser client.
 */
export async function fetchRawFundamentals(ticker: string): Promise<RawFundamentals | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) throw new Error('ALPHA_VANTAGE_API_KEY not configured');

  const url = `${ALPHA_VANTAGE_BASE}?function=OVERVIEW&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Alpha Vantage OVERVIEW error for ${ticker}: ${res.status}`);
  const data = await res.json();

  if (data.Note || data.Information || data['Error Message']) return null;
  if (!data.Symbol && !data.Name) return null; // empty overview — e.g. some non-US listings

  const toNum = (v: unknown): number | null => {
    const n = parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
  };

  return {
    peRatio: toNum(data.PERatio),
    pegRatio: toNum(data.PEGRatio),
    priceToBookRatio: toNum(data.PriceToBookRatio),
    evToEBITDA: toNum(data.EVToEBITDA),
    returnOnEquityTTM: toNum(data.ReturnOnEquityTTM),
    profitMargin: toNum(data.ProfitMargin),
    operatingMarginTTM: toNum(data.OperatingMarginTTM),
    quarterlyEarningsGrowthYOY: toNum(data.QuarterlyEarningsGrowthYOY),
    quarterlyRevenueGrowthYOY: toNum(data.QuarterlyRevenueGrowthYOY),
    marketCapitalization: toNum(data.MarketCapitalization),
  };
}

// ─── Return / vol helpers (adapted from calcRealizedVol in app/api/dashboard/flows/route.ts) ──

function nDayReturn(closesOldestFirst: number[], n: number): number | null {
  if (closesOldestFirst.length < n + 1) return null;
  const cur = closesOldestFirst[closesOldestFirst.length - 1];
  const prev = closesOldestFirst[closesOldestFirst.length - 1 - n];
  return prev !== 0 ? (cur - prev) / prev : null;
}

/** Annualized realized vol (√252 scaling) over a trailing window of daily closes. */
export function calcRealizedVol(closesOldestFirst: number[], windowDays = 90): number | null {
  if (closesOldestFirst.length < windowDays + 1) return null;
  const slice = closesOldestFirst.slice(-(windowDays + 1));
  const logRets: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    if (slice[i - 1] > 0 && slice[i] > 0) logRets.push(Math.log(slice[i] / slice[i - 1]));
  }
  if (logRets.length < 10) return null;
  const mean = logRets.reduce((a, b) => a + b, 0) / logRets.length;
  const variance = logRets.reduce((a, b) => a + (b - mean) ** 2, 0) / logRets.length;
  return Math.sqrt(variance) * Math.sqrt(252);
}

// ─── Cross-sectional z-score ────────────────────────────────────────────────────────

/** z = (x - mean) / stddev across the non-null values in `values`; null values map to
 * neutral (z=0) per the plan's graceful-degradation rule, not dropped from the array. */
export function crossSectionalZScores(values: Array<number | null>, invert = false): Array<number | null> {
  const present = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (present.length < 2) return values.map((v) => (v === null ? null : 0));
  const mean = present.reduce((a, b) => a + b, 0) / present.length;
  const variance = present.reduce((a, b) => a + (b - mean) ** 2, 0) / present.length;
  const std = Math.sqrt(variance);
  return values.map((v) => {
    if (v === null || !Number.isFinite(v)) return null;
    if (std === 0) return 0;
    const z = (v - mean) / std;
    return invert ? -z : z;
  });
}

interface TickerInputBundle {
  ticker: string;
  fundamentals: RawFundamentals | null;
  return6M: number | null;
  return12M: number | null;
  realizedVol90D: number | null;
}

/**
 * Computes the six cross-sectional factor scores for a universe of tickers as of `asOfDate`.
 * Pulls fundamentals from Alpha Vantage OVERVIEW (sequentially rate-limited by the caller)
 * and momentum/volatility from already-backfilled PriceHistory rows.
 *
 * Graceful degradation: if OVERVIEW is missing/incomplete for a ticker (expected for some
 * non-US-listed holdings), its fundamentals-derived inputs are null and get z=0 (neutral)
 * rather than failing the whole run; dataComplete is flagged false for that ticker.
 */
export async function computeFactorScores(
  tickers: string[],
  fundamentalsByTicker: Map<string, RawFundamentals | null>,
  asOfDate: Date = new Date()
): Promise<FactorScores[]> {
  const bundles: TickerInputBundle[] = [];

  for (const ticker of tickers) {
    const history = await prisma.priceHistory.findMany({
      where: { ticker, date: { lte: asOfDate } },
      orderBy: { date: 'asc' },
      select: { close: true, date: true },
    });
    const closes = history.map((h) => h.close);

    bundles.push({
      ticker,
      fundamentals: fundamentalsByTicker.get(ticker) ?? null,
      return6M: nDayReturn(closes, 126), // ~6 trading months
      return12M: nDayReturn(closes, 252), // ~12 trading months
      realizedVol90D: calcRealizedVol(closes, 90),
    });
  }

  // Value: inverted composite of P/E, P/B, EV/EBITDA (lower multiple => higher score).
  // Build a single composite input per ticker by averaging the z-scores of the three
  // multiples individually (each z'd cross-sectionally first), so one field's null
  // doesn't force the whole composite null.
  const peZ = crossSectionalZScores(bundles.map((b) => b.fundamentals?.peRatio ?? null), true);
  const pbZ = crossSectionalZScores(bundles.map((b) => b.fundamentals?.priceToBookRatio ?? null), true);
  const evEbitdaZ = crossSectionalZScores(bundles.map((b) => b.fundamentals?.evToEBITDA ?? null), true);

  // Growth: average of earnings/revenue YoY growth z-scores.
  const earningsGrowthZ = crossSectionalZScores(bundles.map((b) => b.fundamentals?.quarterlyEarningsGrowthYOY ?? null));
  const revenueGrowthZ = crossSectionalZScores(bundles.map((b) => b.fundamentals?.quarterlyRevenueGrowthYOY ?? null));

  // Momentum: average of 6mo/12mo return z-scores.
  const return6MZ = crossSectionalZScores(bundles.map((b) => b.return6M));
  const return12MZ = crossSectionalZScores(bundles.map((b) => b.return12M));

  // Quality: average of ROE, net margin, operating margin z-scores.
  const roeZ = crossSectionalZScores(bundles.map((b) => b.fundamentals?.returnOnEquityTTM ?? null));
  const netMarginZ = crossSectionalZScores(bundles.map((b) => b.fundamentals?.profitMargin ?? null));
  const opMarginZ = crossSectionalZScores(bundles.map((b) => b.fundamentals?.operatingMarginTTM ?? null));

  // Volatility: inverted realized vol (higher score = lower vol = "low-vol tilt").
  const volZ = crossSectionalZScores(bundles.map((b) => b.realizedVol90D), true);

  // Size: log(market cap), NOT inverted by default — large/defensive favored by the
  // thesis. Sign convention stated explicitly in the report (Section 6/methodology).
  const logMktCap = bundles.map((b) =>
    b.fundamentals?.marketCapitalization && b.fundamentals.marketCapitalization > 0
      ? Math.log(b.fundamentals.marketCapitalization)
      : null
  );
  const sizeZ = crossSectionalZScores(logMktCap, false);

  const avgOfPresent = (vals: Array<number | null>): number | null => {
    const present = vals.filter((v): v is number => v !== null);
    if (present.length === 0) return null;
    return present.reduce((a, b) => a + b, 0) / present.length;
  };

  return bundles.map((b, i) => {
    const value = avgOfPresent([peZ[i], pbZ[i], evEbitdaZ[i]]);
    const growth = avgOfPresent([earningsGrowthZ[i], revenueGrowthZ[i]]);
    const momentum = avgOfPresent([return6MZ[i], return12MZ[i]]);
    const quality = avgOfPresent([roeZ[i], netMarginZ[i], opMarginZ[i]]);
    const volatility = volZ[i];
    const size = sizeZ[i];

    const dataComplete =
      b.fundamentals !== null &&
      value !== null &&
      growth !== null &&
      momentum !== null &&
      quality !== null &&
      volatility !== null &&
      size !== null;

    return {
      ticker: b.ticker,
      value,
      growth,
      momentum,
      quality,
      volatility,
      size,
      rawInputs: {
        ...(b.fundamentals ?? {
          peRatio: null,
          pegRatio: null,
          priceToBookRatio: null,
          evToEBITDA: null,
          returnOnEquityTTM: null,
          profitMargin: null,
          operatingMarginTTM: null,
          quarterlyEarningsGrowthYOY: null,
          quarterlyRevenueGrowthYOY: null,
          marketCapitalization: null,
        }),
        return6M: b.return6M,
        return12M: b.return12M,
        realizedVol90D: b.realizedVol90D,
      },
      dataComplete,
    };
  });
}

/** Persists computed factor scores into FactorExposure, upserting on (ticker, asOfDate). */
export async function persistFactorScores(scores: FactorScores[], asOfDate: Date): Promise<void> {
  for (const s of scores) {
    await prisma.factorExposure.upsert({
      where: { ticker_asOfDate: { ticker: s.ticker, asOfDate } },
      update: {
        value: s.value,
        growth: s.growth,
        momentum: s.momentum,
        quality: s.quality,
        volatility: s.volatility,
        size: s.size,
        rawInputs: s.rawInputs as unknown as Prisma.InputJsonValue,
        dataComplete: s.dataComplete,
      },
      create: {
        ticker: s.ticker,
        asOfDate,
        value: s.value,
        growth: s.growth,
        momentum: s.momentum,
        quality: s.quality,
        volatility: s.volatility,
        size: s.size,
        rawInputs: s.rawInputs as unknown as Prisma.InputJsonValue,
        dataComplete: s.dataComplete,
      },
    });
  }
}

/**
 * End-to-end: fetch fundamentals (sequentially rate-limited), compute cross-sectional
 * scores, persist, and return. Used by both the /factors route and the /run route.
 */
export async function recomputeFactorExposures(
  tickers: string[],
  asOfDate: Date = new Date()
): Promise<FactorScores[]> {
  const fundamentalsList = await sequential(
    tickers.map((ticker) => async () => {
      try {
        return await fetchRawFundamentals(ticker);
      } catch (err) {
        console.warn(`fetchRawFundamentals(${ticker}) failed:`, err);
        return null;
      }
    }),
    550,
    8000
  );

  const fundamentalsByTicker = new Map<string, RawFundamentals | null>();
  tickers.forEach((t, i) => fundamentalsByTicker.set(t, fundamentalsList[i]));

  const scores = await computeFactorScores(tickers, fundamentalsByTicker, asOfDate);
  await persistFactorScores(scores, asOfDate);
  return scores;
}
