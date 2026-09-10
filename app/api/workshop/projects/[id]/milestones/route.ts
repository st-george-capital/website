export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { milestoneInput } from "@/lib/workshop/schema";
import {
  workshopSession,
  workshopFailure,
  projectAccess,
  WorkshopError,
} from "@/lib/workshop/api";
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await workshopSession();
    const { project, edits } = await projectAccess(params.id, user);
    if (!edits)
      throw new WorkshopError(
        403,
        "Only the project team can plan milestones.",
      );
    const data = milestoneInput.parse(await req.json());
    if (
      data.assigneeId &&
      data.assigneeId !== project.ownerId &&
      !project.members.some((m) => m.userId === data.assigneeId)
    )
      throw new WorkshopError(
        400,
        "Assign milestones to someone on this project.",
      );
    const milestone = await prisma.workshopMilestone.create({
      data: { ...data, projectId: params.id },
    });
    return NextResponse.json({ id: milestone.id }, { status: 201 });
  } catch (e) {
    return workshopFailure(e);
  }
}
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await workshopSession();
    const { edits } = await projectAccess(params.id, user);
    if (!edits)
      throw new WorkshopError(
        403,
        "Only the project team can update milestones.",
      );
    const data = z
      .object({ id: z.string(), completed: z.boolean() })
      .parse(await req.json());
    const result = await prisma.workshopMilestone.updateMany({
      where: { id: data.id, projectId: params.id },
      data: { completed: data.completed },
    });
    if (!result.count) throw new WorkshopError(404, "Milestone not found.");
    return NextResponse.json({ success: true });
  } catch (e) {
    return workshopFailure(e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await workshopSession();
    const { edits } = await projectAccess(params.id, user);
    if (!edits)
      throw new WorkshopError(
        403,
        "Only the project team can remove milestones.",
      );
    const { id } = z.object({ id: z.string() }).parse(await req.json());
    const result = await prisma.workshopMilestone.deleteMany({
      where: { id, projectId: params.id },
    });
    if (!result.count) throw new WorkshopError(404, "Milestone not found.");
    return NextResponse.json({ success: true });
  } catch (e) {
    return workshopFailure(e);
  }
}
