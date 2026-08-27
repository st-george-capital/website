import type { G10CountryConfig } from '@/lib/g10-rates/config';
import type { FredObservation } from '@/lib/g10-rates/fred';

export type CurveRegime = 'inverted' | 'flat' | 'steep';
export type EasingSignal = 'pricing_cuts' | 'pricing_hikes' | 'neutral';

export interface G10RateChanges {
  short1wBps: number | null;
  short1mBps: number | null;
  long1mBps: number | null;
}

export interface G10RateSpreads {
  curveSlope: number | null;
  frontEndVsPolicy: number | null;
  approximateCutsBps: number | null;
}

export interface G10CountryRates {
  code: string;
  name: string;
  flag: string;
  centralBank: string;
  shortLabel: string;
  notes?: string;
  asOfDate: string | null;
  policyRate: number | null;
  shortYield: number | null;
  longYield: number | null;
  changes: G10RateChanges;
  spreads: G10RateSpreads;
  curveRegime: CurveRegime | null;
  easingSignal: EasingSignal | null;
  dataQuality: 'full' | 'partial' | 'missing';
}

export interface G10RatesDigest {
  headline: string;
  bullets: string[];
  footnote: string;
}

export interface G10RatesPayload {
  generatedAt: string;
  dataSource: 'fred';
  disclaimer: string;
  countries: G10CountryRates[];
  digest: G10RatesDigest;
  warnings: string[];
}

function latestValue(series: FredObservation[] | undefined) {
  if (!series?.length) return { value: null as number | null, date: null as string | null };
  const last = series[series.length - 1];
  return { value: last.value, date: last.date };
}

function valueDaysAgo(series: FredObservation[] | undefined, days: number) {
  if (!series?.length) return null;
  const lastDate = new Date(series[series.length - 1].date);
  const target = new Date(lastDate);
  target.setDate(target.getDate() - days);

  let best: FredObservation | null = null;
  for (const point of series) {
    const pointDate = new Date(point.date);
    if (pointDate <= target) {
      best = point;
    }
  }

  return best?.value ?? series[0]?.value ?? null;
}

function bpsChange(current: number | null, prior: number | null) {
  if (current == null || prior == null) return null;
  return (current - prior) * 100;
}

function classifyCurve(slope: number | null): CurveRegime | null {
  if (slope == null) return null;
  if (slope < -0.1) return 'inverted';
  if (slope > 0.75) return 'steep';
  return 'flat';
}

function classifyEasing(frontEndVsPolicy: number | null): EasingSignal | null {
  if (frontEndVsPolicy == null) return null;
  if (frontEndVsPolicy <= -0.15) return 'pricing_cuts';
  if (frontEndVsPolicy >= 0.15) return 'pricing_hikes';
  return 'neutral';
}

export function buildCountryRates(
  config: G10CountryConfig,
  policySeries: FredObservation[],
  shortSeries: FredObservation[],
  longSeries: FredObservation[]
): G10CountryRates {
  const policy = latestValue(policySeries);
  const short = latestValue(shortSeries);
  const long = latestValue(longSeries);

  const curveSlope =
    short.value != null && long.value != null ? long.value - short.value : null;
  const frontEndVsPolicy =
    short.value != null && policy.value != null ? short.value - policy.value : null;
  const approximateCutsBps =
    policy.value != null && short.value != null
      ? Math.max(0, (policy.value - short.value) * 100)
      : null;

  const hasPolicy = policy.value != null;
  const hasShort = short.value != null;
  const hasLong = long.value != null;
  const dataQuality =
    hasPolicy && hasShort && hasLong ? 'full' : hasShort || hasLong || hasPolicy ? 'partial' : 'missing';

  return {
    code: config.code,
    name: config.name,
    flag: config.flag,
    centralBank: config.centralBank,
    shortLabel: config.shortLabel,
    notes: config.notes,
    asOfDate: short.date ?? long.date ?? policy.date,
    policyRate: policy.value,
    shortYield: short.value,
    longYield: long.value,
    changes: {
      short1wBps: bpsChange(short.value, valueDaysAgo(shortSeries, 7)),
      short1mBps: bpsChange(short.value, valueDaysAgo(shortSeries, 30)),
      long1mBps: bpsChange(long.value, valueDaysAgo(longSeries, 30)),
    },
    spreads: {
      curveSlope,
      frontEndVsPolicy,
      approximateCutsBps,
    },
    curveRegime: classifyCurve(curveSlope),
    easingSignal: classifyEasing(frontEndVsPolicy),
    dataQuality,
  };
}

export function buildG10Digest(countries: G10CountryRates[]): G10RatesDigest {
  const withCuts = countries.filter((country) => country.easingSignal === 'pricing_cuts');
  const inverted = countries.filter((country) => country.curveRegime === 'inverted');
  const repricingDown = countries
    .filter((country) => country.changes.short1mBps != null && country.changes.short1mBps <= -10)
    .sort((left, right) => (left.changes.short1mBps ?? 0) - (right.changes.short1mBps ?? 0));

  const easingNames = withCuts.map((country) => country.code).join(', ') || 'none clearly';
  const invertedNames = inverted.map((country) => country.code).join(', ') || 'none';

  const headline =
    withCuts.length >= 4
      ? `Front-end yields sit below policy in ${withCuts.length} G10 markets — easing is broadly priced.`
      : repricingDown.length > 0
        ? `${repricingDown[0].code} led G10 repricing lower over the past month (${repricingDown[0].changes.short1mBps?.toFixed(0)} bps on the short end).`
        : inverted.length > 0
          ? `Curve inversion persists in ${invertedNames} — growth slowdown risk is still in the rates market.`
          : 'G10 rates are mixed: scan the table for who is pricing cuts vs hikes on the front end.';

  return {
    headline,
    bullets: [
      `Markets pricing cuts (short yield below policy): ${easingNames}.`,
      `Inverted 10Y–short curves: ${invertedNames}.`,
      '“Approx cuts” is a rough 2Y/short-minus-policy proxy — not meeting-by-meeting futures odds.',
      'Use Macro Allocation Engine next if you want country/sector tilts given this backdrop.',
    ],
    footnote:
      'Spot yields from FRED/OECD. This is a rates context dashboard, not CME-style cut probabilities.',
  };
}

export function buildG10RatesPayload(
  countries: G10CountryRates[],
  warnings: string[] = []
): G10RatesPayload {
  return {
    generatedAt: new Date().toISOString(),
    dataSource: 'fred',
    disclaimer:
      'Approximate easing signals use short-end yields vs current policy rates. For true meeting-implied cut/hike odds you need futures/OIS data.',
    countries,
    digest: buildG10Digest(countries),
    warnings,
  };
}
