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
  BENCHMARK_TICKER,
  type PriceHistoryPoint,
  type HoldingUniverseEntry,
  type FactorExposureMap,
  type ConstraintSetInput,
} from '@/lib/quant/cvar-optimizer';
import { runHistoricalStressTests } from '@/lib/quant/stress-test';
import { getOrBackfillPriceHistory } from '@/lib/market-data/price-history';
import { recomputeFactorExposures } from '@/lib/quant/factors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function toJsonValue(value: unknown) {
  return value as Prisma.InputJsonValue;
}

interface SandboxTickerInput {
  ticker: string;
  shares: number;
  sector?: string | null;
  region?: string | null;
}

// Runs the full CVaR pipeline (backfill -> factors -> scenarios -> LP -> stress test)
// against a user-typed, ad-hoc ticker list instead of the fund's real Holding records.
// Persists as SavedSandboxRun, never SavedOptimizationRun — this is scratch/exploratory
// testing only (see plan discussion: "sandbox" mode), never the source for the
// regime-thesis report's fund-portfolio sections, and never mistaken for a real
// recommendation since it has no ties to Holding/Transaction.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const label: string = typeof body?.label === 'string' && body.label.trim() ? body.label.trim() : 'Untitled sandbox portfolio';
    const tickerInputs: SandboxTickerInput[] = Array.isArray(body?.tickers) ? body.tickers : [];
    const constraintSetId: string | undefined = body?.constraintSetId;
    const inlineConstraints: Partial<ConstraintSetInput> | undefined = body?.constraintOverrides;

    const cleaned = tickerInputs
      .map((t) => ({
        ticker: String(t.ticker || '').trim().toUpperCase(),
        shares: Number(t.shares),
        sector: t.sector ?? null,
        region: t.region ?? null,
      }))
      .filter((t) => t.ticker && Number.isFinite(t.shares) && t.shares > 0);

    if (cleaned.length < 2) {
      return NextResponse.json(
        { error: 'Enter at least 2 tickers with a positive share count to run a sandbox optimization.' },
        { status: 400 }
      );
    }

    // Resolve constraint set: either a saved one, or inline overrides on top of a sensible
    // default. Sandbox baskets are typically smaller/more concentrated or more diverse than
    // the fund's real holdings, so we don't silently reuse the fund's active constraint set
    // unless the caller explicitly asks for it via constraintSetId.
    let constraintSet: ConstraintSetInput;
    let resolvedConstraintSetId: string | null = null;
    if (constraintSetId) {
      const row = await prisma.optimizationConstraintSet.findUnique({ where: { id: constraintSetId } });
      if (!row) {
        return NextResponse.json({ error: 'constraintSetId not found.' }, { status: 400 });
      }
      resolvedConstraintSetId = row.id;
      constraintSet = {
        sectorLimits: row.sectorLimits as unknown as ConstraintSetInput['sectorLimits'],
        regionLimits: row.regionLimits as unknown as ConstraintSetInput['regionLimits'],
        factorTilts: row.factorTilts as unknown as ConstraintSetInput['factorTilts'],
        maxSinglePositionWeight: row.maxSinglePositionWeight,
        turnoverLimit: row.turnoverLimit,
        cvarConfidence: row.cvarConfidence,
        cvarHorizonDays: row.cvarHorizonDays,
      };
    } else {
      constraintSet = {
        sectorLimits: inlineConstraints?.sectorLimits ?? {},
        regionLimits: inlineConstraints?.regionLimits ?? {},
        factorTilts: inlineConstraints?.factorTilts ?? {},
        maxSinglePositionWeight: inlineConstraints?.maxSinglePositionWeight ?? 0.25,
        turnoverLimit: inlineConstraints?.turnoverLimit ?? null,
        cvarConfidence: inlineConstraints?.cvarConfidence ?? 0.95,
        cvarHorizonDays: inlineConstraints?.cvarHorizonDays ?? 20,
      };
    }

    const universeTickers = cleaned.map((t) => t.ticker);
    const allTickers = [...new Set([...universeTickers, BENCHMARK_TICKER])];

    // Backfill price history inline for this route (unlike the real /run route, which
    // requires backfill to already be done — sandbox testing should "just work" for
    // whatever tickers someone types in, since asking them to hit a separate backfill
    // endpoint first for a quick what-if test would defeat the point of a sandbox).
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
      Object.fromEntries(universeTickers.map((t) => [t, priceHistoryByTicker[t] ?? []])),
      constraintSet.cvarHorizonDays
    );

    if (scenarios.scenarioCount < 10) {
      return NextResponse.json(
        {
          error: `Only ${scenarios.scenarioCount} aligned historical scenarios available across the entered tickers — need at least 10. This usually means one or more tickers have too little price history, or failed to backfill.`,
          failedBackfills: failedBackfills.map((r) => r.ticker),
        },
        { status: 400 }
      );
    }

    const benchmarkScenarios = buildScenarioMatrix(
      { [BENCHMARK_TICKER]: priceHistoryByTicker[BENCHMARK_TICKER] ?? [] },
      constraintSet.cvarHorizonDays
    );

    // Compute factor exposures fresh for this basket (sandbox tickers may never have been
    // scored before) rather than requiring a separate "recompute factors" step first.
    const asOfDate = new Date();
    const scores = await recomputeFactorExposures(universeTickers, asOfDate);
    const factorExposures: FactorExposureMap = {};
    for (const s of scores) {
      factorExposures[s.ticker] = {
        value: s.value, growth: s.growth, momentum: s.momentum,
        quality: s.quality, volatility: s.volatility, size: s.size,
      };
    }

    // Current weights: equal-dollar-at-latest-price snapshot from the entered share counts
    // (sandbox tickers have no live portfolio value to reference).
    const priceMap: Record<string, number> = {};
    for (const ticker of allTickers) {
      const rows = priceHistoryByTicker[ticker];
      if (rows.length > 0) priceMap[ticker] = rows[rows.length - 1].close;
    }
    const holdingValues = cleaned.map((t) => (priceMap[t.ticker] ?? 0) * t.shares);
    const portfolioValue = holdingValues.reduce((sum, v) => sum + v, 0);
    const universe: HoldingUniverseEntry[] = cleaned.map((t, i) => ({
      ticker: t.ticker,
      sector: t.sector,
      region: t.region,
      currentWeight: portfolioValue > 0 ? holdingValues[i] / portfolioValue : 0,
    }));

    const build = buildLPModel(scenarios, factorExposures, universe, constraintSet);
    const result = solveOptimization(build);

    if (result.status !== 'optimal') {
      const failedRun = await prisma.savedSandboxRun.create({
        data: {
          label,
          tickers: toJsonValue(cleaned),
          constraintSetId: resolvedConstraintSetId,
          constraintOverrides: constraintSetId ? Prisma.JsonNull : toJsonValue(constraintSet),
          status: result.status === 'infeasible' ? 'infeasible' : 'failed',
          targetWeights: {},
          diagnostics: toJsonValue(result.diagnostics),
          runBy: session.user.id,
        },
      });
      return NextResponse.json(failedRun, { status: 200 });
    }

    const benchmarkCVaR =
      benchmarkScenarios.scenarioCount > 0
        ? computeCVaRForWeights({ [BENCHMARK_TICKER]: 1 }, benchmarkScenarios, constraintSet.cvarConfidence)
        : null;

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

    const sectorWeights: Record<string, number> = {};
    const regionWeights: Record<string, number> = {};
    for (const entry of universe) {
      const w = result.weights[entry.ticker] ?? 0;
      if (entry.sector) sectorWeights[entry.sector] = (sectorWeights[entry.sector] ?? 0) + w;
      if (entry.region) regionWeights[entry.region] = (regionWeights[entry.region] ?? 0) + w;
    }

    const stressTestResults = await runHistoricalStressTests(result.weights);

    const savedRun = await prisma.savedSandboxRun.create({
      data: {
        label,
        tickers: toJsonValue(cleaned),
        constraintSetId: resolvedConstraintSetId,
        constraintOverrides: constraintSetId ? Prisma.JsonNull : toJsonValue(constraintSet),
        status: 'completed',
        targetWeights: toJsonValue(result.weights),
        expectedCVaR: result.cvar,
        benchmarkCVaR,
        factorExposures: toJsonValue(portfolioFactorExposures),
        sectorWeights: toJsonValue(sectorWeights),
        regionWeights: toJsonValue(regionWeights),
        stressTestResults: toJsonValue(stressTestResults),
        diagnostics: toJsonValue(result.diagnostics),
        runBy: session.user.id,
      },
    });

    return NextResponse.json(savedRun);
  } catch (error) {
    console.error('CVaR sandbox run error:', error);
    return NextResponse.json({ error: 'Failed to run sandbox optimization' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const runs = await prisma.savedSandboxRun.findMany({
      where: { runBy: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return NextResponse.json({ runs });
  } catch (error) {
    console.error('CVaR sandbox list error:', error);
    return NextResponse.json({ error: 'Failed to fetch sandbox runs' }, { status: 500 });
  }
}
