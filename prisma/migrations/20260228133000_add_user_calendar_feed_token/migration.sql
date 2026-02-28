-- AlterTable
ALTER TABLE "User" ADD COLUMN "calendarFeedToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_calendarFeedToken_key" ON "User"("calendarFeedToken");
