import { prismaDirectUrl as prisma } from '../../lib/macro-engine/db';

async function main() {
  const run = await prisma.backtestRun.findFirst({
    orderBy: { runAt: 'desc' },
    include: { metrics: true, weightSets: true }
  });
  
  if (!run) { console.log('No backtest run found'); return; }
  
  console.log(`Run: ${run.id}`);
  console.log(`Windows: ${run.windowCount}, stepMonths: ${run.stepMonths}, lambda: ${run.lambdaRidge}`);
  console.log('');
  
  for (const m of run.metrics) {
    console.log(`${m.window}: sharpe=${m.sharpeAnn.toFixed(3)} hitRate=${m.hitRate.toFixed(3)} maxDD=${m.maxDrawdown?.toFixed(3)} nPeriods=${m.nPeriods} [${m.startDate} → ${m.endDate}]`);
  }
  
  console.log('\nWeight sets (final window):');
  for (const ws of run.weightSets.sort((a,b) => a.regimeLabel.localeCompare(b.regimeLabel))) {
    const weights = [ws.wGrowth, ws.wInflation, ws.wMonetary, ws.wCredit, ws.wCarry, ws.wEarnings];
    const formatted = weights.map(w => w.toFixed(3)).join(', ');
    console.log(`  ${ws.regimeLabel.padEnd(25)} [G:${weights[0].toFixed(2)} I:${weights[1].toFixed(2)} M:${weights[2].toFixed(2)} Cr:${weights[3].toFixed(2)} Mo:${weights[4].toFixed(2)} E:${weights[5].toFixed(2)}] n=${ws.sampleCount} fallback=${ws.isFallback}`);
  }
  
  // Regime distribution
  const allRegimes = await prisma.regimeLabel.groupBy({
    by: ['regimeLabel'],
    _count: { regimeLabel: true },
    orderBy: { _count: { regimeLabel: 'desc' } },
  });
  console.log('\nRegime distribution:');
  const total = allRegimes.reduce((s, r) => s + r._count.regimeLabel, 0);
  for (const r of allRegimes) {
    const pct = (r._count.regimeLabel / total * 100).toFixed(1);
    console.log(`  ${r.regimeLabel.padEnd(25)} ${r._count.regimeLabel} days (${pct}%)`);
  }
  
  // Average feature values per regime (to understand what each regime looks like)
  const featuresByRegime = await prisma.$queryRaw<{
    regimeLabel: string;
    avgGrowth: number; avgInflation: number; avgMonetary: number;
    avgCredit: number; avgCarry: number; avgEarnings: number; cnt: number;
  }[]>`
    SELECT rl."regimeLabel",
      AVG(f."zGrowth")    AS "avgGrowth",
      AVG(f."zInflation") AS "avgInflation",
      AVG(f."zMonetary")  AS "avgMonetary",
      AVG(f."zCredit")    AS "avgCredit",
      AVG(f."zCarry")     AS "avgCarry",
      AVG(f."zEarnings")  AS "avgEarnings",
      COUNT(*)::int        AS cnt
    FROM "RegimeLabel" rl
    JOIN factor_feature_matrix f ON f."featureDate" = rl.date
    GROUP BY rl."regimeLabel"
    ORDER BY rl."regimeLabel"
  `;
  
  console.log('\nAvg factor values per regime (macro fingerprint):');
  console.log('  Regime                    Growth  Inflat  Monetary Credit  Momentum Earnings  N');
  for (const r of featuresByRegime) {
    console.log(
      `  ${r.regimeLabel.padEnd(25)} ` +
      `${(r.avgGrowth??0).toFixed(2).padStart(6)}  ` +
      `${(r.avgInflation??0).toFixed(2).padStart(6)}  ` +
      `${(r.avgMonetary??0).toFixed(2).padStart(6)}   ` +
      `${(r.avgCredit??0).toFixed(2).padStart(6)}  ` +
      `${(r.avgCarry??0).toFixed(2).padStart(6)}   ` +
      `${(r.avgEarnings??0).toFixed(2).padStart(6)}   ${r.cnt}`
    );
  }
}

main().catch(console.error).finally(() => process.exit(0));

async function featureStats() {
  const stats = await prisma.$queryRaw<{
    dim: string; avg: number; std: number; min: number; max: number; nullpct: number;
  }[]>`
    SELECT 
      'zGrowth'    AS dim, AVG("zGrowth"),    STDDEV("zGrowth"),    MIN("zGrowth"),    MAX("zGrowth"),    100.0*SUM(CASE WHEN "zGrowth" IS NULL THEN 1 ELSE 0 END)/COUNT(*) AS nullpct FROM factor_feature_matrix WHERE "featureDate" >= '2005-01-01'
    UNION ALL SELECT 'zInflation', AVG("zInflation"), STDDEV("zInflation"), MIN("zInflation"), MAX("zInflation"), 100.0*SUM(CASE WHEN "zInflation" IS NULL THEN 1 ELSE 0 END)/COUNT(*) FROM factor_feature_matrix WHERE "featureDate" >= '2005-01-01'
    UNION ALL SELECT 'zMonetary',  AVG("zMonetary"),  STDDEV("zMonetary"),  MIN("zMonetary"),  MAX("zMonetary"),  100.0*SUM(CASE WHEN "zMonetary" IS NULL THEN 1 ELSE 0 END)/COUNT(*) FROM factor_feature_matrix WHERE "featureDate" >= '2005-01-01'
    UNION ALL SELECT 'zCredit',    AVG("zCredit"),    STDDEV("zCredit"),    MIN("zCredit"),    MAX("zCredit"),    100.0*SUM(CASE WHEN "zCredit" IS NULL THEN 1 ELSE 0 END)/COUNT(*) FROM factor_feature_matrix WHERE "featureDate" >= '2005-01-01'
    UNION ALL SELECT 'zCarry',     AVG("zCarry"),     STDDEV("zCarry"),     MIN("zCarry"),     MAX("zCarry"),     100.0*SUM(CASE WHEN "zCarry" IS NULL THEN 1 ELSE 0 END)/COUNT(*) FROM factor_feature_matrix WHERE "featureDate" >= '2005-01-01'
    UNION ALL SELECT 'zEarnings',  AVG("zEarnings"),  STDDEV("zEarnings"),  MIN("zEarnings"),  MAX("zEarnings"),  100.0*SUM(CASE WHEN "zEarnings" IS NULL THEN 1 ELSE 0 END)/COUNT(*) FROM factor_feature_matrix WHERE "featureDate" >= '2005-01-01'
  `;
  console.log('\nFeature statistics (post-2005, all tickers):');
  console.log('  Dim         Avg    Std    Min    Max    Null%');
  for (const s of stats) {
    console.log(`  ${s.dim.padEnd(12)} ${Number(s.avg).toFixed(2).padStart(5)} ${Number(s.std).toFixed(2).padStart(5)} ${Number(s.min).toFixed(2).padStart(6)} ${Number(s.max).toFixed(2).padStart(6)} ${Number(s.nullpct).toFixed(1).padStart(6)}%`);
  }
}
featureStats().catch(console.error).finally(() => process.exit(0));
