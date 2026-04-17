/**
 * scripts/macro-engine/experiment-longfraction.ts
 *
 * Coarse sweep of `longFraction` (top-fraction of the 17-ETF universe that
 * goes long each date). Thin caller over `runSweep` — shares one DB preload
 * across all variants instead of re-loading per config.
 *
 * Baseline (lf=0.5, pre-Chunk-1): OOS 0.425, Holdout 1.162, OOS MaxDD -0.729.
 * Current default (lf=0.25 post-Chunk-1): OOS 0.456, Holdout 1.327.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/macro-engine/experiment-longfraction.ts
 */

if (process.env.DIRECT_URL && process.env.DATABASE_URL?.startsWith('prisma+postgres://')) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
  console.log('experiment-longfraction: using DIRECT_URL');
}

import { runSweep, SweepVariant } from '../../lib/macro-engine/backtest';

const FRACTIONS = [0.25, 0.33, 0.4, 0.5];
const VARIANTS: SweepVariant[] = FRACTIONS.map((longFraction) => ({
  label:     `lf=${longFraction}`,
  overrides: { longFraction },
}));

async function main() {
  console.log('\n=== longFraction sweep (coarse) ===');
  await runSweep(VARIANTS);
  console.log('\n=== sweep complete ===');
}

main().catch(console.error).finally(() => process.exit(0));
