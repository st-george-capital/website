import { reviewedCourse } from "@/lib/learning/editorial";
import { CourseExperience } from "@/components/learning/course-experience";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: { courseSlug: string; lessonSlug: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(
      `/login?callbackUrl=/learn/courses/${params.courseSlug}/${params.lessonSlug}`,
    );
  }

  const course = await prisma.learningCourse.findUnique({
    where: { slug: params.courseSlug },
    include: {
      lessons: {
        where: { published: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!course || !course.published) notFound();

  const lessonIndex = course.lessons.findIndex(
    (l) => l.slug === params.lessonSlug,
  );
  if (lessonIndex === -1) notFound();

  return (
    <CourseExperience
      course={reviewedCourse(course)}
      publicView
      lessonSlug={params.lessonSlug}
    />
  );
}
