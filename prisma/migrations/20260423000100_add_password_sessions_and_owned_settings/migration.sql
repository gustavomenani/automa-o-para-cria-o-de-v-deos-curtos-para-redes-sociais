ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;

ALTER TABLE "manus_settings" ADD COLUMN "userId" TEXT;

CREATE UNIQUE INDEX "manus_settings_userId_key" ON "manus_settings"("userId");
CREATE INDEX "manus_settings_userId_idx" ON "manus_settings"("userId");

ALTER TABLE "manus_settings"
  ADD CONSTRAINT "manus_settings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
