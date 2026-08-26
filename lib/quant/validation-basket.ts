// Diverse validation/evidence basket — see plan Section 5a.
//
// A standalone list of ~30 real, large, liquid, long-listed MSCI World constituents
// spanning multiple regions (US, Europe, Japan, other developed Asia-Pacific) and
// multiple GICS sectors. This is NOT part of the fund's real portfolio (no Holding rows
// are created for these) — it exists purely to:
//   1. Sanity-check the optimizer/factor/stress-test pipeline before running it against
//      the fund's smaller, less diverse ~15-30 real holdings (build-time QA, one-time).
//   2. Supply diversified-sample backtest/stress-test evidence for the research report,
//      distinct from (and clearly labeled apart from) the fund's own live portfolio
//      numbers.
//
// Names were chosen for: (a) genuine sector/region diversity, (b) large-cap liquidity,
// and (c) a long enough listing history that 2008/2020/2022 stress-test windows have
// real price data available (all names here have traded continuously since well before
// 2008, with the partial exception of a few that IPO'd or spun off later — those are
// excluded from stress windows they don't cover, per the "N of M holdings covered"
// footnote rule in lib/quant/stress-test.ts, never backfilled with fabricated data).
//
// Tickers are US-listed ADRs/ordinary shares where available (so Polygon/Alpha Vantage
// US-market data covers them cleanly) even for non-US-domiciled companies — this is a
// pragmatic data-availability choice for this basket, not a claim that ADR pricing
// perfectly replicates the local-listing return series.

export interface ValidationBasketEntry {
  ticker: string;
  name: string;
  region: 'US' | 'Europe' | 'Japan' | 'APAC_Other';
  sector: string; // GICS sector
  notes?: string;
}

export const VALIDATION_BASKET: ValidationBasketEntry[] = [
  // ── United States ──────────────────────────────────────────────────────────
  { ticker: 'MSFT', name: 'Microsoft Corp', region: 'US', sector: 'Information Technology' },
  { ticker: 'AAPL', name: 'Apple Inc', region: 'US', sector: 'Information Technology' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', region: 'US', sector: 'Health Care' },
  { ticker: 'PG', name: 'Procter & Gamble', region: 'US', sector: 'Consumer Staples' },
  { ticker: 'KO', name: 'Coca-Cola Co', region: 'US', sector: 'Consumer Staples' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co', region: 'US', sector: 'Financials' },
  { ticker: 'XOM', name: 'Exxon Mobil Corp', region: 'US', sector: 'Energy' },
  { ticker: 'NEE', name: 'NextEra Energy', region: 'US', sector: 'Utilities' },
  { ticker: 'HD', name: 'Home Depot Inc', region: 'US', sector: 'Consumer Discretionary' },
  { ticker: 'CAT', name: 'Caterpillar Inc', region: 'US', sector: 'Industrials' },
  { ticker: 'LIN', name: 'Linde plc', region: 'US', sector: 'Materials' },
  { ticker: 'VZ', name: 'Verizon Communications', region: 'US', sector: 'Communication Services' },

  // ── Europe ──────────────────────────────────────────────────────────────────
  { ticker: 'NVS', name: 'Novartis AG (ADR)', region: 'Europe', sector: 'Health Care' },
  { ticker: 'NSRGY', name: 'Nestle SA (ADR)', region: 'Europe', sector: 'Consumer Staples' },
  { ticker: 'ASML', name: 'ASML Holding NV (ADR)', region: 'Europe', sector: 'Information Technology' },
  { ticker: 'SAP', name: 'SAP SE (ADR)', region: 'Europe', sector: 'Information Technology' },
  { ticker: 'HSBC', name: 'HSBC Holdings plc (ADR)', region: 'Europe', sector: 'Financials' },
  { ticker: 'SHEL', name: 'Shell plc (ADR)', region: 'Europe', sector: 'Energy' },
  { ticker: 'UL', name: 'Unilever plc (ADR)', region: 'Europe', sector: 'Consumer Staples' },
  { ticker: 'SNY', name: 'Sanofi (ADR)', region: 'Europe', sector: 'Health Care' },
  { ticker: 'TTE', name: 'TotalEnergies SE (ADR)', region: 'Europe', sector: 'Energy' },
  { ticker: 'SIEGY', name: 'Siemens AG (ADR)', region: 'Europe', sector: 'Industrials' },

  // ── Japan ───────────────────────────────────────────────────────────────────
  { ticker: 'TM', name: 'Toyota Motor Corp (ADR)', region: 'Japan', sector: 'Consumer Discretionary' },
  { ticker: 'SONY', name: 'Sony Group Corp (ADR)', region: 'Japan', sector: 'Consumer Discretionary' },
  { ticker: 'MUFG', name: 'Mitsubishi UFJ Financial Group (ADR)', region: 'Japan', sector: 'Financials' },
  { ticker: 'TAK', name: 'Takeda Pharmaceutical Co (ADR)', region: 'Japan', sector: 'Health Care' },
  { ticker: 'HMC', name: 'Honda Motor Co (ADR)', region: 'Japan', sector: 'Consumer Discretionary' },

  // ── Other developed Asia-Pacific (Australia, Hong Kong, Singapore) ──────────
  { ticker: 'BHP', name: 'BHP Group Ltd (ADR)', region: 'APAC_Other', sector: 'Materials' },
  { ticker: 'WBK', name: 'Westpac Banking Corp (ADR)', region: 'APAC_Other', sector: 'Financials' },
  { ticker: 'AIQUY', name: 'Australia and New Zealand Banking Group (ADR)', region: 'APAC_Other', sector: 'Financials', notes: 'Thinly traded ADR — may need Alpha Vantage fallback more often than Polygon primary.' },
  { ticker: 'SGAPY', name: 'Singapore Telecommunications (ADR)', region: 'APAC_Other', sector: 'Communication Services', notes: 'Thinly traded ADR — included for region/sector diversity; expect lower data completeness.' },
];

export const VALIDATION_BASKET_TICKERS = VALIDATION_BASKET.map((e) => e.ticker);

export function getValidationBasketEntry(ticker: string): ValidationBasketEntry | undefined {
  return VALIDATION_BASKET.find((e) => e.ticker === ticker);
}

/** Same baseline constraint philosophy as the fund's real "Late-Cycle Defensive Baseline"
 * constraint set (see scripts/seed-cvar-constraint-set.js), but with wider bands — this
 * basket is ~30 names across 4 regions and ~10 sectors, versus the fund's own ~15-30
 * concentrated names, so proportionally tighter bands would be far more likely to bind
 * or go infeasible purely from basket composition rather than from the regime thesis
 * itself. Used only for the one-time build-validation pass and report evidence — never
 * persisted as an OptimizationConstraintSet row (validation-basket runs are ad hoc script
 * runs, not exposed in the tool page UI).
 */
export const VALIDATION_BASKET_CONSTRAINT_SET = {
  name: 'Validation Basket — Late-Cycle Defensive (illustrative)',
  sectorLimits: {
    'Information Technology': { min: 0, max: 0.25 },
    'Health Care': { min: 0.1, max: 0.3 },
    'Consumer Staples': { min: 0.1, max: 0.3 },
    'Utilities': { min: 0, max: 0.15 },
    'Financials': { min: 0, max: 0.25 },
    'Energy': { min: 0, max: 0.15 },
    'Industrials': { min: 0, max: 0.2 },
    'Materials': { min: 0, max: 0.15 },
    'Consumer Discretionary': { min: 0, max: 0.2 },
    'Communication Services': { min: 0, max: 0.15 },
  } as Record<string, { min: number; max: number }>,
  regionLimits: {
    US: { min: 0.5, max: 0.65 },
    Europe: { min: 0.15, max: 0.35 },
    Japan: { min: 0.05, max: 0.25 },
    APAC_Other: { min: 0, max: 0.2 },
  } as Record<string, { min: number; max: number }>,
  factorTilts: {
    quality: { target: 0.1 },
    volatility: { target: 0.1 },
  } as Record<string, { target: number }>,
  maxSinglePositionWeight: 0.12,
  turnoverLimit: null as number | null,
  cvarConfidence: 0.95,
  cvarHorizonDays: 20,
};
