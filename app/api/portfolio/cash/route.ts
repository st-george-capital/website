import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCashBalance } from '@/lib/cash';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth();
    const result = await getCashBalance();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cash balance error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash balance' },
      { status: 500 }
    );
  }
}
