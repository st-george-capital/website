import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Public: submit a resume
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, faculty, subfaculty, internshipCount, internshipFields, resumeFile } = body;

    if (!name || !email || !faculty || !resumeFile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await prisma.resumeSubmission.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { email },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    const payload = {
      name,
      email,
      faculty,
      subfaculty: subfaculty || null,
      internshipCount: Number(internshipCount) || 0,
      internshipFields: internshipFields || [],
      resumeFile,
      source: 'direct',
      appliedFor: null,
    };

    const submission = existing
      ? await prisma.resumeSubmission.update({ where: { id: existing.id }, data: payload })
      : await prisma.resumeSubmission.create({ data: payload });

    return NextResponse.json(submission, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Error creating resume submission:', error);
    return NextResponse.json({ error: 'Failed to submit resume' }, { status: 500 });
  }
}

// Admin: get all submissions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const submissions = await prisma.resumeSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error('Error fetching resume submissions:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}
