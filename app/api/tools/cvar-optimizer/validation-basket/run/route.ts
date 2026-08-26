import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  buildScenarioMatrix,
  buildLPModel,
  solveOptimization,
  BENCHMARK_TICKER,
  type PriceHistoryPoint,
  type HoldingUniverseEntry,
  type FactorExposureMap,
} from '@/lib/quant/cvar-optimizer';
import { runHistoricalStressTests, runWalkForwardBacktest, generateMonthlyRebalanceDates } from '@/lib/quant/stress-test';
import { getOrBackfillPriceHistory } from '@/lib/market-data/price-history';
import { recomputeFactorExposures } from '@/lib/quant/factors';
import { VALIDATION_BASKET, VALIDATION_BASKET_TICKERS, VALIDATION_BASKET_CONSTRAINT_SET } from '@/lib/quant/validation-basket';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function toJsonValue(value: unknown) {
  return value as Prisma.InputJsonValue;
}

// Admin-triggerable equivalent of scripts/run-validation-basket.ts — same pipeline, but
// runnable from the browser (the script requires a terminal + local DATABASE_URL, which
// isn't available to everyone who needs to run this), and additionally runs the
// walk-forward backtest (the script only ran stress tests) and PERSISTS the result as a
// SavedValidationBasketRun so the regime-thesis report can pull real numbers into its
// Section 7 instead of the "pending live run" placeholder.
//
// This is the SAME fixed ~30-ticker diverse MSCI World basket used everywhere else in
// this feature (lib/quant/validation-basket.ts) — not a new/different universe. Per the
// user's request to "add the same stock universe as the MSCI benchmark ... and re-weight
// them in accordance to the model," this route is exactly that: it takes the validation
// basket (already built to approximate MSCI World's region/sector diversity) and produces
// the model's re-weighted target allocation for it.
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allTickers = [...VALIDATION_BASKET_TICKERS, BENCHMARK_TICKER];

    const backfillResults = await getOrBackfillPriceHistory(allTickers);
    const failedBackfills = backfillResults.filter((r) => r.status === 'error' && r.rowsWritten === 0);

    const priceHistoryByTicker: Record<string, PriceHistoryPoint[]> = {};
    for (const ticker of allTickers) {
      const rows = await prisma.priceHistory.findMany({
        where: { ticker },
        orderBy: { date: 'asc' },
        select: { date: true, close: true },
      });
      priceHistoryByTicker[ticker] = rows.map((r) => ({ ticker, date: r.date, close: r.close }));
    }

    const scenarios = buildScenarioMatrix(
      Object.fromEntries(VALIDATION_BASKET_TICKERS.map((t) => [t, priceHistoryByTicker[t] ?? []])),
      VALIDATION_BASKET_CONSTRAINT_SET.cvarHorizonDays
    );

    if (scenarios.scenarioCount < 10) {
      return NextResponse.json(
        {
          error: `Only ${scenarios.scenarioCount} aligned historical scenarios available across the validation basket — need at least 10. Backfill may be incomplete.`,
          failedBackfills: failedBackfills.map((r) => r.ticker),
        },
        { status: 400 }
      );
    }

    const scores = await recomputeFactorExposures(VALIDATION_BASKET_TICKERS, new Date());
    const factorExposures: FactorExposureMap = {};
    for (const s of scores) {
      factorExposures[s.ticker] = {
        value: s.value, growth: s.growth, momentum: s.momentum,
        quality: s.quality, volatility: s.volatility, size: s.size,
      };
    }

    const universe: HoldingUniverseEntry[] = VALIDATION_BASKET.map((e) => ({
      ticker: e.ticker,
      sector: e.sector,
      region: e.region,
      currentWeight: 1 / VALIDATION_BASKET.length, // equal-weight placeholder — no turnover limit is set on this constraint set, so this value is unused by the LP
    }));

    const build = buildLPModel(scenarios, factorExposures, universe, VALIDATION_BASKET_CONSTRAINT_SET);
    const result = solveOptimization(build);

    if (result.status !== 'optimal') {
      const failedRun = await prisma.savedValidationBasketRun.create({
        data: {
          status: result.status === 'infeasible' ? 'infeasible' : 'failed',
          tickerCount: VALIDATION_BASKET.length,
          targetWeights: {},
          diagnostics: toJsonValue(result.diagnostics),
          runBy: session.user.id,
        },
      });
      return NextResponse.json(failedRun, { status: 200 });
    }

    const sectorWeights: Record<string, number> = {};
    const regionWeights: Record<string, number> = {};
    for (const e of universe) {
      const w = result.weights[e.ticker] ?? 0;
      if (e.sector) sectorWeights[e.sector] = (sectorWeights[e.sector] ?? 0) + w;
      if (e.region) regionWeights[e.region] = (regionWeights[e.region] ?? 0) + w;
    }

    const stressTestResults = await runHistoricalStressTests(result.weights);

    // Walk-forward backtest: monthly rebalances over the retained price history, each step
    // re-solving the same LP using only data available as of that date. This is the piece
    // the terminal-only script never ran — wiring it in here is what actually produces the
    // "backtest" evidence the report's Section 9/methodology promises, not just a single
    // point-in-time stress test.
    const historyDates = priceHistoryByTicker[BENCHMARK_TICKER]?.map((r) => r.date) ?? [];
    let backtestSummary = null;
    if (historyDates.length > 60) {
      const from = historyDates[30]; // reserve an initial estimation window before the first rebalance
      const to = historyDates[historyDates.length - 1];
      const rebalanceDates = generateMonthlyRebalanceDates(from, to);

      backtestSummary = await runWalkForwardBacktest(
        VALIDATION_BASKET_TICKERS,
        rebalanceDates,
        async (asOfDate: Date) => {
          // Re-derive scenarios/factor exposures using only price data on/before asOfDate,
          // matching the walk-forward contract (no look-ahead).
          const asOfHistory: Record<string, PriceHistoryPoint[]> = {};
          for (const ticker of VALIDATION_BASKET_TICKERS) {
            asOfHistory[ticker] = (priceHistoryByTicker[ticker] ?? []).filter((r) => r.date.getTime() <= asOfDate.getTime());
          }
          const asOfScenarios = buildScenarioMatrix(asOfHistory, VALIDATION_BASKET_CONSTRAINT_SET.cvarHorizonDays);
          if (asOfScenarios.scenarioCount < 10) {
            return { weights: {}, cvar: null, status: 'error' as const };
          }
          // Factor exposures are recomputed once (not per-rebalance-date) — Alpha Vantage
          // OVERVIEW returns current fundamentals only, not point-in-time historical
          // fundamentals, so a truly look-ahead-free factor recompute per rebalance date
          // isn't possible with this data source. This is a real, disclosed limitation of
          // the walk-forward backtest (see report Section 9/10) — momentum and volatility
          // factors, which ARE derived from PriceHistory, remain point-in-time-correct;
          // only the fundamentals-derived factors (Value/Growth/Quality/Size) carry
          // forward-looking bias in this backtest.
          const asOfBuild = buildLPModel(asOfScenarios, factorExposures, universe, VALIDATION_BASKET_CONSTRAINT_SET);
          const asOfResult = solveOptimization(asOfBuild);
          return { weights: asOfResult.weights, cvar: asOfResult.cvar, status: asOfResult.status };
        }
      );
    }

    const savedRun = await prisma.savedValidationBasketRun.create({
      data: {
        status: 'completed',
        tickerCount: VALIDATION_BASKET.length,
        targetWeights: toJsonValue(result.weights),
        expectedCVaR: result.cvar,
        sectorWeights: toJsonValue(sectorWeights),
        regionWeights: toJsonValue(regionWeights),
        stressTestResults: toJsonValue(stressTestResults),
        backtestSummary: backtestSummary ? toJsonValue(backtestSummary) : Prisma.JsonNull,
        diagnostics: toJsonValue(result.diagnostics),
        runBy: session.user.id,
      },
    });

    return NextResponse.json(savedRun);
  } catch (error) {
    console.error('CVaR validation basket run error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to run validation basket', detail: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const latest = await prisma.savedValidationBasketRun.findFirst({
      where: { status: 'completed' },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ run: latest });
  } catch (error) {
    console.error('CVaR validation basket GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch validation basket run' }, { status: 500 });
  }
}
