import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findReportAccess } from '@/lib/research/access';


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

    if (!(await findReportAccess(params.id, { userId: session.user.id, role: session.user.role }))) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const comments = await prisma.reportComment.findMany({
      where: { reportId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!(await findReportAccess(params.id, { userId: session.user.id, role: session.user.role }))) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const { section, content } = await req.json();

    if (typeof section !== 'string' || typeof content !== 'string' || !section || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    if (section.length > 100 || content.length > 5000) {
      return NextResponse.json(
        { error: 'Comment is too long (5,000 characters max)' },
        { status: 400 }
      );
    }

    const comment = await prisma.reportComment.create({
      data: {
        reportId: params.id,
        section,
        userId: session.user.id,
        userName: session.user.name || session.user.email,
        content,
      },
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
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
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const access = await findReportAccess(params.id, { userId: session.user.id, role: session.user.role });
    if (!access) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    if (!access.canEdit) {
      return NextResponse.json({ error: 'Only the author, collaborators or an admin can resolve comments' }, { status: 403 });
    }

    const { commentId, resolved } = await req.json();
    if (typeof commentId !== 'string' || typeof resolved !== 'boolean') {
      return NextResponse.json({ error: 'commentId and resolved are required' }, { status: 400 });
    }

    const result = await prisma.reportComment.updateMany({
      where: { id: commentId, reportId: params.id },
      data: { resolved },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    const comment = await prisma.reportComment.findUnique({ where: { id: commentId } });

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}
