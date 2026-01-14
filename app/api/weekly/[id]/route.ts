import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    const weeklyContent = await prisma.weeklyContent.findUnique({
      where: { id: params.id },
    });

    if (!weeklyContent) {
      return NextResponse.json(
        { error: 'Weekly content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(weeklyContent);
  } catch (error) {
    console.error('Error fetching weekly content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly content' },
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
      category,
      year,
      season,
      week,
      description,
      contentType,
      content,
      documentFile,
      published,
      publishDate,
    } = await req.json();

    // Try to update with new schema first, fall back to old schema if contentType column doesn't exist
    let weeklyContent;
    try {
      weeklyContent = await prisma.weeklyContent.update({
        where: { id: params.id },
        data: {
          title,
          category,
          year,
          season,
          week: parseInt(week),
          description,
          contentType,
          content: contentType === 'markdown' ? content : null,
          documentFile: contentType === 'pdf' ? documentFile : null,
          published,
          publishDate: publishDate ? new Date(publishDate) : null,
        },
      });
    } catch (error: any) {
      // If contentType column doesn't exist, fall back to old schema
      if (error.code === 'P2022' && error.meta?.column === 'contentType') {
        weeklyContent = await prisma.weeklyContent.update({
          where: { id: params.id },
          data: {
            title,
            category,
            year,
            season,
            week: parseInt(week),
            description,
            documentFile,
            published,
            publishDate: publishDate ? new Date(publishDate) : null,
          },
        });
      } else {
        throw error;
      }
    }

    return NextResponse.json(weeklyContent);
  } catch (error) {
    console.error('Error updating weekly content:', error);
    return NextResponse.json(
      { error: 'Failed to update weekly content' },
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

    await prisma.weeklyContent.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting weekly content:', error);
    return NextResponse.json(
      { error: 'Failed to delete weekly content' },
      { status: 500 }
    );
  }
}
