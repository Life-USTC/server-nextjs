"use client";

import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  DashboardTabToolbar,
  DashboardTabToolbarGroup,
  dashboardTabToolbarItemClass,
} from "@/components/filters/dashboard-tab-toolbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Link } from "@/i18n/routing";
import { formatTime } from "@/shared/lib/time-utils";

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
      <DashboardTabToolbar>
        <DashboardTabToolbarGroup>
          <Button
            size="sm"
            variant="ghost"
            className={dashboardTabToolbarItemClass(filter === "incomplete")}
            onClick={() => setFilter("incomplete")}
          >
            {t("filterIncomplete")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={dashboardTabToolbarItemClass(filter === "completed")}
            onClick={() => setFilter("completed")}
          >
            {t("filterCompleted")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={dashboardTabToolbarItemClass(filter === "all")}
            onClick={() => setFilter("all")}
          >
            {t("filterAll")}
          </Button>
        </DashboardTabToolbarGroup>
      </DashboardTabToolbar>

      {filteredExams.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("filterEmpty")}</EmptyTitle>
            <EmptyDescription>{t("filterEmptyDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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

          const roomSubtitle = exam.rooms?.trim() || null;

          return (
            <Card
              key={`${exam.sectionId}-${exam.examId}`}
              className="flex h-full min-h-0 flex-col rounded-xl border-border/70 bg-card/72"
            >
              <CardPanel className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="space-y-1">
                  <CardTitle className="min-w-0 truncate font-medium text-base">
                    <Link
                      className="block truncate no-underline hover:underline"
                      href={sectionHref}
                      title={exam.courseName ?? undefined}
                    >
                      {exam.courseName ?? "—"}
                    </Link>
                  </CardTitle>
                  {roomSubtitle ? (
                    <CardDescription className="min-w-0 truncate">
                      {roomSubtitle}
                    </CardDescription>
                  ) : null}
                </div>
                <div className="mt-auto space-y-2 text-sm">
                  <p className="font-semibold text-foreground tabular-nums">
                    {dateLabel} {timeLabel}
                  </p>
                  {exam.examMode ? (
                    <p className="text-muted-foreground text-xs">
                      {exam.examMode}
                    </p>
                  ) : null}
                </div>
              </CardPanel>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
