-- AlterTable: add isAlumni flag to TeamMember (safe default, no data loss)
ALTER TABLE "TeamMember" ADD COLUMN "isAlumni" BOOLEAN NOT NULL DEFAULT false;
