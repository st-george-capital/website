/**
 * scripts/macro-engine/backfill-new-etf-rows.ts
 *
 * Fast-path to insert FactorFeatureMatrix rows for new ETFs that have no
 * country/sector macro features. All macro dimensions (zGrowth, zInflation,
 * zMonetary, zCredit, zEarnings) are null — only zCarry (momentum) matters
 * and will be populated by backfill-momentum.ts afterwards.
 *
 * Inserts one row per (ticker, featureDate) for all existing feature dates,
 * skipping dates that already have a row for that ticker.
 *
 * Usage:
 *   DIRECT_URL="" npx tsx scripts/macro-engine/backfill-new-etf-rows.ts
 */
import { prismaDirectUrl as prisma } from '../../lib/macro-engine/db';

const NEW_TICKERS = ['TLT', 'GLD', 'IWM', 'HYG'];

async function main() {
  // Get all distinct feature dates (from existing tickers)
  const dates = await prisma.$queryRaw<{ featureDate: Date }[]>`
    SELECT DISTINCT "featureDate"
    FROM factor_feature_matrix
    ORDER BY "featureDate" ASC
  `;
  console.log(`Found ${dates.length} feature dates to backfill`);

  for (const ticker of NEW_TICKERS) {
    // Check how many rows already exist
    const existing = await prisma.$queryRaw<{ cnt: number }[]>`
      SELECT COUNT(*)::int AS cnt
      FROM factor_feature_matrix
      WHERE ticker = ${ticker}
    `;
    const existingCount = existing[0].cnt;
    console.log(`${ticker}: ${existingCount} rows already exist`);

    if (existingCount >= dates.length) {
      console.log(`  skipping — already complete`);
      continue;
    }

    // Bulk insert missing dates using unnest + INSERT ON CONFLICT DO NOTHING
    const BATCH = 500;
    let inserted = 0;

    for (let i = 0; i < dates.length; i += BATCH) {
      const batch = dates.slice(i, i + BATCH);
      const batchDates = batch.map(d => d.featureDate);
      const batchTickers = batch.map(() => ticker);

      const now = new Date();
      const dataAsOfs = batch.map(() => now);
      await prisma.$executeRaw`
        INSERT INTO factor_feature_matrix ("featureDate", ticker, "zGrowth", "zInflation", "zMonetary", "zCredit", "zCarry", "zEarnings", "dataAsOf")
        SELECT unnest(${batchDates}::timestamptz[]),
               unnest(${batchTickers}::text[]),
               NULL, NULL, NULL, NULL, NULL, NULL,
               unnest(${dataAsOfs}::timestamptz[])
        ON CONFLICT ("featureDate", ticker) DO NOTHING
      `;
      inserted += batch.length;
      if (i % (BATCH * 10) === 0) {
        console.log(`  ${ticker}: inserted up to ${inserted}/${dates.length}`);
      }
    }
    console.log(`  ${ticker}: done — ${inserted} rows upserted`);
  }

  console.log('\nbackfill-new-etf-rows: complete');
}

main().catch(console.error).finally(() => process.exit(0));
