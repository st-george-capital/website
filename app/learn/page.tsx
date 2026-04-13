import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Book, Rss, Youtube, ExternalLink, GraduationCap, ArrowRight, BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

const KIND_META: Record<string, { label: string; Icon: any; color: string }> = {
  book: { label: 'Books', Icon: Book, color: 'bg-amber-100 text-amber-700' },
  newsletter: { label: 'Newsletters', Icon: Rss, color: 'bg-green-100 text-green-700' },
  youtube: { label: 'YouTube', Icon: Youtube, color: 'bg-red-100 text-red-700' },
  external_course: { label: 'External Courses', Icon: ExternalLink, color: 'bg-blue-100 text-blue-700' },
};

const KIND_ORDER = ['book', 'newsletter', 'youtube', 'external_course'];

export default async function LearnPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login?callbackUrl=/learn');
  }

  const [curatedItems, courses] = await Promise.all([
    prisma.learningCuratedItem.findMany({
      where: { published: true },
      orderBy: [{ kind: 'asc' }, { order: 'asc' }],
    }),
    prisma.learningCourse.findMany({
      where: { published: true },
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          where: { published: true },
          orderBy: { order: 'asc' },
          select: { id: true, title: true, slug: true },
        },
      },
    }),
  ]);

  const grouped = KIND_ORDER.reduce<Record<string, typeof curatedItems>>((acc, k) => {
    acc[k] = curatedItems.filter((i) => i.kind === k);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#030116] text-white">
      {/* Hero */}
      <div className="pt-28 pb-16 px-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <GraduationCap className="w-8 h-8 text-primary opacity-80" />
          <span className="text-primary text-sm font-medium uppercase tracking-widest">SGC Members</span>
        </div>
        <h1 className="font-serif text-5xl md:text-6xl font-bold mb-4">Learning Hub</h1>
        <p className="text-white/70 text-xl max-w-2xl">
          Curated resources and SGC-built courses to sharpen your investment thinking.
        </p>
      </div>

      {/* SGC Courses */}
      {courses.length > 0 && (
        <section className="px-6 pb-16 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 border-b border-white/10 pb-3">SGC Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/learn/courses/${course.slug}`}
                className="group block bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-6 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-white/70 transition-colors" />
                </div>
                <h3 className="font-semibold text-lg mb-1">{course.title}</h3>
                <p className="text-white/60 text-sm mb-3 line-clamp-2">{course.summary}</p>
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {course.lessons.length} lesson{course.lessons.length !== 1 ? 's' : ''}
                  </span>
                  {course.tags && <span className="text-primary/60">{course.tags}</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Curated sections */}
      {KIND_ORDER.map((kind) => {
        const items = grouped[kind];
        if (!items || items.length === 0) return null;
        const { label, Icon, color } = KIND_META[kind];

        return (
          <section key={kind} className="px-6 pb-16 max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-3">
              <Icon className="w-5 h-5 text-white/60" />
              <h2 className="text-2xl font-bold">{label}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
                      <Icon className="w-3 h-3" />
                      {label}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors" />
                  </div>
                  <h3 className="font-semibold text-sm mb-0.5">{item.title}</h3>
                  {item.author && (
                    <p className="text-xs text-white/50 mb-1">{item.author}</p>
                  )}
                  {item.description && (
                    <p className="text-xs text-white/60 line-clamp-2">{item.description}</p>
                  )}
                </a>
              ))}
            </div>
          </section>
        );
      })}

      {/* Empty state */}
      {curatedItems.length === 0 && courses.length === 0 && (
        <div className="text-center py-24 text-white/40 px-6">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-xl">Resources coming soon.</p>
          <p className="text-sm mt-2">Admins can add content from the dashboard.</p>
        </div>
      )}
    </div>
  );
}
