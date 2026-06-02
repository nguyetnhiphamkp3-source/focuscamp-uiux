-- Rejection history for check-in resubmissions.
-- `reviewHistory` stores a JSON array of past rejected attempts (content, link,
-- images, reviewNote, aiReviewData, reviewedAt, rejectedAt, attempt), captured at
-- resubmit time before the row is overwritten — so the member/admin can see proof
-- of why earlier attempts were rejected.
-- `resubmittedAt` records the accurate moment of the latest resubmit, since
-- updatedAt gets clobbered by a later approve.

ALTER TABLE "Checkin"
  ADD COLUMN "reviewHistory" JSONB,
  ADD COLUMN "resubmittedAt" TIMESTAMP(3);
