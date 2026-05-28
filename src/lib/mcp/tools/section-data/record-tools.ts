import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { buildPaginatedResponse, normalizePagination } from "@/lib/api/helpers";
import { getPrisma } from "@/lib/db/prisma";
import {
  flexDateInputSchema,
  jsonToolResult,
  mcpLocaleInputSchema,
  mcpModeInputSchema,
  parseMcpDateRange,
  resolveMcpMode,
  resolveSectionByJwId,
} from "@/lib/mcp/tools/_helpers";
import { summarizeScheduleCard } from "@/lib/mcp/tools/event-summary";
import {
  buildScheduleListWhere,
  publicScheduleInclude,
} from "@/lib/schedule-queries";
import {
  sectionExamInclude,
  sectionNotFoundToolResult,
  sectionScheduleListInclude,
} from "./shared";

export function registerSectionRecordTools(server: McpServer) {
  server.registerTool(
    "query_schedules",
    {
      description:
        "Query public schedules across sections by section, teacher, room, weekday, and date range. " +
        "Use list_my_schedules for only followed sections.",
      inputSchema: {
        sectionId: z.number().int().positive().optional(),
        sectionJwId: z.number().int().positive().optional(),
        sectionCode: z.string().trim().min(1).optional(),
        teacherId: z.number().int().positive().optional(),
        teacherCode: z.string().trim().min(1).optional(),
        roomId: z.number().int().positive().optional(),
        roomJwId: z.number().int().positive().optional(),
        weekday: z.number().int().min(1).max(7).optional(),
        dateFrom: flexDateInputSchema
          .optional()
          .describe("Earliest schedule date/time (inclusive)."),
        dateTo: flexDateInputSchema
          .optional()
          .describe("Latest schedule date/time (inclusive)."),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async ({
      sectionId,
      sectionJwId,
      sectionCode,
      teacherId,
      teacherCode,
      roomId,
      roomJwId,
      weekday,
      dateFrom,
      dateTo,
      page,
      limit,
      locale,
      mode,
    }) => {
      const localizedPrisma = getPrisma(locale);
      const pagination = normalizePagination({ page, pageSize: limit });
      const dateRange = parseMcpDateRange({ dateFrom, dateTo });
      if (!dateRange.ok) {
        return dateRange.result;
      }
      const where = buildScheduleListWhere({
        sectionId,
        sectionJwId,
        sectionCode,
        teacherId,
        teacherCode,
        roomId,
        roomJwId,
        weekday,
        dateFrom: dateRange.dateFrom,
        dateTo: dateRange.dateTo,
      });

      const [schedules, total] = await Promise.all([
        localizedPrisma.schedule.findMany({
          where,
          skip: pagination.skip,
          take: pagination.pageSize,
          include: publicScheduleInclude,
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
        }),
        localizedPrisma.schedule.count({ where }),
      ]);

      return jsonToolResult(
        buildPaginatedResponse(
          schedules,
          pagination.page,
          pagination.pageSize,
          total,
        ),
        {
          mode: resolveMcpMode(mode),
        },
      );
    },
  );

  server.registerTool(
    "list_schedules_by_section",
    {
      description:
        "Schedules for one section by JW ID, ordered by date/start time. Use dateFrom/dateTo for a week or date window.",
      inputSchema: {
        sectionJwId: z.number().int().positive(),
        dateFrom: flexDateInputSchema
          .optional()
          .describe(
            "Earliest schedule date (inclusive). Accepts YYYY-MM-DD or ISO 8601 with offset.",
          ),
        dateTo: flexDateInputSchema
          .optional()
          .describe(
            "Latest schedule date (inclusive). Accepts YYYY-MM-DD or ISO 8601 with offset.",
          ),
        limit: z.number().int().min(1).max(200).default(100),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async ({ sectionJwId, dateFrom, dateTo, limit, locale, mode }) => {
      const resolvedMode = resolveMcpMode(mode);
      const { localizedPrisma, section } = await resolveSectionByJwId(
        sectionJwId,
        locale,
      );

      if (!section) {
        return sectionNotFoundToolResult(sectionJwId, mode);
      }

      const dateRange = parseMcpDateRange({ dateFrom, dateTo });
      if (!dateRange.ok) {
        return dateRange.result;
      }

      const dateFilter =
        dateRange.dateFrom || dateRange.dateTo
          ? {
              date: {
                ...(dateRange.dateFrom ? { gte: dateRange.dateFrom } : {}),
                ...(dateRange.dateTo ? { lte: dateRange.dateTo } : {}),
              },
            }
          : {};

      const schedules = await localizedPrisma.schedule.findMany({
        where: { sectionId: section.id, ...dateFilter },
        include: sectionScheduleListInclude,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: limit,
      });
      const scopedSchedules = schedules.map(
        ({ section: _section, ...schedule }) => schedule,
      );

      if (resolvedMode === "summary") {
        return jsonToolResult(
          {
            found: true,
            section,
            schedules: {
              total: schedules.length,
              items: scopedSchedules.slice(0, 5).map(summarizeScheduleCard),
            },
          },
          { mode: "default" },
        );
      }

      return jsonToolResult(
        {
          found: true,
          section,
          schedules: resolvedMode === "full" ? schedules : scopedSchedules,
        },
        {
          mode: resolvedMode,
        },
      );
    },
  );

  server.registerTool(
    "list_exams_by_section",
    {
      description: "Exams for one section by JW ID, including batch and rooms.",
      inputSchema: {
        sectionJwId: z.number().int().positive(),
        locale: mcpLocaleInputSchema,
        mode: mcpModeInputSchema,
      },
    },
    async ({ sectionJwId, locale, mode }) => {
      const { localizedPrisma, section } = await resolveSectionByJwId(
        sectionJwId,
        locale,
      );

      if (!section) {
        return sectionNotFoundToolResult(sectionJwId, mode);
      }

      const exams = await localizedPrisma.exam.findMany({
        where: { sectionId: section.id },
        include: sectionExamInclude,
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
}
