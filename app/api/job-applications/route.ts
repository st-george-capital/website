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
    const {
      jobPostingId,
      name,
      email,
      faculty,
      subfaculty,
      internshipCount,
      internshipFields,
      resumeFile
    } = await req.json();

    // Validate required fields
    if (!jobPostingId || !name || !email || !faculty) {
      return NextResponse.json(
        { error: 'Job posting ID, name, email, and faculty are required' },
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
        faculty: faculty || null,
        subfaculty: subfaculty || null,
        internshipCount: Number(internshipCount) || 0,
        internshipFields: internshipFields || [],
        resumeFile,
      },
    });

    // Auto-sync applicant into Resume Book (dedup by same name first).
    // Only syncs if they actually uploaded a resume.
    if (resumeFile && name) {
      try {
        const existing = await prisma.resumeSubmission.findFirst({
          where: {
            OR: [
              { name: { equals: name, mode: 'insensitive' } },
              { email },
            ],
          },
          orderBy: { createdAt: 'desc' },
        });
        if (!existing) {
          await prisma.resumeSubmission.create({
            data: {
              name,
              email,
              faculty: faculty || null,
              subfaculty: subfaculty || null,
              internshipCount: Number(internshipCount) || 0,
              internshipFields: internshipFields || [],
              resumeFile,
              source: 'job_application',
              appliedFor: jobPosting.title,
            },
          });
        } else {
          // Existing same person/name: take newer submission as source of truth
          await prisma.resumeSubmission.update({
            where: { id: existing.id },
            data: {
              name,
              email,
              faculty: faculty || existing.faculty || null,
              subfaculty: subfaculty || existing.subfaculty || null,
              internshipCount: Number(internshipCount) || existing.internshipCount || 0,
              internshipFields: (internshipFields && internshipFields.length > 0) ? internshipFields : existing.internshipFields,
              resumeFile,
              source: 'job_application',
              appliedFor: jobPosting.title,
            },
          });
        }
      } catch (syncErr) {
        // Non-fatal — application was already saved successfully
        console.error('Resume book sync error (non-fatal):', syncErr);
      }
    }

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error('Error creating job application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}