import { prisma } from '@/lib/prisma';
import { buildReportDraft, proposeDcfAssumptions, type Catalyst, type DraftArgs, type Risk, type ThesisBullet } from '@/lib/consigliere/report-draft';
import { prepareReportEdit, type EditArgs } from '@/lib/consigliere/report-edit';
import { SAVE_PROPOSAL_KEY, type ReportEditProposal } from '@/lib/consigliere/types';
import type { ToolContext } from './context';

type Loose<T> = { [K in keyof T]?: T[K] };

interface RawDraftArgs extends Omit<DraftArgs, 'investment_thesis' | 'catalysts_near_term' | 'catalysts_medium_term' | 'key_risks'> {
  assumptions_confirmed?: boolean;
  investment_thesis?: Loose<ThesisBullet>[];
  catalysts_near_term?: Loose<Catalyst>[];
  catalysts_medium_term?: Loose<Catalyst>[];
  key_risks?: Loose<Risk>[];
}

interface RawEditArgs extends Omit<EditArgs, 'add_thesis_points' | 'add_catalysts_near_term' | 'add_catalysts_medium_term' | 'add_key_risks'> {
  add_thesis_points?: Loose<ThesisBullet>[];
  add_catalysts_near_term?: Loose<Catalyst>[];
  add_catalysts_medium_term?: Loose<Catalyst>[];
  add_key_risks?: Loose<Risk>[];
}

const thesis = (t: Loose<ThesisBullet>): ThesisBullet => ({ title: t.title ?? '', claim: t.claim ?? '', driver: t.driver ?? '', mispricing: t.mispricing ?? '' });
const catalyst = (c: Loose<Catalyst>): Catalyst => ({ event: c.event ?? '', mechanism: c.mechanism ?? '', probability: c.probability ?? 'medium', timeframe: c.timeframe ?? '' });
const risk = (r: Loose<Risk>): Risk => ({ title: r.title ?? '', description: r.description ?? '', impact: r.impact ?? 'medium', mitigation: r.mitigation ?? '' });
const theses = (items?: Loose<ThesisBullet>[]) => items?.map(thesis).filter((t) => t.claim.trim());
const catalysts = (items?: Loose<Catalyst>[]) => items?.map(catalyst).filter((c) => c.event.trim());
const risks = (items?: Loose<Risk>[]) => items?.map(risk).filter((r) => r.title.trim());

export async function draftResearchReport(args: RawDraftArgs, ctx: ToolContext) {
  if (!args.assumptions_confirmed && !args.saved_model_id) {
    const proposal = await proposeDcfAssumptions(args.ticker, ctx);
    return {
      status: 'NOTHING DRAFTED YET: the DCF assumptions need the user first.',
      next_step:
        "Show the user each proposed assumption with its value and source as a short numbered list, plus the preview value per share vs price. If saved_models is not empty, offer those too, each as a markdown link to its open_link. Ask which assumptions to keep or change, or whether to use a saved model. Then STOP and wait for the user's answer. When they reply, call draft_research_report again with assumptions_confirmed=true and ONLY the assumptions they changed (as decimals, 8% = 0.08), or with saved_model_id if they chose a saved model. Pass the user's notes, rating, target and peers again in that call.",
      ...proposal,
    };
  }

  const { draft, summary } = await buildReportDraft({
    ...args,
    investment_thesis: theses(args.investment_thesis)?.slice(0, 6),
    catalysts_near_term: catalysts(args.catalysts_near_term)?.slice(0, 8),
    catalysts_medium_term: catalysts(args.catalysts_medium_term)?.slice(0, 8),
    key_risks: risks(args.key_risks)?.slice(0, 10),
  }, ctx);

  const existing = await prisma.equityResearchReport.findFirst({
    where: { published: false, ticker: summary.ticker, OR: [{ createdBy: ctx.userId }, { collaborators: { has: ctx.userId } }] },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, updatedAt: true },
  });
  if (existing) {
    summary.warnings = [
      ...(summary.warnings ?? []),
      `You already have a draft ${summary.ticker} report (last edited ${existing.updatedAt.toISOString().slice(0, 10)}). Saving creates a second one; to change the existing draft, ask Consigliere to edit it instead.`,
    ];
  }

  return {
    status: 'Draft prepared but NOT saved yet.',
    next_step:
      'Tell the user the draft is ready and summarise it in a few lines (value per share vs price, verdict, what was filled and what is left empty, and any warnings). Tell them to click "Save to SGC" on the card below to create the DCF model and draft report; nothing is saved otherwise.',
    ...summary,
    ...(existing ? { existing_draft_id: existing.id } : {}),
    [SAVE_PROPOSAL_KEY]: { kind: 'research_report', title: `${summary.company} (${summary.ticker}) research report`, summary, draft },
  };
}

export async function editResearchReport(args: RawEditArgs, ctx: ToolContext) {
  const { report, edit, changes, warnings } = await prepareReportEdit(
    {
      ...args,
      add_thesis_points: theses(args.add_thesis_points),
      add_catalysts_near_term: catalysts(args.add_catalysts_near_term),
      add_catalysts_medium_term: catalysts(args.add_catalysts_medium_term),
      add_key_risks: risks(args.add_key_risks),
    },
    ctx
  );
  const proposal: ReportEditProposal = {
    kind: 'report_edit',
    title: `Edit ${report.companyName} (${report.ticker}) draft`,
    summary: { company: report.companyName, ticker: report.ticker, report_id: report.id, changes, ...(warnings.length ? { warnings } : {}) },
    draft: edit,
  };
  return {
    status: 'Edit prepared but NOT saved yet.',
    next_step:
      'Say the edit is READY BUT NOT SAVED (do not say "I added" or "I changed"), list the changes in a few lines, and tell the user to click "Save changes" on the card below. Nothing changes otherwise; the previous version is kept in the report history.',
    report_id: report.id,
    changes: changes.map((c) => `${c.action} ${c.section}: ${c.preview}`),
    ...(warnings.length ? { warnings } : {}),
    [SAVE_PROPOSAL_KEY]: proposal,
  };
}
