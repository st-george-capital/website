// lib/macro-engine/recommendations/convictionWeight.ts
//
// Chunk 12 — Conviction-weighted basket sizing.
// Takes the engine's equal-weight basket (rank-ordered by 12m momentum) and
// reweights it using a conviction function, then applies sector + country
// exposure caps so no single sleeve dominates the portfolio.
//
// The engine itself remains equal-weighted for backtest reproducibility.
// This module is a POST-PROCESSING pass used by the dashboard
// Recommendation card to produce actionable per-ticker target weights
// without invalidating the validated historical Sharpe.

import { getUniverse } from '../universe';
import type { UniverseEntry } from '../types';

export type ConvictionMethod = 'rank' | 'softmax-zcarry';

export interface ConvictionWeightingOptions {
  method?:          ConvictionMethod;  // default 'rank'
  /** softmax temperature — only used when method === 'softmax-zcarry'. Lower = more concentrated. */
  softmaxTau?:      number;
  /** max fraction of basket notional in any single country, default 0.60 (60%) */
  maxPerCountry?:   number;
  /** max fraction of basket notional in any single sector, default 0.50 (50%) */
  maxPerSector?:    number;
  /** max fraction for any single ticker, default 0.35 (35%) */
  maxPerTicker?:    number;
}

export interface RecommendedBasketEntry {
  ticker:       string;
  equalWeight:  number;   // what the backtest actually used
  convWeight:   number;   // what the recommendation says to use
  rawWeight:    number;   // pre-cap conviction weight (diagnostic)
  score:        number;   // underlying momentum rank / z-score
  sector:       string | null;
  country:      string | null;
  name:         string;
  capReason:    string | null; // e.g. "country-US cap" when trimmed
}

export interface RecommendationOutput {
  method:       ConvictionMethod;
  maxPerTicker: number;
  maxPerSector: number;
  maxPerCountry:number;
  basket:       RecommendedBasketEntry[];
  exposures: {
    bySector:  Record<string, number>;
    byCountry: Record<string, number>;
  };
  trimmed: boolean;  // true if any cap was binding
}

/**
 * Compute conviction weights + apply category caps for a single
 * rebalance-day basket. `basket` is assumed to come ordered by descending
 * score (highest conviction first), matching the engine's own ordering.
 */
export function buildRecommendation(
  basket: Array<{ ticker: string; score: number }>,
  options: ConvictionWeightingOptions = {},
): RecommendationOutput {
  const method        = options.method        ?? 'rank';
  const tau           = options.softmaxTau    ?? 1.0;
  const maxPerCountry = options.maxPerCountry ?? 0.60;
  const maxPerSector  = options.maxPerSector  ?? 0.50;
  const maxPerTicker  = options.maxPerTicker  ?? 0.35;

  if (basket.length === 0) {
    return {
      method, maxPerTicker, maxPerSector, maxPerCountry,
      basket: [],
      exposures: { bySector: {}, byCountry: {} },
      trimmed: false,
    };
  }

  const meta = tickersMeta(basket.map(b => b.ticker));

  // ── Step 1: raw conviction weights ──────────────────────────────────────
  let raw: number[];
  if (method === 'softmax-zcarry') {
    // Softmax(score / tau). Robust to absolute scale (subtract max for
    // numerical stability) and produces a smooth concentration knob.
    const maxScore = Math.max(...basket.map(b => b.score));
    const exps = basket.map(b => Math.exp((b.score - maxScore) / tau));
    const sum = exps.reduce((a, b) => a + b, 0);
    raw = exps.map(v => v / sum);
  } else {
    // Linear rank weighting: top rank gets N, next N-1, ..., last gets 1.
    // Intuitive and self-normalizing regardless of underlying score scale.
    const N = basket.length;
    const ranks = basket.map((_, i) => N - i);
    const sum = ranks.reduce((a, b) => a + b, 0);
    raw = ranks.map(r => r / sum);
  }

  const equalW = 1 / basket.length;

  // ── Step 2: per-ticker cap ─────────────────────────────────────────────
  // Iteratively clip tickers above maxPerTicker and redistribute the
  // overflow among the remaining tickers proportionally. Converges in ≤N
  // passes — the only numerical concern is the rare case where the per-
  // ticker cap is set so low that clipping cannot leave enough headroom
  // (sum(caps) < 1), which we guard against by falling back to equal.
  let capped = [...raw];
  const capReason: (string | null)[] = new Array(basket.length).fill(null);
  if (basket.length * maxPerTicker < 1) {
    capped = new Array(basket.length).fill(equalW);
    for (let i = 0; i < basket.length; i++) capReason[i] = 'cap-too-tight → equal weight';
  } else {
    for (let iter = 0; iter < basket.length; iter++) {
      let overflow = 0;
      const frozen = new Array(basket.length).fill(false);
      for (let i = 0; i < basket.length; i++) {
        if (capped[i] > maxPerTicker) {
          overflow += capped[i] - maxPerTicker;
          capped[i] = maxPerTicker;
          frozen[i] = true;
          capReason[i] = 'per-ticker cap';
        }
      }
      if (overflow <= 1e-12) break;
      const freeSum = capped.reduce((s, v, i) => s + (frozen[i] ? 0 : v), 0);
      if (freeSum <= 1e-12) break;
      for (let i = 0; i < basket.length; i++) {
        if (!frozen[i]) capped[i] += overflow * (capped[i] / freeSum);
      }
    }
  }

  // ── Step 3: category caps (country, sector) ────────────────────────────
  // Same iterative trim/redistribute pattern. Each iteration scales down
  // any offending country or sector bucket to the cap, then redistributes
  // pro-rata to tickers NOT in any offending bucket. Frozen tickers (per-
  // ticker capped) don't receive redistribution — they'd just overflow
  // again next iteration. We cap the iterations at 10 to guarantee
  // termination for pathological universes.
  for (let iter = 0; iter < 10; iter++) {
    const byCountry = new Map<string, number>();
    const bySector  = new Map<string, number>();
    for (let i = 0; i < basket.length; i++) {
      const t = meta.get(basket[i].ticker);
      if (!t) continue;
      if (t.country) byCountry.set(t.country, (byCountry.get(t.country) ?? 0) + capped[i]);
      if (t.sector)  bySector.set(t.sector,  (bySector.get(t.sector)  ?? 0) + capped[i]);
    }

    let redistributed = 0;
    const offendingCountries = [...byCountry.entries()].filter(([, v]) => v > maxPerCountry + 1e-9);
    const offendingSectors   = [...bySector.entries()].filter(([, v]) => v > maxPerSector + 1e-9);
    if (offendingCountries.length === 0 && offendingSectors.length === 0) break;

    for (const [country, weight] of offendingCountries) {
      const scale = maxPerCountry / weight;
      for (let i = 0; i < basket.length; i++) {
        const t = meta.get(basket[i].ticker);
        if (t?.country === country) {
          const trimmed = capped[i] * (1 - scale);
          capped[i] -= trimmed;
          redistributed += trimmed;
          if (capReason[i] == null) capReason[i] = `country-${country} cap`;
        }
      }
    }
    for (const [sector, weight] of offendingSectors) {
      const scale = maxPerSector / weight;
      for (let i = 0; i < basket.length; i++) {
        const t = meta.get(basket[i].ticker);
        if (t?.sector === sector) {
          const trimmed = capped[i] * (1 - scale);
          capped[i] -= trimmed;
          redistributed += trimmed;
          if (capReason[i] == null) capReason[i] = `sector-${sector} cap`;
        }
      }
    }

    // Redistribute to tickers that were not themselves just trimmed AND
    // are not in any offending category. Proportional to current weight.
    const eligibleIdx: number[] = [];
    for (let i = 0; i < basket.length; i++) {
      const t = meta.get(basket[i].ticker);
      const inOffendingCountry = t?.country != null && offendingCountries.some(([c]) => c === t.country);
      const inOffendingSector  = t?.sector  != null && offendingSectors.some(([s]) => s === t.sector);
      if (inOffendingCountry || inOffendingSector) continue;
      if (capped[i] >= maxPerTicker - 1e-9) continue;
      eligibleIdx.push(i);
    }
    if (eligibleIdx.length === 0 || redistributed <= 1e-12) break;
    const freeSum = eligibleIdx.reduce((s, i) => s + capped[i], 0);
    if (freeSum <= 1e-12) {
      // no headroom via pro-rata — split equally
      for (const i of eligibleIdx) capped[i] += redistributed / eligibleIdx.length;
    } else {
      for (const i of eligibleIdx) capped[i] += redistributed * (capped[i] / freeSum);
    }
  }

  // ── Step 4: final renormalize (guards against numerical drift) ─────────
  const finalSum = capped.reduce((a, b) => a + b, 0);
  if (finalSum > 0) for (let i = 0; i < capped.length; i++) capped[i] /= finalSum;

  const out: RecommendedBasketEntry[] = basket.map((b, i) => {
    const m = meta.get(b.ticker);
    return {
      ticker:      b.ticker,
      equalWeight: equalW,
      convWeight:  capped[i],
      rawWeight:   raw[i],
      score:       b.score,
      sector:      m?.sector  ?? null,
      country:     m?.country ?? null,
      name:        m?.name ?? b.ticker,
      capReason:   capReason[i],
    };
  });

  const bySector:  Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  for (const row of out) {
    if (row.sector)  bySector[row.sector]   = (bySector[row.sector]   ?? 0) + row.convWeight;
    if (row.country) byCountry[row.country] = (byCountry[row.country] ?? 0) + row.convWeight;
  }
  const trimmed = out.some(r => r.capReason != null);

  return {
    method, maxPerTicker, maxPerSector, maxPerCountry,
    basket: out,
    exposures: { bySector, byCountry },
    trimmed,
  };
}

// Historical data note: single-stocks in universe.json use sector-ETF
// tickers as their sector (AAPL→"XLK"), while sector ETFs use human
// names ("Technology"). Normalize to canonical human names here so the
// cap engine groups AAPL and the XLK ETF under one sector bucket.
const SECTOR_ALIASES: Record<string, string> = {
  XLK: 'Technology',
  XLF: 'Financials',
  XLE: 'Energy',
  XLV: 'Healthcare',
  XLI: 'Industrials',
  XLY: 'ConsumerDiscretionary',
};

function canonicalSector(sector: string | null | undefined): string | null {
  if (!sector) return null;
  return SECTOR_ALIASES[sector] ?? sector;
}

let META_CACHE: Map<string, UniverseEntry> | null = null;
function tickersMeta(tickers: string[]): Map<string, UniverseEntry> {
  if (!META_CACHE) {
    META_CACHE = new Map(
      getUniverse().map(e => [
        e.ticker,
        { ...e, sector: canonicalSector(e.sector) },
      ]),
    );
  }
  const subset = new Map<string, UniverseEntry>();
  for (const t of tickers) {
    const e = META_CACHE.get(t);
    if (e) subset.set(t, e);
  }
  return subset;
}

// ─── Position-delta helpers ──────────────────────────────────────────────

export interface PositionDeltaEntry {
  ticker:       string;
  name:         string;
  prevWeight:   number;
  currWeight:   number;
  deltaWeight:  number;
  action:       'BUY' | 'SELL' | 'HOLD' | 'NEW' | 'EXIT';
}

/**
 * Given two rebalance snapshots (previous + current target weights), emit a
 * sorted per-ticker delta the user can literally trade. `currBasket` is the
 * Recommendation output's `basket` field. `prevBasket` is the same shape
 * from the prior rebalance's live replay (or empty on first rebalance).
 *
 * Action labels:
 *   - NEW   : ticker not previously held
 *   - EXIT  : ticker previously held, not in current basket
 *   - BUY   : held both days, weight increased
 *   - SELL  : held both days, weight decreased
 *   - HOLD  : held both days, weight change < 1% of NAV (noise)
 */
export function computePositionDelta(
  prevBasket: Array<{ ticker: string; weight: number; name?: string }>,
  currBasket: Array<{ ticker: string; weight: number; name?: string }>,
  holdTolerance = 0.01,
): PositionDeltaEntry[] {
  const prev = new Map(prevBasket.map(b => [b.ticker, b]));
  const curr = new Map(currBasket.map(b => [b.ticker, b]));
  const union = new Set<string>([...prev.keys(), ...curr.keys()]);
  const out: PositionDeltaEntry[] = [];
  for (const ticker of union) {
    const p = prev.get(ticker);
    const c = curr.get(ticker);
    const pw = p?.weight ?? 0;
    const cw = c?.weight ?? 0;
    const d  = cw - pw;
    let action: PositionDeltaEntry['action'];
    if (!p)        action = 'NEW';
    else if (!c)   action = 'EXIT';
    else if (Math.abs(d) < holdTolerance) action = 'HOLD';
    else if (d > 0) action = 'BUY';
    else            action = 'SELL';
    out.push({
      ticker,
      name: c?.name ?? p?.name ?? ticker,
      prevWeight:  pw,
      currWeight:  cw,
      deltaWeight: d,
      action,
    });
  }
  return out.sort((a, b) => Math.abs(b.deltaWeight) - Math.abs(a.deltaWeight));
}
