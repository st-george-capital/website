import { reviewedCourse } from "@/lib/learning/editorial";
import { CourseExperience } from "@/components/learning/course-experience";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CourseOverviewPage({
  params,
  searchParams,
}: {
  params: { courseSlug: string };
  searchParams: { workshop?: string };
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
        orderBy: { order: "asc" },
      },
    },
  });

  if (!course || !course.published) notFound();

  const tags = course.tags
    ? course.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return (
    <CourseExperience
      course={reviewedCourse(course)}
      publicView
      workshop={searchParams.workshop === "1"}
    />
  );
}
