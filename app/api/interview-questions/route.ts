import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseBoolean(value: string | null) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag).trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function extractQuestions(question: string | null | undefined, bulkQuestions: string | null | undefined) {
  const source = bulkQuestions?.trim() || question?.trim() || '';

  return source
    .split('\n')
    .map((line) => line.replace(/^\s*[-*•\d.)]+\s*/, '').trim())
    .filter(Boolean);
}

async function requireDashboardSession() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === 'visitor') {
    return null;
  }

  return session;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireDashboardSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const subcategory = searchParams.get('subcategory');
    const difficulty = searchParams.get('difficulty');
    const questionType = searchParams.get('questionType');
    const company = searchParams.get('company');
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');
    const approved = parseBoolean(searchParams.get('approved'));
    const includeUnreviewed = parseBoolean(searchParams.get('includeUnreviewed'));
    const limit = Number(searchParams.get('limit') || 500);

    const where: any = {};

    if (role) where.role = role;
    if (subcategory) where.subcategory = subcategory;
    if (difficulty) where.difficulty = difficulty;
    if (questionType) where.questionType = questionType;
    if (approved !== undefined) where.approved = approved;
    if (includeUnreviewed === false && approved === undefined) where.approved = true;
    if (company) {
      where.company = { contains: company, mode: 'insensitive' };
    }
    if (tag) {
      where.topicTags = { has: tag };
    }
    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { answer: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { sourceTitle: { contains: search, mode: 'insensitive' } },
        { submitterName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const questions = await prisma.communityInterviewQuestion.findMany({
      where,
      orderBy: [
        { approved: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: Math.min(Math.max(limit, 1), 1000),
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching interview questions:', error);
    return NextResponse.json({ error: 'Failed to fetch interview questions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireDashboardSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const role = typeof body.role === 'string' ? body.role : '';
    const questions = extractQuestions(body.question, body.bulkQuestions);

    if (!role || questions.length === 0) {
      return NextResponse.json({ error: 'Role and at least one question are required' }, { status: 400 });
    }

    const answer = typeof body.answer === 'string' && questions.length === 1 ? body.answer.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const topicTags = normalizeTags(body.topicTags);

    const payloads = questions.map((entry) => ({
      question: entry,
      answer: answer || null,
      notes: notes || null,
      role,
      subcategory: typeof body.subcategory === 'string' && body.subcategory ? body.subcategory : null,
      questionType: typeof body.questionType === 'string' && body.questionType ? body.questionType : 'technical',
      difficulty: typeof body.difficulty === 'string' && body.difficulty ? body.difficulty : 'medium',
      company: typeof body.company === 'string' && body.company.trim() ? body.company.trim() : null,
      firmType: typeof body.firmType === 'string' && body.firmType ? body.firmType : null,
      topicTags,
      sourceType: 'member_submission',
      sourceTitle: typeof body.sourceTitle === 'string' && body.sourceTitle.trim() ? body.sourceTitle.trim() : null,
      sourceUrl: typeof body.sourceUrl === 'string' && body.sourceUrl.trim() ? body.sourceUrl.trim() : null,
      attachmentUrl: typeof body.attachmentUrl === 'string' && body.attachmentUrl.trim() ? body.attachmentUrl.trim() : null,
      submitterName:
        session.user.name ||
        (typeof body.submitterName === 'string' && body.submitterName.trim() ? body.submitterName.trim() : null),
      submittedBy: session.user.id,
      approved: false,
      reviewedAt: null,
      reviewedBy: null,
    }));

    const created = await prisma.$transaction(
      payloads.map((data) => prisma.communityInterviewQuestion.create({ data }))
    );

    return NextResponse.json(
      {
        createdCount: created.length,
        records: created,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting interview questions:', error);
    return NextResponse.json({ error: 'Failed to submit interview questions' }, { status: 500 });
  }
}
