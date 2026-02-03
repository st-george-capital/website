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

    const report = await prisma.equityResearchReport.findUnique({
      where: { id: params.id },
      include: {
        dcfModel: true,
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        comments: {
          where: { resolved: false },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error fetching research report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch research report' },
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

    const data = await req.json();

    // Calculate implied upside if price fields are updated
    if (data.currentPrice && data.targetPrice) {
      data.impliedUpside = (data.targetPrice - data.currentPrice) / data.currentPrice;
    }

    // Update lastEditedBy
    data.lastEditedBy = session.user.id;

    const report = await prisma.equityResearchReport.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error updating research report:', error);
    return NextResponse.json(
      { error: 'Failed to update research report' },
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
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await prisma.equityResearchReport.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting research report:', error);
    return NextResponse.json(
      { error: 'Failed to delete research report' },
      { status: 500 }
    );
  }
}
