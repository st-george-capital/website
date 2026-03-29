import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildInterviewSeedQuestions } from '@/lib/interview-tool/seed/questions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const seeds = buildInterviewSeedQuestions();
    const seedKeys = seeds.map((seed) => seed.seedKey);
    const existing = await prisma.communityInterviewQuestion.findMany({
      where: {
        seedKey: {
          in: seedKeys,
        },
      },
      select: {
        seedKey: true,
      },
    });

    const existingSeedKeys = new Set(existing.map((record) => record.seedKey).filter(Boolean));

    for (const seed of seeds) {
      await prisma.communityInterviewQuestion.upsert({
        where: { seedKey: seed.seedKey },
        update: {
          question: seed.question,
          answer: seed.answer,
          notes: seed.notes,
          role: seed.role,
          subcategory: seed.subcategory,
          questionType: seed.questionType,
          difficulty: seed.difficulty,
          company: seed.company,
          firmType: seed.firmType,
          topicTags: seed.topicTags,
          sourceType: seed.sourceType,
          sourceTitle: seed.sourceTitle,
          sourceUrl: seed.sourceUrl,
          attachmentUrl: seed.attachmentUrl,
          submitterName: seed.submitterName,
          submittedBy: seed.submittedBy,
          approved: true,
          reviewedAt: new Date(),
          reviewedBy: session.user.id,
        },
        create: {
          ...seed,
          approved: true,
          reviewedAt: new Date(),
          reviewedBy: session.user.id,
        },
      });
    }

    await prisma.communityInterviewQuestion.deleteMany({
      where: {
        submitterName: 'SGC Editorial',
        submittedBy: null,
        seedKey: {
          notIn: seedKeys,
        },
      },
    });

    const createdCount = seeds.filter((seed) => !existingSeedKeys.has(seed.seedKey)).length;
    const updatedCount = seeds.length - createdCount;

    return NextResponse.json({
      imported: seeds.length,
      created: createdCount,
      updated: updatedCount,
    });
  } catch (error) {
    console.error('Error importing interview seeds:', error);
    return NextResponse.json({ error: 'Failed to import interview seed bank' }, { status: 500 });
  }
}
