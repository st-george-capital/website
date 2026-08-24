// One-off seed script for the baseline OptimizationConstraintSet — see plan Section 12,
// step 7 ("Constraint CRUD + seed default 'Late-Cycle Defensive Baseline' constraint set
// with the confirmed ~57.5% US target and defensive sector/factor floors").
//
// Run once after `npm run db:push` has applied the new CVaR optimizer Prisma models:
//   node scripts/seed-cvar-constraint-set.js
//
// This is idempotent-ish: it always creates a new row (constraint sets are versioned by
// row, like OptimizationConstraintSet's design intends — each run can reference a
// different constraintSetId), but it deactivates any other currently-active set first so
// there's only ever one unambiguous "active" set for /api/tools/cvar-optimizer/run to
// pick up by default. Re-running this script will create additional rows — that's fine,
// just deactivate/delete old ones via the Constraints tab UI if you don't want duplicates.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Region target: US ~57.5% (~12.5pt underweight vs MSCI World's ~70% US weight), per the
// confirmed decision — encoded as a [0.55, 0.60] band centered near 57.5%.
const REGION_LIMITS = {
  US: { min: 0.55, max: 0.60 },
  Europe: { min: 0.20, max: 0.30 },
  Japan: { min: 0.05, max: 0.15 },
  APAC_Other: { min: 0, max: 0.10 },
};

// Defensive sector floors (staples/utilities/healthcare) + growth/cyclical caps, sized
// for a concentrated ~15-30 name book — bands intentionally wider than a diversified
// index fund's sector bands would be, since a handful of positions can swing a sector's
// aggregate weight by several points here.
const SECTOR_LIMITS = {
  'Consumer Staples': { min: 0.10, max: 0.30 },
  'Utilities': { min: 0.05, max: 0.20 },
  'Health Care': { min: 0.10, max: 0.30 },
  'Information Technology': { min: 0, max: 0.30 },
  'Financials': { min: 0, max: 0.25 },
  'Energy': { min: 0, max: 0.15 },
  'Industrials': { min: 0, max: 0.20 },
  'Materials': { min: 0, max: 0.15 },
  'Consumer Discretionary': { min: 0, max: 0.20 },
  'Communication Services': { min: 0, max: 0.15 },
};

// Factor floors: positive tilt toward Quality and low-Volatility (encoded as the
// "volatility" factor, which is already inverted so higher = lower realized vol),
// consistent with the late-cycle/recessionary thesis. Targets are portfolio-weighted-
// average cross-sectional z-score floors, not absolute levels.
const FACTOR_TILTS = {
  quality: { target: 0.25 },
  volatility: { target: 0.25 },
};

async function main() {
  console.log('Seeding baseline OptimizationConstraintSet: "Late-Cycle Defensive Baseline"...');

  const existingActive = await prisma.optimizationConstraintSet.findMany({ where: { isActive: true } });
  if (existingActive.length > 0) {
    await prisma.optimizationConstraintSet.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    console.log(`Deactivated ${existingActive.length} previously-active constraint set(s).`);
  }

  // NOTE: createdBy should be a real admin User.id in your database. This script uses the
  // first admin user found; adjust the WHERE below if you want a specific user attributed.
  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!adminUser) {
    throw new Error('No admin user found in the database — create one first (npm run create-admin), then re-run this script.');
  }

  const constraintSet = await prisma.optimizationConstraintSet.create({
    data: {
      name: 'Late-Cycle Defensive Baseline',
      isActive: true,
      sectorLimits: SECTOR_LIMITS,
      regionLimits: REGION_LIMITS,
      factorTilts: FACTOR_TILTS,
      maxSinglePositionWeight: 0.15,
      turnoverLimit: null,
      cvarConfidence: 0.95,
      cvarHorizonDays: 20,
      createdBy: adminUser.id,
    },
  });

  console.log(`✓ Created constraint set "${constraintSet.name}" (id: ${constraintSet.id})`);
  console.log('  Region limits:', JSON.stringify(REGION_LIMITS));
  console.log('  Sector limits:', JSON.stringify(SECTOR_LIMITS));
  console.log('  Factor tilts:', JSON.stringify(FACTOR_TILTS));
}

main()
  .catch((e) => {
    console.error('Error seeding CVaR constraint set:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
