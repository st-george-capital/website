import { PrismaClient } from '@prisma/client';

const accelerateUrl = process.env.DATABASE_URL ?? process.env.DATABASE_PRISMA_DATABASE_URL;
const directUrlCandidate = process.env.DIRECT_URL ?? process.env.DATABASE_POSTGRES_URL ?? process.env.POSTGRES_URL;
const directUrl = process.env.MACRO_ENGINE_USE_DIRECT_DB === 'true' ? directUrlCandidate : undefined;

const prisma = accelerateUrl
  ? new PrismaClient({ datasourceUrl: accelerateUrl })
  : new PrismaClient();

/**
 * Direct Postgres client that bypasses Prisma Accelerate.
 * Use for bulk read queries that exceed Accelerate limits:
 *   - P6009: Response > 5MB
 *   - P6004: Query > 10s execution time
 *
 * Direct TCP is opt-in because serverless/dev preview runtimes may expose a
 * DATABASE_POSTGRES_URL that is not reachable from the running environment.
 * Falls back to the standard Accelerate client if no direct Postgres URL is set.
 */
export const prismaDirectUrl = directUrl
  ? new PrismaClient({ datasourceUrl: directUrl })
  : prisma;

export interface TimescaleDbStatus {
  mode: 'timescale' | 'plain-postgres';
  available: boolean;
  version: string | null;
}

/**
 * Checks that TimescaleDB is available and enabled on the connected PostgreSQL host.
 * This must be called as the first step in the db bootstrap and ingest orchestrator
 * before any migration or data write.
 *
 * Falls back to plain PostgreSQL if TimescaleDB is absent on this host.
 * That is slower for large historical backtests, but keeps the macro engine
 * runnable on managed Postgres providers that do not ship the extension.
 */
export async function checkTimescaleDb(): Promise<TimescaleDbStatus> {
  const rows = await prisma.$queryRaw<
    Array<{ name: string; installed_version: string | null }>
  >`SELECT name, installed_version FROM pg_available_extensions WHERE name = 'timescaledb'`;

  if (!rows || rows.length === 0) {
    console.warn(
      'TimescaleDB extension not available on this PostgreSQL host. ' +
      'Continuing with plain PostgreSQL fallback. Historical scans may be slower, ' +
      'and Timescale compression/time_bucket() features will be unavailable.'
    );
    return { mode: 'plain-postgres', available: false, version: null };
  }

  const row = rows[0];

  if (row.installed_version === null) {
    console.warn(
      'TimescaleDB is available but not enabled. ' +
      'Continuing with plain PostgreSQL fallback. To enable it later, run: ' +
      'CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;'
    );
    return { mode: 'plain-postgres', available: false, version: null };
  }

  console.log(`TimescaleDB available: version ${row.installed_version}`);

  return { mode: 'timescale', available: true, version: row.installed_version };
}

export { prisma };
