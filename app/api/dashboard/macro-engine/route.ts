import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export type MacroEnginePayload = {
  regime: {
    regimeLabel: string;
    labelIndex: number;
    confidence: number | null;
    fitId: string;
    startDate: string;       // ISO date string
    avgDurationDays: number | null;
  } | null;
  signals: Array<{
    ticker: string;
    rank: number;
    direction: string;
    convictionScore: number;
    factorAttribution: Record<string, number>;
    etfTicker: string;
    prob6m: number | null;
    prob12m: number | null;
    regimeLabel: string;
  }>;
  metrics: {
    spy: { hitRate: number; sharpeAnn: number; maxDrawdown: number } | null;
    acwi: { hitRate: number; sharpeAnn: number; maxDrawdown: number } | null;
    windowCount: number;
    dataStart: string;
    holdoutStart: string;
  } | null;
  stocks: Array<{
    ticker: string;
    sectorEtf: string;
    rsRating: number | null;
    epsRankProxy: number | null;
    smrProxy: string | null;
    dma50Position: number | null;
    dma100Position: number | null;
    dma200Position: number | null;
    institutionalSponsorshipTrend: number | null;
    earningsRevisionMomentum: number | null;
    compositeScore: number;
    analystConsensus: Record<string, number | string> | null;
  }>;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Latest regime
  const latestRegimeRow = await prisma.regimeLabel.findFirst({
    orderBy: { date: 'desc' },
  });

  let regime: MacroEnginePayload['regime'] = null;

  if (latestRegimeRow) {
    const currentLabel = latestRegimeRow.regimeLabel;

    // 2. Regime start date — fetch up to 500 recent RegimeLabel rows, walk back
    const recentLabels = await prisma.regimeLabel.findMany({
      orderBy: { date: 'desc' },
      take: 500,
    });

    // Walk backward (oldest → newest already reversed) to find when current label started
    let startDate = latestRegimeRow.date;
    for (const row of recentLabels) {
      if (row.regimeLabel !== currentLabel) break;
      startDate = row.date;
    }

    // 3. Average regime duration — compute from contiguous runs in the 500-row fetch
    // recentLabels is desc order; reverse to asc for run-length computation
    const labelsAsc = [...recentLabels].reverse();

    type Run = { label: string; startIdx: number; endIdx: number };
    const runs: Run[] = [];
    let currentRun: Run | null = null;

    for (let i = 0; i < labelsAsc.length; i++) {
      const label = labelsAsc[i].regimeLabel;
      if (!currentRun || currentRun.label !== label) {
        if (currentRun) runs.push(currentRun);
        currentRun = { label, startIdx: i, endIdx: i };
      } else {
        currentRun.endIdx = i;
      }
    }
    if (currentRun) runs.push(currentRun);

    // Compute run lengths in days for completed runs (exclude last ongoing run)
    const completedRuns = runs.slice(0, -1);
    let avgDurationDays: number | null = null;

    if (completedRuns.length > 0) {
      const durations = completedRuns.map((run) => {
        const startRow = labelsAsc[run.startIdx];
        const endRow = labelsAsc[run.endIdx];
        const msPerDay = 1000 * 60 * 60 * 24;
        return (endRow.date.getTime() - startRow.date.getTime()) / msPerDay;
      });
      avgDurationDays = durations.reduce((a, b) => a + b, 0) / durations.length;
    }

    regime = {
      regimeLabel: latestRegimeRow.regimeLabel,
      labelIndex: latestRegimeRow.labelIndex,
      confidence: latestRegimeRow.confidence,
      fitId: latestRegimeRow.fitId,
      startDate: startDate.toISOString(),
      avgDurationDays,
    };
  }

  // 4. Latest signal runDate
  const latestSignalRow = await prisma.allocationSignal.findFirst({
    orderBy: { runDate: 'desc' },
    select: { runDate: true },
  });

  const latestRunDate = latestSignalRow?.runDate ?? null;

  // 5. Latest signals (filtered to latest runDate only)
  let signals: MacroEnginePayload['signals'] = [];

  if (latestRunDate !== null) {
    const rawSignals = await prisma.allocationSignal.findMany({
      where: { runDate: latestRunDate },
      orderBy: { rank: 'asc' },
    });

    signals = rawSignals.map((s) => ({
      ticker: s.ticker,
      rank: s.rank,
      direction: s.direction,
      convictionScore: s.convictionScore,
      factorAttribution: s.factorAttribution as Record<string, number>,
      etfTicker: s.etfTicker,
      prob6m: s.prob6m,
      prob12m: s.prob12m,
      regimeLabel: s.regimeLabel,
    }));
  }

  // 6. Latest BacktestRun
  const latestRun = await prisma.backtestRun.findFirst({
    orderBy: { runAt: 'desc' },
  });

  // 7. BacktestMetric aggregation
  let metrics: MacroEnginePayload['metrics'] = null;

  if (latestRun) {
    const metricRows = await prisma.backtestMetric.findMany({
      where: { runId: latestRun.id },
    });

    const aggregate = (benchmark: string) => {
      const rows = metricRows.filter((m) => m.benchmark === benchmark);
      if (rows.length === 0) return null;
      const hitRate = rows.reduce((sum, m) => sum + m.hitRate, 0) / rows.length;
      const sharpeAnn = rows.reduce((sum, m) => sum + m.sharpeAnn, 0) / rows.length;
      const maxDrawdown = Math.min(...rows.map((m) => m.maxDrawdown));
      return { hitRate, sharpeAnn, maxDrawdown };
    };

    metrics = {
      spy: aggregate('SPY'),
      acwi: aggregate('ACWI'),
      windowCount: latestRun.windowCount,
      dataStart: latestRun.dataStart,
      holdoutStart: latestRun.holdoutStart,
    };
  }

  // 8. Stocks — filter to overweight sectorEtf set from latest signals
  let stocks: MacroEnginePayload['stocks'] = [];

  if (latestRunDate !== null) {
    const overweightEtfs = signals
      .filter((s) => s.direction === 'overweight')
      .map((s) => s.etfTicker);

    if (overweightEtfs.length > 0) {
      const rawStocks = await prisma.stockScreenResult.findMany({
        where: {
          runDate: latestRunDate,
          sectorEtf: { in: overweightEtfs },
        },
        orderBy: { compositeScore: 'desc' },
      });

      stocks = rawStocks.map((s) => ({
        ticker: s.ticker,
        sectorEtf: s.sectorEtf,
        rsRating: s.rsRating,
        epsRankProxy: s.epsRankProxy,
        smrProxy: s.smrProxy,
        dma50Position: s.dma50Position,
        dma100Position: s.dma100Position,
        dma200Position: s.dma200Position,
        institutionalSponsorshipTrend: s.institutionalSponsorshipTrend,
        earningsRevisionMomentum: s.earningsRevisionMomentum,
        compositeScore: s.compositeScore,
        analystConsensus: s.analystConsensus as Record<string, number | string> | null,
      }));
    }
  }

  const payload: MacroEnginePayload = {
    regime,
    signals,
    metrics,
    stocks,
  };

  return NextResponse.json(payload satisfies MacroEnginePayload);
}
