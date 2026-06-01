-- Add per-entity targeting to Coupon: specific products and/or challenges.
-- Empty array = applies to all (no behavior change for existing coupons).
ALTER TABLE "Coupon" ADD COLUMN "allowedProductIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Coupon" ADD COLUMN "allowedChallengeIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
