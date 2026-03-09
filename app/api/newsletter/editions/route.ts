import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const editions = await prisma.newsletterEdition.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        issueNumber: true,
        status: true,
        sentAt: true,
        recipientCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json(editions);
  } catch (error) {
    console.error('Error fetching editions:', error);
    return NextResponse.json({ error: 'Failed to fetch editions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, rawContent } = await req.json();
    if (!title || !rawContent) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    // Auto-increment issue number
    const last = await prisma.newsletterEdition.findFirst({
      orderBy: { issueNumber: 'desc' },
      select: { issueNumber: true },
    });
    const issueNumber = (last?.issueNumber ?? 0) + 1;

    const edition = await prisma.newsletterEdition.create({
      data: { title, rawContent, issueNumber },
    });

    return NextResponse.json(edition, { status: 201 });
  } catch (error) {
    console.error('Error creating edition:', error);
    return NextResponse.json({ error: 'Failed to create edition' }, { status: 500 });
  }
}
