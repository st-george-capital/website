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

    // Try to create with new schema first, fall back to old schema if contentType column doesn't exist
    let weeklyContent;
    try {
      console.log('Trying to create with contentType:', contentType);
      weeklyContent = await prisma.weeklyContent.create({
        data: {
          title,
          category,
          year,
          season,
          week: parseInt(week),
          description,
          contentType,
          content: contentType === 'markdown' ? content : null,
          documentFile: contentType === 'pdf' ? documentFile : null,
          published,
          publishDate: publishDate ? new Date(publishDate) : null,
        },
      });
      console.log('Created successfully with contentType');
    } catch (error: any) {
      console.log('Error caught:', error.code, error.meta);
      // If contentType column doesn't exist, fall back to old schema
      if (error.code === 'P2022' && error.meta?.column === 'contentType') {
        console.log('Falling back to old schema without contentType');
        weeklyContent = await prisma.weeklyContent.create({
          data: {
            title,
            category,
            year,
            season,
            week: parseInt(week),
            description,
            documentFile,
            published,
            publishDate: publishDate ? new Date(publishDate) : null,
          },
        });
        console.log('Created successfully with old schema');
      } else {
        console.log('Throwing error:', error);
        throw error;
      }
    }

    return NextResponse.json(weeklyContent, { status: 201 });
  } catch (error) {
    console.error('Error creating weekly content:', error);
    return NextResponse.json(
      { error: 'Failed to create weekly content' },
      { status: 500 }
    );
  }
}
