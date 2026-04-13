/**
 * lib/macro-engine/features/factors/earnings.ts
 *
 * Compute earnings revision factor (point-in-time).
 * Uses quarterly EPS estimates stored via Alpha Vantage proxy-stock mapping.
 *
 * Signal: EPS estimate level z-scored over rolling 60-month window.
 * We use the estimatedEpsAvg as a proxy for earnings momentum:
 *   - Rising estimates = positive earnings revision = bullish signal
 *   - Falling estimates = negative earnings revision = bearish
 *
 * Data: proxy stocks (AAPL for SPY/XLK, JPM for XLF, etc.) — quarterly
 */
import { subMonths } from 'date-fns';
import { getRevisions } from '../../query';
import { rollingZScore, MONTHLY_WINDOW } from '../z-scores';

export async function computeEarningsFactor(
  asOfDate: Date,
  ticker: string
): Promise<{ value: number | null; sourceMaxDate: Date | null }> {
  // Fetch all revision rows up to asOfDate (point-in-time: only what was known then)
  const rows = await getRevisions(ticker, asOfDate);

  if (rows.length < 4) return { value: null, sourceMaxDate: null };

  // Filter to rows within a 65-month lookback window
  const windowStart = subMonths(asOfDate, 65);
  const inWindow = rows.filter(r => r.date >= windowStart && r.estimatedEpsAvg !== null);

  if (inWindow.length < 4) return { value: null, sourceMaxDate: null };

  // Build a time series of EPS estimates for z-scoring
  const series = inWindow.map(r => ({
    date: r.date,
    value: r.estimatedEpsAvg as number,
  })).sort((a, b) => a.date.getTime() - b.date.getTime());

  const sourceMaxDate = series[series.length - 1].date;
  const value = rollingZScore(series, MONTHLY_WINDOW, asOfDate);

  return { value, sourceMaxDate };
}
