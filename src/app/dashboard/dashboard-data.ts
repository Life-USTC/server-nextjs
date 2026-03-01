import dayjs from "dayjs";
import { getLocale } from "next-intl/server";
import { ensureUserCalendarFeedToken } from "@/lib/calendar-feed-token";
import { selectCurrentSemesterFromList } from "@/lib/current-semester";
import {
  recommendDashboardLinks,
  USTC_DASHBOARD_LINKS,
} from "@/lib/dashboard-links";
import { createWeekDayFormatter, getWeekStartSunday } from "@/lib/date-utils";
import { prisma as basePrisma, getPrisma } from "@/lib/prisma";
import {
  buildExams,
  buildScheduleTimes,
  buildSessions,
  buildTimeSlots,
  buildWeekDays,
  computeHomeworkBuckets,
  filterSessionsByDay,
  findBusiestDate,
  getSemesterWeeks,
  resolveDashboardSections,
  selectWeeklySessions,
  sortSessionsByStart,
} from "./dashboard-helpers";
import type { ExamItem, HomeworkWithSection, SessionItem } from "./types";

export type OverviewDataOptions = {
  debugDate?: string;
  debugTools?: boolean;
};

export type DashboardNavStats = {
  user: { id: string; name: string | null; username: string | null };
  pendingHomeworksCount: number;
  highlightPendingHomeworks: boolean;
  examsCount: number;
};

export async function getDashboardNavStats(
  userId: string,
  options: OverviewDataOptions = {},
): Promise<DashboardNavStats | null> {
  const isDev = process.env.NODE_ENV !== "production";
  const showDebugTools =
    options.debugTools === true || (isDev && Boolean(options.debugDate));
  const debugDateRaw = options.debugDate?.trim();
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
  const todayStart = referenceNow.startOf("day");
  const tomorrowStart = todayStart.add(1, "day");

  const user = await basePrisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      subscribedSections: { select: { id: true } },
    },
  });

  if (!user) return null;

  const sectionIds = user.subscribedSections.map((section) => section.id);
  if (sectionIds.length === 0) {
    return {
      user: { id: user.id, name: user.name, username: user.username },
      pendingHomeworksCount: 0,
      highlightPendingHomeworks: false,
      examsCount: 0,
    };
  }

  const [pendingHomeworksCount, dueTodayCount, examsCount] = await Promise.all([
    basePrisma.homework.count({
      where: {
        deletedAt: null,
        sectionId: { in: sectionIds },
        homeworkCompletions: { none: { userId } },
      },
    }),
    basePrisma.homework.count({
      where: {
        deletedAt: null,
        sectionId: { in: sectionIds },
        submissionDueAt: {
          gte: todayStart.toDate(),
          lt: tomorrowStart.toDate(),
        },
        homeworkCompletions: { none: { userId } },
      },
    }),
    basePrisma.exam.count({
      where: { sectionId: { in: sectionIds } },
    }),
  ]);

  return {
    user: { id: user.id, name: user.name, username: user.username },
    pendingHomeworksCount,
    highlightPendingHomeworks: dueTodayCount > 0,
    examsCount,
  };
}

export type DashboardLinkSummary = {
  slug: string;
  title: string;
  url: string;
  description: string;
  clickCount: number;
};

export type OverviewData = {
  user: { id: string; name: string | null; username: string | null };
  currentTermName: string;
  hasAnySelection: boolean;
  hasCurrentTermSelection: boolean;
  todaySessions: ReturnType<typeof filterSessionsByDay>;
  tomorrowSessions: ReturnType<typeof filterSessionsByDay>;
  weeklySessions: ReturnType<typeof selectWeeklySessions>;
  weekDays: ReturnType<typeof buildWeekDays>;
  timeSlots: ReturnType<typeof buildTimeSlots>;
  incompleteHomeworks: HomeworkWithSection[];
  dueToday: HomeworkWithSection[];
  dueWithin3Days: HomeworkWithSection[];
  /** Sessions from today-3 to today+3 for calendar tab */
  calendarSessions: ReturnType<typeof filterSessionsByDay>[];
  /** Incomplete homeworks with due in [today-3, today+3] for calendar tab */
  calendarHomeworks: HomeworkWithSection[];
  calendarDays: dayjs.Dayjs[];
  weekDayFormatter: ReturnType<typeof createWeekDayFormatter>;
  referenceNow: dayjs.Dayjs;
  todayStart: dayjs.Dayjs;
  busiestDate: dayjs.Dayjs | null;
  showDebugTools: boolean;
  /** Semester-spanning calendar: bounds and full data */
  semesterStart: dayjs.Dayjs | null;
  semesterEnd: dayjs.Dayjs | null;
  semesterWeeks: dayjs.Dayjs[][];
  allSessions: SessionItem[];
  allExams: ExamItem[];
  semesterHomeworks: HomeworkWithSection[];
  dashboardLinks: DashboardLinkSummary[];
  recommendedLinks: DashboardLinkSummary[];
};

export async function getDashboardOverviewData(
  userId: string,
  options: OverviewDataOptions = {},
): Promise<OverviewData | null> {
  const locale = await getLocale();
  const prisma = getPrisma(locale);
  const isDev = process.env.NODE_ENV !== "production";
  const showDebugTools =
    options.debugTools === true || (isDev && Boolean(options.debugDate));
  const debugDateRaw = options.debugDate?.trim();
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

  const [user, semesters] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        subscribedSections: {
          include: {
            course: true,
            semester: true,
            schedules: {
              include: {
                room: {
                  include: {
                    building: {
                      include: { campus: true },
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

  if (!user) return null;

  const allSections = user.subscribedSections;
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
  const weekStart = getWeekStartSunday(now);
  const weekEnd = weekStart.add(7, "day");

  const todaySessions = filterSessionsByDay(sessions, todayStart);
  const tomorrowSessions = filterSessionsByDay(sessions, tomorrowStart);
  const weeklySessions = selectWeeklySessions(sessions, weekStart, weekEnd);
  const weekDays = buildWeekDays(weekStart);
  const timeSlots = buildTimeSlots(weeklySessions);
  const allScheduleTimes = buildScheduleTimes(allSections);
  const { incompleteHomeworks, dueToday, dueWithin3Days } =
    computeHomeworkBuckets(homeworks, todayStart);
  const weekDayFormatter = createWeekDayFormatter(locale);
  const busiestDate = findBusiestDate(allScheduleTimes);

  const calendarStart = todayStart.subtract(3, "day");
  const calendarEnd = todayStart.add(4, "day");
  const calendarDays = Array.from({ length: 7 }, (_, i) =>
    calendarStart.add(i, "day"),
  );
  const calendarSessions = calendarDays.map((day) =>
    filterSessionsByDay(sessions, day),
  );
  const calendarHomeworks = incompleteHomeworks.filter((hw) => {
    if (!hw.submissionDueAt) return false;
    const due = dayjs(hw.submissionDueAt);
    return !due.isBefore(calendarStart) && due.isBefore(calendarEnd);
  });

  const semesterStart =
    currentSemester?.startDate != null
      ? dayjs(currentSemester.startDate).startOf("day")
      : null;
  const semesterEnd =
    currentSemester?.endDate != null
      ? dayjs(currentSemester.endDate).endOf("day")
      : null;
  const semesterWeeks =
    semesterStart && semesterEnd && !semesterStart.isAfter(semesterEnd)
      ? getSemesterWeeks(semesterStart, semesterEnd)
      : [];
  const allSessions = sortSessionsByStart(buildSessions(dashboardSections));
  const allExams = buildExams(dashboardSections);
  const semesterHomeworks =
    semesterStart && semesterEnd
      ? incompleteHomeworks.filter((hw) => {
          if (!hw.submissionDueAt) return false;
          const due = dayjs(hw.submissionDueAt);
          return (
            !due.isBefore(semesterStart, "day") &&
            !due.isAfter(semesterEnd, "day")
          );
        })
      : [];

  const clickRows = await basePrisma.dashboardLinkClick.findMany({
    where: { userId },
    select: { slug: true, count: true },
  });
  const clickStats = Object.fromEntries(
    clickRows.map((row) => [row.slug, row.count]),
  );
  const dashboardLinks = USTC_DASHBOARD_LINKS.map((link) => ({
    ...link,
    clickCount: clickStats[link.slug] ?? 0,
  }));
  const recommendedLinks = recommendDashboardLinks(clickStats).map((link) => ({
    ...link,
    clickCount: clickStats[link.slug] ?? 0,
  }));

  return {
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
    },
    currentTermName,
    hasAnySelection,
    hasCurrentTermSelection,
    todaySessions,
    tomorrowSessions,
    weeklySessions,
    weekDays,
    timeSlots,
    incompleteHomeworks,
    dueToday,
    dueWithin3Days,
    calendarSessions,
    calendarHomeworks,
    calendarDays,
    weekDayFormatter,
    referenceNow: now,
    todayStart,
    busiestDate,
    showDebugTools,
    semesterStart,
    semesterEnd,
    semesterWeeks,
    allSessions,
    allExams,
    semesterHomeworks,
    dashboardLinks,
    recommendedLinks,
  };
}

export type HomeworkSummaryItem = {
  id: string;
  title: string;
  isMajor: boolean;
  requiresTeam: boolean;
  publishedAt: string | null;
  submissionStartAt: string | null;
  submissionDueAt: string | null;
  createdAt: string;
  description: string | null;
  completion: { completedAt: string } | null;
  section: {
    jwId: number | null;
    code: string | null;
    courseName: string | null;
    semesterName: string | null;
  } | null;
};

export type SectionOption = {
  id: number;
  jwId: number | null;
  code: string | null;
  courseName: string | null;
  semesterName: string | null;
  semesterStart: string | null;
  semesterEnd: string | null;
};

export async function getHomeworksTabData(userId: string) {
  const locale = await getLocale();
  const localizedPrisma = getPrisma(locale);

  const user = await basePrisma.user.findUnique({
    where: { id: userId },
    select: { subscribedSections: { select: { id: true, jwId: true } } },
  });
  const sectionIds =
    user?.subscribedSections.map((section) => section.id) ?? [];

  const subscribedSections: SectionOption[] =
    sectionIds.length > 0
      ? (
          await localizedPrisma.section.findMany({
            where: { id: { in: sectionIds } },
            select: {
              id: true,
              jwId: true,
              code: true,
              course: { select: { namePrimary: true } },
              semester: {
                select: {
                  nameCn: true,
                  startDate: true,
                  endDate: true,
                },
              },
            },
            orderBy: [{ semester: { jwId: "desc" } }, { code: "asc" }],
          })
        ).map((section) => ({
          id: section.id,
          jwId: section.jwId,
          code: section.code,
          courseName: section.course?.namePrimary ?? null,
          semesterName: section.semester?.nameCn ?? null,
          semesterStart: section.semester?.startDate
            ? section.semester.startDate.toISOString()
            : null,
          semesterEnd: section.semester?.endDate
            ? section.semester.endDate.toISOString()
            : null,
        }))
      : [];

  const homeworks =
    sectionIds.length > 0
      ? await localizedPrisma.homework.findMany({
          where: { sectionId: { in: sectionIds }, deletedAt: null },
          include: {
            description: { select: { content: true } },
            homeworkCompletions: {
              where: { userId },
              select: { completedAt: true },
            },
            section: {
              include: { course: true, semester: true },
            },
          },
          orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
        })
      : [];

  const homeworkSummaries: HomeworkSummaryItem[] = homeworks.map((hw) => ({
    id: hw.id,
    title: hw.title,
    isMajor: hw.isMajor,
    requiresTeam: hw.requiresTeam,
    publishedAt: hw.publishedAt?.toISOString() ?? null,
    submissionStartAt: hw.submissionStartAt?.toISOString() ?? null,
    submissionDueAt: hw.submissionDueAt?.toISOString() ?? null,
    createdAt: hw.createdAt.toISOString(),
    description: hw.description?.content ?? null,
    completion: hw.homeworkCompletions[0]
      ? { completedAt: hw.homeworkCompletions[0].completedAt.toISOString() }
      : null,
    section: hw.section
      ? {
          jwId: hw.section.jwId ?? null,
          code: hw.section.code ?? null,
          courseName: hw.section.course?.namePrimary ?? null,
          semesterName: hw.section.semester?.nameCn ?? null,
        }
      : null,
  }));

  return { homeworkSummaries, sections: subscribedSections };
}

export async function getSubscriptionsTabData(userId: string) {
  const locale = await getLocale();
  const prisma = getPrisma(locale);

  const [user, semesters] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscribedSections: {
          include: {
            course: true,
            semester: true,
            teachers: true,
            schedules: {
              include: {
                room: {
                  include: {
                    building: { include: { campus: true } },
                  },
                },
                teachers: true,
              },
              orderBy: [{ date: "asc" }, { startTime: "asc" }],
            },
            exams: {
              include: { examBatch: true, examRooms: true },
              orderBy: [{ examDate: "asc" }],
            },
          },
        },
      },
    }),
    prisma.semester.findMany({
      select: { id: true, nameCn: true, startDate: true, endDate: true },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const subscriptions =
    user && user.subscribedSections.length > 0
      ? [
          {
            id: user.id,
            sections: user.subscribedSections,
          },
        ]
      : [];

  const calendarFeedToken =
    user != null ? await ensureUserCalendarFeedToken(user.id) : null;
  const calendarSubscriptionUrl =
    user != null && calendarFeedToken
      ? `/api/users/${user.id}/calendar.ics?token=${calendarFeedToken}`
      : null;

  const currentSemesterId =
    selectCurrentSemesterFromList(semesters, new Date())?.id ?? null;

  return {
    subscriptions,
    semesters,
    currentSemesterId,
    userId,
    calendarSubscriptionUrl,
  };
}

export type SubscriptionsTabData = Awaited<
  ReturnType<typeof getSubscriptionsTabData>
>;
