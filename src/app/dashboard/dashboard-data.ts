import dayjs from "dayjs";
import { getLocale } from "next-intl/server";
import { pinyin } from "pinyin-pro";
import type {
  DashboardLinkGroup,
  DashboardLinkIcon,
} from "@/features/dashboard-links/lib/dashboard-links";
import {
  getDashboardLinkGroup,
  recommendDashboardLinks,
  USTC_DASHBOARD_LINKS,
} from "@/features/dashboard-links/lib/dashboard-links";
import {
  buildUserCalendarFeedPath,
  ensureUserCalendarFeedToken,
} from "@/lib/calendar-feed-token";
import { selectCurrentSemesterFromList } from "@/lib/current-semester";
import { prisma as basePrisma, getPrisma } from "@/lib/db/prisma";
import {
  createWeekDayFormatter,
  getWeekStartSunday,
} from "@/shared/lib/date-utils";
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
  /** Calendar tab: show semester/month/week grid for this semester (any known term). */
  calendarSemesterId?: number;
};

export type DashboardNavStats = {
  user: { id: string; name: string | null; username: string | null };
  pendingHomeworksCount: number;
  highlightPendingHomeworks: boolean;
  examsCount: number;
  pendingTodosCount: number;
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
  const nowHHmm = referenceNow.hour() * 100 + referenceNow.minute();

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

  // Always count pending todos regardless of section subscriptions
  const pendingTodosCount = await basePrisma.todo.count({
    where: { userId, completed: false },
  });

  if (sectionIds.length === 0) {
    return {
      user: { id: user.id, name: user.name, username: user.username },
      pendingHomeworksCount: 0,
      highlightPendingHomeworks: false,
      examsCount: 0,
      pendingTodosCount,
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
      where: {
        sectionId: { in: sectionIds },
        OR: [
          // Unknown exam date is treated as "upcoming" to match exams tab default filter.
          { examDate: null },
          // Any date after today is upcoming.
          { examDate: { gte: tomorrowStart.toDate() } },
          // For today's exams, compare against exam end/start time.
          {
            AND: [
              {
                examDate: {
                  gte: todayStart.toDate(),
                  lt: tomorrowStart.toDate(),
                },
              },
              {
                OR: [
                  // If no time is provided, treat it as end-of-day (still upcoming for today).
                  { endTime: null, startTime: null },
                  // Prefer endTime when available.
                  { endTime: { gte: nowHHmm } },
                  // Fallback to startTime when endTime is missing.
                  { endTime: null, startTime: { gte: nowHHmm } },
                ],
              },
            ],
          },
        ],
      },
    }),
  ]);

  return {
    user: { id: user.id, name: user.name, username: user.username },
    pendingHomeworksCount,
    highlightPendingHomeworks: dueTodayCount > 0,
    examsCount,
    pendingTodosCount,
  };
}

/** Lowercase pinyin (no tones, no spaces) for client-side search and IME. */
function toSearchPinyin(text: string): string {
  if (!text.trim()) return "";
  return pinyin(text, { toneType: "none" }).replace(/\s+/g, "").toLowerCase();
}

export type DashboardLinkSummary = {
  slug: string;
  title: string;
  url: string;
  description: string;
  /** Pinyin of title for search (lowercase, no spaces). */
  titlePinyin: string;
  /** Pinyin of description for search (lowercase, no spaces). */
  descriptionPinyin: string;
  icon: DashboardLinkIcon;
  group: DashboardLinkGroup;
  isPinned: boolean;
  clickCount: number;
};

function toDashboardLinkSummary(
  link: (typeof USTC_DASHBOARD_LINKS)[number],
  clickStats: Record<string, number>,
  pinnedSlugSet: Set<string>,
): DashboardLinkSummary {
  return {
    ...link,
    titlePinyin: toSearchPinyin(link.title),
    descriptionPinyin: toSearchPinyin(link.description),
    group: getDashboardLinkGroup(link.slug),
    isPinned: pinnedSlugSet.has(link.slug),
    clickCount: clickStats[link.slug] ?? 0,
  };
}

export type CalendarTodoItem = {
  id: string;
  title: string;
  dueAt: string;
  priority: "low" | "medium" | "high";
  content: string | null;
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
  /** Incomplete todos with due date within active calendar semester */
  semesterTodos: CalendarTodoItem[];
  /** Semesters (chronological) that have ≥1 subscribed section */
  calendarSemesterPicker: { id: number; nameCn: string }[];
  /** All semesters by start date; calendar semester prev/next uses this list */
  calendarSemesterNavList: { id: number; nameCn: string }[];
  /** Semester id used for calendar grids (may differ via calendarSemester query) */
  activeCalendarSemesterId: number | null;
  /** Current academic semester id (omit calendarSemester in URL when equal) */
  defaultCalendarSemesterId: number | null;
  activeCalendarSemesterName: string | null;
  dashboardLinks: DashboardLinkSummary[];
  recommendedLinks: DashboardLinkSummary[];
  pinnedLinks: DashboardLinkSummary[];
  overviewLinks: DashboardLinkSummary[];
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
                teachers: true,
              },
              orderBy: [{ date: "asc" }, { startTime: "asc" }],
            },
            exams: {
              orderBy: { examDate: "asc" },
              include: { examRooms: true },
            },
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

  const subscribedSemesterIds = new Set(
    allSections
      .map((s) => s.semester?.id)
      .filter((id): id is number => id != null),
  );
  const calendarSemesterPicker = semesters
    .filter((sem) => subscribedSemesterIds.has(sem.id))
    .sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf())
    .map((s) => ({ id: s.id, nameCn: s.nameCn ?? "—" }));

  const calendarSemesterNavList = semesters.map((s) => ({
    id: s.id,
    nameCn: s.nameCn ?? "—",
  }));

  const calendarSemesterFromUrlValid =
    options.calendarSemesterId != null &&
    semesters.some((s) => s.id === options.calendarSemesterId);

  const gridSemesterRow =
    calendarSemesterFromUrlValid && options.calendarSemesterId != null
      ? (semesters.find((s) => s.id === options.calendarSemesterId) ?? null)
      : currentSemester && semesters.some((s) => s.id === currentSemester.id)
        ? (semesters.find((s) => s.id === currentSemester.id) ?? null)
        : null;

  const sectionsForCalendarGrid = gridSemesterRow
    ? allSections.filter((s) => s.semester?.id === gridSemesterRow.id)
    : [];

  const homeworkSectionIds =
    calendarSemesterFromUrlValid && options.calendarSemesterId != null
      ? sectionsForCalendarGrid.length > 0
        ? sectionsForCalendarGrid.map((s) => s.id)
        : []
      : dashboardSectionIds;

  const homeworks: HomeworkWithSection[] = homeworkSectionIds.length
    ? await prisma.homework.findMany({
        where: { sectionId: { in: homeworkSectionIds }, deletedAt: null },
        include: {
          description: { select: { content: true } },
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
    gridSemesterRow?.startDate != null
      ? dayjs(gridSemesterRow.startDate).startOf("day")
      : null;
  const semesterEnd =
    gridSemesterRow?.endDate != null
      ? dayjs(gridSemesterRow.endDate).endOf("day")
      : null;
  const semesterWeeks =
    semesterStart && semesterEnd && !semesterStart.isAfter(semesterEnd)
      ? getSemesterWeeks(semesterStart, semesterEnd)
      : [];
  const allSessions = sortSessionsByStart(
    buildSessions(sectionsForCalendarGrid),
  );
  const allExams = buildExams(sectionsForCalendarGrid);
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

  const semesterTodoRows =
    semesterStart && semesterEnd
      ? await basePrisma.todo.findMany({
          where: {
            userId,
            completed: false,
            dueAt: {
              not: null,
              gte: semesterStart.toDate(),
              lte: semesterEnd.endOf("day").toDate(),
            },
          },
          orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            dueAt: true,
            priority: true,
            content: true,
          },
        })
      : [];

  const semesterTodos: CalendarTodoItem[] = semesterTodoRows.flatMap((row) =>
    row.dueAt
      ? [
          {
            id: row.id,
            title: row.title,
            dueAt: row.dueAt.toISOString(),
            priority: row.priority as "low" | "medium" | "high",
            content: row.content ?? null,
          },
        ]
      : [],
  );

  const defaultCalendarSemesterId = currentSemester?.id ?? null;
  const activeCalendarSemesterId = gridSemesterRow?.id ?? null;
  const activeCalendarSemesterName = gridSemesterRow?.nameCn ?? null;

  const [clickRows, pinRows] = await Promise.all([
    basePrisma.dashboardLinkClick.findMany({
      where: { userId },
      select: { slug: true, count: true },
    }),
    basePrisma.dashboardLinkPin.findMany({
      where: { userId },
      select: { slug: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const clickStats: Record<string, number> = Object.fromEntries(
    clickRows.map((row) => [row.slug, row.count]),
  );
  const pinnedSlugSet = new Set(pinRows.map((row) => row.slug));

  const dashboardLinks = USTC_DASHBOARD_LINKS.map((link) =>
    toDashboardLinkSummary(link, clickStats, pinnedSlugSet),
  );
  const dashboardLinkBySlug = new Map(
    dashboardLinks.map((link) => [link.slug, link] as const),
  );
  const pinnedLinks = pinRows.flatMap((row) => {
    const link = dashboardLinkBySlug.get(row.slug);
    return link ? [link] : [];
  });
  const recommendedLinks = recommendDashboardLinks(clickStats, {
    limit: USTC_DASHBOARD_LINKS.length,
    excludeSlugs: Array.from(pinnedSlugSet),
  }).map((link) => toDashboardLinkSummary(link, clickStats, pinnedSlugSet));
  const overviewLinks = [...pinnedLinks, ...recommendedLinks].slice(0, 5);

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
    semesterTodos,
    calendarSemesterPicker,
    calendarSemesterNavList,
    activeCalendarSemesterId,
    defaultCalendarSemesterId,
    activeCalendarSemesterName,
    dashboardLinks,
    recommendedLinks,
    pinnedLinks,
    overviewLinks,
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
      ? buildUserCalendarFeedPath(user.id, calendarFeedToken)
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

export async function getCalendarSubscriptionUrl(userId: string) {
  const user = await basePrisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return null;

  const token = await ensureUserCalendarFeedToken(user.id);
  return token ? buildUserCalendarFeedPath(user.id, token) : null;
}

export type SubscriptionsTabData = Awaited<
  ReturnType<typeof getSubscriptionsTabData>
>;

export type TodoItem = {
  id: string;
  title: string;
  content: string | null;
  completed: boolean;
  priority: "low" | "medium" | "high";
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getTodosTabData(userId: string): Promise<TodoItem[]> {
  const todos = await basePrisma.todo.findMany({
    where: { userId },
    orderBy: [{ completed: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
  });

  return todos.map((todo) => ({
    id: todo.id,
    title: todo.title,
    content: todo.content ?? null,
    completed: todo.completed,
    priority: todo.priority as "low" | "medium" | "high",
    dueAt: todo.dueAt?.toISOString() ?? null,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  }));
}
