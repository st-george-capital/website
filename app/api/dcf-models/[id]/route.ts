import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const model = await prisma.savedDCFModel.findUnique({
      where: { id: params.id },
    });

    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (model.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json(model);
  } catch (error) {
    console.error('Error fetching DCF model:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DCF model' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const existingModel = await prisma.savedDCFModel.findUnique({
      where: { id: params.id },
    });

    if (!existingModel) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    if (existingModel.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { inputs, outputs, financialData, name, notes } = await req.json();

    const model = await prisma.savedDCFModel.update({
      where: { id: params.id },
      data: {
        ...(inputs && { inputs }),
        ...(outputs && { outputs }),
        ...(financialData !== undefined && { financialData }),
        ...(name && { name }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(model);
  } catch (error) {
    console.error('Error updating DCF model:', error);
    return NextResponse.json(
      { error: 'Failed to update DCF model' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const model = await prisma.savedDCFModel.findUnique({
      where: { id: params.id },
    });

    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    if (model.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await prisma.savedDCFModel.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Model deleted successfully' });
  } catch (error) {
    console.error('Error deleting DCF model:', error);
    return NextResponse.json(
      { error: 'Failed to delete DCF model' },
      { status: 500 }
    );
  }
}
