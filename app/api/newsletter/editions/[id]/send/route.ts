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

    // Fetch live market data once and embed in every email
    const marketData = await fetchMarketSnapshot();

    let sent = 0;
    const errors: string[] = [];

    // Send in batches of 50 to respect rate limits
    const batchSize = 50;
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (sub) => {
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
            await resend.emails.send({
              from: FROM_EMAIL,
              to: sub.email,
              subject: `SGC Daily Snapshot | Issue #${edition.issueNumber}: ${edition.title}`,
              html,
            });
            sent++;
          } catch (err) {
            console.error(`Failed to send to ${sub.email}:`, err);
            errors.push(sub.email);
          }
        })
      );
    }

    await prisma.newsletterEdition.update({
      where: { id: params.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        recipientCount: sent,
      },
    });

    return NextResponse.json({
      success: true,
      sent,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error sending newsletter:', error);
    return NextResponse.json({ error: 'Failed to send newsletter' }, { status: 500 });
  }
}
