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

    const pitch = await prisma.investmentPitch.findUnique({
      where: { id: params.id },
    });

    if (!pitch) {
      return NextResponse.json(
        { error: 'Investment pitch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(pitch);
  } catch (error) {
    console.error('Error fetching investment pitch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch investment pitch' },
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
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const {
      title,
      company,
      sector,
      subcategory,
      pitchDate,
      description,
      documentFile,
      published,
      publishDate,
    } = await req.json();

    const pitch = await prisma.investmentPitch.update({
      where: { id: params.id },
      data: {
        title,
        company,
        sector,
        subcategory,
        pitchDate: new Date(pitchDate),
        description,
        documentFile,
        published,
        publishDate: publishDate ? new Date(publishDate) : null,
      },
    });

    return NextResponse.json(pitch);
  } catch (error) {
    console.error('Error updating investment pitch:', error);
    return NextResponse.json(
      { error: 'Failed to update investment pitch' },
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
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await prisma.investmentPitch.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting investment pitch:', error);
    return NextResponse.json(
      { error: 'Failed to delete investment pitch' },
      { status: 500 }
    );
  }
}
