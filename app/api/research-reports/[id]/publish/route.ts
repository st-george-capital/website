import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can publish reports' },
        { status: 403 }
      );
    }

    const { published } = await req.json();

    const report = await prisma.equityResearchReport.update({
      where: { id: params.id },
      data: {
        published,
        publishedAt: published ? new Date() : null,
        status: published ? 'published' : 'draft',
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error publishing research report:', error);
    return NextResponse.json(
      { error: 'Failed to publish research report' },
      { status: 500 }
    );
  }
}
