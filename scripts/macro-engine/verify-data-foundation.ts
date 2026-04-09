/**
 * scripts/macro-engine/verify-data-foundation.ts
 *
 * Hard-failing Phase 1 audit gate.
 * Exits non-zero if ANY check fails; exits 0 only when ALL checks pass.
 *
 * Run: npm run verify:data
 *
 * Manual verification notes (cannot be automated here):
 * - ALFRED vintage accuracy: compare getFredAsOf result against
 *   https://alfred.stlouisfed.org/series?seid=GDP for the same observation date.
 * - TimescaleDB hypertable catalog:
 *     SELECT hypertable_name, num_chunks, compression_enabled
 *     FROM timescaledb_information.hypertables;
 *   Expected: ohlcv_daily (compression=true), macro_series_vintage,
 *   earnings_revisions, oecd_leading_indicators.
 */

import {
  getOhlcvCoverage,
  getFredVintageIntegrity,
  getFredAsOf,
  getRevisions,
  getOecdCli,
} from '../../lib/macro-engine/query';
import { getUniverse, getByType, getCountries } from '../../lib/macro-engine/universe';

type CheckResult = { label: string; passed: boolean; detail?: string };

function pass(label: string, detail?: string): CheckResult {
  return { label, passed: true, detail };
}

function fail(label: string, detail?: string): CheckResult {
  return { label, passed: false, detail };
}

function print(result: CheckResult): void {
  const tag = result.passed ? '[PASS]' : '[FAIL]';
  const detail = result.detail ? ` — ${result.detail}` : '';
  console.log(`${tag} ${result.label}${detail}`);
}

async function checkOhlcvCoverage(): Promise<CheckResult[]> {
  const universe = getUniverse();
  const coverage = await getOhlcvCoverage();
  const coverageMap = new Map(coverage.map((r) => [r.ticker, r]));

  const results: CheckResult[] = [];

  for (const entry of universe) {
    const row = coverageMap.get(entry.ticker);
    const inception = new Date(entry.inceptionDate);
    const inceptionPlus30 = new Date(inception.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (!row) {
      results.push(fail(
        `OHLCV coverage: ${entry.ticker}`,
        'no rows found in ohlcv_daily'
      ));
      continue;
    }

    const rowCount = Number(row.rowCount);
    if (rowCount < 4000) {
      results.push(fail(
        `OHLCV coverage: ${entry.ticker}`,
        `rowCount=${rowCount} (need >= 4000)`
      ));
      continue;
    }

    if (row.earliest > inceptionPlus30) {
      results.push(fail(
        `OHLCV coverage: ${entry.ticker}`,
        `earliest=${row.earliest.toISOString().slice(0, 10)} > inceptionDate+30=${inceptionPlus30.toISOString().slice(0, 10)}`
      ));
      continue;
    }

    results.push(pass(
      `OHLCV coverage: ${entry.ticker}`,
      `rows=${rowCount}, earliest=${row.earliest.toISOString().slice(0, 10)}, latest=${row.latest.toISOString().slice(0, 10)}`
    ));
  }

  return results;
}

async function checkInceptionDateCompliance(): Promise<CheckResult> {
  const universe = getUniverse();
  const violations: string[] = [];

  for (const entry of universe) {
    const inception = new Date(entry.inceptionDate);
    const rows = await getOhlcvCoverage();
    const row = rows.find((r) => r.ticker === entry.ticker);
    if (row && row.earliest < inception) {
      violations.push(`${entry.ticker}: earliest=${row.earliest.toISOString().slice(0, 10)} < inception=${entry.inceptionDate}`);
    }
  }

  if (violations.length > 0) {
    return fail('Inception-date compliance', violations.join('; '));
  }
  return pass('Inception-date compliance', 'no pre-inception rows found');
}

async function checkFredVintageIntegrity(): Promise<CheckResult> {
  const integrity = await getFredVintageIntegrity();
  const bad = integrity.filter((r) => r.missingVintage > 0);

  if (bad.length > 0) {
    const detail = bad.map((r) => `${r.seriesId}:${r.missingVintage} missing`).join(', ');
    return fail('ALFRED vintage integrity (no NULL realtimeStart)', detail);
  }
  return pass('ALFRED vintage integrity (no NULL realtimeStart)', 'all rows have realtimeStart');
}

async function checkFredPointInTime(): Promise<CheckResult> {
  // GDP advance estimate for Q4 2009 (published ~late Jan / early Feb 2010)
  const seriesId = 'GDP';
  const observationDate = new Date('2009-10-01'); // Q4 2009 observation period start
  const asOfDate = new Date('2010-03-31');         // as of end of Q1 2010

  const row = await getFredAsOf(seriesId, observationDate, asOfDate);

  if (!row) {
    return fail(
      'FRED point-in-time spot check (GDP)',
      `getFredAsOf('GDP', 2009-10-01, 2010-03-31) returned null — ensure GDP vintage data is ingested`
    );
  }

  // Log value for manual confirmation against ALFRED website
  console.log(
    `  [INFO] FRED GDP as of 2010-03-31 (obs 2009-10-01): value=${row.value}, ` +
    `realtimeStart=${row.realtimeStart.toISOString().slice(0, 10)}, ` +
    `realtimeEnd=${row.realtimeEnd.toISOString().slice(0, 10)}`
  );
  console.log(
    `  [INFO] Manual check: verify at https://alfred.stlouisfed.org/series?seid=GDP ` +
    `that the advance estimate published ~2010-01-29 matches this value.`
  );

  return pass(
    'FRED point-in-time spot check (GDP)',
    `value=${row.value} (verify manually against ALFRED advance estimate)`
  );
}

async function checkEarningsRevisionPresence(): Promise<CheckResult[]> {
  const equities = getByType('equity');

  if (equities.length === 0) {
    return [pass('Earnings revision presence', 'no equities in universe — check skipped')];
  }

  const results: CheckResult[] = [];
  for (const entry of equities) {
    const revisions = await getRevisions(entry.ticker, new Date());
    if (revisions.length === 0) {
      results.push(fail(`Earnings revisions: ${entry.ticker}`, 'no EarningsRevision rows found'));
    } else {
      results.push(pass(`Earnings revisions: ${entry.ticker}`, `${revisions.length} rows`));
    }
  }
  return results;
}

async function checkOecdCoverage(): Promise<CheckResult[]> {
  const countries = getCountries();
  const results: CheckResult[] = [];

  for (const country of countries) {
    const rows = await getOecdCli(country, new Date('1990-01-01'), new Date());
    if (rows.length < 12) {
      results.push(fail(
        `OECD CLI coverage: ${country}`,
        `only ${rows.length} rows (need >= 12)`
      ));
    } else {
      results.push(pass(
        `OECD CLI coverage: ${country}`,
        `${rows.length} rows`
      ));
    }
  }

  return results;
}

async function main(): Promise<void> {
  console.log('=== Phase 1 Data Foundation Verification ===\n');

  const allResults: CheckResult[] = [];

  // 1. OHLCV 20+ year coverage
  const ohlcvResults = await checkOhlcvCoverage();
  allResults.push(...ohlcvResults);

  // 2. Inception-date compliance (reuse coverage data)
  const inceptionResult = await checkInceptionDateCompliance();
  allResults.push(inceptionResult);

  // 3. ALFRED vintage integrity
  const integrityResult = await checkFredVintageIntegrity();
  allResults.push(integrityResult);

  // 4. FRED point-in-time spot check
  const pitResult = await checkFredPointInTime();
  allResults.push(pitResult);

  // 5. Earnings revision presence
  const revisionsResults = await checkEarningsRevisionPresence();
  allResults.push(...revisionsResults);

  // 6. OECD coverage
  const oecdResults = await checkOecdCoverage();
  allResults.push(...oecdResults);

  console.log('\n=== Results ===\n');
  for (const result of allResults) {
    print(result);
  }

  const failures = allResults.filter((r) => !r.passed);
  console.log(`\n${allResults.length - failures.length}/${allResults.length} checks passed.`);

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Verification script error:', err);
  process.exit(1);
});
