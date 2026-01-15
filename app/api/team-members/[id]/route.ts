import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    const {
      name,
      title,
      role,
      division,
      program,
      year,
      bio,
      linkedin,
      headshot,
      isExecutive,
      order,
    } = await req.json();

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.title = title;
    if (role !== undefined) updateData.role = role;
    if (division !== undefined) updateData.division = division;
    if (program !== undefined) updateData.program = program;
    if (year !== undefined) updateData.year = year;
    if (bio !== undefined) updateData.bio = bio;
    if (linkedin !== undefined) updateData.linkedin = linkedin;
    if (headshot !== undefined) updateData.headshot = headshot;
    if (isExecutive !== undefined) updateData.isExecutive = isExecutive;
    if (order !== undefined) updateData.order = order;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const teamMember = await prisma.teamMember.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(teamMember);
  } catch (error) {
    console.error('Error updating team member:', error);
    return NextResponse.json(
      { error: 'Failed to update team member' },
      { status: 500 }
    );
  }
}