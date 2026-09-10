export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  workshopSession,
  workshopFailure,
  personSelect,
  privateHeaders,
} from "@/lib/workshop/api";
export async function GET() {
  try {
    await workshopSession();
    const members = await prisma.user.findMany({
      where: { role: { in: ["user", "admin"] } },
      select: personSelect,
      orderBy: { name: "asc" },
    });
    return NextResponse.json(members, { headers: privateHeaders });
  } catch (e) {
    return workshopFailure(e);
  }
}
