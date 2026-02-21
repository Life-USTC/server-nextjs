import dayjs from "dayjs";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { BulkImportSections } from "@/components/bulk-import-sections";
import { ClickableTableRow } from "@/components/clickable-table-row";
import { CopyCalendarLinkButton } from "@/components/copy-calendar-link-button";
import { DashboardShell } from "@/components/dashboard-shell";
import type { CalendarEvent } from "@/components/event-calendar";
import { EventCalendar } from "@/components/event-calendar";
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
import type { Prisma } from "@/generated/prisma/client";
import { Link } from "@/i18n/routing";
import { requireSignedInUserId } from "@/lib/auth-helpers";
import { generateCalendarSubscriptionJWT } from "@/lib/calendar-jwt";
import { selectCurrentSemesterFromList } from "@/lib/current-semester";
import { getPrisma } from "@/lib/prisma";
import { formatTime } from "@/lib/time-utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.subscriptions"),
  };
}

export default async function SubscriptionsPage() {
  const locale = await getLocale();
  const prisma = getPrisma(locale);
  const userId = await requireSignedInUserId();

  const [t, tCommon, tDashboard, tSection] = await Promise.all([
    getTranslations("subscriptions"),
    getTranslations("common"),
    getTranslations("meDashboard"),
    getTranslations("sectionDetail"),
  ]);
  const weekLabelTemplate = tSection("weekNumber", { week: "{week}" });

  type SubscriptionSchedule = Prisma.ScheduleGetPayload<{
    include: {
      room: {
        include: {
          building: {
            include: {
              campus: true;
            };
          };
        };
      };
      teachers: true;
    };
  }> & {
    room: {
      namePrimary: string;
      building: {
        namePrimary: string;
        campus: { namePrimary: string } | null;
      } | null;
    } | null;
    teachers: Array<{ namePrimary: string }>;
  };

  const weekdayLabels = [
    tSection("weekdays.sunday"),
    tSection("weekdays.monday"),
    tSection("weekdays.tuesday"),
    tSection("weekdays.wednesday"),
    tSection("weekdays.thursday"),
    tSection("weekdays.friday"),
    tSection("weekdays.saturday"),
  ];

  const formatDetailValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text.length > 0 ? text : null;
  };

  const formatScheduleLocation = (schedule: SubscriptionSchedule) => {
    if (schedule.customPlace) return schedule.customPlace;
    if (!schedule.room) return "—";

    const parts = [schedule.room.namePrimary];
    if (schedule.room.building) {
      parts.push(schedule.room.building.namePrimary);
      if (schedule.room.building.campus) {
        parts.push(schedule.room.building.campus.namePrimary);
      }
    }

    return parts.join(" · ");
  };

  const getCalendarMonthStart = (events: CalendarEvent[]) => {
    if (events.length === 0) {
      return dayjs().startOf("month").toDate();
    }

    const datedEvents = events
      .filter((event): event is CalendarEvent & { date: Date } =>
        Boolean(event.date),
      )
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
    const today = dayjs().startOf("day");
    const firstEventDate = datedEvents[0]?.date ?? today.toDate();
    const lastEventDate = datedEvents.at(-1)?.date ?? today.toDate();
    const isOngoing =
      !today.isBefore(dayjs(firstEventDate).startOf("day")) &&
      !today.isAfter(dayjs(lastEventDate).startOf("day"));
    const fallbackStartDate = firstEventDate ?? today.toDate();

    return dayjs(isOngoing ? today : fallbackStartDate)
      .startOf("month")
      .toDate();
  };

  const [subscriptions, semesters] = await Promise.all([
    prisma.calendarSubscription.findMany({
      where: {
        userId,
      },
      include: {
        sections: {
          include: {
            course: true,
            semester: true,
            teachers: true,
            schedules: {
              include: {
                room: {
                  include: {
                    building: {
                      include: {
                        campus: true,
                      },
                    },
                  },
                },
                teachers: true,
              },
              orderBy: [{ date: "asc" }, { startTime: "asc" }],
            },
            exams: {
              include: {
                examBatch: true,
                examRooms: true,
              },
              orderBy: { examDate: "asc" },
            },
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    }),
    prisma.semester.findMany({
      select: {
        id: true,
        nameCn: true,
        startDate: true,
        endDate: true,
      },
      orderBy: {
        startDate: "asc",
      },
    }),
  ]);

  // Generate tokens for each subscription
  const subscriptionsWithTokens = await Promise.all(
    subscriptions.map(async (sub) => ({
      ...sub,
      token: await generateCalendarSubscriptionJWT(sub.id),
    })),
  );

  const currentSemesterId =
    selectCurrentSemesterFromList(semesters, new Date())?.id ?? null;

  const totalSections = subscriptionsWithTokens.reduce(
    (count, subscription) => count + subscription.sections.length,
    0,
  );
  const semesterCount = new Set(
    subscriptionsWithTokens.flatMap((subscription) =>
      subscription.sections
        .map((section) => section.semester?.id)
        .filter((id): id is number => id !== null),
    ),
  ).size;

  return (
    <DashboardShell
      homeLabel={tCommon("home")}
      dashboardLabel={tDashboard("title")}
      title={t("title")}
      description={t("description")}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t("summary.subscriptions")}</CardDescription>
            <CardTitle className="font-semibold text-2xl">
              {subscriptionsWithTokens.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t("summary.sections")}</CardDescription>
            <CardTitle className="font-semibold text-2xl">
              {totalSections}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t("summary.semesters")}</CardDescription>
            <CardTitle className="font-semibold text-2xl">
              {semesterCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <BulkImportSections
        semesters={semesters}
        defaultSemesterId={currentSemesterId}
      />

      <div className="grid min-w-0 max-w-5xl gap-6">
        {subscriptionsWithTokens.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("noSubscriptions")}</CardTitle>
              <CardDescription>
                {t("noSubscriptionsDescription")}
              </CardDescription>
            </CardHeader>
            <CardPanel>
              <Button
                render={<Link className="no-underline" href="/courses" />}
              >
                {t("browseCourses")}
              </Button>
            </CardPanel>
          </Card>
        ) : (
          subscriptionsWithTokens.map((sub) => (
            <Card key={sub.id} className="min-w-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="font-medium text-base">
                      {t("subscriptionTitle", { id: sub.id })}
                    </CardTitle>
                    <CardDescription>
                      {t("sectionsIncluded", { count: sub.sections.length })}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardPanel className="min-w-0">
                <div className="min-w-0 space-y-6">
                  {(() => {
                    const groups = sub.sections.reduce(
                      (acc, section) => {
                        const key =
                          section.semester?.id?.toString() ?? "unknown";
                        const label = section.semester?.nameCn ?? "—";
                        const startDate = section.semester?.startDate ?? null;
                        const existing = acc.get(key) ?? {
                          key,
                          label,
                          startDate,
                          sections: [],
                        };
                        existing.sections.push(section);
                        acc.set(key, existing);
                        return acc;
                      },
                      new Map<
                        string,
                        {
                          key: string;
                          label: string;
                          startDate: Date | null;
                          sections: typeof sub.sections;
                        }
                      >(),
                    );

                    const groupedSections = Array.from(groups.values()).sort(
                      (a, b) => {
                        if (a.startDate && b.startDate) {
                          return b.startDate.getTime() - a.startDate.getTime();
                        }
                        if (a.startDate) return -1;
                        if (b.startDate) return 1;
                        return b.label.localeCompare(a.label);
                      },
                    );

                    return groupedSections.map((group) => (
                      <div key={group.key} className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 font-medium text-sm">
                          <span>
                            {tSection("semester")}: {group.label}
                          </span>
                          <span className="text-muted-foreground">
                            {t("sectionsIncluded", {
                              count: group.sections.length,
                            })}
                          </span>
                        </div>
                        <div className="overflow-x-auto rounded-md border">
                          <Table className="min-w-[640px] table-fixed">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-1/4">
                                  {tSection("sectionCode")}
                                </TableHead>
                                <TableHead className="w-1/4">
                                  {t("courseName")}
                                </TableHead>
                                <TableHead className="w-1/4">
                                  {tSection("teachers")}
                                </TableHead>
                                <TableHead className="w-1/4">
                                  {t("credits")}
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.sections.map((section) => {
                                const teacherNames = section.teachers
                                  .map((teacher) => teacher.namePrimary)
                                  .filter(Boolean);

                                return (
                                  <ClickableTableRow
                                    key={section.jwId}
                                    href={`/sections/${section.jwId}`}
                                  >
                                    <TableCell className="w-1/4 max-w-0 truncate font-medium">
                                      {section.code}
                                    </TableCell>
                                    <TableCell className="w-1/4 max-w-0 truncate">
                                      {section.course.namePrimary}
                                    </TableCell>
                                    <TableCell className="w-1/4 max-w-0 truncate">
                                      {teacherNames.length > 0
                                        ? teacherNames.join(", ")
                                        : "—"}
                                    </TableCell>
                                    <TableCell className="w-1/4 max-w-0 truncate">
                                      {section.credits}
                                    </TableCell>
                                  </ClickableTableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ));
                  })()}
                  {(() => {
                    const buildEventLine = (
                      timeRange: string,
                      label: string,
                    ) => (timeRange ? `${timeRange}: ${label}` : label);
                    const toMinutes = (time: number | null | undefined) =>
                      time === null || time === undefined
                        ? undefined
                        : Math.floor(time / 100) * 60 + (time % 100);
                    const scheduleEvents: CalendarEvent[] =
                      sub.sections.flatMap((section) =>
                        section.schedules.map((schedule) => {
                          const timeRange = `${formatTime(
                            schedule.startTime,
                          )}-${formatTime(schedule.endTime)}`;
                          const courseTitle = section.course.namePrimary;
                          const details = [
                            {
                              label: tSection("location"),
                              value: formatScheduleLocation(schedule),
                            },
                            {
                              label: tSection("teacher"),
                              value:
                                schedule.teachers &&
                                schedule.teachers.length > 0
                                  ? schedule.teachers
                                      .map((teacher) => teacher.namePrimary)
                                      .join(", ")
                                  : "—",
                            },
                            {
                              label: tSection("units"),
                              value: `${schedule.startUnit} - ${schedule.endUnit}`,
                            },
                            {
                              label: tSection("week"),
                              value: schedule.weekIndex ?? "—",
                            },
                          ].flatMap((detail) => {
                            const value = formatDetailValue(detail.value);
                            return value ? [{ ...detail, value }] : [];
                          });

                          return {
                            id: `subscription-${sub.id}-schedule-${schedule.id}`,
                            date: schedule.date,
                            line: buildEventLine(timeRange, courseTitle),
                            tone: "default",
                            sortValue: toMinutes(schedule.startTime),
                            details,
                          };
                        }),
                      );

                    const examEvents: CalendarEvent[] = sub.sections.flatMap(
                      (section) =>
                        section.exams.map((exam) => {
                          const timeRange =
                            exam.startTime !== null && exam.endTime !== null
                              ? `${formatTime(exam.startTime)}-${formatTime(
                                  exam.endTime,
                                )}`
                              : "";
                          const examRooms = exam.examRooms
                            ? exam.examRooms
                                .map((room) => room.room)
                                .filter(Boolean)
                                .join(", ")
                            : "";
                          const courseTitle = section.course.namePrimary;
                          const details = [
                            {
                              label: tSection("examMode"),
                              value: exam.examMode ?? "",
                            },
                            {
                              label: tSection("examBatch"),
                              value: exam.examBatch?.namePrimary ?? "",
                            },
                            { label: tSection("location"), value: examRooms },
                            {
                              label: tSection("examCount"),
                              value: exam.examTakeCount ?? null,
                            },
                          ].flatMap((detail) => {
                            const value = formatDetailValue(detail.value);
                            return value ? [{ ...detail, value }] : [];
                          });

                          return {
                            id: `subscription-${sub.id}-exam-${exam.id}`,
                            date: exam.examDate,
                            line: buildEventLine(timeRange, courseTitle),
                            tone: "inverse",
                            sortValue: toMinutes(exam.startTime),
                            details,
                          };
                        }),
                    );

                    const calendarEvents = [...scheduleEvents, ...examEvents];
                    const calendarMonthStart =
                      getCalendarMonthStart(calendarEvents);

                    return (
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="font-medium text-sm">
                            {t("calendarTitle", {
                              count: calendarEvents.length,
                            })}
                          </h3>
                          <CopyCalendarLinkButton
                            url={`/api/calendar-subscriptions/${sub.id}/calendar.ics?token=${sub.token}`}
                            label={t("iCalLink")}
                            copiedMessage={t("linkCopied")}
                            copiedDescription={t("linkCopiedDescription")}
                          />
                        </div>
                        <div className="min-w-0 max-w-full">
                          <EventCalendar
                            events={calendarEvents}
                            emptyLabel={t("calendarEmpty")}
                            monthStart={calendarMonthStart}
                            previousMonthLabel={tSection("previousMonth")}
                            nextMonthLabel={tSection("nextMonth")}
                            semesters={semesters}
                            weekLabelHeader={tSection("weekLabel")}
                            weekLabelTemplate={weekLabelTemplate}
                            weekdayLabels={weekdayLabels}
                            weekStartsOn={0}
                            unscheduledLabel={tSection("dateTBD")}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardPanel>
            </Card>
          ))
        )}
      </div>
    </DashboardShell>
  );
}
