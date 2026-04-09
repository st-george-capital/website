#!/usr/bin/env tsx
// scripts/macro-engine/run-regime-fit.ts
// CLI: fit macro regime clusters, stabilize labels, write DB, validate historical windows.
// Usage: npm run fit:regimes
// Exits 0 on success, 1 on validation failure.

import { classifyRegimes } from '../../lib/macro-engine/regime';
import { prisma } from '../../lib/macro-engine/db';

// ─── Date range ───────────────────────────────────────────────────────────────
const startDate = process.env.START_DATE
  ? new Date(process.env.START_DATE)
  : new Date('2003-01-01');
const endDate = process.env.END_DATE
  ? new Date(process.env.END_DATE)
  : new Date();
const k = parseInt(process.env.REGIME_K ?? '4', 10);

// ─── Validation helpers ───────────────────────────────────────────────────────
/**
 * Returns the modal (most frequent) regime label within a date window.
 * Queries RegimeLabel DB table directly for the given window.
 */
async function modalLabel(windowStart: Date, windowEnd: Date): Promise<string> {
  const rows = await prisma.regimeLabel.findMany({
    where: { date: { gte: windowStart, lte: windowEnd } },
    select: { regimeLabel: true },
  });
  if (rows.length === 0) {
    throw new Error(`No regime labels found for window ${windowStart.toISOString().slice(0, 10)} – ${windowEnd.toISOString().slice(0, 10)}`);
  }
  const counts = new Map<string, number>();
  for (const { regimeLabel } of rows) {
    counts.set(regimeLabel, (counts.get(regimeLabel) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

async function main() {
  try {
    // ─── Step 1: Fit regimes ────────────────────────────────────────────────
    console.log(`\nRunning regime classifier: ${startDate.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)}, k=${k}`);
    const result = await classifyRegimes(startDate, endDate, k);
    console.log(`\nFit complete: fitId=${result.fitId}, labels=${result.labelCount}, regimes=[${result.regimeNames.join(', ')}], converged=${result.converged}`);

    // ─── Step 2: Historical validation ─────────────────────────────────────
    console.log('\nRunning historical validation...');

    // Canonical windows (NBER/Fed documentation — do NOT change)
    const gfcLabel   = await modalLabel(new Date('2008-09-01'), new Date('2009-03-31'));
    const covidLabel = await modalLabel(new Date('2020-02-15'), new Date('2020-05-31'));
    const rateLabel  = await modalLabel(new Date('2022-03-01'), new Date('2022-12-31'));

    console.log(`  2008 GFC (2008-09-01 – 2009-03-31):       modal regime = "${gfcLabel}"`);
    console.log(`  2020 COVID (2020-02-15 – 2020-05-31):     modal regime = "${covidLabel}"`);
    console.log(`  2022 Rate shock (2022-03-01 – 2022-12-31): modal regime = "${rateLabel}"`);

    // Assert all three are distinct
    if (gfcLabel === covidLabel || gfcLabel === rateLabel || covidLabel === rateLabel) {
      console.error(`\nVALIDATION FAILED: shock windows share regime labels`);
      console.error(`  GFC="${gfcLabel}", COVID="${covidLabel}", Rate="${rateLabel}"`);
      console.error('  Expected: all three windows map to distinct regimes.');
      console.error('  Possible causes: k too small (increase k), insufficient historical data, or feature quality issue.');
      process.exit(1);
    }

    console.log('\nVALIDATION PASSED: all three shock windows map to distinct regimes.');
    console.log('Regime fit complete.');
    process.exit(0);
  } catch (err) {
    console.error('\nRegime fit failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
