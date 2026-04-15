/**
 * Audit cross-sectional variance of each feature per date.
 * If a feature has zero cross-sectional variance on a date, it can't rank tickers.
 * For US macro factors (growth, inflation, monetary, credit): they're market-level
 * so they should have ~0 variance within the US sector ETF sub-universe.
 */
import { prismaDirectUrl as prisma } from '../../lib/macro-engine/db';

async function main() {
  // Average cross-sectional std per dimension across all dates
  const stats = await prisma.$queryRaw<{
    dim: string; avgCsStd: number; pctZeroCs: number;
  }[]>`
    WITH cs AS (
      SELECT "featureDate",
        STDDEV("zGrowth")    AS sg,
        STDDEV("zInflation") AS si,
        STDDEV("zMonetary")  AS sm,
        STDDEV("zCredit")    AS sc,
        STDDEV("zCarry")     AS scar,
        STDDEV("zEarnings")  AS se
      FROM factor_feature_matrix
      WHERE "featureDate" >= '2010-01-01'
      GROUP BY "featureDate"
    )
    SELECT 'zGrowth'    AS dim, AVG(sg)   AS "avgCsStd", 100.0*SUM(CASE WHEN sg < 0.001 THEN 1 ELSE 0 END)/COUNT(*) AS "pctZeroCs" FROM cs
    UNION ALL
    SELECT 'zInflation',        AVG(si),   100.0*SUM(CASE WHEN si < 0.001 THEN 1 ELSE 0 END)/COUNT(*) FROM cs
    UNION ALL
    SELECT 'zMonetary',         AVG(sm),   100.0*SUM(CASE WHEN sm < 0.001 THEN 1 ELSE 0 END)/COUNT(*) FROM cs
    UNION ALL
    SELECT 'zCredit',           AVG(sc),   100.0*SUM(CASE WHEN sc < 0.001 THEN 1 ELSE 0 END)/COUNT(*) FROM cs
    UNION ALL
    SELECT 'zCarry',            AVG(scar), 100.0*SUM(CASE WHEN scar < 0.001 THEN 1 ELSE 0 END)/COUNT(*) FROM cs
    UNION ALL
    SELECT 'zEarnings',         AVG(se),   100.0*SUM(CASE WHEN se < 0.001 THEN 1 ELSE 0 END)/COUNT(*) FROM cs
  `;
  
  console.log('Cross-sectional feature variance (post-2010, all tickers):');
  console.log('  If avgCsStd ≈ 0 → feature is market-level, cannot rank tickers');
  console.log('  Dim           avgCsStd  %ZeroCS');
  for (const s of stats) {
    const flag = Number(s.avgCsStd) < 0.1 ? ' ← ZERO (market-level, useless for ranking)' : 
                 Number(s.avgCsStd) < 0.5 ? ' ← LOW' : ' ← GOOD';
    console.log(`  ${s.dim.padEnd(14)} ${Number(s.avgCsStd).toFixed(3).padStart(8)}  ${Number(s.pctZeroCs).toFixed(1).padStart(6)}%${flag}`);
  }
  
  // Break down by US sector vs international
  const byGroup = await prisma.$queryRaw<{grp: string; dim: string; avgCsStd: number}[]>`
    WITH tagged AS (
      SELECT 
        "featureDate", ticker,
        CASE WHEN ticker IN ('XLK','XLF','XLE','XLV','XLI','XLY','XLB','XLP','XLU','XLRE') THEN 'US_SECTORS'
             WHEN ticker LIKE 'EW%' OR ticker = 'MCHI' THEN 'INTL'
             ELSE 'OTHER' END AS grp,
        "zGrowth", "zInflation", "zMonetary", "zCredit", "zCarry", "zEarnings"
      FROM factor_feature_matrix
      WHERE "featureDate" >= '2015-01-01'
    ),
    cs AS (
      SELECT "featureDate", grp,
        STDDEV("zGrowth") AS sg, STDDEV("zInflation") AS si,
        STDDEV("zMonetary") AS sm, STDDEV("zCredit") AS sc,
        STDDEV("zCarry") AS scar, STDDEV("zEarnings") AS se
      FROM tagged
      GROUP BY "featureDate", grp
    )
    SELECT grp, 'zGrowth' AS dim, AVG(sg) AS "avgCsStd" FROM cs GROUP BY grp
    UNION ALL SELECT grp, 'zInflation', AVG(si) FROM cs GROUP BY grp
    UNION ALL SELECT grp, 'zMonetary',  AVG(sm) FROM cs GROUP BY grp
    UNION ALL SELECT grp, 'zCredit',    AVG(sc) FROM cs GROUP BY grp
    UNION ALL SELECT grp, 'zCarry',     AVG(scar) FROM cs GROUP BY grp
    UNION ALL SELECT grp, 'zEarnings',  AVG(se) FROM cs GROUP BY grp
    ORDER BY grp, dim
  `;
  
  console.log('\nCross-sectional std by sub-universe (post-2015):');
  const dims = ['zGrowth','zInflation','zMonetary','zCredit','zCarry','zEarnings'];
  const groups = [...new Set(byGroup.map(r => r.grp))].sort();
  console.log('  Dim           ' + groups.map(g => g.padStart(12)).join('  '));
  for (const dim of dims) {
    const vals = groups.map(g => {
      const row = byGroup.find(r => r.grp === g && r.dim === dim);
      return row ? Number(row.avgCsStd).toFixed(3).padStart(12) : '         N/A';
    });
    console.log(`  ${dim.padEnd(14)} ${vals.join('  ')}`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
