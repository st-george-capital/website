import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, GraduationCap } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CourseOverviewPage({
  params,
}: {
  params: { courseSlug: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/login?callbackUrl=/learn/courses/${params.courseSlug}`);
  }

  const course = await prisma.learningCourse.findUnique({
    where: { slug: params.courseSlug },
    include: {
      lessons: {
        where: { published: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!course || !course.published) notFound();

  const tags = course.tags ? course.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-[#030116] text-white">
      {/* Header */}
      <div className="pt-28 pb-12 px-6 max-w-4xl mx-auto">
        <Link
          href="/learn"
          className="inline-flex items-center text-white/60 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Learning Hub
        </Link>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-primary/20">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <span className="text-primary text-sm font-medium uppercase tracking-widest">SGC Course</span>
        </div>

        <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">{course.title}</h1>
        <p className="text-white/70 text-xl mb-6">{course.summary}</p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-white/10 text-white/70 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-white/50 text-sm">
          <BookOpen className="w-4 h-4" />
          {course.lessons.length} lesson{course.lessons.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Lessons */}
      <div className="px-6 pb-20 max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold mb-4 border-b border-white/10 pb-3">Course Content</h2>

        {course.lessons.length === 0 ? (
          <p className="text-white/40 py-8 text-center">No lessons published yet.</p>
        ) : (
          <div className="space-y-2">
            {course.lessons.map((lesson, idx) => (
              <Link
                key={lesson.id}
                href={`/learn/courses/${course.slug}/${lesson.slug}`}
                className="group flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-5 py-4 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                  {idx + 1}
                </div>
                <span className="flex-1 font-medium text-sm">{lesson.title}</span>
                <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
              </Link>
            ))}
          </div>
        )}

        {course.lessons.length > 0 && (
          <div className="mt-8">
            <Link
              href={`/learn/courses/${course.slug}/${course.lessons[0].slug}`}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Start Course <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
