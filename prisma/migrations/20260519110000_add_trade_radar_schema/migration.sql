CREATE TABLE "trade_ingest_runs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "mode" TEXT NOT NULL DEFAULT 'incremental',
    "sourceWindowStart" TIMESTAMP(3) NOT NULL,
    "sourceWindowEnd" TIMESTAMP(3) NOT NULL,
    "sourceCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rawRows" INTEGER NOT NULL DEFAULT 0,
    "normalizedRows" INTEGER NOT NULL DEFAULT 0,
    "aggregateRows" INTEGER NOT NULL DEFAULT 0,
    "signalRows" INTEGER NOT NULL DEFAULT 0,
    "errorMsg" TEXT,
    "warnings" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "trade_ingest_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trade_entities" (
    "id" TEXT NOT NULL,
    "panjivaCompanyId" TEXT,
    "normalizedName" TEXT NOT NULL,
    "legalName" TEXT,
    "country" TEXT,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ciqCompanyId" TEXT,
    "ciqUltimateParentId" TEXT,
    "duns" TEXT,
    "ultimateParentDuns" TEXT,
    "ein" TEXT,
    "ultimateParentEin" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'unresolved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_entities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trade_theme_maps" (
    "id" TEXT NOT NULL,
    "hs6" TEXT NOT NULL,
    "hs4" TEXT,
    "themeKey" TEXT NOT NULL,
    "themeLabel" TEXT NOT NULL,
    "marketTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_theme_maps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trade_shipments" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "sourceCountry" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "shipmentDate" TIMESTAMP(3) NOT NULL,
    "arrivalDate" TIMESTAMP(3),
    "departureDate" TIMESTAMP(3),
    "importerEntityId" TEXT,
    "exporterEntityId" TEXT,
    "importerParentEntityId" TEXT,
    "exporterParentEntityId" TEXT,
    "originCountry" TEXT,
    "destinationCountry" TEXT,
    "originPort" TEXT,
    "destinationPort" TEXT,
    "transportMode" TEXT,
    "hs6" TEXT,
    "hs4" TEXT,
    "productDescription" TEXT,
    "quantity" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "customsValue" DOUBLE PRECISION,
    "valuePerKg" DOUBLE PRECISION,
    "routeKey" TEXT,
    "themeKey" TEXT,
    "sourceTable" TEXT NOT NULL,
    "sourceNaturalKey" TEXT NOT NULL,
    "rawSource" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_shipments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trade_weekly_aggregates" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "sliceKey" TEXT NOT NULL,
    "sourceCountry" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "hs6" TEXT,
    "hs4" TEXT,
    "routeKey" TEXT,
    "entityId" TEXT,
    "parentEntityId" TEXT,
    "themeMapId" TEXT,
    "themeKey" TEXT,
    "themeLabel" TEXT,
    "shipmentCount" INTEGER NOT NULL DEFAULT 0,
    "totalValue" DOUBLE PRECISION,
    "totalWeightKg" DOUBLE PRECISION,
    "avgValuePerKg" DOUBLE PRECISION,
    "medianValuePerKg" DOUBLE PRECISION,
    "uniqueCounterparties" INTEGER NOT NULL DEFAULT 0,
    "newRelationships" INTEGER NOT NULL DEFAULT 0,
    "lostRelationships" INTEGER NOT NULL DEFAULT 0,
    "supplierConcentration" DOUBLE PRECISION,
    "buyerConcentration" DOUBLE PRECISION,
    "originConcentration" DOUBLE PRECISION,
    "destinationConcentration" DOUBLE PRECISION,
    "coverageScore" DOUBLE PRECISION,
    "coverageStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_weekly_aggregates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trade_signals" (
    "id" TEXT NOT NULL,
    "signalWeek" TIMESTAMP(3) NOT NULL,
    "signalType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "severityBucket" TEXT NOT NULL,
    "sourceCountry" TEXT,
    "direction" TEXT,
    "hs6" TEXT,
    "hs4" TEXT,
    "routeKey" TEXT,
    "entityId" TEXT,
    "parentEntityId" TEXT,
    "themeMapId" TEXT,
    "themeKey" TEXT,
    "themeLabel" TEXT,
    "signalScore" DOUBLE PRECISION NOT NULL,
    "rawValue" DOUBLE PRECISION,
    "baselineMedian" DOUBLE PRECISION,
    "baselineRobustZ" DOUBLE PRECISION,
    "shortMomentum" DOUBLE PRECISION,
    "yoyDelta" DOUBLE PRECISION,
    "counterpartyChurn" DOUBLE PRECISION,
    "concentrationDelta" DOUBLE PRECISION,
    "materialityValue" DOUBLE PRECISION,
    "crossSliceConfirmation" DOUBLE PRECISION,
    "coverageValidWeeks" INTEGER,
    "coverageStatus" TEXT,
    "explanation" TEXT NOT NULL,
    "marketTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_signals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trade_watchlists" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'user',
    "watchType" TEXT NOT NULL,
    "entityId" TEXT,
    "parentEntityId" TEXT,
    "themeMapId" TEXT,
    "themeKey" TEXT,
    "hs6" TEXT,
    "routeKey" TEXT,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_watchlists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trade_entities_panjivaCompanyId_key" ON "trade_entities"("panjivaCompanyId");
CREATE INDEX "trade_entities_normalizedName_idx" ON "trade_entities"("normalizedName");
CREATE INDEX "trade_entities_ciqCompanyId_idx" ON "trade_entities"("ciqCompanyId");
CREATE INDEX "trade_entities_ciqUltimateParentId_idx" ON "trade_entities"("ciqUltimateParentId");
CREATE INDEX "trade_entities_country_idx" ON "trade_entities"("country");
CREATE UNIQUE INDEX "trade_theme_maps_hs6_key" ON "trade_theme_maps"("hs6");
CREATE INDEX "trade_theme_maps_themeKey_idx" ON "trade_theme_maps"("themeKey");
CREATE INDEX "trade_theme_maps_hs4_idx" ON "trade_theme_maps"("hs4");
CREATE UNIQUE INDEX "trade_shipments_sourceNaturalKey_key" ON "trade_shipments"("sourceNaturalKey");
CREATE INDEX "trade_shipments_shipmentDate_idx" ON "trade_shipments"("shipmentDate");
CREATE INDEX "trade_shipments_weekStart_idx" ON "trade_shipments"("weekStart");
CREATE INDEX "trade_shipments_sourceCountry_direction_weekStart_idx" ON "trade_shipments"("sourceCountry", "direction", "weekStart");
CREATE INDEX "trade_shipments_hs6_weekStart_idx" ON "trade_shipments"("hs6", "weekStart");
CREATE INDEX "trade_shipments_routeKey_weekStart_idx" ON "trade_shipments"("routeKey", "weekStart");
CREATE INDEX "trade_shipments_themeKey_weekStart_idx" ON "trade_shipments"("themeKey", "weekStart");
CREATE UNIQUE INDEX "trade_weekly_aggregates_weekStart_sliceKey_key" ON "trade_weekly_aggregates"("weekStart", "sliceKey");
CREATE INDEX "trade_weekly_aggregates_weekStart_shipmentCount_idx" ON "trade_weekly_aggregates"("weekStart", "shipmentCount");
CREATE INDEX "trade_weekly_aggregates_sourceCountry_direction_weekStart_idx" ON "trade_weekly_aggregates"("sourceCountry", "direction", "weekStart");
CREATE INDEX "trade_weekly_aggregates_themeKey_weekStart_idx" ON "trade_weekly_aggregates"("themeKey", "weekStart");
CREATE INDEX "trade_signals_signalWeek_signalScore_idx" ON "trade_signals"("signalWeek", "signalScore");
CREATE INDEX "trade_signals_signalType_signalWeek_idx" ON "trade_signals"("signalType", "signalWeek");
CREATE INDEX "trade_signals_status_severityBucket_signalWeek_idx" ON "trade_signals"("status", "severityBucket", "signalWeek");
CREATE INDEX "trade_signals_themeKey_signalWeek_idx" ON "trade_signals"("themeKey", "signalWeek");
CREATE INDEX "trade_watchlists_userId_scope_idx" ON "trade_watchlists"("userId", "scope");
CREATE INDEX "trade_watchlists_watchType_label_idx" ON "trade_watchlists"("watchType", "label");
CREATE INDEX "trade_ingest_runs_status_startedAt_idx" ON "trade_ingest_runs"("status", "startedAt");

ALTER TABLE "trade_shipments" ADD CONSTRAINT "trade_shipments_importerEntityId_fkey" FOREIGN KEY ("importerEntityId") REFERENCES "trade_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trade_shipments" ADD CONSTRAINT "trade_shipments_exporterEntityId_fkey" FOREIGN KEY ("exporterEntityId") REFERENCES "trade_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trade_shipments" ADD CONSTRAINT "trade_shipments_importerParentEntityId_fkey" FOREIGN KEY ("importerParentEntityId") REFERENCES "trade_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trade_shipments" ADD CONSTRAINT "trade_shipments_exporterParentEntityId_fkey" FOREIGN KEY ("exporterParentEntityId") REFERENCES "trade_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trade_weekly_aggregates" ADD CONSTRAINT "trade_weekly_aggregates_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "trade_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trade_weekly_aggregates" ADD CONSTRAINT "trade_weekly_aggregates_parentEntityId_fkey" FOREIGN KEY ("parentEntityId") REFERENCES "trade_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trade_weekly_aggregates" ADD CONSTRAINT "trade_weekly_aggregates_themeMapId_fkey" FOREIGN KEY ("themeMapId") REFERENCES "trade_theme_maps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trade_signals" ADD CONSTRAINT "trade_signals_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "trade_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trade_signals" ADD CONSTRAINT "trade_signals_parentEntityId_fkey" FOREIGN KEY ("parentEntityId") REFERENCES "trade_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trade_signals" ADD CONSTRAINT "trade_signals_themeMapId_fkey" FOREIGN KEY ("themeMapId") REFERENCES "trade_theme_maps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trade_watchlists" ADD CONSTRAINT "trade_watchlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_watchlists" ADD CONSTRAINT "trade_watchlists_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "trade_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trade_watchlists" ADD CONSTRAINT "trade_watchlists_parentEntityId_fkey" FOREIGN KEY ("parentEntityId") REFERENCES "trade_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trade_watchlists" ADD CONSTRAINT "trade_watchlists_themeMapId_fkey" FOREIGN KEY ("themeMapId") REFERENCES "trade_theme_maps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
