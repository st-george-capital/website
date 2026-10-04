/**
 * Builds a report draft on live data, saves it through the same code path as the Save button,
 * reads both records back, exercises the edit safeguards, then deletes only the records it created.
 * Usage: npx tsx --env-file=.env scripts/consigliere/draft-smoke.ts [TICKER] [--keep]
 */
import { prisma } from '@/lib/prisma';
import { runConsigliereTool } from '@/lib/consigliere/tools/registry';
import { proposalFrom } from '@/lib/consigliere/types';
import { saveReportDraft } from '@/lib/consigliere/report-save';
import { applyReportEdit } from '@/lib/consigliere/report-edit';
import { smokeContext } from './smoke-context';

const ticker = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'GEV').toUpperCase();
const keep = process.argv.includes('--keep');

async function main() {
  const ctx = await smokeContext();
  const step1 = await runConsigliereTool('draft_research_report', { ticker }, ctx);
  if (!step1.ok) throw new Error(`Step 1 failed: ${step1.error}`);
  const asked = step1.result as { assumptions_to_confirm?: { argument: string; proposed: string }[]; preview_with_proposed?: unknown; saved_models?: unknown[] };
  if (proposalFrom(step1.result) || !asked.assumptions_to_confirm?.length) throw new Error('Step 1 should only propose assumptions.');
  console.log('STEP 1 ASKS', asked.assumptions_to_confirm.map((q) => `${q.argument}=${q.proposed}`).join(' | '));
  console.log('STEP 1 PREVIEW', JSON.stringify(asked.preview_with_proposed), 'saved models:', asked.saved_models?.length);

  const outcome = await runConsigliereTool(
    'draft_research_report',
    {
      ticker,
      assumptions_confirmed: true,
      terminal_growth: 0.025,
      recommendation: 'buy',
      peers: 'ETN, VRT, SIEGY',
      investment_thesis: ['Gas turbine backlog is sold out into 2028, so pricing power is underestimated.'],
      catalysts_near_term: ['Q3 earnings: services margin expansion'],
      key_risks: [{ title: 'Offshore wind losses', impact: 'High' }],
      business_model: 'Power, Wind and Electrification segments selling equipment plus long-term services.',
    },
    ctx,
  );
  if (!outcome.ok) throw new Error(`Tool failed: ${outcome.error}`);
  const proposal = proposalFrom(outcome.result);
  if (!proposal) throw new Error('No save proposal in the tool result.');
  console.log('SUMMARY', JSON.stringify(proposal.summary, null, 1));

  const { report, dcfModel } = proposal.draft as { report: Record<string, unknown>; dcfModel: Record<string, unknown> };
  const empty = (v: unknown) => v == null || v === '' || (Array.isArray(v) && !v.length);
  console.log('FILLED', Object.keys(report).filter((k) => !empty(report[k])).join(', '));
  console.log('EMPTY ', Object.keys(report).filter((k) => empty(report[k])).join(', '));
  console.log('COMPS ', ((report.competitivePosition as { rows?: { ticker: string }[] })?.rows ?? []).map((r) => r.ticker).join(', '));
  console.log('PERF  ', JSON.stringify(report.performanceMetrics));
  console.log('DRAFT BYTES', JSON.stringify(proposal.draft).length, 'model', dcfModel.name);

  // Same shape the browser POSTs to /api/consigliere/save.
  const wire = JSON.parse(JSON.stringify(proposal.draft));
  const admin = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true } });
  const saved = await saveReportDraft(wire, { userId: ctx.userId, name: admin?.name ?? 'SGC Analyst' });
  if (!saved.ok) throw new Error(`Save failed (${saved.status}): ${saved.error}`);
  console.log('SAVED', saved.reportId, saved.dcfModelId, saved.links);

  const extraReports: string[] = [];
  const extraModels: string[] = [];
  try {
    const r = await prisma.equityResearchReport.findUnique({ where: { id: saved.reportId } });
    const m = await prisma.savedDCFModel.findUnique({ where: { id: saved.dcfModelId } });
    if (!r || !m) throw new Error('Saved records not found.');
    type Out = { intrinsicValuePerShare?: number };
    const outputs = m.outputs as Out & { bull?: Out; bear?: Out };
    console.log('REPORT', {
      status: r.status,
      published: r.published,
      createdBy: r.createdBy === ctx.userId,
      dcfModelId: r.dcfModelId === m.id,
      recommendation: r.recommendation,
      targetPrice: r.targetPrice,
      currentPrice: r.currentPrice,
      impliedUpside: r.impliedUpside,
      thesis: Array.isArray(r.investmentThesis) ? r.investmentThesis.length : 'none',
      priceHistory: Array.isArray(r.priceHistory) ? r.priceHistory.length : 'none',
      sentiment: !!r.sentimentSnapshot,
    });
    console.log('MODEL ', { userId: m.userId === ctx.userId, base: outputs.intrinsicValuePerShare, bull: outputs.bull?.intrinsicValuePerShare, bear: outputs.bear?.intrinsicValuePerShare });

    const edit = await runConsigliereTool(
      'edit_research_report',
      {
        ticker,
        add_key_risks: ['Regulatory capital rules tighten'],
        conclusion: 'Added conclusion line from the smoke test.',
        target_price: 123.45,
      },
      ctx,
    );
    if (!edit.ok) throw new Error(`Edit tool failed: ${edit.error}`);
    const editProposal = proposalFrom(edit.result);
    if (editProposal?.kind !== 'report_edit' || editProposal.summary.report_id !== saved.reportId) throw new Error('Edit proposal targets the wrong report.');
    console.log('EDIT CHANGES', editProposal.summary.changes.map((c) => `${c.action} ${c.section}`));
    const editWire = JSON.parse(JSON.stringify(editProposal.draft));

    const other = await prisma.user.findFirst({ where: { role: 'user', id: { not: ctx.userId } }, select: { id: true, role: true } });
    if (other) {
      const denied = await applyReportEdit(editWire, { userId: other.id, role: other.role });
      console.log('OTHER MEMBER EDIT', denied.ok ? 'ALLOWED (BAD)' : `${denied.status} ${denied.error}`);
    }

    const applied = await applyReportEdit(editWire, ctx);
    if (!applied.ok) throw new Error(`Edit failed (${applied.status}): ${applied.error}`);
    const after = await prisma.equityResearchReport.findUnique({
      where: { id: saved.reportId },
      select: { keyRisks: true, concludingSection: true, targetPrice: true, impliedUpside: true, version: true, investmentThesis: true, businessModel: true },
    });
    const versions = await prisma.reportVersion.findMany({ where: { reportId: saved.reportId }, select: { version: true, changeLog: true } });
    console.log('AFTER EDIT', {
      risks: Array.isArray(after?.keyRisks) ? after.keyRisks.length : 0,
      thesisKept: Array.isArray(after?.investmentThesis) ? after.investmentThesis.length : 0,
      businessModelKept: (after?.businessModel ?? '').includes('Power, Wind'),
      conclusion: after?.concludingSection?.slice(-45),
      targetPrice: after?.targetPrice,
      impliedUpside: after?.impliedUpside,
      version: after?.version,
      versions,
    });

    const stale = await applyReportEdit(editWire, ctx);
    console.log('STALE EDIT', stale.ok ? 'ALLOWED (BAD)' : `${stale.status} ${stale.error}`);

    // Briefly marks the test record published (hidden from the website) to check edits are refused.
    await prisma.equityResearchReport.update({ where: { id: saved.reportId }, data: { published: true, showOnWebsite: false } });
    try {
      const onPublished = await runConsigliereTool('edit_research_report', { report_id: saved.reportId, conclusion: 'x' }, ctx);
      console.log('EDIT PUBLISHED', onPublished.ok ? 'ALLOWED (BAD)' : onPublished.error);
    } finally {
      await prisma.equityResearchReport.update({ where: { id: saved.reportId }, data: { published: false, showOnWebsite: true } });
    }

    // A saved model already linked to a report is copied, never re-linked or changed.
    const fromLinked = await runConsigliereTool('draft_research_report', { ticker, saved_model_id: saved.dcfModelId }, ctx);
    if (!fromLinked.ok) throw new Error(fromLinked.error);
    const linkedDraft = proposalFrom(fromLinked.result)?.draft as { dcfModel: { existingId?: string; name: string } };
    console.log('LINKED MODEL', { existingId: linkedDraft.dcfModel.existingId ?? null, name: linkedDraft.dcfModel.name });

    // An unlinked saved model used as-is is linked to the new report and left untouched.
    const unlinked = await prisma.savedDCFModel.create({
      data: { ticker, companyName: m.companyName, inputs: m.inputs ?? {}, outputs: m.outputs ?? {}, financialData: m.financialData ?? {}, userId: ctx.userId, name: 'Smoke test unlinked model', notes: null },
    });
    extraModels.push(unlinked.id);
    const fromSaved = await runConsigliereTool('draft_research_report', { ticker, saved_model_id: unlinked.id }, ctx);
    if (!fromSaved.ok) throw new Error(fromSaved.error);
    const savedProposal = proposalFrom(fromSaved.result)!;
    const savedWire = JSON.parse(JSON.stringify(savedProposal.draft));
    const tampered = JSON.parse(JSON.stringify(savedWire));
    tampered.dcfModel.inputs.revenueGrowth = [0.9, 0.9, 0.9, 0.9, 0.9];
    const linkSave = await saveReportDraft(tampered, { userId: ctx.userId, name: 'Smoke', role: ctx.role });
    if (!linkSave.ok) throw new Error(`Link save failed: ${linkSave.error}`);
    extraReports.push(linkSave.reportId);
    const unlinkedAfter = await prisma.savedDCFModel.findUnique({ where: { id: unlinked.id }, select: { updatedAt: true, inputs: true } });
    const linkedReport = await prisma.equityResearchReport.findUnique({ where: { id: linkSave.reportId }, select: { dcfModelId: true, dcfInputs: true } });
    console.log('UNLINKED MODEL', {
      existingId: (savedWire.dcfModel.existingId ?? null) === unlinked.id,
      reportLinksIt: linkedReport?.dcfModelId === unlinked.id && linkSave.dcfModelId === unlinked.id,
      modelUnchanged: unlinkedAfter?.updatedAt.getTime() === unlinked.updatedAt.getTime(),
      browserTamperIgnored: (linkedReport?.dcfInputs as { revenueGrowth?: number[] })?.revenueGrowth?.[0] !== 0.9,
      warnings: savedProposal.summary.warnings,
    });
    const again = await saveReportDraft(savedWire, { userId: ctx.userId, name: 'Smoke', role: ctx.role });
    console.log('LINK SAME MODEL TWICE', again.ok ? 'ALLOWED (BAD)' : `${again.status} ${again.error}`);
    if (again.ok) extraReports.push(again.reportId);
  } finally {
    if (keep) {
      console.log('KEPT records (--keep).');
    } else {
      for (const id of [saved.reportId, ...extraReports]) await prisma.equityResearchReport.delete({ where: { id } });
      for (const id of [saved.dcfModelId, ...extraModels]) await prisma.savedDCFModel.delete({ where: { id } });
      console.log(`CLEANED UP ${1 + extraReports.length} test report(s) and ${1 + extraModels.length} test model(s).`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
