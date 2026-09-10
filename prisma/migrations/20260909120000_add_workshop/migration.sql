CREATE TABLE IF NOT EXISTS "WorkshopProject" (
 "id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "summary" TEXT NOT NULL,
 "hypothesis" TEXT NOT NULL DEFAULT '', "plan" TEXT NOT NULL DEFAULT '',
 "status" TEXT NOT NULL DEFAULT 'idea', "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
 "githubUrl" TEXT, "resources" JSONB NOT NULL DEFAULT '[]', "ownerId" TEXT,
 "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "WorkshopProject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "WorkshopMember" (
 "projectId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 CONSTRAINT "WorkshopMember_pkey" PRIMARY KEY ("projectId", "userId"),
 CONSTRAINT "WorkshopMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WorkshopProject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "WorkshopMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "WorkshopUpdate" (
 "id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL, "authorId" TEXT, "kind" TEXT NOT NULL DEFAULT 'progress',
 "content" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "WorkshopUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WorkshopProject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "WorkshopUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "WorkshopMilestone" (
 "id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL, "title" TEXT NOT NULL, "completed" BOOLEAN NOT NULL DEFAULT false,
 "dueAt" TIMESTAMP(3), "assigneeId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "WorkshopMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WorkshopProject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "WorkshopMilestone_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "WorkshopProject_status_updatedAt_idx" ON "WorkshopProject"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "WorkshopProject_ownerId_idx" ON "WorkshopProject"("ownerId");
CREATE INDEX IF NOT EXISTS "WorkshopMember_userId_idx" ON "WorkshopMember"("userId");
CREATE INDEX IF NOT EXISTS "WorkshopUpdate_projectId_createdAt_idx" ON "WorkshopUpdate"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "WorkshopMilestone_projectId_createdAt_idx" ON "WorkshopMilestone"("projectId", "createdAt");
