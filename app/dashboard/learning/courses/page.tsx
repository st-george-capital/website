"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, BookOpen, Search, Plus } from "lucide-react";
import { DashboardLoadError } from "@/components/dashboard-load-error";
import { curriculum } from "@/lib/learning/curriculum";
interface Course {
  id: string;
  title: string;
  slug: string;
  summary: string;
  tags: string;
  published: boolean;
  lessons?: { id: string; published: boolean }[];
}
export default function CoursesPage() {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<Course[]>([]),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState(""),
    [track, setTrack] = useState("All");
  const load = async () => {
    setLoadError(false);
    setLoading(true);
    try {
      const r = await fetch("/api/learning/courses?lessons=true");
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (!Array.isArray(d)) throw new Error();
      setCourses(d);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const tracks = [
    "All",
    ...Array.from(
      new Set(courses.map((c) => curriculum[c.slug]?.track || "General")),
    ),
  ];
  const filtered = courses.filter(
    (c) =>
      (track === "All" || (curriculum[c.slug]?.track || "General") === track) &&
      `${c.title} ${c.summary} ${c.tags}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (loadError) return <DashboardLoadError onRetry={load} />;
  return (
    <div className="course-library">
      <header className="course-library-header">
        <div>
          <div className="course-eyebrow">SGC Academy</div>
          <h1>
            Learn the craft.
            <br />
            <span>Put it to work.</span>
          </h1>
          <p>
            Build your foundations, test your reasoning, and turn what you learn
            into research worth sharing.
          </p>
        </div>
        {session?.user.role === "admin" && (
          <Link
            className="course-secondary"
            href="/dashboard/learning/courses/new"
          >
            <Plus size={15} />
            Create course
          </Link>
        )}
      </header>
      <div className="course-library-toolbar">
        <nav aria-label="Course tracks">
          {tracks.map((t) => (
            <button
              key={t}
              aria-pressed={track === t}
              onClick={() => setTrack(t)}
            >
              {t}
            </button>
          ))}
        </nav>
        <label>
          <Search size={16} />
          <input
            aria-label="Search courses"
            placeholder="Find a course or topic"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {loading ? (
        <p className="p-8 text-slate-500">Loading courses…</p>
      ) : (
        <>
          <div className="course-library-count">
            {filtered.length} courses · Read, explore, apply
          </div>
          <div className="course-library-grid">
            {filtered.map((c, i) => {
              const guide = curriculum[c.slug];
              return (
                <article className="course-library-card" key={c.id}>
                  <div className="course-card-top">
                    <span>{guide?.track || "General"}</span>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <Link
                    href={`/dashboard/learning/courses/${c.id}`}
                    className="course-card-link"
                  >
                    <h2>{c.title}</h2>
                    <p>{c.summary}</p>
                    <div className="course-card-outcome">
                      {guide?.outcomes[0] ||
                        "Explore the lessons and build your understanding."}
                    </div>
                    <div className="course-card-footer">
                      <span>
                        <BookOpen size={14} />
                        {c.lessons?.length || 0} lessons
                        {guide ? " + workshop" : ""}
                      </span>
                      <ArrowRight size={18} />
                    </div>
                  </Link>
                  <div className="course-card-meta">
                    <span>
                      {guide?.level || "Self-paced"}
                      {!c.published ? " · Draft" : ""}
                    </span>
                    {session?.user.role === "admin" && (
                      <Link
                        href={`/dashboard/learning/courses/${c.id}?manage=1`}
                      >
                        Manage
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {!filtered.length && (
            <p className="course-empty">
              No courses match your search. Try another topic or track.
            </p>
          )}
        </>
      )}
    </div>
  );
}
