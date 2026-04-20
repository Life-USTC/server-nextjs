import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listUserCalendarEvents } from "@/features/home/server/calendar-events";
import { DEFAULT_LOCALE, localeSchema } from "@/i18n/config";
import { getPrisma, prisma } from "@/lib/db/prisma";
import {
  dateTimeSchema,
  getSubscribedSectionIds,
  getTodayBounds,
  getUserId,
  getViewerInfo,
  jsonToolResult,
  mcpModeInputSchema,
  parseRequiredDateInput,
  resolveMcpMode,
} from "@/lib/mcp/tools/_helpers";
import { toShanghaiIsoString } from "@/lib/time/serialize-date-output";

export function registerMyDataTools(server: McpServer) {
  server.registerTool(
    "list_my_homeworks",
    {
      description:
        "List homeworks across the authenticated user's subscribed sections.",
      inputSchema: {
        completed: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).default(100),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ completed, limit, locale, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const sectionIds = await getSubscribedSectionIds(userId);
      if (sectionIds.length === 0) {
        return jsonToolResult({ homeworks: [] }, { mode: resolvedMode });
      }

      const localizedPrisma = getPrisma(locale);
      const homeworks = await localizedPrisma.homework.findMany({
        where: {
          deletedAt: null,
          sectionId: { in: sectionIds },
          ...(completed === undefined
            ? {}
            : completed
              ? { homeworkCompletions: { some: { userId } } }
              : { homeworkCompletions: { none: { userId } } }),
        },
        include: {
          description: {
            select: { content: true },
          },
          homeworkCompletions: {
            where: { userId },
            select: { completedAt: true },
          },
          section: {
            include: {
              course: true,
              semester: true,
            },
          },
        },
        orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
        take: limit,
      });

      return jsonToolResult({ homeworks }, { mode: resolvedMode });
    },
  );

  server.registerTool(
    "set_my_homework_completion",
    {
      description:
        "Mark a homework as completed or incomplete for the authenticated user.",
      inputSchema: {
        homeworkId: z.string().trim().min(1),
        completed: z.boolean(),
        mode: mcpModeInputSchema,
      },
    },
    async ({ homeworkId, completed, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const homework = await prisma.homework.findUnique({
        where: { id: homeworkId },
        select: { id: true, deletedAt: true },
      });

      if (!homework || homework.deletedAt) {
        return jsonToolResult({
          success: false,
          message: "Homework not found",
        });
      }

      if (completed) {
        const record = await prisma.homeworkCompletion.upsert({
          where: { userId_homeworkId: { userId, homeworkId } },
          update: { completedAt: new Date() },
          create: { userId, homeworkId },
        });

        return jsonToolResult(
          {
            success: true,
            completion: {
              homeworkId,
              completed: true,
              completedAt: record.completedAt,
            },
          },
          { mode: resolvedMode },
        );
      }

      await prisma.homeworkCompletion.deleteMany({
        where: { userId, homeworkId },
      });

      return jsonToolResult(
        {
          success: true,
          completion: {
            homeworkId,
            completed: false,
            completedAt: null,
          },
        },
        { mode: resolvedMode },
      );
    },
  );

  server.registerTool(
    "list_my_schedules",
    {
      description:
        "List schedules across the authenticated user's subscribed sections.",
      inputSchema: {
        dateFrom: dateTimeSchema.optional(),
        dateTo: dateTimeSchema.optional(),
        weekday: z.number().int().min(1).max(7).optional(),
        limit: z.number().int().min(1).max(300).default(150),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ dateFrom, dateTo, weekday, limit, locale, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const sectionIds = await getSubscribedSectionIds(userId);
      if (sectionIds.length === 0) {
        return jsonToolResult({ schedules: [] }, { mode: resolvedMode });
      }

      const localizedPrisma = getPrisma(locale);
      const schedules = await localizedPrisma.schedule.findMany({
        where: {
          sectionId: { in: sectionIds },
          ...(dateFrom || dateTo
            ? {
                date: {
                  ...(dateFrom
                    ? { gte: parseRequiredDateInput(dateFrom) }
                    : {}),
                  ...(dateTo ? { lte: parseRequiredDateInput(dateTo) } : {}),
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
        take: limit,
      });

      return jsonToolResult({ schedules }, { mode: resolvedMode });
    },
  );

  server.registerTool(
    "list_my_exams",
    {
      description:
        "List exams across the authenticated user's subscribed sections.",
      inputSchema: {
        dateFrom: dateTimeSchema.optional(),
        dateTo: dateTimeSchema.optional(),
        includeDateUnknown: z.boolean().default(true),
        limit: z.number().int().min(1).max(300).default(150),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async (
      { dateFrom, dateTo, includeDateUnknown, limit, locale, mode },
      extra,
    ) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const sectionIds = await getSubscribedSectionIds(userId);
      if (sectionIds.length === 0) {
        return jsonToolResult({ exams: [] }, { mode: resolvedMode });
      }

      const localizedPrisma = getPrisma(locale);
      const exams = await localizedPrisma.exam.findMany({
        where: {
          sectionId: { in: sectionIds },
          ...(dateFrom || dateTo
            ? {
                OR: [
                  {
                    examDate: {
                      ...(dateFrom
                        ? { gte: parseRequiredDateInput(dateFrom) }
                        : {}),
                      ...(dateTo
                        ? { lte: parseRequiredDateInput(dateTo) }
                        : {}),
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
        take: limit,
      });

      return jsonToolResult({ exams }, { mode: resolvedMode });
    },
  );

  server.registerTool(
    "get_my_overview",
    {
      description:
        "Get an overview of todos, homeworks, schedules and exams for the authenticated user.",
      inputSchema: {
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ locale, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const user = await getViewerInfo(userId);
      const sectionIds = await getSubscribedSectionIds(userId);
      const { now, todayStart, tomorrowStart } = getTodayBounds();

      const localizedPrisma = getPrisma(locale);
      // Prisma's pg adapter currently emits a driver deprecation warning when
      // a single request fans out multiple queries concurrently.
      const pendingTodosCount = await prisma.todo.count({
        where: {
          userId,
          completed: false,
        },
      });
      const pendingHomeworksCount =
        sectionIds.length > 0
          ? await prisma.homework.count({
              where: {
                deletedAt: null,
                sectionId: { in: sectionIds },
                homeworkCompletions: { none: { userId } },
              },
            })
          : 0;
      const todaySchedulesCount =
        sectionIds.length > 0
          ? await prisma.schedule.count({
              where: {
                sectionId: { in: sectionIds },
                date: {
                  gte: todayStart,
                  lt: tomorrowStart,
                },
              },
            })
          : 0;
      const upcomingExamsCount =
        sectionIds.length > 0
          ? await prisma.exam.count({
              where: {
                sectionId: { in: sectionIds },
                examDate: { gte: todayStart },
              },
            })
          : 0;
      const dueTodos = await prisma.todo.findMany({
        where: {
          userId,
          completed: false,
          dueAt: { not: null },
        },
        select: {
          id: true,
          title: true,
          priority: true,
          dueAt: true,
          createdAt: true,
        },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        take: 5,
      });
      const dueHomeworks =
        sectionIds.length > 0
          ? await localizedPrisma.homework.findMany({
              where: {
                deletedAt: null,
                sectionId: { in: sectionIds },
                homeworkCompletions: { none: { userId } },
                submissionDueAt: { not: null },
              },
              include: {
                section: {
                  include: {
                    course: true,
                  },
                },
              },
              orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
              take: 5,
            })
          : [];
      const upcomingExams =
        sectionIds.length > 0
          ? await localizedPrisma.exam.findMany({
              where: {
                sectionId: { in: sectionIds },
                examDate: { gte: now },
              },
              include: {
                section: {
                  include: {
                    course: true,
                  },
                },
                examBatch: true,
                examRooms: true,
              },
              orderBy: [{ examDate: "asc" }, { startTime: "asc" }],
              take: 5,
            })
          : [];

      return jsonToolResult(
        {
          user: {
            id: user.id,
            name: user.name,
            image: user.image,
            isAdmin: user.isAdmin,
          },
          overview: {
            pendingTodosCount,
            pendingHomeworksCount,
            todaySchedulesCount,
            upcomingExamsCount,
          },
          samples: {
            dueTodos,
            dueHomeworks,
            upcomingExams,
          },
        },
        { mode: resolvedMode },
      );
    },
  );

  server.registerTool(
    "get_my_7days_timeline",
    {
      description:
        "Get next-7-day timeline events from schedules, homework deadlines, exams and todos.",
      inputSchema: {
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ locale, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const { todayStart } = getTodayBounds();
      const windowEnd = new Date(todayStart);
      windowEnd.setDate(windowEnd.getDate() + 7);
      const events = await listUserCalendarEvents(userId, {
        locale,
        dateFrom: todayStart,
        dateTo: windowEnd,
      });

      return jsonToolResult(
        {
          range: {
            from: toShanghaiIsoString(todayStart),
            to: toShanghaiIsoString(windowEnd),
          },
          total: events.length,
          events,
        },
        { mode: resolvedMode },
      );
    },
  );
}
