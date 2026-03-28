import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logos = await prisma.employerLogo.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(logos);
  } catch (error) {
    console.error('Error fetching employer logos:', error);
    return NextResponse.json({ error: 'Failed to fetch logos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { name, logoUrl, order } = await req.json();
    if (!name || !logoUrl) {
      return NextResponse.json({ error: 'name and logoUrl required' }, { status: 400 });
    }

    const logo = await prisma.employerLogo.create({
      data: { name, logoUrl, order: order ?? 0 },
    });
    return NextResponse.json(logo);
  } catch (error) {
    console.error('Error creating employer logo:', error);
    return NextResponse.json({ error: 'Failed to create logo' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await prisma.employerLogo.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employer logo:', error);
    return NextResponse.json({ error: 'Failed to delete logo' }, { status: 500 });
  }
}
