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

  const { feedback, ...rest } = pitch;

  return {
    ...rest,
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

    let pitch: any;
    try {
      pitch = await prisma.investmentPitch.findUnique({
        where: { id: params.id },
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
    } catch (error) {
      console.warn('Pitch collaboration tables unavailable, falling back to legacy pitch detail:', error);
      pitch = await prisma.investmentPitch.findUnique({
        where: { id: params.id },
      });
    }

    if (!pitch) {
      return NextResponse.json(
        { error: 'Investment pitch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json('feedback' in pitch ? summarizePitch(pitch) : fallbackPitch(pitch));
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

      const [, pitch] = await prisma.$transaction([
        prisma.pitchParticipant.deleteMany({
          where: { pitchId: params.id },
        }),
        prisma.investmentPitch.update({
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
            participants: {
              create: participantUsers.map((user) => ({
                userId: user.id,
                userName: user.name || user.email,
              })),
            },
          },
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
        }),
      ]);

      return NextResponse.json(summarizePitch(pitch));
    } catch (error) {
      console.warn('Pitch collaboration tables unavailable during update, saving legacy pitch only:', error);
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

      return NextResponse.json(fallbackPitch(pitch));
    }
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
