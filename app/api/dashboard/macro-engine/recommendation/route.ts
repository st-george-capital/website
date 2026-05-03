import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { replayHoldout, DEFAULT_CONFIG, loadPerRegimeOverrides } from '@/lib/macro-engine/backtest';
import {
  buildRecommendation,
  computePositionDelta,
  type RecommendationOutput,
  type PositionDeltaEntry,
} from '@/lib/macro-engine/recommendations/convictionWeight';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Serves today's actionable recommendation: conviction-weighted target
 * weights + position delta vs the previous rebalance. Wraps the live
 * holdout replay (same engine that powers the dashboard equity curve)
 * and post-processes the basket via
 *   `lib/macro-engine/recommendations/convictionWeight.ts`.
 *
 * Caveats we expose to the caller:
 *   - `backtested: false` on the conviction basket — the historical Sharpe
 *     was validated with equal weighting; conviction weighting is a
 *     forward-looking display overlay.
 *   - `tradeable: false` when gated — credit-stress flats the basket.
 */
export type RecommendationPayload = {
  asOfDate:     string;                    // last rebalance date
  prevDate:     string | null;             // prior rebalance date (null on first day)
  regime:       string;
  regimeConfidence: number;
  gated:        boolean;
  finalSize:    number;
  conviction:   RecommendationOutput;       // today's conviction basket + exposures
  equalWeight:  RecommendationOutput['basket']; // today's equal-weight basket (what engine traded)
  positionDelta: PositionDeltaEntry[];     // vs previous rebalance (conviction space)
  config: {
    transactionCostBps: number;
    longFraction:       number;
  };
  notes: {
    backtestedEqualWeight: boolean;
    convictionRecommended: boolean;
  };
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Load per-regime overrides so this endpoint mirrors the dashboard equity
  // curve exactly (Chunk 11 picks are default-on everywhere).
  const perRegimeOverrides = await loadPerRegimeOverrides();
  const replay = await replayHoldout({ ...DEFAULT_CONFIG, perRegimeOverrides });
  if (replay.points.length === 0) {
    return NextResponse.json({ error: 'No replay points.' }, { status: 404 });
  }

  const last = replay.points[replay.points.length - 1];

  // Walk backwards to find the previous NON-GATED rebalance. Gated days are
  // cash — delta from cash to today's basket would just be "NEW everything"
  // and obscure the real trade, so we use the last meaningful basket.
  let prevActive: typeof last | null = null;
  for (let i = replay.points.length - 2; i >= 0; i--) {
    if (!replay.points[i].gated && replay.points[i].basket.length > 0) {
      prevActive = replay.points[i];
      break;
    }
  }

  // ── Conviction weighting on today's basket ────────────────────────────
  const convToday = buildRecommendation(
    last.basket.map(b => ({ ticker: b.ticker, score: b.score })),
  );

  // Equal-weight snapshot uses the actual weights the engine traded.
  const equalToday: RecommendationPayload['equalWeight'] = last.basket.map(b => {
    const convHit = convToday.basket.find(c => c.ticker === b.ticker);
    return {
      ticker:      b.ticker,
      equalWeight: b.weight,
      convWeight:  b.weight,   // unused in this view
      rawWeight:   b.weight,
      score:       b.score,
      sector:      convHit?.sector  ?? null,
      country:     convHit?.country ?? null,
      name:        convHit?.name    ?? b.ticker,
      capReason:   null,
    };
  });

  // Previous basket (in conviction space) — run the same post-processor on
  // the prior rebalance's engine basket so the delta is apples-to-apples
  // (conviction-weighted → conviction-weighted).
  let positionDelta: PositionDeltaEntry[] = [];
  let prevDate: string | null = null;
  if (prevActive) {
    prevDate = prevActive.date;
    const convPrev = buildRecommendation(
      prevActive.basket.map(b => ({ ticker: b.ticker, score: b.score })),
    );
    positionDelta = computePositionDelta(
      convPrev.basket.map(b => ({ ticker: b.ticker, weight: b.convWeight, name: b.name })),
      convToday.basket.map(b => ({ ticker: b.ticker, weight: b.convWeight, name: b.name })),
    );
  } else {
    // First day — every ticker in today's basket is NEW from cash
    positionDelta = convToday.basket
      .map(b => ({
        ticker:       b.ticker,
        name:         b.name,
        prevWeight:   0,
        currWeight:   b.convWeight,
        deltaWeight:  b.convWeight,
        action:       'NEW' as const,
      }))
      .sort((a, b) => b.deltaWeight - a.deltaWeight);
  }

  const payload: RecommendationPayload = {
    asOfDate:          last.date,
    prevDate,
    regime:            last.regime,
    regimeConfidence:  last.regimeConfidence,
    gated:             last.gated,
    finalSize:         last.finalSize ?? 0,
    conviction:        convToday,
    equalWeight:       equalToday,
    positionDelta,
    config: {
      transactionCostBps: replay.config.transactionCostBps,
      longFraction:       replay.config.longFraction,
    },
    notes: {
      backtestedEqualWeight: true,
      convictionRecommended: true,
    },
  };

  return NextResponse.json(payload satisfies RecommendationPayload);
}
