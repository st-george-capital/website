import type {
  AlphaVantageNewsArticle,
  AlphaVantageTickerSentiment,
  DailyPrice,
} from '@/lib/alpha-vantage';

export type SentimentLabel = 'bullish' | 'neutral' | 'bearish';
export type ConfidenceLabel = 'low' | 'medium' | 'high';

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
  topics: string[];
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
  emptyState?: string | null;
}

const TOPIC_EXCLUSIONS = new Set([
  'earnings',
  'finance',
  'financial markets',
  'markets',
  'economy',
]);

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function scoreToLabel(score: number): SentimentLabel {
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
  return articles
    .map((article, index) => {
      const publishedAt = parseAlphaVantagePublishedAt(article.timePublished);
      const matchedTickerSentiment = pickTickerSentiment(article.tickerSentiment, symbol);
      const sentimentScore = matchedTickerSentiment?.sentimentScore ?? article.overallSentimentScore ?? 0;
      const relevanceScore = matchedTickerSentiment?.relevanceScore ?? 0.5;

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
        topics: article.topics
          .filter((topic) => topic.topic && !TOPIC_EXCLUSIONS.has(topic.topic.toLowerCase()))
          .sort((left, right) => right.relevanceScore - left.relevanceScore)
          .map((topic) => topic.topic),
        matchedTicker: matchedTickerSentiment?.ticker || null,
      };
    })
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

function computeSignalStrength(articles: SentimentArticle[]) {
  const articleFactor = Math.min(1, articles.length / 14);
  const sourceFactor = Math.min(1, new Set(articles.map((article) => article.source)).size / 8);
  const convictionFactor = Math.min(
    1,
    average(articles.map((article) => Math.abs(article.articleSentimentScore))) / 0.35
  );

  return Math.round((articleFactor * 0.3 + sourceFactor * 0.25 + convictionFactor * 0.45) * 100);
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
      const weight = (3 - index) * (Math.abs(article.articleSentimentScore) + 0.2);
      weights.set(topic, (weights.get(topic) || 0) + weight);
    });
  });

  return [...weights.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([topic]) => topic);
}

function buildCoverageSummary(articles: SentimentArticle[]) {
  if (!articles.length) {
    return 'No recent qualifying articles were found for the selected company or keyword.';
  }

  const sources = new Set(articles.map((article) => article.source)).size;
  const topics = topicSummary(articles);
  const topicText = topics.length ? topics.join(', ') : 'company-specific developments';

  return `${articles.length} recent articles across ${sources} sources, with coverage centered on ${topicText}.`;
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
}: {
  query: string;
  keyword: string | null;
  symbol: string | null;
  companyName: string | null;
  articles: SentimentArticle[];
  priceContext: SentimentPriceContext | null;
  usedTickerFilter: boolean;
  usedKeywordFilter: boolean;
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
      emptyState: 'No recent sentiment articles were found. Try a ticker symbol, broaden the horizon, or remove the keyword filter.',
    };
  }

  const weightedScores = articles.map((article) => {
    const recencyWeight = getRecencyWeight(new Date(article.publishedAt));
    const weight = Math.max(0.2, article.relevanceScore) * recencyWeight;
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
    .sort((left, right) => Math.abs(right.articleSentimentScore) - Math.abs(left.articleSentimentScore));
  const bearishArticles = articles
    .filter((article) => article.articleSentimentLabel === 'bearish')
    .sort((left, right) => Math.abs(right.articleSentimentScore) - Math.abs(left.articleSentimentScore));
  const neutralArticles = articles.filter((article) => article.articleSentimentLabel === 'neutral');

  const signalStrength = computeSignalStrength(articles);
  const confidence = confidenceFromSignalStrength(signalStrength);
  const latestPublishedAt = articles[0]?.publishedAt ?? null;
  const coverageSummary = buildCoverageSummary(articles);

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
