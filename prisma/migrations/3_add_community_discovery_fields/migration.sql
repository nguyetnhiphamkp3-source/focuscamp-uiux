-- Add Community-level Discovery controls.
ALTER TABLE "Community" ADD COLUMN "category" TEXT;
ALTER TABLE "Community" ADD COLUMN "featuredOnGlobal" BOOLEAN NOT NULL DEFAULT false;

-- Featured Discovery listing reads featured communities newest-first.
CREATE INDEX "Community_featuredOnGlobal_createdAt_idx" ON "Community"("featuredOnGlobal", "createdAt");
