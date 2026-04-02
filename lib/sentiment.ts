import type {
  AlphaVantageNewsArticle,
  AlphaVantageTickerSentiment,
  DailyPrice,
} from '@/lib/alpha-vantage';

export type SentimentLabel = 'bullish' | 'neutral' | 'bearish';
export type ConfidenceLabel = 'low' | 'medium' | 'high';
export type SocialStatus = 'available' | 'unavailable' | 'error';

export interface SentimentArticle {
  id: string;
  title: string;
  url: string;
  summary: string;
  source: string;
  sourceDomain: string | null;
  publishedAt: string;
  overallSentimentScore: number;
  overallSentimentLabel: string;
  articleSentimentScore: number;
  articleSentimentLabel: SentimentLabel;
  relevanceScore: number;
  sourceWeight: number;
  weightedSentimentScore: number;
  topics: string[];
  eventTags: string[];
  matchedTicker: string | null;
}

export interface SentimentDriver {
  headline: string;
  source: string;
  publishedAt: string;
  detail: string;
  score: number;
  url: string;
}

export interface SentimentTrendPoint {
  label: string;
  articleCount: number;
  averageSentiment: number;
}

export interface SentimentPriceContext {
  currentPrice: number | null;
  dayChangePercent: number | null;
  trailingFiveDayReturn: number | null;
  divergenceSignal: string | null;
}

export interface SentimentSourceBreakdown {
  source: string;
  articleCount: number;
  averageSentiment: number;
  weightedContribution: number;
}

export interface SentimentEventBreakdown {
  tag: string;
  articleCount: number;
  averageSentiment: number;
}

export interface SentimentPeerComparison {
  symbol: string;
  companyName: string | null;
  overallSentimentScore: number;
  overallSentimentLabel: SentimentLabel;
  signalStrength: number;
  articleCount: number;
}

export interface SocialMention {
  title: string;
  detail: string;
  publishedAt?: string;
  score: number;
  url?: string;
  source: string;
}

export interface SocialSourceScore {
  status: SocialStatus;
  overallScore: number | null;
  overallLabel: SentimentLabel | null;
  confidence: ConfidenceLabel | null;
  mentionCount: number;
  sampleCount: number;
  topMentions: SocialMention[];
  note: string | null;
}

export interface SentimentSocialOverlay {
  overallSupplementaryScore: number | null;
  overallSupplementaryLabel: SentimentLabel | null;
  reddit: SocialSourceScore;
  x: SocialSourceScore;
  referenceModels: Array<{
    name: string;
    url: string;
  }>;
}

export interface SentimentResponsePayload {
  entity: {
    query: string;
    keyword: string | null;
    symbol: string | null;
    companyName: string | null;
    usedTickerFilter: boolean;
    usedKeywordFilter: boolean;
  };
  snapshot: {
    overallSentimentScore: number;
    overallSentimentLabel: SentimentLabel;
    confidence: ConfidenceLabel;
    signalStrength: number;
    articleCount: number;
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    latestPublishedAt: string | null;
  };
  narrative: {
    coverageSummary: string;
    investmentTakeaway: string;
  };
  bullishDrivers: SentimentDriver[];
  bearishDrivers: SentimentDriver[];
  trend: SentimentTrendPoint[];
  articles: SentimentArticle[];
  priceContext: SentimentPriceContext | null;
  sourceBreakdown: SentimentSourceBreakdown[];
  eventBreakdown: SentimentEventBreakdown[];
  peerComparison?: SentimentPeerComparison[];
  socialOverlay?: SentimentSocialOverlay | null;
  emptyState?: string | null;
}

const TOPIC_EXCLUSIONS = new Set([
  'earnings',
  'finance',
  'financial markets',
  'markets',
  'economy',
]);

const SOURCE_WEIGHT_RULES = [
  {
    pattern: /(reuters|bloomberg|wall street journal|financial times|associated press|ap news|barron'?s|the information)/i,
    weight: 1.25,
  },
  {
    pattern: /(cnbc|marketwatch|wsj|ft\.com|investopedia|forbes|fortune|yahoo finance|zacks|morningstar)/i,
    weight: 1.1,
  },
  {
    pattern: /(benzinga|seeking alpha|investing\.com|thestreet|motley fool|nasdaq)/i,
    weight: 1,
  },
  {
    pattern: /(business wire|globenewswire|pr newswire|accesswire|newsfile|press release)/i,
    weight: 0.72,
  },
];

const EVENT_TAG_RULES = [
  { tag: 'earnings', pattern: /\b(earnings|eps|quarter|q[1-4]|results|beat|miss)\b/i },
  { tag: 'guidance', pattern: /\b(guidance|outlook|raised|lowered|forecast)\b/i },
  { tag: 'product', pattern: /\b(product|launch|release|device|platform|feature|copilot|ai agent)\b/i },
  { tag: 'm&a', pattern: /\b(acquisition|acquire|merger|deal|buyout|takeover|strategic alternative)\b/i },
  { tag: 'regulation', pattern: /\b(regulator|regulation|antitrust|probe|department of justice|doj|eu|ftc)\b/i },
  { tag: 'litigation', pattern: /\b(lawsuit|litigation|court|settlement|sued|legal)\b/i },
  { tag: 'macro', pattern: /\b(inflation|rates|yield|fed|macro|economy|recession|tariff)\b/i },
  { tag: 'analyst action', pattern: /\b(upgrade|downgrade|initiated|target price|price target|rating)\b/i },
  { tag: 'management', pattern: /\b(ceo|cfo|executive|management|leadership|board)\b/i },
  { tag: 'capital return', pattern: /\b(dividend|buyback|repurchase|capital return)\b/i },
  { tag: 'ai', pattern: /\b(ai|artificial intelligence|machine learning|model|gpu|datacenter)\b/i },
];

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function scoreToLabel(score: number): SentimentLabel {
  if (score >= 0.12) return 'bullish';
  if (score <= -0.12) return 'bearish';
  return 'neutral';
}

function labelToDisplay(label: SentimentLabel) {
  switch (label) {
    case 'bullish':
      return 'Bullish';
    case 'bearish':
      return 'Bearish';
    default:
      return 'Neutral';
  }
}

function getRecencyWeight(publishedAt: Date) {
  const hoursAgo = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= 24) return 1.25;
  if (hoursAgo <= 72) return 1.15;
  if (hoursAgo <= 24 * 7) return 1;
  return 0.85;
}

function cleanSummary(summary: string) {
  return summary.replace(/\s+/g, ' ').trim();
}

function pickTickerSentiment(
  tickerSentiment: AlphaVantageTickerSentiment[],
  symbol: string | null
) {
  if (!symbol) return null;
  return tickerSentiment.find((item) => item.ticker?.toUpperCase() === symbol.toUpperCase()) || null;
}

function getSourceWeight(source: string, sourceDomain: string | null) {
  const value = [source, sourceDomain].filter(Boolean).join(' ');
  const match = SOURCE_WEIGHT_RULES.find((rule) => rule.pattern.test(value));
  return match?.weight ?? 0.92;
}

function normalizeTitleFingerprint(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function extractEventTags(text: string) {
  const tags = EVENT_TAG_RULES
    .filter((rule) => rule.pattern.test(text))
    .map((rule) => rule.tag);

  return tags.length ? tags : ['company update'];
}

export function looksLikeTicker(query: string) {
  return /^[A-Za-z]{1,5}(?:\.[A-Za-z]{1,4})?$/.test(query.trim());
}

export function buildTimeFrom(days: number) {
  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');

  return [
    start.getUTCFullYear(),
    pad(start.getUTCMonth() + 1),
    pad(start.getUTCDate()),
    'T',
    pad(start.getUTCHours()),
    pad(start.getUTCMinutes()),
  ].join('');
}

export function normalizeSentimentArticles(
  articles: AlphaVantageNewsArticle[],
  symbol: string | null
): SentimentArticle[] {
  const titleCounts = new Map<string, number>();
  articles.forEach((article) => {
    const fingerprint = normalizeTitleFingerprint(article.title || article.url || String(Math.random()));
    titleCounts.set(fingerprint, (titleCounts.get(fingerprint) || 0) + 1);
  });

  return articles
    .map((article, index) => {
      const publishedAt = parseAlphaVantagePublishedAt(article.timePublished);
      const matchedTickerSentiment = pickTickerSentiment(article.tickerSentiment, symbol);
      const sentimentScore = matchedTickerSentiment?.sentimentScore ?? article.overallSentimentScore ?? 0;
      const relevanceScore = matchedTickerSentiment?.relevanceScore ?? 0.5;
      const sourceWeight = getSourceWeight(article.source || '', article.sourceDomain || null);
      const recencyWeight = getRecencyWeight(publishedAt);
      const clusterCount = titleCounts.get(normalizeTitleFingerprint(article.title || article.url || String(index))) || 1;
      const clusterWeight = 1 / Math.sqrt(clusterCount);
      const eventTags = extractEventTags(`${article.title} ${article.summary}`);
      const weight = Math.max(0.2, relevanceScore) * sourceWeight * recencyWeight * clusterWeight;

      return {
        id: `${article.url}-${index}`,
        title: article.title,
        url: article.url,
        summary: cleanSummary(article.summary),
        source: article.source || 'Unknown source',
        sourceDomain: article.sourceDomain,
        publishedAt: publishedAt.toISOString(),
        overallSentimentScore: round(article.overallSentimentScore ?? 0, 3),
        overallSentimentLabel: article.overallSentimentLabel || 'Neutral',
        articleSentimentScore: round(sentimentScore, 3),
        articleSentimentLabel: scoreToLabel(sentimentScore),
        relevanceScore: round(relevanceScore, 3),
        sourceWeight: round(sourceWeight, 2),
        weightedSentimentScore: round(sentimentScore * weight, 3),
        topics: article.topics
          .filter((topic) => topic.topic && !TOPIC_EXCLUSIONS.has(topic.topic.toLowerCase()))
          .sort((left, right) => right.relevanceScore - left.relevanceScore)
          .map((topic) => topic.topic),
        eventTags,
        matchedTicker: matchedTickerSentiment?.ticker || null,
      };
    })
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

function computeSignalStrength(articles: SentimentArticle[]) {
  const articleFactor = Math.min(1, articles.length / 14);
  const sourceFactor = Math.min(1, new Set(articles.map((article) => article.source)).size / 8);
  const eventFactor = Math.min(1, new Set(articles.flatMap((article) => article.eventTags)).size / 6);
  const convictionFactor = Math.min(
    1,
    average(articles.map((article) => Math.abs(article.weightedSentimentScore))) / 0.35
  );

  return Math.round(
    (articleFactor * 0.25 + sourceFactor * 0.2 + eventFactor * 0.15 + convictionFactor * 0.4) * 100
  );
}

function confidenceFromSignalStrength(signalStrength: number): ConfidenceLabel {
  if (signalStrength >= 72) return 'high';
  if (signalStrength >= 46) return 'medium';
  return 'low';
}

function topicSummary(articles: SentimentArticle[]) {
  const weights = new Map<string, number>();

  articles.forEach((article) => {
    article.topics.slice(0, 3).forEach((topic, index) => {
      const weight = (3 - index) * (Math.abs(article.articleSentimentScore) + 0.2) * article.sourceWeight;
      weights.set(topic, (weights.get(topic) || 0) + weight);
    });
  });

  return [...weights.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([topic]) => topic);
}

function buildSourceBreakdown(articles: SentimentArticle[]): SentimentSourceBreakdown[] {
  const buckets = new Map<string, SentimentArticle[]>();

  articles.forEach((article) => {
    const bucket = buckets.get(article.source) || [];
    bucket.push(article);
    buckets.set(article.source, bucket);
  });

  return [...buckets.entries()]
    .map(([source, bucket]) => ({
      source,
      articleCount: bucket.length,
      averageSentiment: round(average(bucket.map((article) => article.articleSentimentScore)), 3),
      weightedContribution: round(bucket.reduce((sum, article) => sum + article.weightedSentimentScore, 0), 3),
    }))
    .sort((left, right) => Math.abs(right.weightedContribution) - Math.abs(left.weightedContribution))
    .slice(0, 6);
}

function buildEventBreakdown(articles: SentimentArticle[]): SentimentEventBreakdown[] {
  const buckets = new Map<string, SentimentArticle[]>();

  articles.forEach((article) => {
    article.eventTags.forEach((tag) => {
      const bucket = buckets.get(tag) || [];
      bucket.push(article);
      buckets.set(tag, bucket);
    });
  });

  return [...buckets.entries()]
    .map(([tag, bucket]) => ({
      tag,
      articleCount: bucket.length,
      averageSentiment: round(average(bucket.map((article) => article.articleSentimentScore)), 3),
    }))
    .sort((left, right) => right.articleCount - left.articleCount || Math.abs(right.averageSentiment) - Math.abs(left.averageSentiment))
    .slice(0, 8);
}

function buildCoverageSummary(
  articles: SentimentArticle[],
  sourceBreakdown: SentimentSourceBreakdown[],
  eventBreakdown: SentimentEventBreakdown[]
) {
  if (!articles.length) {
    return 'No recent qualifying articles were found for the selected company or keyword.';
  }

  const sources = new Set(articles.map((article) => article.source)).size;
  const topics = topicSummary(articles);
  const events = eventBreakdown.slice(0, 3).map((item) => item.tag);
  const sourceText = sourceBreakdown[0]?.source ? `Top contribution came from ${sourceBreakdown[0].source}.` : '';
  const topicText = topics.length ? topics.join(', ') : 'company-specific developments';
  const eventText = events.length ? ` Most of the tape is tied to ${events.join(', ')}.` : '';

  return `${articles.length} recent articles across ${sources} sources, with coverage centered on ${topicText}.${eventText} ${sourceText}`.trim();
}

function buildDriver(article: SentimentArticle): SentimentDriver {
  return {
    headline: article.title,
    source: article.source,
    publishedAt: article.publishedAt,
    detail: article.summary || 'No summary provided by the source.',
    score: article.articleSentimentScore,
    url: article.url,
  };
}

function buildTrend(articles: SentimentArticle[]): SentimentTrendPoint[] {
  const buckets = new Map<string, number[]>();

  articles.forEach((article) => {
    const dayLabel = new Date(article.publishedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const scores = buckets.get(dayLabel) || [];
    scores.push(article.articleSentimentScore);
    buckets.set(dayLabel, scores);
  });

  return [...buckets.entries()]
    .map(([label, scores]) => ({
      label,
      articleCount: scores.length,
      averageSentiment: round(average(scores), 3),
    }))
    .slice(0, 7)
    .reverse();
}

export function buildPriceContext(
  currentPrice: number | null,
  dayChangePercent: number | null,
  history: DailyPrice[] | null,
  overallLabel: SentimentLabel
): SentimentPriceContext | null {
  if (currentPrice == null && dayChangePercent == null && !history?.length) {
    return null;
  }

  let trailingFiveDayReturn: number | null = null;
  if (history && history.length >= 6) {
    const latest = history[history.length - 1].close;
    const prior = history[Math.max(0, history.length - 6)].close;
    trailingFiveDayReturn = prior ? round(((latest - prior) / prior) * 100, 2) : null;
  }

  let divergenceSignal: string | null = null;
  if (trailingFiveDayReturn != null) {
    if (overallLabel === 'bullish' && trailingFiveDayReturn < 0) {
      divergenceSignal = 'Sentiment is constructive while the stock is still trading off over the last five sessions.';
    } else if (overallLabel === 'bearish' && trailingFiveDayReturn > 0) {
      divergenceSignal = 'News flow is deteriorating even though the stock has remained resilient over the last five sessions.';
    }
  }

  return {
    currentPrice,
    dayChangePercent,
    trailingFiveDayReturn,
    divergenceSignal,
  };
}

export function buildSentimentPayload({
  query,
  keyword,
  symbol,
  companyName,
  articles,
  priceContext,
  usedTickerFilter,
  usedKeywordFilter,
  peerComparison = [],
  socialOverlay = null,
}: {
  query: string;
  keyword: string | null;
  symbol: string | null;
  companyName: string | null;
  articles: SentimentArticle[];
  priceContext: SentimentPriceContext | null;
  usedTickerFilter: boolean;
  usedKeywordFilter: boolean;
  peerComparison?: SentimentPeerComparison[];
  socialOverlay?: SentimentSocialOverlay | null;
}): SentimentResponsePayload {
  if (!articles.length) {
    return {
      entity: {
        query,
        keyword,
        symbol,
        companyName,
        usedTickerFilter,
        usedKeywordFilter,
      },
      snapshot: {
        overallSentimentScore: 0,
        overallSentimentLabel: 'neutral',
        confidence: 'low',
        signalStrength: 0,
        articleCount: 0,
        bullishCount: 0,
        bearishCount: 0,
        neutralCount: 0,
        latestPublishedAt: null,
      },
      narrative: {
        coverageSummary: 'No recent qualifying articles were found for the selected company or keyword.',
        investmentTakeaway: 'There is not enough current article flow to make a reliable live sentiment read right now.',
      },
      bullishDrivers: [],
      bearishDrivers: [],
      trend: [],
      articles: [],
      priceContext,
      sourceBreakdown: [],
      eventBreakdown: [],
      peerComparison,
      socialOverlay,
      emptyState: 'No recent sentiment articles were found. Try a ticker symbol, broaden the horizon, or remove the keyword filter.',
    };
  }

  const weightedScores = articles.map((article) => {
    const recencyWeight = getRecencyWeight(new Date(article.publishedAt));
    const weight = Math.max(0.2, article.relevanceScore) * article.sourceWeight * recencyWeight;
    return {
      weightedScore: article.articleSentimentScore * weight,
      weight,
    };
  });

  const totalWeight = weightedScores.reduce((sum, item) => sum + item.weight, 0) || 1;
  const overallSentimentScore = round(
    weightedScores.reduce((sum, item) => sum + item.weightedScore, 0) / totalWeight,
    3
  );
  const overallSentimentLabel = scoreToLabel(overallSentimentScore);
  const bullishArticles = articles
    .filter((article) => article.articleSentimentLabel === 'bullish')
    .sort((left, right) => Math.abs(right.weightedSentimentScore) - Math.abs(left.weightedSentimentScore));
  const bearishArticles = articles
    .filter((article) => article.articleSentimentLabel === 'bearish')
    .sort((left, right) => Math.abs(right.weightedSentimentScore) - Math.abs(left.weightedSentimentScore));
  const neutralArticles = articles.filter((article) => article.articleSentimentLabel === 'neutral');
  const sourceBreakdown = buildSourceBreakdown(articles);
  const eventBreakdown = buildEventBreakdown(articles);

  const signalStrength = computeSignalStrength(articles);
  const confidence = confidenceFromSignalStrength(signalStrength);
  const latestPublishedAt = articles[0]?.publishedAt ?? null;
  const coverageSummary = buildCoverageSummary(articles, sourceBreakdown, eventBreakdown);

  let investmentTakeaway = `Live news flow is ${labelToDisplay(overallSentimentLabel).toLowerCase()} with ${confidence} conviction.`;
  if (priceContext?.divergenceSignal) {
    investmentTakeaway += ` ${priceContext.divergenceSignal}`;
  } else if (bullishArticles.length > bearishArticles.length && overallSentimentLabel === 'bullish') {
    investmentTakeaway += ' Positive coverage is outpacing negative headlines, which supports a constructive near-term narrative.';
  } else if (bearishArticles.length > bullishArticles.length && overallSentimentLabel === 'bearish') {
    investmentTakeaway += ' Negative coverage is dominating the tape, which raises the bar for near-term upside.';
  } else {
    investmentTakeaway += ' The article mix is balanced enough that sentiment should be treated as confirmatory rather than decisive.';
  }

  if (eventBreakdown[0]?.tag) {
    investmentTakeaway += ` The heaviest event bucket right now is ${eventBreakdown[0].tag}.`;
  }

  return {
    entity: {
      query,
      keyword,
      symbol,
      companyName,
      usedTickerFilter,
      usedKeywordFilter,
    },
    snapshot: {
      overallSentimentScore,
      overallSentimentLabel,
      confidence,
      signalStrength,
      articleCount: articles.length,
      bullishCount: bullishArticles.length,
      bearishCount: bearishArticles.length,
      neutralCount: neutralArticles.length,
      latestPublishedAt,
    },
    narrative: {
      coverageSummary,
      investmentTakeaway,
    },
    bullishDrivers: bullishArticles.slice(0, 4).map(buildDriver),
    bearishDrivers: bearishArticles.slice(0, 4).map(buildDriver),
    trend: buildTrend(articles),
    articles: articles.slice(0, 12),
    priceContext,
    sourceBreakdown,
    eventBreakdown,
    peerComparison,
    socialOverlay,
  };
}

function parseAlphaVantagePublishedAt(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!match) return new Date();

  const [, year, month, day, hours, minutes, seconds] = match;
  return new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds)
  ));
}
