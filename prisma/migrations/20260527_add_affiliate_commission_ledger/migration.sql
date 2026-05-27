-- CreateTable
CREATE TABLE "AffiliateCommission" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "itemTitle" TEXT,
    "grossAmountVnd" DECIMAL(15,2) NOT NULL,
    "commissionPercent" DECIMAL(5,2) NOT NULL,
    "commissionVnd" DECIMAL(15,2) NOT NULL,
    "payoutStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "payoutNote" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateCommission_pkey" PRIMARY KEY ("id")
);

-- Backfill existing one-commission Referral rows into the normalized ledger.
INSERT INTO "AffiliateCommission" (
    "id",
    "referralId",
    "linkId",
    "communityId",
    "referredUserId",
    "sourceType",
    "sourceId",
    "itemTitle",
    "grossAmountVnd",
    "commissionPercent",
    "commissionVnd",
    "payoutStatus",
    "payoutNote",
    "paidAt",
    "createdAt"
)
SELECT
    'legacy_' || r."id",
    r."id",
    r."linkId",
    l."communityId",
    r."referredUserId",
    'LEGACY',
    r."id",
    'Legacy commission',
    r."commissionVnd",
    0,
    r."commissionVnd",
    r."payoutStatus",
    r."payoutNote",
    CASE WHEN r."payoutStatus" = 'PAID' THEN r."convertedAt" ELSE NULL END,
    COALESCE(r."convertedAt", r."createdAt")
FROM "Referral" r
JOIN "AffiliateLink" l ON l."id" = r."linkId"
WHERE r."commissionVnd" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateCommission_referralId_sourceType_sourceId_key" ON "AffiliateCommission"("referralId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "AffiliateCommission_communityId_payoutStatus_idx" ON "AffiliateCommission"("communityId", "payoutStatus");

-- CreateIndex
CREATE INDEX "AffiliateCommission_linkId_idx" ON "AffiliateCommission"("linkId");

-- CreateIndex
CREATE INDEX "AffiliateCommission_referredUserId_idx" ON "AffiliateCommission"("referredUserId");

-- AddForeignKey
ALTER TABLE "AffiliateCommission" ADD CONSTRAINT "AffiliateCommission_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
