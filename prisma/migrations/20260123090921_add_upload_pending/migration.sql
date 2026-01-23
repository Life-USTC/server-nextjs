-- CreateTable
CREATE TABLE "UploadPending" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT,
    "size" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UploadPending_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UploadPending_key_key" ON "UploadPending"("key");

-- CreateIndex
CREATE INDEX "UploadPending_userId_idx" ON "UploadPending"("userId");

-- CreateIndex
CREATE INDEX "UploadPending_expiresAt_idx" ON "UploadPending"("expiresAt");

-- AddForeignKey
ALTER TABLE "UploadPending" ADD CONSTRAINT "UploadPending_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
