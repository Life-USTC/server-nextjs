-- CreateTable
CREATE TABLE "DashboardLinkPin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardLinkPin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashboardLinkPin_userId_idx" ON "DashboardLinkPin"("userId");

-- CreateIndex
CREATE INDEX "DashboardLinkPin_slug_idx" ON "DashboardLinkPin"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardLinkPin_userId_slug_key" ON "DashboardLinkPin"("userId", "slug");

-- AddForeignKey
ALTER TABLE "DashboardLinkPin" ADD CONSTRAINT "DashboardLinkPin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
