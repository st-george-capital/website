import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const models = await prisma.savedDCFModel.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching DCF models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DCF models' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { ticker, companyName, inputs, outputs, financialData, name, notes } = await req.json();

    if (!ticker || !companyName || !inputs || !outputs || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const model = await prisma.savedDCFModel.create({
      data: {
        ticker,
        companyName,
        inputs,
        outputs,
        financialData: financialData || null,
        userId: session.user.id,
        name,
        notes: notes || null,
      },
    });

    return NextResponse.json(model);
  } catch (error) {
    console.error('Error creating DCF model:', error);
    return NextResponse.json(
      { error: 'Failed to create DCF model' },
      { status: 500 }
    );
  }
}
