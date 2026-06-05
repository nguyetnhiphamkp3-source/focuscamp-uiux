-- CreateTable
CREATE TABLE "ExternalMemberProvision" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT,
    "email" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "userCreated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalMemberProvision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalMemberProvision_communityId_createdAt_idx" ON "ExternalMemberProvision"("communityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalMemberProvision_apiKeyId_externalOrderId_key" ON "ExternalMemberProvision"("apiKeyId", "externalOrderId");
