import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  buildScenarioMatrix,
  buildLPModel,
  solveOptimization,
  computeCVaRForWeights,
  computeSuggestedTrades,
  BENCHMARK_TICKER,
  type PriceHistoryPoint,
  type HoldingUniverseEntry,
  type FactorExposureMap,
  type ConstraintSetInput,
} from '@/lib/quant/cvar-optimizer';
import { runHistoricalStressTests } from '@/lib/quant/stress-test';
import { fetchAlphaVantageQuote } from '@/lib/alpha-vantage';
import { sequential } from '@/lib/market-data/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function toJsonValue(value: unknown) {
  return value as Prisma.InputJsonValue;
}

// Loads holdings + active constraint set, requires price history already backfilled
// (errors with a clear message rather than silently backfilling inline, to keep this
// route's latency bounded — see plan Section 9), loads/recomputes factor exposures,
// builds scenarios, solves the LP, computes suggested trades, runs stress tests against
// the resulting weights, persists SavedOptimizationRun, returns it.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const constraintSetId: string | undefined = body?.constraintSetId;
    const notes: string | undefined = body?.notes;

    const constraintSetRow = constraintSetId
      ? await prisma.optimizationConstraintSet.findUnique({ where: { id: constraintSetId } })
      : await prisma.optimizationConstraintSet.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });

    if (!constraintSetRow) {
      return NextResponse.json(
        { error: 'No active OptimizationConstraintSet found. Create one on the Constraints tab first.' },
        { status: 400 }
      );
    }

    const holdings = await prisma.holding.findMany({
      where: { assetType: { not: 'Cash' }, visible: true },
      select: { ticker: true, apiTicker: true, quantity: true, sector: true, region: true },
    });

    if (holdings.length === 0) {
      return NextResponse.json({ error: 'No visible non-cash holdings found to optimize over.' }, { status: 400 });
    }

    const tickerFor = (h: { ticker: string; apiTicker: string | null }) => h.apiTicker || h.ticker;
    const universeTickers = holdings.map(tickerFor);
    const allTickers = [...universeTickers, BENCHMARK_TICKER];

    // Require price history already backfilled — check coverage rather than fetching
    // inline, so this route's latency stays bounded (per plan Section 9).
    const coverageCounts = await prisma.priceHistory.groupBy({
      by: ['ticker'],
      where: { ticker: { in: allTickers } },
      _count: { _all: true },
    });
    const coverageMap = new Map(coverageCounts.map((c) => [c.ticker, c._count._all]));
    const minBarsNeeded = constraintSetRow.cvarHorizonDays + 30; // enough for at least a handful of scenarios
    const insufficientlyBackfilled = allTickers.filter((t) => (coverageMap.get(t) ?? 0) < minBarsNeeded);

    if (insufficientlyBackfilled.length > 0) {
      return NextResponse.json(
        {
          error:
            'Price history has not been backfilled (or is insufficient) for one or more tickers. ' +
            'Run "Refresh price data" on the Overview tab first, then re-run.',
          tickersNeedingBackfill: insufficientlyBackfilled,
        },
        { status: 400 }
      );
    }

    // Load price history for scenario construction.
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
      Object.fromEntries(universeTickers.map((t) => [t, priceHistoryByTicker[t]])),
      constraintSetRow.cvarHorizonDays
    );

    if (scenarios.scenarioCount < 10) {
      return NextResponse.json(
        {
          error: `Only ${scenarios.scenarioCount} aligned historical scenarios available across the current holdings — need at least 10 for a meaningful CVaR estimate. This usually means one or more holdings have a short or gappy price history relative to others (the scenario builder inner-joins on dates common to ALL tickers).`,
        },
        { status: 400 }
      );
    }

    // Benchmark scenarios (URTH alone) for benchmarkCVaR comparison — same horizon.
    const benchmarkScenarios = buildScenarioMatrix({ [BENCHMARK_TICKER]: priceHistoryByTicker[BENCHMARK_TICKER] }, constraintSetRow.cvarHorizonDays);

    // Load latest factor exposures (recompute if missing/stale — POST /factors is the
    // dedicated recompute path, but /run should not silently produce a portfolio with
    // stale or absent factor floors either; here we just read the latest persisted rows,
    // consistent with "requires price history already backfilled" for the run route
    // staying bounded — factor recompute is comparatively fast, single-fetch per ticker).
    const latestFactorRows = await Promise.all(
      universeTickers.map((t) => prisma.factorExposure.findFirst({ where: { ticker: t }, orderBy: { asOfDate: 'desc' } }))
    );
    const factorExposures: FactorExposureMap = {};
    universeTickers.forEach((t, i) => {
      const row = latestFactorRows[i];
      factorExposures[t] = row
        ? { value: row.value, growth: row.growth, momentum: row.momentum, quality: row.quality, volatility: row.volatility, size: row.size }
        : { value: null, growth: null, momentum: null, quality: null, volatility: null, size: null };
    });

    const missingFactors = universeTickers.filter((t, i) => !latestFactorRows[i]);
    if (missingFactors.length > 0) {
      return NextResponse.json(
        {
          error: 'Factor exposures have not been computed for one or more holdings. Run the factor computation on the Overview tab first, then re-run.',
          tickersNeedingFactors: missingFactors,
        },
        { status: 400 }
      );
    }

    // Portfolio value + current weights snapshot.
    const priceMap: Record<string, number> = {};
    for (const ticker of allTickers) {
      const rows = priceHistoryByTicker[ticker];
      if (rows.length > 0) priceMap[ticker] = rows[rows.length - 1].close;
    }
    // Prefer a live quote if available (best-effort, non-fatal on failure) so "current
    // weight" reflects today's price rather than the last backfilled close. Rate-limit
    // safe: sequential + staggered (see lib/market-data/rate-limit.ts).
    const liveQuotes = await sequential(
      holdings.map((h) => async () => {
        const ticker = tickerFor(h);
        try {
          const quote = await fetchAlphaVantageQuote(ticker);
          return quote?.price ? { ticker, price: quote.price } : null;
        } catch {
          return null; // fall back silently to last PriceHistory close already in priceMap
        }
      }),
      550,
      8000
    );
    liveQuotes.forEach((r) => {
      if (r) priceMap[r.ticker] = r.price;
    });

    let portfolioValue = 0;
    const holdingValues = holdings.map((h) => (priceMap[tickerFor(h)] ?? 0) * h.quantity);
    portfolioValue = holdingValues.reduce((sum, v) => sum + v, 0);
    const universe: HoldingUniverseEntry[] = holdings.map((h, i) => ({
      ticker: tickerFor(h),
      sector: h.sector,
      region: h.region,
      currentWeight: portfolioValue > 0 ? holdingValues[i] / portfolioValue : 0,
    }));

    const constraintSet: ConstraintSetInput = {
      sectorLimits: constraintSetRow.sectorLimits as ConstraintSetInput['sectorLimits'],
      regionLimits: constraintSetRow.regionLimits as ConstraintSetInput['regionLimits'],
      factorTilts: constraintSetRow.factorTilts as ConstraintSetInput['factorTilts'],
      maxSinglePositionWeight: constraintSetRow.maxSinglePositionWeight,
      turnoverLimit: constraintSetRow.turnoverLimit,
      cvarConfidence: constraintSetRow.cvarConfidence,
      cvarHorizonDays: constraintSetRow.cvarHorizonDays,
    };

    const build = buildLPModel(scenarios, factorExposures, universe, constraintSet);
    const result = solveOptimization(build);

    if (result.status !== 'optimal') {
      const failedRun = await prisma.savedOptimizationRun.create({
        data: {
          constraintSetId: constraintSetRow.id,
          status: result.status === 'infeasible' ? 'infeasible' : 'failed',
          universe: toJsonValue(universe),
          targetWeights: {},
          expectedCVaR: 0,
          factorExposures: {},
          sectorWeights: {},
          regionWeights: {},
          suggestedTrades: [],
          diagnostics: toJsonValue(result.diagnostics),
          runBy: session.user.id,
          notes: notes ?? null,
        },
      });
      return NextResponse.json(failedRun, { status: 200 });
    }

    // Benchmark CVaR: URTH-only weight vector evaluated over its own scenario set.
    const benchmarkCVaR =
      benchmarkScenarios.scenarioCount > 0
        ? computeCVaRForWeights({ [BENCHMARK_TICKER]: 1 }, benchmarkScenarios, constraintSetRow.cvarConfidence)
        : null;

    // Portfolio-level realized factor tilts vs benchmark: weighted-average of the
    // portfolio's factor exposures. (URTH-level factor comparison uses null since a
    // single-ETF "factor score" from this fund-relative cross-sectional methodology isn't
    // meaningful — see report methodology caveat.)
    const factorNames = ['value', 'growth', 'momentum', 'quality', 'volatility', 'size'] as const;
    const portfolioFactorExposures: Record<string, number | null> = {};
    for (const factorName of factorNames) {
      let weightedSum = 0;
      let weightCovered = 0;
      for (const entry of universe) {
        const exposure = factorExposures[entry.ticker]?.[factorName];
        const w = result.weights[entry.ticker] ?? 0;
        if (exposure !== null && exposure !== undefined) {
          weightedSum += w * exposure;
          weightCovered += w;
        }
      }
      portfolioFactorExposures[factorName] = weightCovered > 0 ? weightedSum / weightCovered : null;
    }

    // Sector / region weights.
    const sectorWeights: Record<string, number> = {};
    const regionWeights: Record<string, number> = {};
    for (const entry of universe) {
      const w = result.weights[entry.ticker] ?? 0;
      if (entry.sector) sectorWeights[entry.sector] = (sectorWeights[entry.sector] ?? 0) + w;
      if (entry.region) regionWeights[entry.region] = (regionWeights[entry.region] ?? 0) + w;
    }

    const currentHoldingsInfo = holdings.map((h) => ({
      ticker: tickerFor(h),
      quantity: h.quantity,
      sector: h.sector,
      region: h.region,
    }));
    const suggestedTrades = computeSuggestedTrades(result.weights, currentHoldingsInfo, portfolioValue, priceMap);

    const stressTestResults = await runHistoricalStressTests(result.weights);

    const savedRun = await prisma.savedOptimizationRun.create({
      data: {
        constraintSetId: constraintSetRow.id,
        status: 'completed',
        universe: toJsonValue(universe),
        targetWeights: toJsonValue(result.weights),
        expectedCVaR: result.cvar ?? 0,
        expectedReturn: null,
        benchmarkCVaR,
        factorExposures: toJsonValue(portfolioFactorExposures),
        sectorWeights: toJsonValue(sectorWeights),
        regionWeights: toJsonValue(regionWeights),
        suggestedTrades: toJsonValue(suggestedTrades),
        stressTestResults: toJsonValue(stressTestResults),
        diagnostics: toJsonValue(result.diagnostics),
        runBy: session.user.id,
        notes: notes ?? null,
      },
    });

    return NextResponse.json(savedRun);
  } catch (error) {
    console.error('CVaR optimizer run error:', error);
    return NextResponse.json({ error: 'Failed to run optimization' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 });
}
