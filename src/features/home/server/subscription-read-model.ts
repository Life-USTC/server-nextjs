import type { Prisma } from "@/generated/prisma/client";
import { DEFAULT_LOCALE } from "@/i18n/config";
import {
  buildUserCalendarFeedPath,
  ensureUserCalendarFeedToken,
} from "@/lib/calendar-feed-token";
import { selectCurrentSemesterFromList } from "@/lib/current-semester";
import { getPrisma, prisma } from "@/lib/db/prisma";
import { sectionCompactInclude } from "@/lib/query-helpers";
import { getPublicOrigin } from "@/lib/site-url";
import { toShanghaiIsoString } from "@/lib/time/serialize-date-output";
import type { SectionWithRelations } from "./dashboard-types";

export const SECTION_SUBSCRIPTION_NOTE =
  "Life@USTC section subscriptions only affect your dashboard and calendar here. They are not official USTC course enrollment.";

const userSectionSubscriptionSelect = {
  id: true,
  calendarFeedToken: true,
  subscribedSections: {
    select: { id: true, jwId: true },
  },
} satisfies Prisma.UserSelect;

type UserSectionSubscriptionRecord = Prisma.UserGetPayload<{
  select: typeof userSectionSubscriptionSelect;
}>;

export interface UserSectionSubscriptionState {
  userId: string;
  subscriptionIcsUrl: string;
  subscribedSections: number[];
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

async function getUserSectionSubscriptionRecord(
  userId: string,
): Promise<UserSectionSubscriptionRecord | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: userSectionSubscriptionSelect,
  });
}

function getSubscribedSectionIdsFromRecord(
  user: Pick<UserSectionSubscriptionRecord, "subscribedSections">,
) {
  return user.subscribedSections.map(({ id }) => id);
}

async function buildCalendarFeedPath(
  userId: string,
  calendarFeedToken: string | null,
) {
  const token =
    calendarFeedToken ?? (await ensureUserCalendarFeedToken(userId));
  return buildUserCalendarFeedPath(userId, token);
}

async function resolveSubscribedSectionIds(
  userId: string,
  sectionIds?: readonly number[],
) {
  return sectionIds
    ? Array.from(sectionIds)
    : await getSubscribedSectionIds(userId);
}

export async function getSubscribedSectionIds(
  userId: string,
): Promise<number[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscribedSections: {
        select: { id: true },
      },
    },
  });

  return user?.subscribedSections.map((section) => section.id) ?? [];
}

export async function getUserSectionSubscriptionState(
  userId: string,
): Promise<UserSectionSubscriptionState | null> {
  const user = await getUserSectionSubscriptionRecord(userId);
  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    subscriptionIcsUrl: await buildCalendarFeedPath(
      user.id,
      user.calendarFeedToken,
    ),
    subscribedSections: getSubscribedSectionIdsFromRecord(user),
  };
}

export async function getUserCalendarSubscription(
  userId: string,
  locale = DEFAULT_LOCALE,
) {
  const localizedPrisma = getPrisma(locale);
  const user = await localizedPrisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      calendarFeedToken: true,
      subscribedSections: {
        include: sectionCompactInclude,
        orderBy: [{ semester: { jwId: "desc" } }, { code: "asc" }],
      },
    },
  });

  if (!user) {
    return null;
  }

  const calendarPath = await buildCalendarFeedPath(
    user.id,
    user.calendarFeedToken,
  );

  return {
    userId: user.id,
    sections: user.subscribedSections,
    calendarPath,
    calendarUrl: `${getPublicOrigin()}${calendarPath}`,
    note: SECTION_SUBSCRIPTION_NOTE,
  };
}

export async function getCalendarSubscriptionUrl(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, calendarFeedToken: true },
  });
  if (!user) {
    return null;
  }

  return buildCalendarFeedPath(user.id, user.calendarFeedToken);
}

async function listSubscribedSectionOptions(
  userId: string,
  locale = DEFAULT_LOCALE,
): Promise<SectionOption[]> {
  const localizedPrisma = getPrisma(locale);
  const sectionIds = await getSubscribedSectionIds(userId);
  if (sectionIds.length === 0) {
    return [];
  }

  const sections = await localizedPrisma.section.findMany({
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
  });

  return sections.map((section) => ({
    id: section.id,
    jwId: section.jwId,
    code: section.code,
    courseName: section.course?.namePrimary ?? null,
    semesterName: section.semester?.nameCn ?? null,
    semesterStart: section.semester?.startDate
      ? toShanghaiIsoString(section.semester.startDate)
      : null,
    semesterEnd: section.semester?.endDate
      ? toShanghaiIsoString(section.semester.endDate)
      : null,
  }));
}

export async function getHomeworksTabData(
  userId: string,
  locale = DEFAULT_LOCALE,
) {
  const [sections, homeworks] = await Promise.all([
    listSubscribedSectionOptions(userId, locale),
    listSubscribedHomeworks(userId, { locale }),
  ]);

  const homeworkSummaries: HomeworkSummaryItem[] = homeworks.map(
    (homework) => ({
      id: homework.id,
      title: homework.title,
      isMajor: homework.isMajor,
      requiresTeam: homework.requiresTeam,
      publishedAt: homework.publishedAt
        ? toShanghaiIsoString(homework.publishedAt)
        : null,
      submissionStartAt: homework.submissionStartAt
        ? toShanghaiIsoString(homework.submissionStartAt)
        : null,
      submissionDueAt: homework.submissionDueAt
        ? toShanghaiIsoString(homework.submissionDueAt)
        : null,
      createdAt: toShanghaiIsoString(homework.createdAt),
      description: homework.description?.content ?? null,
      completion: homework.homeworkCompletions[0]
        ? {
            completedAt: toShanghaiIsoString(
              homework.homeworkCompletions[0].completedAt,
            ),
          }
        : null,
      section: homework.section
        ? {
            jwId: homework.section.jwId ?? null,
            code: homework.section.code ?? null,
            courseName: homework.section.course?.namePrimary ?? null,
            semesterName: homework.section.semester?.nameCn ?? null,
          }
        : null,
    }),
  );

  return { homeworkSummaries, sections };
}

async function listSubscribedSectionsForSubscriptionsTab(
  userId: string,
  locale = DEFAULT_LOCALE,
) {
  const localizedPrisma = getPrisma(locale);
  const sectionIds = await getSubscribedSectionIds(userId);
  if (sectionIds.length === 0) {
    return [];
  }

  return localizedPrisma.section.findMany({
    where: { id: { in: sectionIds } },
    select: {
      id: true,
      jwId: true,
      code: true,
      credits: true,
      course: { select: { namePrimary: true } },
      semester: { select: { id: true, nameCn: true, startDate: true } },
      teachers: { select: { namePrimary: true } },
      exams: {
        select: {
          id: true,
          examDate: true,
          startTime: true,
          endTime: true,
          examMode: true,
          examRooms: { select: { room: true, count: true } },
        },
        orderBy: [{ examDate: "asc" }],
      },
    },
    orderBy: [{ semester: { jwId: "desc" } }, { code: "asc" }],
  });
}

export async function getSubscriptionsTabData(
  userId: string,
  locale = DEFAULT_LOCALE,
) {
  const localizedPrisma = getPrisma(locale);
  const [sections, semesters, calendarSubscriptionUrl] = await Promise.all([
    listSubscribedSectionsForSubscriptionsTab(userId, locale),
    localizedPrisma.semester.findMany({
      select: { id: true, nameCn: true, startDate: true, endDate: true },
      orderBy: { startDate: "asc" },
    }),
    getCalendarSubscriptionUrl(userId),
  ]);

  return {
    subscriptions:
      sections.length > 0
        ? [
            {
              id: userId,
              sections,
            },
          ]
        : [],
    semesters,
    currentSemesterId:
      selectCurrentSemesterFromList(semesters, new Date())?.id ?? null,
    userId,
    calendarSubscriptionUrl,
  };
}

export type SubscriptionsTabData = Awaited<
  ReturnType<typeof getSubscriptionsTabData>
>;

export async function listSubscribedDashboardSections(
  userId: string,
  {
    locale = DEFAULT_LOCALE,
    dateFrom,
    dateTo,
  }: {
    locale?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {},
): Promise<SectionWithRelations[]> {
  const localizedPrisma = getPrisma(locale);
  const sectionIds = await getSubscribedSectionIds(userId);
  if (sectionIds.length === 0) {
    return [];
  }

  return localizedPrisma.section.findMany({
    where: { id: { in: sectionIds } },
    select: {
      id: true,
      jwId: true,
      course: { select: { namePrimary: true } },
      semester: { select: { id: true } },
      schedules: {
        where:
          dateFrom || dateTo
            ? {
                date: {
                  ...(dateFrom ? { gte: dateFrom } : {}),
                  ...(dateTo ? { lte: dateTo } : {}),
                },
              }
            : undefined,
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          customPlace: true,
          room: {
            select: {
              namePrimary: true,
              building: {
                select: {
                  namePrimary: true,
                  campus: { select: { namePrimary: true } },
                },
              },
            },
          },
          teachers: { select: { namePrimary: true } },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      },
      exams: {
        select: {
          id: true,
          examDate: true,
          startTime: true,
          endTime: true,
          examType: true,
          examTakeCount: true,
          examMode: true,
          examRooms: { select: { room: true, count: true } },
        },
        orderBy: { examDate: "asc" },
      },
    },
    orderBy: [{ semester: { jwId: "desc" } }, { code: "asc" }],
  });
}

function buildSubscribedHomeworkInclude(
  userId: string,
  includeEditors: boolean,
) {
  return {
    section: {
      include: {
        course: true,
        semester: true,
      },
    },
    description: true,
    homeworkCompletions: {
      where: { userId },
      select: { completedAt: true },
    },
    ...(includeEditors
      ? {
          createdBy: {
            select: { id: true, name: true, username: true, image: true },
          },
          updatedBy: {
            select: { id: true, name: true, username: true, image: true },
          },
          deletedBy: {
            select: { id: true, name: true, username: true, image: true },
          },
        }
      : {}),
  } satisfies Prisma.HomeworkInclude;
}

export async function listSubscribedHomeworks(
  userId: string,
  {
    locale = DEFAULT_LOCALE,
    completed,
    includeDeleted = false,
    includeEditors = false,
    limit,
    dueAtFrom,
    dueAtTo,
    requireDueDate = false,
    sectionIds,
  }: {
    locale?: string;
    completed?: boolean;
    includeDeleted?: boolean;
    includeEditors?: boolean;
    limit?: number;
    dueAtFrom?: Date;
    dueAtTo?: Date;
    requireDueDate?: boolean;
    sectionIds?: readonly number[];
  } = {},
) {
  const scopedSectionIds = await resolveSubscribedSectionIds(
    userId,
    sectionIds,
  );
  if (scopedSectionIds.length === 0) {
    return [];
  }

  const localizedPrisma = getPrisma(locale);
  return localizedPrisma.homework.findMany({
    where: {
      sectionId: { in: scopedSectionIds },
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(completed === undefined
        ? {}
        : completed
          ? { homeworkCompletions: { some: { userId } } }
          : { homeworkCompletions: { none: { userId } } }),
      ...(requireDueDate ? { submissionDueAt: { not: null } } : {}),
      ...(dueAtFrom || dueAtTo
        ? {
            submissionDueAt: {
              ...(requireDueDate ? { not: null } : {}),
              ...(dueAtFrom ? { gte: dueAtFrom } : {}),
              ...(dueAtTo ? { lte: dueAtTo } : {}),
            },
          }
        : {}),
    },
    include: buildSubscribedHomeworkInclude(userId, includeEditors),
    orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
    ...(limit ? { take: limit } : {}),
  });
}

export async function listSubscribedHomeworkAuditLogs(
  userId: string,
  limit = 50,
  sectionIds?: readonly number[],
) {
  const scopedSectionIds = await resolveSubscribedSectionIds(
    userId,
    sectionIds,
  );
  if (scopedSectionIds.length === 0) {
    return [];
  }

  return prisma.homeworkAuditLog.findMany({
    where: { sectionId: { in: scopedSectionIds } },
    include: {
      actor: {
        select: { id: true, name: true, username: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getHomeworkCommentCounts(homeworkIds: string[]) {
  if (homeworkIds.length === 0) {
    return new Map<string, number>();
  }

  const commentCountRows = await prisma.comment.groupBy({
    by: ["homeworkId"],
    where: {
      homeworkId: { in: homeworkIds },
      status: { not: "deleted" },
    },
    _count: { _all: true },
  });

  return new Map(
    commentCountRows.flatMap((row) =>
      row.homeworkId ? [[row.homeworkId, row._count._all] as const] : [],
    ),
  );
}

export async function listSubscribedSchedules(
  userId: string,
  {
    locale = DEFAULT_LOCALE,
    dateFrom,
    dateTo,
    weekday,
    limit,
    sectionIds,
  }: {
    locale?: string;
    dateFrom?: Date;
    dateTo?: Date;
    weekday?: number;
    limit?: number;
    sectionIds?: readonly number[];
  } = {},
) {
  const scopedSectionIds = await resolveSubscribedSectionIds(
    userId,
    sectionIds,
  );
  if (scopedSectionIds.length === 0) {
    return [];
  }

  const localizedPrisma = getPrisma(locale);
  return localizedPrisma.schedule.findMany({
    where: {
      sectionId: { in: scopedSectionIds },
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
      ...(weekday ? { weekday } : {}),
    },
    include: {
      room: {
        include: {
          building: {
            include: {
              campus: true,
            },
          },
          roomType: true,
        },
      },
      teachers: {
        include: {
          department: true,
        },
      },
      section: {
        include: {
          course: true,
          semester: true,
        },
      },
      scheduleGroup: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    ...(limit ? { take: limit } : {}),
  });
}

export async function listSubscribedExams(
  userId: string,
  {
    locale = DEFAULT_LOCALE,
    dateFrom,
    dateTo,
    includeDateUnknown = true,
    limit,
    sectionIds,
  }: {
    locale?: string;
    dateFrom?: Date;
    dateTo?: Date;
    includeDateUnknown?: boolean;
    limit?: number;
    sectionIds?: readonly number[];
  } = {},
) {
  const scopedSectionIds = await resolveSubscribedSectionIds(
    userId,
    sectionIds,
  );
  if (scopedSectionIds.length === 0) {
    return [];
  }

  const localizedPrisma = getPrisma(locale);
  return localizedPrisma.exam.findMany({
    where: {
      sectionId: { in: scopedSectionIds },
      ...(dateFrom || dateTo
        ? {
            OR: [
              {
                examDate: {
                  ...(dateFrom ? { gte: dateFrom } : {}),
                  ...(dateTo ? { lte: dateTo } : {}),
                },
              },
              ...(includeDateUnknown ? [{ examDate: null }] : []),
            ],
          }
        : includeDateUnknown
          ? {}
          : { examDate: { not: null } }),
    },
    include: {
      examBatch: true,
      examRooms: true,
      section: {
        include: {
          course: true,
          semester: true,
        },
      },
    },
    orderBy: [{ examDate: "asc" }, { startTime: "asc" }, { jwId: "asc" }],
    ...(limit ? { take: limit } : {}),
  });
}
