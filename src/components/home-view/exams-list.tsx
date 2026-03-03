"use client";

import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
  examDate: string | null;
  startTime: number | null;
  endTime: number | null;
  examMode: string | null;
  rooms: string;
};

type ExamFilter = "all" | "incomplete" | "completed";

function isExamCompleted(exam: ExamRow, now: dayjs.Dayjs) {
  if (!exam.examDate) return false;

  const examDay = dayjs(exam.examDate);
  if (!examDay.isValid()) return false;

  const timeValue = exam.endTime ?? exam.startTime;
  const examEnd =
    timeValue == null
      ? examDay.endOf("day")
      : examDay
          .hour(Math.floor(timeValue / 100))
          .minute(timeValue % 100)
          .second(0)
          .millisecond(0);

  return examEnd.isBefore(now);
}

export function ExamsList({ exams }: { exams: ExamRow[] }) {
  const t = useTranslations("meDashboard.nav.exams");
  const tSection = useTranslations("sectionDetail");
  const [filter, setFilter] = useState<ExamFilter>("incomplete");

  const filteredExams = useMemo(() => {
    const now = dayjs();
    if (filter === "completed") {
      return exams.filter((exam) => isExamCompleted(exam, now));
    }
    if (filter === "incomplete") {
      return exams.filter((exam) => !isExamCompleted(exam, now));
    }
    return exams;
  }, [exams, filter]);

  return (
    <div className="space-y-4">
      <CardHeader className="gap-3 px-0">
        <div className="inline-flex rounded-md border border-border/70 p-1">
          <Button
            size="sm"
            variant={filter === "incomplete" ? "secondary" : "ghost"}
            onClick={() => setFilter("incomplete")}
          >
            {t("filterIncomplete")}
          </Button>
          <Button
            size="sm"
            variant={filter === "completed" ? "secondary" : "ghost"}
            onClick={() => setFilter("completed")}
          >
            {t("filterCompleted")}
          </Button>
          <Button
            size="sm"
            variant={filter === "all" ? "secondary" : "ghost"}
            onClick={() => setFilter("all")}
          >
            {t("filterAll")}
          </Button>
        </div>
      </CardHeader>

      {filteredExams.length === 0 ? (
        <div className="flex flex-col gap-6">
          <CardHeader>
            <CardTitle className="text-base">{t("filterEmpty")}</CardTitle>
          </CardHeader>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredExams.map((exam) => {
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
    </div>
  );
}
