import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }
  return session;
}

export function isAdmin(session: any) {
  return session?.user?.role === 'admin';
}

export function canEdit(session: any) {
  return session?.user?.role === 'admin' || session?.user?.role === 'editor';
}
