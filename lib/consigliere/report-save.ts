import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getDefaultInputs, normalizeInputsForForecastYears, outputsWithScenarios, type DCFInputs } from '@/lib/dcf/model';
import { RECOMMENDATIONS } from './report-draft';

const MAX_DRAFT_BYTES = 1_500_000;
const level = z.enum(['low', 'medium', 'high']).catch('medium');
const text = (max: number) => z.string().max(max);
const num = z.number().finite().nullable();

export const thesisSchema = z.object({ title: text(300).default(''), claim: text(4000), driver: text(4000).default(''), mispricing: text(4000).default('') });
export const catalystSchema = z.object({ event: text(1000), mechanism: text(4000).default(''), probability: level, timeframe: text(200).default('') });
export const riskSchema = z.object({ title: text(300), description: text(4000).default(''), impact: level, mitigation: text(4000).default('') });
const reportSchema = z.object({
  companyName: text(200).min(1),
  ticker: z.string().regex(/^[A-Z0-9.\-]{1,15}$/),
  exchange: text(40),
  sector: text(120),
  industry: text(160),
  recommendation: z.enum(RECOMMENDATIONS),
  targetPrice: z.number().finite().nonnegative(),
  timeHorizon: text(40),
  currency: text(8),
  investmentThesis: z.array(thesisSchema).max(10),
  businessModel: text(30000),
  economicMoat: text(30000).nullable(),
  industryAnalysis: text(30000),
  competitivePosition: z
    .object({ source: z.literal('dcf_comps'), rows: z.array(z.record(z.unknown())).max(12), updatedAt: text(40) })
    .nullable(),
  catalystsNearTerm: z.array(catalystSchema).max(10),
  catalystsMediumTerm: z.array(catalystSchema).max(10),
  valuationAnalysis: text(80000),
  bullCase: text(40000).nullable(),
  bearCase: text(40000),
  keyRisks: z.array(riskSchema).max(12),
  concludingSection: text(30000).nullable(),
  priceDate: text(40),
  fiftyTwoWeekRange: text(40).nullable(),
  marketCap: num,
  sharesOutstanding: num,
  fiscalYearEnd: text(40).nullable(),
  dataSource: text(300),
  epsTableMarkdown: text(6000).nullable(),
  performanceMetrics: z.record(z.number().finite()).nullable(),
  peRatio: num,
  forwardPE: num,
  forwardPEConsensus: num,
  dividendYield: num,
  priceHistory: z.array(z.object({ date: text(10), close: z.number().finite() })).max(400).nullable(),
  sentimentSnapshot: z.record(z.unknown()).nullable(),
});

const draftSchema = z.object({
  version: z.literal(1),
  dcfModel: z.object({
    existingId: z.string().min(1).max(64).optional(),
    name: text(200).min(1),
    notes: text(4000),
    inputs: z.record(z.unknown()),
    financialData: z.record(z.unknown()),
  }),
  report: reportSchema,
});

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Keeps only known DCF input keys with the default's type, so outputs can be recomputed from trusted values. */
function sanitizeDcfInputs(raw: Record<string, unknown>): DCFInputs {
  const defaults = getDefaultInputs();
  const out: Record<string, unknown> = { ...defaults };
  for (const [key, fallback] of Object.entries(defaults)) {
    const v = raw[key];
    if (Array.isArray(fallback)) {
      if (Array.isArray(v) && v.length && v.length <= 10 && v.every(finite)) out[key] = v;
    } else if (typeof fallback === 'number') {
      if (finite(v)) out[key] = v;
    } else if (typeof fallback === 'boolean') {
      if (typeof v === 'boolean') out[key] = v;
    } else if (typeof v === 'string' && v.length <= 200) {
      out[key] = v;
    }
  }
  const inputs = out as unknown as DCFInputs;
  if (!['perpetual', 'multiple', 'both'].includes(inputs.terminalMethod)) inputs.terminalMethod = defaults.terminalMethod;
  if (!['ebitda', 'ebit', 'fcf'].includes(inputs.exitMultipleMetric)) inputs.exitMultipleMetric = defaults.exitMultipleMetric;
  inputs.forecastMode = 'simple';
  inputs.forecastYears = Math.min(10, Math.max(3, Math.round(inputs.forecastYears)));
  return normalizeInputsForForecastYears(inputs);
}

export const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

export type SaveOutcome =
  | { ok: true; reportId: string; dcfModelId: string; links: { editReport: string; previewReport: string; dcfTool: string } }
  | { ok: false; status: number; error: string };

/** Creates the member's SavedDCFModel and linked draft EquityResearchReport in one transaction. */
export async function saveReportDraft(rawDraft: unknown, member: { userId: string; name: string; role?: string | null }): Promise<SaveOutcome> {
  if (JSON.stringify(rawDraft ?? null).length > MAX_DRAFT_BYTES) return { ok: false, status: 413, error: 'Draft is too large to save.' };
  const parsed = draftSchema.safeParse(rawDraft);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, status: 400, error: `Draft is not valid (${issue.path.join('.')}: ${issue.message}).` };
  }
  const { dcfModel, report } = parsed.data;

  // A linked saved model is read from the database, never from the browser, and is not modified.
  let rawInputs = dcfModel.inputs;
  let fd = dcfModel.financialData;
  let linkId: string | undefined;
  if (dcfModel.existingId) {
    const existing = await prisma.savedDCFModel.findUnique({
      where: { id: dcfModel.existingId },
      select: { id: true, userId: true, ticker: true, inputs: true, financialData: true, report: { select: { id: true } } },
    });
    if (!existing || (existing.userId !== member.userId && member.role !== 'admin')) {
      return { ok: false, status: 404, error: 'That saved DCF model was not found in your models.' };
    }
    if (existing.ticker.toUpperCase() !== report.ticker) return { ok: false, status: 400, error: `That saved DCF model is for ${existing.ticker}, not ${report.ticker}.` };
    if (existing.report) {
      return { ok: false, status: 409, error: 'That saved DCF model is already linked to another report. Ask Consigliere to draft again; it will save a copy.' };
    }
    rawInputs = (existing.inputs ?? {}) as Record<string, unknown>;
    fd = existing.financialData && typeof existing.financialData === 'object' ? (existing.financialData as Record<string, unknown>) : fd;
    linkId = existing.id;
  }

  const inputs = sanitizeDcfInputs(rawInputs);
  inputs.ticker = report.ticker;
  inputs.companyName = report.companyName;
  const comps = Array.isArray(rawInputs.comps) ? (rawInputs.comps as unknown[]).slice(0, 12) : undefined;
  const modelInputs = { ...inputs, ...(comps?.length ? { comps } : {}) };
  const outputs = outputsWithScenarios(inputs);
  const currentPrice = inputs.currentPrice;
  const impliedUpside = currentPrice > 0 ? (report.targetPrice - currentPrice) / currentPrice : 0;

  const write = () => prisma.$transaction(async (tx) => {
    const model = linkId
      ? { id: linkId }
      : await tx.savedDCFModel.create({
          data: {
            ticker: report.ticker,
            companyName: report.companyName,
            inputs: json(modelInputs),
            outputs: json(outputs),
            financialData: json(fd),
            userId: member.userId,
            name: dcfModel.name,
            notes: dcfModel.notes,
          },
          select: { id: true },
        });
    const created = await tx.equityResearchReport.create({
      data: {
        ...report,
        coverageStatus: 'initiation',
        valuationMethod: 'dcf',
        currentPrice,
        impliedUpside,
        createdBy: member.userId,
        analysts: [member.name],
        collaborators: [],
        status: 'draft',
        published: false,
        showOnWebsite: true,
        dcfModelId: model.id,
        dcfInputs: json({ ...modelInputs, peRatio: fd.peRatio, forwardPE: fd.forwardPE, priceHistory: report.priceHistory ?? undefined }),
        dcfOutputs: json(outputs),
        investmentThesis: json(report.investmentThesis),
        competitivePosition: report.competitivePosition ? json(report.competitivePosition) : undefined,
        catalystsNearTerm: json(report.catalystsNearTerm),
        catalystsMediumTerm: json(report.catalystsMediumTerm),
        keyRisks: json(report.keyRisks),
        performanceMetrics: report.performanceMetrics ? json(report.performanceMetrics) : undefined,
        priceHistory: report.priceHistory ? json(report.priceHistory) : undefined,
        sentimentSnapshot: report.sentimentSnapshot ? json(report.sentimentSnapshot) : undefined,
        financialSnapshot: {},
        forecastAssumptions: {},
        incomeStatementForecast: {},
        cashFlowForecast: {},
        sensitivityAnalysis: {},
      },
      select: { id: true },
    });
    return { reportId: created.id, dcfModelId: model.id };
  });

  let saved: { reportId: string; dcfModelId: string };
  try {
    saved = await write();
  } catch (err) {
    if (linkId && err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { ok: false, status: 409, error: 'That saved DCF model was just linked to another report. Ask Consigliere to draft again; it will save a copy.' };
    }
    throw err;
  }

  return {
    ok: true,
    ...saved,
    links: {
      editReport: `/dashboard/research/${saved.reportId}/edit`,
      previewReport: `/dashboard/research/${saved.reportId}/preview`,
      dcfTool: `/dashboard/tools/dcf?model=${saved.dcfModelId}`,
    },
  };
}
