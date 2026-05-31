-- Multi-image check-in evidence.
-- Adds Checkin.imageUrls (text[]) and backfills it from the legacy single
-- imageUrl column. The old imageUrl column is kept for one release as a safety
-- net (read via lib/checkin-images.ts fallback); drop it in a follow-up.

ALTER TABLE "Checkin"
  ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill existing single-image rows into the new array column.
UPDATE "Checkin"
  SET "imageUrls" = ARRAY["imageUrl"]
  WHERE "imageUrl" IS NOT NULL
    AND "imageUrl" <> ''
    AND cardinality("imageUrls") = 0;
