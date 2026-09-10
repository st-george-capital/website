export interface WorkshopPerson {
  id: string;
  name: string | null;
}
export interface ProjectResource {
  label: string;
  url: string;
}
export interface WorkshopProjectView {
  id: string;
  title: string;
  summary: string;
  hypothesis: string;
  plan: string;
  status: string;
  tags: string[];
  githubUrl: string | null;
  resources: ProjectResource[];
  ownerId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  owner: WorkshopPerson | null;
  members: { userId: string; user: WorkshopPerson }[];
  milestones: {
    id: string;
    title: string;
    completed: boolean;
    dueAt: string | null;
    assigneeId: string | null;
    assignee: WorkshopPerson | null;
  }[];
  updates: {
    id: string;
    content: string;
    kind: string;
    createdAt: string;
    author: WorkshopPerson | null;
  }[];
  _count?: { updates: number };
  canEdit?: boolean;
  canManage?: boolean;
}
