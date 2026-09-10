import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sendEmail, escapeHtml, CONTACT_FROM_ADDRESS } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    const submissions = await prisma.contactSubmission.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(submissions);
  } catch (error: any) {
    console.error("Get submissions error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch submissions" },
      {
        status:
          error.message === "Unauthorized: Admin access required" ? 403 : 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, message } = body;

    if (!firstName || !lastName || !email || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const submission = await prisma.contactSubmission.create({
      data: {
        firstName,
        lastName,
        email,
        message,
        status: "NEW",
      },
    });

    try {
      const dashboardUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/contact`;
      await sendEmail({
        to: CONTACT_FROM_ADDRESS,
        subject: `New Contact Form Submission from ${firstName} ${lastName}`,
        html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>From:</strong> ${escapeHtml(String(firstName))} ${escapeHtml(String(lastName))}</p>
            <p><strong>Email:</strong> ${escapeHtml(String(email))}</p>
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(String(message)).replace(/\n/g, "<br>")}</p>
            <hr>
            <p><small>View all submissions in the <a href="${dashboardUrl}">dashboard</a></small></p>
          `,
        replyTo: String(email),
      });
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
    }

    return NextResponse.json(
      { success: true, id: submission.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to submit form" },
      { status: 500 },
    );
  }
}
