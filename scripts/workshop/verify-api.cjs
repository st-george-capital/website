// Exercises real route handlers against an isolated transaction, then rolls back
// all test records. Auth stubs exist only inside this process.
const assert = require("node:assert/strict"),
  path = require("node:path"),
  Module = require("node:module");
require("@next/env").loadEnvConfig(process.cwd());
require("sucrase/register/ts");
const { PrismaClient } = require("@prisma/client"),
  { NextRequest } = require("next/server");
const client = new PrismaClient({
  datasourceUrl:
    process.env.DATABASE_PRISMA_DATABASE_URL || process.env.DATABASE_URL,
});
let session = null,
  db;
const originalLoad = Module._load;
Module._load = function (id, parent, main) {
  if (id === "@/lib/prisma") return { prisma: db };
  if (id === "@/lib/auth") return { getSession: async () => session };
  return originalLoad.call(
    this,
    id.startsWith("@/") ? path.join(process.cwd(), id.slice(2)) : id,
    parent,
    main,
  );
};
const rollback = new Error("WORKSHOP_TEST_ROLLBACK");
(async () => {
  try {
    await client.$transaction(
      async (tx) => {
        db = new Proxy(tx, {
          get(target, key) {
            return key === "$transaction" ? async (fn) => fn(tx) : target[key];
          },
        });
        const owner = await tx.user.create({
          data: {
            email: `workshop-owner-${Date.now()}@example.invalid`,
            passwordHash: "test-only-not-a-password",
            name: "Workshop audit owner",
            role: "user",
          },
        });
        const member = await tx.user.create({
          data: {
            email: `workshop-member-${Date.now()}@example.invalid`,
            passwordHash: "test-only-not-a-password",
            name: "Workshop audit member",
            role: "user",
          },
        });
        const outsider = await tx.user.create({
          data: {
            email: `workshop-outsider-${Date.now()}@example.invalid`,
            passwordHash: "test-only-not-a-password",
            name: "Workshop audit outsider",
            role: "user",
          },
        });
        const route = (name) =>
          require(
            path.join(process.cwd(), `app/api/workshop/${name}/route.ts`),
          );
        const projects = route("projects"),
          detail = route("projects/[id]"),
          updates = route("projects/[id]/updates"),
          milestones = route("projects/[id]/milestones"),
          members = route("members");
        const req = (body, method = "POST") =>
          new NextRequest("http://localhost/api/workshop/projects", {
            method,
            ...(method !== "GET"
              ? {
                  body: JSON.stringify(body),
                  headers: { "Content-Type": "application/json" },
                }
              : {}),
          });
        assert.equal((await projects.GET(req(null, "GET"))).status, 401);
        session = { user: { id: owner.id, role: "visitor" } };
        assert.equal((await members.GET()).status, 403);
        session = { user: { id: owner.id, role: "user" } };
        const input = {
          title: "API audit project",
          summary: "A temporary project to validate access and persistence.",
          hypothesis: "Test a timing convention.",
          plan: "## Test plan\n\nUse an isolated transaction.",
          memberIds: [member.id],
          githubUrl: "https://github.com/st-george-capital/website",
          tags: ["Test"],
          milestones: ["Define the hypothesis"],
        };
        assert.equal(
          (
            await projects.POST(
              req({ ...input, githubUrl: "javascript:alert(1)" }),
            )
          ).status,
          400,
        );
        const created = await projects.POST(req(input));
        assert.equal(created.status, 201);
        const { id } = await created.json();
        const ctx = { params: { id } };
        let view = await (await detail.GET(req(null, "GET"), ctx)).json();
        assert.equal(view.members.length, 1);
        assert.equal(view.milestones.length, 1);
        assert.equal(view.canManage, true);
        const directory = await (await members.GET()).json();
        assert.ok(
          directory.every((p) => !("email" in p) && !("passwordHash" in p)),
        );
        session = { user: { id: outsider.id, role: "user" } };
        assert.equal(
          (await updates.POST(req({ content: "Unauthorized update" }), ctx))
            .status,
          403,
        );
        assert.equal(
          (await detail.PATCH(req({ ...input, version: 1 }, "PATCH"), ctx))
            .status,
          403,
        );
        session = { user: { id: member.id, role: "user" } };
        assert.equal(
          (
            await updates.POST(
              req({
                kind: "decision",
                content: "The baseline and timing convention are frozen.",
              }),
              ctx,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await detail.PATCH(
              req({ ...input, memberIds: [outsider.id], version: 1 }, "PATCH"),
              ctx,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await milestones.POST(
              req({
                title: "Run the baseline",
                assigneeId: member.id,
                dueAt: "2026-10-01T12:00:00.000Z",
              }),
              ctx,
            )
          ).status,
          201,
        );
        assert.equal(
          (
            await milestones.POST(
              req({ title: "Invalid assignee", assigneeId: outsider.id }),
              ctx,
            )
          ).status,
          400,
        );
        const milestone = view.milestones[0];
        assert.equal(
          (
            await milestones.PATCH(
              req({ id: milestone.id, completed: true }, "PATCH"),
              ctx,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await milestones.PATCH(
              req({ id: milestone.id, completed: true }, "PATCH"),
              { params: { id: "missing-project" } },
            )
          ).status,
          404,
        );
        session = { user: { id: owner.id, role: "user" } };
        assert.equal(
          (
            await detail.PATCH(
              req({ ...input, status: "active", version: 1 }, "PATCH"),
              ctx,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await detail.PATCH(
              req({ ...input, status: "planning", version: 1 }, "PATCH"),
              ctx,
            )
          ).status,
          409,
          "stale edits must not overwrite newer work",
        );
        view = await (await detail.GET(req(null, "GET"), ctx)).json();
        assert.equal(view.status, "active");
        assert.equal(view.updates.length, 1);
        assert.ok(view.milestones[0].completed);
        assert.equal(
          (
            await detail.PATCH(
              req({ ...input, memberIds: [], version: 2 }, "PATCH"),
              ctx,
            )
          ).status,
          200,
        );
        session = { user: { id: member.id, role: "user" } };
        assert.equal(
          (await updates.POST(req({ content: "Removed member update" }), ctx))
            .status,
          403,
        );
        session = { user: { id: owner.id, role: "user" } };
        assert.equal(
          (await milestones.DELETE(req({ id: milestone.id }, "DELETE"), ctx))
            .status,
          200,
        );
        console.log(
          "PASS Workshop create/read/edit, collaborators, updates, milestones, URL validation, stale-edit protection and access controls",
        );
        throw rollback;
      },
      { timeout: 15000 },
    );
  } catch (e) {
    if (e !== rollback) throw e;
    console.log("PASS all test records rolled back");
  } finally {
    await client.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
