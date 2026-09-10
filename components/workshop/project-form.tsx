"use client";
import { useEffect, useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import { projectStatuses, statusLabels } from "@/lib/workshop/schema";
import type {
  WorkshopPerson,
  WorkshopProjectView,
  ProjectResource,
} from "@/lib/workshop/types";
import type { ProjectTemplate } from "@/lib/workshop/templates";
import { LessonContent } from "@/components/learning/lesson-content";
export function ProjectForm({
  project,
  template,
  onClose,
  onSaved,
}: {
  project?: WorkshopProjectView;
  template?: ProjectTemplate;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(project?.title || template?.title || ""),
    [summary, setSummary] = useState(
      project?.summary || template?.summary || "",
    );
  const [hypothesis, setHypothesis] = useState(
      project?.hypothesis || template?.hypothesis || "",
    ),
    [plan, setPlan] = useState(project?.plan || template?.plan || "");
  const [status, setStatus] = useState(project?.status || "idea"),
    [tags, setTags] = useState(
      (project?.tags || template?.tags || []).join(", "),
    ),
    [github, setGithub] = useState(project?.githubUrl || "");
  const [resources, setResources] = useState<ProjectResource[]>(
      project?.resources || template?.resources || [],
    ),
    [memberIds, setMemberIds] = useState<string[]>(
      project?.members.map((m) => m.userId) || [],
    );
  const [members, setMembers] = useState<WorkshopPerson[]>([]),
    [memberSearch, setMemberSearch] = useState(""),
    [error, setError] = useState(""),
    [memberError, setMemberError] = useState(false),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const loadMembers = async () => {
    setMemberError(false);
    try {
      const r = await fetch("/api/workshop/members");
      if (!r.ok) throw new Error();
      setMembers(await r.json());
    } catch {
      setMemberError(true);
    }
  };
  useEffect(() => {
    loadMembers();
  }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const r = await fetch(
        project
          ? `/api/workshop/projects/${project.id}`
          : "/api/workshop/projects",
        {
          method: project ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            summary,
            hypothesis,
            plan,
            status,
            tags: tags
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            githubUrl: github,
            resources,
            memberIds,
            ...(project
              ? { version: project.version }
              : { milestones: template?.milestones || [] }),
          }),
        },
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Project could not be saved.");
      onSaved(project?.id || data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Project could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="workshop-dialog"
      onCancel={(e) => {
        e.preventDefault();
        if (!saving) onClose();
      }}
    >
      <form onSubmit={submit}>
        <header>
          <div>
            <div className="course-eyebrow">Workshop</div>
            <h2>{project ? "Edit project" : "Start a project"}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close project editor"
          >
            <X size={20} />
          </button>
        </header>
        {error && (
          <p className="workshop-error" role="alert">
            {error}
          </p>
        )}
        <label>
          Project title
          <input
            autoFocus
            required
            minLength={3}
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Short description
          <textarea
            required
            minLength={10}
            maxLength={1000}
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="What are you investigating, and why does it matter?"
          />
        </label>
        <div className="workshop-form-grid">
          <label>
            Stage
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {projectStatuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tags <small>Comma-separated, up to 8</small>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Equities, Data engineering"
            />
          </label>
        </div>
        <label>
          Hypothesis or research question
          <textarea
            rows={3}
            maxLength={6000}
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            placeholder="What would the evidence need to show? What would disprove it?"
          />
        </label>
        <label>
          Research plan <small>Markdown supported</small>
          <textarea
            rows={8}
            maxLength={20000}
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="Data, method, benchmark, evaluation, limitations and deliverables"
          />
        </label>
        {plan && (
          <details className="workshop-plan-preview">
            <summary>Preview plan</summary>
            <LessonContent content={plan} />
          </details>
        )}
        <fieldset>
          <legend>Collaborators</legend>
          <p>
            Choose the people working on this project. They can edit the plan,
            post updates and manage milestones.
          </p>
          {project && !project.canManage ? (
            <p>Only the owner or an administrator can change the team.</p>
          ) : (
            <>
              {memberError ? (
                <p role="alert">
                  The member list could not load.{" "}
                  <button
                    type="button"
                    className="workshop-text-button"
                    onClick={loadMembers}
                  >
                    Retry
                  </button>
                </p>
              ) : (
                <>
                  <input
                    aria-label="Search collaborators"
                    placeholder="Search members"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                  <div className="workshop-member-picker">
                    {members
                      .filter(
                        (m) =>
                          m.id !== project?.ownerId &&
                          (m.name || "Member")
                            .toLowerCase()
                            .includes(memberSearch.toLowerCase()),
                      )
                      .map((m) => (
                        <label key={m.id}>
                          <input
                            type="checkbox"
                            checked={memberIds.includes(m.id)}
                            onChange={(e) =>
                              setMemberIds((ids) =>
                                e.target.checked
                                  ? [...ids, m.id]
                                  : ids.filter((id) => id !== m.id),
                              )
                            }
                          />
                          {m.name || `Member ${m.id.slice(-6)}`}
                        </label>
                      ))}
                  </div>
                </>
              )}
            </>
          )}
          <small>{memberIds.length} selected</small>
        </fieldset>
        <label>
          GitHub repository
          <input
            type="url"
            value={github}
            onChange={(e) => setGithub(e.target.value)}
            placeholder="https://github.com/organisation/project"
          />
        </label>
        <fieldset>
          <legend>Resources and planning links</legend>
          {resources.map((resource, i) => (
            <div className="workshop-resource-input" key={i}>
              <input
                required
                aria-label={`Resource ${i + 1} label`}
                placeholder="Notebook, specification, dataset…"
                value={resource.label}
                onChange={(e) =>
                  setResources((rs) =>
                    rs.map((r, j) =>
                      i === j ? { ...r, label: e.target.value } : r,
                    ),
                  )
                }
              />
              <input
                required
                type="url"
                aria-label={`Resource ${i + 1} URL`}
                placeholder="https://"
                value={resource.url}
                onChange={(e) =>
                  setResources((rs) =>
                    rs.map((r, j) =>
                      i === j ? { ...r, url: e.target.value } : r,
                    ),
                  )
                }
              />
              <button
                type="button"
                aria-label={`Remove resource ${i + 1}`}
                onClick={() =>
                  setResources((rs) => rs.filter((_, j) => j !== i))
                }
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="workshop-text-button"
            disabled={resources.length >= 12}
            onClick={() =>
              setResources((rs) => [...rs, { label: "", url: "" }])
            }
          >
            <Plus size={14} />
            Add resource
          </button>
        </fieldset>
        {template && (
          <p className="workshop-form-note">
            This starter adds {template.milestones.length} milestones. Adapt the
            plan to your question and data access.
          </p>
        )}
        <footer>
          <button
            type="button"
            className="course-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button className="course-primary" disabled={saving}>
            {saving ? "Saving…" : project ? "Save project" : "Create project"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
