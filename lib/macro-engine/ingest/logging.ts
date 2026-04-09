import { prisma } from '../db';
import type { IngestResult } from './prices';

/**
 * Writes one IngestLog row per IngestResult via raw SQL to avoid Prisma
 * client regeneration issues across environments.
 * Called after each pipeline stage completes (success or failure).
 */
export async function logIngestRun(result: IngestResult): Promise<void> {
  const now = new Date();
  const errorMsg = result.errors.length > 0
    ? result.errors.slice(0, 5).join('; ')
    : null;

  await prisma.$executeRaw`
    INSERT INTO ingest_log (id, source, "startDate", "endDate", "rowsUpserted", status, "errorMsg", "runAt")
    VALUES (
      gen_random_uuid()::text,
      ${result.source},
      ${now},
      ${now},
      ${result.rowsUpserted},
      ${result.status},
      ${errorMsg},
      ${now}
    )
  `;
}

/**
 * Returns the date of the last successful ingest run for a given source,
 * or null if no successful run exists.
 */
export async function getLastSuccessfulRun(source: string): Promise<Date | null> {
  const rows = await prisma.$queryRaw<{ run_at: Date }[]>`
    SELECT "runAt" AS run_at
    FROM ingest_log
    WHERE source = ${source} AND status = 'success'
    ORDER BY "runAt" DESC
    LIMIT 1
  `;
  return rows.length > 0 ? new Date(rows[0].run_at) : null;
}
