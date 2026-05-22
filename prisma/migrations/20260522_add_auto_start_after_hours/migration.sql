-- Add auto-start grace period column on Challenge.
-- NULL = manual start (member presses "Bắt đầu"). Positive int = grace period in hours.
ALTER TABLE "Challenge" ADD COLUMN "autoStartAfterHours" INTEGER;

-- Migrate existing PENDING challenge members to ACTIVE.
-- The requiresApproval gate is removed in code; PENDING is no longer a state any new join can land in.
UPDATE "ChallengeMember"
SET status = 'ACTIVE', "approvedAt" = COALESCE("approvedAt", NOW())
WHERE status = 'PENDING';
