ALTER TABLE "User" ADD COLUMN "passwordSet" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "googleSub" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_googleSub_key" ON "User"("googleSub");
