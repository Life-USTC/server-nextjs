import { DEFAULT_LOCALE } from "@/i18n/config";
import { prisma } from "@/lib/db/prisma";
import { toShanghaiIsoString } from "@/lib/time/serialize-date-output";
import { formatShanghaiDate } from "@/lib/time/shanghai-format";
import {
  getSubscribedSectionIds,
  listSubscribedExams,
  listSubscribedHomeworks,
  listSubscribedSchedules,
} from "./subscribed-data";

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
  const windowStart = dateFrom ?? startOfShanghaiDay(new Date());
  const windowEnd =
    dateTo ?? new Date(windowStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sectionIds = await getSubscribedSectionIds(userId);

  const [schedules, homeworks, exams] = await Promise.all([
    listSubscribedSchedules(userId, {
      locale,
      dateFrom: windowStart,
      dateTo: windowEnd,
      sectionIds,
    }),
    listSubscribedHomeworks(userId, {
      locale,
      completed: false,
      dueAtFrom: windowStart,
      dueAtTo: windowEnd,
      sectionIds,
    }),
    listSubscribedExams(userId, {
      locale,
      dateFrom: windowStart,
      dateTo: windowEnd,
      includeDateUnknown: false,
      sectionIds,
    }),
  ]);

  const todos = await prisma.todo.findMany({
    where: {
      userId,
      completed: false,
      dueAt: { gte: windowStart, lt: windowEnd },
    },
    select: {
      id: true,
      title: true,
      content: true,
      dueAt: true,
      priority: true,
      completed: true,
      createdAt: true,
      updatedAt: true,
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
