// lib/macro-engine/features/lookahead-test.ts
//
// Structural look-ahead bias test for the feature matrix pipeline.
// Asserts that every source data date used to build a feature row is <= that row's featureDate.
//
// This is a structural test — it reads the sourceDataMaxDates map populated by buildFeatureRow.
// It does NOT re-query the database; it trusts the dates reported by each factor compute function.

import type { FeatureRow } from '../types';

export interface LookAheadViolation {
  ticker: string;
  featureDate: Date;
  factor: string;
  sourceDataDate: Date;
  daysAhead: number;
}

export function assertNoLookAhead(rows: FeatureRow[]): void {
  const violations: LookAheadViolation[] = [];

  for (const row of rows) {
    for (const [factor, sourceDate] of Object.entries(row.sourceDataMaxDates)) {
      if (sourceDate > row.featureDate) {
        const daysAhead = Math.round(
          (sourceDate.getTime() - row.featureDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        violations.push({
          ticker:         row.ticker,
          featureDate:    row.featureDate,
          factor,
          sourceDataDate: sourceDate,
          daysAhead,
        });
      }
    }
  }

  if (violations.length > 0) {
    const lines = violations.map(v =>
      `  VIOLATION: ticker=${v.ticker} factor=${v.factor} featureDate=${v.featureDate.toISOString().slice(0, 10)} sourceDate=${v.sourceDataDate.toISOString().slice(0, 10)} (+${v.daysAhead} days)`
    );
    throw new Error(
      `Look-ahead bias detected in ${violations.length} feature row(s):\n${lines.join('\n')}\n\n` +
      `These factor compute functions returned source data dated AFTER the feature date. ` +
      `Fix the underlying query to enforce the asOfDate ceiling.`
    );
  }
}
