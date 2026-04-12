/**
 * Daily allocation signals orchestrator.
 * Calls scoreUniverse(), ranks entries, and upserts AllocationSignal rows.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { scoreUniverse } from './scoring';
import { computeOutperformanceProbabilities } from './probabilities';
import { screenEquities } from './single-stock';
import { fetchAnalystConsensus, fetchSmrProxy } from './analyst';

export interface DailySignalsResult {
  runDate: string;
  signalCount: number;
  regimeLabel: string;
}

/**
 * Runs the daily allocation signal pipeline for a given date.
 *
 * 1. Scores all universe ETFs via scoreUniverse().
 * 2. Assigns rank by descending score (rank 1 = highest score).
 * 3. Upserts each entry into AllocationSignal.
 * 4. Returns summary metadata.
 *
 * Note: prob6m and prob12m are null at this stage — they will be populated by Plan 02.
 */
export async function runDailySignals(asOfDate?: Date): Promise<DailySignalsResult> {
  const date = asOfDate ?? new Date();
  // Normalize to midnight UTC for consistent runDate keys
  const runDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );

  console.log(`runDailySignals: asOfDate=${runDate.toISOString().slice(0, 10)}`);

  const entries = await scoreUniverse(date);

  // Rank by descending score (rank 1 = highest score)
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const ranked = sorted.map((entry, i) => ({ ...entry, rank: i + 1 }));

  // Compute outperformance probabilities (calibrated from pre-HOLDOUT_START data)
  const probMap = await computeOutperformanceProbabilities(
    ranked.map((s) => ({
      ticker: s.ticker,
      convictionScore: s.convictionScore,
      regimeLabel: s.regimeLabel,
    })),
    runDate,
  );

  // Upsert all entries
  for (const entry of ranked) {
    const probs = probMap.get(entry.ticker);
    await prisma.allocationSignal.upsert({
      where: {
        runDate_ticker: {
          runDate,
          ticker: entry.ticker,
        },
      },
      create: {
        runDate,
        ticker: entry.ticker,
        score: entry.score,
        convictionScore: entry.convictionScore,
        direction: entry.direction,
        regimeLabel: entry.regimeLabel,
        factorAttribution: entry.factorAttribution,
        rank: entry.rank,
        etfTicker: entry.etfTicker,
        prob6m: probs?.prob6m ?? null,
        prob12m: probs?.prob12m ?? null,
      },
      update: {
        score: entry.score,
        convictionScore: entry.convictionScore,
        direction: entry.direction,
        regimeLabel: entry.regimeLabel,
        factorAttribution: entry.factorAttribution,
        rank: entry.rank,
        etfTicker: entry.etfTicker,
        prob6m: probs?.prob6m ?? null,
        prob12m: probs?.prob12m ?? null,
      },
    });
  }

  const regimeLabel = ranked[0]?.regimeLabel ?? 'unknown';

  console.log(
    `runDailySignals: upserted ${ranked.length} signals for ${runDate.toISOString().slice(0, 10)}, regime=${regimeLabel}`,
  );

  // Screen proxy equities for overweight sectors (ALLC-04)
  const overweightSectors = ranked
    .filter((s) => s.direction === 'overweight')
    .map((s) => s.ticker);

  const screenedEquities = await screenEquities(overweightSectors, runDate);

  for (const eq of screenedEquities) {
    await prisma.stockScreenResult.upsert({
      where: { runDate_ticker: { runDate, ticker: eq.ticker } },
      create: {
        runDate,
        ticker: eq.ticker,
        sectorEtf: eq.sectorEtf,
        rsRating: eq.rsRating,
        epsRankProxy: eq.epsRankProxy,
        smrProxy: eq.smrProxy,
        dma50Position: eq.dma50Position,
        dma100Position: eq.dma100Position,
        dma200Position: eq.dma200Position,
        institutionalSponsorshipTrend: eq.institutionalSponsorshipTrend,
        earningsRevisionMomentum: eq.earningsRevisionMomentum,
        compositeScore: eq.compositeScore,
        analystConsensus: Prisma.DbNull,
      },
      update: {
        sectorEtf: eq.sectorEtf,
        rsRating: eq.rsRating,
        epsRankProxy: eq.epsRankProxy,
        smrProxy: eq.smrProxy,
        dma50Position: eq.dma50Position,
        dma100Position: eq.dma100Position,
        dma200Position: eq.dma200Position,
        institutionalSponsorshipTrend: eq.institutionalSponsorshipTrend,
        earningsRevisionMomentum: eq.earningsRevisionMomentum,
        compositeScore: eq.compositeScore,
      },
    });
  }

  if (screenedEquities.length > 0) {
    console.log(
      `runDailySignals: upserted ${screenedEquities.length} StockScreenResult rows`,
    );
  }

  // Enrich StockScreenResult rows with analyst consensus and SMR proxy (ALLC-04, ALLC-05)
  // Both calls are enrichment-only: they log warnings and write null on error — never throw.
  // Run sequentially (not parallel) to share the 800ms per-ticker rate-limit budget.
  const screenedTickers = screenedEquities.map((e) => e.ticker);
  if (screenedTickers.length > 0) {
    const consensusMap = await fetchAnalystConsensus(screenedTickers);
    const smrMap = await fetchSmrProxy(screenedTickers);

    for (const ticker of screenedTickers) {
      const consensus = consensusMap.get(ticker) ?? null;
      const smr = smrMap.get(ticker) ?? null;
      await prisma.stockScreenResult.update({
        where: { runDate_ticker: { runDate, ticker } },
        data: {
          analystConsensus: consensus !== null
            ? (consensus as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
          smrProxy: smr,
        },
      });
    }

    const consensusPopulated = screenedTickers.filter(
      (t) => consensusMap.get(t) !== null,
    ).length;
    const smrPopulated = screenedTickers.filter(
      (t) => smrMap.get(t) !== null,
    ).length;

    console.log(
      `runDailySignals: analystConsensus populated for ${consensusPopulated}/${screenedTickers.length} tickers`,
    );
    console.log(
      `runDailySignals: smrProxy populated for ${smrPopulated}/${screenedTickers.length} tickers`,
    );

    if (smrPopulated === 0) {
      console.warn(
        'runDailySignals: smrProxy is null for all tickers — may indicate FMP tier issue or insufficient quarterly data',
      );
    }
  }

  return {
    runDate: runDate.toISOString().slice(0, 10),
    signalCount: ranked.length,
    regimeLabel,
  };
}
