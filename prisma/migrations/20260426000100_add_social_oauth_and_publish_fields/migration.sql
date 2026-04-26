ALTER TABLE "scheduled_posts"
  ADD COLUMN "socialAccountId" TEXT,
  ADD COLUMN "visibility" TEXT,
  ADD COLUMN "providerPostId" TEXT,
  ADD COLUMN "providerStatus" TEXT,
  ADD COLUMN "publishErrorCode" TEXT,
  ADD COLUMN "publishErrorMessage" TEXT,
  ADD COLUMN "publishAttemptedAt" TIMESTAMP(3),
  ADD COLUMN "publishedAt" TIMESTAMP(3);

ALTER TABLE "social_accounts"
  ADD COLUMN "providerAccountType" TEXT,
  ADD COLUMN "accessTokenCiphertext" TEXT,
  ADD COLUMN "refreshTokenCiphertext" TEXT,
  ADD COLUMN "tokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "scopes" JSONB,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "reauthRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "tokenErrorMessage" TEXT,
  ADD COLUMN "lastValidatedAt" TIMESTAMP(3),
  ADD COLUMN "providerMetadata" JSONB;

CREATE INDEX "scheduled_posts_socialAccountId_idx" ON "scheduled_posts"("socialAccountId");
CREATE INDEX "social_accounts_externalId_idx" ON "social_accounts"("externalId");

ALTER TABLE "scheduled_posts"
  ADD CONSTRAINT "scheduled_posts_socialAccountId_fkey"
  FOREIGN KEY ("socialAccountId") REFERENCES "social_accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
