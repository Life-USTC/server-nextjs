-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email",
DROP COLUMN "emailVerified",
ADD COLUMN     "profilePictures" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "VerifiedEmail" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "VerifiedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerifiedEmail_userId_idx" ON "VerifiedEmail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerifiedEmail_provider_email_key" ON "VerifiedEmail"("provider", "email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "VerifiedEmail" ADD CONSTRAINT "VerifiedEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

