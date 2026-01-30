/*
  Warnings:

  - A unique constraint covering the columns `[homeworkId]` on the table `Description` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "HomeworkAuditAction" AS ENUM ('created', 'deleted');

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "homeworkId" TEXT;

-- AlterTable
ALTER TABLE "Description" ADD COLUMN     "homeworkId" TEXT;

-- CreateTable
CREATE TABLE "Homework" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isMajor" BOOLEAN NOT NULL DEFAULT false,
    "requiresTeam" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "submissionStartAt" TIMESTAMP(3),
    "submissionDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "sectionId" INTEGER NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedById" TEXT,

    CONSTRAINT "Homework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkAuditLog" (
    "id" TEXT NOT NULL,
    "action" "HomeworkAuditAction" NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sectionId" INTEGER NOT NULL,
    "homeworkId" TEXT,
    "actorId" TEXT,

    CONSTRAINT "HomeworkAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Homework_sectionId_idx" ON "Homework"("sectionId");

-- CreateIndex
CREATE INDEX "Homework_publishedAt_idx" ON "Homework"("publishedAt");

-- CreateIndex
CREATE INDEX "Homework_submissionDueAt_idx" ON "Homework"("submissionDueAt");

-- CreateIndex
CREATE INDEX "Homework_deletedAt_idx" ON "Homework"("deletedAt");

-- CreateIndex
CREATE INDEX "HomeworkAuditLog_sectionId_idx" ON "HomeworkAuditLog"("sectionId");

-- CreateIndex
CREATE INDEX "HomeworkAuditLog_homeworkId_idx" ON "HomeworkAuditLog"("homeworkId");

-- CreateIndex
CREATE INDEX "HomeworkAuditLog_actorId_idx" ON "HomeworkAuditLog"("actorId");

-- CreateIndex
CREATE INDEX "HomeworkAuditLog_createdAt_idx" ON "HomeworkAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_homeworkId_idx" ON "Comment"("homeworkId");

-- CreateIndex
CREATE UNIQUE INDEX "Description_homeworkId_key" ON "Description"("homeworkId");

-- CreateIndex
CREATE INDEX "Description_homeworkId_idx" ON "Description"("homeworkId");

-- AddForeignKey
ALTER TABLE "Description" ADD CONSTRAINT "Description_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAuditLog" ADD CONSTRAINT "HomeworkAuditLog_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAuditLog" ADD CONSTRAINT "HomeworkAuditLog_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAuditLog" ADD CONSTRAINT "HomeworkAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;
