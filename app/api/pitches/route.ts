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
    const sector = searchParams.get('sector');
    const subcategory = searchParams.get('subcategory');
    const published = searchParams.get('published');

    const where: any = {};

    if (sector && sector !== 'all') {
      where.sector = sector;
    }

    if (subcategory && subcategory !== 'all') {
      where.subcategory = subcategory;
    }

    if (published === 'published') {
      where.published = true;
    } else if (published === 'draft') {
      where.published = false;
    }

    const pitches = await prisma.investmentPitch.findMany({
      where,
      orderBy: { pitchDate: 'desc' },
    });

    return NextResponse.json(pitches);
  } catch (error) {
    console.error('Error fetching investment pitches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch investment pitches' },
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
      company,
      sector,
      subcategory,
      pitchDate,
      description,
      documentFile,
      published,
      publishDate,
    } = await req.json();

    const pitch = await prisma.investmentPitch.create({
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

    return NextResponse.json(pitch, { status: 201 });
  } catch (error) {
    console.error('Error creating investment pitch:', error);
    return NextResponse.json(
      { error: 'Failed to create investment pitch' },
      { status: 500 }
    );
  }
}
