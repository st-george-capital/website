import {
  average,
  round,
  scoreToLabel,
  type SocialMention,
  type SocialSourceScore,
  type SentimentLabel,
  type SentimentSocialOverlay,
} from '@/lib/sentiment';

const REDDIT_BASE = 'https://www.reddit.com/search.json';
const X_RECENT_SEARCH_URL = 'https://api.x.com/2/tweets/search/recent';

const POSITIVE_PATTERNS = [
  /\b(beat|beats|strong|bullish|buy|upgrade|upside|growth|record|surge|momentum|outperform|acceleration|tailwind)\b/i,
  /\b(expand|expansion|launch|adoption|profit|margin expansion|cash flow|backlog|visibility)\b/i,
];

const NEGATIVE_PATTERNS = [
  /\b(miss|weak|bearish|sell|downgrade|downside|decline|slowdown|headwind|pressure|risk|warning)\b/i,
  /\b(layoff|probe|lawsuit|antitrust|delay|cut|cuts|margin compression|deterioration|supply issue)\b/i,
];

const REFERENCE_MODELS = [
  {
    name: 'marketsentiment/mslive_public',
    url: 'https://github.com/marketsentiment/mslive_public',
  },
  {
    name: 'Quasar-I/Aistox-Sentiment-Aware-Stock-Market-Analysis-Platform',
    url: 'https://github.com/Quasar-I/Aistox-Sentiment-Aware-Stock-Market-Analysis-Platform',
  },
];

function cleanText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function confidenceFromSample(sampleCount: number, averageAbsScore: number): 'low' | 'medium' | 'high' {
  const sampleFactor = Math.min(1, sampleCount / 15);
  const convictionFactor = Math.min(1, averageAbsScore / 0.55);
  const composite = sampleFactor * 0.55 + convictionFactor * 0.45;

  if (composite >= 0.72) return 'high';
  if (composite >= 0.42) return 'medium';
  return 'low';
}

function scoreText(text: string) {
  const normalized = cleanText(text);
  let score = 0;

  POSITIVE_PATTERNS.forEach((pattern) => {
    if (pattern.test(normalized)) score += 0.28;
  });
  NEGATIVE_PATTERNS.forEach((pattern) => {
    if (pattern.test(normalized)) score -= 0.28;
  });

  return Math.max(-1, Math.min(1, score));
}

function buildQueryParts({
  query,
  symbol,
  companyName,
  keyword,
}: {
  query: string;
  symbol: string | null;
  companyName: string | null;
  keyword: string | null;
}) {
  return [symbol, companyName, query, keyword]
    .map((value) => value?.trim())
    .filter(Boolean)
    .slice(0, 4) as string[];
}

function buildEmptySourceScore(note: string, status: SocialSourceScore['status'] = 'unavailable'): SocialSourceScore {
  return {
    status,
    overallScore: null,
    overallLabel: null,
    confidence: null,
    mentionCount: 0,
    sampleCount: 0,
    topMentions: [],
    note,
  };
}

function summarizeMentions(
  mentions: Array<SocialMention & { engagementWeight: number }>
): SocialSourceScore {
  if (!mentions.length) {
    return buildEmptySourceScore('No meaningful social mentions were found for the selected query.', 'available');
  }

  const weights = mentions.map((mention) => mention.engagementWeight);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
  const weightedScore = mentions.reduce(
    (sum, mention) => sum + mention.score * mention.engagementWeight,
    0
  ) / totalWeight;
  const averageAbsScore = average(mentions.map((mention) => Math.abs(mention.score)));

  return {
    status: 'available',
    overallScore: round(weightedScore, 3),
    overallLabel: scoreToLabel(weightedScore),
    confidence: confidenceFromSample(mentions.length, averageAbsScore),
    mentionCount: mentions.reduce((sum, mention) => sum + Math.max(1, Math.round(mention.engagementWeight * 10)), 0),
    sampleCount: mentions.length,
    topMentions: mentions
      .sort((left, right) => Math.abs(right.score) * right.engagementWeight - Math.abs(left.score) * left.engagementWeight)
      .slice(0, 4)
      .map(({ engagementWeight: _engagementWeight, ...mention }) => mention),
    note: null,
  };
}

export async function fetchRedditSupplementaryScore({
  query,
  symbol,
  companyName,
  keyword,
}: {
  query: string;
  symbol: string | null;
  companyName: string | null;
  keyword: string | null;
}): Promise<SocialSourceScore> {
  try {
    const queryText = buildQueryParts({ query, symbol, companyName, keyword }).join(' ');
    const url = new URL(REDDIT_BASE);
    url.searchParams.set('q', queryText);
    url.searchParams.set('sort', 'new');
    url.searchParams.set('t', 'week');
    url.searchParams.set('limit', '18');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'SGCResearchSentimentBot/1.0',
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      if (response.status === 403) {
        return buildEmptySourceScore('Reddit search is blocked in the current deployment environment.', 'unavailable');
      }
      return buildEmptySourceScore(`Reddit search is temporarily unavailable (${response.status}).`, 'error');
    }

    const data = await response.json();
    const posts = Array.isArray(data?.data?.children) ? data.data.children : [];

    const mentions = posts
      .map((item: Record<string, any>) => item?.data)
      .filter(Boolean)
      .map((post: Record<string, any>) => {
        const title = cleanText(post.title || '');
        const detail = cleanText(post.selftext || '');
        const score = scoreText(`${title} ${detail}`);
        const engagementWeight = Math.max(0.2, Math.log10(Math.max(10, (post.ups || 0) + (post.num_comments || 0) + 10)));

        return {
          title,
          detail: detail || 'Reddit post discussing the company or topic.',
          publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : undefined,
          score,
          url: post.permalink ? `https://www.reddit.com${post.permalink}` : undefined,
          source: `r/${post.subreddit || 'unknown'}`,
          engagementWeight,
        };
      })
      .filter((mention: SocialMention & { engagementWeight: number }) => Boolean(mention.title));

    return summarizeMentions(mentions);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reddit sentiment fetch failed';
    return buildEmptySourceScore(message, 'error');
  }
}

export async function fetchXSupplementaryScore({
  query,
  symbol,
  companyName,
  keyword,
}: {
  query: string;
  symbol: string | null;
  companyName: string | null;
  keyword: string | null;
}): Promise<SocialSourceScore> {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    return buildEmptySourceScore('Optional: configure X_BEARER_TOKEN to enable the live X overlay.', 'unavailable');
  }

  try {
    const terms = buildQueryParts({ query, symbol, companyName, keyword })
      .map((term) => `"${term.replace(/"/g, '')}"`);
    const queryText = `${terms.join(' OR ')} lang:en -is:retweet`;
    const url = new URL(X_RECENT_SEARCH_URL);
    url.searchParams.set('query', queryText);
    url.searchParams.set('max_results', '20');
    url.searchParams.set('tweet.fields', 'created_at,public_metrics');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return buildEmptySourceScore(`X search returned ${response.status}.`, 'error');
    }

    const data = await response.json();
    const tweets = Array.isArray(data?.data) ? data.data : [];

    const mentions = tweets.map((tweet: Record<string, any>) => {
      const text = cleanText(tweet.text || '');
      const metrics = tweet.public_metrics || {};
      const engagement = (metrics.like_count || 0) + (metrics.retweet_count || 0) + (metrics.reply_count || 0);

      return {
        title: text,
        detail: 'Recent post from X related to the selected name or theme.',
        publishedAt: tweet.created_at || undefined,
        score: scoreText(text),
        url: tweet.id ? `https://x.com/i/web/status/${tweet.id}` : undefined,
        source: 'X',
        engagementWeight: Math.max(0.25, Math.log10(Math.max(10, engagement + 10))),
      };
    });

    return summarizeMentions(mentions);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'X sentiment fetch failed';
    return buildEmptySourceScore(message, 'error');
  }
}

export async function buildSupplementarySocialOverlay({
  query,
  symbol,
  companyName,
  keyword,
}: {
  query: string;
  symbol: string | null;
  companyName: string | null;
  keyword: string | null;
}): Promise<SentimentSocialOverlay> {
  const [reddit, x] = await Promise.all([
    fetchRedditSupplementaryScore({ query, symbol, companyName, keyword }),
    fetchXSupplementaryScore({ query, symbol, companyName, keyword }),
  ]);

  const available = [reddit, x].filter((item) => item.status === 'available' && item.overallScore != null);
  const overallSupplementaryScore = available.length
    ? round(average(available.map((item) => item.overallScore as number)), 3)
    : null;

  return {
    overallSupplementaryScore,
    overallSupplementaryLabel:
      overallSupplementaryScore == null ? null : (scoreToLabel(overallSupplementaryScore) as SentimentLabel),
    reddit,
    x,
    referenceModels: REFERENCE_MODELS,
  };
}
