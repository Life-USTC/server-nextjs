"use client";

import dayjs from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { CalendarEventVariant } from "@/components/calendar-event-card";
import { CalendarEventCardInteractive } from "@/components/calendar-event-card-interactive";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export interface CalendarEventDetail {
  label: string;
  value: string;
}

export interface CalendarSemester {
  id: number;
  startDate: Date | null;
  endDate: Date | null;
}

export type { CalendarEventVariant } from "@/components/calendar-event-card";

export interface CalendarEvent {
  id: string;
  date?: Date | null;
  /** @deprecated Use title + meta instead */
  line?: string;
  /** Display as card title. Falls back to line when absent. */
  title?: string;
  /** Display as card meta (e.g. time, location). */
  meta?: string;
  /** Link URL for navigation on click. */
  href?: string;
  /** Card border/style variant. Maps from tone when absent. */
  variant?: CalendarEventVariant;
  /** @deprecated Use variant instead */
  tone?: "default" | "inverse";
  details?: CalendarEventDetail[];
  sortValue?: number;
}

interface EventCalendarProps {
  events: CalendarEvent[];
  emptyLabel: string;
  headerActions?: ReactNode;
  monthStart: Date;
  monthFormat?: string;
  semesters: CalendarSemester[];
  weekLabelHeader: string;
  weekLabelTemplate: string;
  weekdayLabels: string[];
  weekStartsOn?: 0 | 1;
  unscheduledLabel: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
}

const defaultMonthFormat = "YYYY.MM";

export function EventCalendar({
  events,
  emptyLabel,
  headerActions,
  monthStart,
  monthFormat = defaultMonthFormat,
  semesters,
  weekLabelHeader,
  weekLabelTemplate,
  weekdayLabels,
  weekStartsOn = 1,
  unscheduledLabel,
  previousMonthLabel,
  nextMonthLabel,
}: EventCalendarProps) {
  const today = dayjs();
  const [currentMonth, setCurrentMonth] = useState(
    dayjs(monthStart).startOf("month"),
  );

  const { gridDays, monthLabel, weekdayOrder } = useMemo(() => {
    const monthStartDay = currentMonth.startOf("month");
    let gridStart = monthStartDay;

    while (gridStart.day() !== weekStartsOn) {
      gridStart = gridStart.subtract(1, "day");
    }

    return {
      gridDays: Array.from({ length: 42 }, (_, index) =>
        gridStart.add(index, "day"),
      ),
      weekdayOrder: Array.from(
        { length: 7 },
        (_, index) => (weekStartsOn + index) % 7,
      ),
      monthLabel: monthStartDay.format(monthFormat),
    };
  }, [currentMonth, monthFormat, weekStartsOn]);

  const getWeekStart = (date: dayjs.Dayjs) => {
    let weekStart = date.startOf("day");
    while (weekStart.day() !== weekStartsOn) {
      weekStart = weekStart.subtract(1, "day");
    }
    return weekStart;
  };

  const semesterRanges = useMemo(
    () =>
      semesters
        .filter((semester) => semester.startDate && semester.endDate)
        .map((semester) => ({
          ...semester,
          start: dayjs(semester.startDate),
          end: dayjs(semester.endDate),
        })),
    [semesters],
  );

  const getWeekNumberForDate = (weekStart: dayjs.Dayjs) => {
    const weekEnd = weekStart.add(6, "day");
    const matchedSemester = semesterRanges.find(
      (semester) =>
        !weekEnd.isBefore(semester.start, "day") &&
        !weekStart.isAfter(semester.end, "day"),
    );

    if (!matchedSemester) return null;

    const semesterWeekStart = getWeekStart(matchedSemester.start);
    const diffWeeks = weekStart.diff(semesterWeekStart, "week");
    return diffWeeks + 1;
  };

  const monthStartDay = currentMonth.startOf("month");
  const weeks = Array.from({ length: 6 }, (_, index) =>
    gridDays.slice(index * 7, index * 7 + 7),
  );

  if (events.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{emptyLabel}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  const groupedEvents = new Map<string, CalendarEvent[]>();
  const unscheduledEvents: CalendarEvent[] = [];

  for (const event of events) {
    if (!event.date) {
      unscheduledEvents.push(event);
      continue;
    }

    const dateKey = dayjs(event.date).format("YYYY-MM-DD");
    const existing = groupedEvents.get(dateKey) ?? [];
    existing.push(event);
    groupedEvents.set(dateKey, existing);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-border/60 border-b px-2 py-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground text-sm">
            {monthLabel}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentMonth((prev) => prev.subtract(1, "month"))}
            aria-label={previousMonthLabel}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentMonth((prev) => prev.add(1, "month"))}
            aria-label={nextMonthLabel}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {headerActions && (
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {headerActions}
          </div>
        )}
      </div>
      <div className="space-y-2 p-2">
        <div className="overflow-x-auto">
          <div className="min-w-[680px] space-y-2 sm:min-w-0">
            <div className="grid grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] gap-px overflow-hidden rounded-lg border border-border/60 bg-border/60">
              <div className="flex items-center justify-center bg-muted/10 px-1 py-2 font-medium text-[0.65rem] text-muted-foreground">
                {weekLabelHeader}
              </div>
              {weekdayOrder.map((weekday) => (
                <div
                  key={weekdayLabels[weekday]}
                  className="flex items-center justify-center bg-muted/10 py-2 font-medium text-muted-foreground text-xs"
                >
                  {weekdayLabels[weekday]}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] gap-px overflow-hidden rounded-lg border border-border/60 bg-border/60">
              {weeks.map((week) => {
                const weekStart = week[0];
                const weekKey = weekStart.format("YYYY-MM-DD");
                const weekNumber = getWeekNumberForDate(weekStart);
                const weekLabel = weekNumber
                  ? weekLabelTemplate.replace("{week}", String(weekNumber))
                  : "—";

                return (
                  <div key={weekKey} className="contents">
                    <div className="flex items-center justify-center bg-muted/10 px-1 font-medium text-[0.65rem] text-muted-foreground">
                      <span className="[text-orientation:mixed] [writing-mode:vertical-rl]">
                        {weekLabel}
                      </span>
                    </div>
                    {week.map((day) => {
                      const dateKey = day.format("YYYY-MM-DD");
                      const dayEvents = groupedEvents.get(dateKey) ?? [];
                      const sortedEvents = [...dayEvents].sort((a, b) => {
                        const aSort =
                          a.sortValue ?? (a.date ? dayjs(a.date).valueOf() : 0);
                        const bSort =
                          b.sortValue ?? (b.date ? dayjs(b.date).valueOf() : 0);
                        if (aSort !== bSort) return aSort - bSort;
                        if (a.date && b.date) {
                          return (
                            dayjs(a.date).valueOf() - dayjs(b.date).valueOf()
                          );
                        }
                        return (a.title ?? a.line ?? "").localeCompare(
                          b.title ?? b.line ?? "",
                        );
                      });
                      const isCurrentMonth =
                        day.month() === monthStartDay.month();
                      const isToday = day.isSame(today, "day");

                      return (
                        <div
                          key={dateKey}
                          className={cn(
                            "min-h-24 min-w-0 overflow-hidden bg-background p-1 text-xs",
                            isCurrentMonth ? "" : "bg-muted/5",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                "font-semibold text-xs",
                                isToday &&
                                  "inline-flex size-5 items-center justify-center rounded-full bg-foreground text-background",
                              )}
                            >
                              {day.format("D")}
                            </span>
                          </div>
                          <div className="mt-1.5 min-w-0 space-y-1 overflow-hidden">
                            {sortedEvents.map((event) => {
                              const variant: CalendarEventVariant =
                                event.variant ??
                                (event.tone === "inverse" ? "exam" : "session");
                              const title = event.title ?? event.line ?? "";
                              return (
                                <CalendarEventCardInteractive
                                  key={event.id}
                                  variant={variant}
                                  title={title}
                                  meta={event.meta}
                                  href={event.href}
                                  details={event.details}
                                  className="w-full"
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

      {unscheduledEvents.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-background p-2">
          <div className="font-medium text-muted-foreground text-xs">
            {unscheduledLabel}
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {unscheduledEvents.map((event) => {
              const variant: CalendarEventVariant =
                event.variant ??
                (event.tone === "inverse" ? "exam" : "session");
              const title = event.title ?? event.line ?? "";
              return (
                <CalendarEventCardInteractive
                  key={event.id}
                  variant={variant}
                  title={title}
                  meta={event.meta}
                  href={event.href}
                  details={event.details}
                  className="w-full rounded-lg px-3 py-2"
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
