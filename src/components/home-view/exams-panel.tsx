import dayjs from "dayjs";
import { getTranslations } from "next-intl/server";
import type { SubscriptionsTabData } from "@/app/dashboard/dashboard-data";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { formatTime } from "@/lib/time-utils";

type ExamRow = {
  examId: number;
  sectionId: number;
  sectionJwId: number | null;
  sectionCode: string | null;
  courseName: string | null;
  examDate: Date | null;
  startTime: number | null;
  endTime: number | null;
  examMode: string | null;
  rooms: string;
};

export async function ExamsPanel({ data }: { data: SubscriptionsTabData }) {
  const tNav = await getTranslations("meDashboard.nav");
  const tSubscriptions = await getTranslations("subscriptions");
  const tSection = await getTranslations("sectionDetail");

  const exams: ExamRow[] = data.subscriptions.flatMap((subscription) =>
    subscription.sections.flatMap((section) =>
      section.exams.map((exam) => ({
        examId: exam.id,
        sectionId: section.id,
        sectionJwId: section.jwId,
        sectionCode: section.code,
        courseName: section.course?.namePrimary ?? null,
        examDate: exam.examDate,
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
      const dateDiff = a.examDate.getTime() - b.examDate.getTime();
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

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {exams.map((exam) => {
        const dateLabel = exam.examDate
          ? dayjs(exam.examDate).format("YYYY-MM-DD")
          : tSection("examDateTBD");
        const timeLabel =
          exam.startTime != null && exam.endTime != null
            ? `${formatTime(exam.startTime)}-${formatTime(exam.endTime)}`
            : "—";
        const sectionHref = exam.sectionJwId
          ? `/sections/${exam.sectionJwId}`
          : `/?tab=subscriptions`;

        return (
          <Card key={`${exam.sectionId}-${exam.examId}`}>
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-base">
                <Link
                  className="no-underline hover:underline"
                  href={sectionHref}
                >
                  {exam.courseName ?? "—"}
                </Link>
              </CardTitle>
              <CardDescription>{exam.sectionCode ?? "—"}</CardDescription>
            </CardHeader>
            <CardPanel className="space-y-2 pt-0 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="shrink-0 text-muted-foreground">
                  {tSection("date")}
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {dateLabel}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="shrink-0 text-muted-foreground">
                  {tSection("time")}
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {timeLabel}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="shrink-0 text-muted-foreground">
                  {tSection("examMode")}
                </span>
                <span className="font-medium text-muted-foreground">
                  {exam.examMode ?? "—"}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="shrink-0 text-muted-foreground">
                  {tSection("location")}
                </span>
                <span className="font-medium text-muted-foreground">
                  {exam.rooms}
                </span>
              </div>
            </CardPanel>
          </Card>
        );
      })}
    </div>
  );
}
