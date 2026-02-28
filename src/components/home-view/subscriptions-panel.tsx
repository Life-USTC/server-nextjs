import { getTranslations } from "next-intl/server";
import type { SubscriptionsTabData } from "@/app/dashboard/dashboard-data";
import {
  formatDetailValue,
  formatScheduleLocation,
  getCalendarMonthStart,
  groupSectionsBySemester,
} from "@/app/dashboard/subscriptions/sections/sections-page-helpers";
import { BulkImportSectionsDialog } from "@/components/bulk-import-sections-dialog";
import { CopyCalendarLinkButton } from "@/components/copy-calendar-link-button";
import type { CalendarEvent } from "@/components/event-calendar";
import { EventCalendar } from "@/components/event-calendar";
import { SubscriptionRowOptOutButton } from "@/components/home-view/subscription-row-opt-out-button";
import { Button } from "@/components/ui/button";
import {
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
import { formatTime } from "@/lib/time-utils";

export async function SubscriptionsPanel({
  data,
}: {
  data: SubscriptionsTabData;
}) {
  const {
    subscriptions,
    semesters,
    currentSemesterId,
    calendarSubscriptionUrl,
  } = data;
  const t = await getTranslations("subscriptions");
  const tSection = await getTranslations("sectionDetail");
  const weekLabelTemplate = tSection("weekNumber", { week: "{week}" });
  const weekdayLabels = [
    tSection("weekdays.sunday"),
    tSection("weekdays.monday"),
    tSection("weekdays.tuesday"),
    tSection("weekdays.wednesday"),
    tSection("weekdays.thursday"),
    tSection("weekdays.friday"),
    tSection("weekdays.saturday"),
  ];

  return (
    <div className="space-y-6">
      <div className="grid min-w-0 max-w-5xl gap-6">
        {subscriptions.length === 0 ? (
          <div className="flex flex-col gap-6">
            <CardHeader>
              <CardTitle>{t("noSubscriptions")}</CardTitle>
              <CardDescription>
                {t("noSubscriptionsDescription")}
              </CardDescription>
            </CardHeader>
            <CardPanel>
              <div className="flex flex-wrap gap-2">
                <BulkImportSectionsDialog
                  semesters={semesters}
                  defaultSemesterId={currentSemesterId}
                  triggerVariant="default"
                  triggerSize="default"
                />
                <Button
                  variant="outline"
                  render={<Link className="no-underline" href="/courses" />}
                >
                  {t("browseCourses")}
                </Button>
              </div>
            </CardPanel>
          </div>
        ) : (
          subscriptions.map(
            (sub: SubscriptionsTabData["subscriptions"][number]) => {
              const groupedSections = groupSectionsBySemester(sub.sections);
              type SectionType = (typeof sub.sections)[number];
              const scheduleEvents: CalendarEvent[] = sub.sections.flatMap(
                (section: SectionType) =>
                  section.schedules.map(
                    (schedule: SectionType["schedules"][number]) => {
                      const timeRange = `${formatTime(schedule.startTime)}-${formatTime(schedule.endTime)}`;
                      const courseTitle = section.course.namePrimary;
                      const location = formatScheduleLocation(schedule);
                      const metaStr = [timeRange, location]
                        .filter(Boolean)
                        .join(" · ");
                      const meta = metaStr
                        ? metaStr.length > 60
                          ? `${metaStr.slice(0, 60)}…`
                          : metaStr
                        : undefined;
                      const details = [
                        {
                          label: tSection("location"),
                          value: location,
                        },
                        {
                          label: tSection("teacher"),
                          value:
                            schedule.teachers?.length > 0
                              ? schedule.teachers
                                  .map(
                                    (tr: { namePrimary: string }) =>
                                      tr.namePrimary,
                                  )
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
                      ].flatMap((d) => {
                        const value = formatDetailValue(d.value);
                        return value ? [{ label: d.label, value }] : [];
                      });
                      return {
                        id: `subscription-${sub.id}-schedule-${schedule.id}`,
                        date: schedule.date,
                        title: courseTitle ?? undefined,
                        meta: meta || undefined,
                        href: section.jwId
                          ? `/sections/${section.jwId}`
                          : undefined,
                        variant: "session" as const,
                        line: timeRange
                          ? `${timeRange}: ${courseTitle}`
                          : courseTitle,
                        sortValue:
                          schedule.startTime != null
                            ? Math.floor(schedule.startTime / 100) * 60 +
                              (schedule.startTime % 100)
                            : 0,
                        details,
                      };
                    },
                  ),
              );
              const examEvents: CalendarEvent[] = sub.sections.flatMap(
                (section: SectionType) =>
                  section.exams.map((exam: SectionType["exams"][number]) => {
                    const timeRange =
                      exam.startTime != null && exam.endTime != null
                        ? `${formatTime(exam.startTime)}-${formatTime(exam.endTime)}`
                        : "";
                    const examRooms =
                      exam.examRooms
                        ?.map((r: { room?: string }) => r.room)
                        .filter(Boolean)
                        .join(", ") ?? "";
                    const courseTitle = section.course.namePrimary;
                    const details = [
                      {
                        label: tSection("examMode"),
                        value: exam.examMode ?? "",
                      },
                      {
                        label: tSection("examBatch"),
                        value:
                          (exam.examBatch as { namePrimary?: string })
                            ?.namePrimary ?? "",
                      },
                      { label: tSection("location"), value: examRooms },
                      {
                        label: tSection("examCount"),
                        value: exam.examTakeCount ?? null,
                      },
                    ].flatMap((d) => {
                      const value = formatDetailValue(d.value);
                      return value ? [{ label: d.label, value }] : [];
                    });
                    return {
                      id: `subscription-${sub.id}-exam-${exam.id}`,
                      date: exam.examDate,
                      title: courseTitle ?? undefined,
                      meta: timeRange || undefined,
                      href: section.jwId
                        ? `/sections/${section.jwId}`
                        : "/?tab=exams",
                      variant: "exam" as const,
                      line: timeRange
                        ? `${timeRange}: ${courseTitle}`
                        : courseTitle,
                      sortValue:
                        exam.startTime != null
                          ? Math.floor(exam.startTime / 100) * 60 +
                            (exam.startTime % 100)
                          : 0,
                      details,
                    };
                  }),
              );
              const calendarEvents = [...scheduleEvents, ...examEvents];
              const calendarMonthStart = getCalendarMonthStart(calendarEvents);

              return (
                <div
                  key={sub.id}
                  className="group/subscription-card flex min-w-0 flex-col gap-6"
                >
                  <CardPanel className="min-w-0">
                    <div className="min-w-0 space-y-6">
                      <div className="min-w-0 space-y-3">
                        <div className="min-w-0 max-w-full">
                          <EventCalendar
                            events={calendarEvents}
                            emptyLabel={t("calendarEmpty")}
                            headerActions={
                              <div className="flex flex-wrap items-center gap-2">
                                <BulkImportSectionsDialog
                                  semesters={semesters}
                                  defaultSemesterId={currentSemesterId}
                                />
                                {calendarSubscriptionUrl ? (
                                  <CopyCalendarLinkButton
                                    url={calendarSubscriptionUrl}
                                    label={t("iCalLink")}
                                    copiedMessage={t("linkCopied")}
                                    copiedDescription={t(
                                      "linkCopiedDescription",
                                    )}
                                  />
                                ) : null}
                              </div>
                            }
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
                      {groupedSections.map((group) => (
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
                            <Table className="min-w-[760px] table-fixed">
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[18%]">
                                    {tSection("sectionCode")}
                                  </TableHead>
                                  <TableHead className="w-[31%]">
                                    {t("courseName")}
                                  </TableHead>
                                  <TableHead className="w-[29%]">
                                    {tSection("teachers")}
                                  </TableHead>
                                  <TableHead className="w-[10%]">
                                    {t("credits")}
                                  </TableHead>
                                  <TableHead className="w-[12%] text-right">
                                    <span className="sr-only">
                                      {t("rowActions")}
                                    </span>
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.sections.map((section: SectionType) => {
                                  const teacherNames = section.teachers
                                    .map(
                                      (tr: { namePrimary: string }) =>
                                        tr.namePrimary,
                                    )
                                    .filter(Boolean);
                                  return (
                                    <TableRow
                                      key={section.jwId}
                                      className="group/section-row [&_td]:py-0"
                                    >
                                      <TableCell className="w-[18%] max-w-0 truncate py-0 font-medium">
                                        <Link
                                          className="block px-2 py-2 text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                                          href={`/sections/${section.jwId}`}
                                        >
                                          {section.code}
                                        </Link>
                                      </TableCell>
                                      <TableCell className="w-[31%] max-w-0 truncate py-0">
                                        <Link
                                          className="block px-2 py-2 text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                                          href={`/sections/${section.jwId}`}
                                        >
                                          {section.course.namePrimary}
                                        </Link>
                                      </TableCell>
                                      <TableCell className="w-[29%] max-w-0 truncate py-0">
                                        <Link
                                          className="block px-2 py-2 text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                                          href={`/sections/${section.jwId}`}
                                        >
                                          {teacherNames.length > 0
                                            ? teacherNames.join(", ")
                                            : "—"}
                                        </Link>
                                      </TableCell>
                                      <TableCell className="w-[10%] max-w-0 truncate py-0">
                                        <Link
                                          className="block px-2 py-2 text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                                          href={`/sections/${section.jwId}`}
                                        >
                                          {section.credits}
                                        </Link>
                                      </TableCell>
                                      <TableCell className="w-[12%] py-1 text-right">
                                        <SubscriptionRowOptOutButton
                                          sectionId={section.id}
                                          label={t("optOut")}
                                          confirmLabel={t("optOutConfirm")}
                                          successLabel={t("optOutSuccess")}
                                          successDescription={t(
                                            "optOutSuccessDescription",
                                          )}
                                          errorLabel={t("optOutError")}
                                          retryLabel={t("optOutRetry")}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardPanel>
                </div>
              );
            },
          )
        )}
      </div>
    </div>
  );
}
