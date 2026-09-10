"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Plus, ArrowRight, Search, Users, GitBranch } from "lucide-react";
import { DashboardLoadError } from "@/components/dashboard-load-error";
import { ProjectForm } from "@/components/workshop/project-form";
import {
  projectTemplates,
  alphaVantageDocs,
  type ProjectTemplate,
} from "@/lib/workshop/templates";
import { projectStatuses, statusLabels } from "@/lib/workshop/schema";
import type { WorkshopProjectView } from "@/lib/workshop/types";
export default function WorkshopPage() {
  const router = useRouter(),
    params = useSearchParams();
  const { data: session, status: authStatus } = useSession();
  const [projects, setProjects] = useState<WorkshopProjectView[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false);
  const [tab, setTab] = useState<"projects" | "ideas">("projects"),
    [stage, setStage] = useState("all"),
    [query, setQuery] = useState(""),
    [mine, setMine] = useState(false),
    [creating, setCreating] = useState(false),
    [template, setTemplate] = useState<ProjectTemplate>();
  const canAccess = ["user", "admin"].includes(session?.user.role || "");
  const load = async () => {
    setError(false);
    setLoading(true);
    try {
      const r = await fetch("/api/workshop/projects");
      if (!r.ok) throw new Error();
      setProjects(await r.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (canAccess) load();
  }, [canAccess]);
  useEffect(() => {
    const starter = projectTemplates.find(
      (t) => t.id === params.get("template"),
    );
    if (starter) {
      setTemplate(starter);
      setCreating(true);
    }
  }, [params]);
  const close = () => {
    setCreating(false);
    setTemplate(undefined);
    if (params.has("template")) router.replace("/dashboard/workshop");
  };
  if (authStatus === "loading") return <p className="p-8">Loading Workshop…</p>;
  if (!canAccess)
    return <p className="p-8">Workshop is available to SGC members.</p>;
  if (error) return <DashboardLoadError onRetry={load} />;
  const filtered = projects.filter(
    (p) =>
      (stage === "all" || p.status === stage) &&
      (!mine ||
        p.ownerId === session?.user.id ||
        p.members.some((m) => m.userId === session?.user.id)) &&
      `${p.title} ${p.summary} ${p.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="workshop-page">
      <header className="workshop-hero">
        <div>
          <div className="course-eyebrow">Research in progress</div>
          <h1>Workshop</h1>
          <p>
            A place to turn a question into a shared project. Find
            collaborators, make a plan, and keep the evidence in one place.
          </p>
        </div>
        <button
          className="course-primary"
          onClick={() => {
            setTemplate(undefined);
            setCreating(true);
          }}
        >
          <Plus size={16} />
          New project
        </button>
      </header>
      <nav className="workshop-tabs" aria-label="Workshop views">
        <button
          aria-pressed={tab === "projects"}
          onClick={() => setTab("projects")}
        >
          Projects <span>{projects.length}</span>
        </button>
        <button aria-pressed={tab === "ideas"} onClick={() => setTab("ideas")}>
          Project starters <span>{projectTemplates.length}</span>
        </button>
      </nav>
      {tab === "projects" ? (
        <>
          <div className="workshop-toolbar">
            <label className="workshop-search">
              <Search size={15} />
              <input
                aria-label="Search projects"
                placeholder="Search projects or tags"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Filter project stage"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              <option value="all">All stages</option>
              {projectStatuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
            <label className="workshop-mine">
              <input
                type="checkbox"
                checked={mine}
                onChange={(e) => setMine(e.target.checked)}
              />
              My projects
            </label>
          </div>
          {loading ? (
            <p className="course-empty">Loading projects…</p>
          ) : !filtered.length ? (
            <div className="workshop-empty">
              <GitBranch size={28} />
              <h2>
                {projects.length
                  ? "No projects match these filters."
                  : "Start with a question worth testing."}
              </h2>
              <p>
                {projects.length
                  ? "Try another stage, search term or project view."
                  : "Post your own idea, or adapt a starter with a data plan, benchmark and milestones already outlined."}
              </p>
              <button
                className="course-secondary"
                onClick={() => setTab("ideas")}
              >
                Explore project starters
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div className="workshop-project-grid">
              {filtered.map((p) => {
                const done = p.milestones.filter((m) => m.completed).length;
                return (
                  <Link
                    key={p.id}
                    className="workshop-project-card"
                    href={`/dashboard/workshop/${p.id}`}
                  >
                    <div className="workshop-card-top">
                      <span className={`workshop-stage stage-${p.status}`}>
                        {statusLabels[p.status]}
                      </span>
                      <span>
                        {new Date(p.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <h2>{p.title}</h2>
                    <p>{p.summary}</p>
                    <div className="workshop-tags">
                      {p.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                    <div className="workshop-card-team">
                      <Users size={14} />
                      {p.owner?.name || "Owner unavailable"}
                      {p.members.length ? ` + ${p.members.length}` : ""}
                    </div>
                    <div className="course-progress">
                      <span
                        style={{
                          width: `${p.milestones.length ? (done / p.milestones.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <footer>
                      <span>
                        {done}/{p.milestones.length} milestones ·{" "}
                        {p._count?.updates || 0} updates
                      </span>
                      <ArrowRight size={16} />
                    </footer>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="workshop-starter-intro">
            <h2>Small enough to finish. Rigorous enough to learn from.</h2>
            <p>
              These are research proposals, not completed strategies. Start with
              cached data and a simple baseline. Check endpoint access and
              history for your Alpha Vantage plan; adjusted daily data and some
              historical datasets require paid access.
            </p>
            <a href={alphaVantageDocs} target="_blank" rel="noreferrer">
              Alpha Vantage documentation ↗
            </a>
          </div>
          <div className="workshop-project-grid">
            {projectTemplates.map((t) => (
              <article className="workshop-project-card" key={t.id}>
                <div className="course-eyebrow">{t.level}</div>
                <h2>{t.title}</h2>
                <p>{t.summary}</p>
                <div className="workshop-data-note">
                  <strong>Data plan</strong>
                  {t.data}
                </div>
                <div className="workshop-tags">
                  {t.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <footer>
                  <Link
                    href={`/dashboard/learning/courses/by-slug/${t.course}`}
                  >
                    Related course ↗
                  </Link>
                  <button
                    className="workshop-text-button"
                    onClick={() => {
                      setTemplate(t);
                      setCreating(true);
                    }}
                  >
                    Use starter
                    <ArrowRight size={14} />
                  </button>
                </footer>
              </article>
            ))}
          </div>
        </>
      )}
      {creating && (
        <ProjectForm
          key={template?.id || "blank"}
          template={template}
          onClose={close}
          onSaved={(id) => router.push(`/dashboard/workshop/${id}`)}
        />
      )}
    </div>
  );
}
