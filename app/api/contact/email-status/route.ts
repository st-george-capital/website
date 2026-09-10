import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { isEmailConfigured, CONTACT_FROM_ADDRESS } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({
      configured: isEmailConfigured(),
      from: CONTACT_FROM_ADDRESS,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to check email status" },
      {
        status:
          error.message === "Unauthorized: Admin access required" ? 403 : 500,
      },
    );
  }
}
