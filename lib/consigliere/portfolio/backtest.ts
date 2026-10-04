import { TRADING_DAYS, effectiveN, performanceStats, type Matrix } from './risk';
import type { ReturnsFrame } from './data';

export type RebalanceFreq = 'W' | 'M' | 'Q';

/** (trailing returns window, previous target or null) -> new target weights aligned with frame.tickers. */
export type WeightFn = (window: ReturnsFrame, previous: number[] | null) => number[];

function periodKey(date: string, freq: RebalanceFreq): string {
  if (freq === 'M') return date.slice(0, 7);
  if (freq === 'Q') return `${date.slice(0, 4)}-Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`;
  // pandas 'W' periods run Monday–Sunday; key each date by its week's Monday.
  const d = new Date(`${date}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

/** Last trading day of each period. */
export function rebalanceDates(dates: string[], freq: RebalanceFreq): Set<string> {
  const last = new Map<string, string>();
  for (const d of dates) last.set(periodKey(d, freq), d);
  return new Set(last.values());
}

export interface BacktestSummary {
  annual_return: number;
  annual_volatility: number;
  sharpe_rf0: number;
  sortino_rf0: number;
  max_drawdown: number;
  cvar_95_daily: number;
  annual_turnover: number;
  avg_effective_n: number;
  max_weight_seen: number;
}

/**
 * Targets use only data up to and including each rebalance date and take effect the next
 * trading day (no look-ahead). Costs are cost_bps per unit of turnover, deducted on the first
 * day after the trade. The initial build from cash is not charged, so methods compare fairly.
 */
export function walkForward(
  frame: ReturnsFrame,
  weightFn: WeightFn,
  lookback = 252,
  freq: RebalanceFreq = 'M',
  costBps = 10
): BacktestSummary {
  const { dates, values } = frame;
  if (dates.length <= lookback + 1) {
    throw new Error(`Need more than ${lookback + 1} days of returns; got ${dates.length}.`);
  }
  const rebal = rebalanceDates(dates.slice(lookback - 1), freq);
  const n = frame.tickers.length;

  let w = new Array(n).fill(0);
  let target: number[] | null = null;
  let pendingCost = 0;
  const out: number[] = [];
  const weightHistory: Matrix = [];
  const turnovers: number[] = [];

  for (let i = lookback - 1; i < dates.length; i += 1) {
    if (i > lookback - 1 && target) {
      const r = values[i];
      const port = w.reduce((s, x, j) => s + x * r[j], 0);
      out.push(port - pendingCost);
      pendingCost = 0;
      w = w.map((x, j) => (x * (1 + r[j])) / (1 + port));
    }
    if (rebal.has(dates[i]) && i < dates.length - 1) {
      const window: ReturnsFrame = {
        tickers: frame.tickers,
        dates: dates.slice(i - lookback + 1, i + 1),
        values: values.slice(i - lookback + 1, i + 1),
      };
      target = weightFn(window, target);
      const turnover = w.some((x) => x !== 0) ? target.reduce((s, x, j) => s + Math.abs(x - w[j]), 0) : 0;
      pendingCost = (turnover * costBps) / 1e4;
      w = [...target];
      weightHistory.push([...target]);
      turnovers.push(turnover);
    }
  }

  const stats = performanceStats(out);
  const years = out.length / TRADING_DAYS;
  return {
    ...stats,
    annual_turnover: years > 0 ? turnovers.reduce((a, b) => a + b, 0) / years : 0,
    avg_effective_n: weightHistory.reduce((s, wt) => s + effectiveN(wt), 0) / weightHistory.length,
    max_weight_seen: Math.max(...weightHistory.flat()),
  };
}
