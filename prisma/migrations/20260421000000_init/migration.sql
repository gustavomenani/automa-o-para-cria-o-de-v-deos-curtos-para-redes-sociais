CREATE TYPE "content_type" AS ENUM ('reels', 'story', 'tiktok', 'youtube_shorts');

CREATE TYPE "project_status" AS ENUM ('draft', 'processing', 'ready', 'scheduled', 'published', 'error');

CREATE TYPE "media_file_type" AS ENUM ('image', 'audio', 'subtitle', 'video');

CREATE TYPE "generated_video_status" AS ENUM ('processing', 'ready', 'error');

CREATE TYPE "social_platform" AS ENUM ('instagram', 'tiktok', 'youtube', 'youtube_shorts');

CREATE TYPE "scheduled_post_status" AS ENUM ('scheduled', 'published', 'failed', 'canceled');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_projects" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "title" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "caption" TEXT,
  "contentType" "content_type" NOT NULL,
  "status" "project_status" NOT NULL DEFAULT 'draft',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "content_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media_files" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "type" "media_file_type" NOT NULL,
  "path" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "format" TEXT NOT NULL,
  "mimeType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "generated_videos" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "duration" INTEGER,
  "resolution" TEXT NOT NULL,
  "status" "generated_video_status" NOT NULL DEFAULT 'processing',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "generated_videos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scheduled_posts" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "platform" "social_platform" NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status" "scheduled_post_status" NOT NULL DEFAULT 'scheduled',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "scheduled_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_accounts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "platform" "social_platform" NOT NULL,
  "accountName" TEXT NOT NULL,
  "externalId" TEXT,
  "accessTokenRef" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "content_projects_userId_idx" ON "content_projects"("userId");
CREATE INDEX "content_projects_contentType_idx" ON "content_projects"("contentType");
CREATE INDEX "content_projects_status_idx" ON "content_projects"("status");
CREATE INDEX "content_projects_createdAt_idx" ON "content_projects"("createdAt");
CREATE INDEX "media_files_projectId_idx" ON "media_files"("projectId");
CREATE INDEX "media_files_type_idx" ON "media_files"("type");
CREATE INDEX "generated_videos_projectId_idx" ON "generated_videos"("projectId");
CREATE INDEX "generated_videos_status_idx" ON "generated_videos"("status");
CREATE INDEX "scheduled_posts_projectId_idx" ON "scheduled_posts"("projectId");
CREATE INDEX "scheduled_posts_platform_idx" ON "scheduled_posts"("platform");
CREATE INDEX "scheduled_posts_scheduledAt_idx" ON "scheduled_posts"("scheduledAt");
CREATE INDEX "scheduled_posts_status_idx" ON "scheduled_posts"("status");
CREATE UNIQUE INDEX "social_accounts_userId_platform_accountName_key" ON "social_accounts"("userId", "platform", "accountName");
CREATE INDEX "social_accounts_userId_idx" ON "social_accounts"("userId");
CREATE INDEX "social_accounts_platform_idx" ON "social_accounts"("platform");

ALTER TABLE "content_projects"
  ADD CONSTRAINT "content_projects_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "media_files"
  ADD CONSTRAINT "media_files_projectId_fkey"
  FOREIGN KEY ("projectId")
  REFERENCES "content_projects"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "generated_videos"
  ADD CONSTRAINT "generated_videos_projectId_fkey"
  FOREIGN KEY ("projectId")
  REFERENCES "content_projects"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "scheduled_posts"
  ADD CONSTRAINT "scheduled_posts_projectId_fkey"
  FOREIGN KEY ("projectId")
  REFERENCES "content_projects"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "social_accounts"
  ADD CONSTRAINT "social_accounts_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "users"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
