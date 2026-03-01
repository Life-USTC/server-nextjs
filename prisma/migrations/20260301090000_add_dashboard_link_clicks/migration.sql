-- CreateTable
CREATE TABLE "DashboardLinkClick" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastClickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardLinkClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashboardLinkClick_userId_idx" ON "DashboardLinkClick"("userId");

-- CreateIndex
CREATE INDEX "DashboardLinkClick_slug_idx" ON "DashboardLinkClick"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardLinkClick_userId_slug_key" ON "DashboardLinkClick"("userId", "slug");

-- AddForeignKey
ALTER TABLE "DashboardLinkClick" ADD CONSTRAINT "DashboardLinkClick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
