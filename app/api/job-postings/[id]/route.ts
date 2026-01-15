import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const jobPosting = await prisma.jobPosting.findUnique({
      where: { id: params.id },
    });

    if (!jobPosting) {
      return NextResponse.json(
        { error: 'Job posting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(jobPosting);
  } catch (error) {
    console.error('Error fetching job posting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job posting' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { title, description, team, endDate, published } = await req.json();

    // Validate team if provided
    if (team) {
      const validTeams = ['quant_trading', 'quant_research', 'macro', 'equity'];
      if (!validTeams.includes(team)) {
        return NextResponse.json(
          { error: 'Invalid team selection' },
          { status: 400 }
        );
      }
    }

    const jobPosting = await prisma.jobPosting.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(team && { team }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(published !== undefined && { published }),
      },
    });

    return NextResponse.json(jobPosting);
  } catch (error) {
    console.error('Error updating job posting:', error);
    return NextResponse.json(
      { error: 'Failed to update job posting' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await prisma.jobPosting.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting job posting:', error);
    return NextResponse.json(
      { error: 'Failed to delete job posting' },
      { status: 500 }
    );
  }
}