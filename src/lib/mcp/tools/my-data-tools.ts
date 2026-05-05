import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listUserCalendarEvents } from "@/features/home/server/calendar-events";
import {
  getSubscribedSectionIds,
  listSubscribedExams,
  listSubscribedHomeworks,
  listSubscribedSchedules,
} from "@/features/home/server/subscribed-data";
import { withHomeworkItemState } from "@/features/homeworks/server/homework-item-state";
import { prisma } from "@/lib/db/prisma";
import {
  flexDateInputSchema,
  getTodayBounds,
  getUserId,
  getViewerInfo,
  jsonToolResult,
  mcpLocaleInputSchema,
  mcpModeInputSchema,
  resolveMcpMode,
} from "@/lib/mcp/tools/_helpers";
import {
  summarizeCalendarEventCollection,
  summarizeExamCard,
  summarizeHomeworkCard,
  summarizeTodoCard,
} from "@/lib/mcp/tools/event-summary";
import { parseDateInput } from "@/lib/time/parse-date-input";
import { toShanghaiIsoString } from "@/lib/time/serialize-date-output";

export function registerMyDataTools(server: McpServer) {
  server.registerTool(
    "list_my_homeworks",
    {
      description:
        "List homeworks across your subscribed sections, including your personal completion state and comment count. " +
        "Use list_homeworks_by_section for a single section's homeworks without completion state.",
      inputSchema: {
        completed: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).default(100),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async ({ completed, limit, locale, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const homeworks = await listSubscribedHomeworks(userId, {
        locale,
        completed,
        limit,
      });
      const homeworkItems = await withHomeworkItemState(homeworks);

      return jsonToolResult(
        { homeworks: homeworkItems },
        { mode: resolvedMode },
      );
    },
  );

  server.registerTool(
    "set_my_homework_completion",
    {
      description:
        "Mark a homework as completed or incomplete. Prefer this over unset_my_homework_completion — pass completed: false to revert.",
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
    "unset_my_homework_completion",
    {
      description:
        "Revert a completed homework back to incomplete. Equivalent to set_my_homework_completion(completed: false).",
      inputSchema: {
        homeworkId: z.string().trim().min(1),
        mode: mcpModeInputSchema,
      },
    },
    async ({ homeworkId, mode }, extra) => {
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
        "List schedules across your subscribed sections. Use query_schedules for public schedules of any section without personal context.",
      inputSchema: {
        dateFrom: flexDateInputSchema.optional(),
        dateTo: flexDateInputSchema.optional(),
        weekday: z.number().int().min(1).max(7).optional(),
        limit: z.number().int().min(1).max(300).default(150),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async ({ dateFrom, dateTo, weekday, limit, locale, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const parsedDateFrom = dateFrom ? parseDateInput(dateFrom) : undefined;
      if (parsedDateFrom === undefined && dateFrom) {
        return jsonToolResult({
          success: false,
          message: `Invalid dateFrom: "${dateFrom}". Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS+08:00.`,
        });
      }
      const parsedDateTo = dateTo ? parseDateInput(dateTo) : undefined;
      if (parsedDateTo === undefined && dateTo) {
        return jsonToolResult({
          success: false,
          message: `Invalid dateTo: "${dateTo}". Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS+08:00.`,
        });
      }
      const schedules = await listSubscribedSchedules(userId, {
        locale,
        dateFrom: parsedDateFrom instanceof Date ? parsedDateFrom : undefined,
        dateTo: parsedDateTo instanceof Date ? parsedDateTo : undefined,
        weekday,
        limit,
      });

      return jsonToolResult({ schedules }, { mode: resolvedMode });
    },
  );

  server.registerTool(
    "list_my_exams",
    {
      description:
        "List exams across your subscribed sections. Includes unknown-date exams by default (set includeDateUnknown: false to exclude).",
      inputSchema: {
        dateFrom: flexDateInputSchema.optional(),
        dateTo: flexDateInputSchema.optional(),
        includeDateUnknown: z.boolean().default(true),
        limit: z.number().int().min(1).max(300).default(150),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async (
      { dateFrom, dateTo, includeDateUnknown, limit, locale, mode },
      extra,
    ) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const parsedDateFrom = dateFrom ? parseDateInput(dateFrom) : undefined;
      if (parsedDateFrom === undefined && dateFrom) {
        return jsonToolResult({
          success: false,
          message: `Invalid dateFrom: "${dateFrom}". Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS+08:00.`,
        });
      }
      const parsedDateTo = dateTo ? parseDateInput(dateTo) : undefined;
      if (parsedDateTo === undefined && dateTo) {
        return jsonToolResult({
          success: false,
          message: `Invalid dateTo: "${dateTo}". Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS+08:00.`,
        });
      }
      const exams = await listSubscribedExams(userId, {
        locale,
        dateFrom: parsedDateFrom instanceof Date ? parsedDateFrom : undefined,
        dateTo: parsedDateTo instanceof Date ? parsedDateTo : undefined,
        includeDateUnknown,
        limit,
      });

      return jsonToolResult({ exams }, { mode: resolvedMode });
    },
  );

  server.registerTool(
    "get_my_overview",
    {
      description:
        "Counts and top samples of pending todos, homeworks, today's schedules, and upcoming exams. " +
        "Lighter than get_my_dashboard. Pass atTime to anchor to a specific day.",
      inputSchema: {
        locale: mcpLocaleInputSchema,
        atTime: flexDateInputSchema
          .optional()
          .describe(
            "Override the current time for this query. Useful for testing or asking about a specific day.",
          ),
        mode: mcpModeInputSchema,
      },
    },
    async ({ locale, atTime, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const user = await getViewerInfo(userId);
      const sectionIds = await getSubscribedSectionIds(userId);
      const atTimeDate = atTime
        ? (parseDateInput(atTime) ?? undefined)
        : undefined;
      if (atTime && !(atTimeDate instanceof Date)) {
        return jsonToolResult({
          success: false,
          message: `Invalid atTime: "${atTime}". Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS+08:00.`,
        });
      }
      const { now, todayStart, tomorrowStart } = getTodayBounds(
        atTimeDate instanceof Date ? atTimeDate : undefined,
      );

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
      const [dueHomeworksRaw, upcomingExams] = await Promise.all([
        listSubscribedHomeworks(userId, {
          locale,
          completed: false,
          requireDueDate: true,
          limit: 5,
          sectionIds,
        }),
        listSubscribedExams(userId, {
          locale,
          dateFrom: now,
          includeDateUnknown: false,
          limit: 5,
          sectionIds,
        }),
      ]);
      const dueHomeworks = await withHomeworkItemState(dueHomeworksRaw);

      if (resolvedMode === "summary") {
        return jsonToolResult(
          {
            user: {
              id: user.id,
              name: user.name,
              image: user.image,
            },
            overview: {
              pendingTodosCount,
              pendingHomeworksCount,
              todaySchedulesCount,
              upcomingExamsCount,
            },
            samples: {
              dueTodos: {
                total: dueTodos.length,
                items: dueTodos.slice(0, 3).map(summarizeTodoCard),
              },
              dueHomeworks: {
                total: dueHomeworks.length,
                items: dueHomeworks.slice(0, 3).map(summarizeHomeworkCard),
              },
              upcomingExams: {
                total: upcomingExams.length,
                items: upcomingExams.slice(0, 3).map(summarizeExamCard),
              },
            },
          },
          { mode: "default" },
        );
      }

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
        "Next 7 days of unified calendar events (schedules, homework deadlines, exams, todos). " +
        "Pass atTime to anchor the window start; default is today (Asia/Shanghai).",
      inputSchema: {
        locale: mcpLocaleInputSchema,
        atTime: flexDateInputSchema
          .optional()
          .describe(
            "Override the start of the 7-day window. Defaults to today in Asia/Shanghai. Accepts YYYY-MM-DD or ISO 8601 with offset.",
          ),
        mode: mcpModeInputSchema,
      },
    },
    async ({ locale, atTime, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const atTimeDate = atTime
        ? (parseDateInput(atTime) ?? undefined)
        : undefined;
      if (atTime && !(atTimeDate instanceof Date)) {
        return jsonToolResult({
          success: false,
          message: `Invalid atTime: "${atTime}". Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS+08:00.`,
        });
      }
      const { todayStart } = getTodayBounds(
        atTimeDate instanceof Date ? atTimeDate : undefined,
      );
      const windowEnd = new Date(todayStart);
      windowEnd.setDate(windowEnd.getDate() + 7);
      const events = await listUserCalendarEvents(userId, {
        locale,
        dateFrom: todayStart,
        dateTo: windowEnd,
      });

      if (resolvedMode === "summary") {
        return jsonToolResult(
          {
            range: {
              from: toShanghaiIsoString(todayStart),
              to: toShanghaiIsoString(windowEnd),
            },
            total: events.length,
            events: summarizeCalendarEventCollection(events, {
              itemLimit: 5,
              dayLimit: 7,
            }),
          },
          { mode: "default" },
        );
      }

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
