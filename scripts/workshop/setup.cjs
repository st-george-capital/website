// Apply only the additive Workshop migration; never push or reset the full schema.
const fs = require("node:fs");
const path = require("node:path");
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
(async () => {
  const sql = fs.readFileSync(
    path.join(
      __dirname,
      "../../prisma/migrations/20260909120000_add_workshop/migration.sql",
    ),
    "utf8",
  );
  if (!process.argv.includes("--apply")) {
    console.log(
      "Additive Workshop migration ready. Run with --apply to create its four tables.",
    );
    return;
  }
  const direct =
    process.env.WORKSHOP_MIGRATION_URL ||
    process.env.DIRECT_URL ||
    process.env.DATABASE_POSTGRES_URL;
  if (direct) {
    const { Client } = require("pg");
    const client = new Client({
      connectionString: direct,
      connectionTimeoutMillis: 8000,
    });
    try {
      await client.connect();
      await client.query("BEGIN");
      for (const statement of sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean))
        await client.query(statement);
      await client.query("COMMIT");
      console.log("Workshop tables and indexes are ready.");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      await client.end();
    }
  } else {
    const p = new PrismaClient({
      datasourceUrl:
        process.env.DATABASE_PRISMA_DATABASE_URL || process.env.DATABASE_URL,
    });
    try {
      await p.$transaction(
        async (tx) => {
          for (const statement of sql
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean))
            await tx.$executeRawUnsafe(statement);
        },
        { timeout: 15000 },
      );
      console.log("Workshop tables and indexes are ready.");
    } finally {
      await p.$disconnect();
    }
  }
})().catch((e) => {
  console.error("Workshop migration failed:", e.code || e.name);
  process.exitCode = 1;
});
