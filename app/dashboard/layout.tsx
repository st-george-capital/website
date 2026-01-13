'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Briefcase,
  Mail,
  BarChart3,
} from 'lucide-react';

const navigation: Array<{
  name: string;
  href: string;
  icon: any;
  adminOnly?: boolean;
}> = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Articles', href: '/dashboard/articles', icon: FileText },
  { name: 'Investments', href: '/dashboard/investments', icon: BarChart3 },
  { name: 'Holdings', href: '/dashboard/holdings', icon: Briefcase },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Contact Forms', href: '/dashboard/contact', icon: Mail },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, adminOnly: true },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#030116] text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <span className="text-2xl font-bold">SGC</span>
              <span className="text-xs text-white/60">Dashboard</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white/60 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">
                  {session.user.email?.[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{session.user.name || session.user.email}</p>
                <p className="text-xs text-white/60 capitalize">{session.user.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              // Hide admin-only items from non-admins
              if (item.adminOnly && session.user.role !== 'admin') {
                return null;
              }
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center space-x-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <item.icon size={20} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center space-x-3 px-4 py-3 w-full text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="bg-white border-b border-border sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                View Public Site →
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

