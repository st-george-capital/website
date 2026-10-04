import { prisma } from '@/lib/prisma';
import type { ToolContext } from '@/lib/consigliere/tools/context';

/** Member-scoped tools (saved DCF models, draft reports) need a real member; smoke runs as the first admin. */
export async function smokeContext(): Promise<ToolContext> {
  const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true, role: true } });
  if (!admin) throw new Error('No admin user in the database to run member-scoped tools as.');
  return { userId: admin.id, role: admin.role };
}
