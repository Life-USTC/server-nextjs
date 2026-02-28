-- CreateTable
CREATE TABLE "_UserCalendarSections" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserCalendarSections_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserCalendarSections_B_index" ON "_UserCalendarSections"("B");

-- Backfill data from CalendarSubscription -> User<->Section
INSERT INTO "_UserCalendarSections" ("A", "B")
SELECT scs."B", latest."userId"
FROM (
    SELECT MAX(cs."id") AS "id", cs."userId"
    FROM "CalendarSubscription" cs
    WHERE cs."userId" IS NOT NULL
    GROUP BY cs."userId"
) latest
INNER JOIN "_SectionCalendarSubscriptions" scs ON scs."A" = latest."id";

-- AddForeignKey
ALTER TABLE "_UserCalendarSections" ADD CONSTRAINT "_UserCalendarSections_A_fkey" FOREIGN KEY ("A") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserCalendarSections" ADD CONSTRAINT "_UserCalendarSections_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable
DROP TABLE "_SectionCalendarSubscriptions";

-- DropTable
DROP TABLE "CalendarSubscription";
