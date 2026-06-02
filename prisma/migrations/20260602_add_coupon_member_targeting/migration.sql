-- Allow coupons to target specific community members. Empty array keeps legacy "all members" behavior.
ALTER TABLE "Coupon" ADD COLUMN "allowedMemberIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
