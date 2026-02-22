import dayjs from "dayjs";
import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CommentAwareTabs } from "@/components/comments/comment-aware-tabs";
import { CommentsSection } from "@/components/comments/comments-section";
import { DescriptionPanel } from "@/components/descriptions/description-panel";
import type { CalendarEvent } from "@/components/event-calendar";
import { EventCalendar } from "@/components/event-calendar";
import { HomeworkPanel } from "@/components/homeworks/homework-panel";
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
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { Link } from "@/i18n/routing";
import { getViewerContext } from "@/lib/comment-utils";
import { getCommentsPayload } from "@/lib/comments-server";
import { getDescriptionPayload } from "@/lib/descriptions-server";
import { prisma as basePrisma, getPrisma } from "@/lib/prisma";
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
  const parsedJwId = parseInt(jwId, 10);

  if (Number.isNaN(parsedJwId)) {
    notFound();
  }

  const locale = await getLocale();
  const prisma = getPrisma(locale);

  const section = await prisma.section.findUnique({
    where: { jwId: parsedJwId },
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

  // Parallel: semesters, otherSections, translations, viewer, and lightweight counts
  const [
    semesters,
    otherSections,
    t,
    tCommon,
    tA11y,
    tComments,
    ,
    sectionTeacherIds,
    sectionCommentCount,
    courseCommentCount,
    homeworkCount,
  ] = await Promise.all([
    prisma.semester.findMany({
      select: {
        id: true,
        startDate: true,
        endDate: true,
      },
      orderBy: {
        startDate: "asc",
      },
    }),
    prisma.section.findMany({
      where: {
        courseId: section.courseId,
        id: { not: section.id },
      },
      include: {
        semester: true,
        teachers: true,
      },
      orderBy: [{ semester: { jwId: "desc" } }, { code: "asc" }],
    }),
    getTranslations("sectionDetail"),
    getTranslations("common"),
    getTranslations("accessibility"),
    getTranslations("comments"),
    getViewerContext({ includeAdmin: false }),
    basePrisma.sectionTeacher.findMany({
      where: { sectionId: section.id },
      select: { id: true },
    }),
    basePrisma.comment.count({
      where: { sectionId: section.id, status: { not: "deleted" } },
    }),
    basePrisma.comment.count({
      where: { courseId: section.courseId, status: { not: "deleted" } },
    }),
    basePrisma.homework.count({
      where: { sectionId: section.id, deletedAt: null },
    }),
  ]);

  const sectionTeacherIdList = (sectionTeacherIds as { id: number }[]).map(
    (entry) => entry.id,
  );
  const sectionTeacherCommentCount = sectionTeacherIdList.length
    ? await basePrisma.comment.count({
        where: {
          sectionTeacherId: { in: sectionTeacherIdList },
          status: { not: "deleted" },
        },
      })
    : 0;
  const commentCount =
    (sectionCommentCount as number) +
    (courseCommentCount as number) +
    (sectionTeacherCommentCount as number);

  // Get current section's teacher IDs for comparison
  const currentTeacherIds = new Set(section.teachers.map((t) => t.id));
  const currentSemesterId = section.semesterId;

  // Group other sections
  const sameSemesterOtherTeachers = otherSections.filter((s) => {
    if (s.semesterId !== currentSemesterId) return false;
    const sectionTeacherIdSet = s.teachers.map((t) => t.id);
    const hasOverlap = sectionTeacherIdSet.some((id) =>
      currentTeacherIds.has(id),
    );
    return !hasOverlap;
  });

  const sameTeacherOtherSemesters = otherSections.filter((s) => {
    if (s.semesterId === currentSemesterId) return false;
    const sectionTeacherIdSet = s.teachers.map((t) => t.id);
    return sectionTeacherIdSet.some((id) => currentTeacherIds.has(id));
  });

  const teacherOptions = section.teachers.map((teacher) => ({
    id: teacher.id,
    label: teacher.namePrimary,
  }));

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
  const miniWeekdayLabels = [
    t("weekdays.shortSunday"),
    t("weekdays.shortMonday"),
    t("weekdays.shortTuesday"),
    t("weekdays.shortWednesday"),
    t("weekdays.shortThursday"),
    t("weekdays.shortFriday"),
    t("weekdays.shortSaturday"),
  ];
  const miniMonthLabel = miniMonthStart.format("YYYY.MM");
  const todayKey = today.format("YYYY-MM-DD");

  return (
    <main className="page-main">
      <SectionBreadcrumb sectionCode={section.code} tCommon={tCommon} />

      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <div className="space-y-8">
          <SectionHeader
            courseName={section.course.namePrimary}
            courseNameSecondary={section.course.nameSecondary}
            sectionId={section.id}
            sectionJwId={section.jwId}
            t={t}
            tA11y={tA11y}
          />

          <CommentAwareTabs
            defaultValue="homeworks"
            commentValue="comments"
            hashMappings={[{ prefix: "#homework-", value: "homeworks" }]}
            tabValues={["homeworks", "calendar", "comments"]}
            className="space-y-6"
          >
            <TabsList className="w-full" variant="underline">
              <TabsTab value="calendar">{t("tabs.calendar")}</TabsTab>
              <TabsTab value="homeworks">
                {t("tabs.homeworks")} ({homeworkCount as number})
              </TabsTab>
              <TabsTab value="comments">
                {t("tabs.comments")} ({commentCount})
              </TabsTab>
            </TabsList>
            <TabsPanel value="homeworks" keepMounted>
              <Suspense fallback={<HomeworkSkeleton />}>
                <HomeworkLoader
                  sectionId={section.id}
                  semesterStart={
                    section.semester?.startDate?.toISOString() ?? null
                  }
                  semesterEnd={section.semester?.endDate?.toISOString() ?? null}
                />
              </Suspense>
            </TabsPanel>
            <TabsPanel value="comments" keepMounted>
              <div className="space-y-4">
                <Suspense fallback={<CommentsSkeleton />}>
                  <CommentsLoader
                    sectionId={section.id}
                    courseId={section.courseId}
                    teacherOptions={teacherOptions}
                    tabSectionLabel={tComments("tabSection")}
                    tabCourseLabel={tComments("tabCourse")}
                    tabSectionTeacherLabel={tComments("tabSectionTeacher")}
                  />
                </Suspense>
              </div>
            </TabsPanel>
            <TabsPanel value="calendar" keepMounted>
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
                            href="/dashboard/subscriptions/sections/"
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
            </TabsPanel>
          </CommentAwareTabs>
        </div>

        <aside className="lg:-order-1 space-y-4">
          <Suspense fallback={<DescriptionSkeleton />}>
            <DescriptionLoader targetType="section" targetId={section.id} />
          </Suspense>
          <BasicInfoCard
            section={section}
            otherSections={otherSections}
            sameSemesterOtherTeachers={sameSemesterOtherTeachers}
            sameTeacherOtherSemesters={sameTeacherOtherSemesters}
            t={t}
            tCommon={tCommon}
          />
          <MiniCalendar
            monthLabel={miniMonthLabel}
            weekdayLabels={miniWeekdayLabels}
            weekdays={miniWeekdays}
            days={miniDays}
            monthStart={miniMonthStart}
            scheduleDateKeys={scheduleDateKeys}
            examDateKeys={examDateKeys}
            todayKey={todayKey}
          />
        </aside>
      </div>
    </main>
  );
}

// --- Suspense Skeleton Fallbacks ---

function HomeworkSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

function CommentsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function DescriptionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-2/3" />
      </CardHeader>
      <CardPanel>
        <Skeleton className="h-20 w-full" />
      </CardPanel>
    </Card>
  );
}

// --- Async Server Component Loaders (streamed via Suspense) ---

async function CommentsLoader({
  sectionId,
  courseId,
  teacherOptions,
  tabSectionLabel,
  tabCourseLabel,
  tabSectionTeacherLabel,
}: {
  sectionId: number;
  courseId: number;
  teacherOptions: { id: number; label: string }[];
  tabSectionLabel: string;
  tabCourseLabel: string;
  tabSectionTeacherLabel: string;
}) {
  const viewer = await getViewerContext({ includeAdmin: false });
  const selectedTeacherId = teacherOptions[0]?.id ?? null;

  const [sectionComments, courseComments, sectionTeacherComments] =
    await Promise.all([
      getCommentsPayload({ type: "section", targetId: sectionId }, viewer),
      getCommentsPayload({ type: "course", targetId: courseId }, viewer),
      selectedTeacherId
        ? getCommentsPayload(
            {
              type: "section-teacher",
              sectionId,
              teacherId: selectedTeacherId,
            },
            viewer,
          )
        : Promise.resolve({ comments: [], hiddenCount: 0, viewer }),
    ]);

  const commentsInitialData = {
    commentMap: {
      section: sectionComments.comments,
      course: courseComments.comments,
      "section-teacher": sectionTeacherComments.comments,
    },
    hiddenMap: {
      section: sectionComments.hiddenCount,
      course: courseComments.hiddenCount,
      "section-teacher": sectionTeacherComments.hiddenCount,
    },
    hiddenCount:
      sectionComments.hiddenCount +
      courseComments.hiddenCount +
      sectionTeacherComments.hiddenCount,
    viewer: sectionComments.viewer,
  };

  return (
    <CommentsSection
      targets={[
        {
          key: "section",
          label: tabSectionLabel,
          type: "section",
          targetId: sectionId,
        },
        {
          key: "course",
          label: tabCourseLabel,
          type: "course",
          targetId: courseId,
        },
        {
          key: "section-teacher",
          label: tabSectionTeacherLabel,
          type: "section-teacher",
          sectionId,
        },
      ]}
      teacherOptions={teacherOptions}
      showAllTargets
      initialData={commentsInitialData}
    />
  );
}

async function HomeworkLoader({
  sectionId,
  semesterStart,
  semesterEnd,
}: {
  sectionId: number;
  semesterStart: string | null;
  semesterEnd: string | null;
}) {
  const homeworkViewer = await getViewerContext({ includeAdmin: true });

  const homeworkInclude = {
    description: true,
    createdBy: {
      select: { id: true, name: true, username: true, image: true },
    },
    updatedBy: {
      select: { id: true, name: true, username: true, image: true },
    },
    deletedBy: {
      select: { id: true, name: true, username: true, image: true },
    },
    ...(homeworkViewer.userId
      ? {
          homeworkCompletions: {
            where: { userId: homeworkViewer.userId },
            select: { completedAt: true },
          },
        }
      : {}),
  } as const;

  const [homeworkEntries, homeworkAuditLogs] = await Promise.all([
    basePrisma.homework.findMany({
      where: { sectionId, deletedAt: null },
      include: homeworkInclude,
      orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
    }),
    basePrisma.homeworkAuditLog.findMany({
      where: { sectionId },
      include: {
        actor: {
          select: { id: true, name: true, username: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const homeworks = homeworkEntries.map(
    (homework: { homeworkCompletions?: Array<{ completedAt: Date }> }) => {
      const { homeworkCompletions, ...rest } = homework;
      return {
        ...rest,
        completion: homeworkCompletions?.[0] ?? null,
      };
    },
  );

  const homeworkInitialData = {
    homeworks: homeworks.map((homework: any) => ({
      ...homework,
      createdAt: homework.createdAt.toISOString(),
      updatedAt: homework.updatedAt.toISOString(),
      deletedAt: homework.deletedAt?.toISOString() ?? null,
      publishedAt: homework.publishedAt?.toISOString() ?? null,
      submissionStartAt: homework.submissionStartAt?.toISOString() ?? null,
      submissionDueAt: homework.submissionDueAt?.toISOString() ?? null,
      description: homework.description
        ? {
            id: homework.description.id,
            content: homework.description.content ?? "",
            updatedAt: homework.description.updatedAt
              ? homework.description.updatedAt.toISOString()
              : null,
          }
        : null,
      completion: homework.completion
        ? { completedAt: homework.completion.completedAt.toISOString() }
        : null,
    })),
    auditLogs: homeworkAuditLogs.map((log: any) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
    viewer: homeworkViewer,
  };

  return (
    <HomeworkPanel
      sectionId={sectionId}
      semesterStart={semesterStart}
      semesterEnd={semesterEnd}
      initialData={homeworkInitialData}
    />
  );
}

async function DescriptionLoader({
  targetType,
  targetId,
}: {
  targetType: "section" | "course" | "teacher" | "homework";
  targetId: number | string;
}) {
  const viewer = await getViewerContext({ includeAdmin: false });
  const descriptionData = await getDescriptionPayload(
    targetType,
    targetId,
    viewer,
  );

  return (
    <DescriptionPanel
      targetType={targetType}
      targetId={targetId}
      initialData={descriptionData}
    />
  );
}

// --- Presentational Sub-Components ---

type SectionBreadcrumbProps = {
  sectionCode: string;
  tCommon: (key: string) => string;
};

function SectionBreadcrumb({ sectionCode, tCommon }: SectionBreadcrumbProps) {
  return (
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
            <BreadcrumbPage>{sectionCode}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

type SectionHeaderProps = {
  courseName: string;
  courseNameSecondary: string | null;
  sectionId: number;
  sectionJwId: number;
  t: (key: string, params?: Record<string, string | number | Date>) => string;
  tA11y: (key: string) => string;
};

function SectionHeader({
  courseName,
  courseNameSecondary,
  sectionId,
  sectionJwId,
  t,
  tA11y,
}: SectionHeaderProps) {
  return (
    <div className="mt-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="mb-2 text-display">{courseName}</h1>
          {courseNameSecondary ? (
            <p className="text-muted-foreground text-sm">
              {courseNameSecondary}
            </p>
          ) : null}
        </div>
        <SubscriptionCalendarButton
          sectionDatabaseId={sectionId}
          sectionJwId={sectionJwId}
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
          subscribeSuccessDescriptionLabel={t("subscribeSuccessDescription")}
          unsubscribeSuccessDescriptionLabel={t(
            "unsubscribeSuccessDescription",
          )}
          operationFailedLabel={t("operationFailed")}
          pleaseRetryLabel={t("pleaseRetry")}
          viewAllSubscriptionsLabel={t("viewAllSubscriptions")}
          loginRequiredLabel={t("loginRequired")}
          loginRequiredDescriptionLabel={t("loginRequiredDescription")}
          loginToSubscribeLabel={t("loginToSubscribe")}
          subscriptionCalendarUrlAriaLabel={tA11y("subscriptionCalendarUrl")}
          singleSectionCalendarUrlAriaLabel={tA11y("singleSectionCalendarUrl")}
        />
      </div>
    </div>
  );
}

type MiniCalendarProps = {
  monthLabel: string;
  weekdayLabels: string[];
  weekdays: number[];
  days: dayjs.Dayjs[];
  monthStart: dayjs.Dayjs;
  scheduleDateKeys: Set<string>;
  examDateKeys: Set<string>;
  todayKey: string;
};

function MiniCalendar({
  monthLabel,
  weekdayLabels,
  weekdays,
  days,
  monthStart,
  scheduleDateKeys,
  examDateKeys,
  todayKey,
}: MiniCalendarProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-semibold text-sm">{monthLabel}</CardTitle>
      </CardHeader>
      <CardPanel className="space-y-2">
        <div className="grid grid-cols-7 gap-1 text-[0.65rem] text-muted-foreground">
          {weekdays.map((weekday) => (
            <div key={weekdayLabels[weekday]} className="text-center">
              {weekdayLabels[weekday]}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayKey = day.format("YYYY-MM-DD");
            const isCurrentMonth = day.month() === monthStart.month();
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
                    {hasCourse ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                    ) : null}
                    {hasExam ? (
                      <span className="h-1.5 w-1.5 rounded-full border border-foreground" />
                    ) : null}
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
  );
}

type BasicInfoCardProps = {
  section: any;
  otherSections: any[];
  sameSemesterOtherTeachers: any[];
  sameTeacherOtherSemesters: any[];
  t: (key: string, params?: Record<string, string | number | Date>) => string;
  tCommon: (key: string) => string;
};

function BasicInfoCard({
  section,
  otherSections,
  sameSemesterOtherTeachers,
  sameTeacherOtherSemesters,
  t,
  tCommon,
}: BasicInfoCardProps) {
  if (!section) return null;

  return (
    <Collapsible className="space-y-4" defaultOpen>
      <CollapsibleTrigger className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 font-medium text-foreground text-sm lg:hidden">
        <span>{t("basicInfo")}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </CollapsibleTrigger>
      <CollapsiblePanel className="lg:block">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("basicInfo")}</CardTitle>
          </CardHeader>
          <CardPanel>
            <div className="grid grid-cols-1 gap-2 text-sm">
              {section.semester ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">{t("semester")}</span>
                  <span className="font-medium text-foreground">
                    {section.semester.nameCn}
                  </span>
                </div>
              ) : null}

              {section.code ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">
                    {t("sectionCode")}
                  </span>
                  <span className="font-medium font-mono text-foreground">
                    {section.code}
                  </span>
                </div>
              ) : null}

              <div className="mt-4" />

              {section.campus ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">{t("campus")}</span>
                  <span className="font-medium text-foreground">
                    {section.campus.namePrimary}
                  </span>
                </div>
              ) : null}

              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground">
                  {tCommon("undergraduateGraduate")}
                </span>
                <span className="font-medium text-foreground">
                  {section.graduateAndPostgraduate ? "✓" : "×"}
                </span>
              </div>

              {section.credits !== null ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">{t("credits")}</span>
                  <span className="font-medium text-foreground">
                    {section.credits}
                  </span>
                </div>
              ) : null}

              {section.period !== null ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">{t("period")}</span>
                  <span className="font-medium text-foreground">
                    {section.period}
                    {section.actualPeriods !== null &&
                    section.actualPeriods !== section.period
                      ? ` (${section.actualPeriods})`
                      : null}
                  </span>
                </div>
              ) : null}

              {section.examMode ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">{t("examMode")}</span>
                  <span className="font-medium text-foreground">
                    {section.examMode.namePrimary}
                  </span>
                </div>
              ) : null}

              {section.remark ? (
                <div className="mt-6">
                  <p className="mb-1 text-muted-foreground text-sm">
                    {t("remark")}
                  </p>
                  <p className="whitespace-pre-wrap text-body text-foreground">
                    {section.remark}
                  </p>
                </div>
              ) : null}

              {section.teachers && section.teachers.length > 0 ? (
                <div className="mt-6">
                  <p className="mb-2 text-muted-foreground text-sm">
                    {t("teachers")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {section.teachers.map((teacher: any) => (
                      <Link
                        key={teacher.id}
                        href={`/teachers/${teacher.id}`}
                        className="no-underline"
                      >
                        <Badge
                          variant="secondary"
                          className="cursor-pointer hover:bg-secondary/80"
                        >
                          {teacher.namePrimary}
                          {teacher.department ? (
                            <span className="ml-1 text-muted-foreground">
                              ({teacher.department.namePrimary})
                            </span>
                          ) : null}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <Collapsible className="mt-6">
              <CollapsibleTrigger className="flex items-center text-muted-foreground text-sm hover:underline">
                {t("moreDetails")} ↓
              </CollapsibleTrigger>
              <CollapsiblePanel className="mt-6">
                <div className="grid grid-cols-1 gap-2 text-sm">
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

                {section.adminClasses && section.adminClasses.length > 0 ? (
                  <div className="mt-6">
                    <p className="mb-2 text-muted-foreground text-sm">
                      {t("adminClasses")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {section.adminClasses.map((ac: any) => (
                        <Badge key={ac.id} variant="secondary">
                          {ac.namePrimary}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {sameSemesterOtherTeachers.length > 0 ||
                sameTeacherOtherSemesters.length > 0 ||
                otherSections.length > 0 ? (
                  <div className="mt-6 space-y-4">
                    {sameSemesterOtherTeachers.length > 0 ? (
                      <div>
                        <p className="mb-2 text-muted-foreground text-sm">
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
                                  className="cursor-pointer hover:bg-accent"
                                >
                                  {otherSection.teachers.length > 0 ? (
                                    <span>
                                      {otherSection.teachers
                                        .map((t: any) => t.namePrimary)
                                        .join(", ")}
                                    </span>
                                  ) : (
                                    <span>{t("noTeacher")}</span>
                                  )}
                                  <span className="ml-1 text-muted-foreground">
                                    {otherSection.code}
                                  </span>
                                </Badge>
                              </Link>
                            ))}
                        </div>
                      </div>
                    ) : null}

                    {sameTeacherOtherSemesters.length > 0 ? (
                      <div>
                        <p className="mb-2 text-muted-foreground text-sm">
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
                                  className="cursor-pointer hover:bg-accent"
                                >
                                  {otherSection.semester ? (
                                    <span>{otherSection.semester.nameCn}</span>
                                  ) : null}
                                  <span className="ml-1 text-muted-foreground">
                                    {otherSection.code}
                                  </span>
                                </Badge>
                              </Link>
                            ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CollapsiblePanel>
            </Collapsible>

            <div className="mt-6">
              <Link
                href={`/courses/${section.course.jwId}`}
                className="text-muted-foreground text-sm hover:underline"
              >
                {t("viewAllCourseSections")} ({otherSections.length + 1}) {"->"}
              </Link>
            </div>
          </CardPanel>
        </Card>
      </CollapsiblePanel>
    </Collapsible>
  );
}
