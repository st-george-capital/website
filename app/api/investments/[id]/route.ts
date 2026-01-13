import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const investment = await prisma.investment.findUnique({
      where: { id: params.id },
    });

    if (!investment) {
      return NextResponse.json(
        { error: 'Investment not found' },
        { status: 404 }
      );
    }

    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'admin';

    // Only show published content to non-admins
    if (!isAdmin && !investment.published) {
      return NextResponse.json(
        { error: 'Investment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(investment);
  } catch (error) {
    console.error('Failed to fetch investment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
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

    const data = await request.json();

    const entryDate = data.entryDate ? new Date(data.entryDate) : null;
    const publishDate = data.publishDate ? new Date(data.publishDate) : entryDate;

    const investment = await prisma.investment.update({
      where: { id: params.id },
      data: {
        type: data.type,
        title: data.title,
        company: data.company,
        ticker: data.ticker,
        year: data.year,
        season: data.season,
        content: data.content,
        thesis: data.thesis,
        entryDate,
        priceAtEntry: data.priceAtEntry ? parseFloat(data.priceAtEntry) : null,
        initialTarget: data.initialTarget ? parseFloat(data.initialTarget) : null,
        currentTarget: data.currentTarget ? parseFloat(data.currentTarget) : null,
        publishDate,
        tags: data.tags || '',
        coverImage: data.coverImage || null,
        published: data.published || false,
      },
    });

    return NextResponse.json(investment);
  } catch (error) {
    console.error('Failed to update investment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
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

    await prisma.investment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Investment deleted successfully' });
  } catch (error) {
    console.error('Failed to delete investment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
