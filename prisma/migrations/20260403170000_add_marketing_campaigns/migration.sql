-- Add marketing studio persistence
CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "campaignKind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sourceSnapshot" JSONB NOT NULL,
    "overrideFields" JSONB,
    "generatedCaptions" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketingAsset" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "assetKind" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "ordering" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketingCampaign_sourceType_sourceId_idx" ON "MarketingCampaign"("sourceType", "sourceId");
CREATE INDEX "MarketingCampaign_createdBy_createdAt_idx" ON "MarketingCampaign"("createdBy", "createdAt");
CREATE INDEX "MarketingAsset_campaignId_platform_ordering_idx" ON "MarketingAsset"("campaignId", "platform", "ordering");

ALTER TABLE "MarketingAsset"
ADD CONSTRAINT "MarketingAsset_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
