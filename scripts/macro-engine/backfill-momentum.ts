/**
 * scripts/macro-engine/backfill-momentum.ts
 *
 * Backfills zCarry column with 6-month cross-sectional price momentum z-score.
 *
 * Why: zCarry is 100% null for US sector ETFs (carry = policy rate differential
 * which is undefined for sectors). Momentum is sector-specific and one of the most
 * robust cross-sectional return predictors. We repurpose the zCarry column.
 *
 * Algorithm:
 *   For each feature date D:
 *     1. Find nearest OHLCV price at D and D-126 trading days (~6 months)
 *     2. 6m return = (price[D] / price[D-126]) - 1
 *     3. Cross-sectionally z-score: (ret - mean) / std across universe for this date
 *     4. Store z-score in zCarry column
 *
 * No look-ahead bias: prices are point-in-time (never revised).
 * Bulk updates via unnest() for speed — one round-trip per 200-date batch.
 *
 * Usage:
 *   DIRECT_URL="" npx tsx scripts/macro-engine/backfill-momentum.ts
 *   DIRECT_URL="" npx tsx scripts/macro-engine/backfill-momentum.ts --from 2022-01-01
 */

import { prismaDirectUrl as prisma } from '../../lib/macro-engine/db';
import { Prisma } from '@prisma/client';

const MOMENTUM_DAYS = 126;
const PRICE_BUFFER  = 5;

const ETF_TICKERS = [
  'EWJ', 'EWG', 'EWU', 'MCHI', 'EWZ', 'EWC', 'EWA',
  'XLK', 'XLF', 'XLE', 'XLV', 'XLI', 'XLY',
];

async function main() {
  const fromArgEq = process.argv.find(a => a.startsWith('--from='));
  const fromArgIdx = process.argv.indexOf('--from');
  const fromArg = fromArgEq
    ? fromArgEq.slice(7)
    : fromArgIdx >= 0 ? process.argv[fromArgIdx + 1] : undefined;
  const fromDate = fromArg ? new Date(fromArg) : new Date('2004-01-01');

  console.log(`backfill-momentum: starting from ${fromDate.toISOString().slice(0, 10)}`);

  // 1. Fetch all OHLCV prices for ETFs
  const priceStart = new Date(fromDate.getTime() - (MOMENTUM_DAYS + 30) * 24 * 60 * 60 * 1000);
  console.log(`  fetching OHLCV from ${priceStart.toISOString().slice(0, 10)}...`);

  const priceMap = new Map<string, { date: Date; adjClose: number }[]>();
  for (const ticker of ETF_TICKERS) {
    const rows = await prisma.$queryRaw<{ date: Date; adjClose: number }[]>`
      SELECT date, "adjClose"
      FROM ohlcv_daily
      WHERE ticker = ${ticker} AND date >= ${priceStart}
      ORDER BY date ASC
    `;
    if (rows.length > 0) {
      priceMap.set(ticker, rows.map(r => ({ date: new Date(r.date), adjClose: Number(r.adjClose) })));
    }
  }
  console.log(`  loaded price data for ${priceMap.size} tickers`);

  // Find nearest price to targetDate within ±buffer days (prefers price at or before)
  function findPrice(prices: { date: Date; adjClose: number }[], targetDate: Date): number | null {
    const tMs = targetDate.getTime();
    const bufMs = PRICE_BUFFER * 86400_000;
    let best: { date: Date; adjClose: number } | null = null;
    for (const p of prices) {
      const pMs = p.date.getTime();
      if (pMs >= tMs - bufMs && pMs <= tMs + bufMs) {
        if (!best || Math.abs(pMs - tMs) < Math.abs(best.date.getTime() - tMs)) best = p;
      }
    }
    return best ? best.adjClose : null;
  }

  // 2. Get all feature dates
  const featureDates = await prisma.$queryRaw<{ featureDate: Date }[]>`
    SELECT DISTINCT "featureDate"
    FROM factor_feature_matrix
    WHERE "featureDate" >= ${fromDate}
      AND ticker = ANY(${ETF_TICKERS}::text[])
    ORDER BY "featureDate" ASC
  `;
  console.log(`  found ${featureDates.length} feature dates to process`);

  // 3. Compute all momentum z-scores in memory
  type Update = { featureDate: Date; ticker: string; zMomentum: number };
  const allUpdates: Update[] = [];
  let skipped = 0;

  for (const { featureDate: rawDate } of featureDates) {
    const featureDate = new Date(rawDate);
    const lookbackDate = new Date(featureDate.getTime() - MOMENTUM_DAYS * 86400_000);

    const returns: { ticker: string; ret: number }[] = [];
    for (const ticker of ETF_TICKERS) {
      const prices = priceMap.get(ticker);
      if (!prices) continue;
      const p0 = findPrice(prices, featureDate);
      const p1 = findPrice(prices, lookbackDate);
      if (p0 === null || p1 === null || p1 <= 0) continue;
      returns.push({ ticker, ret: p0 / p1 - 1 });
    }

    if (returns.length < 3) { skipped++; continue; }

    const vals = returns.map(r => r.ret);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    const std = Math.sqrt(variance);

    for (const { ticker, ret } of returns) {
      allUpdates.push({ featureDate, ticker, zMomentum: std > 0 ? (ret - mean) / std : 0 });
    }
  }

  console.log(`  computed ${allUpdates.length} momentum z-scores (skipped ${skipped} dates)`);

  // 4. Bulk update using unnest() — one SQL call per BATCH_SIZE rows
  const BATCH_SIZE = 500;
  let updatedRows = 0;

  for (let i = 0; i < allUpdates.length; i += BATCH_SIZE) {
    const batch = allUpdates.slice(i, i + BATCH_SIZE);
    const dates = batch.map(u => u.featureDate);
    const tickers = batch.map(u => u.ticker);
    const zScores = batch.map(u => u.zMomentum);

    await prisma.$executeRaw`
      UPDATE factor_feature_matrix AS f
      SET "zCarry" = v.z
      FROM (
        SELECT unnest(${dates}::timestamptz[]) AS fd,
               unnest(${tickers}::text[])      AS tk,
               unnest(${zScores}::float8[])    AS z
      ) AS v
      WHERE f."featureDate" = v.fd AND f.ticker = v.tk
    `;

    updatedRows += batch.length;
    console.log(`  updated ${updatedRows}/${allUpdates.length} rows (batch ${Math.floor(i / BATCH_SIZE) + 1})`);
  }

  console.log(`\nbackfill-momentum: complete — ${updatedRows} rows updated`);
}

main().catch(err => {
  console.error('backfill-momentum failed:', err);
  process.exit(1);
}).finally(() => process.exit(0));
