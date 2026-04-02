export type SupplementaryTab = 'transcript' | 'insider' | 'estimates' | 'calendar' | 'holdings';

export interface SupplementaryEntity {
  query: string | null;
  symbol: string | null;
  companyName: string | null;
}

export interface SupplementaryTranscriptTopic {
  topic: string;
  mentions: number;
}

export interface SupplementaryTranscriptSection {
  label: string;
  paragraphs: string[];
}

export interface SupplementaryTranscriptData {
  selectedQuarter: string | null;
  availableQuarters: string[];
  managementTone: 'constructive' | 'balanced' | 'cautious';
  managementToneDetail: string;
  keyTopics: SupplementaryTranscriptTopic[];
  notableSnippets: string[];
  sections: SupplementaryTranscriptSection[];
}

export interface SupplementaryInsiderSummary {
  buyCount: number;
  sellCount: number;
  transactionCount: number;
  netShares: number;
  mostActiveInsider: string | null;
  clusterActivity: string;
}

export interface SupplementaryInsiderTransaction {
  date: string | null;
  insiderName: string;
  title: string | null;
  action: 'buy' | 'sell' | 'other';
  shares: number | null;
  sharePrice: number | null;
  value: number | null;
}

export interface SupplementaryInsiderData {
  summary: SupplementaryInsiderSummary;
  transactions: SupplementaryInsiderTransaction[];
}

export interface SupplementaryEstimateRow {
  period: string;
  reportDate: string | null;
  epsEstimate: number | null;
  revenueEstimate: number | null;
  analystCount: number | null;
  revisionDirection: 'up' | 'down' | 'flat' | 'unknown';
  currency: string | null;
}

export interface SupplementaryEstimatesData {
  annual: SupplementaryEstimateRow[];
  quarterly: SupplementaryEstimateRow[];
  nextPeriod: string | null;
  analystCoverage: number | null;
}

export interface SupplementaryCalendarEntry {
  symbol: string;
  companyName: string | null;
  reportDate: string | null;
  fiscalDateEnding: string | null;
  estimate: number | null;
  currency: string | null;
}

export interface SupplementaryCalendarData {
  horizon: '3month' | '6month' | '12month';
  entries: SupplementaryCalendarEntry[];
}

export interface SupplementaryInstitutionalHolding {
  holderName: string;
  sharesHeld: number | null;
  sharesChanged: number | null;
  sharesChangedPercentage: number | null;
  changeType: 'increased' | 'decreased' | 'unchanged' | 'other';
  lastReported: string | null;
}

export interface SupplementaryInstitutionalHoldingsData {
  totalInstitutionalHolders: number | null;
  totalInstitutionalShares: number | null;
  totalInstitutionalOwnershipPercentage: number | null;
  holdersWithIncreasedHoldings: number | null;
  holdersWithDecreasedHoldings: number | null;
  holdersWithUnchangedHoldings: number | null;
  largestHolders: SupplementaryInstitutionalHolding[];
  biggestIncreases: SupplementaryInstitutionalHolding[];
  biggestReductions: SupplementaryInstitutionalHolding[];
  concentrationSummary: string;
}

export interface SupplementaryResponsePayload {
  tab: SupplementaryTab;
  entity: SupplementaryEntity;
  emptyState: string | null;
  transcript: SupplementaryTranscriptData | null;
  insider: SupplementaryInsiderData | null;
  estimates: SupplementaryEstimatesData | null;
  calendar: SupplementaryCalendarData | null;
  holdings: SupplementaryInstitutionalHoldingsData | null;
}
