import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

// Force dynamic rendering and Node.js runtime to prevent static generation issues
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/articles - List all articles (or just published for non-admin)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const published = searchParams.get('published');
    const division = searchParams.get('division');
    const featured = searchParams.get('featured');
    
    const where: any = {};
    
    if (published === 'true') {
      where.published = true;
    }
    
    if (division) {
      where.division = division;
    }
    
    if (featured === 'true') {
      where.featured = true;
    }

    const articles = await prisma.article.findMany({
      where,
      orderBy: {
        publishedAt: 'desc',
      },
    });

    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

// POST /api/articles - Create new article (admin only)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    
    const data = await req.json();
    
    const article = await prisma.article.create({
      data: {
        title: data.title,
        slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        excerpt: data.excerpt,
        content: data.content,
        coverImage: data.coverImage || null,
        author: data.author,
        division: data.division,
        tags: data.tags || '',
        featured: data.featured || false,
        published: data.published || false,
        publishedAt: data.published 
          ? (data.publishDate ? new Date(data.publishDate) : new Date())
          : null,
      },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error: any) {
    console.error('Error creating article:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create article' },
      { status: error.message === 'Unauthorized: Admin access required' ? 403 : 500 }
    );
  }
}

