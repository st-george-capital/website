import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function summarizePitch(pitch: any) {
  const feedbackCount = pitch.feedback.length;
  const averageScore = feedbackCount === 0
    ? null
    : pitch.feedback.reduce((sum: number, item: any) => {
        const total =
          item.thesisClarity +
          item.variantView +
          item.valuation +
          item.catalysts +
          item.risks +
          item.delivery;
        return sum + total / 6;
      }, 0) / feedbackCount;

  return {
    ...pitch,
    feedback: undefined,
    feedbackCount,
    averageScore,
    collaborationReady: true,
  };
}

function fallbackPitch(pitch: any) {
  return {
    ...pitch,
    participants: [],
    feedbackCount: 0,
    averageScore: null,
    collaborationReady: false,
  };
}

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

    try {
      const pitches = await prisma.investmentPitch.findMany({
        where,
        orderBy: { pitchDate: 'desc' },
        include: {
          participants: {
            orderBy: { userName: 'asc' },
          },
          feedback: {
            select: {
              thesisClarity: true,
              variantView: true,
              valuation: true,
              catalysts: true,
              risks: true,
              delivery: true,
            },
          },
        },
      });

      return NextResponse.json(pitches.map(summarizePitch));
    } catch (error) {
      console.warn('Pitch collaboration tables unavailable, falling back to legacy pitch list:', error);
      const pitches = await prisma.investmentPitch.findMany({
        where,
        orderBy: { pitchDate: 'desc' },
      });

      return NextResponse.json(pitches.map(fallbackPitch));
    }
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
      associatedUserIds = [],
    } = await req.json();

    try {
      const participantUsers = associatedUserIds.length > 0
        ? await prisma.user.findMany({
            where: {
              id: { in: associatedUserIds },
            },
            select: {
              id: true,
              name: true,
              email: true,
            },
          })
        : [];

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
          participants: {
            create: participantUsers.map((user) => ({
              userId: user.id,
              userName: user.name || user.email,
            })),
          },
        },
        include: {
          participants: true,
          feedback: {
            select: {
              thesisClarity: true,
              variantView: true,
              valuation: true,
              catalysts: true,
              risks: true,
              delivery: true,
            },
          },
        },
      });

      return NextResponse.json(summarizePitch(pitch), { status: 201 });
    } catch (error) {
      console.warn('Pitch collaboration tables unavailable during create, saving legacy pitch only:', error);
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

      return NextResponse.json(fallbackPitch(pitch), { status: 201 });
    }
  } catch (error) {
    console.error('Error creating investment pitch:', error);
    return NextResponse.json(
      { error: 'Failed to create investment pitch' },
      { status: 500 }
    );
  }
}
