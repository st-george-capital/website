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

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const year = searchParams.get('year');
    const season = searchParams.get('season');
    const published = searchParams.get('published');

    const where: any = {};

    if (category && category !== 'all') {
      where.category = category;
    }

    if (year && year !== 'all') {
      where.year = year;
    }

    if (season && season !== 'all') {
      where.season = season;
    }

    if (published === 'published') {
      where.published = true;
    } else if (published === 'draft') {
      where.published = false;
    }

    const weeklyContent = await prisma.weeklyContent.findMany({
      where,
      orderBy: [
        { year: 'desc' },
        { season: 'desc' },
        { week: 'desc' },
      ],
    });

    return NextResponse.json(weeklyContent);
  } catch (error) {
    console.error('Error fetching weekly content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly content' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
      category,
      year,
      season,
      week,
      description,
      contentType,
      content,
      documentFile,
      published,
      publishDate,
    } = await req.json();

    // Create weekly content (handle both old and new schema)
    const weeklyContent = await prisma.weeklyContent.create({
      data: {
        title,
        category,
        year,
        season,
        week: parseInt(week),
        description,
        // Only include contentType if provided (for backward compatibility)
        ...(contentType && { contentType }),
        ...(contentType === 'markdown' && content && { content }),
        ...(contentType === 'pdf' && documentFile && { documentFile }),
        // If no contentType specified, assume it's a PDF with documentFile
        ...(!contentType && documentFile && { documentFile }),
        published,
        publishDate: publishDate ? new Date(publishDate) : null,
      },
    });

    return NextResponse.json(weeklyContent, { status: 201 });
  } catch (error) {
    console.error('Error creating weekly content:', error);
    return NextResponse.json(
      { error: 'Failed to create weekly content' },
      { status: 500 }
    );
  }
}
