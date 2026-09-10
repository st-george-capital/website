export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createProjectInput } from "@/lib/workshop/schema";
import {
  workshopSession,
  workshopFailure,
  personSelect,
  validateMembers,
  privateHeaders,
} from "@/lib/workshop/api";
export async function GET(req: NextRequest) {
  try {
    const user = await workshopSession();
    const params = req.nextUrl.searchParams;
    const projects = await prisma.workshopProject.findMany({
      where:
        params.get("mine") === "true"
          ? {
              OR: [
                { ownerId: user.id },
                { members: { some: { userId: user.id } } },
              ],
            }
          : {},
      orderBy: { updatedAt: "desc" },
      include: {
        owner: { select: personSelect },
        members: { include: { user: { select: personSelect } } },
        milestones: { select: { id: true, completed: true } },
        _count: { select: { updates: true } },
      },
    });
    return NextResponse.json(projects, { headers: privateHeaders });
  } catch (e) {
    return workshopFailure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    const user = await workshopSession();
    const input = createProjectInput.parse(await req.json());
    const { memberIds, milestones, ...fields } = input;
    const ids = (await validateMembers(memberIds)).filter(
      (id) => id !== user.id,
    );
    const project = await prisma.workshopProject.create({
      data: {
        ...fields,
        githubUrl: fields.githubUrl || null,
        ownerId: user.id,
        members: { create: ids.map((userId) => ({ userId })) },
        milestones: { create: milestones.map((title) => ({ title })) },
      },
    });
    return NextResponse.json(
      { id: project.id },
      { status: 201, headers: privateHeaders },
    );
  } catch (e) {
    return workshopFailure(e);
  }
}
