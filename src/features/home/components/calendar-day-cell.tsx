import type dayjs from "dayjs";
import { CalendarEventCardInteractive } from "@/components/calendar-event-card-interactive";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { CalendarDayTodoCards } from "@/features/home/components/calendar-day-todo-cards";
import type {
  CalendarTodoItem,
  OverviewData,
} from "@/features/home/server/dashboard-overview-data";
import type {
  ExamItem,
  SessionItem,
} from "@/features/home/server/dashboard-types";
import { shanghaiDayjs } from "@/lib/time/shanghai-dayjs";
import { cn } from "@/lib/utils";
import { formatExamTypeLabel } from "@/shared/lib/exam-utils";
import { formatTime } from "@/shared/lib/time-utils";
import { compactLocation } from "./calendar-panel-shared";

type HomeworkCalendarItem = OverviewData["semesterHomeworks"][number];

export function CalendarDayCell({
  day,
  exams,
  homeworks,
  isCurrentMonth = true,
  isToday,
  sessions,
  tSection,
  todos,
  tTodos,
}: {
  day: dayjs.Dayjs;
  exams: ExamItem[];
  homeworks: HomeworkCalendarItem[];
  isCurrentMonth?: boolean;
  isToday: boolean;
  sessions: SessionItem[];
  tSection: (key: string, values?: Record<string, string | number>) => string;
  todos: CalendarTodoItem[];
  tTodos: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <div
      className={cn(
        "min-h-[7rem] min-w-0 overflow-hidden rounded-xl border border-border/50 bg-background/95 p-1.5 text-xs shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        !isCurrentMonth && "bg-background/75 opacity-70",
      )}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span
          className={cn(
            "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full font-semibold tabular-nums leading-none",
            isToday ? "bg-foreground text-background" : "text-foreground",
          )}
        >
          {day.format("D")}
        </span>
        {day.date() === 1 ? (
          <span className="text-[0.65rem] text-muted-foreground">
            {day.format("M 月")}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 space-y-1 overflow-hidden">
        {sessions.map((item) => {
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

        {exams.map((exam) => {
          const timeLabel =
            exam.startTime != null && exam.endTime != null
              ? `${formatTime(exam.startTime)}-${formatTime(exam.endTime)}`
              : "";
          const roomLabel = exam.rooms
            .map((room) => room.room)
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
                        value: formatExamTypeLabel(exam.examType, tSection),
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

        {homeworks.map((homework) => {
          const timeMeta = homework.submissionDueAt
            ? shanghaiDayjs(homework.submissionDueAt).format("HH:mm")
            : "";
          const descriptionRaw = homework.description?.content?.trim() ?? "";
          const description = descriptionRaw
            ? descriptionRaw.replace(/\s+/g, " ").slice(0, 120)
            : "";

          return (
            <CalendarEventCardInteractive
              key={homework.id}
              href="/?tab=homeworks"
              variant="homework"
              title={homework.title}
              time={timeMeta ? `${tTodos("dueLabel")} ${timeMeta}` : undefined}
              details={[
                ...(timeMeta
                  ? [
                      {
                        label: tTodos("dueAtLabel"),
                        value: timeMeta,
                      },
                    ]
                  : []),
                ...(description
                  ? [
                      {
                        label: tTodos("contentLabel"),
                        value: description,
                      },
                    ]
                  : []),
              ]}
            />
          );
        })}

        <CalendarDayTodoCards todos={todos} />
      </div>
    </div>
  );
}

export function EmptyCalendarPanel({ title }: { title: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}
