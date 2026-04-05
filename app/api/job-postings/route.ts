import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

function parsePostingEndDate(value: string | Date) {
  if (value instanceof Date) {
    const parsed = new Date(value);
    if (
      parsed.getUTCHours() === 0 &&
      parsed.getUTCMinutes() === 0 &&
      parsed.getUTCSeconds() === 0 &&
      parsed.getUTCMilliseconds() === 0
    ) {
      parsed.setUTCHours(23, 59, 59, 999);
    }
    return parsed;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T23:59:59.999Z`);
  }

  const parsed = new Date(value);
  if (
    parsed.getUTCHours() === 0 &&
    parsed.getUTCMinutes() === 0 &&
    parsed.getUTCSeconds() === 0 &&
    parsed.getUTCMilliseconds() === 0
  ) {
    parsed.setUTCHours(23, 59, 59, 999);
  }
  return parsed;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const jobPostings = await prisma.jobPosting.findMany({
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: [
        { published: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(jobPostings);
  } catch (error) {
    console.error('Error fetching job postings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job postings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
      description,
      team,
      roleTag,
      requirements,
      endDate,
      published,
      documentFile,
    } = await req.json();

    // Validate required fields
    if (!title || !description || !team || !endDate) {
      return NextResponse.json(
        { error: 'Title, description, team, and end date are required' },
        { status: 400 }
      );
    }

    // Validate team
    const validTeams = ['quant_trading', 'quant_research', 'macro', 'equity', 'macro_equity', 'operations', 'executive'];
    if (!validTeams.includes(team)) {
      return NextResponse.json(
        { error: 'Invalid team selection' },
        { status: 400 }
      );
    }

    const jobPosting = await prisma.jobPosting.create({
      data: {
        title,
        description,
        team,
        roleTag: roleTag?.trim() || null,
        requirements: requirements?.trim() || null,
        endDate: parsePostingEndDate(endDate),
        published,
        documentFile,
      },
    });

    revalidatePath('/contact');
    revalidatePath('/dashboard/postings');

    return NextResponse.json(jobPosting, { status: 201 });
  } catch (error) {
    console.error('Error creating job posting:', error);
    return NextResponse.json(
      { error: 'Failed to create job posting' },
      { status: 500 }
    );
  }
}
