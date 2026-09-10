import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";
export class WorkshopError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function workshopSession() {
  const session = await getSession();
  if (!session?.user?.id)
    throw new WorkshopError(401, "Sign in to use Workshop.");
  if (!["user", "admin"].includes(session.user.role))
    throw new WorkshopError(403, "Workshop is available to SGC members.");
  return session.user;
}
export const personSelect = { id: true, name: true } as const;
export const projectInclude = {
  owner: { select: personSelect },
  members: { include: { user: { select: personSelect } } },
  milestones: {
    orderBy: { createdAt: "asc" as const },
    include: { assignee: { select: personSelect } },
  },
  updates: {
    orderBy: { createdAt: "desc" as const },
    include: { author: { select: personSelect } },
  },
};
export async function projectAccess(
  id: string,
  user: { id: string; role: string },
) {
  const project = await prisma.workshopProject.findUnique({
    where: { id },
    include: { members: true },
  });
  if (!project) throw new WorkshopError(404, "Project not found.");
  const manages = user.role === "admin" || project.ownerId === user.id;
  const edits = manages || project.members.some((m) => m.userId === user.id);
  return { project, manages, edits };
}
export async function validateMembers(ids: string[]) {
  const unique = [...new Set(ids)];
  const count = await prisma.user.count({
    where: { id: { in: unique }, role: { in: ["user", "admin"] } },
  });
  if (count !== unique.length)
    throw new WorkshopError(
      400,
      "Choose active SGC members from the collaborator list.",
    );
  return unique;
}
export function workshopFailure(error: unknown) {
  if (error instanceof WorkshopError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(" "),
      },
      { status: 400 },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  console.error(
    "Workshop request failed:",
    error instanceof Error ? error.name : "Unknown error",
  );
  return NextResponse.json(
    { error: "Workshop could not complete this request. Please try again." },
    { status: 503 },
  );
}
export const privateHeaders = { "Cache-Control": "private, no-store" };
