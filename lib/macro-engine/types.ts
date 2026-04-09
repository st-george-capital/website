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
