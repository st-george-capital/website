import type { SentimentResponsePayload } from '@/lib/sentiment';

export type ReportSentimentSnapshot = SentimentResponsePayload & {
  pulledAt?: string | null;
  horizonDays?: number | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function scoreTone(score: number) {
  if (score >= 0.12) return 'text-emerald-700';
  if (score <= -0.12) return 'text-red-700';
  return 'text-slate-700';
}

function labelTone(label: string) {
  if (label === 'bullish') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (label === 'bearish') return 'bg-red-100 text-red-800 border border-red-200';
  return 'bg-slate-100 text-slate-700 border border-slate-200';
}

export function ResearchSentimentSection({
  sentiment,
  variant = 'web',
}: {
  sentiment: ReportSentimentSnapshot;
  variant?: 'web' | 'document';
}) {
  const isDocument = variant === 'document';
  const wrapperClass = isDocument ? 'space-y-5' : 'space-y-5';
  const cardClass = isDocument
    ? 'border border-slate-200 p-3'
    : 'rounded-xl border border-slate-200 bg-slate-50/60 p-4';
  const headingClass = isDocument
    ? 'text-sm font-semibold uppercase tracking-[0.16em] text-slate-600'
    : 'text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500';
  const statValueClass = isDocument ? 'mt-1 text-xl font-bold text-slate-950' : 'mt-2 text-2xl font-bold text-slate-950';

  return (
    <div className={wrapperClass}>
      <div className={isDocument ? 'space-y-2' : 'space-y-3'}>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${labelTone(sentiment.snapshot.overallSentimentLabel)}`}>
            {sentiment.snapshot.overallSentimentLabel}
          </span>
          {sentiment.horizonDays ? (
            <span className="text-xs uppercase tracking-wide text-slate-500">
              {sentiment.horizonDays}-day window
            </span>
          ) : null}
          {sentiment.pulledAt ? (
            <span className="text-xs uppercase tracking-wide text-slate-500">
              Pulled {formatDateTime(sentiment.pulledAt)}
            </span>
          ) : null}
        </div>
        <p className={isDocument ? 'text-[11px] leading-6 text-slate-700' : 'text-sm leading-6 text-slate-700'}>
          {sentiment.narrative.coverageSummary}
        </p>
      </div>

      <div className={isDocument ? 'grid grid-cols-4 gap-3' : 'grid gap-3 md:grid-cols-2 xl:grid-cols-4'}>
        <div className={cardClass}>
          <div className={headingClass}>Signal strength</div>
          <div className={statValueClass}>{sentiment.snapshot.signalStrength}</div>
          <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{sentiment.snapshot.confidence} confidence</div>
        </div>
        <div className={cardClass}>
          <div className={headingClass}>Articles</div>
          <div className={statValueClass}>{sentiment.snapshot.articleCount}</div>
          <div className="mt-1 text-xs text-slate-500">Latest {formatDateTime(sentiment.snapshot.latestPublishedAt)}</div>
        </div>
        <div className={cardClass}>
          <div className={headingClass}>Bullish / Bearish</div>
          <div className={statValueClass}>{sentiment.snapshot.bullishCount} / {sentiment.snapshot.bearishCount}</div>
          <div className="mt-1 text-xs text-slate-500">{sentiment.snapshot.neutralCount} neutral articles</div>
        </div>
        <div className={cardClass}>
          <div className={headingClass}>Why it matters</div>
          <div className="mt-2 text-sm leading-6 text-slate-700">{sentiment.narrative.investmentTakeaway}</div>
        </div>
      </div>

      {sentiment.eventBreakdown.length > 0 && (
        <div className={isDocument ? 'space-y-3' : 'space-y-3'}>
          <h3 className={isDocument ? 'text-sm font-semibold uppercase tracking-[0.16em] text-slate-700' : 'text-lg font-semibold text-slate-900'}>
            What The News Is Saying
          </h3>
          <div className="overflow-x-auto">
            <table className={`w-full ${isDocument ? 'text-[11px]' : 'text-sm'}`}>
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-4 font-semibold uppercase tracking-wide">Event bucket</th>
                  <th className="py-2 pr-4 font-semibold uppercase tracking-wide">Articles</th>
                  <th className="py-2 font-semibold uppercase tracking-wide">Average sentiment</th>
                </tr>
              </thead>
              <tbody>
                {sentiment.eventBreakdown.slice(0, 8).map((event) => (
                  <tr key={event.tag} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-2 pr-4 font-medium capitalize text-slate-900">{event.tag}</td>
                    <td className="py-2 pr-4 text-slate-600">{event.articleCount}</td>
                    <td className={`py-2 font-semibold ${scoreTone(event.averageSentiment)}`}>
                      {event.averageSentiment > 0 ? '+' : ''}{event.averageSentiment.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
