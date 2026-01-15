import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Only return published job postings that haven't expired
    const jobPostings = await prisma.jobPosting.findMany({
      where: {
        published: true,
        endDate: {
          gte: new Date(), // Only show postings that haven't expired
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(jobPostings);
  } catch (error) {
    console.error('Error fetching public job postings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job postings' },
      { status: 500 }
    );
  }
}