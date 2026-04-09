#!/usr/bin/env npx tsx
import { parseArgs } from 'node:util';
import { subYears } from 'date-fns';
import { getUniverse } from '../../lib/macro-engine/universe';
import { buildFeatureMatrix } from '../../lib/macro-engine/features/index';

const { values } = parseArgs({
  options: {
    start: { type: 'string' },
    end:   { type: 'string' },
  },
});

const endDate   = values.end   ? new Date(values.end)   : new Date();
const startDate = values.start ? new Date(values.start) : subYears(endDate, 30);

console.log(`Building feature matrix: ${startDate.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)}`);

const universe = getUniverse();
console.log(`Universe: ${universe.length} entries`);

try {
  const count = await buildFeatureMatrix(startDate, endDate, universe);
  console.log(`Done. Wrote ${count} rows.`);
  process.exit(0);
} catch (err) {
  console.error('Feature build failed:', err);
  process.exit(1);
}
