import { addDays } from 'date-fns';
import { prismaDirectUrl as prisma } from '../db';
import type { PairDefinition } from './universe';

const PRICE_BUFFER_DAYS = 10;
const DEFAULT_HORIZONS = [20, 60, 120, 252] as const;

export interface PricePoint {
  date: Date;
  adjClose: number;
}

export interface PairSignalEvent {
  date: string;
  zScore: number;
  side: 'long_numerator' | 'long_denominator';
  mode: PairDefinition['mode'];
}

export interface HorizonStats {
  horizonDays: number;
  sampleSize: number;
  hitRate: number | null;
  avgSignedReturn: number | null;
  medianSignedReturn: number | null;
  bestSignedReturn: number | null;
  worstSignedReturn: number | null;
  worstAdverseMove: number | null;
}

export interface PairBacktestResult {
  pair: PairDefinition;
  coverage: {
    numeratorRows: number;
    denominatorRows: number;
    startDate: string | null;
    endDate: string | null;
  };
  events: PairSignalEvent[];
  horizons: HorizonStats[];
}

interface RatioPoint {
  date: Date;
  ratio: number;
  logRatio: number;
}

export async function loadPriceMap(tickers: string[], startDate: Date, endDate: Date): Promise<Map<string, PricePoint[]>> {
  const out = new Map<string, PricePoint[]>();
  const fetchEnd = addDays(endDate, Math.max(...DEFAULT_HORIZONS) + PRICE_BUFFER_DAYS);

  for (const ticker of tickers) {
    const rows = await prisma.$queryRaw<{ date: Date; adjClose: number }[]>`
      SELECT date, "adjClose"
      FROM ohlcv_daily
      WHERE ticker = ${ticker}
        AND date >= ${startDate}
        AND date <= ${fetchEnd}
      ORDER BY date ASC
    `;
    out.set(
      ticker,
      rows
        .map((row) => ({ date: new Date(row.date), adjClose: Number(row.adjClose) }))
        .filter((row) => Number.isFinite(row.adjClose) && row.adjClose > 0),
    );
  }

  return out;
}

export async function backtestPairSignals(options: {
  pairs: PairDefinition[];
  startDate: Date;
  endDate: Date;
  horizons?: readonly number[];
}): Promise<PairBacktestResult[]> {
  const horizons = options.horizons ?? DEFAULT_HORIZONS;
  const tickers = [...new Set(options.pairs.flatMap((pair) => [pair.numerator, pair.denominator]))];
  const priceMap = await loadPriceMap(tickers, options.startDate, options.endDate);

  return options.pairs.map((pair) => {
    const numerator = priceMap.get(pair.numerator) ?? [];
    const denominator = priceMap.get(pair.denominator) ?? [];
    return backtestPair(pair, numerator, denominator, options.startDate, options.endDate, horizons);
  });
}

export function backtestPair(
  pair: PairDefinition,
  numerator: PricePoint[],
  denominator: PricePoint[],
  startDate: Date,
  endDate: Date,
  horizons: readonly number[] = DEFAULT_HORIZONS,
): PairBacktestResult {
  const ratios = buildRatioSeries(numerator, denominator)
    .filter((point) => point.date >= startDate && point.date <= endDate);
  const events = buildSignalEvents(ratios, pair);
  const horizonStats = horizons.map((horizonDays) => summarizeHorizon(events, ratios, horizonDays));

  return {
    pair,
    coverage: {
      numeratorRows: numerator.length,
      denominatorRows: denominator.length,
      startDate: ratios[0]?.date.toISOString().slice(0, 10) ?? null,
      endDate: ratios[ratios.length - 1]?.date.toISOString().slice(0, 10) ?? null,
    },
    events: events.map((event) => ({
      date: event.date.toISOString().slice(0, 10),
      zScore: event.zScore,
      side: event.side,
      mode: event.mode,
    })),
    horizons: horizonStats,
  };
}

function buildRatioSeries(numerator: PricePoint[], denominator: PricePoint[]): RatioPoint[] {
  const denByDate = new Map(denominator.map((point) => [point.date.toISOString().slice(0, 10), point.adjClose]));
  const ratios: RatioPoint[] = [];

  for (const point of numerator) {
    const key = point.date.toISOString().slice(0, 10);
    const den = denByDate.get(key);
    if (den == null || den <= 0) continue;
    const ratio = point.adjClose / den;
    if (!Number.isFinite(ratio) || ratio <= 0) continue;
    ratios.push({ date: point.date, ratio, logRatio: Math.log(ratio) });
  }

  return ratios.sort((a, b) => a.date.getTime() - b.date.getTime());
}

type InternalEvent = {
  date: Date;
  index: number;
  direction: 1 | -1;
  zScore: number;
  side: PairSignalEvent['side'];
  mode: PairDefinition['mode'];
};

function buildSignalEvents(ratios: RatioPoint[], pair: PairDefinition): InternalEvent[] {
  const events: InternalEvent[] = [];
  let lastEventIndex = -Infinity;

  for (let i = pair.lookbackDays; i < ratios.length; i++) {
    if (i - lastEventIndex < pair.cooldownDays) continue;

    const lookback = ratios.slice(i - pair.lookbackDays, i).map((point) => point.logRatio);
    const z = computeZScore(ratios[i].logRatio, lookback);
    if (z === null || Math.abs(z) < pair.entryZ) continue;

    const direction = pair.mode === 'trend_continuation'
      ? (z > 0 ? 1 : -1)
      : (z > 0 ? -1 : 1);

    events.push({
      date: ratios[i].date,
      index: i,
      zScore: z,
      side: direction === 1 ? 'long_numerator' : 'long_denominator',
      direction,
      mode: pair.mode,
    });
    lastEventIndex = i;
  }

  return events;
}

function summarizeHorizon(events: InternalEvent[], ratios: RatioPoint[], horizonDays: number): HorizonStats {
  const signedReturns: number[] = [];
  const adverseMoves: number[] = [];

  for (const event of events) {
    const endIdx = findIndexAtOrAfter(ratios, addDays(event.date, horizonDays), event.index + 1);
    if (endIdx === null) continue;

    const startLog = ratios[event.index].logRatio;
    const endLog = ratios[endIdx].logRatio;
    signedReturns.push(event.direction * (Math.exp(endLog - startLog) - 1));

    let worst = Infinity;
    for (let i = event.index + 1; i <= endIdx; i++) {
      const pathReturn = event.direction * (Math.exp(ratios[i].logRatio - startLog) - 1);
      if (pathReturn < worst) worst = pathReturn;
    }
    if (Number.isFinite(worst)) adverseMoves.push(Math.min(0, worst));
  }

  return {
    horizonDays,
    sampleSize: signedReturns.length,
    hitRate: signedReturns.length > 0 ? signedReturns.filter((ret) => ret > 0).length / signedReturns.length : null,
    avgSignedReturn: mean(signedReturns),
    medianSignedReturn: median(signedReturns),
    bestSignedReturn: signedReturns.length > 0 ? Math.max(...signedReturns) : null,
    worstSignedReturn: signedReturns.length > 0 ? Math.min(...signedReturns) : null,
    worstAdverseMove: adverseMoves.length > 0 ? Math.min(...adverseMoves) : null,
  };
}

function findIndexAtOrAfter(ratios: RatioPoint[], targetDate: Date, minIndex: number): number | null {
  const maxDate = addDays(targetDate, PRICE_BUFFER_DAYS);
  for (let i = minIndex; i < ratios.length; i++) {
    if (ratios[i].date >= targetDate && ratios[i].date <= maxDate) return i;
    if (ratios[i].date > maxDate) return null;
  }
  return null;
}

function computeZScore(value: number, lookback: number[]): number | null {
  if (lookback.length < 20) return null;
  const avg = lookback.reduce((sum, x) => sum + x, 0) / lookback.length;
  const variance = lookback.reduce((sum, x) => sum + (x - avg) ** 2, 0) / lookback.length;
  const std = Math.sqrt(variance);
  if (std === 0) return null;
  return (value - avg) / std;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, x) => sum + x, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function formatPct(value: number | null, decimals = 1): string {
  if (value === null || Number.isNaN(value)) return 'n/a';
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(decimals)}%`;
}
