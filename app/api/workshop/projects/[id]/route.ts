export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateProjectInput } from "@/lib/workshop/schema";
import {
  workshopSession,
  workshopFailure,
  projectAccess,
  validateMembers,
  projectInclude,
  WorkshopError,
  privateHeaders,
} from "@/lib/workshop/api";
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await workshopSession();
    const access = await projectAccess(params.id, user);
    const project = await prisma.workshopProject.findUnique({
      where: { id: params.id },
      include: projectInclude,
    });
    return NextResponse.json(
      { ...project, canEdit: access.edits, canManage: access.manages },
      { headers: privateHeaders },
    );
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
    const input = updateProjectInput.parse(await req.json());
    const { memberIds, version, ...fields } = input;
    const access = await projectAccess(params.id, user);
    if (!access.edits)
      throw new WorkshopError(
        403,
        "Only the project team can edit this project.",
      );
    const ids = (await validateMembers(memberIds)).filter(
      (id) => id !== access.project.ownerId,
    );
    if (
      !access.manages &&
      [...ids].sort().join(",") !==
        access.project.members
          .map((m) => m.userId)
          .sort()
          .join(",")
    )
      throw new WorkshopError(
        403,
        "Only the owner or an administrator can change collaborators.",
      );
    await prisma.$transaction(async (tx) => {
      const saved = await tx.workshopProject.updateMany({
        where: { id: params.id, version },
        data: {
          ...fields,
          githubUrl: fields.githubUrl || null,
          version: { increment: 1 },
        },
      });
      if (saved.count !== 1)
        throw new WorkshopError(
          409,
          "Someone updated this project. Reload the latest version before saving. Your form is still open.",
        );
      if (access.manages) {
        await tx.workshopMilestone.updateMany({
          where: {
            projectId: params.id,
            assigneeId: {
              notIn: [
                ...ids,
                ...(access.project.ownerId ? [access.project.ownerId] : []),
              ],
            },
          },
          data: { assigneeId: null },
        });
        await tx.workshopMember.deleteMany({ where: { projectId: params.id } });
        await tx.workshopMember.createMany({
          data: ids.map((userId) => ({ userId, projectId: params.id })),
        });
      }
    });
    return NextResponse.json({ success: true }, { headers: privateHeaders });
  } catch (e) {
    return workshopFailure(e);
  }
}
