'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, Loader2, PencilLine, Save, X } from 'lucide-react';
import type { NewReportProposal, ReportEditProposal, SaveProposal } from '@/lib/consigliere/types';

type SaveState =
  | { status: 'idle' | 'saving' | 'discarded' }
  | { status: 'error'; message: string }
  | { status: 'saved'; links: Record<string, string> };

const money = (x: number | null) => (x == null ? '–' : `$${x.toFixed(2)}`);

const LINK_LABELS: Record<string, string> = {
  editReport: 'Open saved report',
  previewReport: 'Preview report',
  dcfTool: 'Open saved DCF model',
};

const ACTION_LABELS: Record<ReportEditProposal['summary']['changes'][number]['action'], string> = {
  add: 'Add',
  append: 'Add below existing text',
  replace: 'Replace',
  set: 'Set',
};

function List({ title, items, tone }: { title: string; items: string[]; tone: 'ok' | 'review' | 'empty' }) {
  if (!items.length) return null;
  const color = tone === 'ok' ? 'text-emerald-700' : tone === 'review' ? 'text-amber-700' : 'text-slate-500';
  return (
    <div>
      <p className={`text-xs font-semibold ${color}`}>{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-600">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function NewReportDetails({ s }: { s: NewReportProposal['summary'] }) {
  return (
    <>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">DCF value / share</dt>
          <dd className="font-semibold text-slate-900">{money(s.intrinsic_value_per_share)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Price</dt>
          <dd className="font-semibold text-slate-900">
            {money(s.current_price)}
            {s.upside_pct != null && (
              <span className={s.upside_pct >= 0 ? 'ml-1 text-emerald-700' : 'ml-1 text-red-700'}>
                ({s.upside_pct >= 0 ? '+' : ''}
                {s.upside_pct}%)
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Bear / bull</dt>
          <dd className="font-semibold text-slate-900">
            {money(s.bear_per_share)} / {money(s.bull_per_share)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Rating / target</dt>
          <dd className="font-semibold capitalize text-slate-900">
            {s.recommendation} · {money(s.target_price)}
          </dd>
        </div>
      </dl>

      {s.assumptions_used && (
        <p className="mt-3 text-xs text-slate-600">
          <span className="font-medium text-slate-700">DCF assumptions: </span>
          revenue growth {s.assumptions_used.revenue_growth} · EBIT margin {s.assumptions_used.ebit_margin} · terminal
          growth {s.assumptions_used.terminal_growth} · exit {s.assumptions_used.exit_multiple}
          {s.wacc_pct != null && ` · WACC ${s.wacc_pct}%`}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <List title="Filled from SGC tools" items={s.filled_from_tools} tone="ok" />
        <List title="Drafted from your notes (review)" items={s.drafted_from_notes} tone="review" />
        <List title="Left empty for you" items={s.left_empty} tone="empty" />
      </div>
    </>
  );
}

function EditDetails({ s }: { s: ReportEditProposal['summary'] }) {
  return (
    <ul className="mt-4 space-y-2">
      {s.changes.map((c, i) => (
        <li key={`${c.section}-${i}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
          <p className="font-semibold text-slate-800">
            {c.section}{' '}
            <span className={c.action === 'replace' ? 'font-medium text-amber-700' : 'font-medium text-slate-500'}>· {ACTION_LABELS[c.action]}</span>
          </p>
          {c.before !== undefined && (
            <p className="mt-1 text-slate-500">
              <span className="font-medium">Was:</span> <span className="line-through decoration-slate-300">{c.before || '(empty)'}</span>
            </p>
          )}
          <p className="mt-1 whitespace-pre-line text-slate-700">{c.preview}</p>
        </li>
      ))}
    </ul>
  );
}

/** Shows a draft or draft edit Consigliere prepared; nothing is written until the member clicks Save. */
export function SaveProposalCard({
  proposal,
  onSaved,
}: {
  proposal: SaveProposal;
  /** Told what was saved so the conversation can refer to it (for example to edit the new draft next). */
  onSaved?: (note: string) => void;
}) {
  const [state, setState] = useState<SaveState>({ status: 'idle' });
  const isEdit = proposal.kind === 'report_edit';
  const ticker = proposal.summary.ticker;

  async function save() {
    setState({ status: 'saving' });
    try {
      const res = await fetch('/api/consigliere/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: proposal.kind, draft: proposal.draft }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Save failed (HTTP ${res.status}).`);
      const links: Record<string, string> = body.links ?? {};
      setState({ status: 'saved', links });
      const linkList = Object.entries(links)
        .filter(([key]) => LINK_LABELS[key])
        .map(([key, href]) => `[${LINK_LABELS[key]}](${href})`)
        .join(', ');
      onSaved?.(
        isEdit
          ? `The user clicked Save: the edit to the ${ticker} draft (report_id ${body.reportId}) is saved. Links: ${linkList}.`
          : `The user clicked Save: the ${ticker} draft report is saved (report_id ${body.reportId}, DCF saved_model_id ${body.dcfModelId}). Links: ${linkList}. Use these links when the user asks where it is, and this report_id to edit it.`
      );
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Save failed.' });
    }
  }

  if (state.status === 'discarded') {
    return <p className="mt-3 text-xs text-slate-500">{isEdit ? 'Edit' : 'Draft'} for {ticker} discarded. Nothing was saved.</p>;
  }

  const warnings = proposal.summary.warnings ?? [];

  return (
    <section aria-label={proposal.title} className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0b1f3a] text-white">
          {isEdit ? <PencilLine className="h-4 w-4" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{proposal.title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {isEdit
              ? 'Nothing changes until you save. Only the sections below are touched, nothing is deleted, and the current version is kept in the report history.'
              : 'Draft only. Saving creates a DCF model and a private draft report under your account; nothing is published.'}
          </p>
        </div>
      </div>

      {proposal.kind === 'report_edit' ? <EditDetails s={proposal.summary} /> : <NewReportDetails s={proposal.summary} />}

      {!!warnings.length && (
        <ul className="mt-3 space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {warnings.map((w) => (
            <li key={w} className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {w}
            </li>
          ))}
        </ul>
      )}

      {state.status === 'saved' ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {isEdit ? 'Changes saved to the draft' : 'Saved as a draft'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(state.links)
              .filter(([key]) => LINK_LABELS[key])
              .map(([key, href]) => (
                <Link
                  key={key}
                  href={href}
                  target="_blank"
                  className={
                    key === 'previewReport'
                      ? 'inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100'
                      : 'inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800'
                  }
                >
                  {LINK_LABELS[key]}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </Link>
              ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={state.status === 'saving'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0b1f3a] px-3 py-2 text-xs font-medium text-white hover:bg-[#13315c] disabled:opacity-60"
          >
            {state.status === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
            {state.status === 'saving' ? 'Saving…' : isEdit ? 'Save changes' : 'Save to SGC'}
          </button>
          <button
            type="button"
            onClick={() => setState({ status: 'discarded' })}
            disabled={state.status === 'saving'}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Discard
          </button>
          {state.status === 'error' && (
            <p role="alert" className="text-xs text-red-700">
              {state.message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
