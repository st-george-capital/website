import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const holding = await prisma.holding.findUnique({
      where: { id: params.id },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!holding) {
      return NextResponse.json(
        { error: 'Holding not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(holding);
  } catch (error) {
    console.error('Get holding error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holding' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const body = await request.json();
    
    const holding = await prisma.holding.update({
      where: { id: params.id },
      data: {
        ...body,
        quantity: body.quantity ? parseFloat(body.quantity) : undefined,
        costBasis: body.costBasis ? parseFloat(body.costBasis) : undefined,
        entryDate: body.entryDate ? new Date(body.entryDate) : undefined,
      },
    });

    return NextResponse.json(holding);
  } catch (error) {
    console.error('Update holding error:', error);
    return NextResponse.json(
      { error: 'Failed to update holding' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    await prisma.holding.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete holding error:', error);
    return NextResponse.json(
      { error: 'Failed to delete holding' },
      { status: 500 }
    );
  }
}

