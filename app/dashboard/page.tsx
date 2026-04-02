'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Calendar, MapPin, Globe, TrendingUp, FileText, Users,
  BarChart3, BookOpen, Presentation, Calculator, Briefcase,
  BookMarked, Newspaper, Mail, Settings, ChevronRight, Clock, Brain, MessageSquareText,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  location?: string;
  category: string;
  allDay: boolean;
}

interface Quote {
  quote: string;
  author: string;
}

interface FinanceTerm {
  term: string;
  definition: string;
  category: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(name: string) {
  const h = new Date().getHours();
  const salutation = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${salutation}, ${name}`;
}

function formatEventDate(iso: string, allDay: boolean): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short', month: 'short', day: 'numeric',
  };
  if (!allDay) {
    return d.toLocaleString('en-US', { ...opts, hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return d.toLocaleDateString('en-US', opts);
}

function daysUntil(iso: string): string {
  const now = new Date();
  const d = new Date(iso);
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7) return `In ${diff} days`;
  return `In ${Math.ceil(diff / 7)} week${Math.ceil(diff / 7) > 1 ? 's' : ''}`;
}

// ─── Nav cards config ─────────────────────────────────────────────────────────

const NAV_ITEMS: {
  label: string;
  desc: string;
  href: string;
  icon: React.ElementType;
  color: string;
  adminOnly?: boolean;
}[] = [
  { label: 'Articles',          desc: 'Research & publications',    href: '/dashboard/articles',      icon: FileText,      color: 'bg-blue-50 text-blue-600' },
  { label: 'Investments',       desc: 'Portfolio & deal flow',      href: '/dashboard/investments',   icon: TrendingUp,    color: 'bg-emerald-50 text-emerald-600' },
  { label: 'Calendar',          desc: 'Events & meeting schedule',  href: '/dashboard/calendar',      icon: Calendar,      color: 'bg-violet-50 text-violet-600' },
  { label: 'Weekly Content',    desc: 'Weekly briefings',           href: '/dashboard/weekly',        icon: BookOpen,      color: 'bg-sky-50 text-sky-600' },
  { label: 'Investment Pitches',desc: 'Pitch decks & memos',        href: '/dashboard/pitches',       icon: Presentation,  color: 'bg-amber-50 text-amber-600' },
  { label: 'Holdings',          desc: 'Current portfolio',          href: '/dashboard/holdings',      icon: BarChart3,     color: 'bg-indigo-50 text-indigo-600' },
  { label: 'Strategy',          desc: 'Documents & frameworks',     href: '/dashboard/strategy',      icon: FileText,      color: 'bg-teal-50 text-teal-600' },
  { label: 'Team',              desc: 'Member directory',           href: '/dashboard/team',          icon: Users,         color: 'bg-pink-50 text-pink-600' },
  { label: 'Tools',             desc: 'Capital flows & analytics',  href: '/dashboard/tools',         icon: Calculator,    color: 'bg-gray-100 text-gray-600' },
  { label: 'Postings',          desc: 'Job & internship listings',  href: '/dashboard/postings',      icon: Briefcase,     color: 'bg-orange-50 text-orange-600', adminOnly: true },
  { label: 'Resume Book',       desc: 'Member resumes',             href: '/dashboard/resume-book',   icon: BookMarked,    color: 'bg-rose-50 text-rose-600',    adminOnly: true },
  { label: 'Newsletter',        desc: 'Email broadcasts',           href: '/dashboard/newsletter',    icon: Newspaper,     color: 'bg-lime-50 text-lime-600',    adminOnly: true },
  { label: 'Contact Forms',     desc: 'Incoming enquiries',         href: '/dashboard/contact',       icon: Mail,          color: 'bg-cyan-50 text-cyan-600' },
  { label: 'Settings',          desc: 'Platform configuration',     href: '/dashboard/settings',      icon: Settings,      color: 'bg-gray-100 text-gray-500',   adminOnly: true },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.04]"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
        </pattern>
        <pattern id="dots" width="64" height="64" patternUnits="userSpaceOnUse">
          <circle cx="32" cy="32" r="1.5" fill="white" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  );
}

function SGCMark() {
  return (
    <div className="hidden sm:flex flex-col items-end gap-1 opacity-20 select-none">
      <div className="flex gap-1">
        {[3, 6, 4, 8, 5, 7, 3, 6].map((h, i) => (
          <div key={i} className="w-1.5 rounded-sm bg-white" style={{ height: `${h * 4}px` }} />
        ))}
      </div>
      <div className="flex gap-1">
        {[5, 3, 7, 4, 8, 5, 6, 4].map((h, i) => (
          <div key={i} className="w-1.5 rounded-sm bg-white/60" style={{ height: `${h * 3}px` }} />
        ))}
      </div>
    </div>
  );
}

function NextMeetingCard({ event, loading }: { event: CalendarEvent | null; loading: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
        <Calendar size={12} />
        Next Meeting
      </div>
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-100 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      ) : event ? (
        <>
          <div>
            <div className="font-semibold text-gray-900 text-sm leading-snug mb-1">{event.title}</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock size={11} />
              {formatEventDate(event.startDate, event.allDay)}
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                <MapPin size={11} />
                {event.location}
              </div>
            )}
          </div>
          <div className="mt-auto">
            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
              {daysUntil(event.startDate)}
            </span>
          </div>
        </>
      ) : (
        <div className="text-sm text-gray-400">No upcoming meetings scheduled.</div>
      )}
      <Link href="/dashboard/calendar" className="text-[11px] font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1 mt-auto">
        View calendar <ChevronRight size={11} />
      </Link>
    </div>
  );
}

function QuoteCard({ quote, loading }: { quote: Quote | null; loading: boolean }) {
  return (
    <div className="bg-[#030116] rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden">
      <HeroPattern />
      <div className="relative z-10 flex items-center gap-2 text-[11px] font-semibold text-white/40 uppercase tracking-widest">
        <span className="text-lg leading-none">&ldquo;</span>
        Quote of the Day
      </div>
      {loading ? (
        <div className="animate-pulse space-y-2 relative z-10">
          <div className="h-3 bg-white/10 rounded w-full" />
          <div className="h-3 bg-white/10 rounded w-4/5" />
          <div className="h-3 bg-white/10 rounded w-2/3" />
        </div>
      ) : quote ? (
        <div className="relative z-10 flex-1 flex flex-col justify-between gap-3">
          <p className="text-white/90 text-sm leading-relaxed italic">{quote.quote}</p>
          <p className="text-white/40 text-xs font-medium">— {quote.author}</p>
        </div>
      ) : null}
    </div>
  );
}

function FinanceTermCard({ term, loading }: { term: FinanceTerm | null; loading: boolean }) {
  return (
    <div className="bg-[#0c1a3a] rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden">
      <HeroPattern />
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-white/40 uppercase tracking-widest">
          <BookOpen size={12} />
          Term of the Day
        </div>
        {term && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/40 uppercase tracking-wide">
            {term.category}
          </span>
        )}
      </div>
      {loading ? (
        <div className="animate-pulse space-y-2 relative z-10">
          <div className="h-4 bg-white/10 rounded w-2/3" />
          <div className="h-3 bg-white/10 rounded w-full" />
          <div className="h-3 bg-white/10 rounded w-4/5" />
        </div>
      ) : term ? (
        <div className="relative z-10 flex-1 flex flex-col gap-2">
          <p className="text-white font-semibold text-base leading-snug">{term.term}</p>
          <p className="text-white/60 text-xs leading-relaxed">{term.definition}</p>
        </div>
      ) : null}
    </div>
  );
}

function ToolsCard() {
  const tools = [
    { label: 'Capital Flows', desc: 'ETF regime · pair ratios · macro', href: '/dashboard/flows', icon: TrendingUp },
    { label: 'Country Health', desc: '24-country macro scoring', href: '/dashboard/country-health', icon: Globe },
    { label: 'Interview Tool', desc: 'Question bank · quiz mode · submissions', href: '/dashboard/tools/interview', icon: Brain },
    { label: 'Sentiment Tool', desc: 'Live news sentiment · memo view', href: '/dashboard/tools/sentiment', icon: MessageSquareText },
  ];
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
        <BarChart3 size={12} />
        Market Tools
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {tools.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
          >
            <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0 group-hover:border-gray-300 transition-colors">
              <t.icon size={14} className="text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-800">{t.label}</div>
              <div className="text-[10px] text-gray-400 truncate">{t.desc}</div>
            </div>
            <ChevronRight size={12} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const [nextMeeting, setNextMeeting] = useState<CalendarEvent | null>(null);
  const [meetingLoading, setMeetingLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [financeTerm, setFinanceTerm] = useState<FinanceTerm | null>(null);
  const [financeTermLoading, setFinanceTermLoading] = useState(true);

  const firstName = session?.user?.name?.split(' ')[0] ?? 'there';
  const isAdmin = session?.user?.role === 'admin';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  useEffect(() => {
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    fetch(`/api/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
      .then(r => r.ok ? r.json() : [])
      .then((events: CalendarEvent[]) => {
        const upcoming = events
          .filter(e => new Date(e.startDate) > new Date())
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        setNextMeeting(upcoming[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setMeetingLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/dashboard/quote')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.quote) setQuote(data); })
      .catch(() => {})
      .finally(() => setQuoteLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/dashboard/finance-term')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.term) setFinanceTerm(data); })
      .catch(() => {})
      .finally(() => setFinanceTermLoading(false));
  }, []);

  if (session?.user?.role === 'visitor') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 bg-[#030116]/10 rounded-full flex items-center justify-center mx-auto mb-5">
          <Users className="w-7 h-7 text-[#030116]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Welcome to SGC</h1>
        <p className="text-sm text-gray-500 max-w-sm">
          Your account is currently set to visitor status. Contact an administrator to gain full access.
        </p>
      </div>
    );
  }

  const visibleNav = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="space-y-8">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative bg-[#030116] rounded-2xl overflow-hidden px-8 py-8">
        <HeroPattern />
        <div className="relative z-10 flex items-start justify-between gap-6">
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2">
              St. George Capital
            </p>
            <h1 className="text-3xl font-bold text-white mb-1">
              {getGreeting(firstName)}
            </h1>
            <p className="text-white/40 text-sm">{today}</p>
            <span className="inline-flex mt-4 items-center text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white/60 capitalize">
              {session?.user?.role ?? 'Member'} access
            </span>
          </div>
          <SGCMark />
        </div>
      </div>

      {/* ── Spotlight row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <NextMeetingCard event={nextMeeting} loading={meetingLoading} />
        <QuoteCard quote={quote} loading={quoteLoading} />
        <FinanceTermCard term={financeTerm} loading={financeTermLoading} />
        <ToolsCard />
      </div>

      {/* ── Navigation grid ───────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {visibleNav.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
                <item.icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 group-hover:text-gray-900 truncate">
                  {item.label}
                </div>
                <div className="text-[10px] text-gray-400 truncate">{item.desc}</div>
              </div>
              <ChevronRight size={12} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
