import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const dynamic = 'force-dynamic';

export default async function LessonPage({
  params,
}: {
  params: { courseSlug: string; lessonSlug: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/login?callbackUrl=/learn/courses/${params.courseSlug}/${params.lessonSlug}`);
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

  const lessonIndex = course.lessons.findIndex((l) => l.slug === params.lessonSlug);
  if (lessonIndex === -1) notFound();

  const lesson = course.lessons[lessonIndex];
  const prevLesson = lessonIndex > 0 ? course.lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < course.lessons.length - 1 ? course.lessons[lessonIndex + 1] : null;

  return (
    <div className="min-h-screen bg-[#030116] text-white">
      {/*
        Site nav is fixed top-0 z-50 h-20 (80px).
        This lesson sub-nav sits fixed at top-20 z-40 h-14 (56px).
        Total fixed area = 144px → main content uses pt-[144px].
      */}
      <div className="fixed top-20 left-0 right-0 z-40 bg-[#030116]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link
            href={`/learn/courses/${course.slug}`}
            className="inline-flex items-center gap-1 text-white/60 hover:text-white text-sm transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{course.title}</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white/80 text-sm truncate flex-1">{lesson.title}</span>
          <span className="text-xs text-white/40 shrink-0">
            {lessonIndex + 1} / {course.lessons.length}
          </span>
        </div>
      </div>

      {/* pt-[144px] = 80px site nav + 64px (h-14=56px lesson nav, rounded up with border) */}
      <div className="flex max-w-5xl mx-auto pt-[144px]">
        {/* Sidebar — lesson list */}
        <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-white/10 min-h-[calc(100vh-144px)] p-6 sticky top-[144px] h-[calc(100vh-144px)] overflow-y-auto">
          <p className="text-xs font-medium text-white/40 uppercase tracking-widest mb-4">
            Course Content
          </p>
          <nav className="space-y-1">
            {course.lessons.map((l, idx) => (
              <Link
                key={l.id}
                href={`/learn/courses/${course.slug}/${l.slug}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  l.slug === params.lessonSlug
                    ? 'bg-white/15 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="truncate">{l.title}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Lesson content */}
        <main className="flex-1 min-w-0 px-6 lg:px-12 py-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2 text-white/40 text-sm">
              <BookOpen className="w-4 h-4" />
              Lesson {lessonIndex + 1} of {course.lessons.length}
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold mb-8">{lesson.title}</h1>

            {/* Markdown content */}
            <div className="prose prose-invert prose-base max-w-none
              prose-headings:font-semibold prose-headings:text-white
              prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-white/10
              prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-white/80 prose-p:leading-relaxed
              prose-strong:text-white
              prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
              prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:text-emerald-300 prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl
              prose-blockquote:border-l-4 prose-blockquote:border-white/30 prose-blockquote:text-white/60 prose-blockquote:not-italic
              prose-li:text-white/80
              prose-hr:border-white/10
              prose-table:text-sm
              prose-thead:border-white/20
              prose-th:text-white prose-th:font-semibold prose-th:bg-white/5 prose-th:px-3 prose-th:py-2
              prose-td:text-white/75 prose-td:px-3 prose-td:py-2 prose-td:border-white/10
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {lesson.content}
              </ReactMarkdown>
            </div>

            {/* Lesson navigation */}
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-white/10">
              {prevLesson ? (
                <Link
                  href={`/learn/courses/${course.slug}/${prevLesson.slug}`}
                  className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <div>
                    <div className="text-xs text-white/40 mb-0.5">Previous</div>
                    <div>{prevLesson.title}</div>
                  </div>
                </Link>
              ) : (
                <div />
              )}

              {nextLesson ? (
                <Link
                  href={`/learn/courses/${course.slug}/${nextLesson.slug}`}
                  className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm text-right"
                >
                  <div>
                    <div className="text-xs text-white/40 mb-0.5">Next</div>
                    <div>{nextLesson.title}</div>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href={`/learn/courses/${course.slug}`}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Course Complete <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
