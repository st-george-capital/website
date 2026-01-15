import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    const { title, description, team, endDate, published, documentFile } = await req.json();

    // Validate required fields
    if (!title || !description || !team || !endDate) {
      return NextResponse.json(
        { error: 'Title, description, team, and end date are required' },
        { status: 400 }
      );
    }

    // Validate team
    const validTeams = ['quant_trading', 'quant_research', 'macro', 'equity'];
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
        endDate: new Date(endDate),
        published,
        documentFile,
      },
    });

    return NextResponse.json(jobPosting, { status: 201 });
  } catch (error) {
    console.error('Error creating job posting:', error);
    return NextResponse.json(
      { error: 'Failed to create job posting' },
      { status: 500 }
    );
  }
}