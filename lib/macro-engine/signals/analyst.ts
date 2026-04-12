/**
 * Analyst consensus overlay (ALLC-05) and SMR proxy computation (ALLC-04).
 *
 * Uses FMP stable endpoints (post-August 2025 API — legacy v3/v4 endpoints are no longer supported):
 *   - /stable/grades           → per-analyst grade text, aggregated into consensus buckets
 *   - /stable/income-statement → quarterly revenue/margin data for SMR grade
 *
 * Both functions are enrichment-only: they log warnings and return null for tickers
 * where FMP returns an error or insufficient data. They never throw — cron must continue.
 */

const FMP_BASE = 'https://financialmodelingprep.com';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface AnalystConsensus {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  source: string; // 'fmp-grades'
}

// Grade text → consensus bucket mapping
// Covers the full range of grade strings returned by FMP /stable/grades
const GRADE_TO_BUCKET: Record<string, keyof Omit<AnalystConsensus, 'source'>> = {
  // Strong Buy equivalents
  'Strong Buy': 'strongBuy',
  'Strong-Buy': 'strongBuy',
  // Buy equivalents
  'Buy': 'buy',
  'Outperform': 'buy',
  'Overweight': 'buy',
  'Market Outperform': 'buy',
  'Sector Outperform': 'buy',
  'Long Term Buy': 'buy',
  'Positive': 'buy',
  // Hold equivalents
  'Hold': 'hold',
  'Neutral': 'hold',
  'Market Perform': 'hold',
  'Sector Perform': 'hold',
  'Peer Perform': 'hold',
  'Equal Weight': 'hold',
  'Sector Weight': 'hold',
  'Perform': 'hold',
  // Sell equivalents
  'Sell': 'sell',
  'Underperform': 'sell',
  'Underweight': 'sell',
  'Reduce': 'sell',
  // Strong Sell equivalents
  'Strong Sell': 'strongSell',
};

// --------------------------------------------------------------------------
// fetchAnalystConsensus
// --------------------------------------------------------------------------

/**
 * Fetches analyst grade consensus for each ticker using FMP /stable/grades.
 *
 * Aggregates individual analyst grades from the last 90 days into:
 * { strongBuy, buy, hold, sell, strongSell }
 *
 * Returns a Map<ticker, AnalystConsensus | null>.
 * null means: tier error, fetch error, no recent grades, or unknown grades only.
 *
 * Never throws — all errors are caught and logged.
 * Rate-limited: 800ms stagger between tickers.
 */
export async function fetchAnalystConsensus(
  tickers: string[],
): Promise<Map<string, AnalystConsensus | null>> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    throw new Error(
      'FMP_API_KEY is not set. Set it in .env before calling fetchAnalystConsensus.',
    );
  }

  const result = new Map<string, AnalystConsensus | null>();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90); // last 90 days

  for (const ticker of tickers) {
    try {
      const url = `${FMP_BASE}/stable/grades?symbol=${encodeURIComponent(ticker)}&limit=200&apikey=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(
          `fetchAnalystConsensus: FMP grades returned ${response.status} for ${ticker} — setting null`,
        );
        result.set(ticker, null);
      } else {
        const data: unknown = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
          console.warn(
            `fetchAnalystConsensus: no grades returned for ${ticker} — setting null`,
          );
          result.set(ticker, null);
        } else {
          // Aggregate recent grades (last 90 days)
          const consensus: AnalystConsensus = {
            strongBuy: 0,
            buy: 0,
            hold: 0,
            sell: 0,
            strongSell: 0,
            source: 'fmp-grades',
          };

          let countMapped = 0;

          for (const row of data) {
            const rec = row as Record<string, unknown>;
            const dateStr = String(rec.date ?? '');
            const gradeDate = new Date(dateStr);

            if (isNaN(gradeDate.getTime()) || gradeDate < cutoffDate) {
              continue; // Skip grades older than 90 days
            }

            const grade = String(rec.newGrade ?? '');
            const bucket = GRADE_TO_BUCKET[grade];
            if (bucket) {
              consensus[bucket]++;
              countMapped++;
            }
          }

          if (countMapped === 0) {
            console.warn(
              `fetchAnalystConsensus: no mappable grades in last 90 days for ${ticker} — setting null`,
            );
            result.set(ticker, null);
          } else {
            result.set(ticker, consensus);
          }
        }
      }
    } catch (err) {
      console.warn(
        `fetchAnalystConsensus: error fetching grades for ${ticker}:`,
        err instanceof Error ? err.message : err,
      );
      result.set(ticker, null);
    }

    // Rate-limit safety: 800ms stagger between tickers
    await new Promise((r) => setTimeout(r, 800));
  }

  return result;
}

// --------------------------------------------------------------------------
// fetchSmrProxy
// --------------------------------------------------------------------------

/**
 * Computes O'Neil SMR proxy grade ("A"–"E") for each ticker using FMP quarterly
 * income statement data.
 *
 * Algorithm (from plan interfaces):
 *   - Uses last 5 quarters (capped at tier limit of 5) — requires >= 4 quarters
 *   - revenueGrowth = linear slope of revenue / mean(revenue)
 *   - marginTrend   = linear slope of grossProfit / revenue
 *   - roeTrend      = linear slope of netIncome / revenue (ROE proxy; skip if null)
 *   - Score each 0–2, sum → map to "A"–"E"
 *
 * Returns Map<ticker, string | null>.
 * null = insufficient data, fetch error, or tier restriction.
 *
 * Never throws — all errors caught and logged.
 * Rate-limited: 800ms stagger between tickers.
 *
 * NOTE: FMP Starter tier limits limit= to 5 for income-statement. The algorithm
 * uses all available rows (min 4, max 5). If tier is upgraded, increase limit to 8
 * and the algorithm will automatically use more data.
 */
export async function fetchSmrProxy(
  tickers: string[],
): Promise<Map<string, string | null>> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    console.warn(
      'fetchSmrProxy: FMP_API_KEY not set — returning empty map (all null)',
    );
    return new Map(tickers.map((t) => [t, null]));
  }

  const result = new Map<string, string | null>();

  for (const ticker of tickers) {
    try {
      // Use limit=5 (Starter tier max). Use quarterly period for trend analysis.
      const url = `${FMP_BASE}/stable/income-statement?symbol=${encodeURIComponent(ticker)}&period=quarter&limit=5&apikey=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(
          `fetchSmrProxy: FMP income-statement returned ${response.status} for ${ticker} — setting null`,
        );
        result.set(ticker, null);
      } else {
        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
          console.warn(
            `fetchSmrProxy: unexpected response format for ${ticker} — setting null`,
          );
          result.set(ticker, null);
        } else {
          const grade = computeSmrGrade(ticker, data as Record<string, unknown>[]);
          result.set(ticker, grade);
        }
      }
    } catch (err) {
      console.warn(
        `fetchSmrProxy: error fetching income-statement for ${ticker}:`,
        err instanceof Error ? err.message : err,
      );
      result.set(ticker, null);
    }

    // Rate-limit safety: 800ms stagger between tickers
    await new Promise((r) => setTimeout(r, 800));
  }

  return result;
}

// --------------------------------------------------------------------------
// SMR Grade Computation
// --------------------------------------------------------------------------

/**
 * Computes the SMR grade from income statement rows (sorted newest-first by FMP).
 * Requires >= 4 rows. Returns null if insufficient data.
 *
 * Reverses rows to oldest-first for slope computation (x = 0, 1, 2... = oldest to newest).
 */
function computeSmrGrade(
  ticker: string,
  rows: Record<string, unknown>[],
): string | null {
  // FMP returns newest-first; reverse to oldest-first for index-based slope
  const sorted = [...rows].reverse();

  if (sorted.length < 4) {
    console.warn(
      `fetchSmrProxy: ${ticker} has only ${sorted.length} quarters (need >= 4) — setting null`,
    );
    return null;
  }

  // Extract revenue and gross profit series
  const revenues: number[] = [];
  const margins: number[] = [];
  const netIncomes: number[] = [];

  for (const row of sorted) {
    const revenue = toNumber(row.revenue);
    const grossProfit = toNumber(row.grossProfit);
    const netIncome = toNumber(row.netIncome);

    if (revenue === null || revenue === 0) continue;
    revenues.push(revenue);
    margins.push(grossProfit !== null ? grossProfit / revenue : NaN);
    netIncomes.push(netIncome !== null ? netIncome / revenue : NaN);
  }

  if (revenues.length < 4) {
    console.warn(
      `fetchSmrProxy: ${ticker} has insufficient valid revenue rows (${revenues.length}) — setting null`,
    );
    return null;
  }

  // Revenue growth: slope of revenue normalized by mean revenue
  const meanRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
  const normalizedRevenues = revenues.map((r) => r / meanRevenue);
  const revenueGrowth = slope(normalizedRevenues);

  // Margin trend: slope of grossProfit / revenue
  const validMargins = margins.filter((m) => !isNaN(m));
  const marginTrend = validMargins.length >= 4 ? slope(validMargins) : null;

  // Net income margin trend (proxy for ROE since ROE field not in FMP stable endpoint)
  const validNetIncomeMargins = netIncomes.filter((m) => !isNaN(m));
  const roeTrend =
    validNetIncomeMargins.length >= 4 ? slope(validNetIncomeMargins) : null;

  // Score each dimension 0–2
  const revenueScore = revenueGrowth > 0.02 ? 2 : revenueGrowth >= -0.01 ? 1 : 0;
  const marginScore =
    marginTrend !== null
      ? marginTrend > 0.005
        ? 2
        : marginTrend >= -0.005
          ? 1
          : 0
      : null;
  const roeScore =
    roeTrend !== null
      ? roeTrend > 0.01
        ? 2
        : roeTrend >= -0.01
          ? 1
          : 0
      : null;

  // Sum available scores, normalize to [0, 6]
  let total = revenueScore;
  let maxPossible = 2;

  if (marginScore !== null) {
    total += marginScore;
    maxPossible += 2;
  }
  if (roeScore !== null) {
    total += roeScore;
    maxPossible += 2;
  }

  // Normalize to [0, 6] scale
  const normalized = (total / maxPossible) * 6;

  let grade: string;
  if (normalized >= 5) grade = 'A';
  else if (normalized >= 4) grade = 'B';
  else if (normalized >= 3) grade = 'C';
  else if (normalized >= 2) grade = 'D';
  else grade = 'E';

  return grade;
}

// --------------------------------------------------------------------------
// Helper: Linear Least-Squares Slope
// --------------------------------------------------------------------------

/**
 * Computes linear least-squares slope for a series of y values.
 * x is implicitly 0, 1, 2, ... (oldest to newest).
 *
 * Formula: (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)
 */
function slope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;

  return (n * sumXY - sumX * sumY) / denom;
}

// --------------------------------------------------------------------------
// Helper: Safe number extraction
// --------------------------------------------------------------------------

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}
