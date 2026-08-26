import { prisma } from '@/lib/prisma';
import {
  DEFAULT_INCREMENTAL_WEEKS,
  DEFAULT_SIGNAL_LOOKBACK_WEEKS,
  DEFAULT_STORAGE_MONTHS,
  TRADE_RADAR_COUNTRIES,
  TRADE_RADAR_COUNTRY_META,
  WRDS_COMPANY_CROSSREF_TABLE,
  WRDS_DEFAULT_SCHEMA,
  WRDS_DUNS_CROSSREF_TABLE,
  WRDS_EIN_CROSSREF_TABLE,
} from '@/lib/trade-radar/constants';
import { buildCrossRefMaps, normalizeTradeRow } from '@/lib/trade-radar/normalize';
import { DEFAULT_THEME_MAPS, matchTheme } from '@/lib/trade-radar/theme-map';
import type { EntityDraft, NormalizedTradeRow, TradeAggregateBucket, TradeSignalDraft } from '@/lib/trade-radar/types';
import {
  average,
  computeHhi,
  coverageStatus,
  formatWeekLabel,
  hashKey,
  median,
  normalizeName,
  percentDelta,
  robustZ,
  rollingWindowDates,
  seasonFromDate,
  signalBucket,
  startOfTradeWeek,
} from '@/lib/trade-radar/utils';
import { withWrdsClient } from '@/lib/trade-radar/wrds';
import { getISOWeek, subMonths, subWeeks } from 'date-fns';

type UpsertEntityCache = Map<string, string>;

function entityCacheKey(entity: EntityDraft) {
  return [
    entity.panjivaCompanyId ?? '',
    entity.ciqCompanyId ?? '',
    entity.duns ?? '',
    entity.ein ?? '',
    entity.normalizedName,
  ].join('|');
}

async function syncDefaultThemeMaps() {
  for (const entry of DEFAULT_THEME_MAPS) {
    await prisma.tradeThemeMap.upsert({
      where: { hs6: entry.hs6 },
      update: {
        hs4: entry.hs4,
        themeKey: entry.themeKey,
        themeLabel: entry.themeLabel,
        marketTags: entry.marketTags,
        notes: entry.notes ?? null,
      },
      create: {
        hs6: entry.hs6,
        hs4: entry.hs4,
        themeKey: entry.themeKey,
        themeLabel: entry.themeLabel,
        marketTags: entry.marketTags,
        notes: entry.notes ?? null,
      },
    });
  }
}

async function findOrCreateEntity(entity: EntityDraft | null, cache: UpsertEntityCache): Promise<string | null> {
  if (!entity) return null;
  const key = entityCacheKey(entity);
  if (cache.has(key)) return cache.get(key)!;

  const orFilters: Array<Record<string, string>> = [];
  if (entity.panjivaCompanyId) orFilters.push({ panjivaCompanyId: entity.panjivaCompanyId });
  if (entity.ciqCompanyId) orFilters.push({ ciqCompanyId: entity.ciqCompanyId });
  if (entity.duns) orFilters.push({ duns: entity.duns });
  if (entity.ein) orFilters.push({ ein: entity.ein });
  orFilters.push({ normalizedName: entity.normalizedName });

  const existing = await prisma.tradeEntity.findFirst({
    where: {
      OR: orFilters,
    },
  });

  const roles = Array.from(new Set(entity.roles));
  const record = existing
    ? await prisma.tradeEntity.update({
        where: { id: existing.id },
        data: {
          legalName: entity.legalName ?? existing.legalName,
          country: entity.country ?? existing.country,
          roles: Array.from(new Set([...(existing.roles ?? []), ...roles])),
          ciqCompanyId: existing.ciqCompanyId ?? entity.ciqCompanyId,
          ciqUltimateParentId: existing.ciqUltimateParentId ?? entity.ciqUltimateParentId,
          duns: existing.duns ?? entity.duns,
          ultimateParentDuns: existing.ultimateParentDuns ?? entity.ultimateParentDuns,
          ein: existing.ein ?? entity.ein,
          ultimateParentEin: existing.ultimateParentEin ?? entity.ultimateParentEin,
          confidence: existing.confidence === 'exact_crossref' ? existing.confidence : entity.confidence,
          panjivaCompanyId: existing.panjivaCompanyId ?? entity.panjivaCompanyId,
        },
      })
    : await prisma.tradeEntity.create({
        data: {
          panjivaCompanyId: entity.panjivaCompanyId,
          normalizedName: entity.normalizedName,
          legalName: entity.legalName,
          country: entity.country,
          roles,
          ciqCompanyId: entity.ciqCompanyId,
          ciqUltimateParentId: entity.ciqUltimateParentId,
          duns: entity.duns,
          ultimateParentDuns: entity.ultimateParentDuns,
          ein: entity.ein,
          ultimateParentEin: entity.ultimateParentEin,
          confidence: entity.confidence,
        },
      });

  cache.set(key, record.id);
  return record.id;
}

function normalizeForAggregation(shipments: Awaited<ReturnType<typeof prisma.tradeShipment.findMany>>) {
  const aggregates = new Map<string, {
    bucket: TradeAggregateBucket;
    values: number[];
    counterparties: Set<string>;
    relationPairs: Set<string>;
    supplierCounts: Map<string, number>;
    buyerCounts: Map<string, number>;
    originCounts: Map<string, number>;
    destinationCounts: Map<string, number>;
  }>();

  for (const shipment of shipments) {
    const entityId = shipment.direction === 'import' ? shipment.importerEntityId : shipment.exporterEntityId;
    const parentEntityId = shipment.direction === 'import' ? shipment.importerParentEntityId : shipment.exporterParentEntityId;
    const counterpartyId = shipment.direction === 'import' ? shipment.exporterEntityId : shipment.importerEntityId;

    const sliceSeeds = [
      { kind: 'route', routeKey: shipment.routeKey, entityId: null, parentEntityId: null },
      { kind: 'entity', routeKey: shipment.routeKey, entityId, parentEntityId: null },
      { kind: 'parent', routeKey: shipment.routeKey, entityId: null, parentEntityId },
    ];

    for (const seed of sliceSeeds) {
      if (!seed.routeKey && !seed.entityId && !seed.parentEntityId) continue;
      const sliceKey = hashKey([
        seed.kind,
        shipment.sourceCountry,
        shipment.direction,
        shipment.hs6,
        seed.routeKey,
        seed.entityId,
        seed.parentEntityId,
        shipment.themeKey,
      ]);

      const entry = aggregates.get(sliceKey) ?? {
        bucket: {
          sliceKey,
          weekStart: shipment.weekStart,
          sourceCountry: shipment.sourceCountry,
          direction: shipment.direction,
          hs6: shipment.hs6,
          hs4: shipment.hs4,
          routeKey: seed.routeKey,
          entityId: seed.entityId,
          parentEntityId: seed.parentEntityId,
          themeMapId: null,
          themeKey: shipment.themeKey,
          themeLabel: null,
          shipmentCount: 0,
          totalValue: 0,
          totalWeightKg: 0,
          avgValuePerKg: null,
          medianValuePerKg: null,
          uniqueCounterparties: 0,
          newRelationships: 0,
          lostRelationships: 0,
          supplierConcentration: null,
          buyerConcentration: null,
          originConcentration: null,
          destinationConcentration: null,
          coverageScore: null,
          coverageStatus: 'unknown',
        },
        values: [],
        counterparties: new Set<string>(),
        relationPairs: new Set<string>(),
        supplierCounts: new Map<string, number>(),
        buyerCounts: new Map<string, number>(),
        originCounts: new Map<string, number>(),
        destinationCounts: new Map<string, number>(),
      };

      entry.bucket.shipmentCount += 1;
      entry.bucket.totalValue = (entry.bucket.totalValue ?? 0) + (shipment.customsValue ?? 0);
      entry.bucket.totalWeightKg = (entry.bucket.totalWeightKg ?? 0) + (shipment.weightKg ?? 0);
      if (shipment.valuePerKg != null) entry.values.push(shipment.valuePerKg);
      if (counterpartyId) entry.counterparties.add(counterpartyId);
      entry.relationPairs.add(`${shipment.importerEntityId ?? 'unknown'}::${shipment.exporterEntityId ?? 'unknown'}`);

      const supplierKey = shipment.exporterEntityId ?? shipment.originCountry ?? 'unknown';
      const buyerKey = shipment.importerEntityId ?? shipment.destinationCountry ?? 'unknown';
      const originKey = shipment.originCountry ?? 'unknown';
      const destinationKey = shipment.destinationCountry ?? 'unknown';
      entry.supplierCounts.set(supplierKey, (entry.supplierCounts.get(supplierKey) ?? 0) + 1);
      entry.buyerCounts.set(buyerKey, (entry.buyerCounts.get(buyerKey) ?? 0) + 1);
      entry.originCounts.set(originKey, (entry.originCounts.get(originKey) ?? 0) + 1);
      entry.destinationCounts.set(destinationKey, (entry.destinationCounts.get(destinationKey) ?? 0) + 1);

      aggregates.set(sliceKey, entry);
    }
  }

  return aggregates;
}

async function recomputeAggregates(options?: { startDate?: Date; endDate?: Date }) {
  const { storageStart, end } = rollingWindowDates();
  const startDate = options?.startDate ?? storageStart;
  const endDate = options?.endDate ?? end;

  const shipments = await prisma.tradeShipment.findMany({
    where: {
      shipmentDate: { gte: startDate, lte: endDate },
      sourceCountry: { in: [...TRADE_RADAR_COUNTRIES] },
    },
    orderBy: [{ weekStart: 'asc' }, { shipmentDate: 'asc' }],
  });

  const themeMapRows = await prisma.tradeThemeMap.findMany();
  const themeByKey = new Map(themeMapRows.map((row) => [row.themeKey, row]));
  const aggregateMap = normalizeForAggregation(shipments);
  const bySliceHistory = new Map<string, Array<{ weekStart: Date; relations: Set<string> }>>();

  for (const entry of aggregateMap.values()) {
    const history = bySliceHistory.get(entry.bucket.sliceKey) ?? [];
    history.push({ weekStart: entry.bucket.weekStart, relations: entry.relationPairs });
    bySliceHistory.set(entry.bucket.sliceKey, history);
  }

  const aggregateRows: TradeAggregateBucket[] = [];
  for (const entry of aggregateMap.values()) {
    const themeMap = entry.bucket.themeKey ? themeByKey.get(entry.bucket.themeKey) ?? null : null;
    const history = (bySliceHistory.get(entry.bucket.sliceKey) ?? []).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
    const currentIndex = history.findIndex((row) => row.weekStart.getTime() === entry.bucket.weekStart.getTime());
    const previous = currentIndex > 0 ? history[currentIndex - 1] : null;

    const newRelationships = previous
      ? [...entry.relationPairs].filter((pair) => !previous.relations.has(pair)).length
      : entry.relationPairs.size;
    const lostRelationships = previous
      ? [...previous.relations].filter((pair) => !entry.relationPairs.has(pair)).length
      : 0;

    const coverageRaw = average([
      entry.bucket.totalValue ? 1 : 0,
      entry.bucket.totalWeightKg ? 1 : 0,
      entry.values.length ? 1 : 0,
    ]);

    aggregateRows.push({
      ...entry.bucket,
      themeMapId: themeMap?.id ?? null,
      themeLabel: themeMap?.themeLabel ?? entry.bucket.themeLabel,
      avgValuePerKg: average(entry.values),
      medianValuePerKg: median(entry.values),
      uniqueCounterparties: entry.counterparties.size,
      newRelationships,
      lostRelationships,
      supplierConcentration: computeHhi([...entry.supplierCounts.values()]),
      buyerConcentration: computeHhi([...entry.buyerCounts.values()]),
      originConcentration: computeHhi([...entry.originCounts.values()]),
      destinationConcentration: computeHhi([...entry.destinationCounts.values()]),
      coverageScore: coverageRaw,
      coverageStatus: coverageStatus(coverageRaw),
    });
  }

  await prisma.tradeWeeklyAggregate.deleteMany({
    where: {
      weekStart: { gte: startDate, lte: endDate },
      sourceCountry: { in: [...TRADE_RADAR_COUNTRIES] },
    },
  });

  for (const row of aggregateRows) {
    await prisma.tradeWeeklyAggregate.create({
      data: row,
    });
  }

  return aggregateRows.length;
}

function makeSignalTitle(signalType: string, label: string | null, routeKey: string | null, sourceCountry: string | null) {
  const subject = label ?? routeKey ?? sourceCountry ?? 'Trade flow';
  return `${subject} · ${signalType.replace(/_/g, ' ')}`;
}

function explainSignal(signalType: string, args: {
  label: string | null;
  current: Pick<TradeAggregateBucket, 'shipmentCount' | 'newRelationships' | 'lostRelationships' | 'routeKey' | 'sourceCountry'>;
  zScore: number | null;
  baselineMedian: number | null;
  yoyDelta: number | null;
}) {
  const label = args.label ?? args.current.routeKey ?? args.current.sourceCountry;
  if (signalType === 'volume_spike') {
    return `${label} accelerated to ${args.current.shipmentCount} weekly shipments versus a ${Math.round(args.baselineMedian ?? 0)} median baseline, with a robust surprise of ${args.zScore?.toFixed(1) ?? 'n/a'} sigma.`;
  }
  if (signalType === 'volume_drop') {
    return `${label} fell to ${args.current.shipmentCount} weekly shipments versus a ${Math.round(args.baselineMedian ?? 0)} median baseline, suggesting a meaningful trade slowdown.`;
  }
  if (signalType === 'new_relationship_cluster') {
    return `${label} formed ${args.current.newRelationships} new buyer-seller relationships this week, a step-change versus its historical run rate.`;
  }
  if (signalType === 'relationship_loss_cluster') {
    return `${label} lost ${args.current.lostRelationships} previously observed relationships this week, which can indicate demand loss or sourcing churn.`;
  }
  if (signalType === 'concentration_risk') {
    return `${label} became more concentrated this week, raising dependency risk across counterparties or geographies.`;
  }
  if (signalType === 'value_density_anomaly') {
    return `${label} showed an unusual move in customs value per kilogram, which can point to mix shift, pricing pressure, or margin stress.`;
  }
  if (signalType === 'parent_exposure_shift') {
    return `${label} registered a sharp parent-level exposure change, with year-over-year movement of ${args.yoyDelta != null ? `${(args.yoyDelta * 100).toFixed(0)}%` : 'n/a'}.`;
  }
  return `${label} shows rerouting evidence as trade share moved across origin countries within the same corridor and product cluster.`;
}

async function recomputeSignals() {
  const latestWeek = await prisma.tradeWeeklyAggregate.findFirst({
    orderBy: { weekStart: 'desc' },
    select: { weekStart: true },
  });

  if (!latestWeek) {
    await prisma.tradeSignal.deleteMany();
    return 0;
  }

  const signalStart = subWeeks(latestWeek.weekStart, DEFAULT_SIGNAL_LOOKBACK_WEEKS);
  const aggregates = await prisma.tradeWeeklyAggregate.findMany({
    where: { weekStart: { gte: signalStart, lte: latestWeek.weekStart } },
    orderBy: [{ sliceKey: 'asc' }, { weekStart: 'asc' }],
  });

  const themeMapRows = await prisma.tradeThemeMap.findMany();
  const themeByKey = new Map(themeMapRows.map((row) => [row.themeKey, row]));
  const bySlice = new Map<string, typeof aggregates>();

  for (const aggregate of aggregates) {
    const list = bySlice.get(aggregate.sliceKey) ?? [];
    list.push(aggregate);
    bySlice.set(aggregate.sliceKey, list);
  }

  const drafts: TradeSignalDraft[] = [];

  for (const history of bySlice.values()) {
    const current = history[history.length - 1];
    if (!current || current.weekStart.getTime() !== latestWeek.weekStart.getTime()) continue;

    const previousWeeks = history.slice(0, -1);
    const countHistory = previousWeeks.map((row) => row.shipmentCount).filter((value) => value > 0);
    const valuePerKgHistory = previousWeeks.map((row) => row.avgValuePerKg).filter((value): value is number => value != null);
    const validWeeks = previousWeeks.length;
    const baselineMedian = median(countHistory);
    const zScore = robustZ(current.shipmentCount, countHistory);
    const recentFour = previousWeeks.slice(-4).map((row) => row.shipmentCount);
    const shortMomentum = percentDelta(current.shipmentCount, average(recentFour));
    const yoyRef = previousWeeks.find((row) => formatWeekLabel(row.weekStart) === formatWeekLabel(subWeeks(current.weekStart, 52)));
    const yoyDelta = percentDelta(current.shipmentCount, yoyRef?.shipmentCount ?? null);
    const churn = (current.newRelationships + current.lostRelationships) / Math.max(1, current.shipmentCount);
    const concentrationDelta = percentDelta(current.supplierConcentration ?? null, average(previousWeeks.map((row) => row.supplierConcentration)));
    const materiality = current.totalValue ?? 0;
    const crossSliceConfirmation = [current.routeKey, current.parentEntityId, current.themeKey, current.entityId].filter(Boolean).length / 4;
    const magnitudeScore = Math.min(100, Math.abs((zScore ?? 0) * 18) + Math.abs(shortMomentum ?? 0) * 35);
    const persistenceScore = Math.min(100, Math.abs(shortMomentum ?? 0) * 100);
    const churnScore = Math.min(100, churn * 100);
    const concentrationScore = Math.min(100, Math.abs(concentrationDelta ?? 0) * 120);
    const materialityScore = Math.min(100, Math.log10(Math.max(1, materiality)) * 15);
    const confirmationScore = Math.min(100, crossSliceConfirmation * 100);
    const signalScore = 0.35 * magnitudeScore
      + 0.2 * persistenceScore
      + 0.15 * churnScore
      + 0.1 * concentrationScore
      + 0.1 * materialityScore
      + 0.1 * confirmationScore;

    const themeMap = current.themeKey ? themeByKey.get(current.themeKey) ?? null : null;
    const label = themeMap?.themeLabel ?? current.themeLabel ?? null;
    const common = {
      signalWeek: current.weekStart,
      sourceCountry: current.sourceCountry,
      direction: current.direction,
      hs6: current.hs6,
      hs4: current.hs4,
      routeKey: current.routeKey,
      entityId: current.entityId,
      parentEntityId: current.parentEntityId,
      themeMapId: current.themeMapId,
      themeKey: current.themeKey,
      themeLabel: themeMap?.themeLabel ?? current.themeLabel,
      signalScore: Number(signalScore.toFixed(2)),
      rawValue: current.shipmentCount,
      baselineMedian,
      baselineRobustZ: zScore,
      shortMomentum,
      yoyDelta,
      counterpartyChurn: churn,
      concentrationDelta,
      materialityValue: current.totalValue,
      crossSliceConfirmation,
      coverageValidWeeks: validWeeks,
      coverageStatus: current.coverageStatus,
      marketTags: themeMap?.marketTags ?? [],
    };

    const status = validWeeks < 26 || current.coverageStatus === 'unstable' ? 'suppressed' : 'active';

    if ((zScore ?? 0) >= 1.5 || (shortMomentum ?? 0) >= 0.35) {
      drafts.push({
        ...common,
        signalType: current.parentEntityId ? 'parent_exposure_shift' : 'volume_spike',
        status,
        severityBucket: signalBucket(signalScore),
        explanation: explainSignal(current.parentEntityId ? 'parent_exposure_shift' : 'volume_spike', { label, current, zScore, baselineMedian, yoyDelta }),
        detail: { sliceKey: current.sliceKey, shipmentCount: current.shipmentCount },
      });
    }

    if ((zScore ?? 0) <= -1.5 || (shortMomentum ?? 0) <= -0.35) {
      drafts.push({
        ...common,
        signalType: 'volume_drop',
        status,
        severityBucket: signalBucket(signalScore),
        explanation: explainSignal('volume_drop', { label, current, zScore, baselineMedian, yoyDelta }),
        detail: { sliceKey: current.sliceKey, shipmentCount: current.shipmentCount },
      });
    }

    if (current.newRelationships >= Math.max(3, Math.round((baselineMedian ?? 0) * 0.15))) {
      drafts.push({
        ...common,
        signalType: 'new_relationship_cluster',
        status,
        severityBucket: signalBucket(signalScore + 5),
        explanation: explainSignal('new_relationship_cluster', { label, current, zScore, baselineMedian, yoyDelta }),
        detail: { sliceKey: current.sliceKey, newRelationships: current.newRelationships },
      });
    }

    if (current.lostRelationships >= Math.max(3, Math.round((baselineMedian ?? 0) * 0.15))) {
      drafts.push({
        ...common,
        signalType: 'relationship_loss_cluster',
        status,
        severityBucket: signalBucket(signalScore + 5),
        explanation: explainSignal('relationship_loss_cluster', { label, current, zScore, baselineMedian, yoyDelta }),
        detail: { sliceKey: current.sliceKey, lostRelationships: current.lostRelationships },
      });
    }

    if ((concentrationDelta ?? 0) >= 0.2) {
      drafts.push({
        ...common,
        signalType: 'concentration_risk',
        status,
        severityBucket: signalBucket(signalScore),
        explanation: explainSignal('concentration_risk', { label, current, zScore, baselineMedian, yoyDelta }),
        detail: { sliceKey: current.sliceKey, supplierConcentration: current.supplierConcentration },
      });
    }

    const densityZ = robustZ(current.avgValuePerKg, valuePerKgHistory);
    if (Math.abs(densityZ ?? 0) >= 1.75) {
      drafts.push({
        ...common,
        signalType: 'value_density_anomaly',
        status,
        severityBucket: signalBucket(signalScore),
        explanation: explainSignal('value_density_anomaly', { label, current, zScore: densityZ, baselineMedian: median(valuePerKgHistory), yoyDelta }),
        detail: { sliceKey: current.sliceKey, avgValuePerKg: current.avgValuePerKg },
      });
    }
  }

  const routeSignals = drafts.filter((draft) => draft.routeKey && draft.themeKey && (draft.signalType === 'volume_spike' || draft.signalType === 'volume_drop'));
  const routesByTheme = new Map<string, TradeSignalDraft[]>();
  for (const signal of routeSignals) {
    const key = `${signal.sourceCountry}|${signal.direction}|${signal.themeKey}|${signal.hs6 ?? 'none'}`;
    const list = routesByTheme.get(key) ?? [];
    list.push(signal);
    routesByTheme.set(key, list);
  }

  for (const candidates of routesByTheme.values()) {
    if (candidates.length < 2) continue;
    const sorted = [...candidates].sort((a, b) => b.signalScore - a.signalScore);
    const gain = sorted[0];
    const loss = sorted.find((candidate) => candidate.signalType === 'volume_drop');
    if (!loss) continue;
    drafts.push({
      ...gain,
      signalType: 'country_substitution',
      severityBucket: signalBucket((gain.signalScore + loss.signalScore) / 2 + 5),
      explanation: explainSignal('country_substitution', {
        label: `${gain.routeKey} vs ${loss.routeKey}`,
        current: {
          shipmentCount: (gain.rawValue ?? 0) as number,
          routeKey: gain.routeKey,
        } as TradeAggregateBucket,
        zScore: gain.baselineRobustZ,
        baselineMedian: gain.baselineMedian,
        yoyDelta: gain.yoyDelta,
      }),
      detail: {
        gainedRoute: gain.routeKey,
        lostRoute: loss.routeKey,
      },
    });
  }

  await prisma.tradeSignal.deleteMany({ where: { signalWeek: latestWeek.weekStart } });
  for (const draft of drafts) {
    await prisma.tradeSignal.create({ data: { ...draft, detail: draft.detail as any } });
  }
  return drafts.length;
}

async function generateBrief() {
  const latestWeek = await prisma.tradeSignal.findFirst({
    orderBy: { signalWeek: 'desc' },
    select: { signalWeek: true },
  });
  if (!latestWeek) return null;

  const signals = await prisma.tradeSignal.findMany({
    where: { signalWeek: latestWeek.signalWeek, status: 'active' },
    include: {
      entity: true,
      parentEntity: true,
      themeMap: true,
    },
    orderBy: [{ signalScore: 'desc' }],
    take: 20,
  });

  const topSignals = signals.slice(0, 5);
  const topThemes = [...new Map(
    signals
      .filter((signal) => signal.themeKey)
      .map((signal) => [signal.themeKey!, signal.themeMap?.themeLabel ?? signal.themeLabel ?? signal.themeKey!]),
  ).values()].slice(0, 3);
  const topParents = [...new Map(
    signals
      .filter((signal) => signal.parentEntity?.legalName)
      .map((signal) => [signal.parentEntity!.id, signal.parentEntity!.legalName!]),
  ).values()].slice(0, 3);
  const substitutions = signals.filter((signal) => signal.signalType === 'country_substitution').slice(0, 2);
  const suppressed = await prisma.tradeSignal.count({
    where: { signalWeek: latestWeek.signalWeek, status: 'suppressed' },
  });

  const lines = [
    '## Top Signals',
    ...topSignals.map((signal, index) => `${index + 1}. ${signal.explanation}`),
    '',
    '## Emerging Themes',
    ...topThemes.map((theme, index) => `${index + 1}. ${theme}`),
    '',
    '## Names To Watch',
    ...topParents.map((name, index) => `${index + 1}. ${name}`),
    '',
    '## Route Substitutions',
    ...(substitutions.length
      ? substitutions.map((signal, index) => `${index + 1}. ${signal.explanation}`)
      : ['1. No material substitution pattern cleared the scoring threshold this week.']),
    '',
    '## What Could Be Noise',
    `1. ${suppressed} signals were suppressed for coverage or stability reasons; review them before drawing directional conclusions.`,
  ].join('\n');

  const week = getISOWeek(latestWeek.signalWeek);
  const year = String(latestWeek.signalWeek.getUTCFullYear());
  const season = seasonFromDate(latestWeek.signalWeek);
  const title = `Trade Radar Brief - ${formatWeekLabel(latestWeek.signalWeek)}`;

  const existing = await prisma.weeklyContent.findFirst({
    where: { title },
  });

  const record = existing
    ? await prisma.weeklyContent.update({
        where: { id: existing.id },
        data: {
          category: 'news',
          year,
          season,
          week,
          description: `Auto-generated trade radar brief for ${formatWeekLabel(latestWeek.signalWeek)}`,
          contentType: 'markdown',
          content: lines,
          published: false,
          publishDate: null,
        },
      })
    : await prisma.weeklyContent.create({
        data: {
          title,
          category: 'news',
          year,
          season,
          week,
          description: `Auto-generated trade radar brief for ${formatWeekLabel(latestWeek.signalWeek)}`,
          contentType: 'markdown',
          content: lines,
          published: false,
        },
      });

  return record.id;
}

export async function runTradeRadarIngest(options?: {
  fullRefresh?: boolean;
  startDate?: Date;
  endDate?: Date;
  rowLimit?: number | null;
}) {
  const now = new Date();
  const windows = rollingWindowDates();
  const mode = options?.fullRefresh ? 'full' : 'incremental';
  const startDate = options?.startDate ?? (options?.fullRefresh ? subMonths(now, DEFAULT_STORAGE_MONTHS) : subWeeks(now, DEFAULT_INCREMENTAL_WEEKS));
  const endDate = options?.endDate ?? windows.end;
  const ingestRun = await prisma.tradeIngestRun.create({
    data: {
      status: 'running',
      mode,
      sourceWindowStart: startDate,
      sourceWindowEnd: endDate,
      sourceCountries: [...TRADE_RADAR_COUNTRIES],
      warnings: {},
    },
  });

  try {
    await syncDefaultThemeMaps();

    if (options?.fullRefresh) {
      await prisma.tradeShipment.deleteMany({
        where: {
          shipmentDate: { gte: startDate, lte: endDate },
          sourceCountry: { in: [...TRADE_RADAR_COUNTRIES] },
        },
      });
    }

    const fetched = await withWrdsClient(async (client) => {
      const [companyRows, dunsRows, einRows] = await Promise.all([
        client.fetchReferenceRows(WRDS_COMPANY_CROSSREF_TABLE, WRDS_DEFAULT_SCHEMA),
        client.fetchReferenceRows(WRDS_DUNS_CROSSREF_TABLE, WRDS_DEFAULT_SCHEMA),
        client.fetchReferenceRows(WRDS_EIN_CROSSREF_TABLE, WRDS_DEFAULT_SCHEMA),
      ]);

      const crossRefs = buildCrossRefMaps(companyRows, dunsRows, einRows);
      const normalizedRows: NormalizedTradeRow[] = [];
      let rawRows = 0;
      const warnings: string[] = [];

      for (const country of TRADE_RADAR_COUNTRIES) {
        const meta = TRADE_RADAR_COUNTRY_META[country];
        for (const [direction, table] of [['import', meta.importTable], ['export', meta.exportTable]] as const) {
          try {
            const result = await client.fetchTradeRows({
              table,
              schema: WRDS_DEFAULT_SCHEMA,
              startDate,
              endDate,
              limit: options?.rowLimit ?? null,
            });
            rawRows += result.rows.length;
            for (const row of result.rows) {
              const normalized = normalizeTradeRow({
                row,
                sourceCountry: country,
                direction,
                sourceTable: table,
                crossRefs,
              });
              if (normalized) normalizedRows.push(normalized);
            }
          } catch (error) {
            warnings.push(`${country}:${direction} - ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      return { rawRows, normalizedRows, warnings };
    });

    const entityCache: UpsertEntityCache = new Map();
    for (const row of fetched.normalizedRows) {
      const importerEntityId = await findOrCreateEntity(row.importerEntity, entityCache);
      const exporterEntityId = await findOrCreateEntity(row.exporterEntity, entityCache);
      const importerParentEntityId = await findOrCreateEntity(row.importerParentEntity, entityCache);
      const exporterParentEntityId = await findOrCreateEntity(row.exporterParentEntity, entityCache);
      const theme = row.hs6 ? matchTheme(row.hs6, row.productDescription) : null;

      await prisma.tradeShipment.upsert({
        where: { sourceNaturalKey: row.sourceNaturalKey },
        update: {
          weekStart: startOfTradeWeek(row.shipmentDate),
          sourceCountry: row.sourceCountry,
          direction: row.direction,
          shipmentDate: row.shipmentDate,
          arrivalDate: row.arrivalDate,
          departureDate: row.departureDate,
          importerEntityId,
          exporterEntityId,
          importerParentEntityId,
          exporterParentEntityId,
          originCountry: row.originCountry,
          destinationCountry: row.destinationCountry,
          originPort: row.originPort,
          destinationPort: row.destinationPort,
          transportMode: row.transportMode,
          hs6: row.hs6,
          hs4: row.hs4,
          productDescription: row.productDescription,
          quantity: row.quantity,
          weightKg: row.weightKg,
          customsValue: row.customsValue,
          valuePerKg: row.valuePerKg,
          routeKey: row.routeKey,
          themeKey: theme?.themeKey ?? row.themeKey,
          sourceTable: row.sourceTable,
          rawSource: row.rawSource as any,
        },
        create: {
          weekStart: startOfTradeWeek(row.shipmentDate),
          sourceCountry: row.sourceCountry,
          direction: row.direction,
          shipmentDate: row.shipmentDate,
          arrivalDate: row.arrivalDate,
          departureDate: row.departureDate,
          importerEntityId,
          exporterEntityId,
          importerParentEntityId,
          exporterParentEntityId,
          originCountry: row.originCountry,
          destinationCountry: row.destinationCountry,
          originPort: row.originPort,
          destinationPort: row.destinationPort,
          transportMode: row.transportMode,
          hs6: row.hs6,
          hs4: row.hs4,
          productDescription: row.productDescription,
          quantity: row.quantity,
          weightKg: row.weightKg,
          customsValue: row.customsValue,
          valuePerKg: row.valuePerKg,
          routeKey: row.routeKey,
          themeKey: theme?.themeKey ?? row.themeKey,
          sourceTable: row.sourceTable,
          sourceNaturalKey: row.sourceNaturalKey,
          rawSource: row.rawSource as any,
        },
      });
    }

    const aggregateRows = await recomputeAggregates({ startDate: subMonths(now, DEFAULT_STORAGE_MONTHS), endDate });
    const signalRows = await recomputeSignals();
    const briefId = await generateBrief();

    await prisma.tradeIngestRun.update({
      where: { id: ingestRun.id },
      data: {
        status: 'success',
        rawRows: fetched.rawRows,
        normalizedRows: fetched.normalizedRows.length,
        aggregateRows,
        signalRows,
        warnings: { items: fetched.warnings, briefId },
        completedAt: new Date(),
      },
    });

    return {
      runId: ingestRun.id,
      rawRows: fetched.rawRows,
      normalizedRows: fetched.normalizedRows.length,
      aggregateRows,
      signalRows,
      briefId,
      warnings: fetched.warnings,
    };
  } catch (error) {
    await prisma.tradeIngestRun.update({
      where: { id: ingestRun.id },
      data: {
        status: 'failed',
        errorMsg: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function runTradeRadarSignalsOnly() {
  const signalRows = await recomputeSignals();
  return { signalRows };
}

export async function runTradeRadarBriefOnly() {
  const briefId = await generateBrief();
  return { briefId };
}

export async function verifyTradeRadarData(options?: { includeSelfTest?: boolean }) {
  const latestWeek = await prisma.tradeShipment.aggregate({
    _max: { weekStart: true },
  });
  const latest = latestWeek._max.weekStart;
  if (!latest) {
    return { ok: false, reasons: ['No trade shipments found.'], selfTest: options?.includeSelfTest ? runSelfTest() : [] };
  }

  const recent = await prisma.tradeShipment.groupBy({
    by: ['weekStart', 'sourceCountry'],
    where: { weekStart: { gte: subWeeks(latest, 8) } },
    _count: { _all: true },
  });

  const reasons: string[] = [];
  const latestCounts = recent.filter((row) => row.weekStart.getTime() === latest.getTime());
  for (const country of TRADE_RADAR_COUNTRIES) {
    const history = recent.filter((row) => row.sourceCountry === country);
    const current = latestCounts.find((row) => row.sourceCountry === country)?._count._all ?? 0;
    const baseline = average(history.slice(0, -1).map((row) => row._count._all)) ?? 0;
    if (baseline > 0 && current < baseline * 0.35) {
      reasons.push(`${country} latest week row count collapsed vs trailing 8-week median.`);
    }
  }

  const duplicates = await prisma.tradeShipment.groupBy({
    by: ['sourceNaturalKey'],
    _count: { _all: true },
  });
  if (duplicates.some((row) => row._count._all > 1)) reasons.push('Duplicate shipment natural keys detected.');

  const lowConfidenceShare = await prisma.tradeEntity.count({
    where: { confidence: { in: ['name_fallback', 'unresolved'] } },
  });
  const entityCount = await prisma.tradeEntity.count();
  if (entityCount > 0 && lowConfidenceShare / entityCount > 0.5) {
    reasons.push('Parent-link confidence fell below threshold.');
  }

  const latestSignals = await prisma.tradeSignal.findMany({
    where: { signalWeek: latest, status: 'active' },
    take: 25,
  });
  if (latestSignals.length > 0) {
    const unstableShare = latestSignals.filter((signal) => signal.coverageStatus === 'unstable').length / latestSignals.length;
    if (unstableShare > 0.25) reasons.push('Too many top signals come from unstable coverage slices.');
  }

  return {
    ok: reasons.length === 0,
    reasons,
    latestWeek: latest.toISOString(),
    selfTest: options?.includeSelfTest ? runSelfTest() : [],
  };
}

function runSelfTest() {
  const z = robustZ(12, [2, 3, 4, 5, 6, 7, 8]);
  const densityHhi = computeHhi([5, 3, 2]);
  const theme = matchTheme('854231', 'semiconductor controller');
  const normalized = normalizeName('Example Holdings, Inc.');
  const results = [
    { name: 'robust-z-score', ok: z != null && z > 0 },
    { name: 'hhi', ok: densityHhi != null && densityHhi > 0.33 },
    { name: 'theme-match', ok: theme?.themeKey === 'semis_electronics' },
    { name: 'name-normalization', ok: normalized === 'example holdings' },
  ];
  return results;
}
