-- Per-task max evidence images (1-10, default 3), admin-configurable.
-- Schema field added in commit 67ce453 but the migration was missing, so prod
-- shipped a Prisma client expecting "ChallengeTask.maxEvidenceImages" against a
-- DB without the column -> every ChallengeTask query threw (challenges page 500).
-- The column was hotfixed onto prod out-of-band; IF NOT EXISTS keeps the next
-- `migrate deploy` a harmless no-op there while still creating it on fresh DBs.

ALTER TABLE "ChallengeTask"
  ADD COLUMN IF NOT EXISTS "maxEvidenceImages" INTEGER NOT NULL DEFAULT 3;
