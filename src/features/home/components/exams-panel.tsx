import dayjs from "dayjs";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import type { SubscriptionsTabData } from "@/features/home/server/dashboard-tab-data";
import { Link } from "@/i18n/routing";
import { ExamsList } from "./exams-list";

type ExamRow = {
  examId: number;
  sectionId: number;
  sectionJwId: number | null;
  sectionCode: string | null;
  courseName: string | null;
  examDate: string | null;
  startTime: number | null;
  endTime: number | null;
  examMode: string | null;
  rooms: string;
};

export async function ExamsPanel({ data }: { data: SubscriptionsTabData }) {
  const tNav = await getTranslations("meDashboard.nav");
  const tCommon = await getTranslations("common");

  const exams: ExamRow[] = data.subscriptions.flatMap((subscription) =>
    subscription.sections.flatMap((section) =>
      section.exams.map((exam) => ({
        examId: exam.id,
        sectionId: section.id,
        sectionJwId: section.jwId,
        sectionCode: section.code,
        courseName: section.course?.namePrimary ?? null,
        examDate: exam.examDate
          ? dayjs(exam.examDate).format("YYYY-MM-DD")
          : null,
        startTime: exam.startTime,
        endTime: exam.endTime,
        examMode: exam.examMode,
        rooms:
          exam.examRooms
            .map((examRoom) => examRoom.room)
            .filter((room) => Boolean(room))
            .join(", ") || "—",
      })),
    ),
  );

  exams.sort((a, b) => {
    if (a.examDate && b.examDate) {
      const dateDiff = a.examDate.localeCompare(b.examDate);
      if (dateDiff !== 0) return dateDiff;
      return (
        (a.startTime ?? Number.MAX_SAFE_INTEGER) -
        (b.startTime ?? Number.MAX_SAFE_INTEGER)
      );
    }
    if (a.examDate) return -1;
    if (b.examDate) return 1;
    return a.examId - b.examId;
  });

  if (data.subscriptions.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{tNav("exams.noSubscriptionsTitle")}</EmptyTitle>
          <EmptyDescription>
            {tNav("exams.noSubscriptionsDescription")}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link className="no-underline" href="/courses" />}>
            {tCommon("browseCourses")}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (exams.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{tNav("exams.title")}</EmptyTitle>
          <EmptyDescription>{tNav("exams.empty")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <ExamsList exams={exams} />;
}
