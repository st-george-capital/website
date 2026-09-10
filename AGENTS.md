# SGC website contributor instructions

For any change to courses, lessons, applied workshops, project starters, or their data sources, read [the course and project authoring guide](docs/contributing/courses-and-projects.md) before editing. It contains the current file map, registration steps, content requirements, database rules, and verification commands.

- Inspect the existing implementation and local changes before editing. Preserve unrelated work.
- Treat course and project slugs as stable public identifiers. Do not rename existing slugs casually.
- Verify external API functions and parameters in official documentation. Distinguish documentation checks, demo checks, and checks with a member's key. Never invent endpoints, access entitlements, research results, or project activity.
- Use the shared course reader, Markdown renderer, lab components, chart theme, and Workshop form. Keep the navy/slate visual language and accessible, responsive layouts.
- Courses are stored in the database; adding a seed file alone does not make a course available. Use the additive seed workflow in the guide. Never reset the database or overwrite existing author edits to refresh seed content.
- Import application database access from `@/lib/prisma`. Never expose credentials in client code, links, fixtures, screenshots, logs, or commits.
- Keep generated artifacts and unrelated local directories out of commits. Run the checks relevant to the change and state what was actually verified.
