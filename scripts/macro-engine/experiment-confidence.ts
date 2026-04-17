/**
 * scripts/macro-engine/experiment-confidence.ts
 *
 * Sweep `confidenceExp` (position-size exponent on regime confidence):
 *   positionSize = min(1, (confidence * 2)^exp)
 * - exp=0   → no confidence scaling (full exposure always)
 * - exp=0.5 → softer; keeps more exposure during regime transitions
 * - exp=1   → linear (current default)
 * - exp=2   → harder; cuts exposure aggressively when uncertain
 *
 * Thin caller over `runSweep`.
 * Baseline (exp=1, lf=0.25, post-Chunk-1): OOS 0.456, Holdout 1.327.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/macro-engine/experiment-confidence.ts
 */

if (process.env.DIRECT_URL && process.env.DATABASE_URL?.startsWith('prisma+postgres://')) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
  console.log('experiment-confidence: using DIRECT_URL');
}

import { runSweep, SweepVariant } from '../../lib/macro-engine/backtest';

const EXPONENTS = [0, 0.5, 0.75, 1.0, 1.5, 2.0];
const VARIANTS: SweepVariant[] = EXPONENTS.map((confidenceExp) => ({
  label:     `exp=${confidenceExp.toFixed(2)}`,
  overrides: { confidenceExp },
}));

async function main() {
  console.log('\n=== confidenceExp sweep ===');
  await runSweep(VARIANTS);
  console.log('\n=== sweep complete ===');
}

main().catch(console.error).finally(() => process.exit(0));
