import dayjs from "dayjs";
import { BookOpenCheck, Calendar, CheckSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { OverviewData } from "@/app/dashboard/dashboard-data";
import type { SessionItem } from "@/app/dashboard/types";
import { ScheduleSessionLink } from "@/components/schedules/schedule-session-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardLinksPanel } from "@/features/dashboard-links/components/dashboard-links-panel";
import type { TodoItem } from "@/features/todos/components/todo-list";
import { Link } from "@/i18n/routing";
import { formatTime } from "@/shared/lib/time-utils";
import { cn } from "@/shared/lib/utils";

type ETAResult = { etaLabel: string; exactTime: string };

function getHomeworkETA(
  dueAt: Date,
  referenceNow: dayjs.Dayjs,
  t: (key: string, values?: Record<string, number | string>) => string,
): ETAResult {
  const due = dayjs(dueAt);
  const exactTime = due.format("YYYY-MM-DD HH:mm");
  const diffMinutes = due.diff(referenceNow, "minute", true);
  const diffHours = due.diff(referenceNow, "hour", true);
  const diffDays = due.diff(referenceNow, "day", true);

  if (diffMinutes <= 0) {
    return { etaLabel: t("homeworks.etaOverdue"), exactTime };
  }
  if (diffMinutes < 60) {
    return {
      etaLabel: t("homeworks.etaMinutes", { count: Math.ceil(diffMinutes) }),
      exactTime,
    };
  }
  if (diffHours < 24 && due.isSame(referenceNow, "day")) {
    return {
      etaLabel: t("homeworks.etaHours", { count: Math.floor(diffHours) }),
      exactTime,
    };
  }
  if (due.isSame(referenceNow, "day")) {
    return { etaLabel: t("homeworks.etaToday"), exactTime };
  }
  if (diffDays < 7) {
    return {
      etaLabel: t("homeworks.etaDays", { count: Math.ceil(diffDays) }),
      exactTime,
    };
  }
  return {
    etaLabel: t("homeworks.etaDays", { count: Math.ceil(diffDays) }),
    exactTime,
  };
}

export async function OverviewPanel({
  data,
  todosData,
}: {
  data: OverviewData;
  todosData: TodoItem[];
}) {
  const t = await getTranslations("meDashboard");
  const _tCommon = await getTranslations("common");
  const {
    hasAnySelection,
    hasCurrentTermSelection,
    currentTermName,
    todaySessions,
    tomorrowSessions,
    weeklySessions,
    weekDays,
    timeSlots,
    incompleteHomeworks,
    dueToday,
    dueWithin3Days,
    weekDayFormatter,
    showDebugTools,
    referenceNow,
    busiestDate,
  } = data;

  if (!hasCurrentTermSelection) {
    const pendingTodosNoTerm = todosData.filter((todo) => !todo.completed);
    return (
      <div className="space-y-6">
        <Card>
          <CardPanel>
            <DashboardLinksPanel
              links={data.overviewLinks}
              variant="overview"
            />
          </CardPanel>
        </Card>

        <Card className="border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle>
              <Link
                href="/?tab=subscriptions"
                className="rounded-sm text-inherit no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t("termSelection.title")}
              </Link>
            </CardTitle>
            <CardDescription>
              {hasAnySelection
                ? t("termSelection.noCurrentTerm", { term: currentTermName })
                : t("termSelection.noAnySelection")}
            </CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-wrap gap-2">
            <Button
              render={
                <Link className="no-underline" href="/?tab=subscriptions" />
              }
            >
              {t("termSelection.openSelection")}
            </Button>
            <Button
              variant="outline"
              render={<Link className="no-underline" href="/courses" />}
            >
              {t("termSelection.browseCourses")}
            </Button>
          </CardPanel>
        </Card>

        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2">
              <Link
                href="/?tab=todos"
                className="inline-flex items-center gap-2 rounded-sm text-inherit no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <CheckSquare className="h-4 w-4" />
                {t("todos.title")}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardPanel className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" size="default" className="border-0">
              {t("todos.pending", { count: pendingTodosNoTerm.length })}
            </Badge>
          </CardPanel>
        </Card>
      </div>
    );
  }

  const hasToday = todaySessions.length > 0;
  const hasTomorrow = tomorrowSessions.length > 0;

  const todayStart = referenceNow.startOf("day");
  const pendingTodos = todosData.filter((t) => !t.completed);
  const dueTodayTodos = pendingTodos.filter(
    (t) => t.dueAt && dayjs(t.dueAt).isSame(todayStart, "day"),
  );
  const dueWithin3DaysTodos = pendingTodos.filter(
    (t) =>
      t.dueAt &&
      dayjs(t.dueAt).isAfter(todayStart) &&
      dayjs(t.dueAt).isBefore(todayStart.add(4, "day")),
  );

  return (
    <div className="space-y-6">
      {showDebugTools && (
        <Card className="border-muted-foreground/30 border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("devDate.title")}</CardTitle>
            <CardDescription>
              {t("devDate.description", {
                date: referenceNow.format("YYYY-MM-DD"),
              })}
            </CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-wrap gap-2 text-sm">
            <span className="text-muted-foreground">
              {referenceNow.format("YYYY-MM-DD ddd")}
            </span>
            {busiestDate && (
              <Link
                href={`/?debugTools=1&debugDate=${busiestDate.format("YYYY-MM-DD")}`}
                className="text-primary underline"
              >
                {t("devDate.busiest")}
              </Link>
            )}
          </CardPanel>
        </Card>
      )}

      <Card>
        <CardPanel>
          <DashboardLinksPanel links={data.overviewLinks} variant="overview" />
        </CardPanel>
      </Card>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2">
            <Link
              href="/?tab=calendar"
              className="inline-flex items-center gap-2 rounded-sm text-inherit no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Calendar className="h-4 w-4" />
              {t("nav.calendar.title")}
            </Link>
          </CardTitle>
        </CardHeader>
        <CardPanel className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <section className="space-y-2">
              <h3 className="font-medium text-muted-foreground text-sm">
                {t("today.title")}
              </h3>
              {hasToday ? (
                <div className="space-y-2">
                  {todaySessions.map((item: SessionItem) => (
                    <ScheduleSessionLink
                      key={item.id}
                      href={
                        item.sectionJwId
                          ? `/sections/${item.sectionJwId}`
                          : "/?tab=subscriptions"
                      }
                      courseName={item.courseName}
                      location={item.teacherDisplay}
                      timeLabel={formatTime(item.startTime)}
                      durationLabel={formatTime(item.endTime)}
                      variant="detailed"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("today.empty")}
                </p>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="font-medium text-muted-foreground text-sm">
                {t("tomorrow.title")}
              </h3>
              {hasTomorrow ? (
                <div className="space-y-2">
                  {tomorrowSessions.map((item: SessionItem) => (
                    <ScheduleSessionLink
                      key={item.id}
                      href={
                        item.sectionJwId
                          ? `/sections/${item.sectionJwId}`
                          : "/?tab=subscriptions"
                      }
                      courseName={item.courseName}
                      location={item.teacherDisplay}
                      timeLabel={formatTime(item.startTime)}
                      durationLabel={formatTime(item.endTime)}
                      variant="detailed"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("tomorrow.empty")}
                </p>
              )}
            </section>
          </div>

          <section className="space-y-2">
            <h3 className="font-medium text-muted-foreground text-sm">
              {t("week.title")}
            </h3>
            {timeSlots.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table className="min-w-[880px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10 w-32 bg-card">
                        {t("week.time")}
                      </TableHead>
                      {weekDays.map((day) => {
                        const isToday = day.isSame(referenceNow, "day");
                        return (
                          <TableHead
                            key={day.format("YYYY-MM-DD")}
                            className={cn(
                              "text-center",
                              isToday &&
                                "underline decoration-2 decoration-muted-foreground decoration-dotted underline-offset-2",
                            )}
                          >
                            {weekDayFormatter.format(day.toDate())}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeSlots.map((slot) => (
                      <TableRow key={slot.key}>
                        <TableCell className="sticky left-0 z-10 bg-card align-top font-medium text-xs">
                          {formatTime(slot.startTime)}-
                          {formatTime(slot.endTime)}
                        </TableCell>
                        {weekDays.map((day) => {
                          const cellSessions = weeklySessions.filter(
                            (s) =>
                              s.startTime === slot.startTime &&
                              s.endTime === slot.endTime &&
                              dayjs(s.date).isSame(day, "day"),
                          );
                          return (
                            <TableCell
                              key={day.format("YYYY-MM-DD")}
                              className="p-1 align-top"
                            >
                              {cellSessions.map((s) => (
                                <Link
                                  key={s.id}
                                  href={
                                    s.sectionJwId
                                      ? `/sections/${s.sectionJwId}`
                                      : "/?tab=subscriptions"
                                  }
                                  className="block truncate rounded-md border border-border bg-muted/20 px-1.5 py-0.5 text-xs no-underline transition-colors hover:bg-accent"
                                >
                                  {s.courseName}
                                </Link>
                              ))}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t("week.empty")}</p>
            )}
          </section>
        </CardPanel>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2">
              <Link
                href="/?tab=homeworks"
                className="inline-flex items-center gap-2 rounded-sm text-inherit no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <BookOpenCheck className="h-4 w-4" />
                {t("homeworks.title")}
              </Link>
            </CardTitle>
            <CardAction>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge
                  variant="warning"
                  size="default"
                  className="w-fit border-0"
                >
                  {t("homeworks.dueToday", { count: dueToday.length })}
                </Badge>
                <Badge
                  variant="outline"
                  size="default"
                  className="w-fit border-0"
                >
                  {t("homeworks.dueSoon", { count: dueWithin3Days.length })}
                </Badge>
                <Badge
                  variant="outline"
                  size="default"
                  className="w-fit border-0"
                >
                  {t("homeworks.all", { count: incompleteHomeworks.length })}
                </Badge>
              </div>
            </CardAction>
          </CardHeader>
          {incompleteHomeworks.length > 0 && (
            <CardPanel className="box-content space-y-2">
              {incompleteHomeworks.slice(0, 5).map((hw) => {
                const href = hw.section?.jwId
                  ? `/sections/${hw.section.jwId}#homework-${hw.id}`
                  : "/?tab=homeworks";
                const eta = hw.submissionDueAt
                  ? getHomeworkETA(hw.submissionDueAt, referenceNow, t)
                  : null;
                return (
                  <Link
                    key={hw.id}
                    href={href}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5 no-underline transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">{hw.title}</p>
                      <p className="truncate text-muted-foreground text-xs">
                        {hw.section?.course?.namePrimary ?? "—"}
                      </p>
                    </div>
                    {eta && (
                      <div className="shrink-0 text-right">
                        <p className="font-medium text-sm">{eta.etaLabel}</p>
                        <p className="text-muted-foreground text-xs">
                          {eta.exactTime}
                        </p>
                      </div>
                    )}
                  </Link>
                );
              })}
            </CardPanel>
          )}
        </Card>

        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2">
              <Link
                href="/?tab=todos"
                className="inline-flex items-center gap-2 rounded-sm text-inherit no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <CheckSquare className="h-4 w-4" />
                {t("todos.title")}
              </Link>
            </CardTitle>
            <CardAction>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge
                  variant="warning"
                  size="default"
                  className="w-fit border-0"
                >
                  {t("todos.dueToday", { count: dueTodayTodos.length })}
                </Badge>
                <Badge
                  variant="outline"
                  size="default"
                  className="w-fit border-0"
                >
                  {t("todos.dueSoon", { count: dueWithin3DaysTodos.length })}
                </Badge>
                <Badge
                  variant="outline"
                  size="default"
                  className="w-fit border-0"
                >
                  {t("todos.all", { count: pendingTodos.length })}
                </Badge>
              </div>
            </CardAction>
          </CardHeader>
          {pendingTodos.length > 0 && (
            <CardPanel className="box-content space-y-2">
              {pendingTodos.slice(0, 5).map((todo) => {
                const dueLabel = todo.dueAt
                  ? dayjs(todo.dueAt).format("YYYY-MM-DD")
                  : null;
                return (
                  <Link
                    key={todo.id}
                    href="/?tab=todos"
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5 no-underline transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">
                        {todo.title}
                      </p>
                      <p className="truncate text-muted-foreground text-xs capitalize">
                        {todo.priority}
                      </p>
                    </div>
                    {dueLabel && (
                      <div className="shrink-0 text-right">
                        <p className="font-medium text-sm">{dueLabel}</p>
                      </div>
                    )}
                  </Link>
                );
              })}
            </CardPanel>
          )}
        </Card>
      </div>
    </div>
  );
}
