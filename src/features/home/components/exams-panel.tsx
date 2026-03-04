import dayjs from "dayjs";
import { getTranslations } from "next-intl/server";
import type { SubscriptionsTabData } from "@/app/dashboard/dashboard-data";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const tSubscriptions = await getTranslations("subscriptions");

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
      <div className="flex flex-col gap-6">
        <CardHeader>
          <CardTitle>{tSubscriptions("noSubscriptions")}</CardTitle>
          <CardDescription>
            {tSubscriptions("noSubscriptionsDescription")}
          </CardDescription>
        </CardHeader>
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <CardHeader>
          <CardTitle>{tNav("exams.title")}</CardTitle>
          <CardDescription>{tNav("exams.empty")}</CardDescription>
        </CardHeader>
      </div>
    );
  }

  return <ExamsList exams={exams} />;
}
