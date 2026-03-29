import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SCORE_FIELDS = [
  'thesisClarity',
  'variantView',
  'valuation',
  'catalysts',
  'risks',
  'delivery',
] as const;

function canViewFeedback(session: any, participants: Array<{ userId: string }>) {
  return session?.user?.role === 'admin' || participants.some((participant) => participant.userId === session?.user?.id);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let pitch;
    try {
      pitch = await prisma.investmentPitch.findUnique({
        where: { id: params.id },
        include: {
          participants: {
            orderBy: { userName: 'asc' },
          },
          feedback: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } catch (error) {
      console.warn('Pitch collaboration tables unavailable while fetching feedback:', error);
      return NextResponse.json(
        { error: 'Pitch feedback will appear once the database migration is applied.' },
        { status: 503 }
      );
    }

    if (!pitch) {
      return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
    }

    const viewerCanSeeFeedback = canViewFeedback(session, pitch.participants);
    const userFeedback = pitch.feedback.find((entry) => entry.submittedBy === session.user.id) || null;

    return NextResponse.json({
      pitchId: pitch.id,
      title: pitch.title,
      published: pitch.published,
      participants: pitch.participants,
      canViewFeedback: viewerCanSeeFeedback,
      canSubmitFeedback: session.user.role !== 'visitor' && pitch.published,
      userFeedback,
      feedback: viewerCanSeeFeedback ? pitch.feedback : [],
    });
  } catch (error) {
    console.error('Error fetching pitch feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pitch feedback' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === 'visitor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let pitch;
    try {
      pitch = await prisma.investmentPitch.findUnique({
        where: { id: params.id },
        include: {
          participants: true,
        },
      });
    } catch (error) {
      console.warn('Pitch collaboration tables unavailable while saving feedback:', error);
      return NextResponse.json(
        { error: 'Pitch feedback will appear once the database migration is applied.' },
        { status: 503 }
      );
    }

    if (!pitch) {
      return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
    }

    if (!pitch.published) {
      return NextResponse.json(
        { error: 'Feedback is only available for published pitches' },
        { status: 400 }
      );
    }

    const payload = await req.json();
    for (const field of SCORE_FIELDS) {
      const value = Number(payload[field]);
      if (!Number.isFinite(value) || value < 1 || value > 5) {
        return NextResponse.json(
          { error: 'All rubric scores must be between 1 and 5' },
          { status: 400 }
        );
      }
    }

    const feedback = await prisma.pitchFeedback.upsert({
      where: {
        pitchId_submittedBy: {
          pitchId: params.id,
          submittedBy: session.user.id,
        },
      },
      update: {
        thesisClarity: Number(payload.thesisClarity),
        variantView: Number(payload.variantView),
        valuation: Number(payload.valuation),
        catalysts: Number(payload.catalysts),
        risks: Number(payload.risks),
        delivery: Number(payload.delivery),
        strengths: payload.strengths || null,
        improvements: payload.improvements || null,
        overallComment: payload.overallComment || null,
        submittedByName: session.user.name || session.user.email || 'Anonymous',
      },
      create: {
        pitchId: params.id,
        submittedBy: session.user.id,
        submittedByName: session.user.name || session.user.email || 'Anonymous',
        thesisClarity: Number(payload.thesisClarity),
        variantView: Number(payload.variantView),
        valuation: Number(payload.valuation),
        catalysts: Number(payload.catalysts),
        risks: Number(payload.risks),
        delivery: Number(payload.delivery),
        strengths: payload.strengths || null,
        improvements: payload.improvements || null,
        overallComment: payload.overallComment || null,
      },
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error('Error saving pitch feedback:', error);
    return NextResponse.json(
      { error: 'Failed to save pitch feedback' },
      { status: 500 }
    );
  }
}
