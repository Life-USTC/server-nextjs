-- CreateTable
CREATE TABLE "CalendarSubscription" (
    "id" SERIAL NOT NULL,

    CONSTRAINT "CalendarSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SectionCalendarSubscriptions" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_SectionCalendarSubscriptions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_SectionCalendarSubscriptions_B_index" ON "_SectionCalendarSubscriptions"("B");

-- AddForeignKey
ALTER TABLE "_SectionCalendarSubscriptions" ADD CONSTRAINT "_SectionCalendarSubscriptions_A_fkey" FOREIGN KEY ("A") REFERENCES "CalendarSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SectionCalendarSubscriptions" ADD CONSTRAINT "_SectionCalendarSubscriptions_B_fkey" FOREIGN KEY ("B") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
