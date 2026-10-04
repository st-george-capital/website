import {
  delay,
  ALPHA_VANTAGE_STAGGER_MS,
  fetchAlphaVantageDailyHistory,
  fetchAlphaVantageEarningsCallTranscript,
  fetchAlphaVantageEarningsEstimates,
  fetchAlphaVantageEarningsHistory,
  fetchAlphaVantageHistoricalOptions,
  fetchAlphaVantageInsiderTransactions,
  fetchAlphaVantageInstitutionalHoldings,
  fetchAlphaVantageNewsSentiment,
  fetchAlphaVantageQuote,
} from '@/lib/alpha-vantage';
import { buildPriceContext, buildSentimentPayload, buildTimeFrom, normalizeSentimentArticles } from '@/lib/sentiment';
import { buildEarningsRevisionsPayload, buildForwardEstimatesFromAv, buildOptionsFlowPayload, normalizeOptionContracts } from '@/lib/equity-positioning';
import {
  formatQuarterLabel,
  normalizeEstimatesData,
  normalizeInsiderData,
  normalizeInstitutionalHoldingsData,
  normalizeTranscriptData,
  quarterFromDate,
} from '@/lib/supplementary-data';
import { normalizeTickers } from '@/lib/consigliere/portfolio/data';

const one = (ticker: string) => normalizeTickers([ticker])[0];
const r2 = (x: number | null | undefined) => (x == null || !Number.isFinite(x) ? null : Number(x.toFixed(2)));
const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max)}…` : s);

function premiumAware(err: unknown, what: string): never {
  const message = err instanceof Error ? err.message : String(err);
  if (/premium/i.test(message)) throw new Error(`${what} needs an Alpha Vantage premium entitlement that this key does not have.`);
  throw err instanceof Error ? err : new Error(message);
}

/** The Sentiment Tool's weighted news read (source, recency and duplicate weighting) plus its price divergence check. */
export async function getNewsSentiment({ ticker, days = 7 }: { ticker: string; days?: number }) {
  const symbol = one(ticker);
  const horizon = [3, 7, 30].includes(days) ? days : 7;
  const raw = await fetchAlphaVantageNewsSentiment({ tickers: symbol, timeFrom: buildTimeFrom(horizon), sort: 'LATEST', limit: 40 });
  const articles = normalizeSentimentArticles(raw, symbol);
  const base = { query: symbol, keyword: null, symbol, companyName: null, articles, usedTickerFilter: true, usedKeywordFilter: false };
  const first = buildSentimentPayload({ ...base, priceContext: null });
  await delay(ALPHA_VANTAGE_STAGGER_MS);
  const [quote] = await Promise.allSettled([fetchAlphaVantageQuote(symbol)]);
  await delay(ALPHA_VANTAGE_STAGGER_MS);
  const [history] = await Promise.allSettled([fetchAlphaVantageDailyHistory(symbol, 'compact')]);
  const priceContext = buildPriceContext(
    quote.status === 'fulfilled' ? quote.value.price : null,
    quote.status === 'fulfilled' ? quote.value.changePercent : null,
    history.status === 'fulfilled' ? history.value : null,
    first.snapshot.overallSentimentLabel
  );
  const p = buildSentimentPayload({ ...base, priceContext });
  const driver = (d: (typeof p.bullishDrivers)[number]) => ({ headline: d.headline, source: d.source, published: d.publishedAt.slice(0, 10), score: r2(d.score) });
  return {
    ticker: symbol,
    window_days: horizon,
    source: 'SGC Sentiment Tool method on Alpha Vantage NEWS_SENTIMENT',
    score: r2(p.snapshot.overallSentimentScore),
    label: p.snapshot.overallSentimentLabel,
    score_scale: '-1 bearish … +1 bullish; |score| < 0.12 is neutral',
    confidence: p.snapshot.confidence,
    signal_strength_0_100: Math.round(p.snapshot.signalStrength),
    articles: { total: p.snapshot.articleCount, bullish: p.snapshot.bullishCount, bearish: p.snapshot.bearishCount, neutral: p.snapshot.neutralCount },
    takeaway: p.narrative.investmentTakeaway,
    bullish_drivers: p.bullishDrivers.slice(0, 3).map(driver),
    bearish_drivers: p.bearishDrivers.slice(0, 3).map(driver),
    top_events: p.eventBreakdown.slice(0, 5).map((e) => ({ event: e.tag, articles: e.articleCount, avg_sentiment: r2(e.averageSentiment) })),
    ...(p.priceContext
      ? {
          price_context: {
            price: r2(p.priceContext.currentPrice),
            day_change_pct: r2(p.priceContext.dayChangePercent),
            five_day_return_pct: r2(p.priceContext.trailingFiveDayReturn),
            divergence: p.priceContext.divergenceSignal,
          },
        }
      : {}),
    open_tool: `/dashboard/tools/sentiment`,
    ...(p.emptyState ? { note: p.emptyState } : {}),
  };
}

/** Equity Positioning's earnings tab: beat/miss history with the stock's reaction and forward estimate revisions. */
export async function getEarningsReactions({ ticker, quarters = 8 }: { ticker: string; quarters?: number }) {
  const symbol = one(ticker);
  const earnings = await fetchAlphaVantageEarningsHistory(symbol);
  await delay(ALPHA_VANTAGE_STAGGER_MS);
  const prices = await fetchAlphaVantageDailyHistory(symbol, 'full');
  await delay(ALPHA_VANTAGE_STAGGER_MS);
  const estimatesRaw = await fetchAlphaVantageEarningsEstimates(symbol).catch(() => ({}));
  const p = buildEarningsRevisionsPayload({
    quarterlyEarnings: earnings.quarterlyEarnings,
    prices,
    forwardEstimates: buildForwardEstimatesFromAv(estimatesRaw as Record<string, unknown>),
  });
  return {
    ticker: symbol,
    source: 'SGC Equity Positioning method on Alpha Vantage EARNINGS and daily prices',
    summary: {
      events_analyzed: p.summary.eventsAnalyzed,
      beat_rate_pct: p.summary.beatRate == null ? null : r2(p.summary.beatRate * 100),
      avg_surprise_pct: r2(p.summary.avgSurprisePercent),
      avg_5d_return_after_beat_pct: r2(p.summary.avgReturn5dAfterBeat),
      avg_5d_return_after_miss_pct: r2(p.summary.avgReturn5dAfterMiss),
      estimate_revision_momentum: p.summary.revisionMomentum,
      revision_detail: p.summary.revisionMomentumDetail,
    },
    events: p.earningsEvents.slice(0, Math.min(Math.max(quarters, 1), 12)).map((e) => ({
      quarter_end: e.fiscalDateEnding,
      reported: e.reportedDate,
      eps_estimate: e.estimatedEps,
      eps_reported: e.reportedEps,
      surprise_pct: r2(e.surprisePercent),
      outcome: e.outcome,
      return_5d_pct: r2(e.return5d),
      return_20d_pct: r2(e.return20d),
    })),
    open_tool: '/dashboard/tools/equity-positioning',
  };
}

/** Equity Positioning's options tab: put/call ratios, ATM IV, skew and unusual contracts (previous session). */
export async function getOptionsPositioning({ ticker }: { ticker: string }) {
  const symbol = one(ticker);
  const raw = await fetchAlphaVantageHistoricalOptions(symbol).catch((err) => premiumAware(err, 'Options data'));
  await delay(ALPHA_VANTAGE_STAGGER_MS);
  const spot = await fetchAlphaVantageQuote(symbol).then((q) => q.price).catch(() => null);
  const p = buildOptionsFlowPayload(normalizeOptionContracts(raw.contracts), spot);
  const s = p.summary;
  return {
    ticker: symbol,
    as_of: raw.asOfDate,
    source: 'SGC Equity Positioning method on Alpha Vantage HISTORICAL_OPTIONS (contracts expiring within 60 days)',
    spot: r2(spot),
    put_call_open_interest: r2(s.putCallOiRatio),
    put_call_volume: r2(s.putCallVolumeRatio),
    atm_implied_vol_pct: s.atmImpliedVol ? r2(s.atmImpliedVol * 100) : null,
    put_skew_pts: s.putSkew == null ? null : r2(s.putSkew * 100),
    bias: s.positioningBias,
    detail: s.positioningDetail,
    unusual_contracts: p.unusualContracts.slice(0, 5).map((c) => ({
      type: c.type,
      strike: c.strike,
      expires: c.expiration,
      volume: c.volume,
      open_interest: c.openInterest,
      iv_pct: c.impliedVolatility == null ? null : r2(c.impliedVolatility * 100),
    })),
    ...(p.note ? { note: p.note } : {}),
    open_tool: '/dashboard/tools/equity-positioning',
  };
}

export async function getInsiderActivity({ ticker, limit = 10 }: { ticker: string; limit?: number }) {
  const symbol = one(ticker);
  const data = normalizeInsiderData((await fetchAlphaVantageInsiderTransactions(symbol)) as Record<string, unknown>);
  if (!data) return { ticker: symbol, note: 'Alpha Vantage returned no insider transactions for this ticker.' };
  return {
    ticker: symbol,
    source: 'Alpha Vantage INSIDER_TRANSACTIONS (Supplementary Tools)',
    summary: {
      buys: data.summary.buyCount,
      sells: data.summary.sellCount,
      transactions: data.summary.transactionCount,
      net_shares: data.summary.netShares,
      most_active_insider: data.summary.mostActiveInsider,
      last_30_days: data.summary.clusterActivity,
    },
    recent: data.transactions.slice(0, Math.min(Math.max(limit, 1), 20)).map((t) => ({
      date: t.date,
      insider: t.insiderName,
      title: t.title,
      action: t.action,
      shares: t.shares,
      price: r2(t.sharePrice),
      value: t.value == null ? null : Math.round(t.value),
    })),
    open_tool: '/dashboard/tools/supplementary',
  };
}

export async function getEarningsEstimates({ ticker }: { ticker: string }) {
  const symbol = one(ticker);
  const data = normalizeEstimatesData((await fetchAlphaVantageEarningsEstimates(symbol)) as Record<string, unknown>);
  if (!data) return { ticker: symbol, note: 'Alpha Vantage returned no analyst estimates for this ticker.' };
  const row = (e: (typeof data.quarterly)[number]) => ({
    period: e.period,
    eps_estimate: e.epsEstimate,
    revenue_estimate_musd: e.revenueEstimate == null ? null : Math.round(e.revenueEstimate / 1e6),
    analysts: e.analystCount,
    revisions_30d: e.revisionDirection,
  });
  return {
    ticker: symbol,
    source: 'Alpha Vantage EARNINGS_ESTIMATES (Supplementary Tools)',
    next_period: data.nextPeriod,
    analyst_coverage: data.analystCoverage,
    quarterly: data.quarterly.slice(0, 4).map(row),
    annual: data.annual.slice(0, 3).map(row),
    open_tool: '/dashboard/tools/supplementary',
  };
}

export async function getEarningsCallSummary({ ticker, quarter }: { ticker: string; quarter?: string }) {
  const symbol = one(ticker);
  let q = quarter?.trim().toUpperCase().replace(/^Q([1-4])\s*(\d{4})$/, '$2Q$1');
  let available: string[] = [];
  if (!q || !/^\d{4}Q[1-4]$/.test(q)) {
    const earnings = await fetchAlphaVantageEarningsHistory(symbol);
    available = [...new Set(earnings.quarterlyEarnings.map((e) => quarterFromDate(e.fiscalDateEnding || e.reportedDate)).filter((x): x is string => Boolean(x)))].slice(0, 8);
    q = available[0];
    if (!q) return { ticker: symbol, note: 'No earnings history to pick a transcript quarter from.' };
    await delay(ALPHA_VANTAGE_STAGGER_MS);
  }
  const t = normalizeTranscriptData(
    (await fetchAlphaVantageEarningsCallTranscript(symbol, q)) as Record<string, unknown>,
    formatQuarterLabel(q),
    available.map(formatQuarterLabel)
  );
  if (!t) return { ticker: symbol, quarter: formatQuarterLabel(q), note: 'Alpha Vantage returned no transcript for this quarter. Try another quarter, e.g. "2026Q2".' };
  return {
    ticker: symbol,
    quarter: t.selectedQuarter,
    source: 'Alpha Vantage EARNINGS_CALL_TRANSCRIPT (Supplementary Tools)',
    management_tone: t.managementTone,
    tone_detail: t.managementToneDetail,
    key_topics: t.keyTopics,
    notable_quotes: t.notableSnippets,
    excerpts: t.sections.map((s) => ({ section: s.label, paragraphs: s.paragraphs.slice(0, 3).map((p) => clip(p, 450)) })),
    ...(available.length ? { other_quarters: t.availableQuarters } : {}),
    open_tool: '/dashboard/tools/supplementary',
  };
}

export async function getInstitutionalHoldings({ ticker }: { ticker: string }) {
  const symbol = one(ticker);
  const data = normalizeInstitutionalHoldingsData(
    await fetchAlphaVantageInstitutionalHoldings(symbol).catch((err) => premiumAware(err, 'Institutional holdings'))
  );
  if (!data) return { ticker: symbol, note: 'Alpha Vantage returned no institutional holdings for this ticker.' };
  const holder = (h: (typeof data.largestHolders)[number]) => ({
    holder: h.holderName,
    shares: h.sharesHeld,
    change_shares: h.sharesChanged,
    change_pct: r2(h.sharesChangedPercentage),
    reported: h.lastReported,
  });
  return {
    ticker: symbol,
    source: 'Alpha Vantage INSTITUTIONAL_HOLDINGS (Supplementary Tools)',
    holders: data.totalInstitutionalHolders,
    institutional_ownership_pct: r2(data.totalInstitutionalOwnershipPercentage),
    increased: data.holdersWithIncreasedHoldings,
    decreased: data.holdersWithDecreasedHoldings,
    unchanged: data.holdersWithUnchangedHoldings,
    summary: data.concentrationSummary,
    largest: data.largestHolders.slice(0, 5).map(holder),
    biggest_buyers: data.biggestIncreases.slice(0, 3).map(holder),
    biggest_sellers: data.biggestReductions.slice(0, 3).map(holder),
    open_tool: '/dashboard/tools/supplementary',
  };
}
