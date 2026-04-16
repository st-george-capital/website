/**
 * scripts/macro-engine/experiment-longfraction.ts
 *
 * Sweep longFraction values (0.25, 0.33, 0.4, 0.5) to find optimal portfolio concentration.
 * All runs use skipPersist=true — results logged only, no DB writes.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/macro-engine/experiment-longfraction.ts
 */

// Swap Accelerate URL for direct Postgres URL (bulk reads)
if (process.env.DIRECT_URL && process.env.DATABASE_URL?.startsWith('prisma+postgres://')) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
  console.log('experiment-longfraction: using DIRECT_URL');
}

import { runBacktest, DEFAULT_CONFIG } from '../../lib/macro-engine/backtest';

const FRACTIONS = [0.25, 0.33, 0.4, 0.5];

async function main() {
  console.log('\n=== longFraction sweep ===');
  console.log('Baseline (0.5): OOS 0.425, Holdout 1.162, OOS MaxDD -0.729\n');

  for (const longFraction of FRACTIONS) {
    console.log(`\n--- longFraction=${longFraction} ---`);
    try {
      await runBacktest({ ...DEFAULT_CONFIG, longFraction, skipPersist: true });
    } catch (e) {
      console.error(`FAILED: ${e}`);
    }
  }

  console.log('\n=== sweep complete ===');
}

main().catch(console.error).finally(() => process.exit(0));
