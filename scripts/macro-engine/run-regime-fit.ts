#!/usr/bin/env tsx
// scripts/macro-engine/run-regime-fit.ts
// CLI: fit macro regime clusters, stabilize labels, write DB, validate historical windows.
// Usage: npm run fit:regimes
// Exits 0 on success, 1 on validation failure.

import { classifyRegimes } from '../../lib/macro-engine/regime';
import { prisma } from '../../lib/macro-engine/db';

// ─── Date range ───────────────────────────────────────────────────────────────
// startDate auto-detected from DB if not overridden — prevents fitting on empty history
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
    // ─── Auto-detect start date from DB ────────────────────────────────────
    const earliestFeature = await prisma.factorFeatureMatrix.findFirst({
      orderBy: { featureDate: 'asc' },
      select: { featureDate: true },
    });
    const startDate = process.env.START_DATE
      ? new Date(process.env.START_DATE)
      : (earliestFeature?.featureDate ?? new Date('2003-01-01'));

    // ─── Step 1: Fit regimes ────────────────────────────────────────────────
    console.log(`\nRunning regime classifier: ${startDate.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)}, k=${k}`);
    const result = await classifyRegimes(startDate, endDate, k);
    console.log(`\nFit complete: fitId=${result.fitId}, labels=${result.labelCount}, regimes=[${result.regimeNames.join(', ')}], converged=${result.converged}`);

    // ─── Step 2: Historical validation ─────────────────────────────────────
    // Canonical windows (NBER/Fed documentation). Skip windows that predate available data.
    console.log('\nRunning historical validation...');

    const WINDOWS = [
      { name: '2008 GFC',        start: new Date('2008-09-01'), end: new Date('2009-03-31') },
      { name: '2020 COVID',      start: new Date('2020-02-15'), end: new Date('2020-05-31') },
      { name: '2022 Rate shock', start: new Date('2022-03-01'), end: new Date('2022-12-31') },
    ];

    const availableWindows: Array<{ name: string; label: string }> = [];
    for (const w of WINDOWS) {
      if (w.start < startDate) {
        console.log(`  ${w.name}: SKIPPED — data starts at ${startDate.toISOString().slice(0, 10)}, window needs ${w.start.toISOString().slice(0, 10)}`);
        continue;
      }
      const label = await modalLabel(w.start, w.end).catch(() => null);
      if (!label) {
        console.log(`  ${w.name}: SKIPPED — no regime labels in this window`);
        continue;
      }
      console.log(`  ${w.name} (${w.start.toISOString().slice(0, 10)} – ${w.end.toISOString().slice(0, 10)}): modal regime = "${label}"`);
      availableWindows.push({ name: w.name, label });
    }

    // Assert all available windows map to distinct labels
    const labels = availableWindows.map(w => w.label);
    const uniqueLabels = new Set(labels);
    if (availableWindows.length >= 2 && uniqueLabels.size < availableWindows.length) {
      console.error(`\nVALIDATION FAILED: some shock windows share regime labels`);
      availableWindows.forEach(w => console.error(`  ${w.name}: "${w.label}"`));
      console.error('  Possible causes: k too small (increase k), insufficient historical data, or feature quality issue.');
      process.exit(1);
    }

    if (availableWindows.length < 2) {
      console.log('\nVALIDATION SKIPPED: fewer than 2 shock windows have data (need full ingest to validate 2008/2020/2022).');
    } else {
      console.log('\nVALIDATION PASSED: all available shock windows map to distinct regimes.');
    }
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
