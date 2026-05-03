import { createHash, randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { prismaDirectUrl as prisma } from '../db';
import {
  backtestPairSignals,
  type PairBacktestResult,
  type HorizonStats,
} from './pairBacktest';
import {
  getResearchPairs,
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
  latestForCurrentConfig: SavedResearchBacktestRun | null;
  latestAnyConfig: SavedResearchBacktestRun | null;
  needsRun: boolean;
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
  await ensureResearchBacktestTable();
  const configHash = currentResearchConfigHash();
  const [current, latest] = await Promise.all([
    loadLatestRun({ configHash }),
    loadLatestRun({}),
  ]);

  return {
    currentConfigHash: configHash,
    engineVersion: RESEARCH_BACKTEST_ENGINE_VERSION,
    latestForCurrentConfig: current,
    latestAnyConfig: latest,
    needsRun: current === null,
  };
}

export async function runAndSaveResearchBacktest(options: {
  startDate: Date;
  endDate: Date;
  pairIds?: string[];
  horizons?: number[];
}): Promise<SavedResearchBacktestRun> {
  await ensureResearchBacktestTable();

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
      events: result.events.length,
      bestHorizonDays: best?.horizonDays ?? null,
      bestHitRate: best?.hitRate ?? null,
      bestMedianSignedReturn: best?.medianSignedReturn ?? null,
      longestHorizon,
    };
  });
}

async function ensureResearchBacktestTable(): Promise<void> {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS research_backtest_runs (
      id TEXT PRIMARY KEY,
      "runAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "configHash" TEXT NOT NULL,
      "engineVersion" TEXT NOT NULL,
      "startDate" TEXT NOT NULL,
      "endDate" TEXT NOT NULL,
      horizons INTEGER[] NOT NULL,
      "pairIds" TEXT[] NOT NULL,
      result JSONB NOT NULL,
      summary JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'success',
      error TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS research_backtest_runs_config_runat_idx
    ON research_backtest_runs ("configHash", "runAt" DESC)
  `;
}

async function loadLatestRun(where: { configHash?: string }): Promise<SavedResearchBacktestRun | null> {
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
}

async function loadRunById(id: string): Promise<SavedResearchBacktestRun | null> {
  const rows = await prisma.$queryRaw<DbRunRow[]>`
    SELECT id, "runAt", "configHash", "engineVersion", "startDate", "endDate",
           horizons, "pairIds", result, summary, status, error
    FROM research_backtest_runs
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ? normalizeRun(rows[0]) : null;
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
