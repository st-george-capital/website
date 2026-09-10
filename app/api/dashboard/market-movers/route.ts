import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getDashboardMarketMovers } from "@/lib/market-data/movers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === "visitor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const movers = await getDashboardMarketMovers();
    return NextResponse.json(movers);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch market movers";
    console.error("[dashboard/market-movers] GET error:", error);

    if (message.includes("ALPHA_VANTAGE_API_KEY")) {
      return NextResponse.json(
        { error: "ALPHA_VANTAGE_API_KEY is not configured" },
        { status: 503 },
      );
    }

    if (message.includes("rate limit")) {
      return NextResponse.json(
        { error: "Alpha Vantage rate limit reached. Please try again later." },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
