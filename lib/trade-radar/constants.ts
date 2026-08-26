export const TRADE_RADAR_COUNTRIES = ['US', 'MX', 'IN', 'VN', 'BR', 'TR'] as const;

export type TradeRadarCountry = (typeof TRADE_RADAR_COUNTRIES)[number];

export const TRADE_RADAR_COUNTRY_META: Record<TradeRadarCountry, {
  label: string;
  importTable: string;
  exportTable: string;
}> = {
  US: { label: 'United States', importTable: 'usimport', exportTable: 'usexport' },
  MX: { label: 'Mexico', importTable: 'mximport', exportTable: 'mxexport' },
  IN: { label: 'India', importTable: 'inimport', exportTable: 'inexport' },
  VN: { label: 'Vietnam', importTable: 'vnimport', exportTable: 'vnexport' },
  BR: { label: 'Brazil', importTable: 'brimport', exportTable: 'brexport' },
  TR: { label: 'Turkey', importTable: 'trimport', exportTable: 'trexport' },
};

export const TRADE_RADAR_MARKET_TAGS = [
  'nearshoring',
  'consumer_demand',
  'industrial_capex',
  'semis_electronics',
  'pharma_healthcare',
  'energy_materials',
  'inflation_input_cost',
  'geopolitical_reroute',
] as const;

export const TRADE_RADAR_SIGNAL_TYPES = [
  'volume_spike',
  'volume_drop',
  'new_relationship_cluster',
  'relationship_loss_cluster',
  'country_substitution',
  'parent_exposure_shift',
  'concentration_risk',
  'value_density_anomaly',
] as const;

export const TRADE_RADAR_SEVERITY_BUCKETS = ['critical', 'high', 'medium', 'watch'] as const;

export const WRDS_DEFAULT_SCHEMA = process.env.WRDS_PANJIVA_SCHEMA || 'panjiva';
export const WRDS_COMPANY_CROSSREF_TABLE = process.env.WRDS_PANJIVA_COMPANY_CROSSREF_TABLE || 'companycrossref';
export const WRDS_DUNS_CROSSREF_TABLE = process.env.WRDS_PANJIVA_DUNS_CROSSREF_TABLE || 'wrds_duns_crossref';
export const WRDS_EIN_CROSSREF_TABLE = process.env.WRDS_PANJIVA_EIN_CROSSREF_TABLE || 'wrds_ein_crossref';

export const WRDS_DATE_CANDIDATES = [
  'shipment_date',
  'shpmtdate',
  'arrival_date',
  'arrivedate',
  'departure_date',
  'departdate',
  'bill_date',
  'date',
  'trad_date',
];

export const DEFAULT_INCREMENTAL_WEEKS = 8;
export const DEFAULT_STORAGE_MONTHS = 36;
export const DEFAULT_SIGNAL_LOOKBACK_WEEKS = 60;
