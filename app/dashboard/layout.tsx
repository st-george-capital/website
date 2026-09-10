"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { DashboardLoadingState } from "@/components/dashboard-state";
import { DashboardHelpButton } from "@/components/dashboard-help";
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
  Calendar,
  BookOpen,
  Presentation,
  Calculator,
  Target,
  BookMarked,
  Newspaper,
  Megaphone,
  GraduationCap,
  FlaskConical,
} from "lucide-react";

const navigation: Array<{
  name: string;
  href: string;
  icon: any;
  adminOnly?: boolean;
  userMinRole?: "user" | "admin"; // Minimum role required to access
}> = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Research Reports",
    href: "/dashboard/research",
    icon: FileText,
    userMinRole: "user",
  },
  {
    name: "Articles",
    href: "/dashboard/articles",
    icon: FileText,
    userMinRole: "user",
  },
  {
    name: "Investments",
    href: "/dashboard/investments",
    icon: BarChart3,
    userMinRole: "user",
  },
  {
    name: "Strategy",
    href: "/dashboard/strategy",
    icon: BarChart3,
    userMinRole: "user",
  },
  {
    name: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
    userMinRole: "user",
  },
  {
    name: "Weekly Content",
    href: "/dashboard/weekly",
    icon: BookOpen,
    userMinRole: "user",
  },
  {
    name: "Investment Pitches",
    href: "/dashboard/pitches",
    icon: Presentation,
    userMinRole: "user",
  },
  {
    name: "Postings",
    href: "/dashboard/postings",
    icon: Briefcase,
    adminOnly: true,
  },
  {
    name: "Resume Book",
    href: "/dashboard/resume-book",
    icon: BookMarked,
    adminOnly: true,
  },
  {
    name: "Newsletter",
    href: "/dashboard/newsletter",
    icon: Newspaper,
    adminOnly: true,
  },
  {
    name: "Marketing Studio",
    href: "/dashboard/tools/marketing",
    icon: Megaphone,
    adminOnly: true,
  },
  {
    name: "Workshop",
    href: "/dashboard/workshop",
    icon: FlaskConical,
    userMinRole: "user",
  },
  {
    name: "SGC Courses",
    href: "/dashboard/learning/courses",
    icon: GraduationCap,
    userMinRole: "user",
  },
  {
    name: "Resource Library",
    href: "/dashboard/learning/curated",
    icon: BookOpen,
    userMinRole: "user",
  },
  {
    name: "Learning Hub",
    href: "/dashboard/learning",
    icon: GraduationCap,
    userMinRole: "user",
  },
  {
    name: "Tools",
    href: "/dashboard/tools",
    icon: Calculator,
    userMinRole: "user",
  },
  { name: "Users", href: "/dashboard/users", icon: Users, adminOnly: true },
  {
    name: "Holdings",
    href: "/dashboard/holdings",
    icon: BarChart3,
    userMinRole: "user",
  },
  { name: "Team", href: "/dashboard/team", icon: Users, userMinRole: "user" },
  {
    name: "Contact Forms",
    href: "/dashboard/contact",
    icon: Mail,
    adminOnly: true,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    adminOnly: true,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const activeItem = [...navigation]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (item) =>
        pathname === item.href ||
        (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")),
    );

  useEffect(() => {
    if (!sidebarOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", close);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg">
          <DashboardLoadingState
            compact
            label="Signing you in"
            description="Restoring your dashboard and permissions."
          />
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="dashboard-shell min-h-screen">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="dashboard-sidebar"
        className={`dashboard-sidebar fixed top-0 left-0 z-50 h-full w-64 bg-[#030116] text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <span className="text-2xl font-bold">SGC</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/60">
                Workspace
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
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
                <p className="text-sm font-medium">
                  {session.user.name || session.user.email}
                </p>
                <p className="text-xs text-white/60 capitalize">
                  {session.user.role}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav
            aria-label="Workspace navigation"
            className="dashboard-navigation flex-1 p-4 space-y-1 overflow-y-auto"
          >
            {[
              { title: "", paths: ["/dashboard"] },
              {
                title: "Research",
                paths: [
                  "/dashboard/research",
                  "/dashboard/articles",
                  "/dashboard/pitches",
                  "/dashboard/weekly",
                  "/dashboard/strategy",
                ],
              },
              {
                title: "Markets & tools",
                paths: [
                  "/dashboard/tools",
                  "/dashboard/investments",
                  "/dashboard/holdings",
                ],
              },
              {
                title: "Learning & projects",
                paths: [
                  "/dashboard/learning/courses",
                  "/dashboard/workshop",
                  "/dashboard/learning/curated",
                ],
              },
              {
                title: "Organisation",
                paths: ["/dashboard/calendar", "/dashboard/team"],
              },
              {
                title: "Administration",
                paths: [
                  "/dashboard/postings",
                  "/dashboard/resume-book",
                  "/dashboard/newsletter",
                  "/dashboard/tools/marketing",
                  "/dashboard/users",
                  "/dashboard/contact",
                  "/dashboard/settings",
                ],
              },
            ].map((group) => {
              const items = group.paths
                .map((path) => navigation.find((item) => item.href === path)!)
                .filter(
                  (item) =>
                    (!item.adminOnly || session.user.role === "admin") &&
                    (!item.userMinRole ||
                      ["user", "admin"].includes(session.user.role)),
                );
              if (!items.length) return null;
              return (
                <section
                  className="workspace-nav-group"
                  aria-label={group.title || "Overview"}
                  key={group.title}
                >
                  {group.title && <h2>{group.title}</h2>}
                  {items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      aria-current={
                        activeItem?.href === item.href ? "page" : undefined
                      }
                      className="dashboard-nav-link flex items-center space-x-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <item.icon size={17} />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </section>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
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
        <header className="dashboard-topbar bg-white border-b border-border sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              aria-label="Open navigation"
              aria-controls="dashboard-sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              <Menu size={24} />
            </button>
            <div className="hidden sm:block text-sm font-medium text-[#172f50]">
              {activeItem?.name || "Workspace"}
            </div>
            <div className="flex items-center space-x-4">
              <DashboardHelpButton topic="content" compact />
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
        <main
          className={`dashboard-main ${pathname.startsWith("/dashboard/tools/") ? "tool-workspace" : ""}`}
        >
          <motion.div
            key={pathname}
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={{
              duration: reducedMotion ? 0 : 0.18,
              ease: "easeOut",
            }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
