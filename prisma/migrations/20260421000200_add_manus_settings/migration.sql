CREATE TABLE "manus_settings" (
  "id" TEXT NOT NULL,
  "apiKey" TEXT,
  "modelPreference" TEXT,
  "promptPreference" TEXT,
  "defaultReelsConfig" JSONB NOT NULL DEFAULT '{}',
  "defaultStoriesConfig" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "manus_settings_pkey" PRIMARY KEY ("id")
);
