import { z } from 'zod';

// Shared row types for macro-engine provider adapters

export interface MacroSeriesVintageRow {
  seriesId: string;
  observationDate: Date;
  realtimeStart: Date;
  realtimeEnd: Date;
  value: number;
}

export interface OhlcvDailyRow {
  ticker: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: bigint;
  dividendAmt: number;
  splitCoeff: number;
}

export interface EarningsRevisionRow {
  symbol: string;
  date: Date;
  estimatedEpsLow: number | null;
  estimatedEpsHigh: number | null;
  estimatedEpsAvg: number | null;
  estimatedRevAvg: number | null;
  numAnalystsEps: number | null;
}

export interface OecdCliRow {
  country: string;
  period: Date;
  cliValue: number;
  seriesId: string;
}

// ─── Universe Config ──────────────────────────────────────────────────────────

export const UniverseEntrySchema = z.object({
  ticker:        z.string().min(1),
  name:          z.string().min(1),
  type:          z.enum(['etf', 'equity']),
  sector:        z.string().nullable(),           // null for country ETFs
  country:       z.string().length(2).nullable(), // ISO2, null for sector ETFs
  inceptionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  proxySeries:   z.string().nullable(),           // AV ticker or FRED series ID
  currency:      z.string().length(3),            // "USD"
  exchange:      z.string().min(1),               // "NYSE", "NASDAQ"
});

export const UniverseConfigSchema = z.object({
  universe: z.array(UniverseEntrySchema).min(1),
});

export type UniverseEntry = z.infer<typeof UniverseEntrySchema>;
export type UniverseConfig = z.infer<typeof UniverseConfigSchema>;

// ─── Feature Engineering Types (Phase 2) ─────────────────────────────────────

/**
 * One row of the factor feature matrix for a single (asOfDate, ticker) pair.
 * All z-score and rank fields are nullable — null means insufficient data at that date.
 * sourceDataMaxDates is used by the look-ahead bias test (FEAT-04): the test asserts
 * that every date in this map is <= featureDate.
 */
export interface FeatureRow {
  featureDate: Date;
  ticker: string;
  countryCode: string | null;        // ISO2, null for sector ETFs

  // Point-in-time z-scores (rolling window, anchored to featureDate)
  zGrowth: number | null;            // INDPRO/OECD CLI MoM z-score
  zInflation: number | null;         // CPI YoY z-score
  zMonetary: number | null;          // Avg(FEDFUNDS z-score, T10Y2Y z-score)
  zCredit: number | null;            // BAMLH0A0HYM2 OAS z-score
  zCarry: number | null;             // Rate differential z-score (null for sectors)
  zEarnings: number | null;          // EPS revision momentum z-score

  // Cross-sectional percentile ranks (0–1 within universe at featureDate)
  rankGrowth: number | null;
  rankInflation: number | null;
  rankMonetary: number | null;
  rankCredit: number | null;
  rankCarry: number | null;
  rankEarnings: number | null;

  // Inputs from existing pipelines (FEAT-05)
  countryHealthScore: number | null;   // composite pillar score 0–1 (null for sectors)
  flowsRegimeScore: number | null;     // normalized flows regime signal 0–1
  countryHealthVintage: string | null; // World Bank year used (e.g. "2023")

  // Metadata
  dataAsOf: Date;  // when the source data was current (= featureDate)

  /**
   * Map of factor name → latest source data date used to compute that factor.
   * Used structurally by the look-ahead bias test.
   * NOT persisted to DB — computed in memory only.
   * Example: { growth: new Date('2010-01-15'), credit: new Date('2010-01-14') }
   */
  sourceDataMaxDates: Record<string, Date>;
}

/**
 * FeatureRow as stored in the DB (sourceDataMaxDates stripped — not a DB column).
 */
export type FeatureMatrixRow = Omit<FeatureRow, 'sourceDataMaxDates'> & {
  builtAt: Date;
};
