export type RowRecord = Record<string, unknown>;

export type EntityConfidence = 'exact_crossref' | 'parent_crossref' | 'name_fallback' | 'unresolved';

export interface EntityDraft {
  panjivaCompanyId: string | null;
  normalizedName: string;
  legalName: string | null;
  country: string | null;
  roles: string[];
  ciqCompanyId: string | null;
  ciqUltimateParentId: string | null;
  duns: string | null;
  ultimateParentDuns: string | null;
  ein: string | null;
  ultimateParentEin: string | null;
  confidence: EntityConfidence;
}

export interface NormalizedTradeRow {
  sourceCountry: string;
  direction: 'import' | 'export';
  shipmentDate: Date;
  arrivalDate: Date | null;
  departureDate: Date | null;
  importerEntity: EntityDraft | null;
  exporterEntity: EntityDraft | null;
  importerParentEntity: EntityDraft | null;
  exporterParentEntity: EntityDraft | null;
  originCountry: string | null;
  destinationCountry: string | null;
  originPort: string | null;
  destinationPort: string | null;
  transportMode: string | null;
  hs6: string | null;
  hs4: string | null;
  productDescription: string | null;
  quantity: number | null;
  weightKg: number | null;
  customsValue: number | null;
  valuePerKg: number | null;
  routeKey: string | null;
  themeKey: string | null;
  themeLabel: string | null;
  marketTags: string[];
  sourceTable: string;
  sourceNaturalKey: string;
  rawSource: RowRecord;
}

export interface ThemeMatch {
  hs6: string;
  hs4: string;
  themeKey: string;
  themeLabel: string;
  marketTags: string[];
  notes?: string;
}

export interface TradeAggregateBucket {
  sliceKey: string;
  weekStart: Date;
  sourceCountry: string;
  direction: string;
  hs6: string | null;
  hs4: string | null;
  routeKey: string | null;
  entityId: string | null;
  parentEntityId: string | null;
  themeMapId: string | null;
  themeKey: string | null;
  themeLabel: string | null;
  shipmentCount: number;
  totalValue: number | null;
  totalWeightKg: number | null;
  avgValuePerKg: number | null;
  medianValuePerKg: number | null;
  uniqueCounterparties: number;
  newRelationships: number;
  lostRelationships: number;
  supplierConcentration: number | null;
  buyerConcentration: number | null;
  originConcentration: number | null;
  destinationConcentration: number | null;
  coverageScore: number | null;
  coverageStatus: string;
}

export interface TradeSignalDraft {
  signalWeek: Date;
  signalType: string;
  status: string;
  severityBucket: string;
  sourceCountry: string | null;
  direction: string | null;
  hs6: string | null;
  hs4: string | null;
  routeKey: string | null;
  entityId: string | null;
  parentEntityId: string | null;
  themeMapId: string | null;
  themeKey: string | null;
  themeLabel: string | null;
  signalScore: number;
  rawValue: number | null;
  baselineMedian: number | null;
  baselineRobustZ: number | null;
  shortMomentum: number | null;
  yoyDelta: number | null;
  counterpartyChurn: number | null;
  concentrationDelta: number | null;
  materialityValue: number | null;
  crossSliceConfirmation: number | null;
  coverageValidWeeks: number | null;
  coverageStatus: string | null;
  explanation: string;
  marketTags: string[];
  detail: Record<string, unknown>;
}

export interface TradeRadarSummaryPayload {
  generatedAt: string;
  latestWeek: string | null;
  totals: {
    activeHighSeveritySignals: number;
    biggestParentAcceleration: string | null;
    biggestSubstitutionCorridor: string | null;
    topTheme: string | null;
    coverageHealth: string;
  };
  topSignals: TradeSignalListItem[];
  coverage: {
    latestRunAt: string | null;
    latestMode: string | null;
    countries: string[];
    unstableCountries: string[];
    warnings: string[];
  };
}

export interface TradeSignalListItem {
  id: string;
  signalWeek: string;
  signalType: string;
  severityBucket: string;
  status: string;
  signalScore: number;
  title: string;
  explanation: string;
  sourceCountry: string | null;
  direction: string | null;
  hs6: string | null;
  routeKey: string | null;
  entityName: string | null;
  parentName: string | null;
  themeKey: string | null;
  themeLabel: string | null;
  marketTags: string[];
  metrics: {
    rawValue: number | null;
    baselineMedian: number | null;
    baselineRobustZ: number | null;
    shortMomentum: number | null;
    yoyDelta: number | null;
  };
}

export interface TradeSignalsPayload {
  generatedAt: string;
  latestWeek: string | null;
  total: number;
  page: number;
  pageSize: number;
  filters: {
    countries: string[];
    signalTypes: string[];
    themes: string[];
    severityBuckets: string[];
  };
  items: TradeSignalListItem[];
}

export interface TradeSignalDetailPayload {
  signal: TradeSignalListItem & {
    detail: Record<string, unknown>;
  };
  timeSeries: Array<{
    weekStart: string;
    shipmentCount: number;
    totalValue: number | null;
    avgValuePerKg: number | null;
    uniqueCounterparties: number;
  }>;
  counterparties: Array<{
    name: string;
    role: string;
    shipmentCount: number;
    totalValue: number | null;
  }>;
}

export interface TradeWatchlistItemPayload {
  id: string;
  scope: string;
  watchType: string;
  label: string;
  notes: string | null;
  createdAt: string;
  latestSignal: TradeSignalListItem | null;
}

export interface TradeWatchlistsPayload {
  generatedAt: string;
  items: TradeWatchlistItemPayload[];
}

export interface TradeRoutesPayload {
  generatedAt: string;
  latestWeek: string | null;
  items: Array<{
    routeKey: string;
    sourceCountry: string | null;
    destinationCountry: string | null;
    themeLabel: string | null;
    score: number;
    explanation: string;
    shipmentCount: number | null;
    totalValue: number | null;
  }>;
}

export interface TradeBriefsPayload {
  generatedAt: string;
  items: Array<{
    id: string;
    title: string;
    description: string | null;
    publishDate: string | null;
    published: boolean;
  }>;
}

export interface TradeRadarRefreshPayload {
  ok: boolean;
  summary: {
    latestRunId: string | null;
    rawRows: number;
    normalizedRows: number;
    aggregateRows: number;
    signalRows: number;
    briefId: string | null;
  };
}
