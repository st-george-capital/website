import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: list constraint sets (viewable by all authenticated users, per plan Section 9 —
// "Admin-only to edit, viewable by all authenticated users").
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const constraintSets = await prisma.optimizationConstraintSet.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ constraintSets });
  } catch (error) {
    console.error('CVaR optimizer constraints GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch constraint sets' }, { status: 500 });
  }
}

// POST: create a new constraint set (admin-only).
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      isActive,
      sectorLimits,
      regionLimits,
      factorTilts,
      maxSinglePositionWeight,
      turnoverLimit,
      cvarConfidence,
      cvarHorizonDays,
    } = body;

    if (!name || !sectorLimits || !regionLimits || !factorTilts) {
      return NextResponse.json(
        { error: 'name, sectorLimits, regionLimits, and factorTilts are required' },
        { status: 400 }
      );
    }

    // If this set is being marked active, deactivate any other active sets so
    // "the active constraint set" (used by /run) is always unambiguous.
    if (isActive !== false) {
      await prisma.optimizationConstraintSet.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const constraintSet = await prisma.optimizationConstraintSet.create({
      data: {
        name,
        isActive: isActive !== false,
        sectorLimits,
        regionLimits,
        factorTilts,
        maxSinglePositionWeight: typeof maxSinglePositionWeight === 'number' ? maxSinglePositionWeight : 0.15,
        turnoverLimit: typeof turnoverLimit === 'number' ? turnoverLimit : null,
        cvarConfidence: typeof cvarConfidence === 'number' ? cvarConfidence : 0.95,
        cvarHorizonDays: typeof cvarHorizonDays === 'number' ? cvarHorizonDays : 20,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(constraintSet, { status: 201 });
  } catch (error) {
    console.error('CVaR optimizer constraints POST error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to create constraint set', detail: message }, { status: 500 });
  }
}

// PATCH: update an existing constraint set (admin-only). Body must include `id`.
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await prisma.optimizationConstraintSet.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Constraint set not found' }, { status: 404 });
    }

    if (updates.isActive === true) {
      await prisma.optimizationConstraintSet.updateMany({
        where: { isActive: true, id: { not: id } },
        data: { isActive: false },
      });
    }

    const allowedFields = [
      'name',
      'isActive',
      'sectorLimits',
      'regionLimits',
      'factorTilts',
      'maxSinglePositionWeight',
      'turnoverLimit',
      'cvarConfidence',
      'cvarHorizonDays',
    ];
    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in updates) data[field] = updates[field];
    }

    const constraintSet = await prisma.optimizationConstraintSet.update({
      where: { id },
      data: data as Prisma.OptimizationConstraintSetUpdateInput,
    });

    return NextResponse.json(constraintSet);
  } catch (error) {
    console.error('CVaR optimizer constraints PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update constraint set' }, { status: 500 });
  }
}
