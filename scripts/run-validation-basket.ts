// One-time build-validation script — see plan Section 5a / Section 12 step 6.
//
// Runs the full pipeline (price backfill -> factor computation -> CVaR optimization ->
// stress test) against the diverse MSCI World validation basket (lib/quant/validation-
// basket.ts), BEFORE trusting the same pipeline against the fund's real, smaller, less
// diverse holdings. This is a one-time sanity check during implementation, not a
// persistent feature — there is no API route or UI for it; it's a ts-node/tsx script.
//
// This basket is intentionally NOT stored as Holding rows (it isn't part of the fund's
// real portfolio) and its results are NOT persisted as a SavedOptimizationRun (that model
// is scoped to the fund's real holdings/constraint sets) — this script just prints a
// sanity-check summary to the console for a human to eyeball.
//
// Usage (after `npm install` and with a real DATABASE_URL / POLYGON_API_KEY /
// ALPHA_VANTAGE_API_KEY configured):
//   npx tsx scripts/run-validation-basket.ts
//
// Expected sanity checks per the plan:
//   - Defensive/quality names (JNJ, PG, KO, NEE, NSRGY, UL, ...) should score favorably
//     on the quality/volatility factors relative to higher-beta names in the basket.
//   - The optimizer should converge to status: 'optimal' under
//     VALIDATION_BASKET_CONSTRAINT_SET.
//   - Sector/region weight math should sum correctly and respect the configured bands.

import { getOrBackfillPriceHistory } from '../lib/market-data/price-history';
import { recomputeFactorExposures } from '../lib/quant/factors';
import {
  buildScenarioMatrix,
  buildLPModel,
  solveOptimization,
  BENCHMARK_TICKER,
  type PriceHistoryPoint,
  type HoldingUniverseEntry,
  type FactorExposureMap,
} from '../lib/quant/cvar-optimizer';
import { runHistoricalStressTests } from '../lib/quant/stress-test';
import { VALIDATION_BASKET, VALIDATION_BASKET_TICKERS, VALIDATION_BASKET_CONSTRAINT_SET } from '../lib/quant/validation-basket';
import { prisma } from '../lib/prisma';

async function main() {
  console.log(`Validation basket: ${VALIDATION_BASKET.length} tickers across ${new Set(VALIDATION_BASKET.map((e) => e.region)).size} regions, ${new Set(VALIDATION_BASKET.map((e) => e.sector)).size} sectors.`);

  console.log('\n[1/4] Backfilling price history (this can take a while — sequential, rate-limited)...');
  const allTickers = [...VALIDATION_BASKET_TICKERS, BENCHMARK_TICKER];
  const backfillResults = await getOrBackfillPriceHistory(allTickers);
  const failed = backfillResults.filter((r) => r.status === 'error');
  console.log(`  Backfilled ${backfillResults.length - failed.length}/${backfillResults.length} tickers successfully.`);
  if (failed.length > 0) {
    console.warn('  Failed tickers:', failed.map((f) => `${f.ticker} (${f.error})`).join(', '));
  }

  console.log('\n[2/4] Computing factor exposures...');
  const factorScores = await recomputeFactorExposures(VALIDATION_BASKET_TICKERS, new Date());
  const defensiveTickers = ['JNJ', 'PG', 'KO', 'NEE', 'NSRGY', 'UL', 'SNY'];
  console.log('  Quality/Volatility scores for known defensive names (sanity check — expect positive-leaning):');
  for (const t of defensiveTickers) {
    const s = factorScores.find((f) => f.ticker === t);
    if (s) console.log(`    ${t}: quality=${s.quality?.toFixed(2) ?? 'null'}, volatility(inv)=${s.volatility?.toFixed(2) ?? 'null'}, dataComplete=${s.dataComplete}`);
  }

  console.log('\n[3/4] Building scenarios and solving the CVaR LP...');
  const priceHistoryByTicker: Record<string, PriceHistoryPoint[]> = {};
  for (const ticker of VALIDATION_BASKET_TICKERS) {
    const rows = await prisma.priceHistory.findMany({ where: { ticker }, orderBy: { date: 'asc' }, select: { date: true, close: true } });
    priceHistoryByTicker[ticker] = rows.map((r) => ({ ticker, date: r.date, close: r.close }));
  }
  const scenarios = buildScenarioMatrix(priceHistoryByTicker, VALIDATION_BASKET_CONSTRAINT_SET.cvarHorizonDays);
  console.log(`  ${scenarios.scenarioCount} aligned overlapping scenarios built.`);
  if (scenarios.scenarioCount < 10) {
    console.error(`  Only ${scenarios.scenarioCount} aligned scenarios — too few for a meaningful CVaR estimate (need >= 10). Check that price backfill above actually succeeded for all/most tickers, and that they have enough overlapping trading-date coverage. Aborting before the LP solve.`);
    process.exit(1);
  }

  const factorExposureMap: FactorExposureMap = {};
  for (const s of factorScores) {
    factorExposureMap[s.ticker] = { value: s.value, growth: s.growth, momentum: s.momentum, quality: s.quality, volatility: s.volatility, size: s.size };
  }

  const universe: HoldingUniverseEntry[] = VALIDATION_BASKET.map((e) => ({
    ticker: e.ticker,
    sector: e.sector,
    region: e.region,
    currentWeight: 1 / VALIDATION_BASKET.length, // equal-weight placeholder "current" for turnover math (unused — no turnover limit set)
  }));

  const build = buildLPModel(scenarios, factorExposureMap, universe, VALIDATION_BASKET_CONSTRAINT_SET);
  const result = solveOptimization(build);
  console.log(`  Solver status: ${result.status}`);
  if (result.status === 'optimal') {
    console.log(`  Expected CVaR (95%, ${VALIDATION_BASKET_CONSTRAINT_SET.cvarHorizonDays}d horizon): ${result.cvar !== null ? (result.cvar * 100).toFixed(2) + '%' : 'N/A (solver reported optimal but no numeric objective value — check diagnostics)'}`);
    const sectorWeights: Record<string, number> = {};
    const regionWeights: Record<string, number> = {};
    for (const e of universe) {
      const w = result.weights[e.ticker] ?? 0;
      sectorWeights[e.sector!] = (sectorWeights[e.sector!] ?? 0) + w;
      regionWeights[e.region!] = (regionWeights[e.region!] ?? 0) + w;
    }
    console.log('  Region weights:', Object.fromEntries(Object.entries(regionWeights).map(([k, v]) => [k, `${(v * 100).toFixed(1)}%`])));
    console.log('  Sector weights:', Object.fromEntries(Object.entries(sectorWeights).map(([k, v]) => [k, `${(v * 100).toFixed(1)}%`])));

    console.log('\n[4/4] Running historical stress tests against the validation-basket target weights...');
    const stressResults = await runHistoricalStressTests(result.weights);
    for (const sr of stressResults) {
      console.log(`  ${sr.window.label}: portfolio=${sr.portfolioReturn !== null ? (sr.portfolioReturn * 100).toFixed(1) + '%' : 'N/A'}, URTH=${sr.benchmarkReturn !== null ? (sr.benchmarkReturn * 100).toFixed(1) + '%' : 'N/A'} — ${sr.coverageNote}`);
    }
  } else {
    console.warn('  Optimizer did not converge to optimal — diagnostics:', result.diagnostics);
    console.log('\n[4/4] Skipped stress tests (no optimal target weights).');
  }

  console.log('\nDone. Eyeball the above against the sanity checks described in this file\'s header comment before running against real fund holdings.');
}

main()
  .catch((e) => {
    console.error('Validation basket run failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
