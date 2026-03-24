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

    const jobPosting = await prisma.jobPosting.findUnique({
      where: { id: params.id },
    });

    if (!jobPosting) {
      return NextResponse.json(
        { error: 'Job posting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(jobPosting);
  } catch (error) {
    console.error('Error fetching job posting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job posting' },
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

    const { title, description, team, endDate, published, documentFile } = await req.json();

    // Validate team if provided
    if (team) {
      const validTeams = ['quant_trading', 'quant_research', 'macro', 'equity'];
      if (!validTeams.includes(team)) {
        return NextResponse.json(
          { error: 'Invalid team selection' },
          { status: 400 }
        );
      }
    }

    const jobPosting = await prisma.jobPosting.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(team !== undefined && { team }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(published !== undefined && { published }),
        ...(documentFile !== undefined && { documentFile: documentFile || null }),
      },
    });

    return NextResponse.json(jobPosting);
  } catch (error) {
    console.error('Error updating job posting:', error);
    return NextResponse.json(
      { error: 'Failed to update job posting' },
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

    // Preserve applicant resumes before the cascade delete wipes the applications.
    // Anyone who applied with a resume gets upserted into the Resume Book so the
    // file is permanently on record even after the posting is gone.
    const posting = await prisma.jobPosting.findUnique({
      where: { id: params.id },
      include: { applications: true },
    });

    if (posting) {
      for (const app of posting.applications.filter(a => a.resumeFile)) {
        try {
          const existing = await prisma.resumeSubmission.findFirst({ where: { email: app.email } });
          if (!existing) {
            await prisma.resumeSubmission.create({
              data: {
                name: app.name,
                email: app.email,
                resumeFile: app.resumeFile!,
                source: 'job_application',
                appliedFor: posting.title,
              },
            });
          }
          // If they already have an entry, their existing record is the authoritative copy — leave it
        } catch (syncErr) {
          console.error('Resume book sync on delete (non-fatal):', syncErr);
        }
      }
    }

    await prisma.jobPosting.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting job posting:', error);
    return NextResponse.json(
      { error: 'Failed to delete job posting' },
      { status: 500 }
    );
  }
}