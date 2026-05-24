ALTER TABLE "Challenge"
ADD COLUMN "benefits" JSONB,
ADD COLUMN "lastEditedBy" TEXT,
ADD COLUMN "lastEditedByType" TEXT,
ADD COLUMN "lastEditedAt" TIMESTAMP(3);
