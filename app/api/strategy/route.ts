import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'investment_strategy' or 'industry_report'
    const published = searchParams.get('published') !== 'false'; // Default to true

    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'admin';

    const whereClause: any = {};
    if (!isAdmin) {
      whereClause.published = true;
    } else if (published !== undefined) {
      whereClause.published = published;
    }

    if (type) {
      whereClause.type = type;
    }

    const documents = await prisma.strategyDocument.findMany({
      where: whereClause,
      orderBy: { publishDate: 'desc' },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Failed to fetch strategy documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    const publishDate = data.publishDate ? new Date(data.publishDate) : new Date();

    const document = await prisma.strategyDocument.create({
      data: {
        type: data.type, // 'investment_strategy' or 'industry_report'
        title: data.title,
        year: data.year,
        content: data.content,
        executiveSummary: data.executiveSummary,
        industries: data.industries,
        sectors: data.sectors,
        coverImage: data.coverImage,
        documentFile: data.documentFile,
        published: data.published || false,
        publishDate,
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Failed to create strategy document:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
