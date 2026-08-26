import { prisma } from '@/lib/prisma';
import type {
  TradeBriefsPayload,
  TradeRadarRefreshPayload,
  TradeRadarSummaryPayload,
  TradeRoutesPayload,
  TradeSignalDetailPayload,
  TradeSignalListItem,
  TradeSignalsPayload,
  TradeWatchlistItemPayload,
  TradeWatchlistsPayload,
} from '@/lib/trade-radar/types';

function toSignalListItem(signal: any): TradeSignalListItem {
  const label = signal.parentEntity?.legalName ?? signal.entity?.legalName ?? signal.themeMap?.themeLabel ?? signal.themeLabel ?? signal.routeKey ?? signal.sourceCountry ?? 'Trade flow';
  return {
    id: signal.id,
    signalWeek: signal.signalWeek.toISOString(),
    signalType: signal.signalType,
    severityBucket: signal.severityBucket,
    status: signal.status,
    signalScore: signal.signalScore,
    title: `${label} · ${signal.signalType.replace(/_/g, ' ')}`,
    explanation: signal.explanation,
    sourceCountry: signal.sourceCountry,
    direction: signal.direction,
    hs6: signal.hs6,
    routeKey: signal.routeKey,
    entityName: signal.entity?.legalName ?? null,
    parentName: signal.parentEntity?.legalName ?? null,
    themeKey: signal.themeKey,
    themeLabel: signal.themeMap?.themeLabel ?? signal.themeLabel ?? null,
    marketTags: signal.marketTags ?? [],
    metrics: {
      rawValue: signal.rawValue,
      baselineMedian: signal.baselineMedian,
      baselineRobustZ: signal.baselineRobustZ,
      shortMomentum: signal.shortMomentum,
      yoyDelta: signal.yoyDelta,
    },
  };
}

export async function getTradeRadarSummary(): Promise<TradeRadarSummaryPayload> {
  const [latestSignal, latestRun] = await Promise.all([
    prisma.tradeSignal.findFirst({ orderBy: { signalWeek: 'desc' }, select: { signalWeek: true } }),
    prisma.tradeIngestRun.findFirst({ orderBy: { startedAt: 'desc' } }),
  ]);

  const latestWeek = latestSignal?.signalWeek ?? null;
  const [activeSignalCount, activeSignals] = latestWeek ? await Promise.all([
    prisma.tradeSignal.count({
      where: {
        signalWeek: latestWeek,
        status: 'active',
        severityBucket: { in: ['critical', 'high'] },
      },
    }),
    prisma.tradeSignal.findMany({
      where: {
        signalWeek: latestWeek,
        status: 'active',
        severityBucket: { in: ['critical', 'high'] },
      },
      include: { entity: true, parentEntity: true, themeMap: true },
      orderBy: { signalScore: 'desc' },
      take: 8,
    }),
  ]) : [0, []];

  const topParent = activeSignals.find((signal) => signal.parentEntity?.legalName);
  const topRoute = activeSignals.find((signal) => signal.signalType === 'country_substitution' || signal.routeKey);
  const topTheme = activeSignals.find((signal) => signal.themeMap?.themeLabel || signal.themeLabel);

  return {
    generatedAt: new Date().toISOString(),
    latestWeek: latestWeek?.toISOString() ?? null,
    totals: {
      activeHighSeveritySignals: activeSignalCount,
      biggestParentAcceleration: topParent?.parentEntity?.legalName ?? null,
      biggestSubstitutionCorridor: topRoute?.routeKey ?? null,
      topTheme: topTheme?.themeMap?.themeLabel ?? topTheme?.themeLabel ?? null,
      coverageHealth: latestRun?.status === 'success' ? 'healthy' : latestRun?.status === 'failed' ? 'watch' : 'unknown',
    },
    topSignals: activeSignals.map(toSignalListItem),
    coverage: {
      latestRunAt: latestRun?.startedAt.toISOString() ?? null,
      latestMode: latestRun?.mode ?? null,
      countries: latestRun?.sourceCountries ?? [],
      unstableCountries: Array.isArray((latestRun?.warnings as any)?.items)
        ? ((latestRun?.warnings as any).items as string[])
            .map((item) => item.split(':')[0])
            .filter((value, index, array) => array.indexOf(value) === index)
        : [],
      warnings: Array.isArray((latestRun?.warnings as any)?.items) ? (latestRun?.warnings as any).items : [],
    },
  };
}

export async function getTradeSignals(args: {
  page?: number;
  pageSize?: number;
  country?: string | null;
  signalType?: string | null;
  themeKey?: string | null;
  severityBucket?: string | null;
  q?: string | null;
}): Promise<TradeSignalsPayload> {
  const latest = await prisma.tradeSignal.findFirst({ orderBy: { signalWeek: 'desc' }, select: { signalWeek: true } });
  const latestWeek = latest?.signalWeek ?? null;
  const page = Math.max(1, args.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, args.pageSize ?? 20));
  const where = latestWeek ? {
    signalWeek: latestWeek,
    ...(args.country ? { sourceCountry: args.country } : {}),
    ...(args.signalType ? { signalType: args.signalType } : {}),
    ...(args.themeKey ? { themeKey: args.themeKey } : {}),
    ...(args.severityBucket ? { severityBucket: args.severityBucket } : {}),
    ...(args.q ? {
      OR: [
        { explanation: { contains: args.q, mode: 'insensitive' as const } },
        { routeKey: { contains: args.q, mode: 'insensitive' as const } },
        { hs6: { contains: args.q, mode: 'insensitive' as const } },
        { themeLabel: { contains: args.q, mode: 'insensitive' as const } },
      ],
    } : {}),
  } : { id: '__none__' };

  const [total, items, distinctCountryRows, distinctThemeRows, distinctTypeRows] = await Promise.all([
    prisma.tradeSignal.count({ where }),
    prisma.tradeSignal.findMany({
      where,
      include: { entity: true, parentEntity: true, themeMap: true },
      orderBy: [{ signalScore: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tradeSignal.findMany({ where: latestWeek ? { signalWeek: latestWeek } : undefined, distinct: ['sourceCountry'], select: { sourceCountry: true } }),
    prisma.tradeSignal.findMany({ where: latestWeek ? { signalWeek: latestWeek } : undefined, distinct: ['themeKey'], select: { themeKey: true } }),
    prisma.tradeSignal.findMany({ where: latestWeek ? { signalWeek: latestWeek } : undefined, distinct: ['signalType'], select: { signalType: true } }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    latestWeek: latestWeek?.toISOString() ?? null,
    total,
    page,
    pageSize,
    filters: {
      countries: distinctCountryRows.map((row) => row.sourceCountry).filter((value): value is string => Boolean(value)),
      signalTypes: distinctTypeRows.map((row) => row.signalType),
      themes: distinctThemeRows.map((row) => row.themeKey).filter((value): value is string => Boolean(value)),
      severityBuckets: ['critical', 'high', 'medium', 'watch'],
    },
    items: items.map(toSignalListItem),
  };
}

export async function getTradeSignalDetail(id: string): Promise<TradeSignalDetailPayload | null> {
  const signal = await prisma.tradeSignal.findUnique({
    where: { id },
    include: { entity: true, parentEntity: true, themeMap: true },
  });
  if (!signal) return null;

  const timeSeries = await prisma.tradeWeeklyAggregate.findMany({
    where: {
      sourceCountry: signal.sourceCountry ?? undefined,
      direction: signal.direction ?? undefined,
      hs6: signal.hs6 ?? undefined,
      routeKey: signal.routeKey ?? undefined,
      entityId: signal.entityId ?? undefined,
      parentEntityId: signal.parentEntityId ?? undefined,
      themeKey: signal.themeKey ?? undefined,
    },
    orderBy: { weekStart: 'asc' },
    take: 20,
  });

  const shipments = await prisma.tradeShipment.findMany({
    where: {
      sourceCountry: signal.sourceCountry ?? undefined,
      hs6: signal.hs6 ?? undefined,
      routeKey: signal.routeKey ?? undefined,
      shipmentDate: { gte: signal.signalWeek },
    },
    include: {
      importerEntity: true,
      exporterEntity: true,
    },
    take: 200,
  });

  const counterparties = new Map<string, { name: string; role: string; shipmentCount: number; totalValue: number }>();
  for (const shipment of shipments) {
    const target = signal.direction === 'import' ? shipment.exporterEntity : shipment.importerEntity;
    const role = signal.direction === 'import' ? 'supplier' : 'buyer';
    const name = target?.legalName ?? target?.normalizedName ?? 'Unknown counterparty';
    const entry = counterparties.get(name) ?? { name, role, shipmentCount: 0, totalValue: 0 };
    entry.shipmentCount += 1;
    entry.totalValue += shipment.customsValue ?? 0;
    counterparties.set(name, entry);
  }

  return {
    signal: {
      ...toSignalListItem(signal),
      detail: {
        ...((signal.detail as Record<string, unknown>) ?? {}),
        entityId: signal.entityId,
        parentEntityId: signal.parentEntityId,
        themeMapId: signal.themeMapId,
      },
    },
    timeSeries: timeSeries.map((row) => ({
      weekStart: row.weekStart.toISOString(),
      shipmentCount: row.shipmentCount,
      totalValue: row.totalValue,
      avgValuePerKg: row.avgValuePerKg,
      uniqueCounterparties: row.uniqueCounterparties,
    })),
    counterparties: [...counterparties.values()]
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 12)
      .map((entry) => ({ ...entry, totalValue: entry.totalValue || null })),
  };
}

export async function getTradeWatchlists(userId: string | null): Promise<TradeWatchlistsPayload> {
  const items = await prisma.tradeWatchlist.findMany({
    where: userId ? { OR: [{ scope: 'team' }, { userId }] } : { scope: 'team' },
    include: {
      entity: true,
      parentEntity: true,
      themeMap: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const latestWeek = await prisma.tradeSignal.findFirst({ orderBy: { signalWeek: 'desc' }, select: { signalWeek: true } });
  const payloadItems: TradeWatchlistItemPayload[] = [];

  for (const item of items) {
    const orFilters: Array<Record<string, string>> = [];
    if (item.entityId) orFilters.push({ entityId: item.entityId });
    if (item.parentEntityId) orFilters.push({ parentEntityId: item.parentEntityId });
    if (item.themeKey) orFilters.push({ themeKey: item.themeKey });
    if (item.hs6) orFilters.push({ hs6: item.hs6 });
    if (item.routeKey) orFilters.push({ routeKey: item.routeKey });

    const latestSignal = latestWeek ? await prisma.tradeSignal.findFirst({
      where: {
        signalWeek: latestWeek.signalWeek,
        OR: orFilters,
      },
      include: { entity: true, parentEntity: true, themeMap: true },
      orderBy: { signalScore: 'desc' },
    }) : null;

    payloadItems.push({
      id: item.id,
      scope: item.scope,
      watchType: item.watchType,
      label: item.label,
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
      latestSignal: latestSignal ? toSignalListItem(latestSignal) : null,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    items: payloadItems,
  };
}

export async function getTradeRoutes(): Promise<TradeRoutesPayload> {
  const latestWeek = await prisma.tradeSignal.findFirst({ orderBy: { signalWeek: 'desc' }, select: { signalWeek: true } });
  const items = latestWeek ? await prisma.tradeSignal.findMany({
    where: {
      signalWeek: latestWeek.signalWeek,
      OR: [{ signalType: 'country_substitution' }, { routeKey: { not: null } }],
    },
    include: { themeMap: true },
    orderBy: { signalScore: 'desc' },
    take: 20,
  }) : [];

  const routeKeys = items.map((item) => item.routeKey).filter((value): value is string => Boolean(value));
  const aggregates = routeKeys.length ? await prisma.tradeWeeklyAggregate.findMany({
    where: {
      weekStart: latestWeek!.signalWeek,
      routeKey: { in: routeKeys },
    },
  }) : [];
  const aggregateByRoute = new Map(aggregates.map((row) => [row.routeKey, row]));

  return {
    generatedAt: new Date().toISOString(),
    latestWeek: latestWeek?.signalWeek.toISOString() ?? null,
    items: items.map((item) => {
      const aggregate = item.routeKey ? aggregateByRoute.get(item.routeKey) : null;
      const [sourceCountry, destinationCountry] = (item.routeKey ?? '->').split('->');
      return {
        routeKey: item.routeKey ?? 'Unknown route',
        sourceCountry: sourceCountry || null,
        destinationCountry: destinationCountry || null,
        themeLabel: item.themeMap?.themeLabel ?? item.themeLabel ?? null,
        score: item.signalScore,
        explanation: item.explanation,
        shipmentCount: aggregate?.shipmentCount ?? item.rawValue ?? null,
        totalValue: aggregate?.totalValue ?? item.materialityValue ?? null,
      };
    }),
  };
}

export async function getTradeBriefs(): Promise<TradeBriefsPayload> {
  const briefs = await prisma.weeklyContent.findMany({
    where: { title: { startsWith: 'Trade Radar Brief' } },
    orderBy: [{ year: 'desc' }, { week: 'desc' }],
    take: 25,
  });

  return {
    generatedAt: new Date().toISOString(),
    items: briefs.map((brief) => ({
      id: brief.id,
      title: brief.title,
      description: brief.description,
      publishDate: brief.publishDate?.toISOString() ?? null,
      published: brief.published,
    })),
  };
}

export function toRefreshPayload(summary: {
  runId: string;
  rawRows: number;
  normalizedRows: number;
  aggregateRows: number;
  signalRows: number;
  briefId: string | null;
}): TradeRadarRefreshPayload {
  return {
    ok: true,
    summary: {
      latestRunId: summary.runId,
      rawRows: summary.rawRows,
      normalizedRows: summary.normalizedRows,
      aggregateRows: summary.aggregateRows,
      signalRows: summary.signalRows,
      briefId: summary.briefId,
    },
  };
}
