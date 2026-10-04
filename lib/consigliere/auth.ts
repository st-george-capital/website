import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const MEMBER_ROLES = new Set(['user', 'editor', 'admin']);

export type Member = { userId: string; role: string; name: string };

export async function requireMember(): Promise<Member | { error: NextResponse }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: NextResponse.json({ error: 'Sign in to use Consigliere.' }, { status: 401 }) };
  if (!MEMBER_ROLES.has(session.user.role)) {
    return { error: NextResponse.json({ error: 'Consigliere is available to SGC members.' }, { status: 403 }) };
  }
  return {
    userId: session.user.id as string,
    role: session.user.role as string,
    name: session.user.name || session.user.email || 'SGC member',
  };
}

/** Sliding one-minute window per member and bucket. In-memory, so it is per server instance. */
export function makeRateLimiter(maxPerMinute: number) {
  const recent = new Map<string, number[]>();
  return (userId: string) => {
    const now = Date.now();
    const calls = (recent.get(userId) ?? []).filter((t) => now - t < 60_000);
    calls.push(now);
    recent.set(userId, calls);
    return calls.length > maxPerMinute;
  };
}
