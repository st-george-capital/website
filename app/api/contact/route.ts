import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';
import { requireAdmin } from '@/lib/auth';

// GET - Fetch all contact submissions (admin only)
export async function GET() {
  try {
    await requireAdmin();

    const submissions = await prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(submissions);
  } catch (error: any) {
    console.error('Get submissions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch submissions' },
      { status: error.message === 'Unauthorized: Admin access required' ? 403 : 500 }
    );
  }
}

// POST - Create new contact submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, message } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Save to database
    const submission = await prisma.contactSubmission.create({
      data: {
        firstName,
        lastName,
        email,
        message,
        status: 'NEW',
      },
    });

    // Send email notification to outreach@stgeorgecapital.ca
    try {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'outreach@stgeorgecapital.ca',
          subject: `New Contact Form Submission from ${firstName} ${lastName}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>From:</strong> ${firstName} ${lastName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p><small>View all submissions in the <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/contact">dashboard</a></small></p>
          `,
        }),
      });
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the submission if email fails
    }

    return NextResponse.json(
      { success: true, id: submission.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    );
  }
}
