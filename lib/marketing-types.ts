export type MarketingSourceType =
  | 'job_posting'
  | 'article'
  | 'research_report'
  | 'strategy_document'
  | 'manual';

export type MarketingCampaignKind =
  | 'recruiting'
  | 'article'
  | 'research'
  | 'strategy'
  | 'charity'
  | 'announcement';

export type MarketingPlatform = 'instagram' | 'linkedin' | 'pdf';
export type MarketingAssetKind = 'feed' | 'flyer' | 'caption';

export interface MarketingManualInput {
  title: string;
  kicker?: string;
  subtitle?: string;
  body?: string;
  cta?: string;
  dateLabel?: string;
  imageUrl?: string;
}

export interface MarketingOverrideFields {
  eyebrow?: string;
  subtitle?: string;
  cta?: string;
  dateLabel?: string;
  customNote?: string;
  imageUrl?: string;
}

export interface MarketingSourceSnapshot {
  sourceType: MarketingSourceType;
  sourceId?: string | null;
  campaignKind: MarketingCampaignKind;
  title: string;
  eyebrow: string;
  subtitle: string;
  summary: string;
  cta: string;
  dateLabel?: string | null;
  imageUrl?: string | null;
  fields: Record<string, any>;
}

export interface MarketingCaptionPack {
  instagram: string;
  linkedin: string;
}

export interface MarketingSourceOption {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  sourceType: MarketingSourceType;
  published?: boolean;
}

export interface MarketingAssetRecord {
  id: string;
  platform: MarketingPlatform;
  assetKind: MarketingAssetKind;
  mimeType: string;
  blobUrl: string;
  width?: number | null;
  height?: number | null;
  ordering: number;
}

export interface MarketingCampaignRecord {
  id: string;
  sourceType: MarketingSourceType;
  sourceId?: string | null;
  campaignKind: MarketingCampaignKind;
  title: string;
  status: string;
  sourceSnapshot: MarketingSourceSnapshot;
  overrideFields?: MarketingOverrideFields | null;
  generatedCaptions?: MarketingCaptionPack | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assets: MarketingAssetRecord[];
}
