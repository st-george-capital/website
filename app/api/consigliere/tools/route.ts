import { NextRequest, NextResponse } from 'next/server';
import { makeRateLimiter, requireMember } from '@/lib/consigliere/auth';
import { consigliereToolSpecs, runConsigliereTool } from '@/lib/consigliere/tools/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const rateLimited = makeRateLimiter(40);

export async function GET() {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  return NextResponse.json({ tools: consigliereToolSpecs() });
}

export async function POST(request: NextRequest) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Expected { name, arguments }.' }, { status: 400 });
  }
  if (rateLimited(auth.userId)) {
    return NextResponse.json(
      { ok: false, error: 'Too many tool calls in the last minute. Wait a moment and ask again.' },
      { status: 429 }
    );
  }

  const started = Date.now();
  const outcome = await runConsigliereTool(body.name, body.arguments ?? {}, { userId: auth.userId, role: auth.role });
  if (!outcome.ok) console.warn(`[consigliere] ${body.name} returned error after ${Date.now() - started}ms: ${outcome.error}`);
  return NextResponse.json(outcome);
}
