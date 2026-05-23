-- Indexes for cleanup cron + coupon lookups
CREATE INDEX IF NOT EXISTS "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Session_expires_idx" ON "Session"("expires");
CREATE INDEX IF NOT EXISTS "VerificationToken_expires_idx" ON "VerificationToken"("expires");

-- Replace single-column couponId index with composite (couponId, status)
DROP INDEX IF EXISTS "Payment_couponId_idx";
CREATE INDEX IF NOT EXISTS "Payment_couponId_status_idx" ON "Payment"("couponId", "status");
