import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { findActiveSuspension } from "@/features/comments/server/comment-utils";
import { DEFAULT_LOCALE, localeSchema } from "@/i18n/config";
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

type Locale = z.infer<typeof localeSchema>;
const dateTimeSchema = z.string().datetime();
const sectionCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_.-]+$/);
const todoPrioritySchema = z.enum(["low", "medium", "high"]);

const showAllDetailedPropertiesSchema = z.boolean().default(false);

function resolveShowAllDetailedProperties(input: {
  showAllDetailedProperties?: boolean;
  showAllDetailedProrties?: boolean;
}) {
  if (typeof input.showAllDetailedProperties === "boolean") {
    return input.showAllDetailedProperties;
  }
  return input.showAllDetailedProrties === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick<T extends Record<string, unknown>, K extends keyof T>(
  value: T,
  keys: K[],
): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) {
    if (Object.hasOwn(value, key)) out[key] = value[key];
  }
  return out;
}

function compactCourse(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, [
    "id",
    "jwId",
    "code",
    "namePrimary",
    "nameSecondary",
    "credit",
    "hours",
  ]);
}

function compactSemester(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, ["id", "jwId", "code", "nameCn", "namePrimary"]);
}

function compactSection(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "id",
    "jwId",
    "code",
    "namePrimary",
    "nameSecondary",
    "campusId",
    "openDepartmentId",
  ]);
  if (Object.hasOwn(value, "course")) out.course = compactCourse(value.course);
  if (Object.hasOwn(value, "semester"))
    out.semester = compactSemester(value.semester);
  return out;
}

function compactTodo(value: unknown) {
  if (!isRecord(value)) return value;
  return pick(value, [
    "id",
    "title",
    "content",
    "priority",
    "dueAt",
    "completed",
    "createdAt",
    "updatedAt",
  ]);
}

function compactHomework(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "id",
    "sectionId",
    "title",
    "isMajor",
    "requiresTeam",
    "publishedAt",
    "submissionStartAt",
    "submissionDueAt",
    "deletedAt",
    "createdAt",
    "updatedAt",
  ]);

  if (Object.hasOwn(value, "description")) {
    if (isRecord(value.description)) {
      out.description = pick(value.description, [
        "id",
        "content",
        "lastEditedAt",
        "lastEditedById",
      ]);
    } else {
      out.description = value.description;
    }
  }
  if (Object.hasOwn(value, "completion")) out.completion = value.completion;
  if (Object.hasOwn(value, "homeworkCompletions"))
    out.homeworkCompletions = value.homeworkCompletions;
  if (Object.hasOwn(value, "section"))
    out.section = compactSection(value.section);
  if (Object.hasOwn(value, "createdBy"))
    out.createdBy = pick(value.createdBy as Record<string, unknown>, [
      "id",
      "name",
      "username",
      "image",
    ]);
  if (Object.hasOwn(value, "updatedBy"))
    out.updatedBy = pick(value.updatedBy as Record<string, unknown>, [
      "id",
      "name",
      "username",
      "image",
    ]);
  if (Object.hasOwn(value, "deletedBy"))
    out.deletedBy = pick(value.deletedBy as Record<string, unknown>, [
      "id",
      "name",
      "username",
      "image",
    ]);

  return out;
}

function compactSchedule(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "id",
    "jwId",
    "date",
    "weekday",
    "startTime",
    "endTime",
    "weekIndex",
    "createdAt",
    "updatedAt",
  ]);
  if (Object.hasOwn(value, "section"))
    out.section = compactSection(value.section);
  if (Object.hasOwn(value, "room") && isRecord(value.room)) {
    const room = value.room;
    out.room = {
      ...pick(room, ["id", "jwId", "namePrimary", "nameSecondary"]),
      ...(Object.hasOwn(room, "building") && isRecord(room.building)
        ? {
            building: pick(room.building, [
              "id",
              "jwId",
              "namePrimary",
              "nameSecondary",
            ]),
          }
        : {}),
    };
  }
  if (Object.hasOwn(value, "teachers") && Array.isArray(value.teachers)) {
    out.teachers = (value.teachers as unknown[]).map((teacher) => {
      if (!isRecord(teacher)) return teacher;
      return pick(teacher, ["id", "jwId", "namePrimary", "nameSecondary"]);
    });
  }
  return out;
}

function compactExam(value: unknown) {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = pick(value, [
    "id",
    "jwId",
    "examDate",
    "startTime",
    "endTime",
    "createdAt",
    "updatedAt",
  ]);
  if (Object.hasOwn(value, "section"))
    out.section = compactSection(value.section);
  if (Object.hasOwn(value, "examBatch") && isRecord(value.examBatch)) {
    out.examBatch = pick(value.examBatch, [
      "id",
      "jwId",
      "namePrimary",
      "nameSecondary",
    ]);
  }
  if (Object.hasOwn(value, "examRooms") && Array.isArray(value.examRooms)) {
    out.examRooms = (value.examRooms as unknown[]).map((room) => {
      if (!isRecord(room)) return room;
      return pick(room, ["id", "jwId", "roomName", "buildingName"]);
    });
  }
  return out;
}

function compactMcpPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compactMcpPayload);
  if (!isRecord(value)) return value;

  if (Object.hasOwn(value, "todos") && Array.isArray(value.todos)) {
    return { ...value, todos: (value.todos as unknown[]).map(compactTodo) };
  }
  if (Object.hasOwn(value, "courses") && Array.isArray(value.courses)) {
    return {
      ...value,
      courses: (value.courses as unknown[]).map(compactCourse),
    };
  }
  if (Object.hasOwn(value, "sections") && Array.isArray(value.sections)) {
    return {
      ...value,
      sections: (value.sections as unknown[]).map(compactSection),
    };
  }
  if (Object.hasOwn(value, "section")) {
    return { ...value, section: compactSection(value.section) };
  }
  if (Object.hasOwn(value, "homeworks") && Array.isArray(value.homeworks)) {
    return {
      ...value,
      homeworks: (value.homeworks as unknown[]).map(compactHomework),
    };
  }
  if (Object.hasOwn(value, "schedules") && Array.isArray(value.schedules)) {
    return {
      ...value,
      schedules: (value.schedules as unknown[]).map(compactSchedule),
    };
  }
  if (Object.hasOwn(value, "exams") && Array.isArray(value.exams)) {
    return { ...value, exams: (value.exams as unknown[]).map(compactExam) };
  }
  if (Object.hasOwn(value, "events") && Array.isArray(value.events)) {
    const events = (value.events as unknown[]).map((event) => {
      if (!isRecord(event)) return event;
      const base = pick(event, ["type", "at"]);
      if (!Object.hasOwn(event, "payload")) return base;
      const type = event.type;
      if (type === "schedule")
        return { ...base, payload: compactSchedule(event.payload) };
      if (type === "homework_due")
        return { ...base, payload: compactHomework(event.payload) };
      if (type === "exam")
        return { ...base, payload: compactExam(event.payload) };
      if (type === "todo_due")
        return { ...base, payload: compactTodo(event.payload) };
      return { ...base, payload: compactMcpPayload(event.payload) };
    });
    return { ...value, events };
  }

  // Default: keep shape, but compact obvious nested entities if present.
  const out: Record<string, unknown> = { ...value };
  if (Object.hasOwn(out, "course")) out.course = compactCourse(out.course);
  if (Object.hasOwn(out, "todo")) out.todo = compactTodo(out.todo);
  if (Object.hasOwn(out, "homework"))
    out.homework = compactHomework(out.homework);
  if (Object.hasOwn(out, "schedule"))
    out.schedule = compactSchedule(out.schedule);
  if (Object.hasOwn(out, "exam")) out.exam = compactExam(out.exam);
  return out;
}

function jsonToolResult(
  value: unknown,
  options?: { showAllDetailedProperties?: boolean },
) {
  const payload = options?.showAllDetailedProperties
    ? value
    : compactMcpPayload(value);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
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
      inputSchema: {
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async ({ showAllDetailedProperties, showAllDetailedProrties }, extra) => {
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

      return jsonToolResult(user, {
        showAllDetailedProperties: resolveShowAllDetailedProperties({
          showAllDetailedProperties,
          showAllDetailedProrties,
        }),
      });
    },
  );

  server.registerTool(
    "list_my_todos",
    {
      description:
        "List todos for the authenticated Life@USTC user in due-date order.",
      inputSchema: {
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async ({ showAllDetailedProperties, showAllDetailedProrties }, extra) => {
      const userId = getUserId(extra.authInfo);
      const todos = await prisma.todo.findMany({
        where: { userId },
        orderBy: [
          { completed: "asc" },
          { dueAt: "asc" },
          { createdAt: "desc" },
        ],
      });

      return jsonToolResult(
        { todos },
        {
          showAllDetailedProperties: resolveShowAllDetailedProperties({
            showAllDetailedProperties,
            showAllDetailedProrties,
          }),
        },
      );
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
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async (
      {
        title,
        content,
        priority,
        dueAt,
        showAllDetailedProperties,
        showAllDetailedProrties,
      },
      extra,
    ) => {
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

      return jsonToolResult(
        {
          success: true,
          id: todo.id,
        },
        {
          showAllDetailedProperties: resolveShowAllDetailedProperties({
            showAllDetailedProperties,
            showAllDetailedProrties,
          }),
        },
      );
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
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async (
      {
        id,
        title,
        content,
        priority,
        dueAt,
        completed,
        showAllDetailedProperties,
        showAllDetailedProrties,
      },
      extra,
    ) => {
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

      return jsonToolResult(
        {
          success: true,
        },
        {
          showAllDetailedProperties: resolveShowAllDetailedProperties({
            showAllDetailedProperties,
            showAllDetailedProrties,
          }),
        },
      );
    },
  );

  server.registerTool(
    "delete_my_todo",
    {
      description: "Delete one todo for the authenticated user by todo ID.",
      inputSchema: {
        id: z.string().trim().min(1),
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async (
      { id, showAllDetailedProperties, showAllDetailedProrties },
      extra,
    ) => {
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
      return jsonToolResult(
        {
          success: true,
        },
        {
          showAllDetailedProperties: resolveShowAllDetailedProperties({
            showAllDetailedProperties,
            showAllDetailedProrties,
          }),
        },
      );
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
        locale: localeSchema.default(DEFAULT_LOCALE),
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async ({
      search,
      limit,
      locale,
      showAllDetailedProperties,
      showAllDetailedProrties,
    }) => {
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

      return jsonToolResult(
        { courses },
        {
          showAllDetailedProperties: resolveShowAllDetailedProperties({
            showAllDetailedProperties,
            showAllDetailedProrties,
          }),
        },
      );
    },
  );

  server.registerTool(
    "get_section_by_jw_id",
    {
      description: "Fetch a detailed section record by its USTC JW section ID.",
      inputSchema: {
        jwId: z.number().int().positive(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async ({
      jwId,
      locale,
      showAllDetailedProperties,
      showAllDetailedProrties,
    }) => {
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

      return jsonToolResult(
        {
          found: true,
          section,
        },
        {
          showAllDetailedProperties: resolveShowAllDetailedProperties({
            showAllDetailedProperties,
            showAllDetailedProrties,
          }),
        },
      );
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
        locale: localeSchema.default(DEFAULT_LOCALE),
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async ({
      codes,
      semesterId,
      locale,
      showAllDetailedProperties,
      showAllDetailedProrties,
    }) => {
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

      return jsonToolResult(
        {
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
        },
        {
          showAllDetailedProperties: resolveShowAllDetailedProperties({
            showAllDetailedProperties,
            showAllDetailedProrties,
          }),
        },
      );
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
        locale: localeSchema.default(DEFAULT_LOCALE),
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async ({
      sectionJwId,
      includeDeleted,
      locale,
      showAllDetailedProperties,
      showAllDetailedProrties,
    }) => {
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

      return jsonToolResult(
        {
          found: true,
          section,
          homeworks,
        },
        {
          showAllDetailedProperties: resolveShowAllDetailedProperties({
            showAllDetailedProperties,
            showAllDetailedProrties,
          }),
        },
      );
    },
  );

  server.registerTool(
    "create_homework_on_section",
    {
      description:
        "Create one homework under a section (by section JW ID) for the authenticated user.",
      inputSchema: {
        sectionJwId: z.number().int().positive(),
        title: z.string().trim().min(1).max(200),
        description: z.string().max(20000).optional().nullable(),
        isMajor: z.boolean().optional(),
        requiresTeam: z.boolean().optional(),
        publishedAt: z.union([z.string(), z.null()]).optional(),
        submissionStartAt: z.union([z.string(), z.null()]).optional(),
        submissionDueAt: z.union([z.string(), z.null()]).optional(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async (
      {
        sectionJwId,
        title,
        description,
        isMajor,
        requiresTeam,
        publishedAt,
        submissionStartAt,
        submissionDueAt,
        locale,
        showAllDetailedProperties,
        showAllDetailedProrties,
      },
      extra,
    ) => {
      const resolvedShowAllDetailedProperties =
        resolveShowAllDetailedProperties({
          showAllDetailedProperties,
          showAllDetailedProrties,
        });
      const userId = getUserId(extra.authInfo);
      const suspension = await findActiveSuspension(userId);
      if (suspension) {
        return jsonToolResult(
          {
            success: false,
            message: "Suspended",
            reason: suspension.reason ?? null,
          },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
      }

      const { section } = await resolveSectionByJwId(sectionJwId, locale);
      if (!section) {
        return jsonToolResult(
          { success: false, message: `Section ${sectionJwId} was not found` },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
      }

      const parsedPublishedAt = parseDateValue(publishedAt);
      const parsedSubmissionStartAt = parseDateValue(submissionStartAt);
      const parsedSubmissionDueAt = parseDateValue(submissionDueAt);
      if (parsedPublishedAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid publish date" },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
      }
      if (parsedSubmissionStartAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid submission start" },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
      }
      if (parsedSubmissionDueAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid submission due" },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
      }
      if (
        parsedSubmissionStartAt &&
        parsedSubmissionDueAt &&
        parsedSubmissionStartAt.getTime() > parsedSubmissionDueAt.getTime()
      ) {
        return jsonToolResult(
          { success: false, message: "Submission start must be before due" },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
      }

      const trimmedDescription = (description ?? "").trim();
      const homework = await prisma.$transaction(async (tx) => {
        const created = await tx.homework.create({
          data: {
            sectionId: section.id,
            title,
            isMajor: isMajor === true,
            requiresTeam: requiresTeam === true,
            publishedAt: parsedPublishedAt,
            submissionStartAt: parsedSubmissionStartAt,
            submissionDueAt: parsedSubmissionDueAt,
            createdById: userId,
            updatedById: userId,
          },
        });

        if (trimmedDescription) {
          const descriptionRecord = await tx.description.create({
            data: {
              content: trimmedDescription,
              lastEditedAt: new Date(),
              lastEditedById: userId,
              homeworkId: created.id,
            },
          });
          await tx.descriptionEdit.create({
            data: {
              descriptionId: descriptionRecord.id,
              editorId: userId,
              previousContent: null,
              nextContent: trimmedDescription,
            },
          });
        }

        await tx.homeworkAuditLog.create({
          data: {
            action: "created",
            sectionId: section.id,
            homeworkId: created.id,
            actorId: userId,
            titleSnapshot: title,
          },
        });

        return created;
      });

      return jsonToolResult(
        { success: true, id: homework.id },
        { showAllDetailedProperties: resolvedShowAllDetailedProperties },
      );
    },
  );

  server.registerTool(
    "update_homework_on_section",
    {
      description:
        "Update one homework (by homework ID). Optionally upsert its description.",
      inputSchema: {
        homeworkId: z.string().trim().min(1),
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().max(20000).optional().nullable(),
        isMajor: z.boolean().optional(),
        requiresTeam: z.boolean().optional(),
        publishedAt: z.union([z.string(), z.null()]).optional(),
        submissionStartAt: z.union([z.string(), z.null()]).optional(),
        submissionDueAt: z.union([z.string(), z.null()]).optional(),
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async (
      {
        homeworkId,
        title,
        description,
        isMajor,
        requiresTeam,
        publishedAt,
        submissionStartAt,
        submissionDueAt,
        showAllDetailedProperties,
        showAllDetailedProrties,
      },
      extra,
    ) => {
      const resolvedShowAllDetailedProperties =
        resolveShowAllDetailedProperties({
          showAllDetailedProperties,
          showAllDetailedProrties,
        });
      const userId = getUserId(extra.authInfo);
      const suspension = await findActiveSuspension(userId);
      if (suspension) {
        return jsonToolResult(
          {
            success: false,
            message: "Suspended",
            reason: suspension.reason ?? null,
          },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
      }

      const hasPublishedAt = publishedAt !== undefined;
      const hasSubmissionStartAt = submissionStartAt !== undefined;
      const hasSubmissionDueAt = submissionDueAt !== undefined;

      const parsedPublishedAt = hasPublishedAt
        ? parseDateValue(publishedAt)
        : undefined;
      const parsedSubmissionStartAt = hasSubmissionStartAt
        ? parseDateValue(submissionStartAt)
        : undefined;
      const parsedSubmissionDueAt = hasSubmissionDueAt
        ? parseDateValue(submissionDueAt)
        : undefined;

      if (hasPublishedAt && parsedPublishedAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid publish date" },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
      }
      if (hasSubmissionStartAt && parsedSubmissionStartAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid submission start" },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
      }
      if (hasSubmissionDueAt && parsedSubmissionDueAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid submission due" },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
      }
      if (
        parsedSubmissionStartAt &&
        parsedSubmissionDueAt &&
        parsedSubmissionStartAt.getTime() > parsedSubmissionDueAt.getTime()
      ) {
        return jsonToolResult(
          { success: false, message: "Submission start must be before due" },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
      }

      const existing = await prisma.homework.findUnique({
        where: { id: homeworkId },
        select: { id: true, deletedAt: true },
      });
      if (!existing) {
        return jsonToolResult(
          { success: false, message: "Homework not found" },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
      }
      if (existing.deletedAt) {
        return jsonToolResult(
          { success: false, message: "Homework deleted" },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
      }

      const updates: Record<string, unknown> = { updatedById: userId };
      if (title !== undefined) updates.title = title;
      if (isMajor !== undefined) updates.isMajor = isMajor === true;
      if (requiresTeam !== undefined)
        updates.requiresTeam = requiresTeam === true;
      if (parsedPublishedAt !== undefined)
        updates.publishedAt = parsedPublishedAt;
      if (parsedSubmissionStartAt !== undefined)
        updates.submissionStartAt = parsedSubmissionStartAt;
      if (parsedSubmissionDueAt !== undefined)
        updates.submissionDueAt = parsedSubmissionDueAt;

      const wantsDescription = description !== undefined;
      const trimmedDescription = (description ?? "").trim();

      if (Object.keys(updates).length === 1 && !wantsDescription) {
        return jsonToolResult(
          { success: false, message: "No changes" },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
      }

      await prisma.$transaction(async (tx) => {
        if (Object.keys(updates).length > 1) {
          await tx.homework.update({
            where: { id: homeworkId },
            data: updates,
          });
        }

        if (wantsDescription) {
          const existingDescription = await tx.description.findFirst({
            where: { homeworkId },
          });
          const previousContent = existingDescription?.content ?? null;
          if (!existingDescription && !trimmedDescription) {
            return;
          }
          if (
            existingDescription &&
            existingDescription.content === trimmedDescription
          ) {
            return;
          }
          const next = existingDescription
            ? await tx.description.update({
                where: { id: existingDescription.id },
                data: {
                  content: trimmedDescription,
                  lastEditedAt: new Date(),
                  lastEditedById: userId,
                },
              })
            : await tx.description.create({
                data: {
                  content: trimmedDescription,
                  lastEditedAt: new Date(),
                  lastEditedById: userId,
                  homeworkId,
                },
              });
          await tx.descriptionEdit.create({
            data: {
              descriptionId: next.id,
              editorId: userId,
              previousContent,
              nextContent: trimmedDescription,
            },
          });
        }
      });

      return jsonToolResult(
        { success: true },
        { showAllDetailedProperties: resolvedShowAllDetailedProperties },
      );
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
        locale: localeSchema.default(DEFAULT_LOCALE),
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async ({
      sectionJwId,
      limit,
      locale,
      showAllDetailedProperties,
      showAllDetailedProrties,
    }) => {
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

      return jsonToolResult(
        {
          found: true,
          section,
          schedules,
        },
        {
          showAllDetailedProperties: resolveShowAllDetailedProperties({
            showAllDetailedProperties,
            showAllDetailedProrties,
          }),
        },
      );
    },
  );

  server.registerTool(
    "list_exams_by_section",
    {
      description:
        "List exams for a section by JW ID, including exam batch and exam rooms.",
      inputSchema: {
        sectionJwId: z.number().int().positive(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async ({
      sectionJwId,
      locale,
      showAllDetailedProperties,
      showAllDetailedProrties,
    }) => {
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

      return jsonToolResult(
        {
          found: true,
          section,
          exams,
        },
        {
          showAllDetailedProperties: resolveShowAllDetailedProperties({
            showAllDetailedProperties,
            showAllDetailedProrties,
          }),
        },
      );
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
        locale: localeSchema.default(DEFAULT_LOCALE),
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async (
      {
        completed,
        limit,
        locale,
        showAllDetailedProperties,
        showAllDetailedProrties,
      },
      extra,
    ) => {
      const resolvedShowAllDetailedProperties =
        resolveShowAllDetailedProperties({
          showAllDetailedProperties,
          showAllDetailedProrties,
        });
      const userId = getUserId(extra.authInfo);
      const sectionIds = await getSubscribedSectionIds(userId);
      if (sectionIds.length === 0) {
        return jsonToolResult(
          { homeworks: [] },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
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

      return jsonToolResult(
        { homeworks },
        { showAllDetailedProperties: resolvedShowAllDetailedProperties },
      );
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
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async (
      {
        homeworkId,
        completed,
        showAllDetailedProperties,
        showAllDetailedProrties,
      },
      extra,
    ) => {
      const resolvedShowAllDetailedProperties =
        resolveShowAllDetailedProperties({
          showAllDetailedProperties,
          showAllDetailedProrties,
        });
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
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
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
        { showAllDetailedProperties: resolvedShowAllDetailedProperties },
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
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async (
      {
        dateFrom,
        dateTo,
        weekday,
        limit,
        locale,
        showAllDetailedProperties,
        showAllDetailedProrties,
      },
      extra,
    ) => {
      const resolvedShowAllDetailedProperties =
        resolveShowAllDetailedProperties({
          showAllDetailedProperties,
          showAllDetailedProrties,
        });
      const userId = getUserId(extra.authInfo);
      const sectionIds = await getSubscribedSectionIds(userId);
      if (sectionIds.length === 0) {
        return jsonToolResult(
          { schedules: [] },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
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

      return jsonToolResult(
        { schedules },
        { showAllDetailedProperties: resolvedShowAllDetailedProperties },
      );
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
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async (
      {
        dateFrom,
        dateTo,
        includeDateUnknown,
        limit,
        locale,
        showAllDetailedProperties,
        showAllDetailedProrties,
      },
      extra,
    ) => {
      const resolvedShowAllDetailedProperties =
        resolveShowAllDetailedProperties({
          showAllDetailedProperties,
          showAllDetailedProrties,
        });
      const userId = getUserId(extra.authInfo);
      const sectionIds = await getSubscribedSectionIds(userId);
      if (sectionIds.length === 0) {
        return jsonToolResult(
          { exams: [] },
          { showAllDetailedProperties: resolvedShowAllDetailedProperties },
        );
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

      return jsonToolResult(
        { exams },
        { showAllDetailedProperties: resolvedShowAllDetailedProperties },
      );
    },
  );

  server.registerTool(
    "get_my_overview",
    {
      description:
        "Get an overview of todos, homeworks, schedules and exams for the authenticated user.",
      inputSchema: {
        locale: localeSchema.default(DEFAULT_LOCALE),
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async (
      { locale, showAllDetailedProperties, showAllDetailedProrties },
      extra,
    ) => {
      const resolvedShowAllDetailedProperties =
        resolveShowAllDetailedProperties({
          showAllDetailedProperties,
          showAllDetailedProrties,
        });
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
        { showAllDetailedProperties: resolvedShowAllDetailedProperties },
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
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async (
      { locale, showAllDetailedProperties, showAllDetailedProrties },
      extra,
    ) => {
      const resolvedShowAllDetailedProperties =
        resolveShowAllDetailedProperties({
          showAllDetailedProperties,
          showAllDetailedProrties,
        });
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

      return jsonToolResult(
        {
          range: {
            from: todayStart.toISOString(),
            to: windowEnd.toISOString(),
          },
          total: events.length,
          events,
        },
        { showAllDetailedProperties: resolvedShowAllDetailedProperties },
      );
    },
  );

  server.registerTool(
    "get_my_calendar_subscription",
    {
      description:
        "Get subscribed sections and personal calendar feed path for the authenticated user.",
      inputSchema: {
        locale: localeSchema.default(DEFAULT_LOCALE),
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async (
      { locale, showAllDetailedProperties, showAllDetailedProrties },
      extra,
    ) => {
      const resolvedShowAllDetailedProperties =
        resolveShowAllDetailedProperties({
          showAllDetailedProperties,
          showAllDetailedProrties,
        });
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

      return jsonToolResult(
        {
          success: true,
          subscription: {
            userId: user.id,
            sections: user.subscribedSections,
            calendarPath: buildUserCalendarFeedPath(user.id, token),
          },
        },
        { showAllDetailedProperties: resolvedShowAllDetailedProperties },
      );
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
        locale: localeSchema.default(DEFAULT_LOCALE),
        showAllDetailedProperties: showAllDetailedPropertiesSchema.optional(),
        showAllDetailedProrties: showAllDetailedPropertiesSchema.optional(),
      },
    },
    async (
      {
        codes,
        semesterId,
        locale,
        showAllDetailedProperties,
        showAllDetailedProrties,
      },
      extra,
    ) => {
      const resolvedShowAllDetailedProperties =
        resolveShowAllDetailedProperties({
          showAllDetailedProperties,
          showAllDetailedProrties,
        });
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

      return jsonToolResult(
        {
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
        },
        { showAllDetailedProperties: resolvedShowAllDetailedProperties },
      );
    },
  );

  return server;
}
