import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["user", "admin"].includes(session.user.role))
    return NextResponse.json({ error: "Access required" }, { status: 403 });
  try {
    const reports = await prisma.equityResearchReport.findMany({
      where: {
        OR: [
          { createdBy: session.user.id },
          { collaborators: { has: session.user.id } },
        ],
      },
      select: {
        id: true,
        ticker: true,
        companyName: true,
        status: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });
    return NextResponse.json(
      { reports },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Your research could not be loaded." },
      { status: 503 },
    );
  }
}
