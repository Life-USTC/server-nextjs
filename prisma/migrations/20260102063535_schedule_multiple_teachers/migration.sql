/*
  Warnings:

  - You are about to drop the column `teacherId` on the `Schedule` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_teacherId_fkey";

-- DropIndex
DROP INDEX "Schedule_teacherId_idx";

-- AlterTable
ALTER TABLE "Schedule" DROP COLUMN "teacherId";

-- CreateTable
CREATE TABLE "_ScheduleTeachers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ScheduleTeachers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ScheduleTeachers_B_index" ON "_ScheduleTeachers"("B");

-- AddForeignKey
ALTER TABLE "_ScheduleTeachers" ADD CONSTRAINT "_ScheduleTeachers_A_fkey" FOREIGN KEY ("A") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ScheduleTeachers" ADD CONSTRAINT "_ScheduleTeachers_B_fkey" FOREIGN KEY ("B") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
