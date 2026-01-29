-- CreateTable
CREATE TABLE "Description" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastEditedAt" TIMESTAMP(3),
    "lastEditedById" TEXT,
    "sectionId" INTEGER,
    "courseId" INTEGER,
    "teacherId" INTEGER,

    CONSTRAINT "Description_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DescriptionEdit" (
    "id" TEXT NOT NULL,
    "descriptionId" TEXT NOT NULL,
    "editorId" TEXT,
    "previousContent" TEXT,
    "nextContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DescriptionEdit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Description_sectionId_key" ON "Description"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Description_courseId_key" ON "Description"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Description_teacherId_key" ON "Description"("teacherId");

-- CreateIndex
CREATE INDEX "Description_lastEditedById_idx" ON "Description"("lastEditedById");

-- CreateIndex
CREATE INDEX "DescriptionEdit_descriptionId_idx" ON "DescriptionEdit"("descriptionId");

-- CreateIndex
CREATE INDEX "DescriptionEdit_editorId_idx" ON "DescriptionEdit"("editorId");

-- CreateIndex
CREATE INDEX "DescriptionEdit_createdAt_idx" ON "DescriptionEdit"("createdAt");

-- AddForeignKey
ALTER TABLE "Description" ADD CONSTRAINT "Description_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Description" ADD CONSTRAINT "Description_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Description" ADD CONSTRAINT "Description_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Description" ADD CONSTRAINT "Description_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescriptionEdit" ADD CONSTRAINT "DescriptionEdit_descriptionId_fkey" FOREIGN KEY ("descriptionId") REFERENCES "Description"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescriptionEdit" ADD CONSTRAINT "DescriptionEdit_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
