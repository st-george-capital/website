// Stress testing & backtesting for the CVaR optimizer — see plan Section 7.
//
// Two distinct analyses:
//   1. Historical scenario stress tests: fixed target weights held over known crisis
//      windows (2008 GFC, 2020 COVID crash, 2022 rate-hike drawdown), realized return
//      vs. URTH.
//   2. Walk-forward backtest: rolling re-optimization using only data available as of
//      each rebalance date, holding weights until the next rebalance, comparing realized
//      return/drawdown/realized-vs-predicted CVaR against URTH.
//
// Both run offline (script/API-triggered) to produce report numbers, and are also called
// live by the tool page's Results tab against the current target weights — same lib code
// serves both, per the plan.
//
// Holdings without sufficient price history for a given stress window are EXCLUDED from
// that specific test with a visible "N of M holdings covered" footnote — never silently
// dropped from the whole run or backfilled with fabricated/synthetic data.

import { prisma } from '@/lib/prisma';
import {
  buildScenarioMatrix,
  computeCVaRForWeights,
  BENCHMARK_TICKER,
  type PriceHistoryPoint,
  type ScenarioMatrix,
} from '@/lib/quant/cvar-optimizer';

export interface HistoricalWindow {
  key: string;
  label: string;
  from: string; // ISO date
  to: string; // ISO date
  description: string;
}

// Real, checkable date ranges for each stress window. GFC and COVID ranges bracket the
// sharpest drawdown legs (not the full bear market) so the test reflects acute stress
// behavior specifically. 2022 uses the full-year rate-hike drawdown since that stress was
// a grinding repricing, not a single sharp shock.
export const STRESS_WINDOWS: HistoricalWindow[] = [
  {
    key: 'gfc_2008',
    label: '2008 Global Financial Crisis',
    from: '2008-09-01',
    to: '2008-11-30',
    description:
      'Acute phase of the GFC equity drawdown following the Lehman Brothers bankruptcy (Sep 15, 2008) through the November 2008 trough in global equities.',
  },
  {
    key: 'covid_2020',
    label: '2020 COVID-19 Crash',
    from: '2020-02-19',
    to: '2020-03-23',
    description:
      'From the pre-COVID market peak (Feb 19, 2020) through the trough of the fastest bear-market decline in modern history (Mar 23, 2020).',
  },
  {
    key: 'rate_hikes_2022',
    label: '2022 Rate-Hike Drawdown',
    from: '2022-01-03',
    to: '2022-12-30',
    description:
      'Full calendar-year 2022 drawdown driven by the fastest Fed hiking cycle since the early 1980s, repricing both equity and bond duration simultaneously.',
  },
];

export interface StressTestHoldingResult {
  ticker: string;
  covered: boolean;
  realizedReturn: number | null;
}

export interface StressTestResult {
  window: HistoricalWindow;
  portfolioReturn: number | null;
  benchmarkReturn: number | null;
  holdingsCovered: number;
  holdingsTotal: number;
  coverageNote: string;
  perHolding: StressTestHoldingResult[];
}

async function getClosesInRange(ticker: string, from: string, to: string): Promise<PriceHistoryPoint[]> {
  const rows = await prisma.priceHistory.findMany({
    where: { ticker, date: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T23:59:59Z`) } },
    orderBy: { date: 'asc' },
    select: { date: true, close: true },
  });
  return rows.map((r) => ({ ticker, date: r.date, close: r.close }));
}

/**
 * Runs the fixed target-weight portfolio through each historical stress window, computing
 * realized (not simulated) return from actual stored PriceHistory closes at window
 * endpoints. Holdings lacking coverage for a given window are excluded from that window's
 * portfolio-return computation and reported explicitly in `perHolding`/`coverageNote`.
 */
export async function runHistoricalStressTests(
  targetWeights: Record<string, number>
): Promise<StressTestResult[]> {
  const tickers = Object.keys(targetWeights);
  const results: StressTestResult[] = [];

  for (const window of STRESS_WINDOWS) {
    const perHolding: StressTestHoldingResult[] = [];
    let coveredWeightSum = 0;
    let weightedReturnSum = 0;

    for (const ticker of tickers) {
      const points = await getClosesInRange(ticker, window.from, window.to);
      if (points.length < 2) {
        perHolding.push({ ticker, covered: false, realizedReturn: null });
        continue;
      }
      const first = points[0].close;
      const last = points[points.length - 1].close;
      if (first <= 0) {
        perHolding.push({ ticker, covered: false, realizedReturn: null });
        continue;
      }
      const realizedReturn = (last - first) / first;
      perHolding.push({ ticker, covered: true, realizedReturn });
      const w = targetWeights[ticker] ?? 0;
      coveredWeightSum += w;
      weightedReturnSum += w * realizedReturn;
    }

    const portfolioReturn = coveredWeightSum > 0 ? weightedReturnSum / coveredWeightSum : null;

    const benchPoints = await getClosesInRange(BENCHMARK_TICKER, window.from, window.to);
    const benchmarkReturn =
      benchPoints.length >= 2 && benchPoints[0].close > 0
        ? (benchPoints[benchPoints.length - 1].close - benchPoints[0].close) / benchPoints[0].close
        : null;

    const holdingsCovered = perHolding.filter((h) => h.covered).length;
    const holdingsTotal = perHolding.length;

    results.push({
      window,
      portfolioReturn,
      benchmarkReturn,
      holdingsCovered,
      holdingsTotal,
      coverageNote:
        holdingsCovered === holdingsTotal
          ? `${holdingsCovered} of ${holdingsTotal} holdings covered — full coverage for this window.`
          : `${holdingsCovered} of ${holdingsTotal} holdings covered — ${holdingsTotal - holdingsCovered} lacked sufficient price history for this window (typically a later IPO/listing date) and were excluded from the portfolio-return calculation, with remaining covered holdings' weights re-normalized for this window only.`,
      perHolding,
    });
  }

  return results;
}

// ─── Walk-forward backtest ─────────────────────────────────────────────────────────────

export interface BacktestPeriodResult {
  rebalanceDate: string;
  periodEndDate: string;
  weights: Record<string, number>;
  realizedReturn: number | null;
  benchmarkReturn: number | null;
  predictedCVaR: number | null;
  status: 'optimal' | 'infeasible' | 'error' | 'skipped';
}

export interface BacktestSummary {
  periods: BacktestPeriodResult[];
  cumulativePortfolioReturn: number | null;
  cumulativeBenchmarkReturn: number | null;
  maxDrawdownPortfolio: number | null;
  maxDrawdownBenchmark: number | null;
  realizedCVaR: number | null;
  avgPredictedCVaR: number | null;
  periodsRun: number;
  periodsSkipped: number;
  sampleCaveat: string;
}

/**
 * Rolling walk-forward backtest: at each rebalance date, re-solve the optimizer using
 * only price/factor data available as of that date, hold the resulting weights until the
 * next rebalance, then measure realized return over that holding period. `reoptimizeFn`
 * is injected by the caller (run/route.ts or the validation-basket script) since it needs
 * the full universe/constraint-set context to build scenarios and call
 * buildLPModel/solveOptimization — this file stays focused on the walk-forward harness
 * and realized-return/drawdown/CVaR bookkeeping, not on re-deriving the optimizer itself.
 *
 * With 5 years of daily history this yields a short out-of-sample sample after reserving
 * an initial estimation window — stated plainly as illustrative, not statistically
 * powered (see report Section 9/10).
 */
export async function runWalkForwardBacktest(
  tickers: string[],
  rebalanceDates: Date[],
  reoptimizeFn: (asOfDate: Date) => Promise<{ weights: Record<string, number>; cvar: number | null; status: 'optimal' | 'infeasible' | 'error' }>
): Promise<BacktestSummary> {
  const periods: BacktestPeriodResult[] = [];

  const priceHistoryByTicker: Record<string, PriceHistoryPoint[]> = {};
  const allTickers = [...tickers, BENCHMARK_TICKER];
  for (const ticker of allTickers) {
    const rows = await prisma.priceHistory.findMany({
      where: { ticker },
      orderBy: { date: 'asc' },
      select: { date: true, close: true },
    });
    priceHistoryByTicker[ticker] = rows.map((r) => ({ ticker, date: r.date, close: r.close }));
  }

  const closeOnOrAfter = (ticker: string, date: Date): { date: Date; close: number } | null => {
    const rows = priceHistoryByTicker[ticker];
    const found = rows.find((r) => r.date.getTime() >= date.getTime());
    return found ? { date: found.date, close: found.close } : null;
  };
  const closeOnOrBefore = (ticker: string, date: Date): { date: Date; close: number } | null => {
    const rows = priceHistoryByTicker[ticker];
    let result: { date: Date; close: number } | null = null;
    for (const r of rows) {
      if (r.date.getTime() <= date.getTime()) result = { date: r.date, close: r.close };
      else break;
    }
    return result;
  };

  for (let i = 0; i < rebalanceDates.length; i++) {
    const rebalanceDate = rebalanceDates[i];
    const periodEnd = i + 1 < rebalanceDates.length ? rebalanceDates[i + 1] : null;

    if (!periodEnd) break; // last rebalance date has no forward period to measure yet

    let opt: { weights: Record<string, number>; cvar: number | null; status: 'optimal' | 'infeasible' | 'error' };
    try {
      opt = await reoptimizeFn(rebalanceDate);
    } catch (err) {
      console.warn(`Backtest re-optimization failed at ${rebalanceDate.toISOString()}:`, err);
      periods.push({
        rebalanceDate: rebalanceDate.toISOString(),
        periodEndDate: periodEnd.toISOString(),
        weights: {},
        realizedReturn: null,
        benchmarkReturn: null,
        predictedCVaR: null,
        status: 'error',
      });
      continue;
    }

    if (opt.status !== 'optimal') {
      periods.push({
        rebalanceDate: rebalanceDate.toISOString(),
        periodEndDate: periodEnd.toISOString(),
        weights: {},
        realizedReturn: null,
        benchmarkReturn: null,
        predictedCVaR: opt.cvar,
        status: opt.status === 'infeasible' ? 'infeasible' : 'skipped',
      });
      continue;
    }

    let realizedReturn: number | null = 0;
    let coveredWeight = 0;
    for (const ticker of tickers) {
      const w = opt.weights[ticker] ?? 0;
      if (w <= 0) continue;
      const start = closeOnOrAfter(ticker, rebalanceDate);
      const end = closeOnOrBefore(ticker, periodEnd);
      if (!start || !end || start.close <= 0 || start.date.getTime() >= end.date.getTime()) continue;
      realizedReturn += w * ((end.close - start.close) / start.close);
      coveredWeight += w;
    }
    realizedReturn = coveredWeight > 0 ? realizedReturn / coveredWeight : null;

    const benchStart = closeOnOrAfter(BENCHMARK_TICKER, rebalanceDate);
    const benchEnd = closeOnOrBefore(BENCHMARK_TICKER, periodEnd);
    const benchmarkReturn =
      benchStart && benchEnd && benchStart.close > 0
        ? (benchEnd.close - benchStart.close) / benchStart.close
        : null;

    periods.push({
      rebalanceDate: rebalanceDate.toISOString(),
      periodEndDate: periodEnd.toISOString(),
      weights: opt.weights,
      realizedReturn,
      benchmarkReturn,
      predictedCVaR: opt.cvar,
      status: 'optimal',
    });
  }

  const validPeriods = periods.filter((p) => p.status === 'optimal' && p.realizedReturn !== null);

  const cumulate = (rets: Array<number | null>): number | null => {
    const present = rets.filter((r): r is number => r !== null);
    if (present.length === 0) return null;
    return present.reduce((acc, r) => acc * (1 + r), 1) - 1;
  };
  const maxDrawdown = (rets: Array<number | null>): number | null => {
    const present = rets.filter((r): r is number => r !== null);
    if (present.length === 0) return null;
    let cum = 1;
    let peak = 1;
    let maxDD = 0;
    for (const r of present) {
      cum *= 1 + r;
      peak = Math.max(peak, cum);
      const dd = (cum - peak) / peak;
      if (dd < maxDD) maxDD = dd;
    }
    return maxDD;
  };

  const portfolioReturns = validPeriods.map((p) => p.realizedReturn);
  const benchmarkReturns = validPeriods.map((p) => p.benchmarkReturn);
  const predictedCVaRs = validPeriods.map((p) => p.predictedCVaR).filter((c): c is number => c !== null);

  // Realized CVaR: same RU tail-average definition, applied to the realized period returns
  // themselves (a coarse, small-sample realized-risk check against the pre-trade predicted
  // CVaR — explicitly a illustrative diagnostic given how few periods a 5-year daily
  // history yields at monthly/quarterly rebalance frequency, not a statistically powered
  // validation of the CVaR model).
  const losses = portfolioReturns.filter((r): r is number => r !== null).map((r) => -r).sort((a, b) => a - b);
  const tailCount = Math.max(1, Math.ceil(losses.length * 0.05));
  const realizedCVaR = losses.length > 0 ? losses.slice(losses.length - tailCount).reduce((a, b) => a + b, 0) / tailCount : null;

  return {
    periods,
    cumulativePortfolioReturn: cumulate(portfolioReturns),
    cumulativeBenchmarkReturn: cumulate(benchmarkReturns),
    maxDrawdownPortfolio: maxDrawdown(portfolioReturns),
    maxDrawdownBenchmark: maxDrawdown(benchmarkReturns),
    realizedCVaR,
    avgPredictedCVaR: predictedCVaRs.length > 0 ? predictedCVaRs.reduce((a, b) => a + b, 0) / predictedCVaRs.length : null,
    periodsRun: validPeriods.length,
    periodsSkipped: periods.length - validPeriods.length,
    sampleCaveat:
      'This backtest uses a short, few-year out-of-sample window (limited by the 5-year daily ' +
      'PriceHistory retention and the need to reserve an initial estimation period before the ' +
      'first rebalance). Results are illustrative, not statistically powered validation — a ' +
      'small number of rebalance periods cannot reliably distinguish genuine skill from noise.',
  };
}

/** Generates monthly rebalance dates between two dates (inclusive of `from`), used to
 * drive runWalkForwardBacktest. Exposed separately so callers can also do quarterly by
 * filtering every 3rd date, without duplicating date-stepping logic. */
export function generateMonthlyRebalanceDates(from: Date, to: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cursor.getTime() <= end.getTime()) {
    dates.push(new Date(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return dates;
}

export type { ScenarioMatrix };
export { buildScenarioMatrix, computeCVaRForWeights };
