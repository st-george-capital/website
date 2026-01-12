import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

// GET - Fetch all team members
export async function GET() {
  try {
    const members = await prisma.teamMember.findMany({
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(members);
  } catch (error) {
    console.error('Get team members error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

// POST - Create new team member (admin only)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      name,
      title,
      division,
      program,
      year,
      linkedin,
      headshot,
      isExecutive,
      order,
    } = body;

    if (!name || !division) {
      return NextResponse.json(
        { error: 'Name and division are required' },
        { status: 400 }
      );
    }

    const member = await prisma.teamMember.create({
      data: {
        name,
        title: title || '',
        role: title || '', // Keep role same as title for compatibility
        division,
        program: program || null,
        year: year || null,
        linkedin: linkedin || null,
        headshot: headshot || null,
        isExecutive: isExecutive !== undefined ? isExecutive : false, // Default to NOT showing on website
        order: order || 0,
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    console.error('Create team member error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create team member' },
      { status: error.message === 'Unauthorized: Admin access required' ? 403 : 500 }
    );
  }
}
