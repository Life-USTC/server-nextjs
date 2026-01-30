-- CreateTable
CREATE TABLE "HomeworkCompletion" (
    "userId" TEXT NOT NULL,
    "homeworkId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeworkCompletion_pkey" PRIMARY KEY ("userId","homeworkId")
);

-- CreateIndex
CREATE INDEX "HomeworkCompletion_homeworkId_idx" ON "HomeworkCompletion"("homeworkId");

-- CreateIndex
CREATE INDEX "HomeworkCompletion_userId_idx" ON "HomeworkCompletion"("userId");

-- AddForeignKey
ALTER TABLE "HomeworkCompletion" ADD CONSTRAINT "HomeworkCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkCompletion" ADD CONSTRAINT "HomeworkCompletion_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;
