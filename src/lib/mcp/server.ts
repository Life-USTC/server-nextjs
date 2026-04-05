import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getBusRouteTimetable,
  listBusRoutes,
  queryBusSchedules,
} from "@/features/bus/lib/bus-service";
import { findActiveSuspension } from "@/features/comments/server/comment-utils";
import { DEFAULT_LOCALE, localeSchema } from "@/i18n/config";
import {
  buildUserCalendarFeedPath,
  ensureUserCalendarFeedToken,
} from "@/lib/calendar-feed-token";
import { findCurrentSemester } from "@/lib/current-semester";
import { getPrisma, prisma } from "@/lib/db/prisma";
import { compactMcpPayload } from "@/lib/mcp/compact-payload";
import {
  courseInclude,
  sectionCompactInclude,
  sectionInclude,
} from "@/lib/query-helpers";
import { parseDateInput } from "@/lib/time/parse-date-input";
import {
  serializeDatesDeep,
  toShanghaiIsoString,
} from "@/lib/time/serialize-date-output";
import { formatShanghaiDate } from "@/lib/time/shanghai-format";

type Locale = z.infer<typeof localeSchema>;
const dateTimeSchema = z.string().datetime({ offset: true });
const sectionCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_.-]+$/);
const todoPrioritySchema = z.enum(["low", "medium", "high"]);

const mcpModeSchema = z.enum(["summary", "default", "full"]);
const mcpModeInputSchema = mcpModeSchema.default("default");

function resolveMcpMode(mode: z.infer<typeof mcpModeSchema> | undefined) {
  return mode ?? "default";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function summarizeArray(items: unknown[], limit: number) {
  return {
    total: items.length,
    items: items.slice(0, limit).map(compactMcpPayload),
  };
}

function summarizeMcpPayload(value: unknown): unknown {
  if (Array.isArray(value)) return summarizeArray(value, 10);
  if (!isRecord(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (key === "events" && Array.isArray(v)) {
      out.events = summarizeArray(v, 25);
      continue;
    }
    if (
      (key === "todos" ||
        key === "homeworks" ||
        key === "schedules" ||
        key === "exams" ||
        key === "courses" ||
        key === "sections") &&
      Array.isArray(v)
    ) {
      out[key] = summarizeArray(v, 10);
      continue;
    }

    if (Array.isArray(v)) {
      out[key] = summarizeArray(v, 10);
      continue;
    }
    out[key] = compactMcpPayload(v);
  }

  return out;
}

function jsonToolResult(
  value: unknown,
  options?: { mode?: "summary" | "default" | "full" },
) {
  const mode = resolveMcpMode(options?.mode);
  const payload =
    mode === "full"
      ? value
      : mode === "summary"
        ? summarizeMcpPayload(value)
        : compactMcpPayload(value);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(serializeDatesDeep(payload), null, 2),
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

function getTodayBounds() {
  const now = new Date();
  const todayStart = parseRequiredDateInput(formatShanghaiDate(now));
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  return { now, todayStart, tomorrowStart };
}

function toDateTimeFromHHmm(baseDate: Date | null, hhmm: number | null) {
  if (!baseDate) return null;

  const hours = hhmm ? Math.trunc(hhmm / 100) : 0;
  const minutes = hhmm ? hhmm % 100 : 0;
  return parseRequiredDateInput(
    `${formatShanghaiDate(baseDate)}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`,
  );
}

function parseRequiredDateInput(value: string): Date {
  const parsed = parseDateInput(value);
  if (!(parsed instanceof Date)) {
    throw new Error("Invalid date filter");
  }
  return parsed;
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
    "query_bus_timetable",
    {
      description:
        "Query today's USTC shuttle bus schedule. Returns all routes with upcoming/departed trip times for the current day type (weekday or weekend). Use list_bus_routes for a lightweight route catalog, or get_bus_route_timetable for a single route's full weekday+weekend timetable.",
      inputSchema: {
        showDepartedTrips: z.boolean().default(false),
        dayType: z.enum(["weekday", "weekend", "auto"]).default("auto"),
        versionKey: z.string().trim().min(1).optional(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ showDepartedTrips, dayType, versionKey, locale, mode }) => {
      const result = await queryBusSchedules({
        locale,
        showDepartedTrips,
        dayType,
        versionKey,
      });

      return jsonToolResult(
        result ?? {
          locale,
          hasData: false,
          message: "No bus schedule data available",
        },
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );

  server.registerTool(
    "list_bus_routes",
    {
      description:
        "List all USTC shuttle bus routes and campuses. Returns route names, stop sequences, and campus details (no trip/timetable data). Use this for route discovery before querying timetables.",
      inputSchema: {
        locale: localeSchema.default(DEFAULT_LOCALE),
      },
    },
    async ({ locale }) => {
      const result = await listBusRoutes(locale);
      return jsonToolResult(result, { mode: "default" });
    },
  );

  server.registerTool(
    "get_bus_route_timetable",
    {
      description:
        "Get the full timetable for a specific bus route, including both weekday and weekend schedules. Also returns alternate routes that share the same origin and destination campuses. Use list_bus_routes first to find route IDs.",
      inputSchema: {
        routeId: z.number().int().positive(),
        versionKey: z.string().trim().min(1).optional(),
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ routeId, versionKey, locale, mode }) => {
      const result = await getBusRouteTimetable({
        routeId,
        locale,
        versionKey,
      });

      if (!result) {
        return jsonToolResult({
          routeId,
          hasData: false,
          message: `No timetable found for route ${routeId}. Use list_bus_routes to see available route IDs.`,
        });
      }

      return jsonToolResult(result, { mode: resolveMcpMode(mode) });
    },
  );

  server.registerTool(
    "get_my_profile",
    {
      description:
        "Return the authenticated Life@USTC user profile associated with the OAuth access token.",
      inputSchema: {
        mode: mcpModeInputSchema,
      },
    },
    async ({ mode }, extra) => {
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
        mode: resolveMcpMode(mode),
      });
    },
  );

  server.registerTool(
    "list_my_todos",
    {
      description:
        "List todos for the authenticated Life@USTC user in due-date order.",
      inputSchema: {
        mode: mcpModeInputSchema,
      },
    },
    async ({ mode }, extra) => {
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
          mode: resolveMcpMode(mode),
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
        mode: mcpModeInputSchema,
      },
    },
    async ({ title, content, priority, dueAt, mode }, extra) => {
      const userId = getUserId(extra.authInfo);
      const parsedDueAt = parseDateInput(dueAt);
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
          mode: resolveMcpMode(mode),
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
        mode: mcpModeInputSchema,
      },
    },
    async ({ id, title, content, priority, dueAt, completed, mode }, extra) => {
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
      const parsedDueAt = hasDueAt ? parseDateInput(dueAt) : undefined;
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
          mode: resolveMcpMode(mode),
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
        mode: mcpModeInputSchema,
      },
    },
    async ({ id, mode }, extra) => {
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
          mode: resolveMcpMode(mode),
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
        mode: mcpModeInputSchema,
      },
    },
    async ({ search, limit, locale, mode }) => {
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
          mode: resolveMcpMode(mode),
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
        mode: mcpModeInputSchema,
      },
    },
    async ({ jwId, locale, mode }) => {
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
          mode: resolveMcpMode(mode),
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
        mode: mcpModeInputSchema,
      },
    },
    async ({ codes, semesterId, locale, mode }) => {
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
          mode: resolveMcpMode(mode),
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
        mode: mcpModeInputSchema,
      },
    },
    async ({ sectionJwId, includeDeleted, locale, mode }) => {
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
          mode: resolveMcpMode(mode),
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
        mode: mcpModeInputSchema,
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
        mode,
      },
      extra,
    ) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const suspension = await findActiveSuspension(userId);
      if (suspension) {
        return jsonToolResult(
          {
            success: false,
            message: "Suspended",
            reason: suspension.reason ?? null,
          },
          { mode: resolvedMode },
        );
      }

      const { section } = await resolveSectionByJwId(sectionJwId, locale);
      if (!section) {
        return jsonToolResult(
          { success: false, message: `Section ${sectionJwId} was not found` },
          { mode: resolvedMode },
        );
      }

      const parsedPublishedAt = parseDateInput(publishedAt);
      const parsedSubmissionStartAt = parseDateInput(submissionStartAt);
      const parsedSubmissionDueAt = parseDateInput(submissionDueAt);
      if (parsedPublishedAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid publish date" },
          { mode: resolvedMode },
        );
      }
      if (parsedSubmissionStartAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid submission start" },
          { mode: resolvedMode },
        );
      }
      if (parsedSubmissionDueAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid submission due" },
          { mode: resolvedMode },
        );
      }
      if (
        parsedSubmissionStartAt &&
        parsedSubmissionDueAt &&
        parsedSubmissionStartAt.getTime() > parsedSubmissionDueAt.getTime()
      ) {
        return jsonToolResult(
          { success: false, message: "Submission start must be before due" },
          { mode: resolvedMode },
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
        { mode: resolvedMode },
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
        mode: mcpModeInputSchema,
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
        mode,
      },
      extra,
    ) => {
      const resolvedMode = resolveMcpMode(mode);
      const userId = getUserId(extra.authInfo);
      const suspension = await findActiveSuspension(userId);
      if (suspension) {
        return jsonToolResult(
          {
            success: false,
            message: "Suspended",
            reason: suspension.reason ?? null,
          },
          { mode: resolvedMode },
        );
      }

      const hasPublishedAt = publishedAt !== undefined;
      const hasSubmissionStartAt = submissionStartAt !== undefined;
      const hasSubmissionDueAt = submissionDueAt !== undefined;

      const parsedPublishedAt = hasPublishedAt
        ? parseDateInput(publishedAt)
        : undefined;
      const parsedSubmissionStartAt = hasSubmissionStartAt
        ? parseDateInput(submissionStartAt)
        : undefined;
      const parsedSubmissionDueAt = hasSubmissionDueAt
        ? parseDateInput(submissionDueAt)
        : undefined;

      if (hasPublishedAt && parsedPublishedAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid publish date" },
          { mode: resolvedMode },
        );
      }
      if (hasSubmissionStartAt && parsedSubmissionStartAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid submission start" },
          { mode: resolvedMode },
        );
      }
      if (hasSubmissionDueAt && parsedSubmissionDueAt === undefined) {
        return jsonToolResult(
          { success: false, message: "Invalid submission due" },
          { mode: resolvedMode },
        );
      }
      if (
        parsedSubmissionStartAt &&
        parsedSubmissionDueAt &&
        parsedSubmissionStartAt.getTime() > parsedSubmissionDueAt.getTime()
      ) {
        return jsonToolResult(
          { success: false, message: "Submission start must be before due" },
          { mode: resolvedMode },
        );
      }

      const existing = await prisma.homework.findUnique({
        where: { id: homeworkId },
        select: { id: true, deletedAt: true },
      });
      if (!existing) {
        return jsonToolResult(
          { success: false, message: "Homework not found" },
          { mode: resolvedMode },
        );
      }
      if (existing.deletedAt) {
        return jsonToolResult(
          { success: false, message: "Homework deleted" },
          { mode: resolvedMode },
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
          { mode: resolvedMode },
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

      return jsonToolResult({ success: true }, { mode: resolvedMode });
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
        mode: mcpModeInputSchema,
      },
    },
    async ({ sectionJwId, limit, locale, mode }) => {
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
          mode: resolveMcpMode(mode),
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
        mode: mcpModeInputSchema,
      },
    },
    async ({ sectionJwId, locale, mode }) => {
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
          mode: resolveMcpMode(mode),
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
      const sectionIds = await getSubscribedSectionIds(userId);
      const { todayStart } = getTodayBounds();
      const windowEnd = new Date(todayStart);
      windowEnd.setDate(windowEnd.getDate() + 7);
      const localizedPrisma = getPrisma(locale);

      const schedules =
        sectionIds.length > 0
          ? await localizedPrisma.schedule.findMany({
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
          : [];
      const homeworks =
        sectionIds.length > 0
          ? await localizedPrisma.homework.findMany({
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
          : [];
      const exams =
        sectionIds.length > 0
          ? await localizedPrisma.exam.findMany({
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
          : [];
      const todos = await prisma.todo.findMany({
        where: {
          userId,
          completed: false,
          dueAt: { gte: todayStart, lt: windowEnd },
        },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      });

      const events = [
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
          sortKey:
            homework.submissionDueAt?.getTime() ?? Number.MAX_SAFE_INTEGER,
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
        .sort((left, right) => left.sortKey - right.sortKey)
        .map(({ sortKey: _sortKey, ...event }) => event);

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

  server.registerTool(
    "get_my_calendar_subscription",
    {
      description:
        "Get subscribed sections and personal calendar feed path for the authenticated user.",
      inputSchema: {
        locale: localeSchema.default(DEFAULT_LOCALE),
        mode: mcpModeInputSchema,
      },
    },
    async ({ locale, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
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
        { mode: resolvedMode },
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
        mode: mcpModeInputSchema,
      },
    },
    async ({ codes, semesterId, locale, mode }, extra) => {
      const resolvedMode = resolveMcpMode(mode);
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

      await prisma.user.update({
        where: { id: userId },
        data: {
          subscribedSections: {
            set: nextIds.map((id) => ({ id })),
          },
        },
      });

      const updatedUser = await localizedPrisma.user.findUniqueOrThrow({
        where: { id: userId },
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
        { mode: resolvedMode },
      );
    },
  );

  return server;
}
