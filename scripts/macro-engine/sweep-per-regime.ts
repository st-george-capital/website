/**
 * scripts/macro-engine/sweep-per-regime.ts
 *
 * Chunk 10 — Per-regime parameter sweep.
 *
 * Runs a grid of (longFraction, confidenceExp, volLookbackPeriods) against
 * the holdout replay and reports per-regime Sharpe / hit rate / cum return
 * for each variant. Writes two artifacts:
 *   - stdout: compact pivot table of regime × variant Sharpe
 *   - config/macro-engine/per-regime-overrides.json: the best-performing
 *     variant override block per regime, ready for Chunk 11 to consume.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/macro-engine/sweep-per-regime.ts
 */

if (process.env.DIRECT_URL && process.env.DATABASE_URL?.startsWith('prisma+postgres://')) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
  console.log('sweep-per-regime: using DIRECT_URL');
}

import fs from 'node:fs';
import path from 'node:path';
import {
  runPerRegimeSweep,
  SweepVariant,
  DEFAULT_CONFIG,
  type PerRegimeVariantResult,
  type PerRegimeMetric,
} from '../../lib/macro-engine/backtest';

// Grid: 4 × 4 × 3 = 48 variants. After the initial ~90s preload each variant
// scores the holdout in ~0.4s, so the whole sweep finishes in ~1.5min.
const LONG_FRACTIONS     = [0.15, 0.20, 0.25, 0.30];
const CONFIDENCE_EXPS    = [0.5,  1.0,  1.5,  2.0];
const VOL_LOOKBACKS      = [0,    6,    12];

const VARIANTS: SweepVariant[] = [];
for (const lf of LONG_FRACTIONS) {
  for (const ce of CONFIDENCE_EXPS) {
    for (const vl of VOL_LOOKBACKS) {
      VARIANTS.push({
        label: `lf=${lf.toFixed(2)}|ce=${ce.toFixed(1)}|vl=${vl}`,
        overrides: {
          longFraction:        lf,
          confidenceExp:       ce,
          volLookbackPeriods:  vl,
        },
      });
    }
  }
}

// Minimum active days in a regime before we trust a per-regime Sharpe.
// Thin-sample regimes get their overrides copied from the overall best
// variant instead of a noisy per-regime pick.
const MIN_ACTIVE_DAYS_FOR_PICK = 20;

function printPivot(results: PerRegimeVariantResult[]): string[] {
  const regimes = Array.from(
    new Set(results.flatMap(r => r.byRegime.map(b => b.regime))),
  ).sort();

  const hdr = ['variant'.padEnd(28), 'Overall', ...regimes.map(r => r.padEnd(20))].join(' | ');
  const sep = '-'.repeat(hdr.length);
  console.log('\n=== per-regime Sharpe (net, annualized) ===');
  console.log(hdr);
  console.log(sep);
  for (const r of results) {
    const cells: string[] = [
      r.label.padEnd(28),
      r.overall.sharpeNet.toFixed(2).padStart(7),
      ...regimes.map(reg => {
        const b = r.byRegime.find(x => x.regime === reg);
        if (!b || b.sharpeNet == null) return '   —  '.padEnd(20);
        return `${b.sharpeNet.toFixed(2).padStart(6)} (n=${b.nActive.toString().padStart(3)})`.padEnd(20);
      }),
    ];
    console.log(cells.join(' | '));
  }
  console.log(sep);
  return regimes;
}

function pickBestPerRegime(
  results: PerRegimeVariantResult[],
  regimes: string[],
): Record<string, { variant: string; metric: PerRegimeMetric; overrides: Partial<typeof DEFAULT_CONFIG> }> {
  // Overall-best variant — used as the fallback for thin-sample regimes.
  const overallBest = [...results].sort((a, b) => b.overall.sharpeNet - a.overall.sharpeNet)[0];

  const picks: Record<string, { variant: string; metric: PerRegimeMetric; overrides: Partial<typeof DEFAULT_CONFIG> }> = {};
  for (const regime of regimes) {
    let best: { variant: PerRegimeVariantResult; metric: PerRegimeMetric } | null = null;
    for (const r of results) {
      const m = r.byRegime.find(b => b.regime === regime);
      if (!m || m.sharpeNet == null) continue;
      if (m.nActive < MIN_ACTIVE_DAYS_FOR_PICK) continue;
      if (!best || (m.sharpeNet as number) > (best.metric.sharpeNet as number)) {
        best = { variant: r, metric: m };
      }
    }
    if (best) {
      picks[regime] = {
        variant:   best.variant.label,
        metric:    best.metric,
        overrides: best.variant.overrides,
      };
    } else {
      // Thin-sample or all-gated regime: fall back to the overall-best variant.
      const fallback = overallBest.byRegime.find(b => b.regime === regime);
      picks[regime] = {
        variant:   `${overallBest.label} (fallback — thin sample)`,
        metric:    fallback ?? {
          regime, nActive: 0, nGated: 0, meanExcessNet: 0,
          sharpeNet: null, hitRate: null, cumReturnNet: 1, avgTurnover: 0,
        },
        overrides: overallBest.overrides,
      };
    }
  }
  return picks;
}

async function main() {
  console.log(`\n=== per-regime parameter sweep (${VARIANTS.length} variants) ===`);
  console.log(
    `  longFraction: [${LONG_FRACTIONS.join(', ')}]\n` +
    `  confidenceExp: [${CONFIDENCE_EXPS.join(', ')}]\n` +
    `  volLookback: [${VOL_LOOKBACKS.join(', ')}]\n`,
  );

  const results = await runPerRegimeSweep(VARIANTS);
  const regimes = printPivot(results);

  console.log('\n=== per-regime best pick (min active days for pick = ' + MIN_ACTIVE_DAYS_FOR_PICK + ') ===');
  const picks = pickBestPerRegime(results, regimes);
  for (const regime of regimes) {
    const p = picks[regime];
    const m = p.metric;
    console.log(
      `  ${regime.padEnd(24)} → ${p.variant.padEnd(40)} ` +
      `(Sharpe=${m.sharpeNet?.toFixed(2) ?? '—'}, n=${m.nActive}, hit=${((m.hitRate ?? 0) * 100).toFixed(0)}%, cum=${((m.cumReturnNet - 1) * 100).toFixed(1)}%)`,
    );
  }

  // Persist the pick map for Chunk 11 — regime-conditional config.
  const outFile = path.resolve(process.cwd(), 'config/macro-engine/per-regime-overrides.json');
  const payload = {
    computedAt:         new Date().toISOString(),
    baseConfig:         {
      longFraction:        DEFAULT_CONFIG.longFraction,
      confidenceExp:       DEFAULT_CONFIG.confidenceExp,
      volLookbackPeriods:  DEFAULT_CONFIG.volLookbackPeriods,
    },
    grid:               { LONG_FRACTIONS, CONFIDENCE_EXPS, VOL_LOOKBACKS },
    minActiveDaysForPick: MIN_ACTIVE_DAYS_FOR_PICK,
    perRegime: Object.fromEntries(
      Object.entries(picks).map(([regime, p]) => [
        regime,
        {
          variant:   p.variant,
          overrides: p.overrides,
          sharpeNet: p.metric.sharpeNet,
          nActive:   p.metric.nActive,
          hitRate:   p.metric.hitRate,
          cumReturnNet: p.metric.cumReturnNet,
        },
      ]),
    ),
  };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
  console.log(`\n✓ wrote ${outFile}`);
  console.log('=== sweep complete ===\n');
}

main().catch(e => { console.error(e); process.exit(1); });
