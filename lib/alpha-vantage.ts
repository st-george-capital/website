const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';

export interface AlphaVantageQuote {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export async function fetchAlphaVantageQuote(ticker: string): Promise<AlphaVantageQuote> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured');
  }

  const url = `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
  const response = await fetch(url, { next: { revalidate: 0 } });

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json();

  // Alpha Vantage returns { "Note": "..." } when rate-limited
  if (data.Note) {
    throw new Error('Alpha Vantage rate limit reached');
  }

  // Alpha Vantage returns { "Error Message": "..." } for invalid requests
  if (data['Error Message']) {
    throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
  }

  const quote = data['Global Quote'];
  if (!quote || !quote['05. price']) {
    throw new Error(`No quote data for ${ticker}`);
  }

  return {
    price: parseFloat(quote['05. price']),
    change: parseFloat(quote['09. change']),
    changePercent: parseFloat((quote['10. change percent'] || '0').replace('%', '')),
    volume: parseInt(quote['06. volume'] || '0', 10),
  };
}

export interface DailyPrice {
  date: string;
  close: number;
}

export interface AlphaVantageSymbolMatch {
  symbol: string;
  name: string;
  type: string;
  region: string;
  marketOpen: string;
  marketClose: string;
  timezone: string;
  currency: string;
  matchScore: number;
}

export interface AlphaVantageNewsTopic {
  topic: string;
  relevanceScore: number;
}

export interface AlphaVantageTickerSentiment {
  ticker: string;
  relevanceScore: number;
  sentimentScore: number;
  sentimentLabel: string;
}

export interface AlphaVantageNewsArticle {
  title: string;
  url: string;
  timePublished: string;
  authors: string[];
  summary: string;
  bannerImage: string | null;
  source: string;
  categoryWithinSource: string | null;
  sourceDomain: string | null;
  overallSentimentScore: number;
  overallSentimentLabel: string;
  topics: AlphaVantageNewsTopic[];
  tickerSentiment: AlphaVantageTickerSentiment[];
}

export interface AlphaVantageQuarterlyEarning {
  fiscalDateEnding: string;
  reportedDate: string;
  reportedEPS: number | null;
  estimatedEPS: number | null;
  surprise: number | null;
  surprisePercentage: number | null;
  reportTime?: string | null;
}

export interface AlphaVantageAnnualEarning {
  fiscalDateEnding: string;
  reportedEPS: number | null;
}

export interface AlphaVantageEarningsHistory {
  symbol: string;
  quarterlyEarnings: AlphaVantageQuarterlyEarning[];
  annualEarnings: AlphaVantageAnnualEarning[];
}

export interface AlphaVantageTranscriptResponse {
  [key: string]: unknown;
}

export interface AlphaVantageInsiderTransactionResponse {
  [key: string]: unknown;
}

export interface AlphaVantageEarningsEstimateResponse {
  [key: string]: unknown;
}

export interface AlphaVantageEarningsCalendarEntry {
  symbol: string;
  name: string | null;
  reportDate: string | null;
  fiscalDateEnding: string | null;
  estimate: number | null;
  currency: string | null;
}

interface AlphaVantageRequestParams {
  [key: string]: string | number | undefined | null;
}

function getAlphaVantageApiKey() {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured');
  }
  return apiKey;
}

async function fetchAlphaVantage(params: AlphaVantageRequestParams) {
  const url = new URL(ALPHA_VANTAGE_BASE);
  const apiKey = getAlphaVantageApiKey();

  Object.entries({
    ...params,
    apikey: apiKey,
  }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), { next: { revalidate: 0 } });

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.Note) {
    throw new Error('Alpha Vantage rate limit reached');
  }

  if (data['Error Message']) {
    throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
  }

  if (data.Information) {
    throw new Error(`Alpha Vantage info: ${data.Information}`);
  }

  return data;
}

async function fetchAlphaVantageCsv(params: AlphaVantageRequestParams) {
  const url = new URL(ALPHA_VANTAGE_BASE);
  const apiKey = getAlphaVantageApiKey();

  Object.entries({
    ...params,
    apikey: apiKey,
  }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), { next: { revalidate: 0 } });

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const text = await response.text();

  if (text.includes('Thank you for using Alpha Vantage')) {
    throw new Error('Alpha Vantage rate limit reached');
  }

  if (text.includes('"Error Message"')) {
    throw new Error('Alpha Vantage returned an invalid request');
  }

  return text;
}

function parseFloatOrNull(value: string | null | undefined) {
  if (value == null || value === '') return null;
  const parsed = Number.parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === ',' && !insideQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = values[index] ?? '';
      return record;
    }, {});
  });
}

export async function fetchAlphaVantageDailyHistory(
  ticker: string,
  outputSize: 'compact' | 'full' = 'compact'
): Promise<DailyPrice[]> {
  const data = await fetchAlphaVantage({
    function: 'TIME_SERIES_DAILY',
    symbol: ticker,
    outputsize: outputSize,
  });

  const timeSeries = data['Time Series (Daily)'];
  if (!timeSeries) {
    throw new Error(`No daily data for ${ticker}`);
  }

  return Object.entries(timeSeries)
    .map(([date, values]: [string, unknown]) => ({
      date,
      close: parseFloat((values as Record<string, string>)['4. close']),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchAlphaVantageSymbolSearch(query: string): Promise<AlphaVantageSymbolMatch[]> {
  const data = await fetchAlphaVantage({
    function: 'SYMBOL_SEARCH',
    keywords: query,
  });

  const bestMatches = Array.isArray(data.bestMatches) ? data.bestMatches : [];

  return bestMatches.map((match: Record<string, string>) => ({
    symbol: match['1. symbol'],
    name: match['2. name'],
    type: match['3. type'],
    region: match['4. region'],
    marketOpen: match['5. marketOpen'],
    marketClose: match['6. marketClose'],
    timezone: match['7. timezone'],
    currency: match['8. currency'],
    matchScore: Number(match['9. matchScore'] || 0),
  }));
}

export async function fetchAlphaVantageNewsSentiment({
  tickers,
  keywords,
  timeFrom,
  sort = 'LATEST',
  limit = 50,
}: {
  tickers?: string;
  keywords?: string;
  timeFrom?: string;
  sort?: 'LATEST' | 'EARLIEST' | 'RELEVANCE';
  limit?: number;
}): Promise<AlphaVantageNewsArticle[]> {
  const data = await fetchAlphaVantage({
    function: 'NEWS_SENTIMENT',
    tickers,
    keywords,
    time_from: timeFrom,
    sort,
    limit,
  });

  const feed = Array.isArray(data.feed) ? data.feed : [];

  return feed.map((item: Record<string, any>) => ({
    title: item.title || '',
    url: item.url || '',
    timePublished: item.time_published || '',
    authors: Array.isArray(item.authors) ? item.authors : [],
    summary: item.summary || '',
    bannerImage: item.banner_image || null,
    source: item.source || '',
    categoryWithinSource: item.category_within_source || null,
    sourceDomain: item.source_domain || null,
    overallSentimentScore: Number(item.overall_sentiment_score || 0),
    overallSentimentLabel: item.overall_sentiment_label || 'Neutral',
    topics: Array.isArray(item.topics)
      ? item.topics.map((topic: Record<string, string>) => ({
          topic: topic.topic,
          relevanceScore: Number(topic.relevance_score || 0),
        }))
      : [],
    tickerSentiment: Array.isArray(item.ticker_sentiment)
      ? item.ticker_sentiment.map((sentiment: Record<string, string>) => ({
          ticker: sentiment.ticker,
          relevanceScore: Number(sentiment.relevance_score || 0),
          sentimentScore: Number(sentiment.ticker_sentiment_score || 0),
          sentimentLabel: sentiment.ticker_sentiment_label || 'Neutral',
        }))
      : [],
  }));
}

export async function fetchAlphaVantageEarningsHistory(
  ticker: string
): Promise<AlphaVantageEarningsHistory> {
  const data = await fetchAlphaVantage({
    function: 'EARNINGS',
    symbol: ticker,
  });

  return {
    symbol: data.symbol || ticker,
    quarterlyEarnings: Array.isArray(data.quarterlyEarnings)
      ? data.quarterlyEarnings.map((item: Record<string, string>) => ({
          fiscalDateEnding: item.fiscalDateEnding || '',
          reportedDate: item.reportedDate || '',
          reportedEPS: parseFloatOrNull(item.reportedEPS),
          estimatedEPS: parseFloatOrNull(item.estimatedEPS),
          surprise: parseFloatOrNull(item.surprise),
          surprisePercentage: parseFloatOrNull(item.surprisePercentage),
          reportTime: item.reportTime || null,
        }))
      : [],
    annualEarnings: Array.isArray(data.annualEarnings)
      ? data.annualEarnings.map((item: Record<string, string>) => ({
          fiscalDateEnding: item.fiscalDateEnding || '',
          reportedEPS: parseFloatOrNull(item.reportedEPS),
        }))
      : [],
  };
}

export async function fetchAlphaVantageEarningsCallTranscript(
  ticker: string,
  quarter: string
): Promise<AlphaVantageTranscriptResponse> {
  return fetchAlphaVantage({
    function: 'EARNINGS_CALL_TRANSCRIPT',
    symbol: ticker,
    quarter,
  });
}

export async function fetchAlphaVantageInsiderTransactions(
  ticker: string
): Promise<AlphaVantageInsiderTransactionResponse> {
  return fetchAlphaVantage({
    function: 'INSIDER_TRANSACTIONS',
    symbol: ticker,
  });
}

export async function fetchAlphaVantageEarningsEstimates(
  ticker: string
): Promise<AlphaVantageEarningsEstimateResponse> {
  return fetchAlphaVantage({
    function: 'EARNINGS_ESTIMATES',
    symbol: ticker,
  });
}

export async function fetchAlphaVantageEarningsCalendar(
  horizon: '3month' | '6month' | '12month' = '3month'
): Promise<AlphaVantageEarningsCalendarEntry[]> {
  const text = await fetchAlphaVantageCsv({
    function: 'EARNINGS_CALENDAR',
    horizon,
  });

  return parseCsv(text).map((row) => ({
    symbol: row.symbol || row.Symbol || '',
    name: row.name || row.Name || null,
    reportDate: row.reportDate || row.report_date || row.earningsDate || null,
    fiscalDateEnding: row.fiscalDateEnding || row.fiscal_date_ending || null,
    estimate: parseFloatOrNull(row.estimate || row.epsEstimate || row.eps_estimate),
    currency: row.currency || row.Currency || null,
  }));
}
