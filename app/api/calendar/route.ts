import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const category = searchParams.get('category');

    let whereClause: any = {};

    // Date range filter
    if (start && end) {
      whereClause.startDate = {
        gte: new Date(start),
        lte: new Date(end),
      };
    }

    // Category filter
    if (category && category !== 'all') {
      whereClause.category = category;
    }

    const events = await prisma.calendarEvent.findMany({
      where: whereClause,
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin' && session.user.role !== 'editor') {
      return NextResponse.json({ error: 'Unauthorized - Editor access required' }, { status: 401 });
    }

    const data = await request.json();

    const event = await prisma.calendarEvent.create({
      data: {
        title: data.title,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        allDay: data.allDay || false,
        location: data.location,
        category: data.category,
        subcategory: data.subcategory,
        priority: data.priority || 'medium',
        status: data.status || 'scheduled',
        attendees: data.attendees,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
