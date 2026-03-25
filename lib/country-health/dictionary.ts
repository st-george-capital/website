// ─── Master variable dictionary — source of truth for the scoring pipeline ────
//
// Every variable has:
//   pillar          — which of the 5 pillars (or 'overlay') it belongs to
//   code            — World Bank indicator code (primary source)
//   label           — human-readable name
//   unit            — display unit
//   direction       — 'up_good' | 'down_good' (for direction-adjustment before scoring)
//   kind            — 'structural' | 'cyclical'
//   useChange       — whether to blend level (70%) + YoY change (30%) into score
//   why             — 1-sentence explanation shown in UI tooltip
//   weight          — relative weight WITHIN the pillar (will be normalized to sum=1)
//   pillarWeight    — the pillar's weight in the overall core score

export type Pillar =
  | 'productive_capacity'
  | 'human_capital'
  | 'macro_sustainability'
  | 'institutional'
  | 'innovation'
  | 'overlay';

export type Direction = 'up_good' | 'down_good';
export type VariableKind = 'structural' | 'cyclical';

/** How YoY momentum is computed before cross-sectional z-scoring */
export type MomentumMode =
  | 'pp_delta'   // level − prev (pp change for rates / % of GDP)
  | 'pct_change' // (level − prev) / max(|prev|, ε) for ratio-scale series (e.g. debt/GDP)
  | 'growth_pp'; // same as pp_delta; growth-rate indicators

export interface VariableDef {
  id: string;
  pillar: Pillar;
  code: string;               // World Bank indicator code
  label: string;
  unit: string;
  direction: Direction;
  kind: VariableKind;
  useChange: boolean;         // blend level + YoY change?
  momentumMode?: MomentumMode;
  why: string;
  weight: number;             // within-pillar weight (raw, normalized at runtime)
}

// ─── Pillar weights in overall core score ────────────────────────────────────

export const PILLAR_WEIGHTS: Record<Pillar, number> = {
  productive_capacity:   0.25,
  human_capital:         0.15,
  macro_sustainability:  0.20,
  institutional:         0.20,
  innovation:            0.20,
  overlay:               0,   // kept separate, not blended into core
};

export const PILLAR_LABELS: Record<Pillar, string> = {
  productive_capacity:   'Productive Capacity',
  human_capital:         'Human Capital',
  macro_sustainability:  'Macro Sustainability',
  institutional:         'Institutional Reliability',
  innovation:            'Innovation Capability',
  overlay:               'Market Monetization',
};

// ─── Full variable dictionary ─────────────────────────────────────────────────

export const VARIABLES: VariableDef[] = [

  // ── Productive Capacity (25%) ─────────────────────────────────────────────

  {
    id: 'gdp_growth',
    pillar: 'productive_capacity',
    code: 'NY.GDP.MKTP.KD.ZG',
    label: 'Real GDP Growth',
    unit: '% YoY',
    direction: 'up_good',
    kind: 'cyclical',
    useChange: false,
    momentumMode: 'growth_pp',
    why: 'Core measure of whether the economy is expanding in real terms.',
    weight: 3,
  },
  {
    id: 'gdp_per_capita_growth',
    pillar: 'productive_capacity',
    code: 'NY.GDP.PCAP.KD.ZG',
    label: 'GDP per Capita Growth',
    unit: '% YoY',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    momentumMode: 'growth_pp',
    why: 'Productivity and standard-of-living improvement; better than raw GDP.',
    weight: 2,
  },
  {
    id: 'gross_capital_formation',
    pillar: 'productive_capacity',
    code: 'NE.GDI.TOTL.ZS',
    label: 'Gross Capital Formation',
    unit: '% GDP',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Investment into future productive capacity — key leading indicator of growth.',
    weight: 2,
  },
  {
    id: 'manufacturing_va_per_capita',
    pillar: 'productive_capacity',
    code: 'NV.IND.MANF.KD',
    label: 'Manufacturing VA (per capita)',
    unit: 'constant USD',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Industrial depth without penalizing service-heavy advanced economies (unlike manufacturing % of GDP).',
    weight: 2,
  },
  {
    id: 'exports_pct_gdp',
    pillar: 'productive_capacity',
    code: 'NE.EXP.GNFS.ZS',
    label: 'Exports',
    unit: '% GDP',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Integration into global trade — signals competitiveness and demand.',
    weight: 1,
  },

  // ── Human Capital (15%) ───────────────────────────────────────────────────

  {
    id: 'tertiary_enrollment',
    pillar: 'human_capital',
    code: 'SE.TER.ENRR',
    label: 'Tertiary Education Enrollment',
    unit: '% gross',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Pipeline of skilled workers driving more complex, higher-value industries.',
    weight: 3,
  },
  {
    id: 'secondary_enrollment',
    pillar: 'human_capital',
    code: 'SE.SEC.ENRR',
    label: 'Secondary Education Enrollment',
    unit: '% gross',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Base layer of human capital quality across the broader workforce.',
    weight: 2,
  },
  {
    id: 'labor_force_participation',
    pillar: 'human_capital',
    code: 'SL.TLF.CACT.ZS',
    label: 'Labor Force Participation',
    unit: '%',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'How much of the working-age population is actively engaged in the economy.',
    weight: 2,
  },
  {
    id: 'life_expectancy',
    pillar: 'human_capital',
    code: 'SP.DYN.LE00.IN',
    label: 'Life Expectancy',
    unit: 'years',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Proxy for population health and long-run workforce quality.',
    weight: 1,
  },

  // ── Macro Sustainability (20%) ────────────────────────────────────────────

  {
    id: 'govt_debt_gdp',
    pillar: 'macro_sustainability',
    code: 'GC.DOD.TOTL.GD.ZS',
    label: 'Government Debt',
    unit: '% GDP',
    direction: 'down_good',
    kind: 'structural',
    useChange: true,
    momentumMode: 'pct_change',
    why: 'High and rising debt constrains fiscal capacity and raises solvency risk.',
    weight: 3,
  },
  {
    id: 'inflation',
    pillar: 'macro_sustainability',
    code: 'FP.CPI.TOTL.ZG',
    label: 'Inflation (CPI)',
    unit: '% YoY',
    direction: 'down_good',
    kind: 'cyclical',
    useChange: false,
    momentumMode: 'pp_delta',
    why: 'Unstable inflation erodes real returns, real wages, and policy credibility.',
    weight: 3,
  },
  {
    id: 'current_account',
    pillar: 'macro_sustainability',
    code: 'BN.CAB.XOKA.GD.ZS',
    label: 'Current Account Balance',
    unit: '% GDP',
    direction: 'up_good',
    kind: 'cyclical',
    useChange: true,
    momentumMode: 'pp_delta',
    why: 'Persistent deficits signal external financing vulnerability.',
    weight: 2,
  },
  {
    id: 'fx_reserves',
    pillar: 'macro_sustainability',
    code: 'FI.RES.TOTL.MO',
    label: 'FX Reserves',
    unit: 'months imports',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Crisis buffer — key for EM countries facing sudden stop risk.',
    weight: 2,
  },
  {
    id: 'unemployment',
    pillar: 'macro_sustainability',
    code: 'SL.UEM.TOTL.ZS',
    label: 'Unemployment Rate',
    unit: '%',
    direction: 'down_good',
    kind: 'cyclical',
    useChange: false,
    why: 'Slack in the labor market signals underutilization of productive capacity.',
    weight: 1,
  },

  // ── Institutional Reliability / Regime Risk (20%) ─────────────────────────

  {
    id: 'rule_of_law',
    pillar: 'institutional',
    code: 'RL.EST',
    label: 'Rule of Law',
    unit: 'score (−2.5 to +2.5)',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Property rights and contract enforcement — foundational for long-duration investment.',
    weight: 3,
  },
  {
    id: 'govt_effectiveness',
    pillar: 'institutional',
    code: 'GE.EST',
    label: 'Government Effectiveness',
    unit: 'score',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'State capacity to formulate and deliver sound policy; execution matters.',
    weight: 2,
  },
  {
    id: 'regulatory_quality',
    pillar: 'institutional',
    code: 'RQ.EST',
    label: 'Regulatory Quality',
    unit: 'score',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Predictability of the regulatory environment for firms and investors.',
    weight: 2,
  },
  {
    id: 'control_of_corruption',
    pillar: 'institutional',
    code: 'CC.EST',
    label: 'Control of Corruption',
    unit: 'score',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Capital leakage and inefficiency from corruption erode real economic returns.',
    weight: 2,
  },
  {
    id: 'political_stability',
    pillar: 'institutional',
    code: 'PV.EST',
    label: 'Political Stability',
    unit: 'score',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Low violence and disruption risk preserves planning horizons for firms.',
    weight: 1,
  },
  {
    id: 'voice_accountability',
    pillar: 'institutional',
    code: 'VA.EST',
    label: 'Voice & Accountability',
    unit: 'score',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Limits on arbitrary state intervention — critical proxy for authoritarian risk.',
    weight: 2,
  },

  // ── Innovation / Frontier Capability (20%) ────────────────────────────────

  {
    id: 'rd_expenditure',
    pillar: 'innovation',
    code: 'GB.XPD.RSDV.GD.ZS',
    label: 'R&D Expenditure',
    unit: '% GDP',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Commitment to future knowledge creation — leading indicator of frontier capability.',
    weight: 3,
  },
  {
    id: 'researchers_rd',
    pillar: 'innovation',
    code: 'SP.POP.SCIE.RD.P6',
    label: 'Researchers in R&D',
    unit: 'per million people',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Human depth of the innovation ecosystem — talent base for advanced ideas.',
    weight: 2,
  },
  {
    id: 'patent_applications',
    pillar: 'innovation',
    code: 'IP.PAT.RESD',
    label: 'Patent Applications (residents)',
    unit: 'per million people',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Codified inventive output from resident inventors; per-capita normalized in scoring.',
    weight: 2,
  },
  {
    id: 'ip_receipts',
    pillar: 'innovation',
    code: 'BX.GSR.ROYL.CD',
    label: 'IP Receipts',
    unit: 'USD per capita',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Monetization of ideas — measures whether innovation captures real economic rents.',
    weight: 2,
  },
  {
    id: 'high_tech_exports',
    pillar: 'innovation',
    code: 'TX.VAL.TECH.MF.ZS',
    label: 'High-Tech Exports',
    unit: '% manufactured exports',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Ability to scale advanced production into global trade — most visible expression of innovation.',
    weight: 2,
  },

  // ── Market Monetization Overlay (not blended into core score) ─────────────

  {
    id: 'fdi_inflows',
    pillar: 'overlay',
    code: 'BX.KLT.DINV.WD.GD.ZS',
    label: 'FDI Inflows',
    unit: '% GDP',
    direction: 'up_good',
    kind: 'cyclical',
    useChange: false,
    why: 'Foreign capital committing long-term — signals perceived investability.',
    weight: 2,
  },
  {
    id: 'market_cap_gdp',
    pillar: 'overlay',
    code: 'CM.MKT.LCAP.GD.ZS',
    label: 'Stock Market Cap',
    unit: '% GDP',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Depth of the equity market — determines how much economic value investors can access.',
    weight: 2,
  },
  {
    id: 'listed_companies',
    pillar: 'overlay',
    code: 'CM.MKT.LDOM.NO',
    label: 'Listed Companies',
    unit: 'per million people',
    direction: 'up_good',
    kind: 'structural',
    useChange: false,
    why: 'Market breadth — more listed companies means more opportunity for stock selection.',
    weight: 1,
  },
  {
    id: 'portfolio_inflows',
    pillar: 'overlay',
    code: 'BX.PEF.TOTL.CD.WD',
    label: 'Portfolio Equity Inflows',
    unit: 'USD per capita',
    direction: 'up_good',
    kind: 'cyclical',
    useChange: false,
    why: 'Foreign portfolio buying signals investor confidence in the market.',
    weight: 2,
  },
];

// ─── Helper: get variables by pillar ─────────────────────────────────────────

export function getVariablesByPillar(pillar: Pillar): VariableDef[] {
  return VARIABLES.filter(v => v.pillar === pillar);
}

export function getVariablesByPillarFrom(defs: VariableDef[], pillar: Pillar): VariableDef[] {
  return defs.filter(v => v.pillar === pillar);
}

// ─── Country universe ─────────────────────────────────────────────────────────

export interface CountryDef {
  id: string;         // World Bank ISO2 code
  name: string;
  flag: string;
  region: string;
  population?: number;  // rough magnitude for per-capita normalization
}

export const COUNTRIES: CountryDef[] = [
  { id: 'US', name: 'United States', flag: '🇺🇸', region: 'North America' },
  { id: 'CN', name: 'China',         flag: '🇨🇳', region: 'Asia' },
  { id: 'IN', name: 'India',         flag: '🇮🇳', region: 'Asia' },
  { id: 'DE', name: 'Germany',       flag: '🇩🇪', region: 'Europe' },
  { id: 'JP', name: 'Japan',         flag: '🇯🇵', region: 'Asia' },
  { id: 'KR', name: 'South Korea',   flag: '🇰🇷', region: 'Asia' },
  { id: 'GB', name: 'United Kingdom',flag: '🇬🇧', region: 'Europe' },
  { id: 'BR', name: 'Brazil',        flag: '🇧🇷', region: 'Latin America' },
  { id: 'MX', name: 'Mexico',        flag: '🇲🇽', region: 'Latin America' },
  { id: 'ID', name: 'Indonesia',     flag: '🇮🇩', region: 'Asia' },
  // Expanded peer-set only (sensitivity / larger z-score basket)
  { id: 'FR', name: 'France',        flag: '🇫🇷', region: 'Europe' },
  { id: 'IT', name: 'Italy',         flag: '🇮🇹', region: 'Europe' },
  { id: 'CA', name: 'Canada',        flag: '🇨🇦', region: 'North America' },
  { id: 'AU', name: 'Australia',     flag: '🇦🇺', region: 'Oceania' },
  { id: 'SA', name: 'Saudi Arabia',  flag: '🇸🇦', region: 'Middle East' },
  { id: 'AR', name: 'Argentina',     flag: '🇦🇷', region: 'Latin America' },
  { id: 'TR', name: 'Turkey',        flag: '🇹🇷', region: 'Europe / Asia' },
  { id: 'ZA', name: 'South Africa',  flag: '🇿🇦', region: 'Africa' },
  { id: 'NL', name: 'Netherlands',   flag: '🇳🇱', region: 'Europe' },
  { id: 'CH', name: 'Switzerland',   flag: '🇨🇭', region: 'Europe' },
  { id: 'SE', name: 'Sweden',        flag: '🇸🇪', region: 'Europe' },
  { id: 'SG', name: 'Singapore',     flag: '🇸🇬', region: 'Asia' },
  { id: 'PL', name: 'Poland',        flag: '🇵🇱', region: 'Europe' },
  { id: 'VN', name: 'Vietnam',       flag: '🇻🇳', region: 'Asia' },
];

export const COUNTRY_META: Record<string, CountryDef> = Object.fromEntries(
  COUNTRIES.map(c => [c.id, c])
) as Record<string, CountryDef>;

/** Primary dashboard / default z-score basket — all countries */
export const DEFAULT_PEER_IDS: string[] = COUNTRIES.map(c => c.id);

/** Extended analysis basket for detailed interpretation / sensitivities */
export const ANALYSIS_PEER_IDS: string[] = [...new Set([...DEFAULT_PEER_IDS, 'SG', 'CH', 'VN'])];
