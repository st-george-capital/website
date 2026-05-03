import { createHash, randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import { prismaDirectUrl as prisma } from '../db';
import {
  backtestPairSignals,
  type PairBacktestResult,
  type HorizonStats,
  type PairSignalEvent,
} from './pairBacktest';
import {
  getResearchPairs,
  getResearchExpressions,
  getResearchUniverseConfig,
  type PairDefinition,
} from './universe';

export const RESEARCH_BACKTEST_ENGINE_VERSION = 'pair-zscore-v1';

const SOURCE_FINGERPRINT_FILES = [
  'lib/macro-engine/research/pairBacktest.ts',
  'lib/macro-engine/research/universe.ts',
  'lib/macro-engine/research/runStore.ts',
  'config/macro-engine/research-universe.json',
];

export interface ResearchBacktestSummaryRow {
  pairId: string;
  label: string;
  numerator: string;
  denominator: string;
  mode: PairDefinition['mode'];
  numeratorRows: number;
  denominatorRows: number;
  coverageStart: string | null;
  coverageEnd: string | null;
  currentDate: string | null;
  currentZScore: number | null;
  currentTriggered: boolean | null;
  currentSide: PairSignalEvent['side'] | null;
  events: number;
  bestHorizonDays: number | null;
  bestHitRate: number | null;
  bestMedianSignedReturn: number | null;
  longestHorizon: HorizonStats | null;
}

export interface SavedResearchBacktestRun {
  id: string;
  runAt: string;
  configHash: string;
  engineVersion: string;
  startDate: string;
  endDate: string;
  horizons: number[];
  pairIds: string[];
  result: PairBacktestResult[];
  summary: ResearchBacktestSummaryRow[];
  status: string;
  error: string | null;
}

export interface ResearchBacktestPayload {
  currentConfigHash: string;
  engineVersion: string;
  priceCoverage: ResearchPriceCoveragePayload;
  latestForCurrentConfig: SavedResearchBacktestRun | null;
  latestAnyConfig: SavedResearchBacktestRun | null;
  needsRun: boolean;
}

export type ResearchPairCoverageStatus = 'ready' | 'missing_prices' | 'no_overlap' | 'thin_history';

export interface ResearchTickerCoverage {
  ticker: string;
  name: string;
  rows: number;
  startDate: string | null;
  endDate: string | null;
  neededByPairs: number;
}

export interface ResearchPairCoverage {
  pairId: string;
  label: string;
  numerator: string;
  denominator: string;
  numeratorRows: number;
  denominatorRows: number;
  coverageStart: string | null;
  coverageEnd: string | null;
  missingTickers: string[];
  status: ResearchPairCoverageStatus;
}

export interface ResearchPriceCoveragePayload {
  tickers: ResearchTickerCoverage[];
  pairs: ResearchPairCoverage[];
  totalPairs: number;
  readyPairs: number;
  missingTickers: string[];
}

type DbRunRow = {
  id: string;
  runAt: Date;
  configHash: string;
  engineVersion: string;
  startDate: string;
  endDate: string;
  horizons: number[];
  pairIds: string[];
  result: unknown;
  summary: unknown;
  status: string;
  error: string | null;
};

export function currentResearchConfigHash(): string {
  const config = getResearchUniverseConfig();
  const payload = JSON.stringify({
    engineVersion: RESEARCH_BACKTEST_ENGINE_VERSION,
    sourceFingerprint: currentSourceFingerprint(),
    config,
  });
  return createHash('sha256').update(payload).digest('hex');
}

function currentSourceFingerprint(): string {
  const hash = createHash('sha256');

  for (const relPath of SOURCE_FINGERPRINT_FILES) {
    hash.update(relPath);
    try {
      hash.update(readFileSync(path.join(process.cwd(), relPath)));
    } catch {
      hash.update('missing');
    }
  }

  return hash.digest('hex');
}

export async function getResearchBacktestPayload(): Promise<ResearchBacktestPayload> {
  const configHash = currentResearchConfigHash();
  const [current, latest, priceCoverage] = await Promise.all([
    loadLatestRun({ configHash }),
    loadLatestRun({}),
    getResearchPriceCoverage(),
  ]);

  return {
    currentConfigHash: configHash,
    engineVersion: RESEARCH_BACKTEST_ENGINE_VERSION,
    priceCoverage,
    latestForCurrentConfig: current,
    latestAnyConfig: latest,
    needsRun: current === null,
  };
}

export async function getResearchPriceCoverage(): Promise<ResearchPriceCoveragePayload> {
  const expressions = getResearchExpressions();
  const pairs = getResearchPairs();
  const tickers = [...new Set(expressions.map((expr) => expr.ticker))];
  const exprByTicker = new Map(expressions.map((expr) => [expr.ticker, expr]));
  const neededByPairs = new Map<string, number>();
  for (const pair of pairs) {
    neededByPairs.set(pair.numerator, (neededByPairs.get(pair.numerator) ?? 0) + 1);
    neededByPairs.set(pair.denominator, (neededByPairs.get(pair.denominator) ?? 0) + 1);
  }

  const rows = tickers.length > 0
    ? await prisma.$queryRaw<Array<{
        ticker: string;
        rows: number;
        startDate: Date | null;
        endDate: Date | null;
      }>>`
        SELECT ticker, COUNT(*)::int AS rows, MIN(date) AS "startDate", MAX(date) AS "endDate"
        FROM ohlcv_daily
        WHERE ticker IN (${Prisma.join(tickers)})
        GROUP BY ticker
      `
    : [];

  const byTicker = new Map(rows.map((row) => [row.ticker, row]));
  const tickerCoverage: ResearchTickerCoverage[] = tickers.map((ticker) => {
    const row = byTicker.get(ticker);
    const expr = exprByTicker.get(ticker);
    return {
      ticker,
      name: expr?.name ?? ticker,
      rows: Number(row?.rows ?? 0),
      startDate: row?.startDate ? row.startDate.toISOString().slice(0, 10) : null,
      endDate: row?.endDate ? row.endDate.toISOString().slice(0, 10) : null,
      neededByPairs: neededByPairs.get(ticker) ?? 0,
    };
  });
  const tickerCoverageMap = new Map(tickerCoverage.map((row) => [row.ticker, row]));

  const pairCoverage: ResearchPairCoverage[] = pairs.map((pair) => {
    const numerator = tickerCoverageMap.get(pair.numerator);
    const denominator = tickerCoverageMap.get(pair.denominator);
    const missingTickers = [numerator, denominator]
      .filter((row): row is ResearchTickerCoverage => !!row && row.rows === 0)
      .map((row) => row.ticker);

    let coverageStart: string | null = null;
    let coverageEnd: string | null = null;
    let status: ResearchPairCoverageStatus = 'ready';

    if (missingTickers.length > 0 || !numerator || !denominator) {
      status = 'missing_prices';
    } else if (!numerator.startDate || !numerator.endDate || !denominator.startDate || !denominator.endDate) {
      status = 'no_overlap';
    } else {
      coverageStart = numerator.startDate > denominator.startDate ? numerator.startDate : denominator.startDate;
      coverageEnd = numerator.endDate < denominator.endDate ? numerator.endDate : denominator.endDate;
      if (coverageStart > coverageEnd) {
        status = 'no_overlap';
      } else if (Math.min(numerator.rows, denominator.rows) < pair.lookbackDays + 252 + 10) {
        status = 'thin_history';
      }
    }

    return {
      pairId: pair.id,
      label: pair.label,
      numerator: pair.numerator,
      denominator: pair.denominator,
      numeratorRows: numerator?.rows ?? 0,
      denominatorRows: denominator?.rows ?? 0,
      coverageStart,
      coverageEnd,
      missingTickers,
      status,
    };
  });

  return {
    tickers: tickerCoverage,
    pairs: pairCoverage,
    totalPairs: pairCoverage.length,
    readyPairs: pairCoverage.filter((row) => row.status === 'ready').length,
    missingTickers: tickerCoverage
      .filter((row) => row.neededByPairs > 0 && row.rows === 0)
      .map((row) => row.ticker),
  };
}

export async function runAndSaveResearchBacktest(options: {
  startDate: Date;
  endDate: Date;
  pairIds?: string[];
  horizons?: number[];
}): Promise<SavedResearchBacktestRun> {
  const allPairs = getResearchPairs();
  const pairIdSet = options.pairIds ? new Set(options.pairIds) : null;
  const pairs = pairIdSet ? allPairs.filter((pair) => pairIdSet.has(pair.id)) : allPairs;
  if (pairs.length === 0) {
    throw new Error(`No research pairs matched ${options.pairIds?.join(', ') ?? '(empty)'}`);
  }

  const horizons = options.horizons ?? [20, 60, 120, 252];
  const result = await backtestPairSignals({
    pairs,
    startDate: options.startDate,
    endDate: options.endDate,
    horizons,
  });
  const summary = summarizeResearchBacktest(result);
  const id = randomUUID();
  const configHash = currentResearchConfigHash();
  const startDate = options.startDate.toISOString().slice(0, 10);
  const endDate = options.endDate.toISOString().slice(0, 10);
  const pairIds = pairs.map((pair) => pair.id);

  try {
    await prisma.$executeRaw`
      INSERT INTO research_backtest_runs (
        id, "configHash", "engineVersion", "startDate", "endDate",
        horizons, "pairIds", result, summary, status, error
      )
      VALUES (
        ${id}, ${configHash}, ${RESEARCH_BACKTEST_ENGINE_VERSION}, ${startDate}, ${endDate},
        ${horizons}::int[], ${pairIds}::text[], ${JSON.stringify(result)}::jsonb, ${JSON.stringify(summary)}::jsonb,
        'success', NULL
      )
    `;
  } catch (error) {
    if (isMissingResearchRunTableError(error)) {
      throw new Error('research_backtest_runs table is missing. Apply the Prisma schema before saving research backtests.');
    }
    throw error;
  }

  const saved = await loadRunById(id);
  if (!saved) throw new Error(`Research backtest run ${id} was not saved`);
  return saved;
}

export function summarizeResearchBacktest(results: PairBacktestResult[]): ResearchBacktestSummaryRow[] {
  return results.map((result) => {
    const eligible = result.horizons.filter((h) => h.sampleSize >= 5 && h.medianSignedReturn !== null);
    const best = eligible
      .sort((a, b) => {
        const aScore = (a.hitRate ?? 0) * 0.6 + Math.max(-1, Math.min(1, a.medianSignedReturn ?? 0)) * 0.4;
        const bScore = (b.hitRate ?? 0) * 0.6 + Math.max(-1, Math.min(1, b.medianSignedReturn ?? 0)) * 0.4;
        return bScore - aScore;
      })[0] ?? null;
    const longestHorizon = result.horizons[result.horizons.length - 1] ?? null;

    return {
      pairId: result.pair.id,
      label: result.pair.label,
      numerator: result.pair.numerator,
      denominator: result.pair.denominator,
      mode: result.pair.mode,
      numeratorRows: result.coverage.numeratorRows,
      denominatorRows: result.coverage.denominatorRows,
      coverageStart: result.coverage.startDate,
      coverageEnd: result.coverage.endDate,
      currentDate: result.currentSetup?.date ?? null,
      currentZScore: result.currentSetup?.zScore ?? null,
      currentTriggered: result.currentSetup?.triggered ?? null,
      currentSide: result.currentSetup?.side ?? null,
      events: result.events.length,
      bestHorizonDays: best?.horizonDays ?? null,
      bestHitRate: best?.hitRate ?? null,
      bestMedianSignedReturn: best?.medianSignedReturn ?? null,
      longestHorizon,
    };
  });
}

async function loadLatestRun(where: { configHash?: string }): Promise<SavedResearchBacktestRun | null> {
  try {
    const rows = where.configHash
      ? await prisma.$queryRaw<DbRunRow[]>`
          SELECT id, "runAt", "configHash", "engineVersion", "startDate", "endDate",
                 horizons, "pairIds", result, summary, status, error
          FROM research_backtest_runs
          WHERE "configHash" = ${where.configHash}
          ORDER BY "runAt" DESC
          LIMIT 1
        `
      : await prisma.$queryRaw<DbRunRow[]>`
          SELECT id, "runAt", "configHash", "engineVersion", "startDate", "endDate",
                 horizons, "pairIds", result, summary, status, error
          FROM research_backtest_runs
          ORDER BY "runAt" DESC
          LIMIT 1
        `;
    return rows[0] ? normalizeRun(rows[0]) : null;
  } catch (error) {
    if (isMissingResearchRunTableError(error)) return null;
    throw error;
  }
}

async function loadRunById(id: string): Promise<SavedResearchBacktestRun | null> {
  try {
    const rows = await prisma.$queryRaw<DbRunRow[]>`
      SELECT id, "runAt", "configHash", "engineVersion", "startDate", "endDate",
             horizons, "pairIds", result, summary, status, error
      FROM research_backtest_runs
      WHERE id = ${id}
      LIMIT 1
    `;
    return rows[0] ? normalizeRun(rows[0]) : null;
  } catch (error) {
    if (isMissingResearchRunTableError(error)) return null;
    throw error;
  }
}

function normalizeRun(row: DbRunRow): SavedResearchBacktestRun {
  return {
    id: row.id,
    runAt: row.runAt.toISOString(),
    configHash: row.configHash,
    engineVersion: row.engineVersion,
    startDate: row.startDate,
    endDate: row.endDate,
    horizons: row.horizons,
    pairIds: row.pairIds,
    result: row.result as PairBacktestResult[],
    summary: row.summary as ResearchBacktestSummaryRow[],
    status: row.status,
    error: row.error,
  };
}

function isMissingResearchRunTableError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== 'P2010') return false;
  const sqlCode = typeof error.meta?.code === 'string' ? error.meta.code : null;
  return sqlCode === '42P01';
}
