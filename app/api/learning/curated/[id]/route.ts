import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const data = await req.json();

    const item = await prisma.learningCuratedItem.update({
      where: { id: params.id },
      data: {
        kind: data.kind,
        title: data.title,
        url: data.url,
        description: data.description ?? null,
        author: data.author ?? null,
        imageUrl: data.imageUrl ?? null,
        order: data.order,
        published: data.published,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating curated item:', error);
    return NextResponse.json({ error: 'Failed to update curated item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    await prisma.learningCuratedItem.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting curated item:', error);
    return NextResponse.json({ error: 'Failed to delete curated item' }, { status: 500 });
  }
}
