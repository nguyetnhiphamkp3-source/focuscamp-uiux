-- Add coupon system: 2 new tables + 4 nullable cols on Payment.
-- All additions are additive and nullable for safe rollback.

-- Payment: discount tracking columns
ALTER TABLE "Payment" ADD COLUMN "originalAmountVnd" DECIMAL(15,2);
ALTER TABLE "Payment" ADD COLUMN "discountVnd" DECIMAL(15,2);
ALTER TABLE "Payment" ADD COLUMN "couponId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "couponCode" TEXT;
CREATE INDEX "Payment_couponId_idx" ON "Payment"("couponId");

-- Coupon: per-community discount codes
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "percentageBps" INTEGER,
    "maxDiscountVnd" DECIMAL(15,2),
    "fixedAmountVnd" DECIMAL(15,2),
    "minOrderVnd" DECIMAL(15,2),
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "perUserLimit" INTEGER NOT NULL DEFAULT 1,
    "allowedRefTypes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Coupon_communityId_code_key" ON "Coupon"("communityId", "code");
CREATE INDEX "Coupon_communityId_isActive_idx" ON "Coupon"("communityId", "isActive");

ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_communityId_fkey"
    FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CouponRedemption: tracks per-payment redemptions for limit enforcement + audit
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "discountVnd" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CouponRedemption_paymentId_key" ON "CouponRedemption"("paymentId");
CREATE INDEX "CouponRedemption_couponId_status_idx" ON "CouponRedemption"("couponId", "status");
CREATE INDEX "CouponRedemption_userId_couponId_idx" ON "CouponRedemption"("userId", "couponId");

ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
