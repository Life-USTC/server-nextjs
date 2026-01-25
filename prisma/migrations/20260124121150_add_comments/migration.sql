-- CreateEnum
CREATE TYPE "CommentVisibility" AS ENUM ('public', 'logged_in_only', 'anonymous');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('active', 'softbanned', 'deleted');

-- CreateEnum
CREATE TYPE "CommentReactionType" AS ENUM ('upvote', 'heart', 'laugh', 'hooray', 'confused', 'rocket', 'eyes');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SectionTeacher" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "CommentVisibility" NOT NULL DEFAULT 'public',
    "status" "CommentStatus" NOT NULL DEFAULT 'active',
    "authorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "moderatedAt" TIMESTAMP(3),
    "moderationNote" TEXT,
    "userId" TEXT,
    "moderatedById" TEXT,
    "parentId" TEXT,
    "rootId" TEXT,
    "sectionId" INTEGER,
    "courseId" INTEGER,
    "teacherId" INTEGER,
    "sectionTeacherId" INTEGER,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentAttachment" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentReaction" (
    "id" TEXT NOT NULL,
    "type" "CommentReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CommentReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSuspension" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3),
    "liftedAt" TIMESTAMP(3),
    "liftedById" TEXT,

    CONSTRAINT "UserSuspension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SectionTeacher_sectionId_idx" ON "SectionTeacher"("sectionId");

-- CreateIndex
CREATE INDEX "SectionTeacher_teacherId_idx" ON "SectionTeacher"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "SectionTeacher_sectionId_teacherId_key" ON "SectionTeacher"("sectionId", "teacherId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Comment_rootId_idx" ON "Comment"("rootId");

-- CreateIndex
CREATE INDEX "Comment_sectionId_idx" ON "Comment"("sectionId");

-- CreateIndex
CREATE INDEX "Comment_courseId_idx" ON "Comment"("courseId");

-- CreateIndex
CREATE INDEX "Comment_teacherId_idx" ON "Comment"("teacherId");

-- CreateIndex
CREATE INDEX "Comment_sectionTeacherId_idx" ON "Comment"("sectionTeacherId");

-- CreateIndex
CREATE INDEX "Comment_status_idx" ON "Comment"("status");

-- CreateIndex
CREATE INDEX "Comment_visibility_idx" ON "Comment"("visibility");

-- CreateIndex
CREATE INDEX "CommentAttachment_uploadId_idx" ON "CommentAttachment"("uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentAttachment_commentId_uploadId_key" ON "CommentAttachment"("commentId", "uploadId");

-- CreateIndex
CREATE INDEX "CommentReaction_userId_idx" ON "CommentReaction"("userId");

-- CreateIndex
CREATE INDEX "CommentReaction_commentId_idx" ON "CommentReaction"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentReaction_commentId_userId_type_key" ON "CommentReaction"("commentId", "userId", "type");

-- CreateIndex
CREATE INDEX "UserSuspension_userId_idx" ON "UserSuspension"("userId");

-- CreateIndex
CREATE INDEX "UserSuspension_createdById_idx" ON "UserSuspension"("createdById");

-- CreateIndex
CREATE INDEX "UserSuspension_liftedAt_idx" ON "UserSuspension"("liftedAt");

-- CreateIndex
CREATE INDEX "UserSuspension_expiresAt_idx" ON "UserSuspension"("expiresAt");

-- AddForeignKey
ALTER TABLE "SectionTeacher" ADD CONSTRAINT "SectionTeacher_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionTeacher" ADD CONSTRAINT "SectionTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_sectionTeacherId_fkey" FOREIGN KEY ("sectionTeacherId") REFERENCES "SectionTeacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentAttachment" ADD CONSTRAINT "CommentAttachment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentAttachment" ADD CONSTRAINT "CommentAttachment_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSuspension" ADD CONSTRAINT "UserSuspension_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSuspension" ADD CONSTRAINT "UserSuspension_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSuspension" ADD CONSTRAINT "UserSuspension_liftedById_fkey" FOREIGN KEY ("liftedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
