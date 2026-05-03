import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const appDatasourceUrl = process.env.DATABASE_PRISMA_DATABASE_URL ?? process.env.DATABASE_URL;

export const prisma = globalForPrisma.prisma ?? (
  appDatasourceUrl
    ? new PrismaClient({ datasourceUrl: appDatasourceUrl })
    : new PrismaClient()
);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
