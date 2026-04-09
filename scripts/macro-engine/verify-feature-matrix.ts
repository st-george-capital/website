#!/usr/bin/env npx tsx
// scripts/macro-engine/verify-feature-matrix.ts
//
// Standalone CLI: reads N sample rows from the DB, rebuilds in-memory with buildFeatureRow,
// then runs the structural look-ahead bias test and prints a coverage report.
//
// Usage:
//   npx tsx scripts/macro-engine/verify-feature-matrix.ts [--sample N] [--date YYYY-MM-DD]
//
// Exit codes:
//   0 — clean (no look-ahead violations; coverage warnings do not cause non-zero exit)
//   1 — look-ahead violation detected

import { parseArgs } from 'node:util';
import { prisma } from '../../lib/macro-engine/db';
import { getUniverse } from '../../lib/macro-engine/universe';
import { buildFeatureRow } from '../../lib/macro-engine/features/index';
import { assertNoLookAhead } from '../../lib/macro-engine/features/lookahead-test';
import type { UniverseEntry } from '../../lib/macro-engine/types';

const { values } = parseArgs({
  options: {
    sample: { type: 'string', default: '50' },
    date:   { type: 'string' },
  },
});

const sampleSize = parseInt(values.sample ?? '50', 10);

// Load N sample rows from the feature matrix, spread across dates
const dbRows = await prisma.$queryRaw<{ featureDate: Date; ticker: string }[]>`
  SELECT DISTINCT feature_date AS "featureDate", ticker
  FROM factor_feature_matrix
  ORDER BY feature_date DESC
  LIMIT ${sampleSize}
`;

if (dbRows.length === 0) {
  console.log('No rows in factor_feature_matrix — run scripts/macro-engine/run-feature-build.ts first');
  await prisma.$disconnect();
  process.exit(0);
}

const universe = getUniverse();
const universeMap = new Map<string, UniverseEntry>(universe.map((e: UniverseEntry) => [e.ticker, e]));

const dateRange = {
  min: dbRows.reduce((m, r) => r.featureDate < m ? r.featureDate : m, dbRows[0].featureDate),
  max: dbRows.reduce((m, r) => r.featureDate > m ? r.featureDate : m, dbRows[0].featureDate),
};

console.log(`Verifying look-ahead bias: rebuilding ${dbRows.length} sample rows...`);
console.log(`Date range: ${dateRange.min.toISOString().slice(0, 10)} — ${dateRange.max.toISOString().slice(0, 10)}`);

const eligibleRows = dbRows.filter(r => universeMap.has(r.ticker));
const skipped = dbRows.length - eligibleRows.length;
if (skipped > 0) {
  console.warn(`Warning: ${skipped} row(s) skipped — ticker not found in current universe config`);
}

const rebuilt = await Promise.all(
  eligibleRows.map(r => buildFeatureRow(r.featureDate, universeMap.get(r.ticker)!))
);

// Run structural look-ahead test
let exitCode = 0;
try {
  assertNoLookAhead(rebuilt);
  console.log('PASS: No look-ahead bias detected in sampled rows.');
} catch (e: unknown) {
  console.error('FAIL: Look-ahead bias detected!');
  console.error((e as Error).message);
  exitCode = 1;
}

// Coverage check: how many rows have at least 3 non-null z-scores
const withData = rebuilt.filter(r =>
  [r.zGrowth, r.zInflation, r.zMonetary, r.zCredit, r.zCarry, r.zEarnings]
    .filter(v => v !== null).length >= 3
);
const coveragePct = rebuilt.length > 0
  ? Math.round((withData.length / rebuilt.length) * 100)
  : 0;

console.log(`Coverage: ${withData.length}/${rebuilt.length} rows have >=3 non-null z-scores (${coveragePct}%)`);
if (coveragePct < 50) {
  console.warn('WARNING: Coverage below 50% — feature matrix may have insufficient source data');
}

await prisma.$disconnect();
process.exit(exitCode);
