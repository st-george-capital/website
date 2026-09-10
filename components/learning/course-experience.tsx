"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  BookOpen,
  Clock,
  Settings2,
} from "lucide-react";
import { curriculum } from "@/lib/learning/curriculum";
import {
  readingMinutes,
  lessonExcerpt,
  type LearningCourse,
} from "@/lib/learning/types";
import { LessonContent } from "./lesson-content";
import { CourseWorkshop } from "./course-workshop";
import { CourseLab } from "./course-lab";

export function CourseExperience({
  course,
  lessonSlug,
  workshop = false,
  publicView = false,
}: {
  course: LearningCourse;
  lessonSlug?: string;
  workshop?: boolean;
  publicView?: boolean;
}) {
  const { data: session } = useSession();
  const [completed, setCompleted] = useState<string[]>([]);
  const [last, setLast] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [progressNote, setProgressNote] = useState("");
  const guide = curriculum[course.slug];
  const lessons = [...course.lessons].sort((a, b) => a.order - b.order);
  const base = publicView
    ? `/learn/courses/${course.slug}`
    : `/dashboard/learning/courses/${course.id}`;
  const href = (slug: string) =>
    slug === "workshop"
      ? `${base}?workshop=1`
      : publicView
        ? `${base}/${slug}`
        : `${base}?lesson=${slug}`;
  const ids = [...lessons.map((l) => l.slug), ...(guide ? ["workshop"] : [])];
  const active = workshop ? "workshop" : lessonSlug || "";
  const index = ids.indexOf(active);
  const lesson = lessons.find((l) => l.slug === active);
  const storageKey = session?.user?.id
    ? `sgc-course:${session.user.id}:${course.id}`
    : null;
  useEffect(() => {
    setStorageReady(false);
    setCompleted([]);
    setLast("");
    if (!storageKey) return;
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) || "{}");
      setCompleted(
        Array.isArray(data.completed)
          ? data.completed.filter((id: string) => ids.includes(id))
          : [],
      );
      setLast(ids.includes(data.last) ? data.last : "");
    } catch {
      setProgressNote("Progress could not be restored on this browser.");
    }
    setStorageReady(true);
  }, [storageKey]);
  useEffect(() => {
    if (!storageKey || !storageReady || !active || index < 0) return;
    setLast(active);
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ completed, last: active }),
      );
    } catch {
      setProgressNote(
        "Browser storage is unavailable; progress will last for this visit.",
      );
    }
  }, [active, storageReady, storageKey]);
  const toggle = () => {
    const next = completed.includes(active)
      ? completed.filter((x) => x !== active)
      : [...completed, active];
    setCompleted(next);
    if (storageKey)
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ completed: next, last: active }),
        );
      } catch {
        setProgressNote(
          "Browser storage is unavailable; progress will last for this visit.",
        );
      }
  };
  const totalMinutes =
    lessons.reduce((sum, l) => sum + readingMinutes(l.content), 0) +
    (guide ? 15 : 0);
  const resume = last || ids.find((id) => !completed.includes(id)) || ids[0];
  const title = workshop ? guide?.title : lesson?.title;
  const inlineLab = [
    "four-basic-positions",
    "valuation-methods",
    "price-vs-yield",
    "currency-pairs",
    "order-books-price-discovery",
    "business-cycles-asset-classes",
  ].includes(active);
  return (
    <div className={`course-experience ${publicView ? "course-public" : ""}`}>
      <div className="course-breadcrumb">
        <Link href={active ? base : "/dashboard/learning/courses"}>
          <ArrowLeft size={14} />
          {active ? course.title : "All courses"}
        </Link>
        {session?.user.role === "admin" && (
          <Link href={`/dashboard/learning/courses/${course.id}?manage=1`}>
            <Settings2 size={14} />
            Manage course
          </Link>
        )}
      </div>
      {!active ? (
        <>
          <header className="course-hero">
            <div className="course-eyebrow">
              SGC Academy / {guide?.track || "Member education"}
            </div>
            <h1>{course.title}</h1>
            <p>{course.summary}</p>
            <div className="course-meta">
              <span>
                <BookOpen size={15} />
                {lessons.length} lessons{guide ? " + workshop" : ""}
              </span>
              <span>
                <Clock size={15} />
                {totalMinutes} min estimated
              </span>
              <span>{guide?.level || "Self-paced"}</span>
              {!course.published && <span>Draft preview</span>}
            </div>
            {resume && (
              <Link className="course-primary" href={href(resume)}>
                {last ? "Continue learning" : "Start course"}
                <ArrowRight size={16} />
              </Link>
            )}
          </header>
          <div className="course-overview-grid">
            <div>
              <section className="course-outcomes">
                <div className="course-eyebrow">The goal</div>
                <h2>What you’ll be able to do</h2>
                <ul>
                  {(
                    guide?.outcomes || [
                      "Understand the core concepts in this course.",
                      "Apply the ideas to your own research.",
                    ]
                  ).map((o) => (
                    <li key={o}>
                      <Check size={16} />
                      {o}
                    </li>
                  ))}
                </ul>
                {guide && (
                  <p>
                    <strong>Before you begin:</strong> {guide.prerequisites}
                  </p>
                )}
              </section>
              <section className="course-syllabus">
                <div className="course-section-heading">
                  <h2>Your syllabus</h2>
                  <span>
                    {completed.length} / {ids.length} completed
                  </span>
                </div>
                {lessons.map((l, i) => (
                  <Link
                    key={l.id}
                    href={href(l.slug)}
                    className="course-syllabus-row"
                  >
                    <span className="course-lesson-number">
                      {completed.includes(l.slug) ? (
                        <Check size={16} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <div>
                      <h3>
                        {l.title}
                        {!l.published && <small> · Draft</small>}
                      </h3>
                      <p>{lessonExcerpt(l.content).slice(0, 130)}</p>
                    </div>
                    <span className="course-read-time">
                      {readingMinutes(l.content)} min
                    </span>
                    <ArrowRight size={16} />
                  </Link>
                ))}
                {guide && (
                  <Link
                    className="course-syllabus-row course-workshop-row"
                    href={href("workshop")}
                  >
                    <span className="course-lesson-number">
                      {completed.includes("workshop") ? (
                        <Check size={16} />
                      ) : (
                        String(ids.length).padStart(2, "0")
                      )}
                    </span>
                    <div>
                      <h3>Applied workshop</h3>
                      <p>{guide.title}</p>
                    </div>
                    <span className="course-read-time">15 min</span>
                    <ArrowRight size={16} />
                  </Link>
                )}
                {!ids.length && (
                  <p>Lessons are being prepared for this course.</p>
                )}
              </section>
            </div>
            <aside className="course-overview-aside">
              <div className="course-eyebrow">Learn → test → apply</div>
              <h3>Build something you can defend.</h3>
              <p>
                {guide?.deliverable ||
                  "Work through each lesson and record the assumptions behind your conclusions."}
              </p>
              <div className="course-progress">
                <span
                  style={{
                    width: `${ids.length ? (completed.length / ids.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <small>Progress is saved on this browser for your account.</small>
              {progressNote && <p role="status">{progressNote}</p>}
            </aside>
          </div>
        </>
      ) : index < 0 || (!lesson && !guide) ? (
        <div className="course-empty">
          <h1>Lesson not found</h1>
          <Link href={base}>Return to the syllabus</Link>
        </div>
      ) : (
        <div className="course-reader-grid">
          <aside className="course-reader-sidebar">
            <div className="course-eyebrow">Course content</div>
            <nav aria-label="Course lessons">
              {ids.map((id, i) => (
                <Link
                  key={id}
                  href={href(id)}
                  aria-current={active === id ? "page" : undefined}
                >
                  <span>
                    {completed.includes(id) ? (
                      <Check size={14} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  {id === "workshop"
                    ? "Applied workshop"
                    : lessons.find((l) => l.slug === id)?.title}
                </Link>
              ))}
            </nav>
            <small>
              {completed.length} of {ids.length} completed
            </small>
            <div className="course-progress">
              <span
                style={{ width: `${(completed.length / ids.length) * 100}%` }}
              />
            </div>
          </aside>
          <article className="course-reading">
            <header>
              <div className="course-eyebrow">
                {workshop ? "Applied workshop" : `Lesson ${index + 1}`} /{" "}
                {ids.length} · {workshop ? 15 : readingMinutes(lesson!.content)}{" "}
                min
              </div>
              <h1>{title}</h1>
            </header>
            {workshop && guide ? (
              <CourseWorkshop key={course.slug} workshop={guide} />
            ) : (
              <>
                <LessonContent content={lesson!.content} />
                {inlineLab && guide && (
                  <div className="course-inline-lab">
                    <CourseLab key={active} workshop={guide} />
                    <Link href={href("workshop")}>
                      Continue to the worked case and knowledge check →
                    </Link>
                  </div>
                )}
              </>
            )}
            <footer className="course-lesson-footer">
              <button
                className="course-primary"
                onClick={toggle}
                disabled={!storageReady}
              >
                <Check size={16} />
                {completed.includes(active)
                  ? "Completed — undo"
                  : "Mark as complete"}
              </button>
              <p>
                {progressNote ||
                  "Progress is saved on this browser for your account."}
              </p>
              <div className="course-next-prev">
                {index > 0 ? (
                  <Link href={href(ids[index - 1])}>
                    <ArrowLeft size={15} />
                    Previous
                  </Link>
                ) : (
                  <span />
                )}
                {index < ids.length - 1 ? (
                  <Link href={href(ids[index + 1])}>
                    Next:{" "}
                    {ids[index + 1] === "workshop"
                      ? "Workshop"
                      : lessons[index + 1]?.title}
                    <ArrowRight size={15} />
                  </Link>
                ) : (
                  <Link href={base}>
                    Back to syllabus
                    <ArrowRight size={15} />
                  </Link>
                )}
              </div>
            </footer>
          </article>
        </div>
      )}
    </div>
  );
}
