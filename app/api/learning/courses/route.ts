import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const withLessons = searchParams.get('lessons') === 'true';

    const where: any = {};
    if (!session) where.published = true;

    const courses = await prisma.learningCourse.findMany({
      where,
      orderBy: { order: 'asc' },
      include: withLessons
        ? { lessons: { orderBy: { order: 'asc' } } }
        : undefined,
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const data = await req.json();

    const slug =
      data.slug ||
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const course = await prisma.learningCourse.create({
      data: {
        title: data.title,
        slug,
        summary: data.summary,
        coverImage: data.coverImage ?? null,
        tags: data.tags ?? '',
        published: data.published ?? false,
        order: data.order ?? 0,
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
