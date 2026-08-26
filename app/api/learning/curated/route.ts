import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, getSession, isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const admin = isAdmin(session);
    const { searchParams } = new URL(req.url);
    const kind = searchParams.get('kind');
    const publishedOnly = searchParams.get('published') === 'true';

    const where: any = {};
    if (kind) where.kind = kind;
    // Non-admins only ever receive published rows; admins respect `published=true`
    // when explicitly filtering.
    if (publishedOnly || !admin) where.published = true;

    const items = await prisma.learningCuratedItem.findMany({
      where,
      orderBy: [{ kind: 'asc' }, { order: 'asc' }],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching curated items:', error);
    return NextResponse.json({ error: 'Failed to fetch curated items' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const data = await req.json();

    const item = await prisma.learningCuratedItem.create({
      data: {
        kind: data.kind,
        title: data.title,
        url: data.url,
        description: data.description ?? null,
        author: data.author ?? null,
        imageUrl: data.imageUrl ?? null,
        order: data.order ?? 0,
        published: data.published ?? false,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating curated item:', error);
    return NextResponse.json({ error: 'Failed to create curated item' }, { status: 500 });
  }
}
