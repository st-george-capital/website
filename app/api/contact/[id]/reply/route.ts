import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sendEmail, escapeHtml, CONTACT_FROM_ADDRESS } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { to, subject, message } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await sendEmail({
      to,
      subject: subject || "Re: Your message to St. George Capital",
      html: `
          <p>${escapeHtml(String(message)).replace(/\n/g, "<br>")}</p>
          <hr>
          <p><small>This email was sent from St. George Capital</small></p>
          <p><small>Email: ${escapeHtml(CONTACT_FROM_ADDRESS)}</small></p>
        `,
    });

    await prisma.contactSubmission.update({
      where: { id: params.id },
      data: { status: "READ" },
    });

    return NextResponse.json({ success: true, from: CONTACT_FROM_ADDRESS });
  } catch (error: any) {
    console.error("Reply error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send reply" },
      {
        status:
          error.message === "Unauthorized: Admin access required"
            ? 403
            : error.message?.includes("not configured")
              ? 503
              : 500,
      },
    );
  }
}
