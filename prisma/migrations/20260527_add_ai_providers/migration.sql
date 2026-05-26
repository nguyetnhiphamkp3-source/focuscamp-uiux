-- Provider-first AI configuration. Legacy columns remain for backward compatibility.

CREATE TABLE IF NOT EXISTS "AIProvider" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "providerType" TEXT NOT NULL,
  "baseUrl" TEXT,
  "encryptedApiKey" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "settings" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AIProvider_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AIProvider_communityId_fkey'
  ) THEN
    ALTER TABLE "AIProvider"
      ADD CONSTRAINT "AIProvider_communityId_fkey"
      FOREIGN KEY ("communityId") REFERENCES "Community"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "AIProvider_communityId_name_key"
  ON "AIProvider"("communityId", "name");

CREATE INDEX IF NOT EXISTS "AIProvider_communityId_enabled_idx"
  ON "AIProvider"("communityId", "enabled");

ALTER TABLE "Community"
  ADD COLUMN IF NOT EXISTS "agentName" TEXT,
  ADD COLUMN IF NOT EXISTS "agentAvatarUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "agentTagline" TEXT,
  ADD COLUMN IF NOT EXISTS "agentProviderId" TEXT,
  ADD COLUMN IF NOT EXISTS "agentReviewProviderId" TEXT,
  ADD COLUMN IF NOT EXISTS "agentReviewModel" TEXT;

ALTER TABLE "Challenge"
  ADD COLUMN IF NOT EXISTS "aiReviewProviderId" TEXT;

CREATE INDEX IF NOT EXISTS "Community_agentProviderId_idx"
  ON "Community"("agentProviderId");

CREATE INDEX IF NOT EXISTS "Community_agentReviewProviderId_idx"
  ON "Community"("agentReviewProviderId");

CREATE INDEX IF NOT EXISTS "Challenge_aiReviewProviderId_idx"
  ON "Challenge"("aiReviewProviderId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Community_agentProviderId_fkey'
  ) THEN
    ALTER TABLE "Community"
      ADD CONSTRAINT "Community_agentProviderId_fkey"
      FOREIGN KEY ("agentProviderId") REFERENCES "AIProvider"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Community_agentReviewProviderId_fkey'
  ) THEN
    ALTER TABLE "Community"
      ADD CONSTRAINT "Community_agentReviewProviderId_fkey"
      FOREIGN KEY ("agentReviewProviderId") REFERENCES "AIProvider"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Challenge_aiReviewProviderId_fkey'
  ) THEN
    ALTER TABLE "Challenge"
      ADD CONSTRAINT "Challenge_aiReviewProviderId_fkey"
      FOREIGN KEY ("aiReviewProviderId") REFERENCES "AIProvider"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
