import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: { email: true, name: true },
  });

  let added = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      await prisma.newsletterSubscriber.upsert({
        where: { email: user.email },
        update: { active: true },
        create: {
          email: user.email,
          name: user.name ?? undefined,
          active: true,
        },
      });
      added++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ success: true, added, skipped, total: users.length });
}
