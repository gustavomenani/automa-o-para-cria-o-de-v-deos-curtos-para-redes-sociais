-- CreateEnum
CREATE TYPE "asset_provider" AS ENUM ('MANUS', 'GEMINI');

-- CreateEnum
CREATE TYPE "asset_generation_status" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'MANUAL_ACTION_REQUIRED');

-- AlterTable
ALTER TABLE "manus_settings" ALTER COLUMN "defaultReelsConfig" DROP DEFAULT,
ALTER COLUMN "defaultStoriesConfig" DROP DEFAULT;

-- AlterTable
ALTER TABLE "scheduled_posts" ALTER COLUMN "caption" DROP DEFAULT;

-- CreateTable
CREATE TABLE "asset_generation_runs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" "asset_provider" NOT NULL,
    "providerTaskId" TEXT,
    "status" "asset_generation_status" NOT NULL DEFAULT 'QUEUED',
    "summary" JSONB,
    "missingAssets" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_generation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_generation_runs_projectId_idx" ON "asset_generation_runs"("projectId");

-- CreateIndex
CREATE INDEX "asset_generation_runs_provider_idx" ON "asset_generation_runs"("provider");

-- CreateIndex
CREATE INDEX "asset_generation_runs_status_idx" ON "asset_generation_runs"("status");

-- CreateIndex
CREATE INDEX "asset_generation_runs_createdAt_idx" ON "asset_generation_runs"("createdAt");

-- CreateIndex
CREATE INDEX "asset_generation_runs_providerTaskId_idx" ON "asset_generation_runs"("providerTaskId");

-- AddForeignKey
ALTER TABLE "asset_generation_runs" ADD CONSTRAINT "asset_generation_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "content_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
