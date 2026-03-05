-- CreateEnum
CREATE TYPE "TodoPriority" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "Todo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "priority" "TodoPriority" NOT NULL DEFAULT 'medium',
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Todo_userId_idx" ON "Todo"("userId");

-- CreateIndex
CREATE INDEX "Todo_userId_completed_idx" ON "Todo"("userId", "completed");

-- CreateIndex
CREATE INDEX "Todo_dueAt_idx" ON "Todo"("dueAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Comment_userId_status_idx" ON "Comment"("userId", "status");

-- CreateIndex
CREATE INDEX "Comment_sectionId_status_idx" ON "Comment"("sectionId", "status");

-- CreateIndex
CREATE INDEX "Comment_courseId_status_idx" ON "Comment"("courseId", "status");

-- CreateIndex
CREATE INDEX "Comment_teacherId_status_idx" ON "Comment"("teacherId", "status");

-- CreateIndex
CREATE INDEX "Homework_createdById_idx" ON "Homework"("createdById");

-- CreateIndex
CREATE INDEX "Homework_sectionId_deletedAt_idx" ON "Homework"("sectionId", "deletedAt");

-- CreateIndex
CREATE INDEX "ScheduleGroup_sectionId_idx" ON "ScheduleGroup"("sectionId");

-- CreateIndex
CREATE INDEX "Section_teachLanguageId_idx" ON "Section"("teachLanguageId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Teacher_departmentId_idx" ON "Teacher"("departmentId");

-- CreateIndex
CREATE INDEX "UploadPending_userId_expiresAt_idx" ON "UploadPending"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "UserSuspension_userId_liftedAt_idx" ON "UserSuspension"("userId", "liftedAt");

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
