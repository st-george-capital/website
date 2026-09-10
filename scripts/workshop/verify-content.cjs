const assert = require("node:assert/strict");
require("sucrase/register/ts");
const { quantCourses } = require("../../lib/learning/quant-courses.ts");
const { curriculum } = require("../../lib/learning/curriculum.ts");
const { projectTemplates } = require("../../lib/workshop/templates.ts");
const {
  alphaVantageSources,
} = require("../../lib/workshop/alpha-vantage-sources.ts");
const { createProjectInput } = require("../../lib/workshop/schema.ts");
const unique = (values, label) =>
  assert.equal(new Set(values).size, values.length, label);
unique(
  quantCourses.map((c) => c.slug),
  "Duplicate course slug",
);
unique(
  projectTemplates.map((t) => t.id),
  "Duplicate project ID",
);
for (const c of quantCourses) {
  assert.ok(curriculum[c.slug], `Missing workshop: ${c.slug}`);
  assert.ok(c.lessons.length >= 4, `Incomplete course: ${c.slug}`);
  unique(
    c.lessons.map((l) => l.slug),
    `Duplicate lesson: ${c.slug}`,
  );
  for (const l of c.lessons) {
    assert.match(l.content, /## /);
    assert.ok(l.content.length > 600, `Thin lesson: ${c.slug}/${l.slug}`);
  }
}
for (const [slug, w] of Object.entries(curriculum)) {
  if (w.projectTemplate)
    assert.ok(
      projectTemplates.some((t) => t.id === w.projectTemplate),
      `Missing project for ${slug}`,
    );
  for (const q of w.quiz)
    assert.ok(
      Number.isInteger(q.answer) &&
        q.answer >= 0 &&
        q.answer < q.choices.length,
      `Invalid quiz: ${slug}`,
    );
}
for (const t of projectTemplates) {
  assert.ok(curriculum[t.course], `Unknown related course: ${t.id}`);
  createProjectInput.parse({
    ...t,
    githubUrl: "",
    memberIds: [],
    resources: t.resources || [],
  });
  for (const id of t.sourceIds || []) {
    const source = alphaVantageSources[id];
    assert.ok(source, `Unknown source ${id}`);
    assert.ok(
      t.plan.includes(source.function),
      `Missing request instructions: ${t.id}/${id}`,
    );
    assert.ok(
      t.resources.some((r) => r.url === source.url),
      `Source not copied: ${t.id}/${id}`,
    );
    assert.ok(!("apikey" in source.params), "Credential parameter in catalog");
    assert.match(
      source.url,
      /^https:\/\/www\.alphavantage\.co\/documentation\/#/,
    );
    assert.match(source.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
}
console.log(
  `PASS ${quantCourses.length} additive courses, ${Object.keys(curriculum).length} workshops, ${projectTemplates.length} project links, schema limits and source references`,
);
