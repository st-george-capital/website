import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { canEditReport, canViewReport, isAdminViewer, type ReportViewer } from '@/lib/research/access';
import { normalizeTickers } from '@/lib/consigliere/portfolio/data';
import { RECOMMENDATIONS, defaultRating, reviewed, type Catalyst, type Recommendation, type Risk, type ThesisBullet } from './report-draft';
import { catalystSchema, json, riskSchema, thesisSchema } from './report-save';
import type { ReportEditChange } from './types';

/**
 * Text sections Consigliere may change. Valuation analysis holds the DCF tables, so commentary is only
 * ever added below them, never swapped in for them.
 */
const TEXT_SECTIONS = {
  business_model: { column: 'businessModel', label: 'Business model', replaceable: true },
  industry_analysis: { column: 'industryAnalysis', label: 'Industry analysis', replaceable: true },
  economic_moat: { column: 'economicMoat', label: 'Economic moat', replaceable: true },
  valuation_commentary: { column: 'valuationAnalysis', label: 'Valuation commentary', replaceable: false },
  bull_case: { column: 'bullCase', label: 'Bull case', replaceable: true },
  bear_case: { column: 'bearCase', label: 'Bear case', replaceable: true },
  conclusion: { column: 'concludingSection', label: 'Conclusion', replaceable: true },
} as const;

/** List sections only ever grow: existing thesis points, catalysts and risks are never removed or rewritten. */
const LIST_SECTIONS = {
  add_thesis_points: { column: 'investmentThesis', label: 'Investment thesis', max: 10 },
  add_catalysts_near_term: { column: 'catalystsNearTerm', label: 'Near-term catalysts', max: 10 },
  add_catalysts_medium_term: { column: 'catalystsMediumTerm', label: 'Medium-term catalysts', max: 10 },
  add_key_risks: { column: 'keyRisks', label: 'Key risks', max: 12 },
} as const;

type TextKey = keyof typeof TEXT_SECTIONS;
type ListKey = keyof typeof LIST_SECTIONS;
const TEXT_KEYS = Object.keys(TEXT_SECTIONS) as TextKey[];
const LIST_KEYS = Object.keys(LIST_SECTIONS) as ListKey[];

export interface EditArgs {
  report_id?: string;
  ticker?: string;
  replace_text?: boolean;
  recommendation?: Recommendation;
  target_price?: number;
  business_model?: string;
  industry_analysis?: string;
  economic_moat?: string;
  valuation_commentary?: string;
  bull_case?: string;
  bear_case?: string;
  conclusion?: string;
  add_thesis_points?: ThesisBullet[];
  add_catalysts_near_term?: Catalyst[];
  add_catalysts_medium_term?: Catalyst[];
  add_key_risks?: Risk[];
}

const textOp = z.object({ mode: z.enum(['append', 'replace']), value: z.string().trim().min(1).max(20000) });

const editSchema = z.object({
  version: z.literal(1),
  reportId: z.string().min(1).max(64),
  baseUpdatedAt: z.string().min(1).max(40),
  text: z
    .object(Object.fromEntries(TEXT_KEYS.map((k) => [k, textOp.optional()])) as Record<TextKey, z.ZodOptional<typeof textOp>>)
    .strict(),
  lists: z
    .object({
      add_thesis_points: z.array(thesisSchema).min(1).max(6).optional(),
      add_catalysts_near_term: z.array(catalystSchema).min(1).max(8).optional(),
      add_catalysts_medium_term: z.array(catalystSchema).min(1).max(8).optional(),
      add_key_risks: z.array(riskSchema).min(1).max(8).optional(),
    })
    .strict(),
  recommendation: z.enum(RECOMMENDATIONS).optional(),
  targetPrice: z.number().finite().positive().optional(),
});

export type ReportEdit = z.infer<typeof editSchema>;

const ACCESS_SELECT = {
  id: true,
  ticker: true,
  companyName: true,
  published: true,
  createdBy: true,
  collaborators: true,
  updatedAt: true,
  recommendation: true,
  targetPrice: true,
  currentPrice: true,
  businessModel: true,
  industryAnalysis: true,
  economicMoat: true,
  valuationAnalysis: true,
  bullCase: true,
  bearCase: true,
  concludingSection: true,
  investmentThesis: true,
  catalystsNearTerm: true,
  catalystsMediumTerm: true,
  keyRisks: true,
} satisfies Prisma.EquityResearchReportSelect;

type EditableReport = Prisma.EquityResearchReportGetPayload<{ select: typeof ACCESS_SELECT }>;

const clip = (s: string, max = 220) => (s.length > max ? `${s.slice(0, max)}…` : s);
const asList = (v: unknown) => (Array.isArray(v) ? v : []);

async function findEditableDraft(args: EditArgs, viewer: ReportViewer): Promise<EditableReport> {
  if (args.report_id) {
    const report = await prisma.equityResearchReport.findUnique({ where: { id: args.report_id }, select: ACCESS_SELECT });
    if (!report || !canViewReport(report, viewer)) throw new Error(`No report with id ${args.report_id} that you can see.`);
    if (!canEditReport(report, viewer)) throw new Error('You can only edit reports you wrote or collaborate on.');
    if (report.published) throw new Error('That report is published. Consigliere only edits drafts; change published reports in the report editor.');
    return report;
  }
  if (!args.ticker) throw new Error('Pass report_id or ticker so I know which draft to edit.');
  const ticker = normalizeTickers([args.ticker])[0];
  // By ticker, only the member's own or shared drafts; admins must name another member's draft by id.
  const report = await prisma.equityResearchReport.findFirst({
    where: {
      published: false,
      ticker: { equals: ticker, mode: 'insensitive' },
      OR: [{ createdBy: viewer.userId }, { collaborators: { has: viewer.userId } }],
    },
    orderBy: { updatedAt: 'desc' },
    select: ACCESS_SELECT,
  });
  if (!report) throw new Error(`You have no draft report for ${ticker}. Use draft_research_report to start one.`);
  return report;
}

/** Works out the edit and a preview of every change. Nothing is written. */
export async function prepareReportEdit(args: EditArgs, viewer: ReportViewer) {
  const report = await findEditableDraft(args, viewer);
  const changes: ReportEditChange[] = [];
  const warnings: string[] = [];
  const edit: ReportEdit = {
    version: 1,
    reportId: report.id,
    baseUpdatedAt: report.updatedAt.toISOString(),
    text: {},
    lists: {},
  };

  for (const key of TEXT_KEYS) {
    const value = args[key]?.trim();
    if (!value) continue;
    const spec = TEXT_SECTIONS[key];
    const existing = ((report[spec.column] as string | null) ?? '').trim();
    let mode: 'append' | 'replace' = args.replace_text && spec.replaceable ? 'replace' : 'append';
    if (args.replace_text && !spec.replaceable) warnings.push(`${spec.label} is added below the DCF tables; it is never replaced.`);
    if (!existing) mode = 'append';
    edit.text[key] = { mode, value };
    changes.push({
      section: spec.label,
      action: !existing ? 'set' : mode,
      preview: clip(value),
      ...(mode === 'replace' ? { before: clip(existing) } : {}),
    });
  }

  for (const key of LIST_KEYS) {
    const spec = LIST_SECTIONS[key];
    const items = (args[key] ?? []) as unknown[];
    if (!items.length) continue;
    const room = spec.max - asList(report[spec.column]).length;
    if (room <= 0) {
      warnings.push(`${spec.label} already has ${spec.max} items, the most a report holds; nothing was added there.`);
      continue;
    }
    const kept = items.slice(0, Math.min(room, 8));
    if (kept.length < items.length) warnings.push(`Only ${kept.length} of ${items.length} new ${spec.label.toLowerCase()} fit.`);
    const parsed = (key === 'add_thesis_points' ? z.array(thesisSchema) : key === 'add_key_risks' ? z.array(riskSchema) : z.array(catalystSchema)).safeParse(kept);
    if (!parsed.success) throw new Error(`${spec.label}: ${parsed.error.issues[0]?.message ?? 'invalid items'}`);
    (edit.lists as Record<string, unknown>)[key] = parsed.data;
    for (const item of parsed.data as Record<string, string>[]) {
      changes.push({ section: spec.label, action: 'add', preview: clip(item.claim ?? item.event ?? item.title ?? '') });
    }
  }

  if (args.recommendation && args.recommendation !== report.recommendation) {
    edit.recommendation = args.recommendation;
    changes.push({ section: 'Rating', action: 'set', preview: args.recommendation, before: report.recommendation });
  }
  if (args.target_price !== undefined && args.target_price !== report.targetPrice) {
    edit.targetPrice = args.target_price;
    changes.push({ section: 'Target price', action: 'set', preview: `$${args.target_price.toFixed(2)}`, before: `$${report.targetPrice.toFixed(2)}` });
    const rating = edit.recommendation ?? report.recommendation;
    const suggested = defaultRating(args.target_price, report.currentPrice);
    const bullish = ['buy', 'overweight'].includes(rating);
    const bearish = ['sell', 'underweight'].includes(rating);
    const fits = suggested === 'buy' ? bullish : suggested === 'sell' ? bearish : !bullish && !bearish;
    if (report.currentPrice > 0 && !fits) {
      warnings.push(
        `The new target is ${(((args.target_price - report.currentPrice) / report.currentPrice) * 100).toFixed(1)}% from the report price, which suggests "${suggested}" (buy above +10%, sell below -10%), but the rating stays "${rating}". Ask to change the rating too if you want it to match.`
      );
    }
  }

  if (!changes.length) throw new Error('Nothing to change. Pass only the sections or values the user asked to edit.');
  return { report, edit, changes, warnings };
}

export type EditOutcome =
  | { ok: true; reportId: string; links: { editReport: string; previewReport: string; dcfTool?: string } }
  | { ok: false; status: number; error: string };

class EditRejected extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Applies a confirmed edit to a draft. Safeguards: drafts only, author/collaborator/admin only, never deletes,
 * refuses if anyone changed the report since the preview, and snapshots the previous state as a ReportVersion.
 */
export async function applyReportEdit(rawEdit: unknown, member: ReportViewer): Promise<EditOutcome> {
  const parsed = editSchema.safeParse(rawEdit);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, status: 400, error: `Edit is not valid (${issue.path.join('.')}: ${issue.message}).` };
  }
  const edit = parsed.data;

  let dcfModelId: string | null = null;
  try {
    dcfModelId = await prisma.$transaction(async (tx) => {
      const report = await tx.equityResearchReport.findUnique({ where: { id: edit.reportId } });
      if (!report || !canViewReport(report, member)) throw new EditRejected(404, 'Report not found.');
      if (!canEditReport(report, member)) throw new EditRejected(403, 'You can only edit reports you wrote or collaborate on.');
      if (report.published) throw new EditRejected(409, 'That report has been published since; Consigliere only edits drafts.');
      if (report.updatedAt.toISOString() !== edit.baseUpdatedAt) {
        throw new EditRejected(409, 'This report changed after Consigliere prepared the edit, so nothing was saved. Ask again to edit the latest version.');
      }

      const data: Prisma.EquityResearchReportUpdateManyMutationInput & Record<string, unknown> = {};
      const sections: string[] = [];
      for (const key of TEXT_KEYS) {
        const op = edit.text[key];
        if (!op) continue;
        const spec = TEXT_SECTIONS[key];
        const existing = ((report[spec.column] as string | null) ?? '').trim();
        const addition = reviewed(op.value);
        data[spec.column] = op.mode === 'replace' && spec.replaceable ? addition : existing ? `${existing}\n\n${addition}` : addition;
        sections.push(spec.label);
      }
      for (const key of LIST_KEYS) {
        const items = edit.lists[key];
        if (!items?.length) continue;
        const spec = LIST_SECTIONS[key];
        data[spec.column] = json([...asList(report[spec.column]), ...items].slice(0, spec.max));
        sections.push(spec.label);
      }
      if (edit.recommendation) {
        data.recommendation = edit.recommendation;
        sections.push('Rating');
      }
      if (edit.targetPrice !== undefined) {
        data.targetPrice = edit.targetPrice;
        if (report.currentPrice > 0) data.impliedUpside = (edit.targetPrice - report.currentPrice) / report.currentPrice;
        sections.push('Target price');
      }

      await tx.reportVersion.create({
        data: {
          reportId: report.id,
          version: report.version + 1,
          snapshot: json(report),
          createdBy: member.userId,
          changeLog: `Before Consigliere edit (${isAdminViewer(member) && report.createdBy !== member.userId ? 'admin, ' : ''}${sections.join(', ')})`,
        },
      });

      const updated = await tx.equityResearchReport.updateMany({
        where: { id: report.id, updatedAt: report.updatedAt, published: false },
        data: { ...data, version: report.version + 1, lastEditedBy: member.userId },
      });
      if (updated.count !== 1) throw new EditRejected(409, 'This report changed while saving, so nothing was saved. Ask again.');
      return report.dcfModelId;
    });
  } catch (err) {
    if (err instanceof EditRejected) return { ok: false, status: err.status, error: err.message };
    throw err;
  }

  return {
    ok: true,
    reportId: edit.reportId,
    links: {
      editReport: `/dashboard/research/${edit.reportId}/edit`,
      previewReport: `/dashboard/research/${edit.reportId}/preview`,
      ...(dcfModelId ? { dcfTool: `/dashboard/tools/dcf?model=${dcfModelId}` } : {}),
    },
  };
}
