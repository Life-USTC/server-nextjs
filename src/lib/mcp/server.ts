import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  buildUserCalendarFeedPath,
  ensureUserCalendarFeedToken,
} from "@/lib/calendar-feed-token";
import { findCurrentSemester } from "@/lib/current-semester";
import { getPrisma, prisma } from "@/lib/db/prisma";
import {
  courseInclude,
  sectionCompactInclude,
  sectionInclude,
} from "@/lib/query-helpers";

const localeSchema = z.enum(["zh-cn", "en-us"]);
type Locale = z.infer<typeof localeSchema>;
const dateTimeSchema = z.string().datetime();
const sectionCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_.-]+$/);
const todoPrioritySchema = z.enum(["low", "medium", "high"]);

function jsonToolResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function getUserId(authInfo?: AuthInfo): string {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("Authenticated user context is missing");
  }

  return userId;
}

async function getViewerInfo(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      isAdmin: true,
    },
  });

  return user;
}

async function getSubscribedSectionIds(userId: string): Promise<number[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscribedSections: {
        select: { id: true },
      },
    },
  });

  if (!user) {
    return [];
  }

  return user.subscribedSections.map((section) => section.id);
}

function parseDateValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getTodayBounds() {
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  return { now, todayStart, tomorrowStart };
}

function toDateTimeFromHHmm(baseDate: Date | null, hhmm: number | null) {
  if (!baseDate) return null;

  const hours = hhmm ? Math.trunc(hhmm / 100) : 0;
  const minutes = hhmm ? hhmm % 100 : 0;
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hours,
    minutes,
    0,
    0,
  );
}

async function resolveSectionByJwId(jwId: number, locale: Locale) {
  const localizedPrisma = getPrisma(locale);
  const section = await localizedPrisma.section.findUnique({
    where: { jwId },
    select: {
      id: true,
      jwId: true,
      code: true,
      course: {
        select: {
          jwId: true,
          code: true,
          nameCn: true,
          nameEn: true,
        },
      },
      semester: {
        select: {
          jwId: true,
          code: true,
          nameCn: true,
        },
      },
    },
  });

  return { localizedPrisma, section };
}

export function createMcpServer() {
  const server = new McpServer({
    name: "life-ustc-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "get_my_profile",
    {
      description:
        "Return the authenticated Life@USTC user profile associated with the OAuth access token.",
    },
    async (extra) => {
      const userId = getUserId(extra.authInfo);
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return jsonToolResult(user);
    },
  );

  server.registerTool(
    "list_my_todos",
    {
      description:
        "List todos for the authenticated Life@USTC user in due-date order.",
    },
    async (extra) => {
      const userId = getUserId(extra.authInfo);
      const todos = await prisma.todo.findMany({
        where: { userId },
        orderBy: [
          { completed: "asc" },
          { dueAt: "asc" },
          { createdAt: "desc" },
        ],
      });

      return jsonToolResult({ todos });
    },
  );

  server.registerTool(
    "create_my_todo",
    {
      description: "Create a todo for the authenticated user.",
      inputSchema: {
        title: z.string().trim().min(1).max(200),
        content: z.string().max(4000).optional().nullable(),
        priority: todoPrioritySchema.default("medium"),
        dueAt: z.union([z.string(), z.null()]).optional(),
      },
    },
    async ({ title, content, priority, dueAt }, extra) => {
      const userId = getUserId(extra.authInfo);
      const parsedDueAt = parseDateValue(dueAt);
      if (parsedDueAt === undefined) {
        return jsonToolResult({
          success: false,
          message: "Invalid due date",
        });
      }

      const todo = await prisma.todo.create({
        data: {
          userId,
          title,
          content: content?.trim() || null,
          priority,
          dueAt: parsedDueAt,
        },
      });

      return jsonToolResult({
        success: true,
        id: todo.id,
      });
    },
  );

  server.registerTool(
    "update_my_todo",
    {
      description: "Update one todo for the authenticated user by todo ID.",
      inputSchema: {
        id: z.string().trim().min(1),
        title: z.string().trim().min(1).max(200).optional(),
        content: z.string().max(4000).optional().nullable(),
        priority: todoPrioritySchema.optional(),
        dueAt: z.union([z.string(), z.null()]).optional(),
        completed: z.boolean().optional(),
      },
    },
    async ({ id, title, content, priority, dueAt, completed }, extra) => {
      const userId = getUserId(extra.authInfo);
      const todo = await prisma.todo.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!todo) {
        return jsonToolResult({
          success: false,
          message: "Todo not found",
        });
      }

      if (todo.userId !== userId) {
        return jsonToolResult({
          success: false,
          message: "Forbidden",
        });
      }

      const hasDueAt = dueAt !== undefined;
      const parsedDueAt = hasDueAt ? parseDateValue(dueAt) : undefined;
      if (hasDueAt && parsedDueAt === undefined) {
        return jsonToolResult({
          success: false,
          message: "Invalid due date",
        });
      }

      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content?.trim() || null;
      if (priority !== undefined) updates.priority = priority;
      if (hasDueAt) updates.dueAt = parsedDueAt;
      if (completed !== undefined) updates.completed = completed;

      if (Object.keys(updates).length === 0) {
        return jsonToolResult({
          success: false,
          message: "No changes",
        });
      }

      await prisma.todo.update({
        where: { id },
        data: updates,
      });

      return jsonToolResult({
        success: true,
      });
    },
  );

  server.registerTool(
    "delete_my_todo",
    {
      description: "Delete one todo for the authenticated user by todo ID.",
      inputSchema: {
        id: z.string().trim().min(1),
      },
    },
    async ({ id }, extra) => {
      const userId = getUserId(extra.authInfo);
      const todo = await prisma.todo.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!todo) {
        return jsonToolResult({
          success: false,
          message: "Todo not found",
        });
      }

      if (todo.userId !== userId) {
        return jsonToolResult({
          success: false,
          message: "Forbidden",
        });
      }

      await prisma.todo.delete({ where: { id } });
      return jsonToolResult({
        success: true,
      });
    },
  );

  server.registerTool(
    "search_courses",
    {
      description:
        "Search courses by Chinese name, English name, or course code.",
      inputSchema: {
        search: z.string().trim().min(1),
        limit: z.number().int().min(1).max(25).default(10),
        locale: localeSchema.default("zh-cn"),
      },
    },
    async ({ search, limit, locale }) => {
      const localizedPrisma = getPrisma(locale);
      const courses = await localizedPrisma.course.findMany({
        where: {
          OR: [
            { nameCn: { contains: search, mode: "insensitive" } },
            { nameEn: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ],
        },
        include: courseInclude,
        orderBy: [{ code: "asc" }, { jwId: "asc" }],
        take: limit,
      });

      return jsonToolResult({ courses });
    },
  );

  server.registerTool(
    "get_section_by_jw_id",
    {
      description: "Fetch a detailed section record by its USTC JW section ID.",
      inputSchema: {
        jwId: z.number().int().positive(),
        locale: localeSchema.default("zh-cn"),
      },
    },
    async ({ jwId, locale }) => {
      const localizedPrisma = getPrisma(locale);
      const section = await localizedPrisma.section.findUnique({
        where: { jwId },
        include: sectionInclude,
      });

      if (!section) {
        return jsonToolResult({
          found: false,
          message: `Section ${jwId} was not found`,
        });
      }

      return jsonToolResult({
        found: true,
        section,
      });
    },
  );

  server.registerTool(
    "match_section_codes",
    {
      description:
        "Match section codes in one semester and return matched/unmatched results.",
      inputSchema: {
        codes: z.array(sectionCodeSchema).min(1).max(500),
        semesterId: z.number().int().positive().optional(),
        locale: localeSchema.default("zh-cn"),
      },
    },
    async ({ codes, semesterId, locale }) => {
      const localizedPrisma = getPrisma(locale);
      const semester = semesterId
        ? await prisma.semester.findUnique({
            where: { id: semesterId },
          })
        : await findCurrentSemester(prisma.semester, new Date());

      if (!semester) {
        return jsonToolResult({
          success: false,
          message: "No semester found",
        });
      }

      const sections = await localizedPrisma.section.findMany({
        where: {
          code: { in: codes },
          semesterId: semester.id,
        },
        include: sectionCompactInclude,
        orderBy: [{ code: "asc" }, { jwId: "asc" }],
      });

      return jsonToolResult({
        success: true,
        semester: {
          id: semester.id,
          nameCn: semester.nameCn,
          code: semester.code,
        },
        matchedCodes: sections.map((section) => section.code),
        unmatchedCodes: codes.filter(
          (code) => !sections.some((section) => section.code === code),
        ),
        sections,
        total: sections.length,
      });
    },
  );

  server.registerTool(
    "list_homeworks_by_section",
    {
      description:
        "List homeworks for a section by JW ID, optionally including deleted records.",
      inputSchema: {
        sectionJwId: z.number().int().positive(),
        includeDeleted: z.boolean().default(false),
        locale: localeSchema.default("zh-cn"),
      },
    },
    async ({ sectionJwId, includeDeleted, locale }) => {
      const { localizedPrisma, section } = await resolveSectionByJwId(
        sectionJwId,
        locale,
      );

      if (!section) {
        return jsonToolResult({
          found: false,
          message: `Section ${sectionJwId} was not found`,
        });
      }

      const homeworks = await localizedPrisma.homework.findMany({
        where: {
          sectionId: section.id,
          ...(includeDeleted ? {} : { deletedAt: null }),
        },
        include: {
          description: true,
          createdBy: {
            select: { id: true, name: true, username: true, image: true },
          },
          updatedBy: {
            select: { id: true, name: true, username: true, image: true },
          },
          deletedBy: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
        orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
      });

      return jsonToolResult({
        found: true,
        section,
        homeworks,
      });
    },
  );

  server.registerTool(
    "list_schedules_by_section",
    {
      description:
        "List schedules for a section by JW ID, ordered by date and start time.",
      inputSchema: {
        sectionJwId: z.number().int().positive(),
        limit: z.number().int().min(1).max(200).default(100),
        locale: localeSchema.default("zh-cn"),
      },
    },
    async ({ sectionJwId, limit, locale }) => {
      const { localizedPrisma, section } = await resolveSectionByJwId(
        sectionJwId,
        locale,
      );

      if (!section) {
        return jsonToolResult({
          found: false,
          message: `Section ${sectionJwId} was not found`,
        });
      }

      const schedules = await localizedPrisma.schedule.findMany({
        where: { sectionId: section.id },
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
            },
          },
          scheduleGroup: true,
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: limit,
      });

      return jsonToolResult({
        found: true,
        section,
        schedules,
      });
    },
  );

  server.registerTool(
    "list_exams_by_section",
    {
      description:
        "List exams for a section by JW ID, including exam batch and exam rooms.",
      inputSchema: {
        sectionJwId: z.number().int().positive(),
        locale: localeSchema.default("zh-cn"),
      },
    },
    async ({ sectionJwId, locale }) => {
      const { localizedPrisma, section } = await resolveSectionByJwId(
        sectionJwId,
        locale,
      );

      if (!section) {
        return jsonToolResult({
          found: false,
          message: `Section ${sectionJwId} was not found`,
        });
      }

      const exams = await localizedPrisma.exam.findMany({
        where: { sectionId: section.id },
        include: {
          examBatch: true,
          examRooms: true,
          section: {
            include: {
              course: true,
            },
          },
        },
        orderBy: [{ examDate: "asc" }, { startTime: "asc" }, { jwId: "asc" }],
      });

      return jsonToolResult({
        found: true,
        section,
        exams,
      });
    },
  );

  server.registerTool(
    "list_my_homeworks",
    {
      description:
        "List homeworks across the authenticated user's subscribed sections.",
      inputSchema: {
        completed: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).default(100),
        locale: localeSchema.default("zh-cn"),
      },
    },
    async ({ completed, limit, locale }, extra) => {
      const userId = getUserId(extra.authInfo);
      const sectionIds = await getSubscribedSectionIds(userId);
      if (sectionIds.length === 0) {
        return jsonToolResult({ homeworks: [] });
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

      return jsonToolResult({ homeworks });
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
      },
    },
    async ({ homeworkId, completed }, extra) => {
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

        return jsonToolResult({
          success: true,
          completion: {
            homeworkId,
            completed: true,
            completedAt: record.completedAt,
          },
        });
      }

      await prisma.homeworkCompletion.deleteMany({
        where: { userId, homeworkId },
      });

      return jsonToolResult({
        success: true,
        completion: {
          homeworkId,
          completed: false,
          completedAt: null,
        },
      });
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
        locale: localeSchema.default("zh-cn"),
      },
    },
    async ({ dateFrom, dateTo, weekday, limit, locale }, extra) => {
      const userId = getUserId(extra.authInfo);
      const sectionIds = await getSubscribedSectionIds(userId);
      if (sectionIds.length === 0) {
        return jsonToolResult({ schedules: [] });
      }

      const localizedPrisma = getPrisma(locale);
      const schedules = await localizedPrisma.schedule.findMany({
        where: {
          sectionId: { in: sectionIds },
          ...(dateFrom || dateTo
            ? {
                date: {
                  ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                  ...(dateTo ? { lte: new Date(dateTo) } : {}),
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

      return jsonToolResult({ schedules });
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
        locale: localeSchema.default("zh-cn"),
      },
    },
    async ({ dateFrom, dateTo, includeDateUnknown, limit, locale }, extra) => {
      const userId = getUserId(extra.authInfo);
      const sectionIds = await getSubscribedSectionIds(userId);
      if (sectionIds.length === 0) {
        return jsonToolResult({ exams: [] });
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
                      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                      ...(dateTo ? { lte: new Date(dateTo) } : {}),
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

      return jsonToolResult({ exams });
    },
  );

  server.registerTool(
    "get_my_overview",
    {
      description:
        "Get an overview of todos, homeworks, schedules and exams for the authenticated user.",
      inputSchema: {
        locale: localeSchema.default("zh-cn"),
      },
    },
    async ({ locale }, extra) => {
      const userId = getUserId(extra.authInfo);
      const user = await getViewerInfo(userId);
      const sectionIds = await getSubscribedSectionIds(userId);
      const { now, todayStart, tomorrowStart } = getTodayBounds();

      const localizedPrisma = getPrisma(locale);
      const [
        pendingTodosCount,
        pendingHomeworksCount,
        todaySchedulesCount,
        upcomingExamsCount,
        dueTodos,
        dueHomeworks,
        upcomingExams,
      ] = await Promise.all([
        prisma.todo.count({
          where: {
            userId,
            completed: false,
          },
        }),
        sectionIds.length > 0
          ? prisma.homework.count({
              where: {
                deletedAt: null,
                sectionId: { in: sectionIds },
                homeworkCompletions: { none: { userId } },
              },
            })
          : Promise.resolve(0),
        sectionIds.length > 0
          ? prisma.schedule.count({
              where: {
                sectionId: { in: sectionIds },
                date: {
                  gte: todayStart,
                  lt: tomorrowStart,
                },
              },
            })
          : Promise.resolve(0),
        sectionIds.length > 0
          ? prisma.exam.count({
              where: {
                sectionId: { in: sectionIds },
                examDate: { gte: todayStart },
              },
            })
          : Promise.resolve(0),
        prisma.todo.findMany({
          where: {
            userId,
            completed: false,
            dueAt: { not: null },
          },
          orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
          take: 5,
        }),
        sectionIds.length > 0
          ? localizedPrisma.homework.findMany({
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
          : Promise.resolve([]),
        sectionIds.length > 0
          ? localizedPrisma.exam.findMany({
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
          : Promise.resolve([]),
      ]);

      return jsonToolResult({
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
      });
    },
  );

  server.registerTool(
    "get_my_7days_timeline",
    {
      description:
        "Get next-7-day timeline events from schedules, homework deadlines, exams and todos.",
      inputSchema: {
        locale: localeSchema.default("zh-cn"),
      },
    },
    async ({ locale }, extra) => {
      const userId = getUserId(extra.authInfo);
      const sectionIds = await getSubscribedSectionIds(userId);
      const { todayStart } = getTodayBounds();
      const windowEnd = new Date(todayStart);
      windowEnd.setDate(windowEnd.getDate() + 7);
      const localizedPrisma = getPrisma(locale);

      const [schedules, homeworks, exams, todos] = await Promise.all([
        sectionIds.length > 0
          ? localizedPrisma.schedule.findMany({
              where: {
                sectionId: { in: sectionIds },
                date: { gte: todayStart, lt: windowEnd },
              },
              include: {
                section: {
                  include: {
                    course: true,
                  },
                },
                room: {
                  include: {
                    building: {
                      include: {
                        campus: true,
                      },
                    },
                  },
                },
                teachers: true,
              },
              orderBy: [{ date: "asc" }, { startTime: "asc" }],
            })
          : Promise.resolve([]),
        sectionIds.length > 0
          ? localizedPrisma.homework.findMany({
              where: {
                deletedAt: null,
                sectionId: { in: sectionIds },
                submissionDueAt: { gte: todayStart, lt: windowEnd },
                homeworkCompletions: { none: { userId } },
              },
              include: {
                section: {
                  include: {
                    course: true,
                  },
                },
              },
              orderBy: [{ submissionDueAt: "asc" }, { createdAt: "desc" }],
            })
          : Promise.resolve([]),
        sectionIds.length > 0
          ? localizedPrisma.exam.findMany({
              where: {
                sectionId: { in: sectionIds },
                examDate: { gte: todayStart, lt: windowEnd },
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
            })
          : Promise.resolve([]),
        prisma.todo.findMany({
          where: {
            userId,
            completed: false,
            dueAt: { gte: todayStart, lt: windowEnd },
          },
          orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        }),
      ]);

      const events = [
        ...schedules.map((schedule) => {
          const at = toDateTimeFromHHmm(schedule.date, schedule.startTime);
          return {
            type: "schedule" as const,
            at: at?.toISOString() ?? null,
            sortKey: at?.getTime() ?? Number.MAX_SAFE_INTEGER,
            payload: schedule,
          };
        }),
        ...homeworks.map((homework) => ({
          type: "homework_due" as const,
          at: homework.submissionDueAt?.toISOString() ?? null,
          sortKey:
            homework.submissionDueAt?.getTime() ?? Number.MAX_SAFE_INTEGER,
          payload: homework,
        })),
        ...exams.map((exam) => {
          const at = toDateTimeFromHHmm(exam.examDate, exam.startTime);
          return {
            type: "exam" as const,
            at: at?.toISOString() ?? null,
            sortKey: at?.getTime() ?? Number.MAX_SAFE_INTEGER,
            payload: exam,
          };
        }),
        ...todos.map((todo) => ({
          type: "todo_due" as const,
          at: todo.dueAt?.toISOString() ?? null,
          sortKey: todo.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER,
          payload: todo,
        })),
      ]
        .sort((left, right) => left.sortKey - right.sortKey)
        .map(({ sortKey: _sortKey, ...event }) => event);

      return jsonToolResult({
        range: {
          from: todayStart.toISOString(),
          to: windowEnd.toISOString(),
        },
        total: events.length,
        events,
      });
    },
  );

  server.registerTool(
    "get_my_calendar_subscription",
    {
      description:
        "Get subscribed sections and personal calendar feed path for the authenticated user.",
      inputSchema: {
        locale: localeSchema.default("zh-cn"),
      },
    },
    async ({ locale }, extra) => {
      const userId = getUserId(extra.authInfo);
      const localizedPrisma = getPrisma(locale);
      const token = await ensureUserCalendarFeedToken(userId);
      const user = await localizedPrisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          subscribedSections: {
            include: sectionCompactInclude,
            orderBy: [{ semester: { jwId: "desc" } }, { code: "asc" }],
          },
        },
      });

      if (!user) {
        return jsonToolResult({
          success: false,
          message: "User not found",
        });
      }

      return jsonToolResult({
        success: true,
        subscription: {
          userId: user.id,
          sections: user.subscribedSections,
          calendarPath: buildUserCalendarFeedPath(user.id, token),
        },
      });
    },
  );

  server.registerTool(
    "subscribe_my_sections_by_codes",
    {
      description:
        "Subscribe the authenticated user to matched section codes in one semester.",
      inputSchema: {
        codes: z.array(sectionCodeSchema).min(1).max(500),
        semesterId: z.number().int().positive().optional(),
        locale: localeSchema.default("zh-cn"),
      },
    },
    async ({ codes, semesterId, locale }, extra) => {
      const userId = getUserId(extra.authInfo);
      const localizedPrisma = getPrisma(locale);

      const semester = semesterId
        ? await prisma.semester.findUnique({
            where: { id: semesterId },
          })
        : await findCurrentSemester(prisma.semester, new Date());

      if (!semester) {
        return jsonToolResult({
          success: false,
          message: "No semester found",
        });
      }

      const matchedSections = await localizedPrisma.section.findMany({
        where: {
          code: { in: codes },
          semesterId: semester.id,
        },
        include: sectionCompactInclude,
        orderBy: [{ code: "asc" }, { jwId: "asc" }],
      });

      const existingIds = new Set(await getSubscribedSectionIds(userId));
      const existingIdsBefore = new Set(existingIds);
      const matchedIds = matchedSections.map((section) => section.id);
      for (const id of matchedIds) {
        existingIds.add(id);
      }
      const nextIds = Array.from(existingIds);
      const addedCount = matchedIds.filter(
        (id) => !existingIdsBefore.has(id),
      ).length;

      const updatedUser = await localizedPrisma.user.update({
        where: { id: userId },
        data: {
          subscribedSections: {
            set: nextIds.map((id) => ({ id })),
          },
        },
        select: {
          id: true,
          subscribedSections: {
            include: sectionCompactInclude,
            orderBy: [{ semester: { jwId: "desc" } }, { code: "asc" }],
          },
        },
      });

      return jsonToolResult({
        success: true,
        semester: {
          id: semester.id,
          nameCn: semester.nameCn,
          code: semester.code,
        },
        matchedCodes: matchedSections.map((section) => section.code),
        unmatchedCodes: codes.filter(
          (code) => !matchedSections.some((section) => section.code === code),
        ),
        addedCount,
        subscription: {
          userId: updatedUser.id,
          sections: updatedUser.subscribedSections,
        },
      });
    },
  );

  return server;
}
