/**
 * scripts/macro-engine/experiment-credit-gate.ts
 *
 * Compares credit-regime gate strategies.
 *
 * Background: default gates ALL regime labels containing "credit" → flat.
 * Regime-0-credit centroid zCredit=-0.875 (risk-ON, should NOT gate).
 * Regime-3-credit centroid zCredit~0.000 (neutral).
 * Regime-4-credit centroid zCredit=+0.663 (genuine stress).
 *
 * Thin caller over `runSweep`.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/macro-engine/experiment-credit-gate.ts
 */

if (process.env.DIRECT_URL && process.env.DATABASE_URL?.startsWith('prisma+postgres://')) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
  console.log('experiment-credit-gate: using DIRECT_URL');
}

import { runSweep, SweepVariant } from '../../lib/macro-engine/backtest';

const VARIANTS: SweepVariant[] = [
  { label: 'gate-all',          overrides: {} }, // default: all credit labels
  { label: 'gate-stress-only',  overrides: { creditGateLabels: ['Regime-4-credit'] } },
  { label: 'gate-3-and-4',      overrides: { creditGateLabels: ['Regime-3-credit', 'Regime-4-credit'] } },
  { label: 'gate-none',         overrides: { creditGateEnabled: false } },
];

async function main() {
  console.log('\n=== credit-gate strategy sweep ===');
  await runSweep(VARIANTS);
  console.log('\n=== sweep complete ===');
}

main().catch(console.error).finally(() => process.exit(0));
