-- Add investment committee voting for holdings and private scorecard feedback for pitches.
-- This migration is additive only and does not alter or remove existing records.

-- CreateTable
CREATE TABLE "HoldingCommitteeDecision" (
    "id" TEXT NOT NULL,
    "holdingId" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalDecision" TEXT NOT NULL DEFAULT 'pending',
    "averageConviction" DOUBLE PRECISION,
    "keyObjections" TEXT,
    "summary" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HoldingCommitteeDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HoldingCommitteeVote" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "conviction" INTEGER NOT NULL,
    "comment" TEXT,
    "objections" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HoldingCommitteeVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PitchParticipant" (
    "id" TEXT NOT NULL,
    "pitchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PitchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PitchFeedback" (
    "id" TEXT NOT NULL,
    "pitchId" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "submittedByName" TEXT NOT NULL,
    "thesisClarity" INTEGER NOT NULL,
    "variantView" INTEGER NOT NULL,
    "valuation" INTEGER NOT NULL,
    "catalysts" INTEGER NOT NULL,
    "risks" INTEGER NOT NULL,
    "delivery" INTEGER NOT NULL,
    "strengths" TEXT,
    "improvements" TEXT,
    "overallComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PitchFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HoldingCommitteeDecision_holdingId_meetingDate_idx" ON "HoldingCommitteeDecision"("holdingId", "meetingDate");

-- CreateIndex
CREATE UNIQUE INDEX "HoldingCommitteeVote_decisionId_userId_key" ON "HoldingCommitteeVote"("decisionId", "userId");

-- CreateIndex
CREATE INDEX "HoldingCommitteeVote_decisionId_idx" ON "HoldingCommitteeVote"("decisionId");

-- CreateIndex
CREATE UNIQUE INDEX "PitchParticipant_pitchId_userId_key" ON "PitchParticipant"("pitchId", "userId");

-- CreateIndex
CREATE INDEX "PitchParticipant_pitchId_idx" ON "PitchParticipant"("pitchId");

-- CreateIndex
CREATE UNIQUE INDEX "PitchFeedback_pitchId_submittedBy_key" ON "PitchFeedback"("pitchId", "submittedBy");

-- CreateIndex
CREATE INDEX "PitchFeedback_pitchId_idx" ON "PitchFeedback"("pitchId");

-- AddForeignKey
ALTER TABLE "HoldingCommitteeDecision" ADD CONSTRAINT "HoldingCommitteeDecision_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "Holding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoldingCommitteeVote" ADD CONSTRAINT "HoldingCommitteeVote_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "HoldingCommitteeDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PitchParticipant" ADD CONSTRAINT "PitchParticipant_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "InvestmentPitch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PitchFeedback" ADD CONSTRAINT "PitchFeedback_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "InvestmentPitch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
