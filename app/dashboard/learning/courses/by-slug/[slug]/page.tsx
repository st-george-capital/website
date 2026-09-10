import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export default async function CourseBySlug({
  params,
}: {
  params: { slug: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const course = await prisma.learningCourse.findUnique({
    where: { slug: params.slug },
    select: { id: true, published: true },
  });
  if (!course || (!course.published && session.user.role !== "admin"))
    notFound();
  redirect(`/dashboard/learning/courses/${course.id}`);
}
