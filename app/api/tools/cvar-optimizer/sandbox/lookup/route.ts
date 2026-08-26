import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface CompanyOverview {
  symbol: string | null;
  name: string | null;
  exchange: string | null;
  sector: string | null;
  country: string | null;
}

// Fetches OVERVIEW directly rather than reusing lib/quant/factors.ts's
// fetchRawFundamentals — that function deliberately returns only the numeric fields
// factor scoring needs and drops Symbol/Name/Exchange/Sector/Country, which is exactly
// what this route needs instead. Mirrors fetchRawFundamentals's request/error-handling
// shape for consistency.
async function fetchCompanyOverview(ticker: string): Promise<CompanyOverview | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) throw new Error('ALPHA_VANTAGE_API_KEY not configured');

  const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Alpha Vantage OVERVIEW error for ${ticker}: ${res.status}`);
  const data = await res.json();

  if (data.Note || data.Information || data['Error Message']) return null;
  if (!data.Symbol && !data.Name) return null;

  return {
    symbol: data.Symbol ?? null,
    name: data.Name ?? null,
    exchange: data.Exchange ?? null,
    sector: data.Sector ?? null,
    country: data.Country ?? null,
  };
}

// Alpha Vantage's OVERVIEW sector strings are close to GICS but not an exact match to
// the sector keys used in OptimizationConstraintSet.sectorLimits (see
// scripts/seed-cvar-constraint-set.js) — normalize the common ones so autofilled sandbox
// rows actually line up with sector constraint bands rather than silently falling outside
// every band (unmapped sectors just get left as Alpha Vantage's raw string, which the LP
// treats as an unconstrained sector membership).
const SECTOR_MAP: Record<string, string> = {
  TECHNOLOGY: 'Information Technology',
  'INFORMATION TECHNOLOGY': 'Information Technology',
  HEALTHCARE: 'Health Care',
  'HEALTH CARE': 'Health Care',
  'LIFE SCIENCES': 'Health Care',
  FINANCE: 'Financials',
  FINANCIALS: 'Financials',
  'FINANCIAL SERVICES': 'Financials',
  ENERGY: 'Energy',
  UTILITIES: 'Utilities',
  INDUSTRIALS: 'Industrials',
  MANUFACTURING: 'Industrials',
  MATERIALS: 'Materials',
  'BASIC MATERIALS': 'Materials',
  'CONSUMER STAPLES': 'Consumer Staples',
  'CONSUMER DEFENSIVE': 'Consumer Staples',
  'CONSUMER DISCRETIONARY': 'Consumer Discretionary',
  'CONSUMER CYCLICAL': 'Consumer Discretionary',
  'TRADE & SERVICES': 'Consumer Discretionary',
  'COMMUNICATION SERVICES': 'Communication Services',
  TELECOMMUNICATIONS: 'Communication Services',
  'REAL ESTATE': 'Real Estate',
};

// Alpha Vantage's OVERVIEW Country field is a plain country name/code (e.g. "USA",
// "United Kingdom") — not the coarse region grouping OptimizationConstraintSet.regionLimits
// uses (US / Europe / Japan / APAC_Other). Map the common ones; anything unmapped falls
// through to null so it's visibly unset in the sandbox UI rather than silently guessed.
const COUNTRY_TO_REGION: Record<string, string> = {
  USA: 'US', 'UNITED STATES': 'US', US: 'US',
  JAPAN: 'Japan', JP: 'Japan',
  'UNITED KINGDOM': 'Europe', UK: 'Europe', GERMANY: 'Europe', FRANCE: 'Europe',
  ITALY: 'Europe', SPAIN: 'Europe', NETHERLANDS: 'Europe', SWITZERLAND: 'Europe',
  SWEDEN: 'Europe', NORWAY: 'Europe', DENMARK: 'Europe', FINLAND: 'Europe',
  BELGIUM: 'Europe', IRELAND: 'Europe', AUSTRIA: 'Europe', PORTUGAL: 'Europe',
  CHINA: 'APAC_Other', 'HONG KONG': 'APAC_Other', TAIWAN: 'APAC_Other',
  'SOUTH KOREA': 'APAC_Other', KOREA: 'APAC_Other', SINGAPORE: 'APAC_Other',
  AUSTRALIA: 'APAC_Other', INDIA: 'APAC_Other', 'NEW ZEALAND': 'APAC_Other',
  CANADA: 'APAC_Other', // not APAC geographically, but not in the US/Europe/Japan bands
  // either — bucketed with "Other" so it's visible/adjustable rather than mis-tagged as US.
};

function normalizeSector(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.trim().toUpperCase();
  return SECTOR_MAP[key] ?? raw; // fall back to the raw Alpha Vantage string if unmapped
}

function normalizeRegion(country: string | null | undefined): string | null {
  if (!country) return null;
  const key = country.trim().toUpperCase();
  return COUNTRY_TO_REGION[key] ?? null; // unmapped countries left null, not guessed
}

// GET /api/tools/cvar-optimizer/sandbox/lookup?ticker=AAPL
// Ticker-autofill for the Sandbox tab: given a ticker, returns company name, exchange,
// normalized sector, and normalized region so the sandbox form can populate those fields
// automatically instead of requiring manual entry.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticker = request.nextUrl.searchParams.get('ticker')?.trim().toUpperCase();
    if (!ticker) {
      return NextResponse.json({ error: 'ticker query param required' }, { status: 400 });
    }

    const overview = await fetchCompanyOverview(ticker);
    if (!overview || !overview.symbol) {
      return NextResponse.json({ error: `No company data found for ${ticker}.` }, { status: 404 });
    }

    return NextResponse.json({
      ticker: overview.symbol,
      name: overview.name ?? null,
      exchange: overview.exchange ?? null,
      rawSector: overview.sector ?? null,
      rawCountry: overview.country ?? null,
      sector: normalizeSector(overview.sector),
      region: normalizeRegion(overview.country),
    });
  } catch (error) {
    console.error('CVaR sandbox lookup error:', error);
    return NextResponse.json({ error: 'Failed to look up ticker' }, { status: 500 });
  }
}
