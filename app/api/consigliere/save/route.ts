import { NextRequest, NextResponse } from 'next/server';
import { makeRateLimiter, requireMember } from '@/lib/consigliere/auth';
import { applyReportEdit } from '@/lib/consigliere/report-edit';
import { saveReportDraft } from '@/lib/consigliere/report-save';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const rateLimited = makeRateLimiter(10);

/** Saves a draft or draft edit Consigliere prepared, only after the member clicks Save in the chat. */
export async function POST(request: NextRequest) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  if (rateLimited(auth.userId)) return NextResponse.json({ error: 'Too many saves in the last minute.' }, { status: 429 });

  const body = await request.json().catch(() => null);
  if (!body || (body.kind !== 'research_report' && body.kind !== 'report_edit')) {
    return NextResponse.json({ error: 'Expected { kind: "research_report" | "report_edit", draft }.' }, { status: 400 });
  }

  try {
    const outcome =
      body.kind === 'report_edit'
        ? await applyReportEdit(body.draft, { userId: auth.userId, role: auth.role })
        : await saveReportDraft(body.draft, { userId: auth.userId, name: auth.name, role: auth.role });
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    return NextResponse.json(outcome);
  } catch (err) {
    console.error('[consigliere] save failed:', err);
    return NextResponse.json({ error: 'Saving failed. Nothing was written; try again.' }, { status: 500 });
  }
}
