/**
 * lib/macro-engine/providers/av-earnings.ts
 *
 * Alpha Vantage EARNINGS endpoint — fetches quarterly EPS (actual vs estimated)
 * for individual stocks. ETFs don't report earnings, so we use proxy stocks
 * (largest holdings) to compute earnings revision momentum for each ETF.
 *
 * Proxy mapping rationale:
 *   SPY → AAPL (largest S&P 500 holding, broadest market proxy)
 *   XLK → AAPL (largest XLK holding ~20%)
 *   XLF → JPM (largest XLF holding ~10%)
 *   XLE → XOM (largest XLE holding ~22%)
 *   XLV → LLY (largest XLV holding ~12%)
 *   EWJ → TM (Toyota — largest Japan market cap)
 *   EWG → SAP (SAP SE — largest Germany market cap)
 *   EWU → AZN (AstraZeneca — largest UK market cap, US-listed ADR)
 *   EWC → SHOP (Shopify — Canada tech)
 *   EWA → BHP (BHP Group — Australia resources, US ADR)
 *   EWZ → VALE (Vale SA — Brazil resources, US-listed)
 *   MCHI → BABA (Alibaba — largest China holding in MCHI)
 *
 * All proxies are US-listed (NYSE/NASDAQ) so AV has full earnings history.
 */

export const ETF_EARNINGS_PROXY: Record<string, string> = {
  SPY:  'AAPL',
  XLK:  'AAPL',
  XLF:  'JPM',
  XLE:  'XOM',
  XLV:  'LLY',
  EWJ:  'TM',
  EWG:  'SAP',
  EWU:  'AZN',
  EWC:  'SHOP',
  EWA:  'BHP',
  EWZ:  'VALE',
  MCHI: 'BABA',
};

export interface AvEarningsRow {
  /** ETF ticker this earnings row proxies for */
  etfTicker: string;
  /** Underlying proxy stock ticker (e.g. AAPL) */
  proxyTicker: string;
  /** Fiscal quarter end date */
  fiscalDateEnding: Date;
  /** Reported EPS (null if not yet reported) */
  reportedEPS: number | null;
  /** Estimated EPS (consensus) */
  estimatedEPS: number | null;
  /** EPS surprise absolute value */
  surprise: number | null;
  /** EPS surprise as % */
  surprisePercentage: number | null;
  /** Date the earnings were reported to market */
  reportedDate: Date | null;
}

/**
 * Fetches quarterly earnings history for a proxy stock ticker.
 * Returns up to 120 quarters (~30 years) of data.
 */
export async function fetchAvEarnings(proxyTicker: string): Promise<AvEarningsRow[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) throw new Error('ALPHA_VANTAGE_API_KEY not set');

  const url = `https://www.alphavantage.co/query?function=EARNINGS&symbol=${proxyTicker}&apikey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Alpha Vantage EARNINGS ${proxyTicker}: HTTP ${response.status}`);

  const data = await response.json();

  if (data.Information) {
    throw new Error(`Alpha Vantage rate limit for ${proxyTicker}: ${data.Information}`);
  }
  if (data['Error Message']) {
    throw new Error(`Alpha Vantage error for ${proxyTicker}: ${data['Error Message']}`);
  }

  const quarterly: unknown[] = Array.isArray(data.quarterlyEarnings) ? data.quarterlyEarnings : [];

  return quarterly.flatMap((q) => {
    const row = q as Record<string, string>;

    const fiscalDate = new Date(row.fiscalDateEnding);
    if (isNaN(fiscalDate.getTime())) return [];

    const reportedDate = row.reportedDate && row.reportedDate !== 'None'
      ? new Date(row.reportedDate)
      : null;

    const parseNum = (s: string) => {
      const n = parseFloat(s);
      return isFinite(n) ? n : null;
    };

    return [{
      etfTicker: '', // filled by caller
      proxyTicker,
      fiscalDateEnding: fiscalDate,
      reportedEPS: parseNum(row.reportedEPS),
      estimatedEPS: parseNum(row.estimatedEPS),
      surprise: parseNum(row.surprise),
      surprisePercentage: parseNum(row.surprisePercentage),
      reportedDate,
    }];
  });
}
