/**
 * scripts/macro-engine/experiment-longfraction2.ts
 *
 * Fine-grained sweep around the current best (lf=0.25), testing 0.10–0.35.
 * Thin caller over `runSweep` — single shared preload across variants.
 *
 * Baseline (lf=0.25, post-Chunk-1): OOS 0.456, Holdout 1.327.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/macro-engine/experiment-longfraction2.ts
 */

if (process.env.DIRECT_URL && process.env.DATABASE_URL?.startsWith('prisma+postgres://')) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
  console.log('experiment-longfraction2: using DIRECT_URL');
}

import { runSweep, SweepVariant } from '../../lib/macro-engine/backtest';

const FRACTIONS = [0.10, 0.15, 0.20, 0.25, 0.30, 0.35];
const VARIANTS: SweepVariant[] = FRACTIONS.map((longFraction) => ({
  label:     `lf=${longFraction.toFixed(2)}`,
  overrides: { longFraction },
}));

async function main() {
  console.log('\n=== longFraction sweep (fine, 0.10–0.35) ===');
  await runSweep(VARIANTS);
  console.log('\n=== sweep complete ===');
}

main().catch(console.error).finally(() => process.exit(0));
