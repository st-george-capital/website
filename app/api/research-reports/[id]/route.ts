import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canLinkDcfModel, findReportAccess, isAdminViewer } from '@/lib/research/access';

const SERVER_MANAGED_FIELDS = new Set(['id', 'createdBy', 'createdAt', 'updatedAt', 'version', 'lastEditedBy', 'publishedAt']);
const EDITABLE_FIELDS = Object.values(Prisma.EquityResearchReportScalarFieldEnum).filter((f) => !SERVER_MANAGED_FIELDS.has(f));

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

    const access = await findReportAccess(params.id, { userId: session.user.id, role: session.user.role });
    if (!access) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    const report = await prisma.equityResearchReport.findUnique({
      where: { id: params.id },
      include: {
        dcfModel: true,
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        comments: {
          where: { resolved: false },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ...report, canEdit: access.canEdit });
  } catch (error) {
    console.error('Error fetching research report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch research report' },
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

    const viewer = { userId: session.user.id, role: session.user.role };
    const access = await findReportAccess(params.id, viewer);
    if (!access) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    if (!access.canEdit) {
      return NextResponse.json({ error: 'Only the author, collaborators or an admin can edit this report' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in body) data[field] = (body as Record<string, unknown>)[field];
    }

    const { report: existing } = access;
    if ('collaborators' in data) {
      const isOwner = existing.createdBy === viewer.userId || isAdminViewer(viewer);
      const list = data.collaborators;
      if (!isOwner) {
        return NextResponse.json({ error: 'Only the author or an admin can change collaborators' }, { status: 403 });
      }
      if (!Array.isArray(list) || list.length > 20 || !list.every((c) => typeof c === 'string' && c.length <= 64)) {
        return NextResponse.json({ error: 'Collaborators must be a list of user ids' }, { status: 400 });
      }
    }

    if (typeof data.dcfModelId === 'string' && data.dcfModelId && data.dcfModelId !== existing.dcfModelId && !(await canLinkDcfModel(data.dcfModelId, viewer))) {
      return NextResponse.json({ error: 'You can only link your own DCF models' }, { status: 403 });
    }

    if (data.published === true) data.publishedAt = existing.publishedAt ?? new Date();
    else if (data.published === false) data.publishedAt = null;

    // Calculate implied upside if price fields are updated
    if (typeof data.currentPrice === 'number' && typeof data.targetPrice === 'number' && data.currentPrice > 0) {
      data.impliedUpside = (data.targetPrice - data.currentPrice) / data.currentPrice;
    }

    data.lastEditedBy = session.user.id;

    const report = await prisma.equityResearchReport.update({
      where: { id: params.id },
      data: data as Prisma.EquityResearchReportUncheckedUpdateInput,
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error updating research report:', error);
    return NextResponse.json(
      { error: 'Failed to update research report' },
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
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await prisma.equityResearchReport.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting research report:', error);
    return NextResponse.json(
      { error: 'Failed to delete research report' },
      { status: 500 }
    );
  }
}
