import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        teamMember: {
          select: {
            id: true,
            name: true,
            division: true,
            title: true,
            isExecutive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId, teamMemberId } = await request.json();

    if (!userId || !teamMemberId) {
      return NextResponse.json(
        { error: 'userId and teamMemberId are required' },
        { status: 400 }
      );
    }

    // Link user to team member
    const user = await prisma.user.update({
      where: { id: userId },
      data: { teamMemberId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        teamMember: {
          select: {
            id: true,
            name: true,
            division: true,
            title: true,
            isExecutive: true,
          },
        },
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Failed to link user to team member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
