import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function refreshAverageConviction(decisionId: string) {
  const aggregate = await prisma.holdingCommitteeVote.aggregate({
    where: { decisionId },
    _avg: {
      conviction: true,
    },
  });

  await prisma.holdingCommitteeDecision.update({
    where: { id: decisionId },
    data: {
      averageConviction: aggregate._avg.conviction ?? null,
    },
  });
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

    const holding = await prisma.holding.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        ticker: true,
        assetType: true,
        strategyTag: true,
      },
    });

    if (!holding) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    const decisions = await prisma.holdingCommitteeDecision.findMany({
      where: { holdingId: params.id },
      include: {
        votes: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { meetingDate: 'desc' },
    });

    return NextResponse.json({
      holding,
      decisions,
    });
  } catch (error) {
    console.error('Error fetching committee decisions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch committee decisions' },
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
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const holding = await prisma.holding.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!holding) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    const payload = await req.json();

    if (payload.action === 'createDecision') {
      if (session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const decision = await prisma.holdingCommitteeDecision.create({
        data: {
          holdingId: params.id,
          meetingDate: payload.meetingDate ? new Date(payload.meetingDate) : new Date(),
          finalDecision: payload.finalDecision || 'pending',
          keyObjections: payload.keyObjections || null,
          summary: payload.summary || null,
          createdBy: session.user.id,
        },
        include: {
          votes: true,
        },
      });

      return NextResponse.json(decision, { status: 201 });
    }

    if (payload.action === 'saveVote') {
      const conviction = Number(payload.conviction);
      if (!Number.isFinite(conviction) || conviction < 1 || conviction > 10) {
        return NextResponse.json(
          { error: 'Conviction must be between 1 and 10' },
          { status: 400 }
        );
      }

      if (!payload.decisionId || !payload.vote) {
        return NextResponse.json(
          { error: 'decisionId and vote are required' },
          { status: 400 }
        );
      }

      const decision = await prisma.holdingCommitteeDecision.findFirst({
        where: {
          id: payload.decisionId,
          holdingId: params.id,
        },
      });

      if (!decision) {
        return NextResponse.json({ error: 'Committee decision not found' }, { status: 404 });
      }

      const vote = await prisma.holdingCommitteeVote.upsert({
        where: {
          decisionId_userId: {
            decisionId: payload.decisionId,
            userId: session.user.id,
          },
        },
        update: {
          vote: payload.vote,
          conviction,
          comment: payload.comment || null,
          objections: payload.objections || null,
          userName: session.user.name || session.user.email || 'Anonymous',
        },
        create: {
          decisionId: payload.decisionId,
          userId: session.user.id,
          userName: session.user.name || session.user.email || 'Anonymous',
          vote: payload.vote,
          conviction,
          comment: payload.comment || null,
          objections: payload.objections || null,
        },
      });

      await refreshAverageConviction(payload.decisionId);

      return NextResponse.json(vote, { status: 201 });
    }

    if (payload.action === 'finalizeDecision') {
      if (session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (!payload.decisionId || !payload.finalDecision) {
        return NextResponse.json(
          { error: 'decisionId and finalDecision are required' },
          { status: 400 }
        );
      }

      const existingDecision = await prisma.holdingCommitteeDecision.findFirst({
        where: {
          id: payload.decisionId,
          holdingId: params.id,
        },
      });

      if (!existingDecision) {
        return NextResponse.json({ error: 'Committee decision not found' }, { status: 404 });
      }

      const decision = await prisma.holdingCommitteeDecision.update({
        where: { id: payload.decisionId },
        data: {
          finalDecision: payload.finalDecision,
          keyObjections: payload.keyObjections || null,
          summary: payload.summary || null,
        },
        include: {
          votes: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return NextResponse.json(decision);
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating committee decisions:', error);
    return NextResponse.json(
      { error: 'Failed to update committee decisions' },
      { status: 500 }
    );
  }
}
