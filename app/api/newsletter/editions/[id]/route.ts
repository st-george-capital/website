import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const edition = await prisma.newsletterEdition.findUnique({
      where: { id: params.id },
    });
    if (!edition) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(edition);
  } catch (error) {
    console.error('Error fetching edition:', error);
    return NextResponse.json({ error: 'Failed to fetch edition' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, rawContent } = await req.json();

    const edition = await prisma.newsletterEdition.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(rawContent !== undefined && { rawContent }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(edition);
  } catch (error) {
    console.error('Error updating edition:', error);
    return NextResponse.json({ error: 'Failed to update edition' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.newsletterEdition.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting edition:', error);
    return NextResponse.json({ error: 'Failed to delete edition' }, { status: 500 });
  }
}
