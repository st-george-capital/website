// lib/macro-engine/features/index.ts
import { eachDayOfInterval, isWeekend } from 'date-fns';
import { prisma } from '../db';
import type { FeatureRow, UniverseEntry } from '../types';
import { computeGrowthFactor }       from './factors/growth';
import { computeInflationFactor }    from './factors/inflation';
import { computeMonetaryFactor }     from './factors/monetary';
import { computeCreditFactor }       from './factors/credit';
import { computeCarryFactor }        from './factors/carry';
import { computeEarningsFactor }     from './factors/earnings';
import { computeCountryHealthScore } from './factors/country-health';
import { computeFlowsRegimeScore }   from './factors/flows-regime';
import { computeCrossSection }       from './cross-section';

export async function buildFeatureRow(
  asOfDate: Date,
  entry: UniverseEntry
): Promise<FeatureRow> {
  const [growth, inflation, monetary, credit, carry, earnings, flows] = await Promise.all([
    computeGrowthFactor(asOfDate, entry.country),
    computeInflationFactor(asOfDate),
    computeMonetaryFactor(asOfDate),
    computeCreditFactor(asOfDate),
    computeCarryFactor(asOfDate, entry.country),
    computeEarningsFactor(asOfDate, entry.ticker),
    computeFlowsRegimeScore(asOfDate),
  ]);

  const healthResult = entry.country
    ? await computeCountryHealthScore(entry.country)
    : { value: null, sourceMaxDate: null, vintage: null };

  const sourceDataMaxDates: Record<string, Date> = {};
  if (growth.sourceMaxDate)    sourceDataMaxDates.growth    = growth.sourceMaxDate;
  if (inflation.sourceMaxDate) sourceDataMaxDates.inflation = inflation.sourceMaxDate;
  if (monetary.sourceMaxDate)  sourceDataMaxDates.monetary  = monetary.sourceMaxDate;
  if (credit.sourceMaxDate)    sourceDataMaxDates.credit    = credit.sourceMaxDate;
  if (carry.sourceMaxDate)     sourceDataMaxDates.carry     = carry.sourceMaxDate;
  if (earnings.sourceMaxDate)  sourceDataMaxDates.earnings  = earnings.sourceMaxDate;
  if (flows.sourceMaxDate)     sourceDataMaxDates.flows     = flows.sourceMaxDate;

  return {
    featureDate:          asOfDate,
    ticker:               entry.ticker,
    countryCode:          entry.country,
    zGrowth:              growth.value,
    zInflation:           inflation.value,
    zMonetary:            monetary.value,
    zCredit:              credit.value,
    zCarry:               carry.value,
    zEarnings:            earnings.value,
    rankGrowth:           null,
    rankInflation:        null,
    rankMonetary:         null,
    rankCredit:           null,
    rankCarry:            null,
    rankEarnings:         null,
    countryHealthScore:   healthResult.value,
    flowsRegimeScore:     flows.value,
    countryHealthVintage: healthResult.vintage ?? null,
    dataAsOf:             asOfDate,
    sourceDataMaxDates,
  };
}

export async function buildFeatureMatrix(
  startDate: Date,
  endDate: Date,
  universe: UniverseEntry[]
): Promise<number> {
  const allDays = eachDayOfInterval({ start: startDate, end: endDate })
    .filter(d => !isWeekend(d));

  let rowsWritten = 0;

  for (let di = 0; di < allDays.length; di++) {
    const date = allDays[di];

    const rows: FeatureRow[] = await Promise.all(
      universe.map(entry => buildFeatureRow(date, entry))
    );

    const ranked = computeCrossSection(rows);

    for (const row of ranked) {
      // Strip sourceDataMaxDates before upsert — not a DB column
      const { sourceDataMaxDates: _smd, ...dbRow } = row;
      await prisma.factorFeatureMatrix.upsert({
        where: { featureDate_ticker: { featureDate: row.featureDate, ticker: row.ticker } },
        create: dbRow,
        update: dbRow,
      });
      rowsWritten++;
    }

    if (di % 20 === 0) {
      console.log(`Building ${date.toISOString().slice(0, 10)}: ${di + 1}/${allDays.length} dates processed`);
    }
  }

  return rowsWritten;
}
