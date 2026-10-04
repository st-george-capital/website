import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { consigliereToolSpecs, runConsigliereTool } from '@/lib/consigliere/tools/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MEMBER_ROLES = new Set(['user', 'editor', 'admin']);
const WINDOW_MS = 60_000;
const MAX_CALLS_PER_WINDOW = 40;
const recentCalls = new Map<string, number[]>();

async function requireMember() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: NextResponse.json({ error: 'Sign in to use Consigliere.' }, { status: 401 }) };
  if (!MEMBER_ROLES.has(session.user.role)) {
    return { error: NextResponse.json({ error: 'Consigliere is available to SGC members.' }, { status: 403 }) };
  }
  return { userId: session.user.id as string };
}

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const calls = (recentCalls.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  calls.push(now);
  recentCalls.set(userId, calls);
  return calls.length > MAX_CALLS_PER_WINDOW;
}

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
  const outcome = await runConsigliereTool(body.name, body.arguments ?? {});
  if (!outcome.ok) console.warn(`[consigliere] ${body.name} returned error after ${Date.now() - started}ms: ${outcome.error}`);
  return NextResponse.json(outcome);
}
