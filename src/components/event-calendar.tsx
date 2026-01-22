"use client";

import dayjs from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

export interface CalendarEvent {
  id: string;
  date?: Date | null;
  line: string;
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
  const [openEventId, setOpenEventId] = useState<string | null>(null);

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
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle>{monthLabel}</CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentMonth((prev) => prev.subtract(1, "month"))
              }
              aria-label={previousMonthLabel}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
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
        </CardHeader>
        <CardPanel className="space-y-2">
          <div className="overflow-x-auto">
            <div className="min-w-[720px] space-y-2 sm:min-w-0">
              <div className="grid grid-cols-[5rem_repeat(7,minmax(0,1fr))] gap-px rounded-lg border border-border/60 bg-border/60 overflow-hidden">
                <div className="bg-muted/10 px-2 py-2 text-xs font-medium text-muted-foreground">
                  {weekLabelHeader}
                </div>
                {weekdayOrder.map((weekday) => (
                  <div
                    key={weekdayLabels[weekday]}
                    className="bg-muted/10 px-2 py-2 text-xs font-medium text-muted-foreground"
                  >
                    {weekdayLabels[weekday]}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[5rem_repeat(7,minmax(0,1fr))] gap-px rounded-lg border border-border/60 bg-border/60 overflow-hidden">
                {weeks.map((week) => {
                  const weekStart = week[0];
                  const weekKey = weekStart.format("YYYY-MM-DD");
                  const weekNumber = getWeekNumberForDate(weekStart);
                  const weekLabel = weekNumber
                    ? weekLabelTemplate.replace("{week}", String(weekNumber))
                    : "—";

                  return (
                    <div key={weekKey} className="contents">
                      <div className="flex items-center bg-muted/10 px-2 text-xs font-medium text-muted-foreground">
                        {weekLabel}
                      </div>
                      {week.map((day) => {
                        const dateKey = day.format("YYYY-MM-DD");
                        const dayEvents = groupedEvents.get(dateKey) ?? [];
                        const sortedEvents = [...dayEvents].sort((a, b) => {
                          const aSort =
                            a.sortValue ??
                            (a.date ? dayjs(a.date).valueOf() : 0);
                          const bSort =
                            b.sortValue ??
                            (b.date ? dayjs(b.date).valueOf() : 0);
                          if (aSort !== bSort) return aSort - bSort;
                          if (a.date && b.date) {
                            return (
                              dayjs(a.date).valueOf() - dayjs(b.date).valueOf()
                            );
                          }
                          return a.line.localeCompare(b.line);
                        });
                        const isCurrentMonth =
                          day.month() === monthStartDay.month();
                        const isToday = day.isSame(today, "day");

                        return (
                          <div
                            key={dateKey}
                            className={cn(
                              "min-h-28 bg-background p-2 text-xs",
                              isCurrentMonth ? "" : "bg-muted/5",
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  "text-xs font-semibold",
                                  isToday &&
                                    "inline-flex size-5 items-center justify-center rounded-full bg-foreground text-background",
                                )}
                              >
                                {day.format("D")}
                              </span>
                            </div>
                            <div className="mt-2 space-y-1">
                              {sortedEvents.map((event) => (
                                <Popover
                                  key={event.id}
                                  open={openEventId === event.id}
                                  onOpenChange={(open) =>
                                    setOpenEventId(open ? event.id : null)
                                  }
                                >
                                  <PopoverTrigger
                                    className={cn(
                                      "w-full rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-left text-[0.7rem] text-foreground transition-colors hover:bg-muted/40",
                                      event.tone === "inverse" &&
                                        "border-foreground/80 bg-foreground text-background hover:bg-foreground/90",
                                    )}
                                    onPointerEnter={() =>
                                      setOpenEventId(event.id)
                                    }
                                    onPointerLeave={() => setOpenEventId(null)}
                                  >
                                    {event.line}
                                  </PopoverTrigger>
                                  {event.details &&
                                    event.details.length > 0 && (
                                      <PopoverContent
                                        side="top"
                                        align="start"
                                        className="w-64 max-h-64 overflow-auto"
                                      >
                                        <div className="space-y-2">
                                          <p className="text-sm font-medium">
                                            {event.line}
                                          </p>
                                          <div className="grid gap-1 text-xs text-muted-foreground">
                                            {event.details.map((detail) => (
                                              <div
                                                key={`${event.id}-${detail.label}-${detail.value}`}
                                                className="flex items-baseline gap-2"
                                              >
                                                <span className="shrink-0 whitespace-nowrap">
                                                  {detail.label}
                                                </span>
                                                <span className="min-w-0 font-medium text-foreground">
                                                  {detail.value}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    )}
                                </Popover>
                              ))}
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
        </CardPanel>
      </Card>
      {unscheduledEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{unscheduledLabel}</CardTitle>
          </CardHeader>
          <CardPanel className="grid gap-2 md:grid-cols-2">
            {unscheduledEvents.map((event) => (
              <Popover
                key={event.id}
                open={openEventId === event.id}
                onOpenChange={(open) => setOpenEventId(open ? event.id : null)}
              >
                <PopoverTrigger
                  className={cn(
                    "rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted/40",
                    event.tone === "inverse" &&
                      "border-foreground/80 bg-foreground text-background hover:bg-foreground/90",
                  )}
                  onPointerEnter={() => setOpenEventId(event.id)}
                  onPointerLeave={() => setOpenEventId(null)}
                >
                  {event.line}
                </PopoverTrigger>
                {event.details && event.details.length > 0 && (
                  <PopoverContent
                    side="top"
                    align="start"
                    className="w-64 max-h-64 overflow-auto"
                  >
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{event.line}</p>
                      <div className="grid gap-1 text-xs text-muted-foreground">
                        {event.details.map((detail) => (
                          <div
                            key={`${event.id}-${detail.label}-${detail.value}`}
                            className="flex items-baseline gap-2"
                          >
                            <span className="shrink-0 whitespace-nowrap">
                              {detail.label}
                            </span>
                            <span className="min-w-0 font-medium text-foreground">
                              {detail.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            ))}
          </CardPanel>
        </Card>
      )}
    </div>
  );
}
