export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateInput } from "@/lib/workshop/schema";
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
    const { edits } = await projectAccess(params.id, user);
    if (!edits)
      throw new WorkshopError(403, "Only the project team can post updates.");
    const data = updateInput.parse(await req.json());
    const update = await prisma.$transaction(async (tx) => {
      const result = await tx.workshopUpdate.create({
        data: { ...data, projectId: params.id, authorId: user.id },
      });
      await tx.workshopProject.update({
        where: { id: params.id },
        data: { updatedAt: new Date() },
      });
      return result;
    });
    return NextResponse.json({ id: update.id }, { status: 201 });
  } catch (e) {
    return workshopFailure(e);
  }
}
