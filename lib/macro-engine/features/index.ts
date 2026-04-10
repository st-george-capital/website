// lib/macro-engine/features/index.ts
import { eachDayOfInterval, isWeekend } from 'date-fns';
import { prismaDirectUrl as prisma } from '../db';
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
import { clearFredRangeCache }       from '../query';

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

    // Clear FRED range cache so all tickers on this date share cached results
    clearFredRangeCache();

    const rows: FeatureRow[] = await Promise.all(
      universe.map(entry => buildFeatureRow(date, entry))
    );

    const ranked = computeCrossSection(rows);

    // Batch upsert via raw SQL — avoids Prisma Accelerate 10s per-query timeout
    // that ORM upsert triggers (SELECT + INSERT/UPDATE as two round trips)
    for (const row of ranked) {
      const { sourceDataMaxDates: _smd, ...dbRow } = row;
      await prisma.$executeRaw`
        INSERT INTO factor_feature_matrix (
          "featureDate", ticker, "countryCode",
          "zGrowth", "zInflation", "zMonetary", "zCredit", "zCarry", "zEarnings",
          "rankGrowth", "rankInflation", "rankMonetary", "rankCredit", "rankCarry", "rankEarnings",
          "countryHealthScore", "flowsRegimeScore", "countryHealthVintage", "dataAsOf", "builtAt"
        ) VALUES (
          ${dbRow.featureDate}, ${dbRow.ticker}, ${dbRow.countryCode},
          ${dbRow.zGrowth}, ${dbRow.zInflation}, ${dbRow.zMonetary}, ${dbRow.zCredit}, ${dbRow.zCarry}, ${dbRow.zEarnings},
          ${dbRow.rankGrowth}, ${dbRow.rankInflation}, ${dbRow.rankMonetary}, ${dbRow.rankCredit}, ${dbRow.rankCarry}, ${dbRow.rankEarnings},
          ${dbRow.countryHealthScore}, ${dbRow.flowsRegimeScore}, ${dbRow.countryHealthVintage}, ${dbRow.dataAsOf}, NOW()
        )
        ON CONFLICT ("featureDate", ticker) DO UPDATE SET
          "countryCode" = EXCLUDED."countryCode",
          "zGrowth" = EXCLUDED."zGrowth", "zInflation" = EXCLUDED."zInflation",
          "zMonetary" = EXCLUDED."zMonetary", "zCredit" = EXCLUDED."zCredit",
          "zCarry" = EXCLUDED."zCarry", "zEarnings" = EXCLUDED."zEarnings",
          "rankGrowth" = EXCLUDED."rankGrowth", "rankInflation" = EXCLUDED."rankInflation",
          "rankMonetary" = EXCLUDED."rankMonetary", "rankCredit" = EXCLUDED."rankCredit",
          "rankCarry" = EXCLUDED."rankCarry", "rankEarnings" = EXCLUDED."rankEarnings",
          "countryHealthScore" = EXCLUDED."countryHealthScore",
          "flowsRegimeScore" = EXCLUDED."flowsRegimeScore",
          "countryHealthVintage" = EXCLUDED."countryHealthVintage",
          "dataAsOf" = EXCLUDED."dataAsOf",
          "builtAt" = NOW()
      `;
      rowsWritten++;
    }

    if (di % 20 === 0) {
      console.log(`Building ${date.toISOString().slice(0, 10)}: ${di + 1}/${allDays.length} dates processed`);
    }
  }

  return rowsWritten;
}
