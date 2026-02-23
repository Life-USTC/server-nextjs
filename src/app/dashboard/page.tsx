import dayjs from "dayjs";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireSignedInUserId } from "@/lib/auth-helpers";
import { selectCurrentSemesterFromList } from "@/lib/current-semester";
import { createWeekDayFormatter, getWeekStartMonday } from "@/lib/date-utils";
import { getPrisma } from "@/lib/prisma";
import { DebugDateCard } from "./components/debug-date-card";
import { HomeworkEntryCard } from "./components/homework-entry-card";
import { HomeworksCard } from "./components/homeworks-card";
import { TermSelectionCard } from "./components/term-selection-card";
import { TimelineCard } from "./components/timeline-card";
import { WeekTable } from "./components/week-table";
import {
  buildScheduleTimes,
  buildSessions,
  buildTimeSlots,
  buildWeekDays,
  computeHomeworkBuckets,
  extractSections,
  filterSessionsByDay,
  findBusiestDate,
  resolveDashboardSections,
  selectWeeklySessions,
  sortSessionsByStart,
} from "./dashboard-helpers";
import type { HomeworkWithSection } from "./types";

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
  const userId = await requireSignedInUserId();

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
      where: { id: userId },
      select: { id: true, name: true, username: true },
    }),
    prisma.calendarSubscription.findMany({
      where: { userId },
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
      userId,
    });
    return <div>{tCommon("userNotFound")}</div>;
  }

  const { allSections } = extractSections(subscriptions);
  const currentSemester = selectCurrentSemesterFromList(
    semesters,
    referenceDate,
  );
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
            where: { userId },
            select: { completedAt: true },
          },
          section: { include: { course: true } },
        },
        orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
      })
    : [];

  const sessions = sortSessionsByStart(buildSessions(dashboardSections));

  const now = referenceNow;
  const todayStart = now.startOf("day");
  const tomorrowStart = todayStart.add(1, "day");
  const weekStart = getWeekStartMonday(now);
  const weekEnd = weekStart.add(7, "day");

  const todaySessions = filterSessionsByDay(sessions, todayStart);
  const tomorrowSessions = filterSessionsByDay(sessions, tomorrowStart);

  const weeklySessions = selectWeeklySessions(sessions, weekStart, weekEnd);
  const weekDays = buildWeekDays(weekStart);
  const timeSlots = buildTimeSlots(weeklySessions);

  const { incompleteHomeworks, dueToday, dueWithin3Days } =
    computeHomeworkBuckets(homeworks, todayStart);

  const weekDayFormatter = createWeekDayFormatter(locale);
  const busiestDate = findBusiestDate(allScheduleTimes);
  const buildDashboardHref = (nextDate: dayjs.Dayjs | null) => {
    if (!showDebugTools) return "/dashboard";
    if (!nextDate) return "/dashboard";
    return `/dashboard?debugTools=1&debugDate=${nextDate.format("YYYY-MM-DD")}`;
  };

  return (
    <DashboardShell
      homeLabel={tCommon("home")}
      dashboardLabel={t("title")}
      title={t("title")}
      description={t("descriptionV2", { name: user.name ?? tCommon("me") })}
    >
      {showDebugTools ? (
        <DebugDateCard
          t={t}
          todayStart={todayStart}
          busiestDate={busiestDate}
          buildDashboardHref={buildDashboardHref}
        />
      ) : null}

      {!hasCurrentTermSelection ? (
        <TermSelectionCard
          t={t}
          hasAnySelection={hasAnySelection}
          currentTermName={currentTermName}
        />
      ) : null}

      {hasCurrentTermSelection ? (
        <>
          <HomeworkEntryCard
            t={t}
            dueTodayCount={dueToday.length}
            dueSoonCount={dueWithin3Days.length}
          />
          <TimelineCard
            t={t}
            todaySessions={todaySessions}
            tomorrowSessions={tomorrowSessions}
          />
          <HomeworksCard
            t={t}
            locale={locale}
            incompleteHomeworks={incompleteHomeworks}
            dueTodayCount={dueToday.length}
            dueSoonCount={dueWithin3Days.length}
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
    </DashboardShell>
  );
}
