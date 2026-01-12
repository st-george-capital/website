import { NextRequest, NextResponse } from 'next/server';

// Simple email sending endpoint
// In production, you'd use a service like SendGrid, AWS SES, or Resend
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For now, just log the email (you'll need to set up an email service)
    console.log('📧 Email to send:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body:', html);

    // TODO: Implement actual email sending
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'outreach@stgeorgecapital.ca',
    //   to,
    //   subject,
    //   html,
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

