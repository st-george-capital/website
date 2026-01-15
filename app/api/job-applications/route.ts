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

    const applications = await prisma.jobApplication.findMany({
      include: {
        jobPosting: {
          select: {
            title: true,
            team: true,
          },
        },
      },
      orderBy: {
        appliedAt: 'desc',
      },
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error('Error fetching job applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job applications' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { jobPostingId, name, email, resumeFile } = await req.json();

    // Validate required fields
    if (!jobPostingId || !name || !email) {
      return NextResponse.json(
        { error: 'Job posting ID, name, and email are required' },
        { status: 400 }
      );
    }

    // Check if job posting exists and is published
    const jobPosting = await prisma.jobPosting.findUnique({
      where: { id: jobPostingId },
    });

    if (!jobPosting) {
      return NextResponse.json(
        { error: 'Job posting not found' },
        { status: 404 }
      );
    }

    if (!jobPosting.published) {
      return NextResponse.json(
        { error: 'This job posting is not currently accepting applications' },
        { status: 400 }
      );
    }

    // Check if application deadline has passed
    if (new Date() > jobPosting.endDate) {
      return NextResponse.json(
        { error: 'The application deadline for this position has passed' },
        { status: 400 }
      );
    }

    // Check if user has already applied
    const existingApplication = await prisma.jobApplication.findFirst({
      where: {
        jobPostingId,
        email,
      },
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied for this position' },
        { status: 400 }
      );
    }

    const application = await prisma.jobApplication.create({
      data: {
        jobPostingId,
        name,
        email,
        resumeFile,
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error('Error creating job application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}