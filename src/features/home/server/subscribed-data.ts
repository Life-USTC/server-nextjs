import type { Prisma } from "@/generated/prisma/client";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { getPrisma, prisma } from "@/lib/db/prisma";

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

async function resolveSubscribedSectionIds(
  userId: string,
  sectionIds?: readonly number[],
) {
  return sectionIds
    ? Array.from(sectionIds)
    : await getSubscribedSectionIds(userId);
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
