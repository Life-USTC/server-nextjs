-- CreateIndex
CREATE INDEX "Comment_status_createdAt_idx" ON "Comment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_rootId_createdAt_idx" ON "Comment"("rootId", "createdAt");

-- CreateIndex
CREATE INDEX "DescriptionEdit_descriptionId_createdAt_idx" ON "DescriptionEdit"("descriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "Homework_sectionId_submissionDueAt_idx" ON "Homework"("sectionId", "submissionDueAt");

-- CreateIndex
CREATE INDEX "HomeworkAuditLog_sectionId_createdAt_idx" ON "HomeworkAuditLog"("sectionId", "createdAt");

-- CreateIndex
CREATE INDEX "Todo_userId_completed_dueAt_idx" ON "Todo"("userId", "completed", "dueAt");

-- CreateIndex
CREATE INDEX "Upload_userId_createdAt_idx" ON "Upload"("userId", "createdAt");
