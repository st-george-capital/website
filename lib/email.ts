import { Resend } from "resend";

export const CONTACT_FROM_ADDRESS =
  process.env.CONTACT_FROM_EMAIL ||
  process.env.NEWSLETTER_FROM_EMAIL ||
  "outreach@stgeorgecapital.ca";

export const CONTACT_FROM = `St. George Capital <${CONTACT_FROM_ADDRESS}>`;

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Email is not configured. Set RESEND_API_KEY.");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: CONTACT_FROM,
    to,
    subject,
    html,
    replyTo: replyTo || CONTACT_FROM_ADDRESS,
  });

  if (result.error) {
    throw new Error(result.error.message || "Failed to send email");
  }

  return result;
}
