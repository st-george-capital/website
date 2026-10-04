import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ResearchExportDocument } from '@/components/research/ResearchExportDocument';
import { getResearchExportReport } from '@/lib/research-export/get-report';
import { canViewReport } from '@/lib/research/access';

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

  const report = await getResearchExportReport(params.id);

  if (!report || !canViewReport(report, { userId: session.user.id, role: session.user.role })) {
    notFound();
  }

  return <ResearchExportDocument report={report as any} />;
}
