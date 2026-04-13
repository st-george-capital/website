// lib/macro-engine/backtest/returns.ts
// Forward return computation from OhlcvDaily.adjClose.
// Skips (ticker, date) pairs where forward price is missing — never zero-fills.

import { prisma } from '../db';
import { addDays } from 'date-fns';

const FORWARD_DAYS = 63; // ~3 trading months — longer horizon reduces noise in regime-conditional returns
const BUFFER_DAYS  = 10; // extra buffer for weekends/holidays when fetching

export interface ForwardReturn {
  ticker:      string;
  featureDate: Date;
  fwdReturn:   number; // (adjClose[date+~21] / adjClose[date]) - 1
}

/**
 * Computes ~63-trading-day (3-month) forward returns for all tickers in a date range.
 * Returns only observations where both base price and forward price exist.
 * IMPORTANT: always uses adjClose — never close — for split/dividend accuracy.
 */
export async function computeForwardReturns(
  tickers: string[],
  startDate: Date,
  endDate: Date,
): Promise<ForwardReturn[]> {
  if (tickers.length === 0) return [];

  // Fetch prices for [startDate, endDate + buffer]
  // Paginate by ticker (one at a time) to stay under Accelerate's 5MB response limit.
  // A single ticker over a 10+ year window is ~2.5k rows (~200KB), well within limits.
  const fetchEnd = addDays(endDate, FORWARD_DAYS + BUFFER_DAYS);

  const priceMap = new Map<string, { date: Date; adjClose: number }[]>();
  for (const ticker of tickers) {
    const rows = await prisma.$queryRaw<{ ticker: string; date: Date; adjClose: number }[]>`
      SELECT ticker, date, "adjClose"
      FROM ohlcv_daily
      WHERE ticker = ${ticker}
        AND date >= ${startDate}
        AND date <= ${fetchEnd}
      ORDER BY date ASC
    `;
    if (rows.length > 0) {
      priceMap.set(ticker, rows.map(r => ({ date: r.date, adjClose: r.adjClose })));
    }
  }

  const results: ForwardReturn[] = [];
  let skipped = 0;

  for (const [ticker, prices] of priceMap) {
    for (let i = 0; i < prices.length; i++) {
      const base = prices[i];
      // Only process dates within [startDate, endDate]
      if (base.date < startDate || base.date > endDate) continue;

      // Find nearest trading day approximately FORWARD_DAYS after base.date
      const targetDate = addDays(base.date, FORWARD_DAYS);
      // Find the closest price on or after targetDate (within BUFFER_DAYS)
      const fwdPrice = prices.find(
        p => p.date >= targetDate && p.date <= addDays(targetDate, BUFFER_DAYS)
      );

      if (!fwdPrice) {
        skipped++;
        continue; // skip — do not impute zero
      }

      const fwdReturn = fwdPrice.adjClose / base.adjClose - 1;
      results.push({ ticker, featureDate: base.date, fwdReturn });
    }
  }

  if (skipped > 0) {
    console.log(`computeForwardReturns: skipped ${skipped} observations with missing forward price`);
  }

  return results;
}
