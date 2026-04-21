CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'READY', 'FAILED', 'SCHEDULED', 'PUBLISHED');

CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'AUDIO', 'VIDEO');

CREATE TABLE "Content" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "caption" TEXT NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "videoPath" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Asset" (
  "id" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "type" "AssetType" NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Content_status_idx" ON "Content"("status");
CREATE INDEX "Content_createdAt_idx" ON "Content"("createdAt");
CREATE INDEX "Asset_contentId_idx" ON "Asset"("contentId");
CREATE INDEX "Asset_type_idx" ON "Asset"("type");

ALTER TABLE "Asset"
  ADD CONSTRAINT "Asset_contentId_fkey"
  FOREIGN KEY ("contentId")
  REFERENCES "Content"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
