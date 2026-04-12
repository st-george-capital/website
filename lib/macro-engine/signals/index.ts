/**
 * Daily allocation signals orchestrator.
 * Calls scoreUniverse(), ranks entries, and upserts AllocationSignal rows.
 */

import { prisma } from '../db';
import { scoreUniverse } from './scoring';

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

  // Upsert all entries
  for (const entry of ranked) {
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
        prob6m: null,
        prob12m: null,
      },
      update: {
        score: entry.score,
        convictionScore: entry.convictionScore,
        direction: entry.direction,
        regimeLabel: entry.regimeLabel,
        factorAttribution: entry.factorAttribution,
        rank: entry.rank,
        etfTicker: entry.etfTicker,
      },
    });
  }

  const regimeLabel = ranked[0]?.regimeLabel ?? 'unknown';

  console.log(
    `runDailySignals: upserted ${ranked.length} signals for ${runDate.toISOString().slice(0, 10)}, regime=${regimeLabel}`,
  );

  return {
    runDate: runDate.toISOString().slice(0, 10),
    signalCount: ranked.length,
    regimeLabel,
  };
}
