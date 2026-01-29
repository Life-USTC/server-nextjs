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
CREATE INDEX "DescriptionEdit_descriptionId_idx" ON "DescriptionEdit"("descriptionId");

-- CreateIndex
CREATE INDEX "DescriptionEdit_editorId_idx" ON "DescriptionEdit"("editorId");

-- CreateIndex
CREATE INDEX "DescriptionEdit_createdAt_idx" ON "DescriptionEdit"("createdAt");

-- AddForeignKey
ALTER TABLE "DescriptionEdit" ADD CONSTRAINT "DescriptionEdit_descriptionId_fkey" FOREIGN KEY ("descriptionId") REFERENCES "Description"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescriptionEdit" ADD CONSTRAINT "DescriptionEdit_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
