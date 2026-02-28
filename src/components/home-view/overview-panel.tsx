import dayjs from "dayjs";
import { BookOpenCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { OverviewData } from "@/app/dashboard/dashboard-data";
import type { SessionItem } from "@/app/dashboard/types";
import { ScheduleSessionLink } from "@/components/schedules/schedule-session-link";
import { Button } from "@/components/ui/button";
import {
  Card,
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
import { Link } from "@/i18n/routing";
import { formatDuration, formatTime } from "@/lib/time-utils";

export async function OverviewPanel({ data }: { data: OverviewData }) {
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
    return (
      <div className="space-y-6">
        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle>{t("termSelection.title")}</CardTitle>
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
      </div>
    );
  }

  const hasToday = todaySessions.length > 0;
  const hasTomorrow = tomorrowSessions.length > 0;

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

      <div className="grid gap-4 md:grid-cols-2">
        {hasToday ? (
          <Card>
            <CardHeader className="pb-0">
              <CardTitle>{t("today.title")}</CardTitle>
            </CardHeader>
            <CardPanel className="space-y-2">
              {todaySessions.map((item: SessionItem) => (
                <ScheduleSessionLink
                  key={item.id}
                  href={
                    item.sectionJwId
                      ? `/sections/${item.sectionJwId}`
                      : "/?tab=subscriptions"
                  }
                  courseName={item.courseName}
                  location={item.location}
                  timeLabel={`${formatTime(item.startTime)}-${formatTime(item.endTime)}`}
                  durationLabel={formatDuration(item.startTime, item.endTime)}
                  variant="detailed"
                />
              ))}
            </CardPanel>
          </Card>
        ) : null}
        {hasTomorrow ? (
          <Card>
            <CardHeader className="pb-0">
              <CardTitle>{t("tomorrow.title")}</CardTitle>
            </CardHeader>
            <CardPanel className="space-y-2">
              {tomorrowSessions.map((item: SessionItem) => (
                <ScheduleSessionLink
                  key={item.id}
                  href={
                    item.sectionJwId
                      ? `/sections/${item.sectionJwId}`
                      : "/?tab=subscriptions"
                  }
                  courseName={item.courseName}
                  location={item.location}
                  timeLabel={`${formatTime(item.startTime)}-${formatTime(item.endTime)}`}
                  durationLabel={formatDuration(item.startTime, item.endTime)}
                  variant="detailed"
                />
              ))}
            </CardPanel>
          </Card>
        ) : null}
      </div>

      {!hasToday && !hasTomorrow && (
        <Card>
          <CardPanel>
            <p className="text-muted-foreground text-sm">
              {t("today.empty")} {t("tomorrow.empty")}
            </p>
          </CardPanel>
        </Card>
      )}

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2">
            <BookOpenCheck className="h-4 w-4" />
            {t("homeworks.title")}
          </CardTitle>
        </CardHeader>
        <CardPanel className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-warning/50 bg-warning/10 px-2 py-1 text-sm">
            {t("homeworks.dueToday", { count: dueToday.length })}
          </span>
          <span className="rounded-md border px-2 py-1 text-muted-foreground text-sm">
            {t("homeworks.dueSoon", { count: dueWithin3Days.length })}
          </span>
        </CardPanel>
        {incompleteHomeworks.length > 0 && (
          <CardPanel className="box-content space-y-2 pt-3">
            {incompleteHomeworks.slice(0, 5).map((hw) => {
              const href = hw.section?.jwId
                ? `/sections/${hw.section.jwId}#homework-${hw.id}`
                : "/?tab=homeworks";
              const dueLabel = hw.submissionDueAt
                ? dayjs(hw.submissionDueAt).format("YYYY-MM-DD HH:mm")
                : null;
              return (
                <Link
                  key={hw.id}
                  href={href}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 no-underline transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">{hw.title}</p>
                    <p className="truncate text-muted-foreground text-xs">
                      {hw.section?.course?.namePrimary ?? "—"}
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

      {timeSlots.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("week.title")}</CardTitle>
          </CardHeader>
          <CardPanel>
            <div className="overflow-x-auto rounded-md border">
              <Table className="min-w-[880px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 w-32 bg-card">
                      {t("week.time")}
                    </TableHead>
                    {weekDays.map((day) => (
                      <TableHead
                        key={day.format("YYYY-MM-DD")}
                        className="text-center"
                      >
                        {weekDayFormatter.format(day.toDate())}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeSlots.map((slot) => (
                    <TableRow key={slot.key}>
                      <TableCell className="sticky left-0 z-10 bg-card align-top font-medium text-xs">
                        {formatTime(slot.startTime)}-{formatTime(slot.endTime)}
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
                                className="block truncate rounded border px-1 py-0.5 text-xs no-underline hover:bg-accent"
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
          </CardPanel>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("week.title")}</CardTitle>
          </CardHeader>
          <CardPanel>
            <p className="text-muted-foreground text-sm">{t("week.empty")}</p>
          </CardPanel>
        </Card>
      )}
    </div>
  );
}
