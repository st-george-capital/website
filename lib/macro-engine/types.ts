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
