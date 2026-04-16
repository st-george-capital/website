/**
 * scripts/macro-engine/backfill-momentum-all.ts
 *
 * Backfills zCarry column with 12m-1m skip-month momentum z-score
 * for ALL tickers in the universe (ETFs + equities) in a single cross-section.
 *
 * Why all tickers in one cross-section?
 * The backtest ranks all candidates (ETFs + equities) together on each date.
 * For the z-scores to be meaningful in that cross-section, they must be computed
 * against the same peer group. Z-scoring ETFs separately from equities would
 * produce incomparable scales.
 *
 * Algorithm: same as backfill-momentum.ts but with the full 47-ticker universe.
 *   For each feature date D:
 *     1. Find nearest OHLCV at D-21 (1m ago) and D-252 (12m ago) for each ticker
 *     2. skip-mom return = price[D-21] / price[D-252] - 1
 *     3. Cross-sectionally z-score: (ret - mean) / std across ALL tickers for this date
 *     4. Store z-score in zCarry column (UPDATE only rows that exist in feature matrix)
 *
 * Usage:
 *   DIRECT_URL="" npx tsx scripts/macro-engine/backfill-momentum-all.ts
 *   DIRECT_URL="" npx tsx scripts/macro-engine/backfill-momentum-all.ts --from 2022-01-01
 */

import { prismaDirectUrl as prisma } from '../../lib/macro-engine/db';

const LOOKBACK_DAYS = 252; // 12 months
const SKIP_DAYS     = 21;  // skip last month (reversal removal)
const PRICE_BUFFER  = 5;   // ±5 calendar days to find nearest trading day

// Full universe — must match config/macro-engine/universe.json tickers
const ALL_TICKERS = [
  // Country ETFs
  'EWJ', 'EWG', 'EWU', 'MCHI', 'EWZ', 'EWC', 'EWA',
  // Cross-asset ETFs
  'TLT', 'GLD', 'IWM', 'HYG',
  // Sector ETFs
  'XLK', 'XLF', 'XLE', 'XLV', 'XLI', 'XLY',
  // Tech equities
  'AAPL', 'MSFT', 'NVDA', 'AVGO', 'META',
  // Financials equities
  'JPM', 'BAC', 'WFC', 'MS', 'GS',
  // Energy equities
  'XOM', 'CVX', 'COP', 'SLB', 'PSX',
  // Healthcare equities
  'LLY', 'UNH', 'JNJ', 'ABBV', 'MRK',
  // Industrials equities
  'GE', 'CAT', 'RTX', 'HON', 'UNP',
  // Consumer Discretionary equities
  'AMZN', 'TSLA', 'HD', 'MCD', 'NKE',
];

async function main() {
  const fromArgEq = process.argv.find(a => a.startsWith('--from='));
  const fromArgIdx = process.argv.indexOf('--from');
  const fromArg = fromArgEq
    ? fromArgEq.slice(7)
    : fromArgIdx >= 0 ? process.argv[fromArgIdx + 1] : undefined;
  const fromDate = fromArg ? new Date(fromArg) : new Date('2004-01-01');

  console.log(`backfill-momentum-all: starting from ${fromDate.toISOString().slice(0, 10)}`);
  console.log(`  universe: ${ALL_TICKERS.length} tickers`);

  // 1. Fetch all OHLCV prices for all tickers
  const priceStart = new Date(fromDate.getTime() - (LOOKBACK_DAYS + 30) * 24 * 60 * 60 * 1000);
  console.log(`  fetching OHLCV from ${priceStart.toISOString().slice(0, 10)}...`);

  const priceMap = new Map<string, { date: Date; adjClose: number }[]>();
  for (const ticker of ALL_TICKERS) {
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

  // 2. Get all feature dates across the full universe
  const featureDates = await prisma.$queryRaw<{ featureDate: Date }[]>`
    SELECT DISTINCT "featureDate"
    FROM factor_feature_matrix
    WHERE "featureDate" >= ${fromDate}
      AND ticker = ANY(${ALL_TICKERS}::text[])
    ORDER BY "featureDate" ASC
  `;
  console.log(`  found ${featureDates.length} feature dates to process`);

  // 3. Compute all momentum z-scores in memory
  type Update = { featureDate: Date; ticker: string; zMomentum: number };
  const allUpdates: Update[] = [];
  let skipped = 0;

  for (const { featureDate: rawDate } of featureDates) {
    const featureDate = new Date(rawDate);
    const skipDate     = new Date(featureDate.getTime() - SKIP_DAYS     * 86400_000); // D-21 (1m ago)
    const lookbackDate = new Date(featureDate.getTime() - LOOKBACK_DAYS * 86400_000); // D-252 (12m ago)

    const returns: { ticker: string; ret: number }[] = [];
    for (const ticker of ALL_TICKERS) {
      const prices = priceMap.get(ticker);
      if (!prices) continue;
      const pSkip     = findPrice(prices, skipDate);
      const pLookback = findPrice(prices, lookbackDate);
      if (pSkip === null || pLookback === null || pLookback <= 0) continue;
      returns.push({ ticker, ret: pSkip / pLookback - 1 });
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
    if (i % (BATCH_SIZE * 10) === 0) {
      console.log(`  updated ${updatedRows}/${allUpdates.length} rows (batch ${Math.floor(i / BATCH_SIZE) + 1})`);
    }
  }

  console.log(`\nbackfill-momentum-all: complete — ${updatedRows} rows updated`);
}

main().catch(err => {
  console.error('backfill-momentum-all failed:', err);
  process.exit(1);
}).finally(() => process.exit(0));
