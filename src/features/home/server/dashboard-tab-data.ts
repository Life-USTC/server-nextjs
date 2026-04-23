import { getLocale } from "next-intl/server";
import { getBusTimetableData } from "@/features/bus/lib/bus-service";
import type { BusLocale, BusTimetableData } from "@/features/bus/lib/bus-types";
import type { TodoPriority } from "@/generated/prisma/client";
import {
  buildUserCalendarFeedPath,
  ensureUserCalendarFeedToken,
} from "@/lib/calendar-feed-token";
import { selectCurrentSemesterFromList } from "@/lib/current-semester";
import { prisma as basePrisma, getPrisma } from "@/lib/db/prisma";
import { toShanghaiIsoString } from "@/lib/time/serialize-date-output";
import { shanghaiDayjs } from "@/lib/time/shanghai-dayjs";
import { getSubscribedSectionIds } from "./subscribed-data";

export type BusDashboardData = {
  data: BusTimetableData | null;
};

export async function getBusTabData(userId: string): Promise<BusDashboardData> {
  const locale = await getLocale();
  const referenceNow = shanghaiDayjs();
  const busLocale: BusLocale = locale === "en-us" ? "en-us" : "zh-cn";

  return {
    data: await getBusTimetableData({
      locale: busLocale,
      userId,
      now: referenceNow.toISOString(),
    }),
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
  const sectionIds = await getSubscribedSectionIds(userId);

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
            ? toShanghaiIsoString(section.semester.startDate)
            : null,
          semesterEnd: section.semester?.endDate
            ? toShanghaiIsoString(section.semester.endDate)
            : null,
        }))
      : [];

  const homeworks =
    sectionIds.length > 0
      ? await localizedPrisma.homework.findMany({
          where: { sectionId: { in: sectionIds }, deletedAt: null },
          select: {
            id: true,
            title: true,
            isMajor: true,
            requiresTeam: true,
            publishedAt: true,
            submissionStartAt: true,
            submissionDueAt: true,
            createdAt: true,
            description: { select: { content: true } },
            homeworkCompletions: {
              where: { userId },
              select: { completedAt: true },
            },
            section: {
              select: {
                jwId: true,
                code: true,
                course: { select: { namePrimary: true } },
                semester: { select: { nameCn: true } },
              },
            },
          },
          orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
        })
      : [];

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

  return { homeworkSummaries, sections: subscribedSections };
}

export async function getSubscriptionsTabData(userId: string) {
  const locale = await getLocale();
  const localizedPrisma = getPrisma(locale);

  const [user, semesters] = await Promise.all([
    localizedPrisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        subscribedSections: {
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
        },
      },
    }),
    localizedPrisma.semester.findMany({
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
  priority: TodoPriority;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getTodosTabData(userId: string): Promise<TodoItem[]> {
  const todos = await basePrisma.todo.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      content: true,
      completed: true,
      priority: true,
      dueAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ completed: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
  });

  return todos.map((todo) => ({
    id: todo.id,
    title: todo.title,
    content: todo.content ?? null,
    completed: todo.completed,
    priority: todo.priority,
    dueAt: todo.dueAt ? toShanghaiIsoString(todo.dueAt) : null,
    createdAt: toShanghaiIsoString(todo.createdAt),
    updatedAt: toShanghaiIsoString(todo.updatedAt),
  }));
}
