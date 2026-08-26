import type { DailyPrice, AlphaVantageQuarterlyEarning } from '@/lib/alpha-vantage';
import type { EarningsRevisionRow } from '@/lib/macro-engine/types';

export type PositioningBias = 'bullish' | 'neutral' | 'bearish';

export interface EquityPositioningEntity {
  query: string | null;
  symbol: string | null;
  companyName: string | null;
}

export interface EarningsEventImpact {
  fiscalDateEnding: string;
  reportedDate: string | null;
  estimatedEps: number | null;
  reportedEps: number | null;
  surprisePercent: number | null;
  priceAtReport: number | null;
  returnDayOf: number | null;
  return5d: number | null;
  return20d: number | null;
  outcome: 'beat' | 'miss' | 'inline' | 'unknown';
}

export interface ForwardEstimateRow {
  period: string;
  reportDate: string | null;
  epsEstimate: number | null;
  revenueEstimate: number | null;
  analystCount: number | null;
  revisionDirection: 'up' | 'down' | 'flat' | 'unknown';
}

export interface EarningsRevisionSeriesPoint {
  date: string;
  estimatedEps: number | null;
  price: number | null;
}

export interface EarningsRevisionsPayload {
  summary: {
    eventsAnalyzed: number;
    beatRate: number | null;
    avgSurprisePercent: number | null;
    avgReturn5dAfterBeat: number | null;
    avgReturn5dAfterMiss: number | null;
    revisionMomentum: 'up' | 'down' | 'flat' | 'unknown';
    revisionMomentumDetail: string;
  };
  earningsEvents: EarningsEventImpact[];
  forwardEstimates: ForwardEstimateRow[];
  estimateSeries: EarningsRevisionSeriesPoint[];
}

export interface UnusualOptionContract {
  contractId: string;
  type: 'call' | 'put';
  strike: number;
  expiration: string;
  volume: number;
  openInterest: number;
  impliedVolatility: number | null;
  volumeOiRatio: number | null;
}

export interface OptionsFlowPayload {
  asOfDate: string | null;
  spotPrice: number | null;
  summary: {
    putCallOiRatio: number | null;
    putCallVolumeRatio: number | null;
    totalCallOi: number;
    totalPutOi: number;
    totalCallVolume: number;
    totalPutVolume: number;
    atmImpliedVol: number | null;
    putSkew: number | null;
    positioningBias: PositioningBias;
    positioningDetail: string;
  };
  unusualContracts: UnusualOptionContract[];
  note: string | null;
}

export interface EquityPositioningResponse {
  entity: EquityPositioningEntity;
  tab: 'revisions' | 'options';
  emptyState: string | null;
  revisions: EarningsRevisionsPayload | null;
  options: OptionsFlowPayload | null;
}

export interface AlphaVantageOptionContract {
  contractId: string;
  symbol: string;
  expiration: string;
  strike: number;
  type: 'call' | 'put';
  last: number | null;
  mark: number | null;
  bid: number | null;
  ask: number | null;
  volume: number;
  openInterest: number;
  impliedVolatility: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  date: string | null;
}

function parseNumber(value: unknown) {
  if (value == null || value === '') return null;
  const parsed = Number.parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function findPriceOnOrBefore(prices: DailyPrice[], targetDate: string) {
  const sorted = [...prices].sort((left, right) => left.date.localeCompare(right.date));
  let last: DailyPrice | null = null;

  for (const point of sorted) {
    if (point.date <= targetDate) {
      last = point;
      continue;
    }
    break;
  }

  return last?.close ?? null;
}

function computeForwardReturn(prices: DailyPrice[], startDate: string, tradingDaysForward: number) {
  const sorted = [...prices].sort((left, right) => left.date.localeCompare(right.date));
  const startIndex = sorted.findIndex((point) => point.date >= startDate);
  if (startIndex < 0) return null;

  const startPrice = sorted[startIndex]?.close;
  const endPrice = sorted[startIndex + tradingDaysForward]?.close;
  if (startPrice == null || endPrice == null || startPrice === 0) return null;

  return ((endPrice - startPrice) / startPrice) * 100;
}

function classifyEarningsOutcome(surprisePercent: number | null): EarningsEventImpact['outcome'] {
  if (surprisePercent == null || Number.isNaN(surprisePercent)) return 'unknown';
  if (surprisePercent >= 2) return 'beat';
  if (surprisePercent <= -2) return 'miss';
  return 'inline';
}

export function buildEarningsEventImpacts(
  quarterlyEarnings: AlphaVantageQuarterlyEarning[],
  prices: DailyPrice[]
): EarningsEventImpact[] {
  return quarterlyEarnings
    .filter((row) => row.reportedDate || row.fiscalDateEnding)
    .map((row) => {
      const eventDate = row.reportedDate || row.fiscalDateEnding;
      const priceAtReport = findPriceOnOrBefore(prices, eventDate);
      const returnDayOf = computeForwardReturn(prices, eventDate, 0);
      const return5d = computeForwardReturn(prices, eventDate, 5);
      const return20d = computeForwardReturn(prices, eventDate, 20);

      return {
        fiscalDateEnding: row.fiscalDateEnding,
        reportedDate: row.reportedDate || null,
        estimatedEps: row.estimatedEPS,
        reportedEps: row.reportedEPS,
        surprisePercent: row.surprisePercentage,
        priceAtReport,
        returnDayOf,
        return5d,
        return20d,
        outcome: classifyEarningsOutcome(row.surprisePercentage),
      };
    })
    .sort((left, right) =>
      String(right.reportedDate || right.fiscalDateEnding).localeCompare(
        String(left.reportedDate || left.fiscalDateEnding)
      )
    )
    .slice(0, 12);
}

export function buildForwardEstimatesFromAv(raw: Record<string, unknown>): ForwardEstimateRow[] {
  const rows = Array.isArray(raw.estimates)
    ? raw.estimates
    : Array.isArray(raw.quarterlyEstimates)
      ? raw.quarterlyEstimates
      : Array.isArray(raw.quarterly_estimates)
        ? raw.quarterly_estimates
        : [];

  return rows
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
    .map((record) => {
      const current = parseNumber(
        record.currentEstimate ||
          record.current_estimate ||
          record.estimatedEPSAvg ||
          record.epsEstimate ||
          record.eps_estimate_average
      );
      const previous = parseNumber(
        record.priorEstimate ||
          record.prior_estimate ||
          record.previousEstimate ||
          record.previous_estimate ||
          record.estimate30DaysAgo ||
          record.estimate_30_days_ago ||
          record.eps_estimate_average_30_days_ago
      );
      const revisionsUp = parseNumber(
        record.eps_estimate_revision_up_trailing_30_days || record.revision_up_30d
      );
      const revisionsDown = parseNumber(
        record.eps_estimate_revision_down_trailing_30_days || record.revision_down_30d
      );

      let revisionDirection: ForwardEstimateRow['revisionDirection'] = 'unknown';
      if (revisionsUp != null || revisionsDown != null) {
        if ((revisionsUp || 0) > (revisionsDown || 0)) revisionDirection = 'up';
        else if ((revisionsDown || 0) > (revisionsUp || 0)) revisionDirection = 'down';
        else revisionDirection = 'flat';
      } else if (current != null && previous != null) {
        if (current > previous * 1.01) revisionDirection = 'up';
        else if (current < previous * 0.99) revisionDirection = 'down';
        else revisionDirection = 'flat';
      }

      return {
        period: String(
          record.period ||
            record.fiscalDateEnding ||
            record.fiscal_date_ending ||
            record.reportDate ||
            record.report_date ||
            record.date ||
            'Unknown period'
        ),
        reportDate: String(record.reportDate || record.report_date || record.date || '') || null,
        epsEstimate: current,
        revenueEstimate: parseNumber(
          record.revenueEstimate ||
            record.revenue_estimate ||
            record.estimatedRevenueAvg ||
            record.estimated_revenue_avg
        ),
        analystCount: parseNumber(
          record.numberOfAnalysts ||
            record.analystCount ||
            record.analyst_count ||
            record.eps_estimate_analyst_count
        ),
        revisionDirection,
      };
    })
    .slice(0, 8);
}

export function buildForwardEstimatesFromFmp(rows: EarningsRevisionRow[]): ForwardEstimateRow[] {
  const sorted = [...rows].sort((left, right) => left.date.getTime() - right.date.getTime());

  return sorted
    .map((row, index) => {
      const previous = sorted[index - 1];
      const currentEps = row.estimatedEpsAvg;
      const previousEps = previous?.estimatedEpsAvg ?? null;

      let revisionDirection: ForwardEstimateRow['revisionDirection'] = 'unknown';
      if (currentEps != null && previousEps != null) {
        if (currentEps > previousEps * 1.01) revisionDirection = 'up';
        else if (currentEps < previousEps * 0.99) revisionDirection = 'down';
        else revisionDirection = 'flat';
      }

      return {
        period: row.date.toISOString().slice(0, 10),
        reportDate: row.date.toISOString().slice(0, 10),
        epsEstimate: currentEps,
        revenueEstimate: row.estimatedRevAvg,
        analystCount: row.numAnalystsEps,
        revisionDirection,
      };
    })
    .slice(-8)
    .reverse();
}

export function buildEstimatePriceSeries(
  quarterlyEarnings: AlphaVantageQuarterlyEarning[],
  prices: DailyPrice[]
): EarningsRevisionSeriesPoint[] {
  return [...quarterlyEarnings]
    .filter((row) => row.reportedDate || row.fiscalDateEnding)
    .sort((left, right) =>
      String(left.reportedDate || left.fiscalDateEnding).localeCompare(
        String(right.reportedDate || right.fiscalDateEnding)
      )
    )
    .slice(-16)
    .map((row) => {
      const date = row.reportedDate || row.fiscalDateEnding;
      return {
        date,
        estimatedEps: row.estimatedEPS,
        price: findPriceOnOrBefore(prices, date),
      };
    });
}

export function buildEarningsRevisionsPayload(input: {
  quarterlyEarnings: AlphaVantageQuarterlyEarning[];
  prices: DailyPrice[];
  forwardEstimates: ForwardEstimateRow[];
}): EarningsRevisionsPayload {
  const earningsEvents = buildEarningsEventImpacts(input.quarterlyEarnings, input.prices);
  const beats = earningsEvents.filter((event) => event.outcome === 'beat');
  const misses = earningsEvents.filter((event) => event.outcome === 'miss');
  const surprises = earningsEvents
    .map((event) => event.surprisePercent)
    .filter((value): value is number => value != null && Number.isFinite(value));

  const beatReturns = beats
    .map((event) => event.return5d)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const missReturns = misses
    .map((event) => event.return5d)
    .filter((value): value is number => value != null && Number.isFinite(value));

  const upRevisions = input.forwardEstimates.filter((row) => row.revisionDirection === 'up').length;
  const downRevisions = input.forwardEstimates.filter((row) => row.revisionDirection === 'down').length;

  let revisionMomentum: EarningsRevisionsPayload['summary']['revisionMomentum'] = 'unknown';
  let revisionMomentumDetail = 'Forward estimate revision trend is unavailable for this ticker.';

  if (upRevisions > downRevisions) {
    revisionMomentum = 'up';
    revisionMomentumDetail = `${upRevisions} forward estimate step(s) revised higher vs ${downRevisions} lower.`;
  } else if (downRevisions > upRevisions) {
    revisionMomentum = 'down';
    revisionMomentumDetail = `${downRevisions} forward estimate step(s) revised lower vs ${upRevisions} higher.`;
  } else if (input.forwardEstimates.length > 0) {
    revisionMomentum = 'flat';
    revisionMomentumDetail = 'Forward estimates are broadly stable across upcoming periods.';
  }

  return {
    summary: {
      eventsAnalyzed: earningsEvents.length,
      beatRate: earningsEvents.length ? beats.length / earningsEvents.length : null,
      avgSurprisePercent: surprises.length
        ? surprises.reduce((sum, value) => sum + value, 0) / surprises.length
        : null,
      avgReturn5dAfterBeat: beatReturns.length
        ? beatReturns.reduce((sum, value) => sum + value, 0) / beatReturns.length
        : null,
      avgReturn5dAfterMiss: missReturns.length
        ? missReturns.reduce((sum, value) => sum + value, 0) / missReturns.length
        : null,
      revisionMomentum,
      revisionMomentumDetail,
    },
    earningsEvents,
    forwardEstimates: input.forwardEstimates,
    estimateSeries: buildEstimatePriceSeries(input.quarterlyEarnings, input.prices),
  };
}

function classifyPositioningBias(
  putCallOiRatio: number | null,
  putCallVolumeRatio: number | null,
  putSkew: number | null
): { bias: PositioningBias; detail: string } {
  let score = 0;

  if (putCallOiRatio != null) {
    if (putCallOiRatio > 1.15) score -= 1;
    else if (putCallOiRatio < 0.85) score += 1;
  }

  if (putCallVolumeRatio != null) {
    if (putCallVolumeRatio > 1.2) score -= 1;
    else if (putCallVolumeRatio < 0.8) score += 1;
  }

  if (putSkew != null) {
    if (putSkew > 0.05) score -= 1;
    else if (putSkew < -0.02) score += 1;
  }

  if (score >= 1) {
    return {
      bias: 'bullish',
      detail: 'Call-heavy open interest and volume with limited downside hedging demand.',
    };
  }

  if (score <= -1) {
    return {
      bias: 'bearish',
      detail: 'Elevated put activity suggests hedging, downside protection, or bearish positioning.',
    };
  }

  return {
    bias: 'neutral',
    detail: 'Options positioning looks balanced between calls and puts.',
  };
}

export function normalizeOptionContracts(rawContracts: unknown[]): AlphaVantageOptionContract[] {
  return rawContracts
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
    .map((contract) => {
      const typeRaw = String(contract.type || contract.option_type || '').toLowerCase();
      const type: 'call' | 'put' = typeRaw.includes('put') ? 'put' : 'call';

      return {
        contractId: String(contract.contractID || contract.contract_id || contract.symbol || ''),
        symbol: String(contract.symbol || ''),
        expiration: String(contract.expiration || contract.expiration_date || ''),
        strike: parseNumber(contract.strike) ?? 0,
        type,
        last: parseNumber(contract.last),
        mark: parseNumber(contract.mark),
        bid: parseNumber(contract.bid),
        ask: parseNumber(contract.ask),
        volume: parseNumber(contract.volume) ?? 0,
        openInterest: parseNumber(contract.open_interest || contract.openInterest) ?? 0,
        impliedVolatility: parseNumber(contract.implied_volatility || contract.impliedVolatility),
        delta: parseNumber(contract.delta),
        gamma: parseNumber(contract.gamma),
        theta: parseNumber(contract.theta),
        vega: parseNumber(contract.vega),
        date: contract.date ? String(contract.date) : null,
      };
    })
    .filter((contract) => contract.strike > 0 && contract.expiration);
}

export function buildOptionsFlowPayload(
  contracts: AlphaVantageOptionContract[],
  spotPrice: number | null
): OptionsFlowPayload {
  const nearTerm = contracts.filter((contract) => {
    const expiry = new Date(contract.expiration);
    if (Number.isNaN(expiry.getTime())) return false;
    const days = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 60;
  });

  const source = nearTerm.length ? nearTerm : contracts;

  const calls = source.filter((contract) => contract.type === 'call');
  const puts = source.filter((contract) => contract.type === 'put');

  const totalCallOi = calls.reduce((sum, contract) => sum + contract.openInterest, 0);
  const totalPutOi = puts.reduce((sum, contract) => sum + contract.openInterest, 0);
  const totalCallVolume = calls.reduce((sum, contract) => sum + contract.volume, 0);
  const totalPutVolume = puts.reduce((sum, contract) => sum + contract.volume, 0);

  const putCallOiRatio = totalCallOi > 0 ? totalPutOi / totalCallOi : null;
  const putCallVolumeRatio = totalCallVolume > 0 ? totalPutVolume / totalCallVolume : null;

  const atmContracts = spotPrice
    ? source
        .filter((contract) => Math.abs(contract.strike - spotPrice) / spotPrice <= 0.05)
        .sort(
          (left, right) =>
            Math.abs(left.strike - spotPrice) - Math.abs(right.strike - spotPrice)
        )
    : [];

  const atmImpliedVol =
    atmContracts.length > 0
      ? atmContracts
          .map((contract) => contract.impliedVolatility)
          .filter((value): value is number => value != null)
          .reduce((sum, value, _, array) => sum + value / array.length, 0)
      : null;

  const otmPuts = spotPrice
    ? puts
        .filter((contract) => contract.strike < spotPrice * 0.95)
        .sort((left, right) => right.strike - left.strike)
        .slice(0, 5)
    : [];
  const otmCalls = spotPrice
    ? calls
        .filter((contract) => contract.strike > spotPrice * 1.05)
        .sort((left, right) => left.strike - right.strike)
        .slice(0, 5)
    : [];

  const otmPutIv =
    otmPuts
      .map((contract) => contract.impliedVolatility)
      .filter((value): value is number => value != null)
      .reduce((sum, value, _, array) => sum + value / array.length, 0) || null;
  const otmCallIv =
    otmCalls
      .map((contract) => contract.impliedVolatility)
      .filter((value): value is number => value != null)
      .reduce((sum, value, _, array) => sum + value / array.length, 0) || null;

  const putSkew =
    otmPutIv != null && otmCallIv != null ? otmPutIv - otmCallIv : null;

  const positioning = classifyPositioningBias(putCallOiRatio, putCallVolumeRatio, putSkew);

  const unusualContracts = [...source]
    .filter((contract) => contract.volume > 0)
    .map((contract) => ({
      contractId: contract.contractId,
      type: contract.type,
      strike: contract.strike,
      expiration: contract.expiration,
      volume: contract.volume,
      openInterest: contract.openInterest,
      impliedVolatility: contract.impliedVolatility,
      volumeOiRatio:
        contract.openInterest > 0 ? contract.volume / contract.openInterest : contract.volume,
    }))
    .sort((left, right) => (right.volumeOiRatio ?? 0) - (left.volumeOiRatio ?? 0))
    .slice(0, 8);

  return {
    asOfDate: source[0]?.date ?? null,
    spotPrice,
    summary: {
      putCallOiRatio,
      putCallVolumeRatio,
      totalCallOi,
      totalPutOi,
      totalCallVolume,
      totalPutVolume,
      atmImpliedVol,
      putSkew,
      positioningBias: positioning.bias,
      positioningDetail: positioning.detail,
    },
    unusualContracts,
    note:
      'Options flow is a positioning proxy, not direct short interest. High put/call ratios often reflect hedging or bearish bets rather than equity shorts.',
  };
}
