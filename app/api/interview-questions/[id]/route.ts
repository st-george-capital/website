import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag).trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return null;
  }

  return session;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const approved = typeof body.approved === 'boolean' ? body.approved : undefined;

    const updated = await prisma.communityInterviewQuestion.update({
      where: { id: params.id },
      data: {
        question: typeof body.question === 'string' ? body.question.trim() : undefined,
        answer: typeof body.answer === 'string' ? body.answer.trim() || null : undefined,
        notes: typeof body.notes === 'string' ? body.notes.trim() || null : undefined,
        role: typeof body.role === 'string' ? body.role : undefined,
        subcategory: typeof body.subcategory === 'string' ? body.subcategory || null : undefined,
        questionType: typeof body.questionType === 'string' ? body.questionType : undefined,
        difficulty: typeof body.difficulty === 'string' ? body.difficulty : undefined,
        company: typeof body.company === 'string' ? body.company.trim() || null : undefined,
        firmType: typeof body.firmType === 'string' ? body.firmType || null : undefined,
        topicTags: body.topicTags !== undefined ? normalizeTags(body.topicTags) : undefined,
        sourceType: typeof body.sourceType === 'string' ? body.sourceType || null : undefined,
        sourceTitle: typeof body.sourceTitle === 'string' ? body.sourceTitle.trim() || null : undefined,
        sourceUrl: typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() || null : undefined,
        attachmentUrl: typeof body.attachmentUrl === 'string' ? body.attachmentUrl.trim() || null : undefined,
        submitterName: typeof body.submitterName === 'string' ? body.submitterName.trim() || null : undefined,
        approved,
        reviewedAt: approved === undefined ? undefined : approved ? new Date() : null,
        reviewedBy: approved === undefined ? undefined : approved ? session.user.id : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating interview question:', error);
    return NextResponse.json({ error: 'Failed to update interview question' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.communityInterviewQuestion.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting interview question:', error);
    return NextResponse.json({ error: 'Failed to delete interview question' }, { status: 500 });
  }
}
