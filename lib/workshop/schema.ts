import { z } from "zod";
export const projectStatuses = [
  "idea",
  "planning",
  "active",
  "blocked",
  "completed",
  "archived",
] as const;
export const statusLabels: Record<string, string> = {
  idea: "Idea",
  planning: "Planning",
  active: "In progress",
  blocked: "Blocked",
  completed: "Completed",
  archived: "Archived",
};
const link = z
  .string()
  .trim()
  .max(1000)
  .refine((value) => {
    try {
      const u = new URL(value);
      return (
        ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
      );
    } catch {
      return false;
    }
  }, "Use a full http or https URL.");
export const projectInput = z.object({
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(10).max(1000),
  hypothesis: z.string().trim().max(6000).default(""),
  plan: z.string().trim().max(20000).default(""),
  status: z.enum(projectStatuses).default("idea"),
  tags: z.array(z.string().trim().min(1).max(32)).max(8).default([]),
  githubUrl: z.union([link, z.literal("")]).default(""),
  resources: z
    .array(z.object({ label: z.string().trim().min(1).max(80), url: link }))
    .max(12)
    .default([]),
  memberIds: z.array(z.string().min(1).max(100)).max(20).default([]),
});
export const createProjectInput = projectInput.extend({
  milestones: z.array(z.string().trim().min(1).max(160)).max(12).default([]),
});
export const updateProjectInput = projectInput.extend({
  version: z.number().int().positive(),
});
export const milestoneInput = z.object({
  title: z.string().trim().min(3).max(160),
  assigneeId: z.string().max(100).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
});
export const updateInput = z.object({
  kind: z.enum(["progress", "decision", "blocker"]).default("progress"),
  content: z.string().trim().min(5).max(10000),
});
