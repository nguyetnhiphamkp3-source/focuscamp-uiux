-- CreateTable
CREATE TABLE "FeatureReadState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureReadState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeatureReadState_userId_communityId_featureKey_key" ON "FeatureReadState"("userId", "communityId", "featureKey");

-- CreateIndex
CREATE INDEX "FeatureReadState_communityId_featureKey_lastViewedAt_idx" ON "FeatureReadState"("communityId", "featureKey", "lastViewedAt");

-- AddForeignKey
ALTER TABLE "FeatureReadState" ADD CONSTRAINT "FeatureReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureReadState" ADD CONSTRAINT "FeatureReadState_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
