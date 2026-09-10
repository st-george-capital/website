export const CONTACT_REPLY_TEMPLATE_KEY = "contactReplyTemplate";
export const CONTACT_REPLY_SUBJECT_KEY = "contactReplySubject";

export const DEFAULT_CONTACT_REPLY_SUBJECT =
  "Re: Your message to St. George Capital";

export const DEFAULT_CONTACT_REPLY_TEMPLATE = `Hello {{firstName}},

Thank you for reaching out to St. George Capital. We received your message and a member of our team will get back to you shortly.

Best regards,
The St. George Capital Team`;

export function settingValue(data: unknown, key: string) {
  if (!data || typeof data !== "object") return "";
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export function renderContactReplyTemplate(
  template: string,
  person: { firstName: string; lastName: string; email: string },
) {
  const firstName = person.firstName.trim();
  const lastName = person.lastName.trim();
  const fullName = `${firstName} ${lastName}`.trim();
  return template
    .replaceAll("{{firstName}}", firstName)
    .replaceAll("{{lastName}}", lastName)
    .replaceAll("{{fullName}}", fullName)
    .replaceAll("{{email}}", person.email.trim());
}
