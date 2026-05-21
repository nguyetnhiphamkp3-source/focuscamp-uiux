-- AlterTable: Add communityId to AffiliateLink
ALTER TABLE "AffiliateLink" ADD COLUMN "communityId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "AffiliateLink" ADD CONSTRAINT "AffiliateLink_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (unique constraint: one link per user per community)
CREATE UNIQUE INDEX "AffiliateLink_userId_communityId_key" ON "AffiliateLink"("userId", "communityId");
