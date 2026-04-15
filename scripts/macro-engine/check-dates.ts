import { prismaDirectUrl as prisma } from '../../lib/macro-engine/db';

async function main() {
  const rows = await prisma.$queryRaw<{yr: number; qtr: number; cnt: number}[]>`
    SELECT 
      EXTRACT(year FROM "featureDate")::int AS yr,
      EXTRACT(quarter FROM "featureDate")::int AS qtr,
      COUNT(DISTINCT "featureDate")::int AS cnt
    FROM factor_feature_matrix
    WHERE ticker = 'XLK'
      AND "featureDate" >= '2007-01-01' AND "featureDate" <= '2010-12-31'
    GROUP BY yr, qtr ORDER BY yr, qtr
  `;
  console.log('Feature dates per quarter (XLK):');
  for (const r of rows) console.log(`  ${r.yr} Q${r.qtr}: ${r.cnt} dates`);
  
  const total = await prisma.$queryRaw<{cnt: number}[]>`
    SELECT COUNT(DISTINCT "featureDate")::int AS cnt
    FROM factor_feature_matrix
    WHERE ticker = 'XLK'
      AND "featureDate" >= '2008-01-01' AND "featureDate" < '2022-01-01'
  `;
  console.log(`\nTotal OOS distinct dates (2008-2022): ${total[0].cnt}`);
  console.log(`At 2715 nPeriods and ~48 tickers: ~${Math.round(2715/48)} unique dates`);
}
main().catch(console.error).finally(() => process.exit(0));
