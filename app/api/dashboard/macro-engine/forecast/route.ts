import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { buildRegimeForecast } from '@/lib/macro-engine/regime/forecast';
import type { RegimeForecastPayload } from '@/lib/macro-engine/regime/forecast';

export const dynamic = 'force-dynamic';

export type { RegimeForecastPayload };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await buildRegimeForecast();
  if (!payload) {
    return NextResponse.json(
      { error: 'No regime data available — run npm run regime:fit first.' },
      { status: 404 }
    );
  }

  return NextResponse.json(payload satisfies RegimeForecastPayload);
}
