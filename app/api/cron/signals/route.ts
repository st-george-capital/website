import { type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const { runDailySignals } = await import('../../../../lib/macro-engine/signals');
    const result = await runDailySignals();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error('signals cron failed:', err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
