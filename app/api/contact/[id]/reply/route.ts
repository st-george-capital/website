import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

// POST - Reply to a contact submission (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { to, subject, message } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Send reply email
    const emailRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject: subject || 'Re: Your message to St. George Capital',
        html: `
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p><small>This email was sent from St. George Capital</small></p>
          <p><small>Email: outreach@stgeorgecapital.ca</small></p>
        `,
      }),
    });

    if (!emailRes.ok) {
      throw new Error('Failed to send email');
    }

    // Mark submission as read
    await prisma.contactSubmission.update({
      where: { id: params.id },
      data: { status: 'READ' },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reply error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send reply' },
      { status: error.message === 'Unauthorized: Admin access required' ? 403 : 500 }
    );
  }
}

