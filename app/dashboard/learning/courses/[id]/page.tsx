"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import CourseManager from "@/components/learning/course-manager";
import { CourseExperience } from "@/components/learning/course-experience";
import { DashboardLoadError } from "@/components/dashboard-load-error";
import type { LearningCourse } from "@/lib/learning/types";
export default function CoursePage({ params }: { params: { id: string } }) {
  const search = useSearchParams();
  const { data: session } = useSession();
  const [course, setCourse] = useState<LearningCourse | null>(null);
  const [error, setError] = useState(false);
  const load = async () => {
    setError(false);
    try {
      const r = await fetch(`/api/learning/courses/${params.id}`);
      if (!r.ok) throw new Error();
      setCourse(await r.json());
    } catch {
      setError(true);
    }
  };
  useEffect(() => {
    load();
  }, [params.id]);
  if (
    session?.user.role === "admin" &&
    (search.has("manage") || search.has("edit"))
  )
    return <CourseManager params={params} />;
  if (error) return <DashboardLoadError onRetry={load} />;
  if (!course) return <p className="p-8 text-slate-500">Loading course…</p>;
  return (
    <CourseExperience
      key={course.id}
      course={course}
      lessonSlug={search.get("lesson") || undefined}
      workshop={search.has("workshop")}
    />
  );
}
