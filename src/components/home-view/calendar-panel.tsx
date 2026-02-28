import dayjs from "dayjs";
import { getTranslations } from "next-intl/server";
import type { OverviewData } from "@/app/dashboard/dashboard-data";
import type { ExamItem, SessionItem } from "@/app/dashboard/types";
import { CalendarEventCardInteractive } from "@/components/calendar-event-card-interactive";
import { formatTime } from "@/lib/time-utils";
import { cn } from "@/lib/utils";

const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export async function CalendarPanel({ data }: { data: OverviewData }) {
  const t = await getTranslations("meDashboard");
  const tSection = await getTranslations("sectionDetail");
  const weekdayLabels = WEEKDAY_KEYS.map((key) => tSection(`weekdays.${key}`));
  const weekLabelTemplate = tSection("weekNumber", { week: "{week}" });

  const {
    semesterWeeks,
    allSessions,
    allExams,
    semesterHomeworks,
    todayStart,
  } = data;

  if (semesterWeeks.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("today.empty")}</p>;
  }

  let weekIndex = 1;

  return (
    <div className="min-w-0 space-y-3">
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] gap-px overflow-hidden rounded-xl border border-border bg-border/60">
            <div className="rounded-tl-lg bg-muted/20 px-2 py-3 text-center font-medium text-muted-foreground text-xs">
              {tSection("weekLabel")}
            </div>
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="bg-muted/20 px-1 py-3 text-center font-medium text-muted-foreground text-xs"
              >
                {label}
              </div>
            ))}
            {semesterWeeks.map((week) => {
              const weekLabel = weekLabelTemplate.replace(
                "{week}",
                String(weekIndex),
              );
              weekIndex += 1;
              return (
                <div key={week[0].format("YYYY-MM-DD")} className="contents">
                  <div className="flex items-start justify-center bg-muted/10 px-1 py-2 font-medium text-[0.65rem] text-muted-foreground">
                    <span className="[text-orientation:mixed] [writing-mode:vertical-rl]">
                      {weekLabel}
                    </span>
                  </div>
                  {week.map((day) => {
                    const dateKey = day.format("YYYY-MM-DD");
                    const daySessions = allSessions.filter((item) =>
                      dayjs(item.date).isSame(day, "day"),
                    );
                    const dayExams = allExams.filter(
                      (item) =>
                        item.date && dayjs(item.date).isSame(day, "day"),
                    );
                    const dayHomeworks = semesterHomeworks.filter(
                      (hw) =>
                        hw.submissionDueAt &&
                        dayjs(hw.submissionDueAt).isSame(day, "day"),
                    );
                    const isToday = day.isSame(todayStart, "day");

                    return (
                      <div
                        key={dateKey}
                        className="min-h-[7rem] min-w-0 overflow-hidden border-border/40 bg-background p-1.5 text-xs"
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              isToday &&
                                "inline-flex size-6 items-center justify-center rounded-full bg-foreground text-background",
                            )}
                          >
                            {day.format("D")}
                          </span>
                          {day.date() === 1 && (
                            <span className="text-[0.65rem] text-muted-foreground">
                              {day.format("M月")}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 space-y-1 overflow-hidden">
                          {daySessions.map((item: SessionItem) => {
                            const timeLabel = `${formatTime(item.startTime)}-${formatTime(item.endTime)}`;
                            const meta = [timeLabel, item.location]
                              .filter(Boolean)
                              .join(" · ");
                            return (
                              <CalendarEventCardInteractive
                                key={item.id}
                                href={
                                  item.sectionJwId
                                    ? `/sections/${item.sectionJwId}`
                                    : "/?tab=subscriptions"
                                }
                                variant="session"
                                title={item.courseName}
                                meta={meta || undefined}
                                details={[
                                  {
                                    label: tSection("time"),
                                    value: timeLabel,
                                  },
                                  {
                                    label: tSection("location"),
                                    value: item.location,
                                  },
                                ].filter((d) => d.value)}
                              />
                            );
                          })}
                          {dayExams.map((exam: ExamItem) => {
                            const timeLabel =
                              exam.startTime != null && exam.endTime != null
                                ? `${formatTime(exam.startTime)}-${formatTime(exam.endTime)}`
                                : "";
                            return (
                              <CalendarEventCardInteractive
                                key={exam.id}
                                href="/?tab=exams"
                                variant="exam"
                                title={exam.courseName}
                                meta={timeLabel || undefined}
                                details={
                                  timeLabel
                                    ? [
                                        {
                                          label: tSection("time"),
                                          value: timeLabel,
                                        },
                                      ]
                                    : undefined
                                }
                              />
                            );
                          })}
                          {dayHomeworks.map((hw) => {
                            const timeMeta = hw.submissionDueAt
                              ? dayjs(hw.submissionDueAt).format("HH:mm")
                              : "";
                            return (
                              <CalendarEventCardInteractive
                                key={hw.id}
                                href="/?tab=homeworks"
                                variant="homework"
                                title={hw.title}
                                meta={timeMeta ? `DDL ${timeMeta}` : undefined}
                                details={
                                  timeMeta
                                    ? [
                                        {
                                          label: tSection("time"),
                                          value: timeMeta,
                                        },
                                      ]
                                    : undefined
                                }
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
