import { prisma } from '@/lib/prisma';
import type {
  MarketingCampaignKind,
  MarketingCaptionPack,
  MarketingManualInput,
  MarketingOverrideFields,
  MarketingSourceOption,
  MarketingSourceSnapshot,
  MarketingSourceType,
} from '@/lib/marketing-types';

export type {
  MarketingCampaignKind,
  MarketingCaptionPack,
  MarketingManualInput,
  MarketingOverrideFields,
  MarketingSourceOption,
  MarketingSourceSnapshot,
  MarketingSourceType,
} from '@/lib/marketing-types';

function formatDateLabel(date: Date | string | null | undefined) {
  if (!date) return null;
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(value: number | null | undefined, currency = 'USD') {
  if (value == null || Number.isNaN(value)) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return null;
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
}

function humanizeTeam(team: string | null | undefined) {
  if (!team) return 'SGC';
  return team
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function humanizeRoleTag(roleTag: string | null | undefined, fallbackTeam?: string | null) {
  const cleaned = (roleTag || '').trim();
  if (cleaned) return cleaned;
  return humanizeTeam(fallbackTeam);
}

function extractRoleHighlights(description: string | null | undefined, max = 3) {
  const raw = String(description || '');
  const bulletLines = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean);

  const preferredBulletLines = bulletLines.filter((line) => line.length >= 12);
  if (preferredBulletLines.length >= 2) {
    return preferredBulletLines.slice(0, max).map((line) => clampText(line, 88));
  }

  const sentenceCandidates = raw
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 18);

  if (sentenceCandidates.length > 0) {
    return sentenceCandidates.slice(0, max).map((sentence) => clampText(sentence, 92));
  }

  const clauseCandidates = raw
    .split(/[;•]/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length >= 12);

  return clauseCandidates.slice(0, max).map((clause) => clampText(clause, 88));
}

function clampText(value: string | null | undefined, max = 220) {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function defaultCampaignKindForSourceType(sourceType: MarketingSourceType): MarketingCampaignKind {
  switch (sourceType) {
    case 'job_posting':
      return 'recruiting';
    case 'article':
      return 'article';
    case 'research_report':
      return 'research';
    case 'strategy_document':
      return 'strategy';
    case 'manual':
    default:
      return 'announcement';
  }
}

export function hasMarketingAccess(session: any) {
  return session?.user?.role === 'admin' || session?.user?.role === 'editor';
}

export function applyMarketingOverrides(
  snapshot: MarketingSourceSnapshot,
  overrides?: MarketingOverrideFields | null
): MarketingSourceSnapshot {
  if (!overrides) return snapshot;
  return {
    ...snapshot,
    eyebrow: overrides.eyebrow?.trim() || snapshot.eyebrow,
    subtitle: overrides.subtitle?.trim() || snapshot.subtitle,
    cta: overrides.cta?.trim() || snapshot.cta,
    dateLabel: overrides.dateLabel?.trim() || snapshot.dateLabel,
    imageUrl: overrides.imageUrl?.trim() || snapshot.imageUrl,
    fields: {
      ...snapshot.fields,
      customNote: overrides.customNote?.trim() || snapshot.fields.customNote || '',
    },
  };
}

export function resolveCampaignTitle(snapshot: MarketingSourceSnapshot, overrides?: MarketingOverrideFields | null) {
  if (snapshot.sourceType === 'research_report') {
    return `${snapshot.title} Marketing Pack`;
  }
  if (snapshot.sourceType === 'job_posting') {
    return `${snapshot.title} Recruiting Pack`;
  }
  if (snapshot.sourceType === 'manual') {
    return snapshot.title;
  }
  return `${snapshot.title} Social Pack`;
}

export function buildCaptionPack(snapshot: MarketingSourceSnapshot, overrides?: MarketingOverrideFields | null): MarketingCaptionPack {
  const finalSnapshot = applyMarketingOverrides(snapshot, overrides);
  const customNote = finalSnapshot.fields.customNote ? `${finalSnapshot.fields.customNote}\n\n` : '';

  switch (finalSnapshot.sourceType) {
    case 'job_posting': {
      const team = humanizeRoleTag(finalSnapshot.fields.roleTag, finalSnapshot.fields.team);
      const deadline = finalSnapshot.dateLabel ? `Application deadline: ${finalSnapshot.dateLabel}.` : '';
      return {
        instagram: `${finalSnapshot.title}\n${team}\n\n${clampText(finalSnapshot.summary, 220)}\n${deadline}\n${customNote}${finalSnapshot.cta}\n\n#StGeorgeCapital #FinanceCareers #UniversityOfToronto #BuySide #Recruiting`,
        linkedin: `${finalSnapshot.title} | ${team}\n\n${clampText(finalSnapshot.summary, 320)}\n${deadline}\n${customNote}${finalSnapshot.cta}\n\nSt. George Capital is continuing to build out its student investment platform with high-conviction recruiting across the team.`,
      };
    }
    case 'article': {
      return {
        instagram: `${finalSnapshot.eyebrow}\n${finalSnapshot.title}\n\n${clampText(finalSnapshot.subtitle || finalSnapshot.summary, 240)}\n${customNote}${finalSnapshot.cta}\n\n#StGeorgeCapital #OurTake #Markets #Investing #Research`,
        linkedin: `${finalSnapshot.title}\n\n${clampText(finalSnapshot.summary, 360)}\n${customNote}${finalSnapshot.cta}\n\nPublished by St. George Capital.`,
      };
    }
    case 'research_report': {
      const rec = finalSnapshot.fields.recommendation ? `${String(finalSnapshot.fields.recommendation).toUpperCase()} rating` : null;
      const target = formatCurrency(finalSnapshot.fields.targetPrice, finalSnapshot.fields.currency);
      const upside = formatPercent(finalSnapshot.fields.impliedUpside);
      const summaryLine = [rec, target ? `Target ${target}` : null, upside ? `${upside} implied upside` : null]
        .filter(Boolean)
        .join(' • ');
      return {
        instagram: `${finalSnapshot.title}\n${summaryLine}\n\n${clampText(finalSnapshot.summary, 220)}\n${customNote}${finalSnapshot.cta}\n\n#StGeorgeCapital #EquityResearch #StockMarket #FundamentalResearch`,
        linkedin: `${finalSnapshot.title}\n${summaryLine}\n\n${clampText(finalSnapshot.summary, 360)}\n${customNote}${finalSnapshot.cta}\n\nSt. George Capital equity research.`,
      };
    }
    case 'strategy_document': {
      return {
        instagram: `${finalSnapshot.title}\n\n${clampText(finalSnapshot.summary, 220)}\n${customNote}${finalSnapshot.cta}\n\n#StGeorgeCapital #Strategy #Research #Markets`,
        linkedin: `${finalSnapshot.title}\n\n${clampText(finalSnapshot.summary, 360)}\n${customNote}${finalSnapshot.cta}\n\nPublished by St. George Capital.`,
      };
    }
    case 'manual':
    default:
      return {
        instagram: `${finalSnapshot.title}\n\n${clampText(finalSnapshot.summary, 220)}\n${customNote}${finalSnapshot.cta}\n\n#StGeorgeCapital`,
        linkedin: `${finalSnapshot.title}\n\n${clampText(finalSnapshot.summary, 360)}\n${customNote}${finalSnapshot.cta}\n\nSt. George Capital.`,
      };
  }
}

export async function buildMarketingSourceSnapshot(params: {
  sourceType: MarketingSourceType;
  sourceId?: string | null;
  campaignKind?: MarketingCampaignKind;
  manualInput?: MarketingManualInput | null;
  useExistingSnapshot?: MarketingSourceSnapshot | null;
}) {
  const campaignKind = params.campaignKind || defaultCampaignKindForSourceType(params.sourceType);

  if (params.useExistingSnapshot) {
    return {
      ...params.useExistingSnapshot,
      campaignKind,
    };
  }

  switch (params.sourceType) {
    case 'job_posting': {
      if (!params.sourceId) throw new Error('Job posting source ID is required');
      const posting = await prisma.jobPosting.findUnique({ where: { id: params.sourceId } });
      if (!posting) throw new Error('Job posting not found');
      return {
        sourceType: 'job_posting',
        sourceId: posting.id,
        campaignKind,
        title: posting.title,
        eyebrow: 'ST. GEORGE CAPITAL CAREERS',
        subtitle: clampText(posting.description, 160),
        summary: clampText(posting.description, 260),
        cta: 'Apply on the SGC website.',
        dateLabel: formatDateLabel(posting.endDate),
        imageUrl: null,
        fields: {
          team: posting.team,
          teamLabel: humanizeTeam(posting.team),
          roleTag: posting.roleTag,
          roleTagLabel: humanizeRoleTag(posting.roleTag, posting.team),
          description: posting.description,
          requirements: posting.requirements,
          roleHighlights: extractRoleHighlights(posting.description),
          documentFile: posting.documentFile,
          published: posting.published,
        },
      } satisfies MarketingSourceSnapshot;
    }
    case 'article': {
      if (!params.sourceId) throw new Error('Article source ID is required');
      const article = await prisma.article.findUnique({ where: { id: params.sourceId } });
      if (!article) throw new Error('Article not found');
      return {
        sourceType: 'article',
        sourceId: article.id,
        campaignKind,
        title: article.title,
        eyebrow: 'OUR TAKE',
        subtitle: article.excerpt,
        summary: clampText(article.excerpt, 260),
        cta: article.published ? 'Read the full article via St. George Capital.' : 'Preview the article in the dashboard.',
        dateLabel: formatDateLabel(article.publishedAt || article.createdAt),
        imageUrl: article.coverImage,
        fields: {
          author: article.author,
          division: article.division,
          excerpt: article.excerpt,
          slug: article.slug,
          published: article.published,
        },
      } satisfies MarketingSourceSnapshot;
    }
    case 'research_report': {
      if (!params.sourceId) throw new Error('Research report source ID is required');
      const report = await prisma.equityResearchReport.findUnique({ where: { id: params.sourceId } });
      if (!report) throw new Error('Research report not found');
      return {
        sourceType: 'research_report',
        sourceId: report.id,
        campaignKind,
        title: `${report.companyName} (${report.ticker})`,
        eyebrow: 'EQUITY RESEARCH',
        subtitle: `${report.recommendation.toUpperCase()} · Target ${formatCurrency(report.targetPrice, report.currency) || '—'} · ${formatPercent(report.impliedUpside) || '—'}`,
        summary: clampText(report.concludingSection || report.valuationAnalysis || report.businessModel, 300),
        cta: report.published ? 'Read the full report via St. George Capital.' : 'Preview the report in the dashboard.',
        dateLabel: formatDateLabel(report.reportDate),
        imageUrl: report.coverImage,
        fields: {
          companyName: report.companyName,
          ticker: report.ticker,
          recommendation: report.recommendation,
          targetPrice: report.targetPrice,
          targetPriceFormatted: formatCurrency(report.targetPrice, report.currency),
          currentPrice: report.currentPrice,
          currentPriceFormatted: formatCurrency(report.currentPrice, report.currency),
          impliedUpside: report.impliedUpside,
          impliedUpsideFormatted: formatPercent(report.impliedUpside),
          sector: report.sector,
          currency: report.currency,
          timeHorizon: report.timeHorizon,
          published: report.published,
        },
      } satisfies MarketingSourceSnapshot;
    }
    case 'strategy_document': {
      if (!params.sourceId) throw new Error('Strategy document source ID is required');
      const document = await prisma.strategyDocument.findUnique({ where: { id: params.sourceId } });
      if (!document) throw new Error('Strategy document not found');
      return {
        sourceType: 'strategy_document',
        sourceId: document.id,
        campaignKind,
        title: document.title,
        eyebrow: document.type === 'investment_strategy' ? 'INVESTMENT STRATEGY' : 'INDUSTRY REPORT',
        subtitle: document.executiveSummary || `${document.year} research outlook`,
        summary: clampText(document.executiveSummary || document.content, 300),
        cta: document.documentFile ? 'Explore the full document via St. George Capital.' : 'Read more in the dashboard.',
        dateLabel: formatDateLabel(document.publishDate || document.createdAt),
        imageUrl: document.coverImage,
        fields: {
          type: document.type,
          documentTypeLabel: document.type === 'investment_strategy' ? 'Investment Strategy' : 'Industry Report',
          year: document.year,
          executiveSummary: document.executiveSummary,
          industries: document.industries,
          sectors: document.sectors,
          published: document.published,
        },
      } satisfies MarketingSourceSnapshot;
    }
    case 'manual':
    default: {
      const manual = params.manualInput;
      if (!manual?.title?.trim()) {
        throw new Error('Manual campaign title is required');
      }
      return {
        sourceType: 'manual',
        sourceId: null,
        campaignKind,
        title: manual.title.trim(),
        eyebrow: manual.kicker?.trim() || 'ST. GEORGE CAPITAL',
        subtitle: manual.subtitle?.trim() || '',
        summary: clampText(manual.body, 300),
        cta: manual.cta?.trim() || 'Learn more via St. George Capital.',
        dateLabel: manual.dateLabel?.trim() || null,
        imageUrl: manual.imageUrl?.trim() || null,
        fields: {
          body: manual.body?.trim() || '',
        },
      } satisfies MarketingSourceSnapshot;
    }
  }
}

export async function listMarketingSourceOptions(
  sourceType: Exclude<MarketingSourceType, 'manual'>,
  search?: string | null
): Promise<MarketingSourceOption[]> {
  const query = search?.trim() || '';

  switch (sourceType) {
    case 'job_posting': {
      const postings = await prisma.jobPosting.findMany({
        where: query
          ? {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { roleTag: { contains: query, mode: 'insensitive' } },
                { requirements: { contains: query, mode: 'insensitive' } },
              ],
            }
          : undefined,
        orderBy: [{ published: 'desc' }, { createdAt: 'desc' }],
        take: 30,
      });

      return postings.map((posting) => ({
        id: posting.id,
        title: posting.title,
        subtitle: `${humanizeRoleTag(posting.roleTag, posting.team)}${posting.endDate ? ` · Deadline ${formatDateLabel(posting.endDate)}` : ''}`,
        sourceType,
        published: posting.published,
      }));
    }
    case 'article': {
      const articles = await prisma.article.findMany({
        where: query
          ? {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { excerpt: { contains: query, mode: 'insensitive' } },
                { author: { contains: query, mode: 'insensitive' } },
              ],
            }
          : undefined,
        orderBy: [{ published: 'desc' }, { updatedAt: 'desc' }],
        take: 30,
      });

      return articles.map((article) => ({
        id: article.id,
        title: article.title,
        subtitle: article.excerpt || `By ${article.author}`,
        imageUrl: article.coverImage,
        sourceType,
        published: article.published,
      }));
    }
    case 'research_report': {
      const reports = await prisma.equityResearchReport.findMany({
        where: query
          ? {
              OR: [
                { companyName: { contains: query, mode: 'insensitive' } },
                { ticker: { contains: query, mode: 'insensitive' } },
                { sector: { contains: query, mode: 'insensitive' } },
              ],
            }
          : undefined,
        orderBy: { updatedAt: 'desc' },
        take: 30,
      });

      return reports.map((report) => ({
        id: report.id,
        title: `${report.companyName} (${report.ticker})`,
        subtitle: `${report.recommendation.toUpperCase()} · Target ${formatCurrency(report.targetPrice, report.currency) || '—'}`,
        imageUrl: report.coverImage,
        sourceType,
        published: report.published,
      }));
    }
    case 'strategy_document': {
      const documents = await prisma.strategyDocument.findMany({
        where: query
          ? {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { executiveSummary: { contains: query, mode: 'insensitive' } },
                { year: { contains: query, mode: 'insensitive' } },
              ],
            }
          : undefined,
        orderBy: [{ published: 'desc' }, { publishDate: 'desc' }],
        take: 30,
      });

      return documents.map((document) => ({
        id: document.id,
        title: document.title,
        subtitle: document.executiveSummary || `${document.type === 'investment_strategy' ? 'Investment Strategy' : 'Industry Report'} · ${document.year}`,
        imageUrl: document.coverImage,
        sourceType,
        published: document.published,
      }));
    }
    default:
      return [];
  }
}
