const assert = require("node:assert/strict");
require("sucrase/register/ts");
const {
  DEFAULT_CONTACT_REPLY_TEMPLATE,
  renderContactReplyTemplate,
} = require("../../lib/contact-reply.ts");

const rendered = renderContactReplyTemplate(DEFAULT_CONTACT_REPLY_TEMPLATE, {
  firstName: "Priya",
  lastName: "Shah",
  email: "priya@example.com",
});
assert.match(rendered, /^Hello Priya,/);
assert.match(rendered, /Thank you for reaching out to St\. George Capital/);
assert.equal(
  renderContactReplyTemplate("Hi {{fullName}} ({{email}})", {
    firstName: "Alex",
    lastName: "Morgan",
    email: "alex@example.com",
  }),
  "Hi Alex Morgan (alex@example.com)",
);
console.log("PASS contact reply template personalization");
