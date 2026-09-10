"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  Check,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { DashboardLoadError } from "@/components/dashboard-load-error";
import { ProjectForm } from "@/components/workshop/project-form";
import { LessonContent } from "@/components/learning/lesson-content";
import { statusLabels } from "@/lib/workshop/schema";
import type { WorkshopProjectView } from "@/lib/workshop/types";
export default function ProjectPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<WorkshopProjectView | null>(null),
    [loadError, setLoadError] = useState(false),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(false),
    [tab, setTab] = useState<"plan" | "updates">("plan");
  const [content, setContent] = useState(""),
    [kind, setKind] = useState("progress"),
    [saving, setSaving] = useState(false),
    [task, setTask] = useState(""),
    [due, setDue] = useState(""),
    [assignee, setAssignee] = useState("");
  const load = async () => {
    setLoadError(false);
    try {
      const r = await fetch(`/api/workshop/projects/${params.id}`);
      if (!r.ok) throw new Error();
      setProject(await r.json());
    } catch {
      setLoadError(true);
    }
  };
  useEffect(() => {
    load();
  }, [params.id]);
  const mutate = async (path: string, method: string, body: unknown) => {
    setSaving(true);
    setError("");
    try {
      const r = await fetch(`/api/workshop/projects/${params.id}/${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Request failed.");
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
      return false;
    } finally {
      setSaving(false);
    }
  };
  if (loadError) return <DashboardLoadError onRetry={load} />;
  if (!project) return <p className="p-8 text-slate-500">Loading project…</p>;
  const people = [
    ...(project.owner ? [project.owner] : []),
    ...project.members.map((m) => m.user),
  ];
  const done = project.milestones.filter((m) => m.completed).length;
  return (
    <div className="workshop-page">
      <div className="course-breadcrumb">
        <Link href="/dashboard/workshop">
          <ArrowLeft size={14} />
          All projects
        </Link>
        <button className="workshop-text-button" onClick={load}>
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>
      <header className="workshop-project-header">
        <div>
          <span className={`workshop-stage stage-${project.status}`}>
            {statusLabels[project.status]}
          </span>
          <h1>{project.title}</h1>
          <p>{project.summary}</p>
          <div className="workshop-tags">
            {project.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
        {project.canEdit && (
          <button className="course-secondary" onClick={() => setEditing(true)}>
            Edit project
          </button>
        )}
      </header>
      {error && (
        <p role="alert" className="workshop-error">
          {error}
        </p>
      )}
      <div className="workshop-detail-grid">
        <div>
          <nav className="workshop-tabs" aria-label="Project views">
            <button
              aria-pressed={tab === "plan"}
              onClick={() => setTab("plan")}
            >
              Research plan
            </button>
            <button
              aria-pressed={tab === "updates"}
              onClick={() => setTab("updates")}
            >
              Updates <span>{project.updates.length}</span>
            </button>
          </nav>
          {tab === "plan" ? (
            <>
              <section className="workshop-section">
                <div className="course-eyebrow">The question</div>
                <h2>Hypothesis</h2>
                {project.hypothesis ? (
                  <LessonContent content={project.hypothesis} />
                ) : (
                  <p className="workshop-muted">
                    Define the question and what evidence would change your
                    mind.
                  </p>
                )}
              </section>
              <section className="workshop-section">
                <div className="course-eyebrow">The approach</div>
                <h2>Plan and evaluation</h2>
                {project.plan ? (
                  <LessonContent content={project.plan} />
                ) : (
                  <p className="workshop-muted">
                    Add the data, method, baseline, evaluation criteria and
                    intended deliverable.
                  </p>
                )}
              </section>
            </>
          ) : (
            <section className="workshop-section">
              <h2>Research log</h2>
              <p className="workshop-muted">
                Keep progress, decisions and blockers with the project.
              </p>
              {project.canEdit && (
                <form
                  className="workshop-update-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (await mutate("updates", "POST", { kind, content }))
                      setContent("");
                  }}
                >
                  <label>
                    Update type
                    <select
                      value={kind}
                      onChange={(e) => setKind(e.target.value)}
                    >
                      <option value="progress">Progress</option>
                      <option value="decision">Decision</option>
                      <option value="blocker">Blocker</option>
                    </select>
                  </label>
                  <label>
                    Update <small>Markdown supported</small>
                    <textarea
                      required
                      minLength={5}
                      maxLength={10000}
                      rows={4}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="What changed? What did you find? What happens next?"
                    />
                  </label>
                  <button
                    className="course-primary"
                    disabled={saving || !content.trim()}
                  >
                    {saving ? "Posting…" : "Post update"}
                  </button>
                </form>
              )}
              {!project.updates.length ? (
                <p className="workshop-muted">
                  No updates yet. Record the first decision or the next
                  experiment.
                </p>
              ) : (
                <div className="workshop-timeline">
                  {project.updates.map((u) => (
                    <article key={u.id}>
                      <div className="workshop-update-meta">
                        <span>{u.kind}</span>
                        <strong>{u.author?.name || "Former member"}</strong>
                        <time dateTime={u.createdAt}>
                          {new Date(u.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </time>
                      </div>
                      <LessonContent content={u.content} />
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
        <aside className="workshop-project-aside">
          <section>
            <div className="course-eyebrow">Project team</div>
            <p className="workshop-owner">
              {project.owner?.name || "Owner unavailable"}
              <span>Owner</span>
            </p>
            <div className="workshop-collaborators">
              {project.members.map((m) => (
                <span key={m.userId}>{m.user.name || "SGC member"}</span>
              ))}
            </div>
            {!project.members.length && (
              <p className="workshop-muted">No collaborators added yet.</p>
            )}
          </section>
          <section>
            <div className="course-eyebrow">Milestones</div>
            <div className="workshop-milestone-count">
              {done}
              <span> / {project.milestones.length} complete</span>
            </div>
            <div className="course-progress">
              <span
                style={{
                  width: `${project.milestones.length ? (done / project.milestones.length) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="workshop-milestones">
              {project.milestones.map((m) => (
                <div className="workshop-milestone-row" key={m.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={m.completed}
                      disabled={!project.canEdit || saving}
                      onChange={(e) =>
                        mutate("milestones", "PATCH", {
                          id: m.id,
                          completed: e.target.checked,
                        })
                      }
                    />
                    <span className={m.completed ? "is-complete" : ""}>
                      {m.title}
                      <small>
                        {m.assignee?.name || "Unassigned"}
                        {m.dueAt
                          ? ` · Due ${new Date(m.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`
                          : ""}
                      </small>
                    </span>
                  </label>
                  {project.canEdit && (
                    <button
                      type="button"
                      aria-label={`Remove milestone ${m.title}`}
                      disabled={saving}
                      onClick={() => {
                        if (confirm("Remove this milestone?"))
                          mutate("milestones", "DELETE", { id: m.id });
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {project.canEdit && (
              <details className="workshop-add-task">
                <summary>
                  <Plus size={13} />
                  Add milestone
                </summary>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      await mutate("milestones", "POST", {
                        title: task,
                        dueAt: due
                          ? new Date(due + "T12:00:00Z").toISOString()
                          : null,
                        assigneeId: assignee || null,
                      })
                    ) {
                      setTask("");
                      setDue("");
                      setAssignee("");
                    }
                  }}
                >
                  <label>
                    Milestone
                    <input
                      required
                      minLength={3}
                      maxLength={160}
                      value={task}
                      onChange={(e) => setTask(e.target.value)}
                    />
                  </label>
                  <label>
                    Assignee
                    <select
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {people.map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.name || "SGC member"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Target date
                    <input
                      type="date"
                      value={due}
                      onChange={(e) => setDue(e.target.value)}
                    />
                  </label>
                  <button disabled={saving} className="course-secondary">
                    Add milestone
                  </button>
                </form>
              </details>
            )}
          </section>
          <section>
            <div className="course-eyebrow">Links and resources</div>
            {project.githubUrl && (
              <a
                className="workshop-resource-link"
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub repository
                <ExternalLink size={13} />
              </a>
            )}
            {project.resources.map((r, i) => (
              <a
                className="workshop-resource-link"
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {r.label}
                <ExternalLink size={13} />
              </a>
            ))}
            {!project.githubUrl && !project.resources.length && (
              <p className="workshop-muted">
                Add a repository, notebook, planning document or dataset link.
              </p>
            )}
          </section>
          <p className="workshop-timestamp">
            Created{" "}
            {new Date(project.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </aside>
      </div>
      {editing && (
        <ProjectForm
          project={project}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      )}
    </div>
  );
}
