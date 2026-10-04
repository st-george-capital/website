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

    const versions = await prisma.reportVersion.findMany({
      where: { reportId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
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

    const access = await findReportAccess(params.id, { userId: session.user.id, role: session.user.role });
    if (!access) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    if (!access.canEdit) {
      return NextResponse.json({ error: 'Only the author, collaborators or an admin can save versions' }, { status: 403 });
    }

    const { changeLog } = await req.json();

    // Get current report state
    const report = await prisma.equityResearchReport.findUnique({
      where: { id: params.id },
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Create new version
    const version = await prisma.reportVersion.create({
      data: {
        reportId: params.id,
        version: report.version + 1,
        snapshot: report as any,
        createdBy: session.user.id,
        changeLog: changeLog || null,
      },
    });

    // Increment report version
    await prisma.equityResearchReport.update({
      where: { id: params.id },
      data: { version: report.version + 1 },
    });

    return NextResponse.json(version);
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    );
  }
}
