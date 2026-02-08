import dayjs from "dayjs";
import { AlarmClock, CheckCircle2, Clock3 } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  createWeekDayFormatter,
  formatDateTime,
  getWeekStartMonday,
} from "@/lib/date-utils";
import { getPrisma } from "@/lib/prisma";
import { formatTime } from "@/lib/time-utils";
import { DebugDateCard } from "./components/debug-date-card";
import { ExamsCard } from "./components/exams-card";
import { FocusStatusCard } from "./components/focus-status-card";
import { HomeworksCard } from "./components/homeworks-card";
import { QuickActionsCard } from "./components/quick-actions-card";
import { TermSelectionCard } from "./components/term-selection-card";
import { TimelineCard } from "./components/timeline-card";
import { WeekTable } from "./components/week-table";
import {
  buildExams,
  buildScheduleTimes,
  buildSessions,
  buildTimeSlots,
  buildWeekDays,
  computeHomeworkBuckets,
  computeUpcomingExams,
  extractSections,
  filterRemainingSessions,
  filterSessionsByDay,
  findBusiestDate,
  findCurrentSession,
  findNextSession,
  resolveDashboardSections,
  selectCurrentSemester,
  selectWeeklySessions,
  sortSessionsByStart,
} from "./dashboard-helpers";
import type { FocusCardItem, HomeworkWithSection } from "./types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    title: t("pages.meDashboard"),
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ debugDate?: string; debugTools?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const locale = await getLocale();
  const prisma = getPrisma(locale);
  const searchP = await searchParams;
  const isDev = process.env.NODE_ENV !== "production";
  const forceDebugTools = searchP.debugTools === "1";
  const showDebugTools = isDev || forceDebugTools;
  const debugDateRaw = searchP.debugDate?.trim();
  const debugDate =
    showDebugTools && debugDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(debugDateRaw)
      ? dayjs(debugDateRaw)
      : null;
  const baseNow = dayjs();
  const referenceNow = debugDate?.isValid()
    ? debugDate
        .hour(baseNow.hour())
        .minute(baseNow.minute())
        .second(baseNow.second())
        .millisecond(baseNow.millisecond())
    : baseNow;
  const referenceDate = referenceNow.toDate();

  const [t, tCommon, user, subscriptions, semesters] = await Promise.all([
    getTranslations("meDashboard"),
    getTranslations("common"),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, username: true },
    }),
    prisma.calendarSubscription.findMany({
      where: { userId: session.user.id },
      include: {
        sections: {
          include: {
            course: true,
            semester: true,
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
              },
              orderBy: [{ date: "asc" }, { startTime: "asc" }],
            },
            exams: { orderBy: { examDate: "asc" } },
          },
        },
      },
      orderBy: { id: "desc" },
    }),
    prisma.semester.findMany({
      select: {
        id: true,
        nameCn: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { startDate: "asc" },
    }),
  ]);

  if (!user) {
    console.error("Authenticated user not found in database", {
      userId: session.user.id,
    });
    return <div>{tCommon("userNotFound")}</div>;
  }

  const { allSections } = extractSections(subscriptions);
  const currentSemester = selectCurrentSemester(semesters, referenceDate);
  const {
    hasAnySelection,
    hasCurrentTermSelection,
    dashboardSections,
    dashboardSectionIds,
  } = resolveDashboardSections(allSections, currentSemester);
  const allScheduleTimes = buildScheduleTimes(allSections);
  const currentTermName = currentSemester?.nameCn ?? "—";

  const homeworks: HomeworkWithSection[] = dashboardSectionIds.length
    ? await prisma.homework.findMany({
        where: { sectionId: { in: dashboardSectionIds }, deletedAt: null },
        include: {
          homeworkCompletions: {
            where: { userId: session.user.id },
            select: { completedAt: true },
          },
          section: { include: { course: true } },
        },
        orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
      })
    : [];

  const sessions = sortSessionsByStart(buildSessions(dashboardSections));
  const exams = buildExams(dashboardSections);

  const now = referenceNow;
  const todayStart = now.startOf("day");
  const tomorrowStart = todayStart.add(1, "day");
  const weekStart = getWeekStartMonday(now);
  const weekEnd = weekStart.add(7, "day");
  const next7DaysEnd = todayStart.add(8, "day");

  const todaySessions = filterSessionsByDay(sessions, todayStart);
  const tomorrowSessions = filterSessionsByDay(sessions, tomorrowStart);
  const currentSession = findCurrentSession(todaySessions, now);
  const nextSession = findNextSession(sessions, now);
  const todayRemaining = filterRemainingSessions(todaySessions, now);

  const weeklySessions = selectWeeklySessions(sessions, weekStart, weekEnd);
  const weekDays = buildWeekDays(weekStart);
  const timeSlots = buildTimeSlots(weeklySessions);

  const { incompleteHomeworks, dueToday, dueWithin3Days } =
    computeHomeworkBuckets(homeworks, todayStart);
  const upcomingExams = computeUpcomingExams(exams, todayStart, next7DaysEnd);

  const weekDayFormatter = createWeekDayFormatter(locale);
  const busiestDate = findBusiestDate(allScheduleTimes);
  const buildDashboardHref = (nextDate: dayjs.Dayjs | null) => {
    if (!showDebugTools) return "/dashboard";
    if (!nextDate) return "/dashboard";
    return `/dashboard?debugTools=1&debugDate=${nextDate.format("YYYY-MM-DD")}`;
  };

  const focusCards: FocusCardItem[] = [
    ...(currentSession
      ? [
          {
            key: "current",
            icon: Clock3,
            title: t("focus.currentClass"),
            name: currentSession.courseName,
            meta: `${formatTime(currentSession.startTime)}-${formatTime(
              currentSession.endTime,
            )}`,
            sub: currentSession.location,
          },
        ]
      : []),
    ...(nextSession
      ? [
          {
            key: "next",
            icon: AlarmClock,
            title: t("focus.nextClass"),
            name: nextSession.courseName,
            meta: formatDateTime(
              nextSession.date,
              nextSession.startTime,
              locale,
            ),
            sub: nextSession.location,
          },
        ]
      : []),
    {
      key: "status",
      icon: CheckCircle2,
      title: t("focus.todayStatus"),
      name: `${todayRemaining.length}`,
      meta: t("focus.remainingToday"),
      sub: t("focus.tomorrowCount", { count: tomorrowSessions.length }),
    },
  ];

  return (
    <main className="page-main">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">{tCommon("home")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t("title")}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-8 mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-display">{t("title")}</h1>
          {showDebugTools ? (
            <Badge variant="warning" className="h-fit">
              DEV
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground text-subtitle">
          {t("descriptionV2", { name: user.name ?? tCommon("me") })}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <section className="space-y-4">
          {!hasCurrentTermSelection ? (
            <TermSelectionCard
              t={t}
              hasAnySelection={hasAnySelection}
              currentTermName={currentTermName}
            />
          ) : null}

          {hasCurrentTermSelection ? (
            <>
              <TimelineCard
                t={t}
                todaySessions={todaySessions}
                tomorrowSessions={tomorrowSessions}
              />
              <WeekTable
                t={t}
                timeSlots={timeSlots}
                weekDays={weekDays}
                weeklySessions={weeklySessions}
                weekDayFormatter={weekDayFormatter}
              />
            </>
          ) : null}
        </section>

        <aside className="lg:-order-1 space-y-4">
          {showDebugTools ? (
            <DebugDateCard
              t={t}
              todayStart={todayStart}
              busiestDate={busiestDate}
              buildDashboardHref={buildDashboardHref}
            />
          ) : null}

          {hasCurrentTermSelection ? (
            <>
              <FocusStatusCard
                title={t("focus.todayStatus")}
                cards={focusCards}
              />
              <HomeworksCard
                t={t}
                locale={locale}
                incompleteHomeworks={incompleteHomeworks}
                dueTodayCount={dueToday.length}
                dueSoonCount={dueWithin3Days.length}
              />
              <ExamsCard t={t} locale={locale} upcomingExams={upcomingExams} />
            </>
          ) : null}

          <QuickActionsCard t={t} userId={user.id} username={user.username} />
        </aside>
      </div>
    </main>
  );
}
