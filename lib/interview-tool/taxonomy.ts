export const ROLE_OPTIONS = [
  { value: 'sales_trading', label: 'Sales & Trading' },
  { value: 'investment_banking', label: 'Investment Banking' },
  { value: 'buyside', label: 'Buyside Investing' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'general_finance', label: 'General Finance' },
  { value: 'behavioural', label: 'Behavioural' },
] as const;

export const QUESTION_TYPE_OPTIONS = [
  { value: 'technical', label: 'Technical' },
  { value: 'market', label: 'Market View' },
  { value: 'fit', label: 'Fit' },
  { value: 'case', label: 'Case / Walkthrough' },
  { value: 'brainteaser', label: 'Brainteaser' },
  { value: 'product', label: 'Product' },
] as const;

export const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
] as const;

export const FIRM_TYPE_OPTIONS = [
  { value: 'investment_bank', label: 'Investment Bank' },
  { value: 'market_maker', label: 'Market Maker' },
  { value: 'prop_trading', label: 'Prop Trading Firm' },
  { value: 'hedge_fund', label: 'Hedge Fund' },
  { value: 'pension', label: 'Pension / Sovereign' },
  { value: 'asset_manager', label: 'Asset Manager' },
  { value: 'consulting_firm', label: 'Consulting Firm' },
  { value: 'general_finance', label: 'General Finance' },
] as const;

export const INTERVIEW_TAXONOMY = {
  sales_trading: [
    { value: 'ai_roles', label: 'AI Roles' },
    { value: 'quant_trading', label: 'Quant Trading' },
    { value: 'quant_research', label: 'Quant Research' },
    { value: 'trading_desk', label: 'Trading Desk' },
    { value: 'options_desk', label: 'Options Desk' },
    { value: 'sales_desk', label: 'Sales Desk' },
    { value: 'bonds', label: 'Bonds' },
    { value: 'equities', label: 'Equities' },
    { value: 'fx', label: 'FX' },
  ],
  investment_banking: [
    { value: 'm_and_a', label: 'M&A' },
    { value: 'industry_groups', label: 'Industry Groups' },
    { value: 'capital_markets', label: 'Capital Markets' },
    { value: 'restructuring', label: 'Restructuring' },
    { value: 'general_ib', label: 'General IB' },
  ],
  buyside: [
    { value: 'hedge_fund', label: 'Hedge Fund' },
    { value: 'pension', label: 'Pension' },
    { value: 'long_only', label: 'Long-Only' },
    { value: 'asset_management', label: 'Asset Management' },
    { value: 'credit', label: 'Credit' },
    { value: 'macro', label: 'Macro' },
  ],
  consulting: [
    { value: 'strategy', label: 'Strategy' },
    { value: 'general_consulting', label: 'General Consulting' },
    { value: 'case_interview', label: 'Case Interview' },
  ],
  general_finance: [],
  behavioural: [],
} as const;

export type InterviewRole = (typeof ROLE_OPTIONS)[number]['value'];
export type InterviewQuestionType = (typeof QUESTION_TYPE_OPTIONS)[number]['value'];
export type InterviewDifficulty = (typeof DIFFICULTY_OPTIONS)[number]['value'];
export type InterviewFirmType = (typeof FIRM_TYPE_OPTIONS)[number]['value'];

export function getRoleLabel(role: string | null | undefined) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role ?? 'Unknown role';
}

export function getSubcategoryOptions(role: string | null | undefined) {
  if (!role) return [];
  return INTERVIEW_TAXONOMY[role as keyof typeof INTERVIEW_TAXONOMY] ?? [];
}

export function getSubcategoryLabel(role: string | null | undefined, subcategory: string | null | undefined) {
  if (!subcategory) return 'General';
  return getSubcategoryOptions(role).find((option) => option.value === subcategory)?.label ?? subcategory;
}

export function slugifyValue(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
