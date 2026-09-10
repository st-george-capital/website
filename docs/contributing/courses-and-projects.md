# Authoring SGC courses and Workshop projects

This is the implementation contract for human contributors and coding assistants. Read it before changing learning or Workshop content. Follow the user's authorized scope; this document does not require another approval for ordinary implementation or verification.

## Architecture and sources of truth

| Concern | Location | Contract |
|---|---|---|
| Persisted course/lesson content | Prisma `LearningCourse`, `LearningLesson` | Database content is authoritative after creation; authors can edit it |
| Original additive quant seeds | `lib/learning/quant-courses.ts` | Exports `QuantCourseSeed` and the `quantCourses` registry consumed by the seed script |
| Applied research course seeds | `lib/learning/research-courses.ts` | Imported and spread into `quantCourses`; adding a file alone is insufficient |
| Applied workshop registry | `lib/learning/curriculum.ts` | Exact course slug keys; spreads quant/research workshop modules |
| New research workshops | `lib/learning/research-workshops.ts` | `Workshop` objects: outcomes, process or numeric lab, worked case, quiz, rubric, sources, optional project link |
| Numeric labs | `components/learning/course-lab.tsx`, `lib/learning/models.ts` | Supported lab kinds are declared in `curriculum.ts`; new kinds need renderer, model, types and arithmetic checks |
| Reader and Markdown | `course-experience.tsx`, `lesson-content.tsx` under `components/learning/` | Shared by public/member course routes; GFM tables, code and links; raw HTML disabled |
| Course management | `components/learning/course-manager.tsx` | Existing authenticated admin editing workflow |
| Project starter registry | `lib/workshop/templates.ts` | Stable unique IDs; exports `ProjectTemplate`, `projectTemplates` |
| Applied research starters | `lib/workshop/research-templates.ts` | Imported and spread into `projectTemplates`; proposals, not saved projects |
| Existing provider adapters | `lib/alpha-vantage.ts`, `lib/market-data/` | Inspect these before adding ingestion; the repository key is `ALPHA_VANTAGE_API_KEY` |
| Verified endpoint catalog | `lib/workshop/alpha-vantage-sources.ts` | Function, safe sample params, expected root, docs URL, check date, demo evidence and caveat |
| Project form | `components/workshop/project-form.tsx` | Copies starter plan, resources and milestones into a new project; never silently updates existing projects |
| Validation and permissions | `lib/workshop/schema.ts`, `lib/workshop/api.ts`, `app/api/workshop/` | Server validation is authoritative; use shared Prisma/session helpers |
| Additive publication | `scripts/workshop/seed-courses.cjs` | Adds missing course slugs with published lessons; preserves existing slugs and edits |

The authoring registries use type-only cross-imports intentionally. Avoid introducing runtime circular imports. New module exports must be registered; a syntactically valid unused file adds nothing to the product.

## Add a course, end to end

1. Search existing titles, slugs and curriculum keys first. Reuse a relevant course when it already teaches the prerequisite; do not create near-duplicates merely to give every project a unique course.
2. Add a `QuantCourseSeed` to the appropriate seed module or a new module imported into `quantCourses`. Use a unique kebab-case course slug and unique lesson slugs within that course. Keep existing identifiers stable because links and browser progress depend on them.
3. Include a clear summary, tags and a coherent lesson sequence. A substantial applied course should generally have at least four lessons. Each lesson needs a learning objective, explanation, worked calculation or executable example, exercise, failure cases and a deliverable. Length alone is not quality.
4. Add an exact matching key to the applied workshop registry. Choose a supported lab kind. A process lab needs meaningful `steps`; do not pretend it is a numeric simulator. Include outcomes, prerequisites, brief, solution, rubric, sources and a quiz with a correct zero-based answer index and explanation.
5. Set `projectTemplate` to an existing stable starter ID when the course should lead into Workshop. Conversely, each starter's `course` must name an available course slug. Register both ends in the same change.
6. Run `npm run courses:seed-quant` to preview, then `npm run courses:seed-quant -- --apply` to add the authorized missing courses to the configured database. This publishes the additions. Confirm which database environment is configured without printing credentials.
7. Verify the library, internal reader, by-slug redirect, lesson links, applied workshop and project CTA. Merely passing TypeScript does not establish that a persisted course exists.

### Updating an existing course

The seed script deliberately skips existing slugs. Editing a seed file will not change the live course. Use the admin manager or a separately scoped update that compares expected old values and preserves author edits. Never delete/recreate a course to force a refresh. Do not silently rename lesson slugs or erase progress. `lib/learning/editorial.ts` is for narrow legacy corrections, not a replacement database or a blanket rewrite mechanism.

### Markdown and examples

Use `##` headings, real blank lines, GFM tables, fenced code with a language and descriptive links. Do not insert raw HTML, chart screenshots with unreadable text, or literal escaped `\\n` strings in persisted Markdown. Keep units, currencies and dates in tables. Distinguish worked toy inputs from observed research data; never fabricate completed results. Code examples should handle missing values, date ordering, zero denominators and errors in the data they claim to process.

Reuse the navy/slate reader and chart components. Label axes, use thousands separators, keep scales comparable, show the zero reference where relevant, and ensure bridges reconcile to endpoints. Tables should scroll inside their container on mobile. Do not add a second Markdown renderer with different sanitization or styles.

## Add a project starter

A `ProjectTemplate` requires `id`, `title`, `summary`, `hypothesis`, `plan`, `tags`, `course`, `level`, `data` and `milestones`. Applied Alpha Vantage projects also use `sourceIds` and `resources`.

```ts
// Outline only: fill every research section before registering it.
const starter: ProjectTemplate = {
  id: "stable-project-id",
  title: "A concrete research question",
  summary: "Who should build this and what they will learn.",
  hypothesis: "A question whose negative answer is still useful.",
  course: "existing-course-slug",
  level: "Applied Macro",
  tags: ["Macro", "Alpha Vantage"],
  data: "Verified function names, scope, and access caveats.",
  sourceIds: ["treasury"],
  resources: [{ label: "Treasury documentation", url: "https://www.alphavantage.co/documentation/#treasury-yield" }],
  milestones: ["Validate the data", "Implement the baseline", "Review the result"],
  plan: "## Research question\n...\n\n## Data contract\n...",
};
```

Use `Macro`, `Equity` or `Quant` as the research-area tag so the starter filter works. Legacy unclassified starters currently fall under Quant. Add the object to a registered array. Resources are copied into new projects by `ProjectForm`; updating a template must not mutate existing member projects.

A complete plan must specify:

- The research question, manageable initial universe and a stopping criterion.
- Exact endpoints/parameters, expected response roots, field mapping and units; sample identifiers are examples, not guarantees of symbol coverage.
- Access check, initial request budget, caching, raw-data manifest and error handling.
- Observation versus availability timestamps, adjustments, revisions, fiscal periods and currency conventions as relevant.
- Ordered implementation steps and a hand-calculated or deterministic fixture check.
- Baseline, chronological evaluation and costs when reporting strategy performance; descriptive projects must not masquerade as backtests.
- Useful visuals and concrete deliverables, independent review and reproducibility instructions.

Keep within `lib/workshop/schema.ts` limits: title 120, summary 1,000, question 6,000, plan 20,000 characters; at most 8 tags, 12 resource links, 12 starter milestones and 20 collaborators. URLs must be full HTTP(S), without embedded username/password. Resource labels max 80 characters. Do not loosen validation merely to accept overlong generated prose.

## Verify Alpha Vantage sources

Use [official documentation](https://www.alphavantage.co/documentation/), [support](https://www.alphavantage.co/support/) and [plan information](https://www.alphavantage.co/premium/). Do not derive endpoint names from memory or unofficial examples.

1. Read the exact section and verify function, required parameters, optional parameter values, output structure and premium/access notes. Check the fragment anchor resolves to an actual document element.
2. Add or update the endpoint catalog with the actual date checked. Sample params must exclude the API key. Record known limitations alongside the source.
3. If testing an official demo request, inspect the payload, not just HTTP status. Record whether the expected root appeared. A demo Information message means no dataset was verified by that request; it does not prove the endpoint is unavailable to every account.
4. A successful demo does not verify a member's entitlement. Test a configured member key only within the authorized request budget, server-side, without printing URLs or credentials. Do not add a public proxy that spends the shared quota.
5. Reject `Information`, `Note` and `Error Message` payloads, missing required roots and invalid numeric fields. Cache valid responses, use bounded retries, and stop on an entitlement failure. Never retry indefinitely or substitute fabricated data.
6. Check provider terms before redistributing raw responses. Keep keys in `ALPHA_VANTAGE_API_KEY`, never a `NEXT_PUBLIC_` variable. Manifests and hashes must exclude keys.

Current catalog verification on 2026-09-10: all nine catalog functions and sample parameters were checked against official documentation; Treasury and CPI demos returned the expected data root; the other seven demos returned Information. No member-key entitlement test was performed. Refresh this evidence when changing the relevant instructions; do not relabel old evidence with today's date.

## Links, persistence and permissions

- Internal course reader: `/dashboard/learning/courses/[id]`, with `?lesson=slug` or `?workshop=1`; admin manager: `?manage=1`.
- Stable starter-to-course link: `/dashboard/learning/courses/by-slug/[slug]`. The authenticated route resolves the database ID. Next can stream a redirect in a 200 HTML response; tests must check the redirect target, not insist on a 307 response alone.
- Public course route: `/learn/courses/[courseSlug]`; use the existing authentication/publication logic rather than assuming all published content is anonymous.
- Course-to-project link: `/dashboard/workshop?template=stable-id`. It opens a prefilled form, not an automatically saved project.
- Workshop members can read projects. Owner, selected collaborators and admins can edit research details/updates/milestones; only owner/admin can change collaborators. Keep names/IDs in the directory; do not expose emails or passwords.
- Preserve optimistic `version` conflict handling. A failed save must retain the form and edits. Removed collaborators lose write access. Never create fake users, assignments, activity or results as demonstration content.
- Course progress is local to that user/browser; do not describe it as synchronized completion or certification.

## Verification workflow

```sh
npm run verify:content
npx tsc --noEmit
npm run courses:seed-quant          # preview
npm run courses:seed-quant -- --apply  # authorized additive publication
npm run dev -- --port 3000
# In another terminal, with Chrome available:
node scripts/design/verify-courses.cjs
npm run verify:workshop-browser
# If permissions/persistence handlers changed:
npm run verify:workshop-api
# Stop the dev server before building to avoid .next collisions:
npm run build
git diff --check
```

The production build runs `verify:content` automatically. `verify:content` checks registry links, unique identifiers, schema limits, source references, lesson structure and quiz validity. It cannot judge whether a research design is good or whether an account has paid access. Course browser verification reads database content then intercepts browser requests; Workshop browser verification checks real course redirects and uses fixtures for mutations. The API test uses a rollback transaction. Never run unreviewed generated cleanup commands against member records.

Open the source details and test research filters on desktop/mobile; check copied source links in the create dialog and saved project. Update test assertions using registry lengths, not stale fixed counts. Check arithmetic independently rather than merely comparing two copies of the same formula.

Builds do not apply schema changes. New course content and starters normally need no migration. If schema changes are actually required, follow `docs/admin/workshop.md`; never use reset, destructive db push, or swallowed errors. Do not run dev and production builds against the same `.next` directory concurrently.

## Prompt for an LLM contributor

> Read AGENTS.md and docs/contributing/courses-and-projects.md, then inspect the current registries, schema and relevant reader/form components. Add [specific topic] within the existing architecture. Reuse an existing prerequisite course if suitable; otherwise add a registered course, applied workshop and additive seed. Verify each external endpoint in official documentation and record the exact scope of verification. Include a falsifiable question, realistic access plan, timestamp conventions, worked check, baseline, useful visuals and reproducible deliverables. Preserve existing author edits, slugs, member projects and permissions. Run content, type and relevant browser checks; report what changed, what was published, and any access limits that remain untested. Do not invent results, credentials, API capabilities or completed verification.

Before handing off, ask yourself: Does the content exist in the configured database? Do both course/project links resolve? Does the example calculate correctly? Can another member follow the instructions without guessing a data convention? Does the report distinguish what was tested from what was only documented?
