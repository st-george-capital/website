# Workshop and Academy maintenance

Workshop lives at `/dashboard/workshop`, alongside SGC Courses in the sidebar's **Learning & projects** section.

## Member workflow

Members can create projects from a blank form or one of the project starters. A project contains a research question, Markdown plan, tags, stage, repository, resource links, selected collaborators, milestones and a dated research log. Starters are proposals, with no fabricated results or assignments.

All signed-in users with the `user` or `admin` role can read Workshop. The owner and selected collaborators can edit research details, post updates and manage milestones. Only the owner or an administrator can change collaborators. Removing someone from a project removes their write access and unassigns their milestones. The directory exposes names and IDs, not email addresses or credentials. Selecting collaborators records the project team; it does not send email or other external notifications.

Stages: Idea → Planning → In progress, with Blocked, Completed and Archived available as needed. Archive projects through Edit project rather than deleting their research history. Project edits include a version check: stale saves return a conflict and keep the form open.

## Database setup

Builds compile the application; they no longer run an implicit database schema push or suppress database failures. Apply schema changes explicitly using the appropriate migration credentials.

For Workshop only:

```sh
npm run workshop:setup -- --apply
npm run courses:seed-quant -- --apply
```

The setup script applies only `prisma/migrations/20260909120000_add_workshop/migration.sql`. It creates four tables and their indexes. It does not reset or push the full schema. It is idempotent and prefers `WORKSHOP_MIGRATION_URL`, then `DIRECT_URL`, then `DATABASE_POSTGRES_URL`; without these it tries the configured application connection. Some application roles can write rows but cannot execute DDL. Use a migration-capable connection in that case. Never commit connection strings.

The quant-course seed adds the registered quant and applied research courses only when the course slug is missing. It preserves existing courses and author edits. These additions are published member courses, not example project activity.

## Course content

- Existing courses and lessons remain database-backed and editable through Manage course.
- `lib/learning/quant-courses.ts` contains the initial quant course material used by the additive seed.
- `lib/learning/curriculum.ts` and `quant-workshops.ts` contain the applied workshops, outcomes and checks.
- `lib/learning/editorial.ts` applies exact-match corrections to legacy seed wording at read time. Changes made by authors to that wording are preserved; no automatic database overwrite runs on page load.
- The reader and editor share `LessonContent`. Raw HTML is disabled; Markdown tables scroll within the document on small screens.
- Reading progress is stored per user and course in that browser. It is not server-synchronized or a formal assessment record.

## Project starters

The initial six proposals cover data quality, momentum, volatility targeting, earnings events, news timing and pairs research. Each has a question, a data contract, evaluation criteria, milestones and a link to a prerequisite course. Alpha Vantage access and history vary by function and plan; project creation does not trigger paid calls or launch an ingestion job. The documented sources are linked inside the starter library and courses.

## Verification

```sh
npx tsc --noEmit
node scripts/check-prisma-migrations.js
npm run verify:workshop-api
npm run verify:workshop-browser
node scripts/design/verify-courses.cjs
node scripts/design/audit-dashboard-data.cjs
```

API tests run actual handlers in an isolated database transaction and roll back all temporary records. Browser tests require the local application on port 3000 and Chrome (or the configured browser path); mutations are intercepted and use fixtures. The course-link check follows real authenticated read-only redirects. Course verification reads the existing course material, then tests it through intercepted browser requests.

For new content, follow [Course and project authoring](../contributing/courses-and-projects.md). The expanded starter library also covers macro monitoring, statement-based equity diligence, rolling exposure, FX trend and diversification research.
