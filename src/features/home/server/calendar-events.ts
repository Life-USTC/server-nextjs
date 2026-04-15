import { DEFAULT_LOCALE } from "@/i18n/config";
import { getPrisma, prisma } from "@/lib/db/prisma";
import { toShanghaiIsoString } from "@/lib/time/serialize-date-output";
import { formatShanghaiDate } from "@/lib/time/shanghai-format";

function startOfShanghaiDay(date: Date) {
  return new Date(`${formatShanghaiDate(date)}T00:00:00+08:00`);
}

function toDateTimeFromHHmm(baseDate: Date | null, hhmm: number | null) {
  if (!baseDate) return null;

  const hours = hhmm ? Math.trunc(hhmm / 100) : 0;
  const minutes = hhmm ? hhmm % 100 : 0;
  return new Date(
    `${formatShanghaiDate(baseDate)}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+08:00`,
  );
}

async function getSubscribedSectionIds(userId: string) {
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

export async function listUserCalendarEvents(
  userId: string,
  {
    locale = DEFAULT_LOCALE,
    dateFrom,
    dateTo,
  }: {
    locale?: string;
    dateFrom?: Date | null;
    dateTo?: Date | null;
  } = {},
) {
  const localizedPrisma = getPrisma(locale);
  const sectionIds = await getSubscribedSectionIds(userId);
  const windowStart = dateFrom ?? startOfShanghaiDay(new Date());
  const windowEnd =
    dateTo ?? new Date(windowStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const schedules =
    sectionIds.length > 0
      ? await localizedPrisma.schedule.findMany({
          where: {
            sectionId: { in: sectionIds },
            date: { gte: windowStart, lt: windowEnd },
          },
          include: {
            section: {
              include: {
                course: true,
                semester: true,
              },
            },
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
            scheduleGroup: true,
          },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
        })
      : [];

  const homeworks =
    sectionIds.length > 0
      ? await localizedPrisma.homework.findMany({
          where: {
            deletedAt: null,
            sectionId: { in: sectionIds },
            submissionDueAt: { gte: windowStart, lt: windowEnd },
            homeworkCompletions: { none: { userId } },
          },
          include: {
            description: {
              select: { content: true },
            },
            section: {
              include: {
                course: true,
                semester: true,
              },
            },
          },
          orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
        })
      : [];

  const exams =
    sectionIds.length > 0
      ? await localizedPrisma.exam.findMany({
          where: {
            sectionId: { in: sectionIds },
            examDate: { gte: windowStart, lt: windowEnd },
          },
          include: {
            section: {
              include: {
                course: true,
                semester: true,
              },
            },
            examBatch: true,
            examRooms: true,
          },
          orderBy: [{ examDate: "asc" }, { startTime: "asc" }],
        })
      : [];

  const todos = await prisma.todo.findMany({
    where: {
      userId,
      completed: false,
      dueAt: { gte: windowStart, lt: windowEnd },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  });

  return [
    ...schedules.map((schedule) => {
      const at = toDateTimeFromHHmm(schedule.date, schedule.startTime);
      return {
        type: "schedule" as const,
        at: at ? toShanghaiIsoString(at) : null,
        sortKey: at?.getTime() ?? Number.MAX_SAFE_INTEGER,
        payload: schedule,
      };
    }),
    ...homeworks.map((homework) => ({
      type: "homework_due" as const,
      at: homework.submissionDueAt
        ? toShanghaiIsoString(homework.submissionDueAt)
        : null,
      sortKey: homework.submissionDueAt?.getTime() ?? Number.MAX_SAFE_INTEGER,
      payload: homework,
    })),
    ...exams.map((exam) => {
      const at = toDateTimeFromHHmm(exam.examDate, exam.startTime);
      return {
        type: "exam" as const,
        at: at ? toShanghaiIsoString(at) : null,
        sortKey: at?.getTime() ?? Number.MAX_SAFE_INTEGER,
        payload: exam,
      };
    }),
    ...todos.map((todo) => ({
      type: "todo_due" as const,
      at: todo.dueAt ? toShanghaiIsoString(todo.dueAt) : null,
      sortKey: todo.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER,
      payload: todo,
    })),
  ]
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey: _sortKey, ...event }) => event);
}
