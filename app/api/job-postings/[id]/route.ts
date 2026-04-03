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
        ...(endDate !== undefined && { endDate: parsePostingEndDate(endDate) }),
        ...(published !== undefined && { published }),
        ...(documentFile !== undefined && { documentFile: documentFile || null }),
      },
    });

    revalidatePath('/contact');
    revalidatePath('/dashboard/postings');

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
          const existing = await prisma.resumeSubmission.findFirst({
            where: {
              OR: [
                { name: { equals: app.name, mode: 'insensitive' } },
                { email: app.email },
              ],
            },
            orderBy: { createdAt: 'desc' },
          });
          if (!existing) {
            await prisma.resumeSubmission.create({
              data: {
                name: app.name,
                email: app.email,
                faculty: app.faculty || null,
                subfaculty: app.subfaculty || null,
                internshipCount: app.internshipCount || 0,
                internshipFields: app.internshipFields || [],
                resumeFile: app.resumeFile!,
                source: 'job_application',
                appliedFor: posting.title,
              },
            });
          } else {
            await prisma.resumeSubmission.update({
              where: { id: existing.id },
              data: {
                name: app.name,
                email: app.email,
                faculty: app.faculty || existing.faculty || null,
                subfaculty: app.subfaculty || existing.subfaculty || null,
                internshipCount: app.internshipCount || existing.internshipCount || 0,
                internshipFields: (app.internshipFields && app.internshipFields.length > 0) ? app.internshipFields : existing.internshipFields,
                resumeFile: app.resumeFile!,
                source: 'job_application',
                appliedFor: posting.title,
              },
            });
          }
        } catch (syncErr) {
          console.error('Resume book sync on delete (non-fatal):', syncErr);
        }
      }
    }

    await prisma.jobPosting.delete({
      where: { id: params.id },
    });

    revalidatePath('/contact');
    revalidatePath('/dashboard/postings');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting job posting:', error);
    return NextResponse.json(
      { error: 'Failed to delete job posting' },
      { status: 500 }
    );
  }
}
