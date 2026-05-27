-- Add one-change handle policy and reserve old handles for redirects.
ALTER TABLE "User" ADD COLUMN "handleChangeCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "UserHandleHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserHandleHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserHandleHistory_handle_key" ON "UserHandleHistory"("handle");
CREATE INDEX "UserHandleHistory_userId_idx" ON "UserHandleHistory"("userId");

ALTER TABLE "UserHandleHistory" ADD CONSTRAINT "UserHandleHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
