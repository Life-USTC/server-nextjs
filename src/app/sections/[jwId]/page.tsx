import dayjs from "dayjs";
import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CommentAwareTabs } from "@/components/comments/comment-aware-tabs";
import { CommentsSection } from "@/components/comments/comments-section";
import { DescriptionPanel } from "@/components/descriptions/description-panel";
import type { CalendarEvent } from "@/components/event-calendar";
import { EventCalendar } from "@/components/event-calendar";
import { SubscriptionCalendarButton } from "@/components/subscription-calendar-button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserMenu } from "@/components/user-menu";
import { Link } from "@/i18n/routing";
import { getPrisma } from "@/lib/prisma";
import { formatTime } from "@/lib/time-utils";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ jwId: string }>;
}): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();
  const prisma = getPrisma(locale);
  const { jwId } = await params;
  const parsedId = parseInt(jwId, 10);

  if (Number.isNaN(parsedId)) {
    return { title: t("pages.sections") };
  }

  const section = await prisma.section.findUnique({
    where: { jwId: parsedId },
    select: {
      code: true,
      course: true,
    },
  });

  if (!section) {
    return { title: t("pages.sections") };
  }

  const courseName = section.course.namePrimary;
  const displayName = courseName || section.code;

  return {
    title: t("pages.sectionDetail", {
      name: displayName,
      code: section.code,
    }),
  };
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ jwId: string }>;
}) {
  const { jwId } = await params;
  const locale = await getLocale();
  const prisma = getPrisma(locale);

  const section = await prisma.section.findUnique({
    where: { jwId: parseInt(jwId, 10) },
    include: {
      course: true,
      semester: true,
      campus: true,
      openDepartment: true,
      examMode: true,
      teachLanguage: true,
      roomType: true,
      adminClasses: true,
      teachers: {
        include: {
          department: true,
        },
      },
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
  });

  if (!section) {
    notFound();
  }

  const semesters = await prisma.semester.findMany({
    select: {
      id: true,
      startDate: true,
      endDate: true,
    },
    orderBy: {
      startDate: "asc",
    },
  });

  // Fetch other sections of the same course (include teachers for grouping)
  const otherSections = await prisma.section.findMany({
    where: {
      courseId: section.courseId,
      id: { not: section.id },
    },
    include: {
      semester: true,
      teachers: true,
    },
    orderBy: [{ semester: { jwId: "desc" } }, { code: "asc" }],
  });

  // Get current section's teacher IDs for comparison
  const currentTeacherIds = new Set(section.teachers.map((t) => t.id));
  const currentSemesterId = section.semesterId;

  // Group other sections
  const sameSemesterOtherTeachers = otherSections.filter((s) => {
    if (s.semesterId !== currentSemesterId) return false;
    // Check if teachers are different (no overlap)
    const sectionTeacherIds = s.teachers.map((t) => t.id);
    const hasOverlap = sectionTeacherIds.some((id) =>
      currentTeacherIds.has(id),
    );
    return !hasOverlap;
  });

  const sameTeacherOtherSemesters = otherSections.filter((s) => {
    if (s.semesterId === currentSemesterId) return false;
    // Check if at least one teacher overlaps
    const sectionTeacherIds = s.teachers.map((t) => t.id);
    return sectionTeacherIds.some((id) => currentTeacherIds.has(id));
  });

  const t = await getTranslations("sectionDetail");
  const tCommon = await getTranslations("common");
  const tA11y = await getTranslations("accessibility");
  const tComments = await getTranslations("comments");

  const weekdayLabels = [
    t("weekdays.sunday"),
    t("weekdays.monday"),
    t("weekdays.tuesday"),
    t("weekdays.wednesday"),
    t("weekdays.thursday"),
    t("weekdays.friday"),
    t("weekdays.saturday"),
  ];

  const formatDetailValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text.length > 0 ? text : null;
  };

  const formatScheduleLocation = (
    schedule: (typeof section.schedules)[number],
  ) => {
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

  const buildEventLine = (timeRange: string, label: string) =>
    timeRange ? `${timeRange}: ${label}` : label;
  const toMinutes = (time: number | null | undefined) =>
    time === null || time === undefined
      ? undefined
      : Math.floor(time / 100) * 60 + (time % 100);

  const scheduleEvents: CalendarEvent[] = section.schedules.map((schedule) => {
    const timeRange = `${formatTime(schedule.startTime)}-${formatTime(
      schedule.endTime,
    )}`;
    const details = [
      { label: t("location"), value: formatScheduleLocation(schedule) },
      {
        label: t("teacher"),
        value:
          schedule.teachers && schedule.teachers.length > 0
            ? schedule.teachers.map((teacher) => teacher.namePrimary).join(", ")
            : "—",
      },
      {
        label: t("units"),
        value: `${schedule.startUnit} - ${schedule.endUnit}`,
      },
      { label: t("week"), value: schedule.weekIndex ?? "—" },
    ].flatMap((detail) => {
      const value = formatDetailValue(detail.value);
      return value ? [{ ...detail, value }] : [];
    });

    return {
      id: `schedule-${schedule.id}`,
      date: schedule.date,
      line: buildEventLine(timeRange, t("classEvent")),
      tone: "default",
      sortValue: toMinutes(schedule.startTime),
      details,
    };
  });

  const examEvents: CalendarEvent[] = section.exams.map((exam) => {
    const timeRange =
      exam.startTime !== null && exam.endTime !== null
        ? `${formatTime(exam.startTime)}-${formatTime(exam.endTime)}`
        : "";
    const examRooms = exam.examRooms
      ? exam.examRooms
          .map((room) => room.room)
          .filter(Boolean)
          .join(", ")
      : "";
    const details = [
      { label: t("examMode"), value: exam.examMode ?? "" },
      { label: t("examBatch"), value: exam.examBatch?.namePrimary ?? "" },
      { label: t("location"), value: examRooms },
      { label: t("examCount"), value: exam.examTakeCount ?? null },
    ].flatMap((detail) => {
      const value = formatDetailValue(detail.value);
      return value ? [{ ...detail, value }] : [];
    });

    return {
      id: `exam-${exam.id}`,
      date: exam.examDate,
      line: buildEventLine(timeRange, t("examEvent")),
      tone: "inverse",
      sortValue: toMinutes(exam.startTime),
      details,
    };
  });

  const calendarEvents = [...scheduleEvents, ...examEvents];
  const datedEvents = calendarEvents
    .filter((event): event is CalendarEvent & { date: Date } =>
      Boolean(event.date),
    )
    .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  const firstScheduleDate = section.schedules[0]?.date ?? null;
  const lastEventDate = datedEvents.at(-1)?.date ?? null;
  const today = dayjs().startOf("day");
  const isOngoing =
    firstScheduleDate &&
    lastEventDate &&
    !today.isBefore(dayjs(firstScheduleDate).startOf("day")) &&
    !today.isAfter(dayjs(lastEventDate).startOf("day"));
  const fallbackStartDate =
    firstScheduleDate ?? datedEvents[0]?.date ?? today.toDate();
  const calendarMonthStart = dayjs(isOngoing ? today : fallbackStartDate)
    .startOf("month")
    .toDate();
  const scheduleDateKeys = new Set(
    section.schedules
      .filter((schedule) => schedule.date)
      .map((schedule) => dayjs(schedule.date).format("YYYY-MM-DD")),
  );
  const examDateKeys = new Set(
    section.exams
      .filter((exam) => exam.examDate)
      .map((exam) => dayjs(exam.examDate).format("YYYY-MM-DD")),
  );
  const miniMonthStart = dayjs(calendarMonthStart).startOf("month");
  const miniWeekStartsOn = 0;
  let miniGridStart = miniMonthStart;
  while (miniGridStart.day() !== miniWeekStartsOn) {
    miniGridStart = miniGridStart.subtract(1, "day");
  }
  const miniDays = Array.from({ length: 42 }, (_, index) =>
    miniGridStart.add(index, "day"),
  );
  const miniWeekdays = Array.from(
    { length: 7 },
    (_, index) => (miniWeekStartsOn + index) % 7,
  );
  const miniWeekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const miniMonthLabel = miniMonthStart.format("YYYY.MM");
  const todayKey = today.format("YYYY-MM-DD");

  return (
    <main className="page-main">
      <div className="mb-6 flex items-start justify-between gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>
                {tCommon("home")}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/sections" />}>
                {tCommon("sections")}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{section.code}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <UserMenu className="shrink-0" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-8">
          <div className="mt-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-display mb-2">
                  {section.course.namePrimary}
                </h1>
                {section.course.nameSecondary && (
                  <p className="text-subtitle text-muted-foreground">
                    {section.course.nameSecondary}
                  </p>
                )}
              </div>
              <SubscriptionCalendarButton
                sectionDatabaseId={section.id}
                sectionJwId={section.jwId}
                showCalendarButton={false}
                addToCalendarLabel={t("addToCalendar")}
                sheetTitle={t("calendarSheetTitle")}
                sheetDescription={t("calendarSheetDescription")}
                calendarUrlLabel={t("calendarUrlLabel")}
                subscriptionUrlLabel={t("subscriptionUrlLabel")}
                subscriptionHintLabel={t("subscriptionHintLabel")}
                subscribeLabel={t("subscribeLabel")}
                unsubscribeLabel={t("unsubscribeLabel")}
                copyLabel={t("copyToClipboard")}
                closeLabel={t("close")}
                learnMoreLabel={t("learnMoreAboutICalendar")}
                copiedLabel={t("copied")}
                subscribingLabel={t("subscribing")}
                unsubscribingLabel={t("unsubscribing")}
                pleaseWaitLabel={t("pleaseWait")}
                subscribeSuccessLabel={t("subscribeSuccess")}
                unsubscribeSuccessLabel={t("unsubscribeSuccess")}
                subscribeSuccessDescriptionLabel={t(
                  "subscribeSuccessDescription",
                )}
                unsubscribeSuccessDescriptionLabel={t(
                  "unsubscribeSuccessDescription",
                )}
                operationFailedLabel={t("operationFailed")}
                pleaseRetryLabel={t("pleaseRetry")}
                viewAllSubscriptionsLabel={t("viewAllSubscriptions")}
                loginRequiredLabel={t("loginRequired")}
                loginRequiredDescriptionLabel={t("loginRequiredDescription")}
                loginToSubscribeLabel={t("loginToSubscribe")}
                subscriptionCalendarUrlAriaLabel={tA11y(
                  "subscriptionCalendarUrl",
                )}
                singleSectionCalendarUrlAriaLabel={tA11y(
                  "singleSectionCalendarUrl",
                )}
              />
            </div>
          </div>

          <CommentAwareTabs
            defaultValue="description"
            commentValue="comments"
            className="space-y-6"
          >
            <TabsList className="w-full" variant="underline">
              <TabsTrigger value="description">
                {t("tabs.description")}
              </TabsTrigger>
              <TabsTrigger value="calendar">{t("tabs.calendar")}</TabsTrigger>
              <TabsTrigger value="comments">{t("tabs.comments")}</TabsTrigger>
            </TabsList>
            <TabsContent value="description">
              <DescriptionPanel targetType="section" targetId={section.id} />
            </TabsContent>
            <TabsContent value="comments">
              <div className="space-y-4">
                <CommentsSection
                  targets={[
                    {
                      key: "section",
                      label: tComments("tabSection"),
                      type: "section",
                      targetId: section.id,
                    },
                    {
                      key: "course",
                      label: tComments("tabCourse"),
                      type: "course",
                      targetId: section.courseId,
                    },
                    {
                      key: "section-teacher",
                      label: tComments("tabSectionTeacher"),
                      type: "section-teacher",
                      sectionId: section.id,
                    },
                  ]}
                  teacherOptions={section.teachers.map((teacher) => ({
                    id: teacher.id,
                    label: teacher.namePrimary,
                  }))}
                  showAllTargets
                />
              </div>
            </TabsContent>
            <TabsContent value="calendar">
              <div className="space-y-3">
                <EventCalendar
                  events={calendarEvents}
                  emptyLabel={t("calendarEmpty")}
                  headerActions={
                    <>
                      <SubscriptionCalendarButton
                        sectionDatabaseId={section.id}
                        sectionJwId={section.jwId}
                        showSubscribeButton={false}
                        addToCalendarLabel={t("addToCalendar")}
                        sheetTitle={t("calendarSheetTitle")}
                        sheetDescription={t("calendarSheetDescription")}
                        calendarUrlLabel={t("calendarUrlLabel")}
                        subscriptionUrlLabel={t("subscriptionUrlLabel")}
                        subscriptionHintLabel={t("subscriptionHintLabel")}
                        subscribeLabel={t("subscribeLabel")}
                        unsubscribeLabel={t("unsubscribeLabel")}
                        copyLabel={t("copyToClipboard")}
                        closeLabel={t("close")}
                        learnMoreLabel={t("learnMoreAboutICalendar")}
                        copiedLabel={t("copied")}
                        subscribingLabel={t("subscribing")}
                        unsubscribingLabel={t("unsubscribing")}
                        pleaseWaitLabel={t("pleaseWait")}
                        subscribeSuccessLabel={t("subscribeSuccess")}
                        unsubscribeSuccessLabel={t("unsubscribeSuccess")}
                        subscribeSuccessDescriptionLabel={t(
                          "subscribeSuccessDescription",
                        )}
                        unsubscribeSuccessDescriptionLabel={t(
                          "unsubscribeSuccessDescription",
                        )}
                        operationFailedLabel={t("operationFailed")}
                        pleaseRetryLabel={t("pleaseRetry")}
                        viewAllSubscriptionsLabel={t("viewAllSubscriptions")}
                        loginRequiredLabel={t("loginRequired")}
                        loginRequiredDescriptionLabel={t(
                          "loginRequiredDescription",
                        )}
                        loginToSubscribeLabel={t("loginToSubscribe")}
                        subscriptionCalendarUrlAriaLabel={tA11y(
                          "subscriptionCalendarUrl",
                        )}
                        singleSectionCalendarUrlAriaLabel={tA11y(
                          "singleSectionCalendarUrl",
                        )}
                      />
                      <Button
                        render={
                          <Link
                            className="no-underline"
                            href="/me/subscriptions/sections/"
                          />
                        }
                        size="sm"
                        variant="outline"
                      >
                        {t("viewAllSubscriptions")}
                      </Button>
                    </>
                  }
                  monthStart={calendarMonthStart}
                  previousMonthLabel={t("previousMonth")}
                  nextMonthLabel={t("nextMonth")}
                  semesters={semesters}
                  weekLabelHeader={t("weekLabel")}
                  weekLabelTemplate={t("weekNumber", { week: "{week}" })}
                  weekdayLabels={weekdayLabels}
                  weekStartsOn={0}
                  unscheduledLabel={t("dateTBD")}
                />
              </div>
            </TabsContent>
          </CommentAwareTabs>
        </div>

        <aside className="space-y-4">
          <Collapsible className="space-y-4" defaultOpen>
            <CollapsibleTrigger className="lg:hidden flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
              <span>{t("basicInfo")}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent className="lg:block">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t("basicInfo")}</CardTitle>
                </CardHeader>
                <CardPanel>
                  <div className="grid gap-2 grid-cols-1 text-sm">
                    {section.semester && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("semester")}
                        </span>
                        <span className="font-medium text-foreground">
                          {section.semester.nameCn}
                        </span>
                      </div>
                    )}

                    {section.code && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("sectionCode")}
                        </span>
                        <span className="font-medium text-foreground font-mono">
                          {section.code}
                        </span>
                      </div>
                    )}

                    <div className="mt-4" />

                    {section.campus && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("campus")}
                        </span>
                        <span className="font-medium text-foreground">
                          {section.campus.namePrimary}
                        </span>
                      </div>
                    )}

                    <div className="flex items-baseline gap-2">
                      <span className="text-muted-foreground">
                        {tCommon("undergraduateGraduate")}
                      </span>
                      <span className="font-medium text-foreground">
                        {section.graduateAndPostgraduate ? "✓" : "×"}
                      </span>
                    </div>

                    {section.credits !== null && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("credits")}
                        </span>
                        <span className="font-medium text-foreground">
                          {section.credits}
                        </span>
                      </div>
                    )}

                    {section.period !== null && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("period")}
                        </span>
                        <span className="font-medium text-foreground">
                          {section.period}
                          {section.actualPeriods !== null &&
                            section.actualPeriods !== section.period &&
                            ` (${section.actualPeriods})`}
                        </span>
                      </div>
                    )}

                    {section.examMode && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">
                          {t("examMode")}
                        </span>
                        <span className="font-medium text-foreground">
                          {section.examMode.namePrimary}
                        </span>
                      </div>
                    )}

                    {section.remark && (
                      <div className="mt-6">
                        <p className="text-sm text-muted-foreground mb-1">
                          {t("remark")}
                        </p>
                        <p className="text-body text-foreground whitespace-pre-wrap">
                          {section.remark}
                        </p>
                      </div>
                    )}

                    {section.teachers && section.teachers.length > 0 && (
                      <div className="mt-6">
                        <p className="text-sm text-muted-foreground mb-2">
                          {t("teachers")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {section.teachers.map((teacher) => (
                            <Link
                              key={teacher.id}
                              href={`/teachers/${teacher.id}`}
                              className="no-underline"
                            >
                              <Badge
                                variant="secondary"
                                className="hover:bg-secondary/80 cursor-pointer"
                              >
                                {teacher.namePrimary}
                                {teacher.department && (
                                  <span className="text-muted-foreground ml-1">
                                    ({teacher.department.namePrimary})
                                  </span>
                                )}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Collapsible className="mt-6">
                    <CollapsibleTrigger className="flex items-center text-sm text-muted-foreground hover:underline">
                      {t("moreDetails")} ↓
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-6">
                      <div className="grid gap-2 grid-cols-1 text-sm">
                        {section.teachLanguage ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-muted-foreground">
                              {t("teachLanguage")}
                            </span>
                            <span className="font-medium text-foreground">
                              {section.teachLanguage.namePrimary}
                            </span>
                          </div>
                        ) : null}
                        {section.roomType ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-muted-foreground">
                              {t("roomType")}
                            </span>
                            <span className="font-medium text-foreground">
                              {section.roomType.namePrimary}
                            </span>
                          </div>
                        ) : null}
                        {section.timesPerWeek ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-muted-foreground">
                              {t("timesPerWeek")}
                            </span>
                            <span className="font-medium text-foreground">
                              {section.timesPerWeek}
                            </span>
                          </div>
                        ) : null}
                        {section.periodsPerWeek ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-muted-foreground">
                              {t("periodsPerWeek")}
                            </span>
                            <span className="font-medium text-foreground">
                              {section.periodsPerWeek}
                            </span>
                          </div>
                        ) : null}
                        {section.theoryPeriods ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-muted-foreground">
                              {t("theoryPeriods")}
                            </span>
                            <span className="font-medium text-foreground">
                              {section.theoryPeriods}
                            </span>
                          </div>
                        ) : null}
                        {section.practicePeriods ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-muted-foreground">
                              {t("practicePeriods")}
                            </span>
                            <span className="font-medium text-foreground">
                              {section.practicePeriods}
                            </span>
                          </div>
                        ) : null}
                        {section.experimentPeriods ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-muted-foreground">
                              {t("experimentPeriods")}
                            </span>
                            <span className="font-medium text-foreground">
                              {section.experimentPeriods}
                            </span>
                          </div>
                        ) : null}
                        {section.machinePeriods ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-muted-foreground">
                              {t("machinePeriods")}
                            </span>
                            <span className="font-medium text-foreground">
                              {section.machinePeriods}
                            </span>
                          </div>
                        ) : null}
                        {section.designPeriods ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-muted-foreground">
                              {t("designPeriods")}
                            </span>
                            <span className="font-medium text-foreground">
                              {section.designPeriods}
                            </span>
                          </div>
                        ) : null}
                        {section.testPeriods ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-muted-foreground">
                              {t("testPeriods")}
                            </span>
                            <span className="font-medium text-foreground">
                              {section.testPeriods}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {section.adminClasses &&
                        section.adminClasses.length > 0 && (
                          <div className="mt-6">
                            <p className="text-sm text-muted-foreground mb-2">
                              {t("adminClasses")}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {section.adminClasses.map((ac) => (
                                <Badge key={ac.id} variant="secondary">
                                  {ac.namePrimary}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                      {(sameSemesterOtherTeachers.length > 0 ||
                        sameTeacherOtherSemesters.length > 0 ||
                        otherSections.length > 0) && (
                        <div className="mt-6 space-y-4">
                          {sameSemesterOtherTeachers.length > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {t("sameSemesterOtherTeachers")}
                              </p>
                              <div className="flex flex-wrap gap-x-2">
                                {sameSemesterOtherTeachers
                                  .slice(0, 10)
                                  .map((otherSection) => (
                                    <Link
                                      key={otherSection.id}
                                      href={`/sections/${otherSection.jwId}`}
                                      className="no-underline"
                                    >
                                      <Badge
                                        variant="outline"
                                        className="hover:bg-accent cursor-pointer"
                                      >
                                        {otherSection.teachers.length > 0 ? (
                                          <span>
                                            {otherSection.teachers
                                              .map((t) => t.namePrimary)
                                              .join(", ")}
                                          </span>
                                        ) : (
                                          <span>{t("noTeacher")}</span>
                                        )}
                                        <span className="text-muted-foreground ml-1">
                                          {otherSection.code}
                                        </span>
                                      </Badge>
                                    </Link>
                                  ))}
                              </div>
                            </div>
                          )}

                          {sameTeacherOtherSemesters.length > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {t("sameTeacherOtherSemesters")}
                              </p>
                              <div className="flex flex-wrap gap-x-2">
                                {sameTeacherOtherSemesters
                                  .slice(0, 10)
                                  .map((otherSection) => (
                                    <Link
                                      key={otherSection.id}
                                      href={`/sections/${otherSection.jwId}`}
                                      className="no-underline"
                                    >
                                      <Badge
                                        variant="outline"
                                        className="hover:bg-accent cursor-pointer"
                                      >
                                        {otherSection.semester && (
                                          <span>
                                            {otherSection.semester.nameCn}
                                          </span>
                                        )}
                                        <span className="text-muted-foreground ml-1">
                                          {otherSection.code}
                                        </span>
                                      </Badge>
                                    </Link>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="mt-6">
                    <Link
                      href={`/courses/${section.course.jwId}`}
                      className="text-sm text-muted-foreground hover:underline"
                    >
                      {t("viewAllCourseSections")} ({otherSections.length + 1}){" "}
                      {"->"}
                    </Link>
                  </div>
                </CardPanel>
              </Card>
            </CollapsibleContent>
          </Collapsible>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                {miniMonthLabel}
              </CardTitle>
            </CardHeader>
            <CardPanel className="space-y-2">
              <div className="grid grid-cols-7 gap-1 text-[0.65rem] text-muted-foreground">
                {miniWeekdays.map((weekday) => (
                  <div key={miniWeekdayLabels[weekday]} className="text-center">
                    {miniWeekdayLabels[weekday]}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {miniDays.map((day) => {
                  const dayKey = day.format("YYYY-MM-DD");
                  const isCurrentMonth = day.month() === miniMonthStart.month();
                  const hasCourse = scheduleDateKeys.has(dayKey);
                  const hasExam = examDateKeys.has(dayKey);
                  const isToday = dayKey === todayKey;

                  return (
                    <div
                      key={dayKey}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-md p-1 text-xs",
                        !isCurrentMonth && "text-muted-foreground/50",
                      )}
                    >
                      <span
                        className={cn(
                          isToday &&
                            "underline decoration-foreground underline-offset-2",
                        )}
                      >
                        {day.date()}
                      </span>
                      {isCurrentMonth && (hasCourse || hasExam) ? (
                        <div className="flex items-center gap-1">
                          {hasCourse && (
                            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                          )}
                          {hasExam && (
                            <span className="h-1.5 w-1.5 rounded-full border border-foreground" />
                          )}
                        </div>
                      ) : (
                        <span className="h-1.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardPanel>
          </Card>
        </aside>
      </div>
    </main>
  );
}
