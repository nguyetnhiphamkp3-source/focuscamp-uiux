-- Hot-path indexes for the challenge admin-review page.
-- Blocking CREATE INDEX (matches the repo convention, e.g. 20260523014000_db_cleanliness_indexes).
-- At current row counts the brief lock is negligible. If these tables grow large,
-- build with CREATE INDEX CONCURRENTLY via psql against the db container, then
-- `prisma migrate resolve --applied 20260605_add_challenge_review_hot_indexes`
-- (Prisma migrate runs each file in a transaction, which forbids CONCURRENTLY here).

-- Leaderboard filter: ChallengeMember by (challengeId, status)
CREATE INDEX IF NOT EXISTS "ChallengeMember_challengeId_status_idx" ON "ChallengeMember"("challengeId", "status");

-- Submission list: ORDER BY "createdAt" DESC within (challengeId, status) + pagination
CREATE INDEX IF NOT EXISTS "Checkin_challengeId_status_createdAt_idx" ON "Checkin"("challengeId", "status", "createdAt");

-- Member completion recompute: distinct APPROVED "dayNumber" per (challengeId, userId)
CREATE INDEX IF NOT EXISTS "Checkin_challengeId_userId_status_dayNumber_idx" ON "Checkin"("challengeId", "userId", "status", "dayNumber");
