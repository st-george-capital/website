import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { buildNewsletterEmail, MarketRow } from '@/lib/newsletter-email';

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXTAUTH_URL || 'https://stgeorgecapital.ca';
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || 'newsletter@stgeorgecapital.ca';

async function fetchMarketSnapshot(): Promise<MarketRow[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/newsletter/market-snapshot`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY is not configured in environment variables.' },
        { status: 500 }
      );
    }

    const edition = await prisma.newsletterEdition.findUnique({
      where: { id: params.id },
    });
    if (!edition) return NextResponse.json({ error: 'Edition not found' }, { status: 404 });
    if (edition.status === 'sent') {
      return NextResponse.json({ error: 'Edition already sent' }, { status: 400 });
    }

    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { active: true },
    });

    if (subscribers.length === 0) {
      return NextResponse.json({ error: 'No active subscribers' }, { status: 400 });
    }

    const dateStr = new Date(edition.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const marketData = await fetchMarketSnapshot();

    let sent = 0;
    const failedEmails: string[] = [];
    const errorDetails: string[] = [];

    for (const sub of subscribers) {
      const unsubscribeUrl = `${BASE_URL}/api/newsletter/subscribe?email=${encodeURIComponent(sub.email)}`;
      const html = buildNewsletterEmail({
        title: edition.title,
        issueNumber: edition.issueNumber,
        date: dateStr,
        rawContent: edition.rawContent,
        unsubscribeUrl,
        marketData,
      });

      try {
        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to: sub.email,
          subject: `SGC Daily Snapshot | Issue #${edition.issueNumber}: ${edition.title}`,
          html,
        });

        // Resend SDK returns { data, error } — check both
        if ((result as any).error) {
          const errMsg = (result as any).error?.message ?? JSON.stringify((result as any).error);
          console.error(`Resend rejected ${sub.email}:`, errMsg);
          failedEmails.push(sub.email);
          errorDetails.push(errMsg);
        } else {
          sent++;
        }
      } catch (err: any) {
        const errMsg = err?.message ?? String(err);
        console.error(`Failed to send to ${sub.email}:`, errMsg);
        failedEmails.push(sub.email);
        errorDetails.push(errMsg);
      }
    }

    // Only mark as sent if at least one email actually went out
    if (sent > 0) {
      await prisma.newsletterEdition.update({
        where: { id: params.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          recipientCount: sent,
        },
      });
    }

    // Surface the first unique error message to the admin
    const uniqueErrors = [...new Set(errorDetails)];
    const firstError = uniqueErrors[0];

    return NextResponse.json({
      success: sent > 0,
      sent,
      failed: failedEmails.length,
      fromEmail: FROM_EMAIL,
      ...(failedEmails.length > 0 && {
        failedEmails,
        errorSample: firstError,
      }),
    });
  } catch (error: any) {
    console.error('Error sending newsletter:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to send newsletter' },
      { status: 500 }
    );
  }
}
