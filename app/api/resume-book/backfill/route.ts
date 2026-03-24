import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/resume-book/backfill
 *
 * One-time admin operation: copies every existing JobApplication that has a
 * resumeFile into the ResumeSubmission table (deduped by email).
 * Safe to call multiple times — it skips emails already in the Resume Book.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const applications = await prisma.jobApplication.findMany({
      where: { resumeFile: { not: null } },
      include: { jobPosting: { select: { title: true } } },
      orderBy: { appliedAt: 'asc' },
    });

    let added = 0;
    let skipped = 0;

    for (const app of applications) {
      if (!app.resumeFile) { skipped++; continue; }

      const existing = await prisma.resumeSubmission.findFirst({ where: { email: app.email } });
      if (existing) { skipped++; continue; }

      await prisma.resumeSubmission.create({
        data: {
          name: app.name,
          email: app.email,
          resumeFile: app.resumeFile,
          source: 'job_application',
          appliedFor: app.jobPosting?.title ?? null,
        },
      });
      added++;
    }

    return NextResponse.json({
      success: true,
      added,
      skipped,
      total: applications.length,
      message: `${added} new entries added to Resume Book, ${skipped} already existed or had no resume.`,
    });
  } catch (error) {
    console.error('Resume book backfill error:', error);
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500 });
  }
}
