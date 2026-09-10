import { NextRequest, NextResponse } from "next/server";
import { sendEmail, isEmailConfigured, CONTACT_FROM_ADDRESS } from "@/lib/email";
import { requireAdmin } from "@/lib/auth";

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
      { error: error.message || "Unauthorized" },
      { status: error.message?.includes("Unauthorized") ? 403 : 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { to, subject, html } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await sendEmail({ to, subject, html });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Send email error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      {
        status: error.message?.includes("Unauthorized")
          ? 403
          : error.message?.includes("not configured")
            ? 503
            : 500,
      },
    );
  }
}
