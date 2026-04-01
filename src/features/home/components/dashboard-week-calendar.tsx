import type dayjs from "dayjs";
import { getTranslations } from "next-intl/server";
import type {
  CalendarTodoItem,
  OverviewData,
} from "@/app/dashboard/dashboard-data";
import type { ExamItem, SessionItem } from "@/app/dashboard/types";
import { CalendarEventCardInteractive } from "@/components/calendar-event-card-interactive";
import { CalendarDayTodoCards } from "@/features/home/components/calendar-day-todo-cards";
import { Link } from "@/i18n/routing";
import { shanghaiDayjs } from "@/lib/time/shanghai-dayjs";
import { cn } from "@/lib/utils";
import { formatExamTypeLabel } from "@/shared/lib/exam-utils";
import { formatTime } from "@/shared/lib/time-utils";

const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function compactLocation(raw: string | null | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  const first = value.split(" · ")[0]?.trim();
  return first || undefined;
}

function parseWeekParam(raw: string | undefined): dayjs.Dayjs | null {
  if (!raw) return null;
  const d = shanghaiDayjs(raw);
  if (!d.isValid()) return null;
  return d.startOf("day");
}

function getWeekStart(date: dayjs.Dayjs, weekStartsOn: 0 | 1) {
  let start = date.startOf("day");
  while (start.day() !== weekStartsOn) {
    start = start.subtract(1, "day");
  }
  return start;
}

type WeekCalendarData = Pick<
  OverviewData,
  | "allSessions"
  | "allExams"
  | "semesterHomeworks"
  | "semesterTodos"
  | "todayStart"
  | "semesterStart"
  | "semesterEnd"
  | "referenceNow"
>;

export async function DashboardWeekCalendar({
  data,
  week,
  navHrefBase,
  weekQueryKey,
  showWeekNav = true,
}: {
  data: WeekCalendarData;
  week?: string;
  /** e.g. "/?tab=calendar&calendarView=week" or "/?tab=overview" */
  navHrefBase: string;
  weekQueryKey: "calendarWeek" | "overviewWeek";
  /** 总览等场景可隐藏「第 N 周 / 上一周 / 下一周」条 */
  showWeekNav?: boolean;
}) {
  const tSection = await getTranslations("sectionDetail");
  const tTodos = await getTranslations("todos");
  const t = showWeekNav ? await getTranslations("meDashboard") : null;

  const {
    allSessions,
    allExams,
    semesterHomeworks,
    semesterTodos,
    todayStart,
    semesterStart,
    semesterEnd,
    referenceNow,
  } = data;

  const weekdayLabels = WEEKDAY_KEYS.map((key) => tSection(`weekdays.${key}`));
  const weekLabelTemplate = tSection("weekNumber", { week: "{week}" });
  const weekStartsOn: 0 | 1 = 0;

  const sessionsByDay = new Map<string, SessionItem[]>();
  for (const item of allSessions) {
    const key = shanghaiDayjs(item.date).format("YYYY-MM-DD");
    const list = sessionsByDay.get(key) ?? [];
    list.push(item);
    sessionsByDay.set(key, list);
  }
  const examsByDay = new Map<string, ExamItem[]>();
  for (const exam of allExams) {
    if (!exam.date) continue;
    const key = shanghaiDayjs(exam.date).format("YYYY-MM-DD");
    const list = examsByDay.get(key) ?? [];
    list.push(exam);
    examsByDay.set(key, list);
  }
  const homeworksByDay = new Map<string, typeof semesterHomeworks>();
  for (const hw of semesterHomeworks) {
    if (!hw.submissionDueAt) continue;
    const key = shanghaiDayjs(hw.submissionDueAt).format("YYYY-MM-DD");
    const list = homeworksByDay.get(key) ?? [];
    list.push(hw);
    homeworksByDay.set(key, list);
  }
  const todosByDay = new Map<string, CalendarTodoItem[]>();
  for (const todo of semesterTodos) {
    const key = shanghaiDayjs(todo.dueAt).format("YYYY-MM-DD");
    const list = todosByDay.get(key) ?? [];
    list.push(todo);
    todosByDay.set(key, list);
  }

  const resolveWeekNumber = (weekStart: dayjs.Dayjs) => {
    if (!semesterStart || !semesterEnd) return null;
    const start = shanghaiDayjs(semesterStart);
    const end = shanghaiDayjs(semesterEnd);
    const weekEnd = weekStart.add(6, "day");
    if (weekEnd.isBefore(start, "day") || weekStart.isAfter(end, "day"))
      return null;
    const semesterWeekStart = getWeekStart(start, weekStartsOn);
    return weekStart.diff(semesterWeekStart, "week") + 1;
  };

  const weekBase =
    parseWeekParam(week) ?? getWeekStart(referenceNow, weekStartsOn);
  const weekStart = getWeekStart(weekBase, weekStartsOn);
  const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day"));
  const weekPrev = weekStart.subtract(7, "day");
  const weekNext = weekStart.add(7, "day");
  const weekNumber = resolveWeekNumber(weekStart);
  const weekLabel =
    weekNumber != null
      ? weekLabelTemplate.replace("{week}", String(weekNumber))
      : "—";

  const sep = navHrefBase.includes("?") ? "&" : "?";
  const weekLink = (d: dayjs.Dayjs) =>
    `${navHrefBase}${sep}${weekQueryKey}=${d.format("YYYY-MM-DD")}`;
  const weekNavButtonClass =
    "rounded-lg border border-border/70 bg-card/72 px-2.5 py-1.5 text-sm no-underline transition-colors hover:bg-background/90";
  const weekGridFrameClass =
    "grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] gap-1 rounded-2xl border border-border/70 bg-card/50 p-1";
  const weekGridHeaderCellClass =
    "rounded-xl bg-background/85 px-1 py-3 text-center font-medium text-muted-foreground text-xs";
  const weekGridWeekLabelClass =
    "flex items-start justify-center rounded-xl bg-background/70 px-1 py-2 font-medium text-[0.65rem] text-muted-foreground";

  return (
    <div className="space-y-2">
      {showWeekNav && t ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href={weekLink(weekPrev)} className={weekNavButtonClass}>
            {t("calendarWeek.prev")}
          </Link>
          <span className="min-w-0 shrink font-medium text-foreground text-sm">
            {weekLabel}
          </span>
          <Link href={weekLink(weekNext)} className={weekNavButtonClass}>
            {t("calendarWeek.next")}
          </Link>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className={weekGridFrameClass}>
            <div className={cn(weekGridHeaderCellClass, "rounded-t-xl")}>
              {tSection("weekLabel")}
            </div>
            {weekdayLabels.map((label) => (
              <div key={label} className={weekGridHeaderCellClass}>
                {label}
              </div>
            ))}

            <div className="contents">
              <div className={weekGridWeekLabelClass}>
                <span className="[text-orientation:mixed] [writing-mode:vertical-rl]">
                  {weekLabel}
                </span>
              </div>
              {weekDays.map((day) => {
                const dateKey = day.format("YYYY-MM-DD");
                const isToday = day.isSame(todayStart, "day");
                const daySessions = sessionsByDay.get(dateKey) ?? [];
                const dayExams = examsByDay.get(dateKey) ?? [];
                const dayHomeworks = homeworksByDay.get(dateKey) ?? [];
                const dayTodos = todosByDay.get(dateKey) ?? [];
                return (
                  <div
                    key={dateKey}
                    className="min-h-[7rem] min-w-0 overflow-hidden rounded-xl border border-border/50 bg-background/95 p-1.5 text-xs shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span
                        className={cn(
                          "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full font-semibold tabular-nums leading-none",
                          isToday
                            ? "bg-foreground text-background"
                            : "text-foreground",
                        )}
                      >
                        {day.format("D")}
                      </span>
                      {day.date() === 1 && (
                        <span className="text-[0.65rem] text-muted-foreground">
                          {day.format("M 月")}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1 overflow-hidden">
                      {daySessions.map((item: SessionItem) => {
                        const timeLabel = `${formatTime(item.startTime)}-${formatTime(item.endTime)}`;
                        const location = compactLocation(item.location);
                        const details = [
                          { label: tSection("time"), value: timeLabel },
                          ...(location
                            ? [
                                {
                                  label: tSection("location"),
                                  value: location,
                                },
                              ]
                            : []),
                          ...(item.teacherDisplay
                            ? [
                                {
                                  label: tSection("teacher"),
                                  value: item.teacherDisplay,
                                },
                              ]
                            : []),
                        ];
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
                            time={timeLabel}
                            details={details}
                          />
                        );
                      })}
                      {dayExams.map((exam: ExamItem) => {
                        const timeLabel =
                          exam.startTime != null && exam.endTime != null
                            ? `${formatTime(exam.startTime)}-${formatTime(exam.endTime)}`
                            : "";
                        const roomLabel = exam.rooms
                          .map((r) => r.room)
                          .filter(Boolean)
                          .join("、");
                        return (
                          <CalendarEventCardInteractive
                            key={exam.id}
                            href="/?tab=exams"
                            variant="exam"
                            title={exam.courseName}
                            time={timeLabel || undefined}
                            details={[
                              ...(timeLabel
                                ? [
                                    {
                                      label: tSection("time"),
                                      value: timeLabel,
                                    },
                                  ]
                                : []),
                              ...(exam.examMode
                                ? [
                                    {
                                      label: tSection("examMode"),
                                      value: exam.examMode,
                                    },
                                  ]
                                : []),
                              ...(exam.examType != null
                                ? [
                                    {
                                      label: tSection("examType"),
                                      value: formatExamTypeLabel(
                                        exam.examType,
                                        tSection,
                                      ),
                                    },
                                  ]
                                : []),
                              ...(roomLabel
                                ? [
                                    {
                                      label: tSection("location"),
                                      value: roomLabel,
                                    },
                                  ]
                                : []),
                              ...(exam.examTakeCount != null
                                ? [
                                    {
                                      label: tSection("examCount"),
                                      value: String(exam.examTakeCount),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        );
                      })}
                      {dayHomeworks.map((hw) => {
                        const timeMeta = hw.submissionDueAt
                          ? shanghaiDayjs(hw.submissionDueAt).format("HH:mm")
                          : "";
                        const descRaw = hw.description?.content?.trim() ?? "";
                        const desc = descRaw
                          ? descRaw.replace(/\s+/g, " ").slice(0, 120)
                          : "";
                        return (
                          <CalendarEventCardInteractive
                            key={hw.id}
                            href="/?tab=homeworks"
                            variant="homework"
                            title={hw.title}
                            time={
                              timeMeta
                                ? `${tTodos("dueLabel")} ${timeMeta}`
                                : undefined
                            }
                            details={[
                              ...(timeMeta
                                ? [
                                    {
                                      label: tTodos("dueAtLabel"),
                                      value: timeMeta,
                                    },
                                  ]
                                : []),
                              ...(desc
                                ? [
                                    {
                                      label: tTodos("contentLabel"),
                                      value: desc,
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        );
                      })}
                      <CalendarDayTodoCards todos={dayTodos} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
