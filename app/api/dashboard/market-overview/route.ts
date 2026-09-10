import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMarketOverview } from "@/lib/market-data/overview";
export const dynamic = "force-dynamic";
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["user", "admin"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    { metrics: await getMarketOverview() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
