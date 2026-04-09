import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TimescaleDbStatus {
  available: true;
  version: string;
}

/**
 * Checks that TimescaleDB is available and enabled on the connected PostgreSQL host.
 * This must be called as the first step in the db bootstrap and ingest orchestrator
 * before any migration or data write.
 *
 * Exits non-zero with a clear operator message if TimescaleDB is absent or not enabled.
 */
export async function checkTimescaleDb(): Promise<TimescaleDbStatus> {
  const rows = await prisma.$queryRaw<
    Array<{ name: string; installed_version: string | null }>
  >`SELECT name, installed_version FROM pg_available_extensions WHERE name = 'timescaledb'`;

  if (!rows || rows.length === 0) {
    throw new Error(
      'TimescaleDB extension not available on this PostgreSQL host. ' +
      'Install timescaledb or switch to a provider that supports it ' +
      '(e.g. Timescale Cloud, Supabase, Neon with timescaledb enabled). ' +
      'Fallback: use plain PostgreSQL with composite index (ticker, date DESC) — ' +
      'acceptable under 2M rows but loses compression and time_bucket().'
    );
  }

  const row = rows[0];

  if (row.installed_version === null) {
    throw new Error(
      'TimescaleDB is available but not enabled. ' +
      'Run: CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;'
    );
  }

  console.log(`TimescaleDB available: version ${row.installed_version}`);

  return { available: true, version: row.installed_version };
}

export { prisma };
