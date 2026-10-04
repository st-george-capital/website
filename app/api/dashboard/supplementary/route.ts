import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  fetchAlphaVantageEarningsCallTranscript,
  fetchAlphaVantageEarningsCalendar,
  fetchAlphaVantageEarningsEstimates,
  fetchAlphaVantageEarningsHistory,
  fetchAlphaVantageInstitutionalHoldings,
  fetchAlphaVantageInsiderTransactions,
  fetchAlphaVantageSymbolSearch,
  type AlphaVantageSymbolMatch,
} from '@/lib/alpha-vantage';
import type { SupplementaryResponsePayload, SupplementaryTab } from '@/lib/supplementary';
import {
  formatQuarterLabel,
  normalizeCalendarData,
  normalizeEstimatesData,
  normalizeInsiderData,
  normalizeInstitutionalHoldingsData,
  normalizeTranscriptData,
  quarterFromDate,
} from '@/lib/supplementary-data';

export const dynamic = 'force-dynamic';

function looksLikeTicker(value: string) {
  return /^[A-Za-z.\-]{1,8}$/.test(value.trim());
}

function pickBestSymbolMatch(matches: AlphaVantageSymbolMatch[]) {
  if (!matches.length) return null;

  return [...matches].sort((left, right) => {
    const regionScore = (match: AlphaVantageSymbolMatch) => {
      if (/united states/i.test(match.region)) return 3;
      if (/canada/i.test(match.region)) return 2;
      return 1;
    };

    return regionScore(right) - regionScore(left) || right.matchScore - left.matchScore;
  })[0];
}

async function resolveEntity(rawSymbol: string | null, rawQuery: string | null) {
  const candidate = rawSymbol?.trim() || rawQuery?.trim() || '';

  if (!candidate) {
    return {
      query: null,
      symbol: null,
      companyName: null,
    };
  }

  if (looksLikeTicker(candidate)) {
    return {
      query: rawQuery?.trim() || rawSymbol?.trim() || null,
      symbol: candidate.toUpperCase(),
      companyName: candidate.toUpperCase(),
    };
  }

  const matches = await fetchAlphaVantageSymbolSearch(candidate);
  const bestMatch = pickBestSymbolMatch(matches);

  return {
    query: rawQuery?.trim() || rawSymbol?.trim() || null,
    symbol: bestMatch?.symbol || null,
    companyName: bestMatch?.name || null,
  };
}

function normalizeTab(raw: string | null): SupplementaryTab {
  if (raw === 'insider' || raw === 'estimates' || raw === 'calendar' || raw === 'holdings') return raw;
  return 'transcript';
}

function normalizeHorizon(raw: string | null): '3month' | '6month' | '12month' {
  if (raw === '6month' || raw === '12month') return raw;
  return '3month';
}

function emptyPayload(
  tab: SupplementaryTab,
  entity: SupplementaryResponsePayload['entity']
): SupplementaryResponsePayload {
  return {
    tab,
    entity,
    emptyState: null,
    transcript: null,
    insider: null,
    estimates: null,
    calendar: null,
    holdings: null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === 'visitor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = normalizeTab(searchParams.get('tab'));
    const entity = await resolveEntity(searchParams.get('symbol'), searchParams.get('query'));
    const horizon = normalizeHorizon(searchParams.get('horizon'));
    const requestedQuarter = searchParams.get('quarter')?.trim() || null;

    if (tab !== 'calendar' && !entity.symbol) {
      return NextResponse.json({ error: 'Enter a valid ticker or company first.' }, { status: 400 });
    }

    if (tab === 'transcript') {
      const earnings = await fetchAlphaVantageEarningsHistory(entity.symbol as string);
      const availableQuarterKeys = earnings.quarterlyEarnings
        .map((entry) => quarterFromDate(entry.fiscalDateEnding || entry.reportedDate))
        .filter((quarter): quarter is string => Boolean(quarter))
        .filter((quarter, index, array) => array.indexOf(quarter) === index)
        .slice(0, 8);
      const quarter =
        requestedQuarter && /^\d{4}Q[1-4]$/.test(requestedQuarter)
          ? requestedQuarter
          : availableQuarterKeys[0] || null;

      if (!quarter) {
        const payload = emptyPayload(tab, entity);
        payload.emptyState = 'No recent earnings history was available to determine a transcript quarter.';
        return NextResponse.json(payload);
      }

      const transcriptRaw = await fetchAlphaVantageEarningsCallTranscript(entity.symbol as string, quarter);
      const transcript = normalizeTranscriptData(
        transcriptRaw as Record<string, unknown>,
        formatQuarterLabel(quarter),
        availableQuarterKeys.map(formatQuarterLabel)
      );

      const payload = emptyPayload(tab, entity);
      payload.transcript = transcript;
      payload.emptyState = transcript ? null : `No transcript content was available for ${formatQuarterLabel(quarter)}.`;
      return NextResponse.json(payload);
    }

    if (tab === 'insider') {
      const insiderRaw = await fetchAlphaVantageInsiderTransactions(entity.symbol as string);
      const insider = normalizeInsiderData(insiderRaw as Record<string, unknown>);
      const payload = emptyPayload(tab, entity);
      payload.insider = insider;
      payload.emptyState = insider ? null : 'No insider transaction records were returned for this ticker.';
      return NextResponse.json(payload);
    }

    if (tab === 'estimates') {
      const estimatesRaw = await fetchAlphaVantageEarningsEstimates(entity.symbol as string);
      const estimates = normalizeEstimatesData(estimatesRaw as Record<string, unknown>);
      const payload = emptyPayload(tab, entity);
      payload.estimates = estimates;
      payload.emptyState = estimates ? null : 'No earnings estimate data was returned for this ticker.';
      return NextResponse.json(payload);
    }

    if (tab === 'holdings') {
      const holdingsRaw = await fetchAlphaVantageInstitutionalHoldings(entity.symbol as string);
      const holdings = normalizeInstitutionalHoldingsData(holdingsRaw);
      const payload = emptyPayload(tab, entity);
      payload.holdings = holdings;
      payload.emptyState = holdings ? null : 'No institutional holdings data was returned for this ticker.';
      return NextResponse.json(payload);
    }

    const calendarEntries = await fetchAlphaVantageEarningsCalendar(horizon);
    const calendar = normalizeCalendarData(calendarEntries, horizon, entity.symbol);
    const payload = emptyPayload(tab, entity);
    payload.calendar = calendar;
    payload.emptyState = calendar.entries.length ? null : 'No earnings events matched the current filter.';
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load supplementary data';
    console.error('[dashboard/supplementary] GET error:', error);

    if (message.includes('ALPHA_VANTAGE_API_KEY')) {
      return NextResponse.json({ error: 'ALPHA_VANTAGE_API_KEY is not configured' }, { status: 503 });
    }

    if (message.includes('rate limit')) {
      return NextResponse.json({ error: 'Alpha Vantage rate limit reached. Please try again in a moment.' }, { status: 429 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
