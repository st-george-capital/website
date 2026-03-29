CREATE TABLE IF NOT EXISTS "CommunityInterviewQuestion" (
    "id" TEXT NOT NULL,
    "seedKey" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "notes" TEXT,
    "role" TEXT NOT NULL,
    "subcategory" TEXT,
    "questionType" TEXT NOT NULL DEFAULT 'technical',
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "company" TEXT,
    "firmType" TEXT,
    "topicTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceType" TEXT,
    "sourceTitle" TEXT,
    "sourceUrl" TEXT,
    "attachmentUrl" TEXT,
    "submitterName" TEXT,
    "submittedBy" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityInterviewQuestion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CommunityInterviewQuestion" ADD COLUMN IF NOT EXISTS "seedKey" TEXT;
ALTER TABLE "CommunityInterviewQuestion" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "CommunityInterviewQuestion" ADD COLUMN IF NOT EXISTS "questionType" TEXT NOT NULL DEFAULT 'technical';
ALTER TABLE "CommunityInterviewQuestion" ADD COLUMN IF NOT EXISTS "firmType" TEXT;
ALTER TABLE "CommunityInterviewQuestion" ADD COLUMN IF NOT EXISTS "topicTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CommunityInterviewQuestion" ADD COLUMN IF NOT EXISTS "sourceType" TEXT;
ALTER TABLE "CommunityInterviewQuestion" ADD COLUMN IF NOT EXISTS "sourceTitle" TEXT;
ALTER TABLE "CommunityInterviewQuestion" ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
ALTER TABLE "CommunityInterviewQuestion" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
ALTER TABLE "CommunityInterviewQuestion" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "CommunityInterviewQuestion" ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT;

ALTER TABLE "CommunityInterviewQuestion"
  ALTER COLUMN "answer" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityInterviewQuestion_seedKey_key"
  ON "CommunityInterviewQuestion"("seedKey");

CREATE INDEX IF NOT EXISTS "CommunityInterviewQuestion_role_idx"
  ON "CommunityInterviewQuestion"("role");

CREATE INDEX IF NOT EXISTS "CommunityInterviewQuestion_approved_idx"
  ON "CommunityInterviewQuestion"("approved");

CREATE INDEX IF NOT EXISTS "CommunityInterviewQuestion_company_idx"
  ON "CommunityInterviewQuestion"("company");
