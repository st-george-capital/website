import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getApiTicker } from '@/lib/exchange';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth();

    const holdings = await prisma.holding.findMany({
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(holdings);
  } catch (error) {
    console.error('Get holdings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holdings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const {
      ticker,
      assetType,
      quantity,
      costBasis,
      entryDate,
      sector,
      region,
      strategyTag,
      notes,
      visible,
      exchange,
    } = body;

    const cleanTicker = ticker.toUpperCase().replace(/\.(TRT|TRV|LON)$/, '');
    const exc = exchange || 'US';
    const apiTicker = getApiTicker(cleanTicker, exc);

    const holding = await prisma.holding.create({
      data: {
        ticker: cleanTicker,
        apiTicker: exc !== 'US' ? apiTicker : null,
        exchange: exc,
        assetType,
        quantity: parseFloat(quantity),
        costBasis: costBasis ? parseFloat(costBasis) : null,
        entryDate: new Date(entryDate),
        sector,
        region,
        strategyTag,
        notes,
        visible: visible !== undefined ? visible : true,
      },
    });

    return NextResponse.json(holding, { status: 201 });
  } catch (error) {
    console.error('Create holding error:', error);
    return NextResponse.json(
      { error: 'Failed to create holding' },
      { status: 500 }
    );
  }
}

