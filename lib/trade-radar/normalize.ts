import type { EntityDraft, EntityConfidence, NormalizedTradeRow, RowRecord } from '@/lib/trade-radar/types';
import { matchTheme } from '@/lib/trade-radar/theme-map';
import { hashKey, normalizeName, pickFirst, safeDate, safeNumber, safeString } from '@/lib/trade-radar/utils';

const IMPORTER_ID_CANDIDATES = ['importer_id', 'consignee_id', 'buyer_id', 'customer_id', 'company_id_1', 'panjiva_importer_id'];
const EXPORTER_ID_CANDIDATES = ['exporter_id', 'shipper_id', 'seller_id', 'supplier_id', 'company_id_2', 'panjiva_exporter_id'];
const IMPORTER_NAME_CANDIDATES = ['importer', 'consignee', 'buyer', 'customer_name', 'importer_name', 'company_name_1'];
const EXPORTER_NAME_CANDIDATES = ['exporter', 'shipper', 'seller', 'supplier_name', 'exporter_name', 'company_name_2'];
const ORIGIN_COUNTRY_CANDIDATES = ['origin_country', 'shipper_country', 'seller_country', 'country_of_origin'];
const DEST_COUNTRY_CANDIDATES = ['destination_country', 'consignee_country', 'buyer_country', 'country_of_destination'];
const ORIGIN_PORT_CANDIDATES = ['origin_port', 'port_of_lading', 'load_port'];
const DEST_PORT_CANDIDATES = ['destination_port', 'port_of_unlading', 'discharge_port'];
const ARRIVAL_DATE_CANDIDATES = ['arrival_date', 'arrivedate'];
const DEPARTURE_DATE_CANDIDATES = ['departure_date', 'departdate'];
const SHIPMENT_DATE_CANDIDATES = ['shipment_date', 'shpmtdate', 'arrival_date', 'departure_date', 'date'];
const HS6_CANDIDATES = ['hs6', 'hs_code', 'hscode', 'commodity_code'];
const DESCRIPTION_CANDIDATES = ['product_description', 'goods_description', 'description', 'goods'];
const VALUE_CANDIDATES = ['customs_value', 'trade_value', 'value_usd', 'value', 'fob_value', 'invoice_value'];
const WEIGHT_CANDIDATES = ['weight_kg', 'weight', 'gross_weight', 'net_weight', 'quantity_weight'];
const QUANTITY_CANDIDATES = ['quantity', 'qty', 'pieces', 'unit_count'];
const MODE_CANDIDATES = ['transport_mode', 'shipment_mode', 'mode', 'transport'];
const UNIQUE_ROW_ID_CANDIDATES = ['shipment_id', 'record_id', 'bill_id', 'transaction_id', 'pk', 'id'];

type CrossRefMaps = {
  byPanjivaId: Map<string, RowRecord>;
  byCiqId: Map<string, RowRecord>;
  byUltimateParentId: Map<string, RowRecord>;
  byDuns: Map<string, RowRecord>;
  byEin: Map<string, RowRecord>;
  byName: Map<string, RowRecord>;
};

function cleanPanjivaId(value: unknown): string | null {
  const str = safeString(value);
  return str ? str.replace(/\s+/g, '') : null;
}

function entityConfidenceFromRef(ref: RowRecord | null, fallbackName: string | null): EntityConfidence {
  if (ref && safeString(pickFirst(ref, ['panjiva_company_id', 'panjivaid', 'company_id']))) return 'exact_crossref';
  if (ref) return 'parent_crossref';
  if (fallbackName) return 'name_fallback';
  return 'unresolved';
}

function toEntityDraft(base: {
  panjivaCompanyId: string | null;
  name: string | null;
  legalName: string | null;
  country: string | null;
  role: 'importer' | 'exporter';
  ref: RowRecord | null;
}): EntityDraft | null {
  const normalized = normalizeName(base.name ?? base.legalName ?? null);
  if (!normalized) return null;

  return {
    panjivaCompanyId: base.panjivaCompanyId,
    normalizedName: normalized,
    legalName: base.legalName ?? base.name ?? null,
    country: base.country,
    roles: [base.role],
    ciqCompanyId: safeString(pickFirst(base.ref ?? {}, ['ciq_company_id', 'companyid', 'ciqcompanyid'])),
    ciqUltimateParentId: safeString(pickFirst(base.ref ?? {}, ['ultimate_parent_company_id', 'ultimateparentcompanyid', 'ultimate_parent_ciq_company_id'])),
    duns: safeString(pickFirst(base.ref ?? {}, ['duns', 'duns_number'])),
    ultimateParentDuns: safeString(pickFirst(base.ref ?? {}, ['ultimate_parent_duns', 'ultimate_parent_duns_number'])),
    ein: safeString(pickFirst(base.ref ?? {}, ['ein', 'ein_number'])),
    ultimateParentEin: safeString(pickFirst(base.ref ?? {}, ['ultimate_parent_ein', 'ultimate_parent_ein_number'])),
    confidence: entityConfidenceFromRef(base.ref, base.name ?? base.legalName ?? null),
  };
}

function toParentDraft(child: EntityDraft | null, ref: RowRecord | null, country: string | null): EntityDraft | null {
  if (!child || !ref) return null;
  const parentId = safeString(pickFirst(ref, ['ultimate_parent_company_id', 'ultimateparentcompanyid', 'ultimate_parent_ciq_company_id']));
  const parentDuns = safeString(pickFirst(ref, ['ultimate_parent_duns', 'ultimate_parent_duns_number']));
  const parentEin = safeString(pickFirst(ref, ['ultimate_parent_ein', 'ultimate_parent_ein_number']));
  if (!parentId && !parentDuns && !parentEin) return null;

  const parentName = safeString(pickFirst(ref, ['ultimate_parent_name', 'ultimateparentname'])) ?? `${child.legalName ?? child.normalizedName} Parent`;

  return {
    panjivaCompanyId: null,
    normalizedName: normalizeName(parentName),
    legalName: parentName,
    country,
    roles: ['parent'],
    ciqCompanyId: parentId,
    ciqUltimateParentId: parentId,
    duns: parentDuns,
    ultimateParentDuns: parentDuns,
    ein: parentEin,
    ultimateParentEin: parentEin,
    confidence: 'parent_crossref',
  };
}

export function buildCrossRefMaps(companyRows: RowRecord[], dunsRows: RowRecord[], einRows: RowRecord[]): CrossRefMaps {
  const maps: CrossRefMaps = {
    byPanjivaId: new Map(),
    byCiqId: new Map(),
    byUltimateParentId: new Map(),
    byDuns: new Map(),
    byEin: new Map(),
    byName: new Map(),
  };

  for (const row of [...companyRows, ...dunsRows, ...einRows]) {
    const panjivaId = cleanPanjivaId(pickFirst(row, ['panjiva_company_id', 'panjivaid', 'company_id']));
    const ciqId = safeString(pickFirst(row, ['ciq_company_id', 'companyid', 'ciqcompanyid']));
    const parentId = safeString(pickFirst(row, ['ultimate_parent_company_id', 'ultimateparentcompanyid', 'ultimate_parent_ciq_company_id']));
    const duns = safeString(pickFirst(row, ['duns', 'duns_number']));
    const ein = safeString(pickFirst(row, ['ein', 'ein_number']));
    const name = normalizeName(safeString(pickFirst(row, ['company_name', 'name', 'legal_name', 'entity_name'])));

    if (panjivaId) maps.byPanjivaId.set(panjivaId, row);
    if (ciqId) maps.byCiqId.set(ciqId, row);
    if (parentId) maps.byUltimateParentId.set(parentId, row);
    if (duns) maps.byDuns.set(duns, row);
    if (ein) maps.byEin.set(ein, row);
    if (name) maps.byName.set(name, row);
  }

  return maps;
}

function findReference(args: {
  panjivaCompanyId: string | null;
  name: string | null;
  maps: CrossRefMaps;
}): RowRecord | null {
  const normalized = normalizeName(args.name);
  return (
    (args.panjivaCompanyId ? args.maps.byPanjivaId.get(args.panjivaCompanyId) : undefined) ??
    (normalized ? args.maps.byName.get(normalized) : undefined) ??
    null
  );
}

export function normalizeTradeRow(args: {
  row: RowRecord;
  sourceCountry: string;
  direction: 'import' | 'export';
  sourceTable: string;
  crossRefs: CrossRefMaps;
}): NormalizedTradeRow | null {
  const shipmentDate = safeDate(pickFirst(args.row, SHIPMENT_DATE_CANDIDATES));
  if (!shipmentDate) return null;

  const importerName = safeString(pickFirst(args.row, IMPORTER_NAME_CANDIDATES));
  const exporterName = safeString(pickFirst(args.row, EXPORTER_NAME_CANDIDATES));
  const importerId = cleanPanjivaId(pickFirst(args.row, IMPORTER_ID_CANDIDATES));
  const exporterId = cleanPanjivaId(pickFirst(args.row, EXPORTER_ID_CANDIDATES));

  const originCountry = safeString(pickFirst(args.row, ORIGIN_COUNTRY_CANDIDATES));
  const destinationCountry = safeString(pickFirst(args.row, DEST_COUNTRY_CANDIDATES));
  const hs = safeString(pickFirst(args.row, HS6_CANDIDATES))?.replace(/\D/g, '').slice(0, 6) ?? null;
  const description = safeString(pickFirst(args.row, DESCRIPTION_CANDIDATES));
  const weightKg = safeNumber(pickFirst(args.row, WEIGHT_CANDIDATES));
  const customsValue = safeNumber(pickFirst(args.row, VALUE_CANDIDATES));
  const quantity = safeNumber(pickFirst(args.row, QUANTITY_CANDIDATES));
  const theme = matchTheme(hs, description);

  const importerRef = findReference({ panjivaCompanyId: importerId, name: importerName, maps: args.crossRefs });
  const exporterRef = findReference({ panjivaCompanyId: exporterId, name: exporterName, maps: args.crossRefs });

  const importerEntity = toEntityDraft({
    panjivaCompanyId: importerId,
    name: importerName,
    legalName: importerName,
    country: destinationCountry ?? args.sourceCountry,
    role: 'importer',
    ref: importerRef,
  });

  const exporterEntity = toEntityDraft({
    panjivaCompanyId: exporterId,
    name: exporterName,
    legalName: exporterName,
    country: originCountry,
    role: 'exporter',
    ref: exporterRef,
  });

  const importerParentEntity = toParentDraft(importerEntity, importerRef, destinationCountry ?? args.sourceCountry);
  const exporterParentEntity = toParentDraft(exporterEntity, exporterRef, originCountry);

  const naturalKeySeed = safeString(pickFirst(args.row, UNIQUE_ROW_ID_CANDIDATES));
  const sourceNaturalKey = naturalKeySeed
    ? hashKey([args.sourceTable, naturalKeySeed])
    : hashKey([args.sourceTable, importerId, exporterId, hs, shipmentDate.toISOString(), customsValue, weightKg, description]);

  return {
    sourceCountry: args.sourceCountry,
    direction: args.direction,
    shipmentDate,
    arrivalDate: safeDate(pickFirst(args.row, ARRIVAL_DATE_CANDIDATES)),
    departureDate: safeDate(pickFirst(args.row, DEPARTURE_DATE_CANDIDATES)),
    importerEntity,
    exporterEntity,
    importerParentEntity,
    exporterParentEntity,
    originCountry,
    destinationCountry,
    originPort: safeString(pickFirst(args.row, ORIGIN_PORT_CANDIDATES)),
    destinationPort: safeString(pickFirst(args.row, DEST_PORT_CANDIDATES)),
    transportMode: safeString(pickFirst(args.row, MODE_CANDIDATES)),
    hs6: hs,
    hs4: hs?.slice(0, 4) ?? null,
    productDescription: description,
    quantity,
    weightKg,
    customsValue,
    valuePerKg: customsValue != null && weightKg != null && weightKg > 0 ? customsValue / weightKg : null,
    routeKey: originCountry && destinationCountry ? `${originCountry}->${destinationCountry}` : null,
    themeKey: theme?.themeKey ?? null,
    themeLabel: theme?.themeLabel ?? null,
    marketTags: theme?.marketTags ?? [],
    sourceTable: args.sourceTable,
    sourceNaturalKey,
    rawSource: args.row,
  };
}
