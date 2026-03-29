import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ResearchExportDocument } from '@/components/research/ResearchExportDocument';

export const dynamic = 'force-dynamic';

export default async function ResearchExportPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const report = await prisma.equityResearchReport.findUnique({
    where: { id: params.id },
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

  if (!report) {
    notFound();
  }

  return <ResearchExportDocument report={report as any} />;
}
