import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface ReportViewer {
  userId: string;
  role?: string | null;
}

interface ReportAccessFields {
  published: boolean;
  createdBy: string;
  collaborators: string[];
}

export const isAdminViewer = (viewer: ReportViewer) => viewer.role === 'admin';

/** Drafts are private to the author, listed collaborators and admins; published reports are visible to every member. */
export function reportVisibilityWhere(viewer: ReportViewer): Prisma.EquityResearchReportWhereInput {
  if (isAdminViewer(viewer)) return {};
  return { OR: [{ published: true }, { createdBy: viewer.userId }, { collaborators: { has: viewer.userId } }] };
}

export function canEditReport(report: ReportAccessFields, viewer: ReportViewer) {
  return isAdminViewer(viewer) || report.createdBy === viewer.userId || report.collaborators.includes(viewer.userId);
}

export function canViewReport(report: ReportAccessFields, viewer: ReportViewer) {
  return report.published || canEditReport(report, viewer);
}

/**
 * Loads only the fields needed for an access decision. Unknown and forbidden reports both resolve to
 * `null` for viewers who cannot see them, so callers can answer 404 without revealing that a draft exists.
 */
export async function findReportAccess(id: string, viewer: ReportViewer) {
  const report = await prisma.equityResearchReport.findUnique({
    where: { id },
    select: { id: true, published: true, createdBy: true, collaborators: true, dcfModelId: true, publishedAt: true },
  });
  if (!report || !canViewReport(report, viewer)) return null;
  return { report, canEdit: canEditReport(report, viewer) };
}

/** A member may link only their own DCF model to a report; admins may link any. */
export async function canLinkDcfModel(dcfModelId: string, viewer: ReportViewer) {
  if (isAdminViewer(viewer)) return true;
  const model = await prisma.savedDCFModel.findUnique({ where: { id: dcfModelId }, select: { userId: true } });
  return model?.userId === viewer.userId;
}
