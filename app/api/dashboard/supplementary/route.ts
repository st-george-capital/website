import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  fetchAlphaVantageEarningsCallTranscript,
  fetchAlphaVantageEarningsCalendar,
  fetchAlphaVantageEarningsEstimates,
  fetchAlphaVantageEarningsHistory,
  fetchAlphaVantageInsiderTransactions,
  fetchAlphaVantageSymbolSearch,
  type AlphaVantageSymbolMatch,
} from '@/lib/alpha-vantage';
import type {
  SupplementaryCalendarData,
  SupplementaryEstimateRow,
  SupplementaryEstimatesData,
  SupplementaryInsiderData,
  SupplementaryInsiderSummary,
  SupplementaryInsiderTransaction,
  SupplementaryResponsePayload,
  SupplementaryTab,
  SupplementaryTranscriptData,
  SupplementaryTranscriptSection,
} from '@/lib/supplementary';

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
  if (raw === 'insider' || raw === 'estimates' || raw === 'calendar') return raw;
  return 'transcript';
}

function normalizeHorizon(raw: string | null): '3month' | '6month' | '12month' {
  if (raw === '6month' || raw === '12month') return raw;
  return '3month';
}

function quarterFromDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const quarter = Math.floor(parsed.getUTCMonth() / 3) + 1;
  return `${parsed.getUTCFullYear()}Q${quarter}`;
}

function formatQuarterLabel(value: string) {
  return /^(\d{4})Q([1-4])$/.test(value) ? value.replace(/^(\d{4})Q([1-4])$/, 'Q$2 $1') : value;
}

function parseNumeric(value: unknown) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value).replace(/[$,%\s]/g, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractFirstArray(data: Record<string, unknown>, preferredKeys: string[]) {
  for (const key of preferredKeys) {
    if (Array.isArray(data[key])) {
      return data[key] as unknown[];
    }
  }

  const match = Object.values(data).find((value) => Array.isArray(value));
  return Array.isArray(match) ? match : [];
}

function extractTextCandidate(value: unknown): string {
  if (typeof value === 'string') return value;

  if (Array.isArray(value)) {
    return value.map((entry) => extractTextCandidate(entry)).filter(Boolean).join('\n\n');
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const direct =
      record.content ||
      record.text ||
      record.body ||
      record.transcript ||
      record.paragraph ||
      record.value;
    const speaker = typeof record.speaker === 'string' ? `${record.speaker}: ` : '';
    const candidate = extractTextCandidate(direct);
    if (candidate) return `${speaker}${candidate}`.trim();

    return Object.values(record).map((entry) => extractTextCandidate(entry)).filter(Boolean).join('\n\n');
  }

  return '';
}

function splitTranscriptSections(raw: string) {
  const cleaned = raw.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const prepared: string[] = [];
  const qa: string[] = [];
  let inQa = false;

  paragraphs.forEach((paragraph) => {
    if (/questions?\s*(and|&)\s*answers?|q&a/i.test(paragraph)) {
      inQa = true;
      return;
    }

    if (/^(operator|question|analyst):/i.test(paragraph)) {
      inQa = true;
    }

    if (inQa) {
      qa.push(paragraph);
    } else {
      prepared.push(paragraph);
    }
  });

  return { prepared, qa };
}

function buildTone(text: string) {
  const positive = (text.match(/\b(strong|accelerat|opportunit|confidence|outperform|resilien|improv|expansion|grow|momentum)\b/gi) || []).length;
  const negative = (text.match(/\b(challenge|pressure|headwind|slow|uncertain|risk|constrain|weak|volatile|softness)\b/gi) || []).length;

  if (positive - negative >= 4) {
    return {
      label: 'constructive' as const,
      detail: 'Prepared remarks and Q&A lean constructive, with positive demand and execution language outweighing cautionary phrasing.',
    };
  }

  if (negative - positive >= 4) {
    return {
      label: 'cautious' as const,
      detail: 'Management language leans cautious, with risk, constraint, and pressure references appearing more often than expansion language.',
    };
  }

  return {
    label: 'balanced' as const,
    detail: 'Management tone is balanced overall, mixing constructive operating commentary with measured discussion of risks and constraints.',
  };
}

function buildKeyTopics(text: string) {
  const topics = [
    { topic: 'AI / Product', pattern: /\b(ai|copilot|model|platform|product|launch)\b/gi },
    { topic: 'Demand / Growth', pattern: /\b(demand|growth|bookings|backlog|pipeline|customer)\b/gi },
    { topic: 'Margins / Costs', pattern: /\b(margin|cost|opex|efficien|profit|pricing)\b/gi },
    { topic: 'Capital Return', pattern: /\b(buyback|dividend|capital return|repurchase)\b/gi },
    { topic: 'Guidance / Outlook', pattern: /\b(guidance|outlook|forecast|expect|visibility)\b/gi },
  ];

  return topics
    .map((topic) => ({
      topic: topic.topic,
      mentions: (text.match(topic.pattern) || []).length,
    }))
    .filter((topic) => topic.mentions > 0)
    .sort((left, right) => right.mentions - left.mentions)
    .slice(0, 5);
}

function buildNotableSnippets(text: string) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 70 && sentence.length <= 220);

  const preferred = sentences.filter((sentence) =>
    /\b(guidance|demand|margin|capital|growth|ai|customer|outlook)\b/i.test(sentence)
  );

  return (preferred.length ? preferred : sentences).slice(0, 3).map((sentence) => sentence.replace(/\s+/g, ' '));
}

function normalizeTranscriptData(raw: Record<string, unknown>, selectedQuarter: string | null, availableQuarters: string[]) {
  const text =
    extractTextCandidate(raw.transcript) ||
    extractTextCandidate(raw.content) ||
    extractTextCandidate(raw) ||
    '';

  if (!text.trim()) {
    return null;
  }

  const split = splitTranscriptSections(text);
  const tone = buildTone(text);
  const sections: SupplementaryTranscriptSection[] = [];

  if (split.prepared.length) {
    sections.push({ label: 'Prepared Remarks', paragraphs: split.prepared.slice(0, 6) });
  }

  if (split.qa.length) {
    sections.push({ label: 'Q&A', paragraphs: split.qa.slice(0, 6) });
  }

  if (!sections.length) {
    sections.push({
      label: 'Transcript',
      paragraphs: text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean).slice(0, 8),
    });
  }

  return {
    selectedQuarter,
    availableQuarters,
    managementTone: tone.label,
    managementToneDetail: tone.detail,
    keyTopics: buildKeyTopics(text),
    notableSnippets: buildNotableSnippets(text),
    sections,
  } satisfies SupplementaryTranscriptData;
}

function inferInsiderAction(record: Record<string, unknown>) {
  const raw = String(
    record.transactionType ||
      record.transaction_type ||
      record.acquisitionOrDisposition ||
      record.acquisition_or_disposition ||
      record.action ||
      record.type ||
      ''
  ).toLowerCase();

  if (/\b(buy|purchase|acquire|acquisition)\b/.test(raw)) return 'buy' as const;
  if (/\b(sell|sale|dispose|disposition)\b/.test(raw)) return 'sell' as const;
  return 'other' as const;
}

function normalizeInsiderData(raw: Record<string, unknown>) {
  const rows = extractFirstArray(raw, ['data', 'transactions', 'insiderTransactions', 'insider_transactions'])
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
    .map((record) => {
      const shares =
        parseNumeric(record.shares || record.shareCount || record.share_count || record.transactionShares || record.securitiesTransacted);
      const sharePrice = parseNumeric(record.sharePrice || record.share_price || record.price || record.pricePerShare);
      const value =
        parseNumeric(record.value || record.transactionValue || record.transaction_value) ??
        (shares != null && sharePrice != null ? shares * sharePrice : null);

      return {
        date: String(record.transactionDate || record.transaction_date || record.filingDate || record.filing_date || '') || null,
        insiderName: String(record.insiderName || record.insider_name || record.name || record.owner || 'Unknown insider'),
        title: String(record.title || record.jobTitle || record.job_title || record.executiveTitle || '') || null,
        action: inferInsiderAction(record),
        shares,
        sharePrice,
        value,
      } satisfies SupplementaryInsiderTransaction;
    })
    .filter((row) => row.insiderName);

  if (!rows.length) {
    return null;
  }

  const buys = rows.filter((row) => row.action === 'buy');
  const sells = rows.filter((row) => row.action === 'sell');
  const recentWindow = rows
    .filter((row) => row.date)
    .filter((row) => {
      const parsed = new Date(row.date as string);
      return !Number.isNaN(parsed.getTime()) && Date.now() - parsed.getTime() <= 30 * 24 * 60 * 60 * 1000;
    });

  const insiderActivity = rows.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row.insiderName] = (accumulator[row.insiderName] || 0) + 1;
    return accumulator;
  }, {});

  const mostActiveInsider = Object.entries(insiderActivity).sort((left, right) => right[1] - left[1])[0]?.[0] || null;

  const summary: SupplementaryInsiderSummary = {
    buyCount: buys.length,
    sellCount: sells.length,
    transactionCount: rows.length,
    netShares: rows.reduce((total, row) => {
      if (row.shares == null) return total;
      if (row.action === 'buy') return total + row.shares;
      if (row.action === 'sell') return total - row.shares;
      return total;
    }, 0),
    mostActiveInsider,
    clusterActivity:
      recentWindow.length >= 4
        ? 'Clustered activity in the last 30 days.'
        : recentWindow.length >= 2
          ? 'Some recent insider activity is visible.'
          : 'No strong recent cluster signal.',
  };

  return {
    summary,
    transactions: rows.sort((left, right) => (right.date || '').localeCompare(left.date || '')).slice(0, 20),
  } satisfies SupplementaryInsiderData;
}

function inferRevisionDirection(record: Record<string, unknown>) {
  const current = parseNumeric(record.currentEstimate || record.current_estimate || record.estimatedEPSAvg || record.epsEstimate);
  const previous = parseNumeric(
    record.priorEstimate ||
      record.prior_estimate ||
      record.previousEstimate ||
      record.previous_estimate ||
      record.estimate30DaysAgo ||
      record.estimate_30_days_ago
  );

  if (current == null || previous == null) return 'unknown' as const;
  if (current > previous) return 'up' as const;
  if (current < previous) return 'down' as const;
  return 'flat' as const;
}

function mapEstimateRow(record: Record<string, unknown>): SupplementaryEstimateRow {
  return {
    period: String(record.period || record.fiscalDateEnding || record.fiscal_date_ending || record.reportDate || record.report_date || 'Unknown period'),
    reportDate: String(record.reportDate || record.report_date || record.date || '') || null,
    epsEstimate: parseNumeric(record.epsEstimate || record.eps_estimate || record.estimatedEPSAvg || record.estimated_eps_avg),
    revenueEstimate: parseNumeric(record.revenueEstimate || record.revenue_estimate || record.estimatedRevenueAvg || record.estimated_revenue_avg),
    analystCount: parseNumeric(record.numberOfAnalysts || record.analystCount || record.analyst_count || record.analysts),
    revisionDirection: inferRevisionDirection(record),
    currency: String(record.currency || record.Currency || '') || null,
  };
}

function normalizeEstimatesData(raw: Record<string, unknown>) {
  const quarterlySource = extractFirstArray(raw, ['quarterlyEstimates', 'quarterly_estimates', 'quarterly']);
  const annualSource = extractFirstArray(raw, ['annualEstimates', 'annual_estimates', 'annual']);

  const quarterly = quarterlySource
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
    .map(mapEstimateRow)
    .slice(0, 8);
  const annual = annualSource
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
    .map(mapEstimateRow)
    .slice(0, 6);

  if (!quarterly.length && !annual.length) {
    return null;
  }

  return {
    annual,
    quarterly,
    nextPeriod: quarterly[0]?.period || annual[0]?.period || null,
    analystCoverage:
      quarterly.find((row) => row.analystCount != null)?.analystCount ||
      annual.find((row) => row.analystCount != null)?.analystCount ||
      null,
  } satisfies SupplementaryEstimatesData;
}

function normalizeCalendarData(
  entries: Awaited<ReturnType<typeof fetchAlphaVantageEarningsCalendar>>,
  horizon: '3month' | '6month' | '12month',
  symbolFilter: string | null
) {
  const filtered = entries
    .filter((entry) => entry.symbol)
    .filter((entry) => (symbolFilter ? entry.symbol.toUpperCase() === symbolFilter : true))
    .slice(0, 40)
    .map((entry) => ({
      symbol: entry.symbol,
      companyName: entry.name,
      reportDate: entry.reportDate,
      fiscalDateEnding: entry.fiscalDateEnding,
      estimate: entry.estimate,
      currency: entry.currency,
    }));

  return {
    horizon,
    entries: filtered,
  } satisfies SupplementaryCalendarData;
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
