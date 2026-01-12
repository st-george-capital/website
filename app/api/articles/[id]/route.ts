import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

// GET /api/articles/[id] - Get single article
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const article = await prisma.article.findUnique({
      where: { id: params.id },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

// PUT /api/articles/[id] - Update article (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    
    const data = await req.json();
    
    const article = await prisma.article.update({
      where: { id: params.id },
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        coverImage: data.coverImage,
        author: data.author,
        division: data.division,
        tags: data.tags,
        featured: data.featured,
        published: data.published,
        publishedAt: data.published ? (data.publishedAt || new Date()) : null,
      },
    });

    return NextResponse.json(article);
  } catch (error: any) {
    console.error('Error updating article:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update article' },
      { status: error.message === 'Unauthorized: Admin access required' ? 403 : 500 }
    );
  }
}

// DELETE /api/articles/[id] - Delete article (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    
    await prisma.article.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting article:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete article' },
      { status: error.message === 'Unauthorized: Admin access required' ? 403 : 500 }
    );
  }
}

