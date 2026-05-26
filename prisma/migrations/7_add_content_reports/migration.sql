-- Content Report system
CREATE TABLE "ContentReport" (
    "id"            TEXT NOT NULL,
    "communityId"   TEXT NOT NULL,
    "reporterId"    TEXT NOT NULL,
    "targetType"    TEXT NOT NULL,
    "postId"        TEXT,
    "commentId"     TEXT,
    "reason"        TEXT NOT NULL,
    "detail"        TEXT,
    "status"        TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedById"  TEXT,
    "resolvedAt"    TIMESTAMP(3),
    "resolveNote"   TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentReport_reporterId_targetType_postId_commentId_key"
    ON "ContentReport"("reporterId", "targetType", "postId", "commentId");
CREATE INDEX "ContentReport_communityId_status_createdAt_idx"
    ON "ContentReport"("communityId", "status", "createdAt");

ALTER TABLE "ContentReport"
    ADD CONSTRAINT "ContentReport_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ContentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ContentReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "ContentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "ContentReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
