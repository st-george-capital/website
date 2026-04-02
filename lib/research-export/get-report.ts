import { prisma } from '@/lib/prisma';

export async function getResearchExportReport(id: string) {
  return prisma.equityResearchReport.findUnique({
    where: { id },
    include: {
      dcfModel: true,
      versions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      comments: {
        where: { resolved: false },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}
