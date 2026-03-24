import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/resume-book/backfill
 *
 * One-time admin operation: copies every existing JobApplication that has a
 * resumeFile into the ResumeSubmission table (dedup by same name/email).
 * Safe to call multiple times — existing matching entries are updated in-place.
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
    let updated = 0;
    let skipped = 0;

    for (const app of applications) {
      if (!app.resumeFile) { skipped++; continue; }

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
            resumeFile: app.resumeFile,
            source: 'job_application',
            appliedFor: app.jobPosting?.title ?? null,
          },
        });
        added++;
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
            resumeFile: app.resumeFile,
            source: 'job_application',
            appliedFor: app.jobPosting?.title ?? existing.appliedFor ?? null,
          },
        });
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      added,
      updated,
      skipped,
      total: applications.length,
      message: `${added} added, ${updated} updated, ${skipped} skipped (no resume).`,
    });
  } catch (error) {
    console.error('Resume book backfill error:', error);
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500 });
  }
}
