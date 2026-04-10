/**
 * lib/macro-engine/features/factors/flows-regime.ts
 *
 * FEAT-05 factor adapter: flows regime signal from stored OHLCV.
 * Replicates the scoring logic from app/api/dashboard/flows/route.ts using
 * stored ohlcv_daily data — never calls Alpha Vantage live.
 *
 * Signal: 5 sub-scores (0–3 each), summed and normalized to [0, 1].
 * High score = risk-on regime; low score = stress / risk-off.
 */

import { subDays } from 'date-fns';
import { getOhlcv } from '../../query';
import type { OhlcvDailyRow } from '../../types';

/** VIXY (VIX short-term futures) launched 2011-01-03. Use VXX as proxy before that. */
const VIXY_INCEPTION = new Date('2011-01-03');

/** Tickers used in the risk-on score (excluding VIX proxy which is date-dependent) */
const RISK_TICKERS = ['SOXX', 'IGV', 'XLY', 'XLP', 'HYG', 'SPY'] as const;

/**
 * Compute the 5-day return (%) for a series up to asOfDate.
 * Requires at least 6 data points (current + 5 prior).
 */
function fiveDay(rows: OhlcvDailyRow[], asOfDate: Date): number | null {
  const sorted = rows
    .filter(r => r.date <= asOfDate)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  if (sorted.length < 6) return null;
  const recent = sorted[0].adjClose;
  const prior = sorted[5].adjClose;
  if (prior === 0) return null;
  return (recent / prior - 1) * 100;
}

/**
 * Score a signal (0–3) based on direction and thresholds.
 * direction='down_good': falling values are risk-on (e.g. VIX)
 * direction='up_good': rising values are risk-on (e.g. credit spreads, cyclicals)
 * thresholds: [lo, mid, hi] — val >= hi → 3, >= mid → 2, >= lo → 1, else 0
 */
function scoreSignal(
  ret: number | null,
  direction: 'up_good' | 'down_good',
  thresholds: [number, number, number]
): number | null {
  if (ret === null) return null;
  const [lo, mid, hi] = thresholds;
  const val = direction === 'down_good' ? -ret : ret;
  if (val >= hi) return 3;
  if (val >= mid) return 2;
  if (val >= lo) return 1;
  return 0;
}

/**
 * Compute the flows regime score for the given date using stored OHLCV data.
 *
 * Returns:
 *   value: normalized risk-on score in [0, 1], or null if fewer than 3 of 5 signals have data
 *   sourceMaxDate: latest OHLCV row date across all tickers used
 *
 * Signal definitions (mirrors buildRegime() in app/api/dashboard/flows/route.ts):
 *   1. VIXY/VXX 5-day return (inverted — falling VIX = risk-on)
 *   2. Semis vs Software spread: SOXX 5D − IGV 5D (semis leading = risk-on)
 *   3. Cyclicals vs Defensives spread: XLY 5D − XLP 5D (cyclicals leading = risk-on)
 *   4. HYG credit 5-day return (spreads tightening = risk-on)
 *   5. SPY momentum: 5-day return (price above recent trend = risk-on)
 */
export async function computeFlowsRegimeScore(
  asOfDate: Date
): Promise<{ value: number | null; sourceMaxDate: Date | null }> {
  // 30-day lookback window provides enough data for 5-day return + some buffer
  const windowStart = subDays(asOfDate, 30);
  const vixTicker = asOfDate >= VIXY_INCEPTION ? 'VIXY' : 'VXX';

  const allTickers = [vixTicker, ...RISK_TICKERS];
  const seriesMap: Record<string, OhlcvDailyRow[]> = {};
  let sourceMaxDate: Date | null = null;

  const allRows = await Promise.all(allTickers.map(t => getOhlcv(t, windowStart, asOfDate)));
  for (let i = 0; i < allTickers.length; i++) {
    seriesMap[allTickers[i]] = allRows[i];
    for (const r of allRows[i]) {
      if (!sourceMaxDate || r.date > sourceMaxDate) sourceMaxDate = r.date;
    }
  }

  // Individual 5-day returns
  const vixRet = fiveDay(seriesMap[vixTicker], asOfDate);
  const semiRet = fiveDay(seriesMap['SOXX'], asOfDate);
  const softRet = fiveDay(seriesMap['IGV'], asOfDate);
  const cyclRet = fiveDay(seriesMap['XLY'], asOfDate);
  const defRet = fiveDay(seriesMap['XLP'], asOfDate);
  const hygRet = fiveDay(seriesMap['HYG'], asOfDate);
  const spyRet = fiveDay(seriesMap['SPY'], asOfDate);

  // Spread signals
  const semiSpread = semiRet !== null && softRet !== null ? semiRet - softRet : null;
  const cyclSpread = cyclRet !== null && defRet !== null ? cyclRet - defRet : null;

  // Score each signal (0–3 per signal, null if data unavailable)
  // Thresholds calibrated to match the live route's scoring logic:
  //   VIXY: +5%/+15%/beyond = stress scores 1/2/3 in live route → inverted here: -5/-5/-10 thresholds for risk-on
  //   Semis spread: >1.5% = semis leading in live route → 0/1/2 thresholds here
  //   Cyclicals spread: >1% = cyclicals leading in live route → 0/0.5/1.5 thresholds here
  //   HYG: >0.5% = spreads tightening in live route → 0/0.3/0.8 thresholds here
  //   SPY: momentum proxy → 0/0.5/1.5 thresholds
  const rawScores = [
    scoreSignal(vixRet, 'down_good', [-2, -5, -10]),    // VIXY: falling vol = risk-on
    scoreSignal(semiSpread, 'up_good', [0, 1, 2]),       // Semis vs Software
    scoreSignal(cyclSpread, 'up_good', [0, 0.5, 1.5]),  // Cyclicals vs Defensives
    scoreSignal(hygRet, 'up_good', [0, 0.3, 0.8]),       // HYG credit
    scoreSignal(spyRet, 'up_good', [0, 0.5, 1.5]),       // SPY momentum
  ];

  const scores = rawScores.filter((s): s is number => s !== null);

  // Require at least 3 of 5 signals to have data
  if (scores.length < 3) {
    return { value: null, sourceMaxDate };
  }

  const total = scores.reduce((a, b) => a + b, 0);
  const maxPossible = scores.length * 3;

  return { value: total / maxPossible, sourceMaxDate };
}
