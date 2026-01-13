import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'thesis' or 'outlook'
    const publishedFilter = searchParams.get('published'); // 'all', 'published', or 'draft'

    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'admin';

    // If not admin, only show published content
    const whereClause: any = {};
    if (!isAdmin) {
      whereClause.published = true;
    } else if (publishedFilter === 'published') {
      whereClause.published = true;
    } else if (publishedFilter === 'draft') {
      whereClause.published = false;
    }
    // If publishedFilter is 'all' or null, don't filter by published status (admins see all)

    if (type) {
      whereClause.type = type;
    }

    const investments = await prisma.investment.findMany({
      where: whereClause,
      orderBy: [
        { year: 'desc' },
        { season: 'desc' },
        { createdAt: 'desc' }
      ],
    });

    return NextResponse.json(investments);
  } catch (error) {
    console.error('Failed to fetch investments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();

    const investment = await prisma.investment.create({
      data: {
        type: data.type,
        title: data.title,
        company: data.company,
        ticker: data.ticker,
        year: data.year,
        season: data.season,
        content: data.content,
        thesis: data.thesis,
        entryDate: data.entryDate ? new Date(data.entryDate) : null,
        priceAtEntry: data.priceAtEntry ? parseFloat(data.priceAtEntry) : null,
        initialTarget: data.initialTarget ? parseFloat(data.initialTarget) : null,
        currentTarget: data.currentTarget ? parseFloat(data.currentTarget) : null,
        tags: data.tags || '',
        coverImage: data.coverImage || null,
        published: data.published || false,
      },
    });

    return NextResponse.json(investment);
  } catch (error) {
    console.error('Failed to create investment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
