#!/usr/bin/env tsx
// scripts/macro-engine/verify-regime-stability.ts
// Stability check: run classifier twice on same data, assert 100% label agreement.
// Usage: npm run verify:regime-stability
// Exits 0 if stable, 1 if labels differ between runs.

import { classifyRegimes } from '../../lib/macro-engine/regime';
import { prisma } from '../../lib/macro-engine/db';

const startDate = new Date('2003-01-01');
const endDate = new Date('2023-12-31'); // Fixed window for reproducibility
const k = 4;

async function getLabels(): Promise<Map<string, string>> {
  const rows = await prisma.regimeLabel.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    orderBy: { date: 'asc' },
    select: { date: true, regimeLabel: true },
  });
  return new Map(rows.map(r => [r.date.toISOString().slice(0, 10), r.regimeLabel]));
}

async function main() {
  try {
    console.log('Run 1: fitting regimes...');
    await classifyRegimes(startDate, endDate, k);
    const labels1 = await getLabels();

    console.log('Run 2: fitting regimes again (same data, should produce identical labels)...');
    await classifyRegimes(startDate, endDate, k);
    const labels2 = await getLabels();

    let agree = 0;
    let disagree = 0;
    const disagreements: string[] = [];

    for (const [date, label1] of labels1) {
      const label2 = labels2.get(date);
      if (label1 === label2) {
        agree++;
      } else {
        disagree++;
        if (disagreements.length < 5) {
          disagreements.push(`  ${date}: run1="${label1}" run2="${label2}"`);
        }
      }
    }

    const agreementPct = (agree / (agree + disagree)) * 100;
    console.log(`\nLabel agreement: ${agree}/${agree + disagree} dates (${agreementPct.toFixed(1)}%)`);

    if (disagree > 0) {
      console.error('\nSTABILITY CHECK FAILED: label disagreements found');
      disagreements.forEach(d => console.error(d));
      console.error('\nPossible causes: template matching not working, seed not effective, or DB state issue.');
      process.exit(1);
    }

    console.log('STABILITY CHECK PASSED: 100% label agreement across two runs.');
    process.exit(0);
  } catch (err) {
    console.error('Stability check failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
