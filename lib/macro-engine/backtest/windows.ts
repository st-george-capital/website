// lib/macro-engine/backtest/windows.ts
// Walk-forward window generator for Phase 4 backtesting engine.
// Uses expanding training windows (train always starts at dataStart).

import { addMonths } from 'date-fns';
import { BacktestWindow, BacktestConfig, HOLDOUT_START, assertNotHoldout } from './types';

/**
 * Generates an array of non-overlapping expanding walk-forward windows.
 * Training window grows from dataStart to trainEnd.
 * Test window is fixed at config.stepMonths months.
 * ALL windows end before HOLDOUT_START — any window crossing that boundary is dropped.
 */
export function generateWindows(config: BacktestConfig): BacktestWindow[] {
  const windows: BacktestWindow[] = [];

  // First test window starts after trainMinYears of training data
  let testStart = addMonths(config.dataStart, config.trainMinYears * 12);

  while (true) {
    const testEnd = addMonths(testStart, config.stepMonths);

    // Drop any window that touches the holdout period
    if (testStart >= HOLDOUT_START) break;

    // Cap testEnd at holdout boundary — do not allow partial overlap
    const cappedTestEnd = testEnd > HOLDOUT_START ? HOLDOUT_START : testEnd;

    // Enforce boundary (assertNotHoldout on training ceiling = testStart)
    assertNotHoldout(testStart);

    windows.push({
      trainStart: config.dataStart,
      trainEnd:   testStart,       // exclusive: training uses date < testStart
      testStart,
      testEnd:    cappedTestEnd,
    });

    testStart = cappedTestEnd;

    // If we've reached or exceeded holdout, stop
    if (testStart >= HOLDOUT_START) break;
  }

  return windows;
}
